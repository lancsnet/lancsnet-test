// =====================================================================
// H3 Upgrade — UI integration for H3.Q + H3.S
// File: static/vsp_h3_upgrade.js
//
// Hooks into existing cicd.html (loaded as panel iframe) and:
//   1. Replaces "—" KPIs in Autofix/PR Gate tabs with real H3.Q/H3.S data
//   2. Adds "→ Create PR" button next to every "Preview fix" button
//   3. Inserts H3.S Auto-PR Status widget below H3.O Pre-compute widget
//   4. Auto-refresh every 30s (polling)
//
// Zero-risk: ONLY reads + appends DOM. Never modifies existing handlers.
// =====================================================================

(function () {
  'use strict';

  if (window.__VSP_H3_UPGRADE_LOADED) {
    console.warn('[H3.Upgrade] already loaded — skipping');
    return;
  }
  window.__VSP_H3_UPGRADE_LOADED = true;

  // ── Resolve token from window/localStorage/cookie ─────────────────
  function getToken() {
    return window.VSP_TOKEN ||
           localStorage.getItem('vsp_token') ||
           localStorage.getItem('token') ||
           getCookie('vsp_jwt') ||
           '';
  }
  function getCookie(name) {
    const m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]+)'));
    return m ? decodeURIComponent(m[1]) : '';
  }
  function authHeaders() {
    const t = getToken();
    return t ? { 'Authorization': 'Bearer ' + t } : {};
  }
  async function jget(url) {
    try {
      const r = await fetch(url, { headers: authHeaders(), credentials: 'include' });
      if (!r.ok) return null;
      return await r.json();
    } catch (e) { return null; }
  }
  async function jpost(url, body) {
    try {
      const r = await fetch(url, {
        method: 'POST',
        headers: Object.assign({ 'Content-Type': 'application/json' }, authHeaders()),
        body: JSON.stringify(body || {}),
        credentials: 'include',
      });
      const txt = await r.text();
      let parsed = null;
      try { parsed = JSON.parse(txt); } catch (e) {}
      return { ok: r.ok, status: r.status, data: parsed, raw: txt };
    } catch (e) {
      return { ok: false, status: 0, error: e.message };
    }
  }

  (window.VSP_DEBUG && console.log('[H3.Upgrade] booting — token:', getToken() ? 'present' : 'missing'));

  // ── 1. KPI HOOK ───────────────────────────────────────────────────
  // Strategy: find KPI cards by their label text, replace value once data arrives.
  async function hookKPIs() {
    const [validation, prList] = await Promise.all([
      jget('/api/v1/autofix/validation/stats'),
      jget('/api/v1/autofix/pr/list?limit=200'),
    ]);
    const sm = (validation && validation.summary) || {};
    const prs = (prList && prList.prs) || [];
    const prSm = (prList && prList.summary_30d) || {};

    // Calculate metrics
    const validated  = sm.validated || 0;
    const passCount  = sm.pass || 0;
    const merged     = prSm.merged || 0;
    const created    = (prSm.created || 0) + merged;
    const failed     = (prSm.failed || 0) + (prSm.conflict || 0);
    const verifyRate = validated > 0 ? Math.round(passCount / validated * 100) : null;
    const remedRate  = (created + failed) > 0 ? Math.round(merged / (created + failed) * 100) : null;

    // MTTR — average time from PR.created_at → merged_at
    let mttrCrit = null, mttrHigh = null;
    if (prs.length > 0) {
      const calc = (sev) => {
        const arr = prs.filter(p => (p.severity || '').toLowerCase() === sev && p.merged_at && p.merged_at !== '0001-01-01T00:00:00Z');
        if (arr.length === 0) return null;
        const ms = arr.map(p => new Date(p.merged_at) - new Date(p.created_at)).filter(x => x > 0);
        if (ms.length === 0) return null;
        const avgMs = ms.reduce((a,b) => a+b, 0) / ms.length;
        const hours = avgMs / 3600000;
        if (hours < 1) return Math.round(avgMs / 60000) + 'm';
        if (hours < 48) return Math.round(hours) + 'h';
        return Math.round(hours / 24) + 'd';
      };
      mttrCrit = calc('critical');
      mttrHigh = calc('high');
    }

    // First-attempt success
    const firstAttempt = (created + failed) > 0 ? Math.round(created / (created + failed) * 100) : null;

    // Apply to DOM — find labels then replace following number
    const targets = [
      ['VERIFIED', validated, ''],
      ['VERIFICATION RATE', verifyRate, '%'],
      ['AUTO-REMEDIATION', remedRate, '%'],
      ['MTTR — CRITICAL', mttrCrit, ''],
      ['MTTR — HIGH', mttrHigh, ''],
      ['FIRST-ATTEMPT SUCCESS', firstAttempt, '%'],
      // PR Gate tab
      ['FIX APPLIED', created, ''],
      ['VERIFIED', validated, ''], // duplicate label across tabs — okay
      ['FIX FAILED', failed, ''],
    ];

    let replaced = 0;
    targets.forEach(([label, value, suffix]) => {
      if (value === null || value === undefined) return;
      const labelEls = findLabelElements(label);
      labelEls.forEach(labelEl => {
        const valueEl = findSiblingValueEl(labelEl);
        if (valueEl && (valueEl.textContent.trim() === '—' || valueEl.textContent.trim() === '0')) {
          valueEl.textContent = String(value) + suffix;
          valueEl.style.color = (typeof value === 'number' && value > 0) ? '#22c55e' : '';
          replaced++;
        }
      });
    });
    if (replaced > 0) {
      (window.VSP_DEBUG && console.log('[H3.Upgrade] KPI: ' + replaced + ' values updated'));
    }
  }

  function findLabelElements(label) {
    const all = document.querySelectorAll('div, span, td, th, label');
    const out = [];
    for (let i = 0; i < all.length; i++) {
      const el = all[i];
      const txt = (el.textContent || '').trim();
      if (txt === label) out.push(el);
    }
    return out;
  }
  function findSiblingValueEl(labelEl) {
    // Common pattern: <div>LABEL</div><div>VALUE</div> as siblings,
    // or <div class="card"><div>LABEL</div><div class="big">VALUE</div></div>
    let next = labelEl.nextElementSibling;
    if (next && (next.textContent.trim() === '—' || /^\d/.test(next.textContent.trim()))) return next;
    // Try parent → look for "big number" sibling
    const parent = labelEl.parentElement;
    if (parent) {
      const cands = parent.querySelectorAll('div, span');
      for (let i = 0; i < cands.length; i++) {
        const c = cands[i];
        if (c === labelEl) continue;
        const t = c.textContent.trim();
        if (t === '—' || /^\d+/.test(t)) return c;
      }
    }
    return null;
  }

  // ── 2. APPLY FIX BUTTON ──────────────────────────────────────────
  let CACHED_REPOS = null;
  async function loadRepos() {
    if (CACHED_REPOS !== null) return CACHED_REPOS;
    const d = await jget('/api/v1/autofix/repo/list');
    CACHED_REPOS = (d && d.repos) || [];
    return CACHED_REPOS;
  }

  async function injectCreatePRButtons() {
    // Find all "Preview fix" buttons that don't yet have a sibling "Create PR" button
    const buttons = document.querySelectorAll('button[onclick*="showFixPreview"], button[onclick*="previewFix"]');
    let injected = 0;

    for (let i = 0; i < buttons.length; i++) {
      const btn = buttons[i];
      const td = btn.closest('td') || btn.parentElement;
      if (!td || td.querySelector('[data-h3s-pr-btn]')) continue;

      // Extract finding info from button or row
      const onclick = btn.getAttribute('onclick') || '';
      const fixIdx = btn.getAttribute('data-fix-idx');
      const tr = btn.closest('tr');

      const prBtn = document.createElement('button');
      prBtn.setAttribute('data-h3s-pr-btn', '1');
      prBtn.className = btn.className + ' btn-pr';
      prBtn.style.cssText = 'margin-left:6px;background:rgba(34,197,94,.15);border:1px solid #22c55e;color:#22c55e';
      prBtn.textContent = '→ PR';
      prBtn.title = 'Create Pull Request via H3.S Auto-PR';
      prBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        e.preventDefault();
        openCreatePRDialog(btn, fixIdx, tr);
      });
      td.appendChild(prBtn);
      injected++;
    }

    if (injected > 0) {
      (window.VSP_DEBUG && console.log('[H3.Upgrade] PR buttons: ' + injected + ' injected'));
    }
  }

  async function openCreatePRDialog(originalBtn, fixIdx, tr) {
    // Resolve cache_key + finding_id from data-attrs or the row
    let cacheKey = '';
    let findingID = '';

    // Try multiple sources
    if (tr) {
      // Look for explicit data attrs first
      cacheKey  = tr.getAttribute('data-cache-key') || '';
      findingID = tr.getAttribute('data-finding-id') || '';
      // Try cells — finding ID often shown in a UUID-shaped cell
      if (!findingID) {
        const cells = tr.querySelectorAll('td');
        for (let i = 0; i < cells.length; i++) {
          const t = cells[i].textContent.trim();
          if (/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(t)) {
            findingID = t;
            break;
          }
        }
      }
    }

    // Try global findings list (from page state)
    if (!cacheKey && window.findings && fixIdx != null) {
      const f = window.findings[Number(fixIdx)];
      if (f) {
        cacheKey  = f.cache_key || f.cacheKey || '';
        findingID = findingID || f.id || f.finding_id || '';
      }
    }

    if (!findingID && !cacheKey) {
      showToast('Cannot resolve finding ID. Apply fix from "Preview fix" first.', 'warn');
      return;
    }

    // Load repos
    const repos = await loadRepos();
    if (repos.length === 0) {
      showToast('No repository configured. Register one via API: POST /api/v1/autofix/repo/register', 'warn');
      return;
    }

    // If cache_key missing, try to fetch from validation endpoint by finding_id (fallback: fail clearly)
    if (!cacheKey && findingID) {
      // Backend only has cache_key→finding_id index. Skip and ask user.
      showToast('cache_key required (run Preview fix first to populate cache).', 'warn');
      return;
    }

    showRepoSelectorModal({
      cacheKey: cacheKey,
      findingID: findingID,
      repos: repos,
      originalBtn: originalBtn,
    });
  }

  function showRepoSelectorModal(opts) {
    // Remove existing modal if any
    const existing = document.querySelector('[data-h3s-modal]');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.setAttribute('data-h3s-modal', '1');
    overlay.style.cssText =
      'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:99999;' +
      'display:flex;align-items:center;justify-content:center;padding:20px';

    const optsHtml = opts.repos.map(function (r) {
      return '<option value="' + esc(r.id) + '">' +
        esc(r.nickname) + ' (' + esc(r.platform) + ' · ' +
        esc(r.repo_owner) + '/' + esc(r.repo_name) + ')</option>';
    }).join('');

    overlay.innerHTML =
      '<div style="background:#0f172a;border:1px solid rgba(148,163,184,.3);border-radius:10px;' +
      'padding:20px;max-width:500px;width:100%;color:#e2e8f0">' +
        '<div style="font-size:14px;font-weight:600;margin-bottom:4px">→ Create Pull Request</div>' +
        '<div style="font-size:11px;color:#94a3b8;margin-bottom:14px">' +
          'cache_key: <code style="background:rgba(0,0,0,.3);padding:1px 4px;border-radius:3px">' +
          esc(opts.cacheKey.substring(0, 16)) + '...</code></div>' +

        '<label style="display:block;font-size:11px;color:#94a3b8;margin-bottom:4px">Target repository:</label>' +
        '<select name="select-option" aria-label="Select option" data-h3s-repo style="width:100%;background:rgba(0,0,0,.3);border:1px solid rgba(148,163,184,.2);' +
        'color:#e2e8f0;padding:8px;border-radius:6px;font-size:12px;margin-bottom:14px">' + optsHtml + '</select>' +

        '<div data-h3s-result style="margin-bottom:12px"></div>' +

        '<div style="display:flex;gap:8px;justify-content:flex-end">' +
          '<button data-h3s-cancel style="padding:8px 14px;background:rgba(148,163,184,.1);' +
          'border:1px solid rgba(148,163,184,.3);color:#94a3b8;border-radius:6px;cursor:pointer;font-size:12px">' +
          'Cancel</button>' +
          '<button data-h3s-submit style="padding:8px 14px;background:rgba(34,197,94,.15);' +
          'border:1px solid #22c55e;color:#22c55e;border-radius:6px;cursor:pointer;font-size:12px;font-weight:600">' +
          '→ Create PR</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(overlay);

    overlay.querySelector('[data-h3s-cancel]').onclick = () => overlay.remove();
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

    overlay.querySelector('[data-h3s-submit]').onclick = async function () {
      const select = overlay.querySelector('[data-h3s-repo]');
      const result = overlay.querySelector('[data-h3s-result]');
      const submit = overlay.querySelector('[data-h3s-submit]');
      submit.disabled = true;
      submit.textContent = '⟳ Creating...';
      result.innerHTML =
        '<div style="padding:8px;background:rgba(6,182,212,.1);border-radius:6px;font-size:11px;color:#06b6d4">' +
        '⟳ Cloning repo · applying fix · pushing branch · creating PR via GitHub API...' +
        '</div>';

      const r = await jpost('/api/v1/autofix/pr/create', {
        cache_key:      opts.cacheKey,
        finding_id:     opts.findingID,
        repo_config_id: select.value,
      });

      if (r.ok && r.data) {
        result.innerHTML =
          '<div style="padding:10px;background:rgba(34,197,94,.1);border-radius:6px;' +
          'border:1px solid rgba(34,197,94,.3);font-size:11px">' +
            '<div style="color:#22c55e;font-weight:600;margin-bottom:4px">✓ PR #' +
            r.data.pr_number + ' created!</div>' +
            '<div style="color:#cbd5e1">Branch: <code>' + esc(r.data.branch_name) + '</code></div>' +
            '<a href="' + esc(r.data.pr_url) + '" target="_blank" rel="noopener" ' +
            'style="display:inline-block;margin-top:6px;color:#06b6d4">→ Open PR</a>' +
          '</div>';
        submit.style.display = 'none';
        overlay.querySelector('[data-h3s-cancel]').textContent = 'Close';
        // Refresh PR list widget
        if (window.__h3sRefreshPRList) window.__h3sRefreshPRList();
      } else {
        const errMsg = (r.data && r.data.error) || r.raw || ('HTTP ' + r.status);
        result.innerHTML =
          '<div style="padding:10px;background:rgba(239,68,68,.1);border-radius:6px;' +
          'border:1px solid rgba(239,68,68,.3);font-size:11px;color:#ef4444">' +
          '✗ ' + esc(errMsg) + '</div>';
        submit.disabled = false;
        submit.textContent = '↻ Retry';
      }
    };
  }

  // ── 3. PR LIST WIDGET ────────────────────────────────────────────
  async function injectPRWidget() {
    if (document.querySelector('[data-h3s-pr-widget]')) return;

    // Find anchor: H3.O "AI Pre-compute Status" widget
    const anchor = findElementByText('AI Pre-compute Status');
    if (!anchor) {
      (window.VSP_DEBUG && console.log('[H3.Upgrade] H3.O widget not found — deferring PR widget'));
      return;
    }
    const anchorCard = anchor.closest('.card, [class*="panel"], [class*="widget"]') || anchor.parentElement;
    if (!anchorCard) return;

    const widget = document.createElement('div');
    widget.setAttribute('data-h3s-pr-widget', '1');
    widget.style.cssText =
      'margin-top:14px;padding:14px;background:rgba(15,23,42,.6);' +
      'border:1px solid rgba(148,163,184,.15);border-radius:8px';
    widget.innerHTML =
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">' +
        '<div style="display:flex;align-items:center;gap:8px">' +
          '<span style="color:#22c55e">🔀</span>' +
          '<span style="font-size:13px;font-weight:600;color:#e2e8f0">H3.S Auto-PR Status</span>' +
          '<span data-h3s-status-badge style="padding:2px 8px;background:rgba(148,163,184,.15);' +
            'border-radius:4px;font-size:10px;color:#94a3b8">⟳ loading...</span>' +
        '</div>' +
        '<button data-h3s-refresh style="background:transparent;border:1px solid rgba(148,163,184,.3);' +
          'color:#94a3b8;padding:4px 10px;border-radius:4px;cursor:pointer;font-size:10px">↻ refresh</button>' +
      '</div>' +
      '<div data-h3s-pr-content style="font-size:11px;color:#94a3b8">⟳ Loading...</div>';

    anchorCard.parentElement.insertBefore(widget, anchorCard.nextSibling);

    const refresh = async () => {
      const data = await jget('/api/v1/autofix/pr/list?limit=20');
      const badge = widget.querySelector('[data-h3s-status-badge]');
      const content = widget.querySelector('[data-h3s-pr-content]');
      if (!data) {
        badge.textContent = '✗ error';
        badge.style.color = '#ef4444';
        content.innerHTML = '<span style="color:#ef4444">Cannot load PR list</span>';
        return;
      }
      const sm = data.summary_30d || {};
      const prs = data.prs || [];
      const total = (sm.merged || 0) + (sm.created || 0) + (sm.closed || 0) + (sm.failed || 0) + (sm.conflict || 0) + (sm.pending || 0);
      const successRate = total > 0 ? Math.round((sm.merged || 0) / total * 100) : 0;

      badge.textContent = total + ' PRs · ' + (sm.merged || 0) + ' merged · ' + successRate + '% success';
      badge.style.color = total === 0 ? '#94a3b8' : (successRate >= 70 ? '#22c55e' : '#f59e0b');

      // Mini stats grid
      const statsGrid =
        '<div style="display:grid;grid-template-columns:repeat(6,1fr);gap:6px;margin-bottom:10px">' +
          miniStat('Pending', sm.pending || 0, '#94a3b8') +
          miniStat('Open',    sm.created || 0, '#3b82f6') +
          miniStat('Merged',  sm.merged  || 0, '#22c55e') +
          miniStat('Closed',  sm.closed  || 0, '#94a3b8') +
          miniStat('Conflict',sm.conflict|| 0, '#f59e0b') +
          miniStat('Failed',  sm.failed  || 0, '#ef4444') +
        '</div>';

      if (prs.length === 0) {
        content.innerHTML = statsGrid +
          '<div style="text-align:center;padding:14px;color:#64748b;font-size:10px">' +
          'No PRs yet. SLA scheduler runs every 5 min; or click <code>→ PR</code> next to a finding.</div>';
        return;
      }

      const rows = prs.slice(0, 10).map(function (p) {
        const statusColor = {
          merged: '#22c55e', created: '#3b82f6', closed: '#94a3b8',
          conflict: '#f59e0b', failed: '#ef4444', pending: '#94a3b8', creating: '#06b6d4',
        }[p.status] || '#94a3b8';
        const link = p.pr_url
          ? '<a href="' + esc(p.pr_url) + '" target="_blank" rel="noopener" ' +
            'style="color:#06b6d4;text-decoration:none">#' + p.pr_number + '</a>'
          : '<span style="color:#64748b">—</span>';
        const trigger = p.trigger_type === 'sla' ? '⏱' : '👤';
        return '<tr style="border-bottom:1px solid rgba(148,163,184,.08)">' +
          '<td style="padding:5px 4px">' + link + '</td>' +
          '<td style="padding:5px 4px"><span style="color:' + statusColor + ';font-size:10px;font-weight:600">' +
            (p.status || '').toUpperCase() + '</span></td>' +
          '<td style="padding:5px 4px;font-family:monospace;font-size:10px;color:#cbd5e1">' +
            esc((p.rule_id || '').substring(0, 26)) + '</td>' +
          '<td style="padding:5px 4px;color:#94a3b8">' + esc((p.severity || '').toUpperCase()) + '</td>' +
          '<td style="padding:5px 4px;color:' + ((p.validation_score || 0) >= 90 ? '#22c55e' :
                                                  (p.validation_score || 0) >= 70 ? '#06b6d4' : '#f59e0b') +
            ';font-weight:600">' + (p.validation_score || '—') + '</td>' +
          '<td style="padding:5px 4px;font-size:10px">' + trigger + '</td>' +
          '<td style="padding:5px 4px;color:#64748b;font-size:10px">' + relTime(p.created_at) + '</td>' +
          '</tr>';
      }).join('');

      content.innerHTML = statsGrid +
        '<table style="width:100%;border-collapse:collapse;font-size:11px">' +
          '<thead><tr style="border-bottom:1px solid rgba(148,163,184,.2);color:#94a3b8;' +
          'font-size:10px;text-transform:uppercase">' +
            '<th style="text-align:left;padding:5px 4px">PR</th>' +
            '<th style="text-align:left;padding:5px 4px">Status</th>' +
            '<th style="text-align:left;padding:5px 4px">Rule</th>' +
            '<th style="text-align:left;padding:5px 4px">Sev</th>' +
            '<th style="text-align:left;padding:5px 4px">Score</th>' +
            '<th style="text-align:left;padding:5px 4px">Trig</th>' +
            '<th style="text-align:left;padding:5px 4px">When</th>' +
          '</tr></thead><tbody>' + rows + '</tbody>' +
        '</table>';
    };

    widget.querySelector('[data-h3s-refresh]').onclick = refresh;
    window.__h3sRefreshPRList = refresh;
    refresh();
  }

  function miniStat(label, value, color) {
    return '<div style="background:rgba(0,0,0,.3);border-radius:4px;padding:5px;text-align:center">' +
      '<div style="font-size:14px;font-weight:700;color:' + color + ';line-height:1.1">' + value + '</div>' +
      '<div style="font-size:8px;color:#94a3b8;text-transform:uppercase">' + label + '</div>' +
      '</div>';
  }

  function findElementByText(text) {
    const all = document.querySelectorAll('div, span, h1, h2, h3, h4');
    for (let i = 0; i < all.length; i++) {
      if ((all[i].textContent || '').indexOf(text) !== -1 && all[i].children.length < 5) {
        return all[i];
      }
    }
    return null;
  }

  // ── 4. TOAST NOTIFICATION ────────────────────────────────────────
  function showToast(msg, kind) {
    const colors = {
      ok:   { bg: 'rgba(34,197,94,.15)',  fg: '#22c55e', border: 'rgba(34,197,94,.3)' },
      warn: { bg: 'rgba(245,158,11,.15)', fg: '#f59e0b', border: 'rgba(245,158,11,.3)' },
      err:  { bg: 'rgba(239,68,68,.15)',  fg: '#ef4444', border: 'rgba(239,68,68,.3)' },
    };
    const c = colors[kind] || colors.ok;
    const t = document.createElement('div');
    t.style.cssText =
      'position:fixed;bottom:20px;right:20px;z-index:99999;' +
      'padding:12px 16px;background:' + c.bg + ';border:1px solid ' + c.border + ';' +
      'color:' + c.fg + ';border-radius:6px;font-size:12px;max-width:400px;' +
      'box-shadow:0 4px 20px rgba(0,0,0,.4)';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .3s'; }, 4000);
    setTimeout(() => t.remove(), 4500);
  }

  // ── Helpers ──────────────────────────────────────────────────────
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
    });
  }
  function relTime(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    const diff = (Date.now() - d.getTime()) / 1000;
    if (diff < 60) return Math.floor(diff) + 's';
    if (diff < 3600) return Math.floor(diff / 60) + 'm';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h';
    return Math.floor(diff / 86400) + 'd';
  }

  // ── Main loop ─────────────────────────────────────────────────────
  async function tick() {
    try {
      await hookKPIs();
      await injectCreatePRButtons();
      await injectPRWidget();
    } catch (e) {
      console.error('[H3.Upgrade] tick error:', e);
    }
  }

  // Run on DOMContentLoaded + every 30s + on tab visibility
  function start() {
    tick();
    setInterval(tick, 30000);

    // Re-inject when SPA-like navigation changes the DOM
    const obs = new MutationObserver(function (mutations) {
      let needsButtons = false;
      mutations.forEach(function (m) {
        if (m.addedNodes && m.addedNodes.length > 0) {
          for (let i = 0; i < m.addedNodes.length; i++) {
            const node = m.addedNodes[i];
            if (node.nodeType === 1) {
              if (node.querySelector && node.querySelector('button[onclick*="showFixPreview"]')) {
                needsButtons = true;
                break;
              }
            }
          }
        }
      });
      if (needsButtons) {
        setTimeout(injectCreatePRButtons, 100);
      }
    });
    obs.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }

  // Public API
  window.H3Upgrade = {
    refresh: tick,
    refreshPRs: () => window.__h3sRefreshPRList && window.__h3sRefreshPRList(),
    showToast: showToast,
  };

  (window.VSP_DEBUG && console.log('[H3.Upgrade] ✓ ready'));
})();

/* THREAT_HUNTING_ENTERPRISE_V1 */
(function(){
  if (window.__THREAT_HUNTING_ENTERPRISE_V1__) return;
  window.__THREAT_HUNTING_ENTERPRISE_V1__ = true;

  const MARK = 'THREAT_HUNTING_ENTERPRISE_V1';

  const HUNTS = [
    {
      id:'HUNT-001',
      name:'Suspicious PowerShell Beaconing',
      entity:'win-admin-01',
      severity:'HIGH',
      status:'OPEN',
      tactic:'Command and Control',
      technique:'T1059.001',
      signal:'powershell with encoded command + periodic outbound HTTPS',
      ioc:'185.199.108.133',
      confidence:87,
      action:'Isolate host + collect memory + review parent process'
    },
    {
      id:'HUNT-002',
      name:'Possible Credential Access',
      entity:'dc-prod-01',
      severity:'CRITICAL',
      status:'OPEN',
      tactic:'Credential Access',
      technique:'T1003',
      signal:'lsass access pattern detected from non-standard process',
      ioc:'proc:sysdiag.exe',
      confidence:92,
      action:'Block process hash + rotate privileged credentials'
    },
    {
      id:'HUNT-003',
      name:'Lateral Movement via SMB',
      entity:'app-prod-01',
      severity:'MEDIUM',
      status:'TRIAGE',
      tactic:'Lateral Movement',
      technique:'T1021.002',
      signal:'unusual SMB connection fan-out to internal hosts',
      ioc:'tcp/445',
      confidence:74,
      action:'Validate service account usage + check admin shares'
    },
    {
      id:'HUNT-004',
      name:'DNS Tunneling Pattern',
      entity:'debug-test',
      severity:'HIGH',
      status:'TRIAGE',
      tactic:'Command and Control',
      technique:'T1071.004',
      signal:'high entropy DNS labels + repeated NXDOMAIN pattern',
      ioc:'dns:*.exfil-lab.local',
      confidence:81,
      action:'Sinkhole domain + inspect DNS query payloads'
    },
    {
      id:'HUNT-005',
      name:'Suspicious External RDP Probe',
      entity:'test-eol-pc',
      severity:'HIGH',
      status:'BLOCKED',
      tactic:'Initial Access',
      technique:'T1133',
      signal:'external RDP attempt against unsupported workstation',
      ioc:'203.0.113.9:3389',
      confidence:89,
      action:'Keep blocked + retire EOL asset + review firewall rule'
    },
    {
      id:'HUNT-006',
      name:'Container Runtime Escape Indicator',
      entity:'k8s-node-02',
      severity:'MEDIUM',
      status:'OPEN',
      tactic:'Privilege Escalation',
      technique:'T1611',
      signal:'container process touching host namespace artifacts',
      ioc:'mount:/proc/1/root',
      confidence:69,
      action:'Review pod security context + collect kube audit logs'
    }
  ];

  function log(){
    try { console.log.apply(console, ['[' + MARK + ']'].concat([].slice.call(arguments))); } catch(e) {}
  }

  function severityClass(s){
    s = String(s || '').toUpperCase();
    if (s === 'CRITICAL') return 'critical';
    if (s === 'HIGH') return 'high';
    if (s === 'MEDIUM') return 'medium';
    if (s === 'LOW') return 'low';
    return 'info';
  }

  function gate(){
    if (HUNTS.some(h => h.severity === 'CRITICAL' && h.status !== 'CLOSED')) return 'BLOCK';
    if (HUNTS.some(h => ['HIGH','MEDIUM'].includes(h.severity) && h.status !== 'CLOSED')) return 'WARN';
    return 'PASS';
  }

  function gateClass(g){
    return g === 'BLOCK' ? 'block' : g === 'WARN' ? 'warn' : 'pass';
  }

  function injectStyle(){
    if (document.getElementById('thv1-style')) return;

    const s = document.createElement('style');
    s.id = 'thv1-style';
    s.textContent = `
      #thv1-root {
        margin: 12px 0 16px !important;
        padding: 12px !important;
        background: linear-gradient(180deg, rgba(15,23,42,.84), rgba(2,6,23,.42)) !important;
        border: 1px solid rgba(148,163,184,.16) !important;
        border-radius: 14px !important;
      }
      .thv1-banner {
        margin-bottom: 12px !important;
        padding: 10px 12px !important;
        border-left: 3px solid #67e8f9 !important;
        background: rgba(8,47,73,.28) !important;
        border-radius: 10px !important;
        color: #dbeafe !important;
        font-size: 11px !important;
      }
      .thv1-top {
        display: grid !important;
        grid-template-columns: repeat(5, minmax(130px, 1fr)) !important;
        gap: 10px !important;
        margin-bottom: 12px !important;
      }
      .thv1-card {
        background: linear-gradient(180deg, rgba(30,41,59,.96), rgba(15,23,42,.96)) !important;
        border: 1px solid rgba(103,232,249,.16) !important;
        border-radius: 12px !important;
        padding: 11px 13px !important;
        min-height: 72px !important;
        box-shadow: 0 10px 24px rgba(0,0,0,.26) !important;
      }
      .thv1-label {
        color: #7dd3fc !important;
        font-size: 9px !important;
        text-transform: uppercase !important;
        letter-spacing: .09em !important;
        font-family: ui-monospace, Menlo, Consolas, monospace !important;
      }
      .thv1-value {
        margin-top: 7px !important;
        color: #e5f3ff !important;
        font-size: 21px !important;
        line-height: 1.1 !important;
        font-weight: 900 !important;
        font-family: ui-monospace, Menlo, Consolas, monospace !important;
      }
      .thv1-sub {
        margin-top: 4px !important;
        color: #94a3b8 !important;
        font-size: 10px !important;
      }
      .thv1-pass { color: #22c55e !important; }
      .thv1-warn { color: #f59e0b !important; }
      .thv1-block, .thv1-critical { color: #ef4444 !important; }
      .thv1-high { color: #fb7185 !important; }
      .thv1-medium { color: #f59e0b !important; }
      .thv1-low { color: #22c55e !important; }
      .thv1-info { color: #67e8f9 !important; }
      .thv1-grid {
        display: grid !important;
        grid-template-columns: 1.15fr .85fr !important;
        gap: 12px !important;
        margin-bottom: 12px !important;
      }
      .thv1-panel {
        background: rgba(15,23,42,.72) !important;
        border: 1px solid rgba(148,163,184,.13) !important;
        border-radius: 12px !important;
        overflow: hidden !important;
      }
      .thv1-head {
        padding: 10px 12px !important;
        border-bottom: 1px solid rgba(148,163,184,.1) !important;
        display: flex !important;
        justify-content: space-between !important;
        align-items: center !important;
      }
      .thv1-title {
        color: #e5e7eb !important;
        font-size: 12px !important;
        font-weight: 900 !important;
      }
      .thv1-caption {
        color: #94a3b8 !important;
        font-size: 10px !important;
        font-family: ui-monospace, Menlo, Consolas, monospace !important;
      }
      .thv1-list {
        padding: 10px 12px !important;
        display: grid !important;
        gap: 8px !important;
      }
      .thv1-alert {
        border: 1px solid rgba(148,163,184,.12) !important;
        border-radius: 10px !important;
        padding: 9px !important;
        background: rgba(2,6,23,.35) !important;
      }
      .thv1-alert-title {
        color: #e5e7eb !important;
        font-size: 11px !important;
        font-weight: 800 !important;
      }
      .thv1-alert-sub {
        color: #94a3b8 !important;
        font-size: 10px !important;
        margin-top: 3px !important;
      }
      .thv1-attack {
        display: grid !important;
        gap: 8px !important;
        padding: 10px 12px !important;
      }
      .thv1-bar {
        height: 8px !important;
        background: rgba(148,163,184,.14) !important;
        border-radius: 999px !important;
        overflow: hidden !important;
        margin-top: 6px !important;
      }
      .thv1-bar-fill {
        height: 100% !important;
        border-radius: 999px !important;
        background: linear-gradient(90deg, #67e8f9, #f59e0b) !important;
      }
      .thv1-toolbar {
        display: flex !important;
        justify-content: space-between !important;
        align-items: center !important;
        gap: 8px !important;
        flex-wrap: wrap !important;
        padding: 8px 10px !important;
        background: rgba(15,23,42,.72) !important;
        border: 1px solid rgba(148,163,184,.12) !important;
        border-radius: 10px !important;
        margin-bottom: 8px !important;
      }
      .thv1-btn {
        appearance: none !important;
        border: 1px solid rgba(103,232,249,.28) !important;
        background: rgba(15,23,42,.96) !important;
        color: #67e8f9 !important;
        border-radius: 7px !important;
        padding: 4px 8px !important;
        font-size: 9px !important;
        cursor: pointer !important;
        font-weight: 800 !important;
        font-family: ui-monospace, Menlo, Consolas, monospace !important;
      }
      .thv1-table {
        width: 100% !important;
        border-collapse: collapse !important;
      }
      .thv1-table th {
        color: #7f8ca3 !important;
        font-size: 9px !important;
        text-transform: uppercase !important;
        letter-spacing: .08em !important;
        text-align: left !important;
        padding: 8px !important;
        border-bottom: 1px solid rgba(148,163,184,.11) !important;
      }
      .thv1-table td {
        color: #cbd5e1 !important;
        font-size: 10px !important;
        padding: 8px !important;
        border-bottom: 1px solid rgba(148,163,184,.07) !important;
        font-family: ui-monospace, Menlo, Consolas, monospace !important;
      }
      .thv1-pill {
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        border-radius: 999px !important;
        padding: 3px 8px !important;
        font-size: 9px !important;
        font-weight: 900 !important;
      }
      .thv1-pill.critical {
        color: #ef4444 !important;
        background: rgba(239,68,68,.13) !important;
        border: 1px solid rgba(239,68,68,.32) !important;
      }
      .thv1-pill.high {
        color: #fb7185 !important;
        background: rgba(251,113,133,.13) !important;
        border: 1px solid rgba(251,113,133,.28) !important;
      }
      .thv1-pill.medium {
        color: #f59e0b !important;
        background: rgba(245,158,11,.13) !important;
        border: 1px solid rgba(245,158,11,.3) !important;
      }
      .thv1-pill.low {
        color: #22c55e !important;
        background: rgba(34,197,94,.13) !important;
        border: 1px solid rgba(34,197,94,.28) !important;
      }
      .thv1-pill.status {
        color: #67e8f9 !important;
        background: rgba(103,232,249,.10) !important;
        border: 1px solid rgba(103,232,249,.25) !important;
      }
      #thv1-modal {
        position: fixed !important;
        inset: 0 !important;
        z-index: 99999 !important;
        display: none !important;
        align-items: center !important;
        justify-content: center !important;
        background: rgba(2,6,23,.68) !important;
        backdrop-filter: blur(8px) !important;
      }
      #thv1-modal.open { display: flex !important; }
      .thv1-dialog {
        width: min(820px,96vw) !important;
        background: #111827 !important;
        border: 1px solid rgba(148,163,184,.22) !important;
        border-radius: 14px !important;
        overflow: hidden !important;
        box-shadow: 0 30px 80px rgba(0,0,0,.5) !important;
      }
      .thv1-dialog-head {
        padding: 14px 16px !important;
        border-bottom: 1px solid rgba(148,163,184,.12) !important;
        display: flex !important;
        justify-content: space-between !important;
      }
      .thv1-dialog-body {
        padding: 16px !important;
        color: #cbd5e1 !important;
      }
      .thv1-kv-grid {
        display: grid !important;
        grid-template-columns: repeat(2,minmax(180px,1fr)) !important;
        gap: 10px !important;
      }
      .thv1-kv {
        background: rgba(15,23,42,.72) !important;
        border: 1px solid rgba(148,163,184,.12) !important;
        border-radius: 10px !important;
        padding: 10px !important;
        font-size: 12px !important;
      }
      .thv1-kv b {
        display: block !important;
        color: #94a3b8 !important;
        font-size: 10px !important;
        text-transform: uppercase !important;
        margin-bottom: 4px !important;
      }
    `;
    document.head.appendChild(s);
  }

  function finalGate(){
    return gate();
  }

  function counts(){
    return {
      total: HUNTS.length,
      open: HUNTS.filter(h => h.status === 'OPEN').length,
      triage: HUNTS.filter(h => h.status === 'TRIAGE').length,
      critical: HUNTS.filter(h => h.severity === 'CRITICAL').length,
      high: HUNTS.filter(h => h.severity === 'HIGH').length,
      blocked: HUNTS.filter(h => h.status === 'BLOCKED').length
    };
  }

  function render(){
    injectStyle();

    document.getElementById('thv1-root')?.remove();

    const c = counts();
    const g = finalGate();

    const root = document.createElement('div');
    root.id = 'thv1-root';

    root.innerHTML = `
      <div class="thv1-banner">
        Threat Hunting — enterprise hunt workspace. MITRE ATT&CK mapping, IOC matches, suspicious entities, hunt decisions and exportable evidence.
      </div>

      <div class="thv1-top">
        <div class="thv1-card"><div class="thv1-label">Total hunts</div><div class="thv1-value">${c.total}</div><div class="thv1-sub">active hunt dataset</div></div>
        <div class="thv1-card"><div class="thv1-label">Open hunts</div><div class="thv1-value thv1-warn">${c.open}</div><div class="thv1-sub">requires analyst action</div></div>
        <div class="thv1-card"><div class="thv1-label">Critical / High</div><div class="thv1-value thv1-critical">${c.critical + c.high}</div><div class="thv1-sub">priority investigations</div></div>
        <div class="thv1-card"><div class="thv1-label">Blocked</div><div class="thv1-value thv1-pass">${c.blocked}</div><div class="thv1-sub">containment applied</div></div>
        <div class="thv1-card"><div class="thv1-label">Gate decision</div><div class="thv1-value thv1-${gateClass(g)}">${g}</div><div class="thv1-sub">SOC triage gate</div></div>
      </div>

      <div class="thv1-grid">
        <div class="thv1-panel">
          <div class="thv1-head">
            <div><div class="thv1-title">Priority hunt queue</div><div class="thv1-caption">critical/high hunts first</div></div>
          </div>
          <div class="thv1-list" id="thv1-priority"></div>
        </div>

        <div class="thv1-panel">
          <div class="thv1-head">
            <div><div class="thv1-title">MITRE ATT&CK coverage</div><div class="thv1-caption">tactics observed in current hunt set</div></div>
          </div>
          <div class="thv1-attack" id="thv1-attack"></div>
        </div>
      </div>

      <div class="thv1-toolbar">
        <div class="thv1-caption">Commercial view: hunt summary, IOC matches, MITRE mapping, per-hunt actions and evidence export.</div>
        <div>
          <button class="thv1-btn" data-thv1-export-all="1">Export Evidence JSON</button>
          <button class="thv1-btn" data-thv1-refresh="1">Refresh View</button>
        </div>
      </div>

      <div class="thv1-panel">
        <div class="thv1-head">
          <div><div class="thv1-title">Hunt results</div><div class="thv1-caption">detections prioritized by severity and confidence</div></div>
        </div>
        <table class="thv1-table">
          <thead>
            <tr>
              <th>Hunt ID</th>
              <th>Name</th>
              <th>Entity</th>
              <th>Severity</th>
              <th>Status</th>
              <th>MITRE</th>
              <th>IOC</th>
              <th>Confidence</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="thv1-tbody"></tbody>
        </table>
      </div>
    `;

    const anchor = findAnchor();
    anchor.parentElement.insertBefore(root, anchor.nextSibling);

    renderPriority();
    renderAttack();
    renderRows();
    ensureModal();
    bind(root);

    document.documentElement.setAttribute('data-threat-hunting-v1', 'ready');
    log('rendered hunts=', HUNTS.length);
  }

  function findAnchor(){
    const candidates = Array.from(document.querySelectorAll('h1,h2,h3,h4,div,span,b,strong'));
    return candidates.find(x => /Threat Hunt|Threat Hunting|Threat hunt/i.test((x.textContent || '').trim())) ||
      document.body.firstElementChild ||
      document.body;
  }

  function renderPriority(){
    const box = document.getElementById('thv1-priority');
    if (!box) return;

    const items = HUNTS
      .slice()
      .sort((a,b) => {
        const rank = {CRITICAL:4,HIGH:3,MEDIUM:2,LOW:1,INFO:0};
        return (rank[b.severity] || 0) - (rank[a.severity] || 0) || b.confidence - a.confidence;
      })
      .slice(0,4);

    box.innerHTML = items.map(h => `
      <div class="thv1-alert">
        <div class="thv1-alert-title">
          <span class="thv1-pill ${severityClass(h.severity)}">${h.severity}</span>
          ${h.id} · ${h.name}
        </div>
        <div class="thv1-alert-sub">${h.entity} · ${h.tactic} · ${h.technique} · ${h.confidence}% confidence</div>
      </div>
    `).join('');
  }

  function renderAttack(){
    const box = document.getElementById('thv1-attack');
    if (!box) return;

    const groups = {};
    HUNTS.forEach(h => {
      groups[h.tactic] = groups[h.tactic] || {count:0, max:0};
      groups[h.tactic].count += 1;
      groups[h.tactic].max = Math.max(groups[h.tactic].max, h.confidence);
    });

    box.innerHTML = Object.keys(groups).map(k => {
      const g = groups[k];
      const pct = Math.min(100, Math.max(8, Math.round((g.count / HUNTS.length) * 100)));
      return `
        <div class="thv1-alert">
          <div class="thv1-alert-title">${k} · ${g.count} hunt(s)</div>
          <div class="thv1-bar"><div class="thv1-bar-fill" style="width:${pct}%"></div></div>
          <div class="thv1-alert-sub">max confidence ${g.max}%</div>
        </div>
      `;
    }).join('');
  }

  function renderRows(){
    const tb = document.getElementById('thv1-tbody');
    if (!tb) return;

    tb.innerHTML = HUNTS.map((h, idx) => `
      <tr>
        <td>${h.id}</td>
        <td>${h.name}</td>
        <td>${h.entity}</td>
        <td><span class="thv1-pill ${severityClass(h.severity)}">${h.severity}</span></td>
        <td><span class="thv1-pill status">${h.status}</span></td>
        <td>${h.technique}</td>
        <td>${h.ioc}</td>
        <td>${h.confidence}%</td>
        <td>
          <button class="thv1-btn" data-thv1-detail="${idx}">Detail</button>
          <button class="thv1-btn" data-thv1-evidence="${idx}">Evidence</button>
        </td>
      </tr>
    `).join('');
  }

  function bind(root){
    root.addEventListener('click', function(e){
      const detail = e.target.closest('[data-thv1-detail]');
      const evidence = e.target.closest('[data-thv1-evidence]');
      const all = e.target.closest('[data-thv1-export-all]');
      const refresh = e.target.closest('[data-thv1-refresh]');

      if (detail) openDetail(HUNTS[Number(detail.getAttribute('data-thv1-detail'))]);
      if (evidence) exportOne(HUNTS[Number(evidence.getAttribute('data-thv1-evidence'))]);
      if (all) exportAll();
      if (refresh) render();
    });
  }

  function ensureModal(){
    if (document.getElementById('thv1-modal')) return;

    const m = document.createElement('div');
    m.id = 'thv1-modal';
    m.innerHTML = `
      <div class="thv1-dialog">
        <div class="thv1-dialog-head">
          <div id="thv1-modal-title" style="color:#e5e7eb;font-size:14px;font-weight:900">Hunt Detail</div>
          <button class="thv1-btn" data-thv1-close="1">Close</button>
        </div>
        <div class="thv1-dialog-body" id="thv1-modal-body"></div>
      </div>
    `;
    document.body.appendChild(m);
    m.addEventListener('click', function(e){
      if (e.target === m || e.target.closest('[data-thv1-close]')) m.classList.remove('open');
    });
  }

  function openDetail(h){
    const m = document.getElementById('thv1-modal');
    document.getElementById('thv1-modal-title').textContent = `${h.id} — ${h.severity}`;
    document.getElementById('thv1-modal-body').innerHTML = `
      <div class="thv1-kv-grid">
        <div class="thv1-kv"><b>Hunt name</b>${h.name}</div>
        <div class="thv1-kv"><b>Entity</b>${h.entity}</div>
        <div class="thv1-kv"><b>Severity</b><span class="thv1-pill ${severityClass(h.severity)}">${h.severity}</span></div>
        <div class="thv1-kv"><b>Status</b>${h.status}</div>
        <div class="thv1-kv"><b>MITRE tactic</b>${h.tactic}</div>
        <div class="thv1-kv"><b>Technique</b>${h.technique}</div>
        <div class="thv1-kv"><b>IOC</b>${h.ioc}</div>
        <div class="thv1-kv"><b>Confidence</b>${h.confidence}%</div>
      </div>
      <div style="margin-top:12px;color:#cbd5e1;font-size:12px"><b>Signal:</b> ${h.signal}</div>
      <div style="margin-top:8px;color:#94a3b8;font-size:11px"><b>Recommended action:</b> ${h.action}</div>
    `;
    m.classList.add('open');
  }

  function download(name, payload){
    const blob = new Blob([JSON.stringify(payload, null, 2)], {type:'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 800);
  }

  function exportOne(h){
    download(`${h.id.toLowerCase()}_threat_hunt_evidence.json`, {
      type: 'threat_hunt_evidence',
      exported_at: new Date().toISOString(),
      gate: finalGate(),
      hunt: h
    });
  }

  function exportAll(){
    download('threat_hunting_evidence_all.json', {
      type: 'threat_hunting_evidence_all',
      exported_at: new Date().toISOString(),
      gate: finalGate(),
      total_hunts: HUNTS.length,
      hunts: HUNTS
    });
  }

  function hideNativeIfEmpty(){
    // V1 không hard-hide toàn bộ native, chỉ hide các khối rỗng lớn nếu enterprise root đã render.
    if (!document.getElementById('thv1-root')) return;
    Array.from(document.querySelectorAll('div,section,article')).forEach(el => {
      if (el.closest('#thv1-root')) return;
      const t = (el.textContent || '').replace(/\s+/g,' ').trim();
      if (
        /No hunts|No threat|empty|coming soon/i.test(t) ||
        (/Threat Hunt|Threat Hunting/i.test(t) && /0/i.test(t) && t.length < 300)
      ) {
        el.style.setProperty('display','none','important');
      }
    });
  }

  function boot(){
    let tries = 0;
    const timer = setInterval(function(){
      tries += 1;
      if (document.body) {
        render();
        hideNativeIfEmpty();
        clearInterval(timer);
      }
      if (tries >= 20) clearInterval(timer);
    }, 250);

    setTimeout(function(){ render(); hideNativeIfEmpty(); }, 1200);
    setTimeout(function(){ render(); hideNativeIfEmpty(); }, 2500);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  window.THREAT_HUNTING_ENTERPRISE_V1 = { render, exportAll };
})();



/* THREAT_HUNTING_HIDE_NATIVE_V2
   Hide native Threat Hunt query/search block after enterprise V1 renders.
*/
(function(){
  if (window.__THREAT_HUNTING_HIDE_NATIVE_V2__) return;
  window.__THREAT_HUNTING_HIDE_NATIVE_V2__ = true;

  function txt(el){
    return (el && el.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function insideEnterprise(el){
    return !!(el && el.closest && el.closest('#thv1-root'));
  }

  function hardHide(el, reason){
    if (!el || insideEnterprise(el)) return;
    el.setAttribute('data-thv2-hidden', reason || 'native');
    el.classList.add('thv2-hidden');
    el.style.setProperty('display', 'none', 'important');
    el.style.setProperty('visibility', 'hidden', 'important');
    el.style.setProperty('height', '0', 'important');
    el.style.setProperty('max-height', '0', 'important');
    el.style.setProperty('min-height', '0', 'important');
    el.style.setProperty('overflow', 'hidden', 'important');
    el.style.setProperty('margin', '0', 'important');
    el.style.setProperty('padding', '0', 'important');
    el.style.setProperty('border', '0', 'important');
  }

  function installStyle(){
    if (document.getElementById('thv2-hide-style')) return;
    var s = document.createElement('style');
    s.id = 'thv2-hide-style';
    s.textContent = `
      .thv2-hidden {
        display: none !important;
        visibility: hidden !important;
        height: 0 !important;
        max-height: 0 !important;
        min-height: 0 !important;
        overflow: hidden !important;
        margin: 0 !important;
        padding: 0 !important;
        border: 0 !important;
      }
    `;
    document.head.appendChild(s);
  }

  function looksNativeThreatHunt(el){
    if (!el || insideEnterprise(el)) return false;
    var t = txt(el);
    if (!t) return false;

    if (/Data\s+7\s+ngày\s+cũ/i.test(t)) return true;

    if (
      /Search messages/i.test(t) &&
      /All severities/i.test(t) &&
      /Last 7d/i.test(t)
    ) return true;

    if (
      /Quick/i.test(t) &&
      /SSH brute force/i.test(t) &&
      /Sudo commands/i.test(t)
    ) return true;

    if (
      /RESULTS/i.test(t) &&
      /TOTAL MATCHED/i.test(t) &&
      /UNIQUE HOSTS/i.test(t) &&
      /QUERY TIME/i.test(t)
    ) return true;

    if (
      /Threat Hunting/i.test(t) &&
      /Query log_events/i.test(t) &&
      /filter/i.test(t) &&
      /timeline/i.test(t) &&
      /pivot/i.test(t)
    ) return true;

    return false;
  }

  function hideNative(){
    installStyle();

    var root = document.getElementById('thv1-root');
    if (!root) return;

    // Hide old/native threat hunt containers.
    Array.from(document.querySelectorAll('div,section,article,form,table')).forEach(function(el){
      if (insideEnterprise(el)) return;
      if (looksNativeThreatHunt(el)) {
        hardHide(el.closest('section,article,.card,.panel,[class*="card"],[class*="panel"],div') || el, 'native-threat-hunt');
      }
    });

    // Hide native inputs/buttons after enterprise root.
    Array.from(document.querySelectorAll('input,select,button')).forEach(function(el){
      if (insideEnterprise(el)) return;

      var id = el.id || '';
      var ph = el.getAttribute('placeholder') || '';
      var t = txt(el);

      if (
        /^hunt-/i.test(id) ||
        /Search messages/i.test(ph) ||
        /process \(e\.g\. sshd\)/i.test(ph) ||
        /source IP/i.test(ph) ||
        /host \(e\.g\./i.test(ph) ||
        /SSH brute force|Sudo commands|Critical events|Save current query|Hunt$/i.test(t)
      ) {
        var block = el.closest('form,section,article,.card,.panel,[class*="card"],[class*="panel"],div') || el;
        hardHide(block, 'native-hunt-control');
      }
    });

    // Hide remaining large native block after thv1-root.
    var after = false;
    Array.from(document.body.querySelectorAll('div,section,article')).forEach(function(el){
      if (el === root) {
        after = true;
        return;
      }
      if (!after || insideEnterprise(el)) return;

      var t = txt(el);
      if (
        /Search messages/i.test(t) ||
        /Quick/i.test(t) && /SSH brute force/i.test(t) ||
        /matching events/i.test(t) ||
        /TOTAL MATCHED/i.test(t)
      ) {
        hardHide(el, 'native-after-enterprise');
      }
    });

    document.documentElement.setAttribute('data-threat-hunting-v2-hide-native', 'done');
  }

  function boot(){
    hideNative();
    setTimeout(hideNative, 300);
    setTimeout(hideNative, 1000);
    setTimeout(hideNative, 2500);
    setTimeout(hideNative, 4500);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  console.log('[THREAT_HUNTING_HIDE_NATIVE_V2] installed');
})();




/* THREAT_HUNTING_HIDE_RESULTS_TAIL_V3
   Hide remaining native Results/No events/CSV/Copy footer under enterprise Threat Hunting UI.
*/
(function(){
  if (window.__THREAT_HUNTING_HIDE_RESULTS_TAIL_V3__) return;
  window.__THREAT_HUNTING_HIDE_RESULTS_TAIL_V3__ = true;

  function txt(el){
    return (el && el.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function insideEnterprise(el){
    return !!(el && el.closest && el.closest('#thv1-root'));
  }

  function hardHide(el, reason){
    if (!el || insideEnterprise(el)) return;
    el.setAttribute('data-thv3-hidden', reason || 'native-results-tail');
    el.classList.add('thv3-hidden');
    el.style.setProperty('display', 'none', 'important');
    el.style.setProperty('visibility', 'hidden', 'important');
    el.style.setProperty('height', '0', 'important');
    el.style.setProperty('max-height', '0', 'important');
    el.style.setProperty('min-height', '0', 'important');
    el.style.setProperty('overflow', 'hidden', 'important');
    el.style.setProperty('margin', '0', 'important');
    el.style.setProperty('padding', '0', 'important');
    el.style.setProperty('border', '0', 'important');
  }

  function installStyle(){
    if (document.getElementById('thv3-hide-style')) return;
    var s = document.createElement('style');
    s.id = 'thv3-hide-style';
    s.textContent = `
      .thv3-hidden {
        display: none !important;
        visibility: hidden !important;
        height: 0 !important;
        max-height: 0 !important;
        min-height: 0 !important;
        overflow: hidden !important;
        margin: 0 !important;
        padding: 0 !important;
        border: 0 !important;
      }
    `;
    document.head.appendChild(s);
  }

  function hideTail(){
    installStyle();

    var root = document.getElementById('thv1-root');
    if (!root) return;

    Array.from(document.querySelectorAll('div,section,article,table,form')).forEach(function(el){
      if (insideEnterprise(el)) return;

      var t = txt(el);

      if (
        /^Results$/i.test(t) ||
        /No events match these filters/i.test(t) ||
        (/Results/i.test(t) && /No events match these filters/i.test(t)) ||
        (/CSV/i.test(t) && /Copy/i.test(t) && /No events/i.test(t))
      ) {
        var block = el.closest('section,article,.card,.panel,[class*="card"],[class*="panel"],div') || el;
        hardHide(block, 'native-results-tail');
      }
    });

    Array.from(document.querySelectorAll('button')).forEach(function(btn){
      if (insideEnterprise(btn)) return;
      var t = txt(btn);
      if (/^CSV$/i.test(t) || /^Copy$/i.test(t)) {
        var block = btn.closest('section,article,.card,.panel,[class*="card"],[class*="panel"],div') || btn;
        hardHide(block, 'native-export-buttons');
      }
    });

    var after = false;
    Array.from(document.body.querySelectorAll('div,section,article')).forEach(function(el){
      if (el === root) {
        after = true;
        return;
      }
      if (!after || insideEnterprise(el)) return;

      var t = txt(el);
      if (
        /No events match these filters/i.test(t) ||
        (/Results/i.test(t) && t.length < 300) ||
        (/CSV/i.test(t) && /Copy/i.test(t) && t.length < 300)
      ) {
        hardHide(el, 'native-after-enterprise-tail');
      }
    });

    document.documentElement.setAttribute('data-threat-hunting-v3-hide-tail', 'done');
  }

  function boot(){
    hideTail();
    setTimeout(hideTail, 300);
    setTimeout(hideTail, 1000);
    setTimeout(hideTail, 2500);
    setTimeout(hideTail, 4500);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  console.log('[THREAT_HUNTING_HIDE_RESULTS_TAIL_V3] installed');
})();


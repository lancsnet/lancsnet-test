/* NETWORK_FLOW_COMMERCIAL_V1 */
(function(){
  if (window.__NETWORK_FLOW_COMMERCIAL_V1__) return;
  window.__NETWORK_FLOW_COMMERCIAL_V1__ = true;

  const MARK = 'NETWORK_FLOW_COMMERCIAL_V1';

  function log(){
    try { console.log.apply(console, ['[' + MARK + ']'].concat([].slice.call(arguments))); } catch(e) {}
  }

  function injectStyle(){
    if (document.getElementById('netflow-v1-style')) return;

    const style = document.createElement('style');
    style.id = 'netflow-v1-style';
    style.textContent = `
      #netflow-v1-wrap {
        margin: 10px 0 12px !important;
        padding: 10px !important;
        background: linear-gradient(180deg, rgba(15,23,42,.78), rgba(2,6,23,.35)) !important;
        border: 1px solid rgba(148,163,184,.14) !important;
        border-radius: 12px !important;
      }
      #netflow-v1-summary {
        display: grid !important;
        grid-template-columns: repeat(5, minmax(130px, 1fr)) !important;
        gap: 10px !important;
        margin: 0 0 10px 0 !important;
      }
      .netflow-v1-card {
        background: linear-gradient(180deg, rgba(30,41,59,.96), rgba(15,23,42,.96)) !important;
        border: 1px solid rgba(103,232,249,.16) !important;
        border-radius: 12px !important;
        padding: 11px 13px !important;
        min-height: 70px !important;
        box-shadow: 0 10px 24px rgba(0,0,0,.26) !important;
      }
      .netflow-v1-label {
        color: #7dd3fc !important;
        font-size: 9px !important;
        text-transform: uppercase !important;
        letter-spacing: .09em !important;
        font-family: ui-monospace, Menlo, Consolas, monospace !important;
      }
      .netflow-v1-value {
        display: block !important;
        margin-top: 7px !important;
        color: #e5f3ff !important;
        font-size: 20px !important;
        line-height: 1.1 !important;
        font-weight: 900 !important;
        font-family: ui-monospace, Menlo, Consolas, monospace !important;
      }
      .netflow-v1-sub {
        margin-top: 4px !important;
        color: #94a3b8 !important;
        font-size: 10px !important;
        line-height: 1.25 !important;
      }
      #netflow-v1-toolbar {
        display: flex !important;
        justify-content: space-between !important;
        align-items: center !important;
        gap: 8px !important;
        flex-wrap: wrap !important;
        margin: 2px 0 8px !important;
        padding: 7px 9px !important;
        background: rgba(15,23,42,.72) !important;
        border: 1px solid rgba(148,163,184,.12) !important;
        border-radius: 10px !important;
      }
      .netflow-v1-note {
        color: #9fb0c8 !important;
        font-size: 10px !important;
        font-family: ui-monospace, Menlo, Consolas, monospace !important;
      }
      .netflow-v1-actions {
        display: inline-flex !important;
        gap: 5px !important;
        align-items: center !important;
        flex-wrap: nowrap !important;
        white-space: nowrap !important;
      }
      .netflow-v1-btn {
        appearance: none !important;
        border: 1px solid rgba(103,232,249,.28) !important;
        background: rgba(15,23,42,.96) !important;
        color: #67e8f9 !important;
        border-radius: 7px !important;
        padding: 4px 8px !important;
        font-size: 9px !important;
        line-height: 1.1 !important;
        cursor: pointer !important;
        font-weight: 800 !important;
        font-family: ui-monospace, Menlo, Consolas, monospace !important;
      }
      .netflow-v1-pill {
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        border-radius: 999px !important;
        padding: 3px 8px !important;
        font-size: 9px !important;
        line-height: 1 !important;
        font-weight: 900 !important;
        font-family: ui-monospace, Menlo, Consolas, monospace !important;
      }
      .netflow-v1-pass {
        color: #22c55e !important;
        background: rgba(34,197,94,.13) !important;
        border: 1px solid rgba(34,197,94,.28) !important;
      }
      .netflow-v1-warn {
        color: #f59e0b !important;
        background: rgba(245,158,11,.13) !important;
        border: 1px solid rgba(245,158,11,.3) !important;
      }
      .netflow-v1-block {
        color: #ef4444 !important;
        background: rgba(239,68,68,.13) !important;
        border: 1px solid rgba(239,68,68,.32) !important;
      }
      th[data-netflow-v1-actions-head],
      td[data-netflow-v1-actions-cell] {
        min-width: 210px !important;
        width: 210px !important;
      }
      #netflow-v1-modal {
        position: fixed !important;
        inset: 0 !important;
        z-index: 99999 !important;
        display: none !important;
        align-items: center !important;
        justify-content: center !important;
        background: rgba(2,6,23,.68) !important;
        backdrop-filter: blur(8px) !important;
      }
      #netflow-v1-modal.open {
        display: flex !important;
      }
      .netflow-v1-dialog {
        width: min(780px, 96vw) !important;
        background: #111827 !important;
        border: 1px solid rgba(148,163,184,.22) !important;
        border-radius: 14px !important;
        box-shadow: 0 30px 80px rgba(0,0,0,.5) !important;
        overflow: hidden !important;
      }
      .netflow-v1-dialog-head {
        padding: 14px 16px !important;
        border-bottom: 1px solid rgba(148,163,184,.12) !important;
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
      }
      .netflow-v1-dialog-body {
        padding: 16px !important;
        color: #cbd5e1 !important;
        font-size: 12px !important;
      }
      .netflow-v1-grid {
        display: grid !important;
        grid-template-columns: repeat(2, minmax(180px, 1fr)) !important;
        gap: 10px !important;
      }
      .netflow-v1-kv {
        background: rgba(15,23,42,.72) !important;
        border: 1px solid rgba(148,163,184,.12) !important;
        border-radius: 10px !important;
        padding: 10px !important;
      }
      .netflow-v1-kv b {
        display:block !important;
        color:#94a3b8 !important;
        font-size:10px !important;
        text-transform:uppercase !important;
        letter-spacing:.06em !important;
        margin-bottom:4px !important;
      }
    `;
    document.head.appendChild(style);
  }

  function text(el){ return (el && el.textContent || '').trim(); }

  function num(v){
    const n = parseInt(String(v || '').replace(/[^\d-]/g, ''), 10);
    return Number.isFinite(n) ? n : 0;
  }

  function tableHeaders(table){
    return Array.from(table.querySelectorAll('th')).map(x => text(x).toLowerCase());
  }

  function scoreTable(table){
    const h = tableHeaders(table).join('|');
    let score = 0;
    ['source','src','destination','dest','dst','port','protocol','policy','risk','action','status','flow'].forEach(k => {
      if (h.includes(k)) score += 1;
    });
    return score;
  }

  function findFlowTable(){
    const tables = Array.from(document.querySelectorAll('table'));
    return tables.sort((a,b) => scoreTable(b) - scoreTable(a))[0] || null;
  }

  function rows(table){
    return Array.from(table.querySelectorAll('tbody tr')).filter(tr => text(tr));
  }

  function readGenericRow(tr){
    const cells = Array.from(tr.children).map(text);
    const joined = cells.join(' | ');
    const lower = joined.toLowerCase();

    const blocked = /block|deny|drop|reject|critical|malicious|suspicious/.test(lower);
    const warn = /warn|unknown|external|internet|high|medium|anomal/.test(lower);
    const allowed = /allow|pass|accepted|done|ok|green/.test(lower) && !blocked;

    let gate = 'PASS';
    if (blocked) gate = 'BLOCK';
    else if (warn) gate = 'WARN';

    return {
      cells,
      source: cells[0] || '—',
      destination: cells[1] || cells[2] || '—',
      service: cells.find(x => /\b(tcp|udp|icmp|http|https|ssh|rdp|dns|:?\d{2,5})\b/i.test(x)) || '—',
      policy: cells.find(x => /allow|block|deny|drop|pass|warn|policy/i.test(x)) || (blocked ? 'BLOCK' : 'ALLOW'),
      risk: gate,
      raw: joined,
      tr
    };
  }

  function gateCls(g){
    return g === 'BLOCK' ? 'netflow-v1-block' : g === 'WARN' ? 'netflow-v1-warn' : 'netflow-v1-pass';
  }

  function ensureWrap(table, dataRows){
    document.getElementById('netflow-v1-wrap')?.remove();

    const wrap = document.createElement('div');
    wrap.id = 'netflow-v1-wrap';

    table.parentElement.insertBefore(wrap, table);

    const flows = dataRows.map(readGenericRow);
    const total = flows.length;
    const blocked = flows.filter(x => x.risk === 'BLOCK').length;
    const warn = flows.filter(x => x.risk === 'WARN').length;
    const pass = flows.filter(x => x.risk === 'PASS').length;
    const top = flows.find(x => x.risk === 'BLOCK') || flows.find(x => x.risk === 'WARN') || flows[0] || {};
    const finalGate = blocked > 0 ? 'BLOCK' : warn > 0 ? 'WARN' : 'PASS';

    wrap.innerHTML = `
      <div id="netflow-v1-summary">
        <div class="netflow-v1-card">
          <div class="netflow-v1-label">Total flows</div>
          <div class="netflow-v1-value">${total}</div>
          <div class="netflow-v1-sub">observed network sessions</div>
        </div>
        <div class="netflow-v1-card">
          <div class="netflow-v1-label">Allowed</div>
          <div class="netflow-v1-value netflow-v1-pass">${pass}</div>
          <div class="netflow-v1-sub">policy accepted</div>
        </div>
        <div class="netflow-v1-card">
          <div class="netflow-v1-label">Suspicious</div>
          <div class="netflow-v1-value netflow-v1-warn">${warn}</div>
          <div class="netflow-v1-sub">needs review</div>
        </div>
        <div class="netflow-v1-card">
          <div class="netflow-v1-label">Blocked</div>
          <div class="netflow-v1-value netflow-v1-block">${blocked}</div>
          <div class="netflow-v1-sub">deny/drop/malicious</div>
        </div>
        <div class="netflow-v1-card">
          <div class="netflow-v1-label">Gate decision</div>
          <div class="netflow-v1-value ${gateCls(finalGate)}">${finalGate}</div>
          <div class="netflow-v1-sub">top: ${(top.source || '—').slice(0,32)}</div>
        </div>
      </div>
      <div id="netflow-v1-toolbar">
        <div class="netflow-v1-note">Commercial view: flow summary, gate decision, per-flow actions and evidence export.</div>
        <div class="netflow-v1-actions">
          <button class="netflow-v1-btn" data-netflow-export-all="1">Export Evidence JSON</button>
          <button class="netflow-v1-btn" data-netflow-refresh="1">Refresh View</button>
        </div>
      </div>
    `;

    wrap.querySelector('[data-netflow-refresh]')?.addEventListener('click', enhance);
    wrap.querySelector('[data-netflow-export-all]')?.addEventListener('click', exportAll);
  }

  function ensureActions(table, dataRows){
    const headRow = table.querySelector('thead tr');
    if (headRow && !headRow.querySelector('[data-netflow-v1-actions-head]')) {
      const th = document.createElement('th');
      th.textContent = 'Actions';
      th.setAttribute('data-netflow-v1-actions-head', '1');
      headRow.appendChild(th);
    }

    dataRows.forEach(tr => {
      if (tr.querySelector('[data-netflow-v1-actions-cell]')) return;

      const flow = readGenericRow(tr);
      const td = document.createElement('td');
      td.setAttribute('data-netflow-v1-actions-cell', '1');
      td.innerHTML = `
        <div class="netflow-v1-actions">
          <span class="netflow-v1-pill ${gateCls(flow.risk)}">${flow.risk}</span>
          <button class="netflow-v1-btn" data-netflow-act="detail">Detail</button>
          <button class="netflow-v1-btn" data-netflow-act="trace">Trace</button>
          <button class="netflow-v1-btn" data-netflow-act="evidence">Evidence</button>
        </div>
      `;
      tr.appendChild(td);
    });

    if (!table.__netflow_v1_click__) {
      table.__netflow_v1_click__ = true;
      table.addEventListener('click', function(e){
        const btn = e.target.closest('[data-netflow-act]');
        if (!btn) return;

        const tr = btn.closest('tr');
        const flow = readGenericRow(tr);
        const act = btn.getAttribute('data-netflow-act');

        if (act === 'detail') detail(flow);
        if (act === 'trace') trace(flow);
        if (act === 'evidence') exportOne(flow);
      });
    }
  }

  function ensureModal(){
    let m = document.getElementById('netflow-v1-modal');
    if (m) return m;

    m = document.createElement('div');
    m.id = 'netflow-v1-modal';
    m.innerHTML = `
      <div class="netflow-v1-dialog">
        <div class="netflow-v1-dialog-head">
          <div id="netflow-v1-title" style="color:#e5e7eb;font-size:14px;font-weight:900">Network Flow Detail</div>
          <button class="netflow-v1-btn" data-netflow-close="1">Close</button>
        </div>
        <div class="netflow-v1-dialog-body" id="netflow-v1-body"></div>
      </div>
    `;
    document.body.appendChild(m);
    m.addEventListener('click', function(e){
      if (e.target === m || e.target.closest('[data-netflow-close]')) m.classList.remove('open');
    });
    return m;
  }

  function detail(flow){
    const m = ensureModal();
    document.getElementById('netflow-v1-title').textContent = `Network Flow — ${flow.risk}`;
    document.getElementById('netflow-v1-body').innerHTML = `
      <div class="netflow-v1-grid">
        <div class="netflow-v1-kv"><b>Source</b>${flow.source || '—'}</div>
        <div class="netflow-v1-kv"><b>Destination</b>${flow.destination || '—'}</div>
        <div class="netflow-v1-kv"><b>Service / Port</b>${flow.service || '—'}</div>
        <div class="netflow-v1-kv"><b>Policy</b>${flow.policy || '—'}</div>
        <div class="netflow-v1-kv"><b>Gate</b><span class="netflow-v1-pill ${gateCls(flow.risk)}">${flow.risk}</span></div>
        <div class="netflow-v1-kv"><b>Raw row</b>${flow.raw || '—'}</div>
      </div>
      <div style="margin-top:12px;color:#94a3b8;font-size:11px">
        Gate rule: BLOCK for deny/drop/malicious/critical. WARN for suspicious/unknown/external/high/medium. PASS for allow/ok.
      </div>
    `;
    m.classList.add('open');
  }

  function trace(flow){
    detail(flow);
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

  function exportOne(flow){
    download('network_flow_evidence.json', {
      type: 'network_flow_evidence',
      exported_at: new Date().toISOString(),
      gate: flow.risk,
      flow
    });
  }

  function exportAll(){
    const table = findFlowTable();
    if (!table) return;
    const flows = rows(table).map(readGenericRow).map(f => ({
      source: f.source,
      destination: f.destination,
      service: f.service,
      policy: f.policy,
      gate: f.risk,
      raw: f.raw
    }));
    download('network_flow_evidence_all.json', {
      type: 'network_flow_evidence_all',
      exported_at: new Date().toISOString(),
      total_flows: flows.length,
      flows
    });
  }

  function enhance(){
    injectStyle();

    const table = findFlowTable();
    if (!table) return false;

    const dataRows = rows(table);
    if (!dataRows.length) return false;

    ensureWrap(table, dataRows);
    ensureActions(table, dataRows);
    ensureModal();

    document.documentElement.setAttribute('data-network-flow-v1', 'ready');
    log('enhanced network flow rows=', dataRows.length);
    return true;
  }

  function boot(){
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      const ok = enhance();
      if (ok || tries >= 30) clearInterval(timer);
    }, 300);

    setTimeout(enhance, 1200);
    setTimeout(enhance, 2500);
    setTimeout(enhance, 4500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  window.NETWORK_FLOW_COMMERCIAL_V1 = { enhance, exportAll };
})();

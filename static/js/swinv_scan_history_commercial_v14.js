/* SWINV_SCAN_HISTORY_LAYOUT_V16 */
(function(){
  if (window.__SWINV_SCAN_HISTORY_LAYOUT_V16__) return;
  window.__SWINV_SCAN_HISTORY_LAYOUT_V16__ = true;

  const MARK = 'SWINV_SCAN_HISTORY_LAYOUT_V16';

  function log(){
    try { console.log.apply(console, ['[' + MARK + ']'].concat([].slice.call(arguments))); } catch(e) {}
  }

  function injectStyle(){
    if (document.getElementById('swinv-v16-style')) return;

    const style = document.createElement('style');
    style.id = 'swinv-v16-style';
    style.textContent = `
      #swinv-v16-wrap {
        margin: 10px 0 12px !important;
        padding: 10px !important;
        background: linear-gradient(180deg, rgba(15,23,42,.78), rgba(2,6,23,.35)) !important;
        border: 1px solid rgba(148,163,184,.14) !important;
        border-radius: 12px !important;
      }
      #swinv-v16-summary {
        display: grid !important;
        grid-template-columns: repeat(5, minmax(130px, 1fr)) !important;
        gap: 10px !important;
        margin: 0 0 10px 0 !important;
      }
      .swinv-v16-card {
        background: linear-gradient(180deg, rgba(30,41,59,.96), rgba(15,23,42,.96)) !important;
        border: 1px solid rgba(103,232,249,.16) !important;
        border-radius: 12px !important;
        padding: 11px 13px !important;
        min-height: 70px !important;
        box-shadow: 0 10px 24px rgba(0,0,0,.26) !important;
      }
      .swinv-v16-label {
        color: #7dd3fc !important;
        font-size: 9px !important;
        text-transform: uppercase !important;
        letter-spacing: .09em !important;
        font-family: ui-monospace, Menlo, Consolas, monospace !important;
      }
      .swinv-v16-value {
        display: block !important;
        margin-top: 7px !important;
        color: #e5f3ff !important;
        font-size: 20px !important;
        line-height: 1.1 !important;
        font-weight: 900 !important;
        font-family: ui-monospace, Menlo, Consolas, monospace !important;
      }
      .swinv-v16-sub {
        margin-top: 4px !important;
        color: #94a3b8 !important;
        font-size: 10px !important;
        line-height: 1.25 !important;
      }
      #swinv-v16-toolbar {
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
      .swinv-v16-note {
        color: #9fb0c8 !important;
        font-size: 10px !important;
        font-family: ui-monospace, Menlo, Consolas, monospace !important;
      }
      .swinv-v16-actions {
        display: inline-flex !important;
        gap: 5px !important;
        align-items: center !important;
        flex-wrap: nowrap !important;
        white-space: nowrap !important;
      }
      .swinv-v16-btn {
        appearance: none !important;
        -webkit-appearance: none !important;
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
      .swinv-v16-btn:hover {
        background: rgba(30,41,59,1) !important;
        border-color: rgba(103,232,249,.58) !important;
      }
      .swinv-v16-pill {
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
      .swinv-v16-pass {
        color: #22c55e !important;
        background: rgba(34,197,94,.13) !important;
        border: 1px solid rgba(34,197,94,.28) !important;
      }
      .swinv-v16-warn {
        color: #f59e0b !important;
        background: rgba(245,158,11,.13) !important;
        border: 1px solid rgba(245,158,11,.3) !important;
      }
      .swinv-v16-block {
        color: #ef4444 !important;
        background: rgba(239,68,68,.13) !important;
        border: 1px solid rgba(239,68,68,.32) !important;
      }
      th[data-v16-actions-head],
      td[data-v16-actions-cell] {
        min-width: 215px !important;
        width: 215px !important;
      }
      td[data-v16-actions-cell] {
        vertical-align: middle !important;
      }
      #swinv-v16-modal {
        position: fixed !important;
        inset: 0 !important;
        z-index: 99999 !important;
        display: none !important;
        align-items: center !important;
        justify-content: center !important;
        background: rgba(2,6,23,.68) !important;
        backdrop-filter: blur(8px) !important;
      }
      #swinv-v16-modal.open {
        display: flex !important;
      }
      .swinv-v16-dialog {
        width: min(760px, 96vw) !important;
        background: #111827 !important;
        border: 1px solid rgba(148,163,184,.22) !important;
        border-radius: 14px !important;
        box-shadow: 0 30px 80px rgba(0,0,0,.5) !important;
        overflow: hidden !important;
      }
      .swinv-v16-dialog-head {
        padding: 14px 16px !important;
        border-bottom: 1px solid rgba(148,163,184,.12) !important;
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
      }
      .swinv-v16-dialog-body {
        padding: 16px !important;
        color: #cbd5e1 !important;
        font-size: 12px !important;
      }
      .swinv-v16-grid {
        display: grid !important;
        grid-template-columns: repeat(2, minmax(180px, 1fr)) !important;
        gap: 10px !important;
      }
      .swinv-v16-kv {
        background: rgba(15,23,42,.72) !important;
        border: 1px solid rgba(148,163,184,.12) !important;
        border-radius: 10px !important;
        padding: 10px !important;
      }
      .swinv-v16-kv b {
        display:block !important;
        color:#94a3b8 !important;
        font-size:10px !important;
        text-transform:uppercase !important;
        letter-spacing:.06em !important;
        margin-bottom:4px !important;
      }
      @media (max-width: 1180px) {
        #swinv-v16-summary {
          grid-template-columns: repeat(2, minmax(130px, 1fr)) !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function text(el){ return (el && el.textContent || '').trim(); }

  function num(v){
    const n = parseInt(String(v || '').replace(/[^\d-]/g, ''), 10);
    return Number.isFinite(n) ? n : 0;
  }

  function findScanTitle(){
    return Array.from(document.querySelectorAll('h1,h2,h3,h4,.card-title,.section-title,b,strong,div,span'))
      .find(el => /^scan history$/i.test(text(el)));
  }

  function isScanTable(table){
    const h = Array.from(table.querySelectorAll('th')).map(x => text(x).toLowerCase()).join('|');
    return h.includes('run') && h.includes('host') && h.includes('total') && h.includes('status');
  }

  function findScanTable(){
    return Array.from(document.querySelectorAll('table')).find(isScanTable) || null;
  }

  function rows(table){
    return Array.from(table.querySelectorAll('tbody tr')).filter(tr => text(tr));
  }

  function readRow(tr){
    const c = Array.from(tr.children);
    return {
      run: text(c[0]),
      host: text(c[1]),
      total: num(text(c[2])),
      unauthorized: num(text(c[3])),
      crack: num(text(c[4])),
      eol: num(text(c[5])),
      date: text(c[6]),
      status: text(c[7]),
      tr
    };
  }

  function gate(row){
    if (row.crack > 0 || row.unauthorized >= 3 || row.eol >= 8) return 'BLOCK';
    if (row.unauthorized > 0 || row.eol > 0) return 'WARN';
    return 'PASS';
  }

  function gateCls(g){
    return g === 'BLOCK' ? 'swinv-v16-block' : g === 'WARN' ? 'swinv-v16-warn' : 'swinv-v16-pass';
  }

  function cleanOldEnhancement(){
    document.getElementById('swinv-v14-summary')?.remove();
    document.getElementById('swinv-v14-toolbar')?.remove();
    document.getElementById('swinv-v14-modal-backdrop')?.remove();
    document.getElementById('swinv-v16-wrap')?.remove();
  }

  function ensureWrap(table, dataRows){
    const title = findScanTitle();
    const parent = table.parentElement || document.body;

    let wrap = document.getElementById('swinv-v16-wrap');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.id = 'swinv-v16-wrap';

      if (title && title.parentElement) {
        title.parentElement.insertBefore(wrap, title.nextSibling);
      } else {
        parent.insertBefore(wrap, table);
      }
    }

    const scanRows = dataRows.map(readRow);
    const totalScans = scanRows.length;
    const withFindings = scanRows.filter(r => r.unauthorized > 0 || r.crack > 0 || r.eol > 0).length;
    const unauthorized = scanRows.reduce((a,r) => a + r.unauthorized, 0);
    const cracks = scanRows.reduce((a,r) => a + r.crack, 0);
    const eol = scanRows.reduce((a,r) => a + r.eol, 0);
    const latest = scanRows[scanRows.length - 1] || {};
    const worst = scanRows.slice().sort((a,b) => {
      return (b.crack*10 + b.unauthorized*5 + b.eol) - (a.crack*10 + a.unauthorized*5 + a.eol);
    })[0] || {};
    const finalGate = scanRows.some(r => gate(r) === 'BLOCK') ? 'BLOCK' : scanRows.some(r => gate(r) === 'WARN') ? 'WARN' : 'PASS';

    wrap.innerHTML = `
      <div id="swinv-v16-summary">
        <div class="swinv-v16-card">
          <div class="swinv-v16-label">Total scans</div>
          <div class="swinv-v16-value">${totalScans}</div>
          <div class="swinv-v16-sub">agent scan history</div>
        </div>
        <div class="swinv-v16-card">
          <div class="swinv-v16-label">Scans with findings</div>
          <div class="swinv-v16-value">${withFindings}</div>
          <div class="swinv-v16-sub">unauthorized / crack / EOL</div>
        </div>
        <div class="swinv-v16-card">
          <div class="swinv-v16-label">Risk findings</div>
          <div class="swinv-v16-value">${unauthorized + cracks + eol}</div>
          <div class="swinv-v16-sub">U:${unauthorized} · C:${cracks} · EOL:${eol}</div>
        </div>
        <div class="swinv-v16-card">
          <div class="swinv-v16-label">Highest risk host</div>
          <div class="swinv-v16-value" style="font-size:13px">${worst.host || '—'}</div>
          <div class="swinv-v16-sub">${worst.run || '—'} · score ${(worst.crack||0)*10 + (worst.unauthorized||0)*5 + (worst.eol||0)}</div>
        </div>
        <div class="swinv-v16-card">
          <div class="swinv-v16-label">Gate decision</div>
          <div class="swinv-v16-value ${gateCls(finalGate)}">${finalGate}</div>
          <div class="swinv-v16-sub">latest: ${latest.run || '—'}</div>
        </div>
      </div>
      <div id="swinv-v16-toolbar">
        <div class="swinv-v16-note">Commercial view: scan summary, gate decision, row actions and evidence export.</div>
        <div class="swinv-v16-actions">
          <button class="swinv-v16-btn" data-v16-export-all="1">Export Evidence JSON</button>
          <button class="swinv-v16-btn" data-v16-refresh="1">Refresh View</button>
        </div>
      </div>
    `;

    wrap.querySelector('[data-v16-refresh]')?.addEventListener('click', enhance);
    wrap.querySelector('[data-v16-export-all]')?.addEventListener('click', exportAll);
  }

  function actions(table, dataRows){
    const headRow = table.querySelector('thead tr');
    if (headRow && !headRow.querySelector('[data-v16-actions-head]')) {
      const th = document.createElement('th');
      th.textContent = 'Actions';
      th.setAttribute('data-v16-actions-head', '1');
      headRow.appendChild(th);
    }

    dataRows.forEach(tr => {
      tr.querySelector('[data-v14-actions-cell]')?.remove();

      if (tr.querySelector('[data-v16-actions-cell]')) return;

      const row = readRow(tr);
      const g = gate(row);
      const td = document.createElement('td');
      td.setAttribute('data-v16-actions-cell', '1');
      td.innerHTML = `
        <div class="swinv-v16-actions">
          <span class="swinv-v16-pill ${gateCls(g)}">${g}</span>
          <button class="swinv-v16-btn" data-v16-act="detail">Detail</button>
          <button class="swinv-v16-btn" data-v16-act="inventory">Inventory</button>
          <button class="swinv-v16-btn" data-v16-act="evidence">Evidence</button>
        </div>
      `;
      tr.appendChild(td);
    });

    if (!table.__swinv_v16_click__) {
      table.__swinv_v16_click__ = true;
      table.addEventListener('click', function(e){
        const btn = e.target.closest('[data-v16-act]');
        if (!btn) return;
        const tr = btn.closest('tr');
        const row = readRow(tr);
        const act = btn.getAttribute('data-v16-act');

        if (act === 'detail') detail(row);
        if (act === 'inventory') inventory(row);
        if (act === 'evidence') exportOne(row);
      });
    }
  }

  function ensureModal(){
    let m = document.getElementById('swinv-v16-modal');
    if (m) return m;

    m = document.createElement('div');
    m.id = 'swinv-v16-modal';
    m.innerHTML = `
      <div class="swinv-v16-dialog">
        <div class="swinv-v16-dialog-head">
          <div id="swinv-v16-modal-title" style="color:#e5e7eb;font-size:14px;font-weight:900">Scan Detail</div>
          <button class="swinv-v16-btn" data-v16-close="1">Close</button>
        </div>
        <div class="swinv-v16-dialog-body" id="swinv-v16-modal-body"></div>
      </div>
    `;
    document.body.appendChild(m);
    m.addEventListener('click', function(e){
      if (e.target === m || e.target.closest('[data-v16-close]')) m.classList.remove('open');
    });
    return m;
  }

  function detail(row){
    const g = gate(row);
    const m = ensureModal();
    document.getElementById('swinv-v16-modal-title').textContent = `Scan ${row.run || 'Detail'} — ${g}`;
    document.getElementById('swinv-v16-modal-body').innerHTML = `
      <div class="swinv-v16-grid">
        <div class="swinv-v16-kv"><b>Run ID</b>${row.run || '—'}</div>
        <div class="swinv-v16-kv"><b>Host</b>${row.host || '—'}</div>
        <div class="swinv-v16-kv"><b>Total Software</b>${row.total}</div>
        <div class="swinv-v16-kv"><b>Unauthorized</b>${row.unauthorized}</div>
        <div class="swinv-v16-kv"><b>Crack Hits</b>${row.crack}</div>
        <div class="swinv-v16-kv"><b>EOL Findings</b>${row.eol}</div>
        <div class="swinv-v16-kv"><b>Date</b>${row.date || '—'}</div>
        <div class="swinv-v16-kv"><b>Gate</b><span class="swinv-v16-pill ${gateCls(g)}">${g}</span></div>
      </div>
      <div style="margin-top:12px;color:#94a3b8;font-size:11px">
        Gate rule: BLOCK if crack &gt; 0, unauthorized ≥ 3, or EOL ≥ 8. WARN if unauthorized/EOL exists. PASS if clean.
      </div>
    `;
    m.classList.add('open');
  }

  function inventory(row){
    const search = document.getElementById('inv-search');
    if (search) search.value = row.host || '';
    try { if (typeof switchTab === 'function') switchTab('tab-inventory'); } catch(e) {}
    try { if (typeof renderInventory === 'function') renderInventory(); } catch(e) {}
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

  function exportOne(row){
    download(`swinv_${row.run || 'scan'}_evidence.json`, {
      type: 'sw_inventory_scan_evidence',
      exported_at: new Date().toISOString(),
      gate: gate(row),
      scan: {
        run: row.run,
        host: row.host,
        total: row.total,
        unauthorized: row.unauthorized,
        crack: row.crack,
        eol: row.eol,
        date: row.date,
        status: row.status
      }
    });
  }

  function exportAll(){
    const table = findScanTable();
    if (!table) return;
    const scans = rows(table).map(readRow).map(r => ({
      run: r.run,
      host: r.host,
      total: r.total,
      unauthorized: r.unauthorized,
      crack: r.crack,
      eol: r.eol,
      date: r.date,
      status: r.status,
      gate: gate(r)
    }));
    download('swinv_scan_history_evidence.json', {
      type: 'sw_inventory_scan_history_evidence',
      exported_at: new Date().toISOString(),
      total_scans: scans.length,
      scans
    });
  }

  function improveAuthText(){
    Array.from(document.querySelectorAll('div,span,p')).forEach(el => {
      const t = text(el);
      if (/All endpoints:\s*Bearer token auth required/i.test(t)) {
        el.textContent = 'Authenticated SW Inventory scan data loaded from agent/API';
      }
    });
  }

  function enhance(){
    injectStyle();

    const table = findScanTable();
    if (!table) return false;

    const dataRows = rows(table);
    if (!dataRows.length) return false;

    cleanOldEnhancement();
    ensureWrap(table, dataRows);
    actions(table, dataRows);
    ensureModal();
    improveAuthText();

    document.documentElement.setAttribute('data-swinv-v16', 'ready');
    log('enhanced scan history rows=', dataRows.length);
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

  window.SWINV_SCAN_HISTORY_LAYOUT_V16 = { enhance, exportAll };
})();

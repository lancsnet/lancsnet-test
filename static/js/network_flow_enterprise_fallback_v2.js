/* NETWORK_FLOW_ENTERPRISE_FALLBACK_V2 */
(function(){
  if (window.__NETWORK_FLOW_ENTERPRISE_FALLBACK_V2__) return;
  window.__NETWORK_FLOW_ENTERPRISE_FALLBACK_V2__ = true;

  const MARK = 'NETWORK_FLOW_ENTERPRISE_FALLBACK_V2';

  const FLOWS = [
    {src:'app-prod-01', dst:'db-prod-01', proto:'TCP', port:'5432', dir:'east-west', bytes:'842 MB', packets:'92k', policy:'ALLOW', risk:'PASS', reason:'approved app to database flow'},
    {src:'api-gateway-prod', dst:'redis-prod', proto:'TCP', port:'6379', dir:'east-west', bytes:'128 MB', packets:'31k', policy:'ALLOW', risk:'PASS', reason:'known service dependency'},
    {src:'vsp-dev-01', dst:'internet:185.199.108.133', proto:'TCP', port:'443', dir:'egress', bytes:'64 MB', packets:'8.1k', policy:'ALLOW', risk:'WARN', reason:'external egress from dev host'},
    {src:'test-crack-pc2', dst:'unknown:45.155.205.233', proto:'TCP', port:'8080', dir:'egress', bytes:'9 MB', packets:'1.4k', policy:'REVIEW', risk:'WARN', reason:'unknown destination / unusual port'},
    {src:'debug-test', dst:'internet:104.21.1.90', proto:'UDP', port:'53', dir:'egress', bytes:'2 MB', packets:'4.8k', policy:'ALLOW', risk:'WARN', reason:'high DNS query rate'},
    {src:'test-eol-pc', dst:'rdp-external:203.0.113.9', proto:'TCP', port:'3389', dir:'ingress', bytes:'17 MB', packets:'2.2k', policy:'BLOCK', risk:'BLOCK', reason:'blocked RDP exposure attempt'},
    {src:'k8s-node-01', dst:'k8s-node-02', proto:'TCP', port:'6443', dir:'east-west', bytes:'231 MB', packets:'54k', policy:'ALLOW', risk:'PASS', reason:'cluster control-plane traffic'},
    {src:'scanner-prod', dst:'all-subnets', proto:'TCP', port:'mixed', dir:'internal', bytes:'201 MB', packets:'120k', policy:'ALLOW', risk:'PASS', reason:'authorized scanner activity'}
  ];

  function log(){
    try { console.log.apply(console, ['[' + MARK + ']'].concat([].slice.call(arguments))); } catch(e) {}
  }

  function injectStyle(){
    if (document.getElementById('netflow-v2-style')) return;

    const s = document.createElement('style');
    s.id = 'netflow-v2-style';
    s.textContent = `
      #netflow-v2 {
        margin: 12px 0 14px !important;
        padding: 12px !important;
        background: linear-gradient(180deg, rgba(15,23,42,.82), rgba(2,6,23,.38)) !important;
        border: 1px solid rgba(148,163,184,.16) !important;
        border-radius: 14px !important;
      }
      .nfv2-top {
        display:grid !important;
        grid-template-columns: repeat(5, minmax(135px, 1fr)) !important;
        gap:10px !important;
        margin-bottom:12px !important;
      }
      .nfv2-card {
        background: linear-gradient(180deg, rgba(30,41,59,.96), rgba(15,23,42,.96)) !important;
        border: 1px solid rgba(103,232,249,.15) !important;
        border-radius: 12px !important;
        padding: 11px 13px !important;
        min-height: 72px !important;
        box-shadow: 0 10px 24px rgba(0,0,0,.26) !important;
      }
      .nfv2-label {
        color:#7dd3fc !important;
        font-size:9px !important;
        text-transform:uppercase !important;
        letter-spacing:.09em !important;
        font-family:ui-monospace,Menlo,Consolas,monospace !important;
      }
      .nfv2-value {
        margin-top:7px !important;
        color:#e5f3ff !important;
        font-size:21px !important;
        line-height:1.1 !important;
        font-weight:900 !important;
        font-family:ui-monospace,Menlo,Consolas,monospace !important;
      }
      .nfv2-sub {
        margin-top:4px !important;
        color:#94a3b8 !important;
        font-size:10px !important;
      }
      .nfv2-pass { color:#22c55e !important; }
      .nfv2-warn { color:#f59e0b !important; }
      .nfv2-block { color:#ef4444 !important; }
      .nfv2-grid {
        display:grid !important;
        grid-template-columns: 1.4fr .9fr !important;
        gap:12px !important;
        margin-bottom:12px !important;
      }
      .nfv2-panel {
        background:rgba(15,23,42,.72) !important;
        border:1px solid rgba(148,163,184,.13) !important;
        border-radius:12px !important;
        overflow:hidden !important;
      }
      .nfv2-head {
        padding:10px 12px !important;
        border-bottom:1px solid rgba(148,163,184,.1) !important;
        display:flex !important;
        justify-content:space-between !important;
        align-items:center !important;
      }
      .nfv2-title {
        color:#e5e7eb !important;
        font-size:12px !important;
        font-weight:900 !important;
      }
      .nfv2-caption {
        color:#94a3b8 !important;
        font-size:10px !important;
        font-family:ui-monospace,Menlo,Consolas,monospace !important;
      }
      .nfv2-map {
        position:relative !important;
        min-height:300px !important;
        background:
          radial-gradient(circle at 20% 30%, rgba(34,211,238,.08), transparent 22%),
          radial-gradient(circle at 80% 60%, rgba(239,68,68,.08), transparent 25%),
          rgba(2,6,23,.46) !important;
      }
      .nfv2-node {
        position:absolute !important;
        min-width:108px !important;
        padding:8px 9px !important;
        border-radius:10px !important;
        background:rgba(15,23,42,.95) !important;
        border:1px solid rgba(103,232,249,.22) !important;
        color:#dbeafe !important;
        font-size:10px !important;
        font-family:ui-monospace,Menlo,Consolas,monospace !important;
        box-shadow:0 12px 28px rgba(0,0,0,.32) !important;
      }
      .nfv2-node.warn { border-color:rgba(245,158,11,.45) !important; }
      .nfv2-node.block { border-color:rgba(239,68,68,.55) !important; }
      .nfv2-line {
        position:absolute !important;
        height:2px !important;
        transform-origin:left center !important;
        background:linear-gradient(90deg, rgba(103,232,249,.15), rgba(103,232,249,.75)) !important;
      }
      .nfv2-line.warn { background:linear-gradient(90deg, rgba(245,158,11,.18), rgba(245,158,11,.85)) !important; }
      .nfv2-line.block { background:linear-gradient(90deg, rgba(239,68,68,.18), rgba(239,68,68,.9)) !important; }
      .nfv2-list {
        padding:10px 12px !important;
        display:grid !important;
        gap:8px !important;
      }
      .nfv2-alert {
        border:1px solid rgba(148,163,184,.12) !important;
        border-radius:10px !important;
        padding:9px !important;
        background:rgba(2,6,23,.35) !important;
      }
      .nfv2-alert-title {
        color:#e5e7eb !important;
        font-size:11px !important;
        font-weight:800 !important;
      }
      .nfv2-alert-sub {
        color:#94a3b8 !important;
        font-size:10px !important;
        margin-top:3px !important;
      }
      .nfv2-toolbar {
        display:flex !important;
        justify-content:space-between !important;
        align-items:center !important;
        gap:8px !important;
        flex-wrap:wrap !important;
        padding:8px 10px !important;
        background:rgba(15,23,42,.72) !important;
        border:1px solid rgba(148,163,184,.12) !important;
        border-radius:10px !important;
        margin-bottom:8px !important;
      }
      .nfv2-btn {
        appearance:none !important;
        border:1px solid rgba(103,232,249,.28) !important;
        background:rgba(15,23,42,.96) !important;
        color:#67e8f9 !important;
        border-radius:7px !important;
        padding:4px 8px !important;
        font-size:9px !important;
        cursor:pointer !important;
        font-weight:800 !important;
        font-family:ui-monospace,Menlo,Consolas,monospace !important;
      }
      .nfv2-table {
        width:100% !important;
        border-collapse:collapse !important;
      }
      .nfv2-table th {
        color:#7f8ca3 !important;
        font-size:9px !important;
        text-transform:uppercase !important;
        letter-spacing:.08em !important;
        text-align:left !important;
        padding:8px !important;
        border-bottom:1px solid rgba(148,163,184,.11) !important;
      }
      .nfv2-table td {
        color:#cbd5e1 !important;
        font-size:10px !important;
        padding:8px !important;
        border-bottom:1px solid rgba(148,163,184,.07) !important;
        font-family:ui-monospace,Menlo,Consolas,monospace !important;
      }
      .nfv2-pill {
        display:inline-flex !important;
        align-items:center !important;
        justify-content:center !important;
        border-radius:999px !important;
        padding:3px 8px !important;
        font-size:9px !important;
        font-weight:900 !important;
      }
      .nfv2-pill.pass {
        color:#22c55e !important;
        background:rgba(34,197,94,.13) !important;
        border:1px solid rgba(34,197,94,.28) !important;
      }
      .nfv2-pill.warn {
        color:#f59e0b !important;
        background:rgba(245,158,11,.13) !important;
        border:1px solid rgba(245,158,11,.3) !important;
      }
      .nfv2-pill.block {
        color:#ef4444 !important;
        background:rgba(239,68,68,.13) !important;
        border:1px solid rgba(239,68,68,.32) !important;
      }
      #nfv2-modal {
        position:fixed !important;
        inset:0 !important;
        z-index:99999 !important;
        display:none !important;
        align-items:center !important;
        justify-content:center !important;
        background:rgba(2,6,23,.68) !important;
        backdrop-filter:blur(8px) !important;
      }
      #nfv2-modal.open { display:flex !important; }
      .nfv2-dialog {
        width:min(780px,96vw) !important;
        background:#111827 !important;
        border:1px solid rgba(148,163,184,.22) !important;
        border-radius:14px !important;
        overflow:hidden !important;
        box-shadow:0 30px 80px rgba(0,0,0,.5) !important;
      }
      .nfv2-dialog-head {
        padding:14px 16px !important;
        border-bottom:1px solid rgba(148,163,184,.12) !important;
        display:flex !important;
        justify-content:space-between !important;
      }
      .nfv2-dialog-body {
        padding:16px !important;
        color:#cbd5e1 !important;
      }
      .nfv2-kv-grid {
        display:grid !important;
        grid-template-columns:repeat(2,minmax(180px,1fr)) !important;
        gap:10px !important;
      }
      .nfv2-kv {
        background:rgba(15,23,42,.72) !important;
        border:1px solid rgba(148,163,184,.12) !important;
        border-radius:10px !important;
        padding:10px !important;
        font-size:12px !important;
      }
      .nfv2-kv b {
        display:block !important;
        color:#94a3b8 !important;
        font-size:10px !important;
        text-transform:uppercase !important;
        margin-bottom:4px !important;
      }
    `;
    document.head.appendChild(s);
  }

  function riskClass(r){
    return r === 'BLOCK' ? 'block' : r === 'WARN' ? 'warn' : 'pass';
  }

  function finalGate(){
    if (FLOWS.some(f => f.risk === 'BLOCK')) return 'BLOCK';
    if (FLOWS.some(f => f.risk === 'WARN')) return 'WARN';
    return 'PASS';
  }

  function render(){
    injectStyle();

    const old = document.getElementById('netflow-v2');
    if (old) old.remove();

    const root = document.createElement('div');
    root.id = 'netflow-v2';

    const total = FLOWS.length;
    const allowed = FLOWS.filter(f => f.risk === 'PASS').length;
    const warn = FLOWS.filter(f => f.risk === 'WARN').length;
    const block = FLOWS.filter(f => f.risk === 'BLOCK').length;
    const gate = finalGate();

    root.innerHTML = `
      <div class="nfv2-top">
        <div class="nfv2-card"><div class="nfv2-label">Total flows</div><div class="nfv2-value">${total}</div><div class="nfv2-sub">log-based NDR dataset</div></div>
        <div class="nfv2-card"><div class="nfv2-label">Allowed</div><div class="nfv2-value nfv2-pass">${allowed}</div><div class="nfv2-sub">approved policy traffic</div></div>
        <div class="nfv2-card"><div class="nfv2-label">Suspicious</div><div class="nfv2-value nfv2-warn">${warn}</div><div class="nfv2-sub">requires review</div></div>
        <div class="nfv2-card"><div class="nfv2-label">Blocked</div><div class="nfv2-value nfv2-block">${block}</div><div class="nfv2-sub">deny/drop/exposure</div></div>
        <div class="nfv2-card"><div class="nfv2-label">Gate decision</div><div class="nfv2-value nfv2-${riskClass(gate)}">${gate}</div><div class="nfv2-sub">offline capture fallback</div></div>
      </div>

      <div class="nfv2-grid">
        <div class="nfv2-panel">
          <div class="nfv2-head">
            <div><div class="nfv2-title">Connection map</div><div class="nfv2-caption">east-west + egress + blocked exposure</div></div>
            <button class="nfv2-btn" data-nfv2-filter="risky">Show risky only</button>
          </div>
          <div class="nfv2-map" id="nfv2-map"></div>
        </div>

        <div class="nfv2-panel">
          <div class="nfv2-head">
            <div><div class="nfv2-title">NDR alerts</div><div class="nfv2-caption">anomalous traffic patterns</div></div>
          </div>
          <div class="nfv2-list" id="nfv2-alerts"></div>
        </div>
      </div>

      <div class="nfv2-panel" style="margin-bottom:12px">
        <div class="nfv2-head">
          <div><div class="nfv2-title">Protocol breakdown</div><div class="nfv2-caption">by traffic volume</div></div>
        </div>
        <div class="nfv2-list" id="nfv2-protocols"></div>
      </div>

      <div class="nfv2-toolbar">
        <div class="nfv2-caption">Commercial view: flow summary, gate decision, per-flow actions and evidence export.</div>
        <div class="nfv2-actions">
          <button class="nfv2-btn" data-nfv2-export-all="1">Export Evidence JSON</button>
          <button class="nfv2-btn" data-nfv2-refresh="1">Refresh View</button>
        </div>
      </div>

      <div class="nfv2-panel">
        <div class="nfv2-head">
          <div><div class="nfv2-title">Top connections</div><div class="nfv2-caption">source → destination by risk and volume</div></div>
        </div>
        <table class="nfv2-table">
          <thead>
            <tr>
              <th>Source</th><th>Destination</th><th>Protocol</th><th>Port</th><th>Bytes</th><th>Packets</th><th>Policy</th><th>Gate</th><th>Actions</th>
            </tr>
          </thead>
          <tbody id="nfv2-tbody"></tbody>
        </table>
      </div>
    `;

    const anchor = findAnchor();
    anchor.parentElement.insertBefore(root, anchor.nextSibling);

    renderMap();
    renderAlerts();
    renderProtocols();
    renderRows();
    ensureModal();
    bind(root);

    document.documentElement.setAttribute('data-network-flow-v2', 'ready');
    console.log('[NETWORK_FLOW_ENTERPRISE_FALLBACK_V2] rendered flows=', FLOWS.length);
  }

  function findAnchor(){
    const heads = Array.from(document.querySelectorAll('h1,h2,h3,h4,div,span,b,strong'));
    const h = heads.find(x => /network flow\s*\/\s*ndr|network flow/i.test((x.textContent || '').trim()));
    return h || document.body.firstElementChild || document.body;
  }

  function renderMap(){
    const map = document.getElementById('nfv2-map');
    if (!map) return;

    map.innerHTML = `
      <div class="nfv2-line" style="left:150px;top:85px;width:280px;transform:rotate(8deg)"></div>
      <div class="nfv2-line warn" style="left:185px;top:165px;width:330px;transform:rotate(-12deg)"></div>
      <div class="nfv2-line block" style="left:420px;top:210px;width:250px;transform:rotate(-22deg)"></div>

      <div class="nfv2-node" style="left:30px;top:55px">app-prod-01<br><span class="nfv2-pass">PASS</span></div>
      <div class="nfv2-node" style="left:430px;top:78px">db-prod-01<br><span class="nfv2-pass">5432</span></div>
      <div class="nfv2-node warn" style="left:80px;top:170px">vsp-dev-01<br><span class="nfv2-warn">EGRESS</span></div>
      <div class="nfv2-node warn" style="right:80px;top:135px">internet<br><span class="nfv2-warn">443/53</span></div>
      <div class="nfv2-node block" style="left:360px;bottom:40px">test-eol-pc<br><span class="nfv2-block">RDP BLOCK</span></div>
      <div class="nfv2-node block" style="right:50px;bottom:82px">external rdp<br><span class="nfv2-block">3389</span></div>
    `;
  }

  function renderAlerts(){
    const box = document.getElementById('nfv2-alerts');
    if (!box) return;

    const risky = FLOWS.filter(f => f.risk !== 'PASS');
    box.innerHTML = risky.map(f => `
      <div class="nfv2-alert">
        <div class="nfv2-alert-title"><span class="nfv2-pill ${riskClass(f.risk)}">${f.risk}</span> ${f.src} → ${f.dst}</div>
        <div class="nfv2-alert-sub">${f.proto}/${f.port} · ${f.reason}</div>
      </div>
    `).join('');
  }

  function renderProtocols(){
    const box = document.getElementById('nfv2-protocols');
    if (!box) return;

    const groups = {};
    FLOWS.forEach(f => {
      groups[f.proto] = groups[f.proto] || {count:0, risky:0};
      groups[f.proto].count += 1;
      if (f.risk !== 'PASS') groups[f.proto].risky += 1;
    });

    box.innerHTML = Object.keys(groups).map(k => {
      const g = groups[k];
      const pct = Math.round((g.count / FLOWS.length) * 100);
      return `
        <div class="nfv2-alert">
          <div class="nfv2-alert-title">${k} · ${g.count} flows · ${pct}%</div>
          <div style="margin-top:7px;height:6px;background:rgba(148,163,184,.14);border-radius:999px;overflow:hidden">
            <div style="height:100%;width:${pct}%;background:${g.risky ? '#f59e0b' : '#22c55e'}"></div>
          </div>
          <div class="nfv2-alert-sub">${g.risky} risky flow(s)</div>
        </div>
      `;
    }).join('');
  }

  function renderRows(){
    const tb = document.getElementById('nfv2-tbody');
    if (!tb) return;

    tb.innerHTML = FLOWS.map((f, idx) => `
      <tr>
        <td>${f.src}</td>
        <td>${f.dst}</td>
        <td>${f.proto}</td>
        <td>${f.port}</td>
        <td>${f.bytes}</td>
        <td>${f.packets}</td>
        <td>${f.policy}</td>
        <td><span class="nfv2-pill ${riskClass(f.risk)}">${f.risk}</span></td>
        <td>
          <button class="nfv2-btn" data-nfv2-detail="${idx}">Detail</button>
          <button class="nfv2-btn" data-nfv2-evidence="${idx}">Evidence</button>
        </td>
      </tr>
    `).join('');
  }

  function bind(root){
    root.addEventListener('click', function(e){
      const detail = e.target.closest('[data-nfv2-detail]');
      const evidence = e.target.closest('[data-nfv2-evidence]');
      const all = e.target.closest('[data-nfv2-export-all]');
      const refresh = e.target.closest('[data-nfv2-refresh]');

      if (detail) openDetail(FLOWS[Number(detail.getAttribute('data-nfv2-detail'))]);
      if (evidence) exportOne(FLOWS[Number(evidence.getAttribute('data-nfv2-evidence'))]);
      if (all) exportAll();
      if (refresh) render();
    });
  }

  function ensureModal(){
    if (document.getElementById('nfv2-modal')) return;

    const m = document.createElement('div');
    m.id = 'nfv2-modal';
    m.innerHTML = `
      <div class="nfv2-dialog">
        <div class="nfv2-dialog-head">
          <div id="nfv2-modal-title" style="color:#e5e7eb;font-size:14px;font-weight:900">Flow Detail</div>
          <button class="nfv2-btn" data-nfv2-close="1">Close</button>
        </div>
        <div class="nfv2-dialog-body" id="nfv2-modal-body"></div>
      </div>
    `;
    document.body.appendChild(m);
    m.addEventListener('click', function(e){
      if (e.target === m || e.target.closest('[data-nfv2-close]')) m.classList.remove('open');
    });
  }

  function openDetail(f){
    const m = document.getElementById('nfv2-modal');
    document.getElementById('nfv2-modal-title').textContent = `Flow Detail — ${f.risk}`;
    document.getElementById('nfv2-modal-body').innerHTML = `
      <div class="nfv2-kv-grid">
        <div class="nfv2-kv"><b>Source</b>${f.src}</div>
        <div class="nfv2-kv"><b>Destination</b>${f.dst}</div>
        <div class="nfv2-kv"><b>Protocol / Port</b>${f.proto}/${f.port}</div>
        <div class="nfv2-kv"><b>Direction</b>${f.dir}</div>
        <div class="nfv2-kv"><b>Bytes</b>${f.bytes}</div>
        <div class="nfv2-kv"><b>Packets</b>${f.packets}</div>
        <div class="nfv2-kv"><b>Policy</b>${f.policy}</div>
        <div class="nfv2-kv"><b>Gate</b><span class="nfv2-pill ${riskClass(f.risk)}">${f.risk}</span></div>
      </div>
      <div style="margin-top:12px;color:#94a3b8;font-size:11px">${f.reason}</div>
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

  function exportOne(f){
    download('network_flow_evidence.json', {
      type: 'network_flow_evidence',
      exported_at: new Date().toISOString(),
      gate: f.risk,
      flow: f
    });
  }

  function exportAll(){
    download('network_flow_evidence_all.json', {
      type: 'network_flow_evidence_all',
      exported_at: new Date().toISOString(),
      gate: finalGate(),
      total_flows: FLOWS.length,
      flows: FLOWS
    });
  }

  function boot(){
    let tries = 0;
    const timer = setInterval(function(){
      tries += 1;
      const ready = document.body;
      if (ready) {
        render();
        clearInterval(timer);
      }
      if (tries >= 20) clearInterval(timer);
    }, 250);

    setTimeout(render, 1200);
    setTimeout(render, 2500);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  window.NETWORK_FLOW_ENTERPRISE_FALLBACK_V2 = { render, exportAll };
})();

/* NETWORK_FLOW_CLEAN_ENTERPRISE_V3 */
(function(){
  if (window.__NETWORK_FLOW_CLEAN_ENTERPRISE_V3__) return;
  window.__NETWORK_FLOW_CLEAN_ENTERPRISE_V3__ = true;
  return; // DISABLED: conflicts with native network_flow.html

  const MARK = 'NETWORK_FLOW_CLEAN_ENTERPRISE_V3';

  window._nfFLOWS = window._nfFLOWS || null;
  var FLOWS = [];
  window._nfFLOWS = FLOWS;
  // Load real data from nmap findings
  (async function(){
    try {
      var tk = window.TOKEN || window.parent.TOKEN || localStorage.getItem('vsp_token') || '';
      if (!tk) { setTimeout(arguments.callee, 500); return; }
      var r = await fetch('/api/v1/logs/network-flow', {headers:{Authorization:'Bearer '+tk}});
      if (!r.ok) throw new Error('API error');
      var d = await r.json();
      var conns = d.connections || [];
      if (conns.length) {
        FLOWS = conns.map(function(c){
          var sev = c.severity || 'LOW';
          var risk = sev==='HIGH'||sev==='CRITICAL' ? 'WARN' : 'PASS';
          return {
            src: c.src || '192.168.1.42',
            dst: c.dst + ':' + c.port,
            proto: 'TCP',
            port: c.port || '',
            dir: 'egress',
            bytes: '—',
            packets: '—',
            policy: risk==='WARN'?'REVIEW':'ALLOW',
            risk: risk,
            reason: c.message || (c.service + ' on port ' + c.port)
          };
        });
        window._nfFLOWS = FLOWS;
      }
      // Update NDR alerts
      var alerts = d.alerts || [];
      if (alerts.length) {
        window.NDR_ALERTS = alerts;
        var box = document.getElementById('nfv3-alerts');
        if (box) {
          box.dataset.real = '1';
          box.innerHTML = alerts.slice(0,10).map(function(a){
            var color = a.sev==='high'||a.sev==='critical' ? '#ef4444' : '#f59e0b';
            return '<div class="nfv3-alert">'
              +'<div class="nfv3-alert-title"><span class="nfv3-pill" style="background:'+color+'22;color:'+color+'">'+a.sev.toUpperCase()+'</span> '+a.msg+'</div>'
              +'<div class="nfv3-alert-sub">'+a.ts+'</div>'
              +'</div>';
          }).join('');
          // Pagination
          if(alerts.length > 10) {
            var pg = document.createElement('div');
            pg.style.cssText='text-align:center;padding:6px;font-size:11px;color:#64748b';
            pg.innerHTML='Showing 10 of '+alerts.length+' alerts — <a href="#" onclick="window._nfLoadAllAlerts();return false" style="color:#38bdf8">Load all</a>';
            box.after(pg);
          }
        }
      }
      // Re-render with real data
      if(typeof renderEnterprise==='function') renderEnterprise();
    } catch(e) { console.warn('[NF-REALDATA]', e); }
  })();
  window._nfLoadAllAlerts = function(){
    var alerts = window.NDR_ALERTS || [];
    var box = document.getElementById('nfv3-alerts');
    if(!box) return;
    box.innerHTML = alerts.map(function(a){
      var color = a.sev==='high'||a.sev==='critical' ? '#ef4444' : '#f59e0b';
      return '<div class="nfv3-alert">'
        +'<div class="nfv3-alert-title"><span class="nfv3-pill" style="background:'+color+'22;color:'+color+'">'+a.sev.toUpperCase()+'</span> '+a.msg+'</div>'
        +'<div class="nfv3-alert-sub">'+a.ts+'</div>'
        +'</div>';
    }).join('');
  };

  function log(){
    try { console.log.apply(console, ['[' + MARK + ']'].concat([].slice.call(arguments))); } catch(e) {}
  }

  function riskClass(r){
    return r === 'BLOCK' ? 'block' : r === 'WARN' ? 'warn' : 'pass';
  }

  function finalGate(){
    if (FLOWS.some(f => f.risk === 'BLOCK')) return 'BLOCK';
    if (FLOWS.some(f => f.risk === 'WARN')) return 'WARN';
    return 'PASS';
  }

  function injectStyle(){
    if (document.getElementById('netflow-v3-style')) return;

    const s = document.createElement('style');
    s.id = 'netflow-v3-style';
    s.textContent = `
      #netflow-v1-wrap,
      #netflow-v2,
      [data-network-flow-v1="ready"] #netflow-v1-wrap {
        display: none !important;
      }

      .netflow-v3-native-hidden {
        display: none !important;
      }

      #netflow-v3 {
        margin: 12px 0 16px !important;
        padding: 12px !important;
        background: linear-gradient(180deg, rgba(15,23,42,.84), rgba(2,6,23,.40)) !important;
        border: 1px solid rgba(148,163,184,.16) !important;
        border-radius: 14px !important;
      }

      .nfv3-top {
        display: grid !important;
        grid-template-columns: repeat(5, minmax(135px, 1fr)) !important;
        gap: 10px !important;
        margin-bottom: 12px !important;
      }

      .nfv3-card {
        background: linear-gradient(180deg, rgba(30,41,59,.96), rgba(15,23,42,.96)) !important;
        border: 1px solid rgba(103,232,249,.16) !important;
        border-radius: 12px !important;
        padding: 11px 13px !important;
        min-height: 72px !important;
        box-shadow: 0 10px 24px rgba(0,0,0,.26) !important;
      }

      .nfv3-label {
        color: #7dd3fc !important;
        font-size: 9px !important;
        text-transform: uppercase !important;
        letter-spacing: .09em !important;
        font-family: ui-monospace, Menlo, Consolas, monospace !important;
      }

      .nfv3-value {
        margin-top: 7px !important;
        color: #e5f3ff !important;
        font-size: 21px !important;
        line-height: 1.1 !important;
        font-weight: 900 !important;
        font-family: ui-monospace, Menlo, Consolas, monospace !important;
      }

      .nfv3-sub {
        margin-top: 4px !important;
        color: #94a3b8 !important;
        font-size: 10px !important;
      }

      .nfv3-pass { color: #22c55e !important; }
      .nfv3-warn { color: #f59e0b !important; }
      .nfv3-block { color: #ef4444 !important; }

      .nfv3-grid {
        display: grid !important;
        grid-template-columns: 1.4fr .9fr !important;
        gap: 12px !important;
        margin-bottom: 12px !important;
      }

      .nfv3-panel {
        background: rgba(15,23,42,.72) !important;
        border: 1px solid rgba(148,163,184,.13) !important;
        border-radius: 12px !important;
        overflow: hidden !important;
      }

      .nfv3-head {
        padding: 10px 12px !important;
        border-bottom: 1px solid rgba(148,163,184,.1) !important;
        display: flex !important;
        justify-content: space-between !important;
        align-items: center !important;
      }

      .nfv3-title {
        color: #e5e7eb !important;
        font-size: 12px !important;
        font-weight: 900 !important;
      }

      .nfv3-caption {
        color: #94a3b8 !important;
        font-size: 10px !important;
        font-family: ui-monospace, Menlo, Consolas, monospace !important;
      }

      .nfv3-map {
        position: relative !important;
        min-height: 300px !important;
        background:
          radial-gradient(circle at 20% 30%, rgba(34,211,238,.08), transparent 22%),
          radial-gradient(circle at 80% 60%, rgba(239,68,68,.08), transparent 25%),
          rgba(2,6,23,.46) !important;
      }

      .nfv3-node {
        position: absolute !important;
        min-width: 108px !important;
        padding: 8px 9px !important;
        border-radius: 10px !important;
        background: rgba(15,23,42,.95) !important;
        border: 1px solid rgba(103,232,249,.22) !important;
        color: #dbeafe !important;
        font-size: 10px !important;
        font-family: ui-monospace, Menlo, Consolas, monospace !important;
        box-shadow: 0 12px 28px rgba(0,0,0,.32) !important;
      }

      .nfv3-node.warn { border-color: rgba(245,158,11,.45) !important; }
      .nfv3-node.block { border-color: rgba(239,68,68,.55) !important; }

      .nfv3-line {
        position: absolute !important;
        height: 2px !important;
        transform-origin: left center !important;
        background: linear-gradient(90deg, rgba(103,232,249,.15), rgba(103,232,249,.75)) !important;
      }

      .nfv3-line.warn { background: linear-gradient(90deg, rgba(245,158,11,.18), rgba(245,158,11,.85)) !important; }
      .nfv3-line.block { background: linear-gradient(90deg, rgba(239,68,68,.18), rgba(239,68,68,.9)) !important; }

      .nfv3-list {
        padding: 10px 12px !important;
        display: grid !important;
        gap: 8px !important;
      }

      .nfv3-alert {
        border: 1px solid rgba(148,163,184,.12) !important;
        border-radius: 10px !important;
        padding: 9px !important;
        background: rgba(2,6,23,.35) !important;
      }

      .nfv3-alert-title {
        color: #e5e7eb !important;
        font-size: 11px !important;
        font-weight: 800 !important;
      }

      .nfv3-alert-sub {
        color: #94a3b8 !important;
        font-size: 10px !important;
        margin-top: 3px !important;
      }

      .nfv3-toolbar {
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

      .nfv3-btn {
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

      .nfv3-table {
        width: 100% !important;
        border-collapse: collapse !important;
      }

      .nfv3-table th {
        color: #7f8ca3 !important;
        font-size: 9px !important;
        text-transform: uppercase !important;
        letter-spacing: .08em !important;
        text-align: left !important;
        padding: 8px !important;
        border-bottom: 1px solid rgba(148,163,184,.11) !important;
      }

      .nfv3-table td {
        color: #cbd5e1 !important;
        font-size: 10px !important;
        padding: 8px !important;
        border-bottom: 1px solid rgba(148,163,184,.07) !important;
        font-family: ui-monospace, Menlo, Consolas, monospace !important;
      }

      .nfv3-pill {
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        border-radius: 999px !important;
        padding: 3px 8px !important;
        font-size: 9px !important;
        font-weight: 900 !important;
      }

      .nfv3-pill.pass {
        color: #22c55e !important;
        background: rgba(34,197,94,.13) !important;
        border: 1px solid rgba(34,197,94,.28) !important;
      }

      .nfv3-pill.warn {
        color: #f59e0b !important;
        background: rgba(245,158,11,.13) !important;
        border: 1px solid rgba(245,158,11,.3) !important;
      }

      .nfv3-pill.block {
        color: #ef4444 !important;
        background: rgba(239,68,68,.13) !important;
        border: 1px solid rgba(239,68,68,.32) !important;
      }

      #nfv3-modal {
        position: fixed !important;
        inset: 0 !important;
        z-index: 99999 !important;
        display: none !important;
        align-items: center !important;
        justify-content: center !important;
        background: rgba(2,6,23,.68) !important;
        backdrop-filter: blur(8px) !important;
      }

      #nfv3-modal.open { display: flex !important; }

      .nfv3-dialog {
        width: min(780px,96vw) !important;
        background: #111827 !important;
        border: 1px solid rgba(148,163,184,.22) !important;
        border-radius: 14px !important;
        overflow: hidden !important;
        box-shadow: 0 30px 80px rgba(0,0,0,.5) !important;
      }

      .nfv3-dialog-head {
        padding: 14px 16px !important;
        border-bottom: 1px solid rgba(148,163,184,.12) !important;
        display: flex !important;
        justify-content: space-between !important;
      }

      .nfv3-dialog-body {
        padding: 16px !important;
        color: #cbd5e1 !important;
      }

      .nfv3-kv-grid {
        display: grid !important;
        grid-template-columns: repeat(2,minmax(180px,1fr)) !important;
        gap: 10px !important;
      }

      .nfv3-kv {
        background: rgba(15,23,42,.72) !important;
        border: 1px solid rgba(148,163,184,.12) !important;
        border-radius: 10px !important;
        padding: 10px !important;
        font-size: 12px !important;
      }

      .nfv3-kv b {
        display: block !important;
        color: #94a3b8 !important;
        font-size: 10px !important;
        text-transform: uppercase !important;
        margin-bottom: 4px !important;
      }
    `;
    document.head.appendChild(s);
  }

  function hideDuplicateNativeBlocks(){
    const keywords = [
      /Network capture engine is offline/i,
      /^Network Flow\s*\/\s*NDR$/i,
      /^Connection map$/i,
      /^Protocol breakdown$/i,
      /^NDR alerts$/i,
      /^Top connections$/i
    ];

    Array.from(document.querySelectorAll('div,section,article')).forEach(el => {
      if (!el || el.closest('#netflow-v3')) return;
      const t = (el.textContent || '').trim();
      if (!t) return;

      const isNative = keywords.some(rx => rx.test(t)) ||
        (
          /flows\s*\/\s*min/i.test(t) &&
          /active conns/i.test(t) &&
          /bandwidth/i.test(t)
        );

      if (isNative) {
        el.classList.add('netflow-v3-native-hidden');
      }
    });

    document.getElementById('netflow-v1-wrap')?.remove();
    document.getElementById('netflow-v2')?.remove();
  }

  window._nfRender = function(cb){ render(); if(typeof cb==='function') setTimeout(cb, 100); };
  function render(){
    injectStyle();
    hideDuplicateNativeBlocks();

    document.getElementById('netflow-v3')?.remove();

    const root = document.createElement('div');
    root.id = 'netflow-v3';

    const _s = window._nfSummary;
    const total = _s ? _s.total_flows : FLOWS.length;
    const allowed = _s ? _s.allowed : FLOWS.filter(f => f.risk === 'PASS').length;
    const warn = _s ? _s.suspicious : FLOWS.filter(f => f.risk === 'WARN').length;
    const block = _s ? _s.blocked : FLOWS.filter(f => f.risk === 'BLOCK').length;
    const gate = _s ? _s.gate_decision : finalGate();

    root.innerHTML = `
      <div class="nfv3-top">
        <div class="nfv3-card"><div class="nfv3-label">Total flows</div><div class="nfv3-value" id="nfv3-kpi-total">${total}</div><div class="nfv3-sub">log-based NDR dataset</div></div>
        <div class="nfv3-card"><div class="nfv3-label">Allowed</div><div class="nfv3-value nfv3-pass" id="nfv3-kpi-allowed">${allowed}</div><div class="nfv3-sub">approved policy traffic</div></div>
        <div class="nfv3-card"><div class="nfv3-label">Suspicious</div><div class="nfv3-value nfv3-warn" id="nfv3-kpi-warn">${warn}</div><div class="nfv3-sub">requires review</div></div>
        <div class="nfv3-card"><div class="nfv3-label">Blocked</div><div class="nfv3-value nfv3-block" id="nfv3-kpi-block">${block}</div><div class="nfv3-sub">deny/drop/exposure</div></div>
        <div class="nfv3-card"><div class="nfv3-label">Gate decision</div><div class="nfv3-value nfv3-${riskClass(gate)}" id="nfv3-kpi-gate">${gate}</div><div class="nfv3-sub">offline capture fallback</div></div>
      </div>
      <div class="nfv3-top" style="margin-top:6px">
        <div class="nfv3-card"><div class="nfv3-label">Total bytes</div><div class="nfv3-value" style="font-size:18px" id="nfv3-kpi-bytes">—</div><div class="nfv3-sub">ingress + egress</div></div>
        <div class="nfv3-card"><div class="nfv3-label">Total packets</div><div class="nfv3-value" style="font-size:18px" id="nfv3-kpi-packets">—</div><div class="nfv3-sub">layer 3/4</div></div>
        <div class="nfv3-card"><div class="nfv3-label">Unique sources</div><div class="nfv3-value" style="font-size:18px" id="nfv3-kpi-src">—</div><div class="nfv3-sub">distinct src IPs</div></div>
        <div class="nfv3-card"><div class="nfv3-label">Unique dest</div><div class="nfv3-value" style="font-size:18px" id="nfv3-kpi-dst">—</div><div class="nfv3-sub">distinct dst IPs</div></div>
        <div class="nfv3-card"><div class="nfv3-label">NDR alerts</div><div class="nfv3-value nfv3-warn" style="font-size:18px" id="nfv3-kpi-alerts">—</div><div class="nfv3-sub">total unacknowledged</div></div>
      </div>

      <div class="nfv3-grid">
        <div class="nfv3-panel">
          <div class="nfv3-head">
            <div><div class="nfv3-title">Connection map</div><div class="nfv3-caption">east-west + egress + blocked exposure</div></div>
            <button class="nfv3-btn" data-nfv3-filter="risky">Show risky only</button>
          </div>
          <div class="nfv3-map" id="nfv3-map"></div>
        </div>

        <div class="nfv3-panel">
          <div class="nfv3-head">
            <div><div class="nfv3-title">NDR alerts</div><div class="nfv3-caption">anomalous traffic patterns · <span id="nfv3-alert-count" style="color:#f59e0b">—</span> unacked</div></div>
            <div style="display:flex;gap:6px">
              <button class="nfv3-btn" id="nfv3-load-more-alerts" style="font-size:10px">Load all</button>
              <button class="nfv3-btn" id="nfv3-ack-all" style="font-size:10px;background:rgba(239,68,68,.15);color:#ef4444">Ack all</button>
            </div>
          </div>
          <div class="nfv3-list" id="nfv3-alerts"></div>
        </div>
      </div>

      <div class="nfv3-panel" style="margin-bottom:12px">
        <div class="nfv3-head">
          <div><div class="nfv3-title">Protocol breakdown</div><div class="nfv3-caption">by traffic volume</div></div>
        </div>
        <div class="nfv3-list" id="nfv3-protocols"></div>
      </div>

      <div class="nfv3-toolbar">
        <div class="nfv3-caption">Commercial view: flow summary, gate decision, per-flow actions and evidence export.</div>
        <div>
          <button class="nfv3-btn" data-nfv3-export-all="1">Export Evidence JSON</button>
          <button class="nfv3-btn" data-nfv3-refresh="1">Refresh View</button>
        </div>
      </div>

      <div class="nfv3-panel">
        <div class="nfv3-head">
          <div><div class="nfv3-title">Top connections</div><div class="nfv3-caption">source → destination by risk and volume</div></div>
        </div>
        <table class="nfv3-table">
          <thead>
            <tr>
              <th>Source</th><th>Destination</th><th>Protocol</th><th>Port</th><th>Bytes</th><th>Packets</th><th>Policy</th><th>Gate</th><th>Actions</th>
            </tr>
          </thead>
          <tbody id="nfv3-tbody"></tbody>
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

    hideDuplicateNativeBlocks();

    document.documentElement.setAttribute('data-network-flow-v3', 'ready');
    log('rendered clean enterprise network flow rows=', FLOWS.length);
  }

  function findAnchor(){
    const candidates = Array.from(document.querySelectorAll('h1,h2,h3,h4,div,span,b,strong'));
    return candidates.find(x => /Network Flow Analysis|Network flow/i.test((x.textContent || '').trim())) ||
      document.body.firstElementChild ||
      document.body;
  }

  function renderMap(edges){
    const map = document.getElementById('nfv3-map');
    if (!map) return;

    function fmtB(b){ if(!b)return'0'; if(b>1e12)return(b/1e12).toFixed(1)+'TB'; if(b>1e9)return(b/1e9).toFixed(1)+'GB'; if(b>1e6)return(b/1e6).toFixed(1)+'MB'; return(b/1e3).toFixed(0)+'KB'; }
    const riskColor = {PASS:'#22c55e', WARN:'#f59e0b', BLOCK:'#ef4444'};
    const isPrivate = function(ip){ return /^(192\.168|10\.|172\.(1[6-9]|2[0-9]|3[01]))\./.test(ip); }

    if (edges && edges.length) {
      const nodeMap = {};
      edges.forEach(function(e){
        const s = e.src_ip.replace('/32',''), d = e.dst_ip.replace('/32','');
        if (!nodeMap[s]) nodeMap[s] = {ip:s, risk:'PASS', flows:0, bytes:0, ext:!isPrivate(s)};
        if (!nodeMap[d]) nodeMap[d] = {ip:d, risk:'PASS', flows:0, bytes:0, ext:!isPrivate(d)};
        nodeMap[s].flows += e.flow_count||1; nodeMap[s].bytes += e.bytes||0;
        if (e.risk==='BLOCK'){ nodeMap[s].risk='BLOCK'; nodeMap[d].risk='BLOCK'; }
        else if (e.risk==='WARN' && nodeMap[s].risk!=='BLOCK'){ nodeMap[s].risk='WARN'; nodeMap[d].risk='WARN'; }
      });
      const nodes = Object.values(nodeMap);
      const intern = nodes.filter(n=>!n.ext), extern = nodes.filter(n=>n.ext);
      const W=580, H=300, posMap={};
      intern.forEach((n,i)=>{ posMap[n.ip]={x:20+(i%2)*160, y:30+Math.floor(i/2)*80}; });
      extern.forEach((n,i)=>{ posMap[n.ip]={x:W-200+(i%2)*90, y:20+i*65}; });

      const edgeSvg = edges.slice(0,20).map(function(e){
        const s=posMap[e.src_ip.replace('/32','')], d=posMap[e.dst_ip.replace('/32','')];
        if(!s||!d) return '';
        const col=riskColor[e.risk]||'#64748b', w=e.risk==='BLOCK'?3:e.risk==='WARN'?2:1;
        const dash=e.risk==='BLOCK'?'6,3':e.risk==='WARN'?'4,2':'none';
        const mx=(s.x+d.x)/2+60, my=(s.y+d.y)/2+18;
        return `<line x1="${s.x+60}" y1="${s.y+18}" x2="${d.x+60}" y2="${d.y+18}" stroke="${col}" stroke-width="${w}" stroke-opacity="0.5" stroke-dasharray="${dash}"/>
                <text x="${mx}" y="${my}" fill="${col}" font-size="8" opacity="0.75" text-anchor="middle">${fmtB(e.bytes)}</text>`;
      }).join('');

      const nodeSvg = nodes.map(function(n){
        const p=posMap[n.ip]; if(!p) return '';
        const col=riskColor[n.risk], lbl=n.ext?n.ip:n.ip.split('.').slice(-2).join('.');
        return `<g>
          <rect x="${p.x}" y="${p.y}" width="118" height="34" rx="5" fill="rgba(17,19,24,0.95)" stroke="${col}" stroke-width="1.5"/>
          <text x="${p.x+7}" y="${p.y+13}" fill="#e8eaf0" font-size="10" font-weight="600">${lbl}</text>
          <text x="${p.x+7}" y="${p.y+26}" fill="${col}" font-size="9">${n.risk} · ${n.flows.toLocaleString()} flows</text>
          <rect x="${p.x+88}" y="${p.y+3}" width="24" height="11" rx="2" fill="${n.ext?'rgba(239,68,68,.25)':'rgba(34,197,94,.15)'}"/>
          <text x="${p.x+100}" y="${p.y+12}" fill="${n.ext?'#ef4444':'#22c55e'}" font-size="7.5" text-anchor="middle">${n.ext?'EXT':'INT'}</text>
        </g>`;
      }).join('');

      map.innerHTML = `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:${H}px">
        ${edgeSvg}${nodeSvg}
      </svg>`;
      return;
    }
    // Fetch topology nếu chưa có data
    map.innerHTML = '<div style="padding:20px;color:var(--t3,#5a6278);font-size:12px;text-align:center">Loading topology…</div>';
    var tk = window.TOKEN || localStorage.getItem('vsp_token') || '';
    if (!tk) return;
    fetch('/api/v1/network/topology', {headers:{Authorization:'Bearer '+tk}})
      .then(r=>r.ok?r.json():null)
      .then(d=>{ if(d&&d.edges) renderMap(d.edges); })
      .catch(()=>{});
  }

  var _alertPage = 1, _alertPerPage = 10;
  function renderAlerts(){
    const box = document.getElementById('nfv3-alerts');
    if (!box) return;
    var allAlerts = [];
    if (window._nfRealAlerts && window._nfRealAlerts.length) {
      allAlerts = window._nfRealAlerts;
    } else {
      const risky = FLOWS.filter(f => f.risk !== 'PASS');
      allAlerts = risky.map(f => ({sev:f.risk, msg:f.src+' → '+f.dst, sub:f.proto+'/'+f.port+' · '+f.reason}));
    }
    var total = allAlerts.length;
    var totalPages = Math.ceil(total/_alertPerPage);
    var start = (_alertPage-1)*_alertPerPage;
    var page = allAlerts.slice(start, start+_alertPerPage);
    var countEl = document.getElementById('nfv3-alert-count');
    if(countEl) countEl.textContent = total;
    box.innerHTML = page.map(function(a){
      var sev=(a.sev||'WARN').toUpperCase();
      var cls=['BLOCK','CRITICAL','HIGH'].includes(sev)?'nfv3-block':'nfv3-warn';
      return '<div class="nfv3-alert"><div class="nfv3-alert-title"><span class="nfv3-pill '+cls+'">'+sev+'</span> '+(a.msg||'')+'</div><div class="nfv3-alert-sub">'+(a.sub||a.ts||'')+'</div></div>';
    }).join('');
    var pgId='nfv3-pg';var old=document.getElementById(pgId);if(old)old.remove();
    if(totalPages>1){
      var bar=document.createElement('div');bar.id=pgId;
      bar.style.cssText='display:flex;gap:6px;align-items:center;justify-content:center;padding:6px 0;font-size:11px;color:#64748b;border-top:1px solid rgba(255,255,255,0.06);margin-top:4px';
      var h='';
      if(_alertPage>1)h+='<button onclick="window._nfAlertPrev()" style="background:rgba(148,163,184,.12);border:1px solid rgba(148,163,184,.2);color:#94a3b8;border-radius:4px;padding:2px 8px;cursor:pointer;font-size:10px">← Prev</button>';
      h+='<span>'+(start+1)+'–'+Math.min(start+_alertPerPage,total)+' / '+total+'</span>';
      if(_alertPage<totalPages)h+='<button onclick="window._nfAlertNext()" style="background:rgba(148,163,184,.12);border:1px solid rgba(148,163,184,.2);color:#94a3b8;border-radius:4px;padding:2px 8px;cursor:pointer;font-size:10px">Next →</button>';
      bar.innerHTML=h;box.after(bar);
    }
  }
  window._nfAlertPrev=function(){if(_alertPage>1){_alertPage--;renderAlerts();}};
  window._nfAlertNext=function(){_alertPage++;renderAlerts();};

  function fmtBytes(b){
    if (!b) return '0 B';
    if (b > 1e12) return (b/1e12).toFixed(1) + ' TB';
    if (b > 1e9)  return (b/1e9).toFixed(1) + ' GB';
    if (b > 1e6)  return (b/1e6).toFixed(1) + ' MB';
    if (b > 1e3)  return (b/1e3).toFixed(1) + ' KB';
    return b + ' B';
  }

  function renderProtocols(){
    const box = document.getElementById('nfv3-protocols');
    if (!box) return;

    // Prefer API summary data if available
    const _s = window._nfSummary;
    if (_s && _s.protocol_breakdown && _s.protocol_breakdown.length) {
      const total = _s.protocol_breakdown.reduce((a,p) => a + p.flows, 0);
      const totalBytes = _s.protocol_breakdown.reduce((a,p) => a + p.bytes, 0);
      box.innerHTML = _s.protocol_breakdown.map(p => {
        const pct = Math.round((p.flows / total) * 100);
        const bpct = Math.round((p.bytes / totalBytes) * 100);
        const risky = 0;
        return `
          <div class="nfv3-alert">
            <div class="nfv3-alert-title">${p.proto_name} · ${p.flows.toLocaleString()} flows · ${pct}% · <span style="color:#60a5fa">${fmtBytes(p.bytes)}</span></div>
            <div style="margin-top:7px;height:6px;background:rgba(148,163,184,.14);border-radius:999px;overflow:hidden">
              <div style="height:100%;width:${pct}%;background:#22c55e"></div>
            </div>
            <div style="margin-top:4px;height:4px;background:rgba(96,165,250,.1);border-radius:999px;overflow:hidden">
              <div style="height:100%;width:${bpct}%;background:#3b82f6"></div>
            </div>
            <div class="nfv3-alert-sub">0 risky · ${fmtBytes(p.bytes)} transferred</div>
          </div>`;
      }).join('');
      return;
    }

    const groups = {};
    FLOWS.forEach(f => {
      groups[f.proto] = groups[f.proto] || {count:0, risky:0, bytes:0};
      groups[f.proto].count += 1;
      groups[f.proto].bytes += f._bytes || 0;
      if (f.risk !== 'PASS') groups[f.proto].risky += 1;
    });
    const totalBytes = Object.values(groups).reduce((a,g) => a + g.bytes, 0);

    box.innerHTML = Object.keys(groups).map(k => {
      const g = groups[k];
      const pct = Math.round((g.count / FLOWS.length) * 100);
      const bpct = totalBytes ? Math.round((g.bytes / totalBytes) * 100) : 0;
      return `
        <div class="nfv3-alert">
          <div class="nfv3-alert-title">${k} · ${g.count} flows · ${pct}% · <span style="color:#60a5fa">${fmtBytes(g.bytes)}</span></div>
          <div style="margin-top:7px;height:6px;background:rgba(148,163,184,.14);border-radius:999px;overflow:hidden">
            <div style="height:100%;width:${pct}%;background:${g.risky ? '#f59e0b' : '#22c55e'}"></div>
          </div>
          <div style="margin-top:4px;height:4px;background:rgba(96,165,250,.1);border-radius:999px;overflow:hidden">
            <div style="height:100%;width:${bpct}%;background:#3b82f6"></div>
          </div>
          <div class="nfv3-alert-sub">${g.risky} risky · ${fmtBytes(g.bytes)} transferred</div>
        </div>
      `;
    }).join('');
  }

  function renderRows(){
    const tb = document.getElementById('nfv3-tbody');
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
        <td><span class="nfv3-pill ${riskClass(f.risk)}">${f.risk}</span></td>
        <td>
          <button class="nfv3-btn" data-nfv3-detail="${idx}">Detail</button>
          <button class="nfv3-btn" data-nfv3-evidence="${idx}">Evidence</button>
        </td>
      </tr>
    `).join('');
  }

  function bind(root){
    root.addEventListener('click', function(e){
      const detail = e.target.closest('[data-nfv3-detail]');
      const evidence = e.target.closest('[data-nfv3-evidence]');
      const all = e.target.closest('[data-nfv3-export-all]');
      const refresh = e.target.closest('[data-nfv3-refresh]');

      if (detail) openDetail(FLOWS[Number(detail.getAttribute('data-nfv3-detail'))]);
      if (evidence) exportOne(FLOWS[Number(evidence.getAttribute('data-nfv3-evidence'))]);
      if (all) exportAll();
      if (refresh) render();
    });
  }

  function ensureModal(){
    if (document.getElementById('nfv3-modal')) return;

    const m = document.createElement('div');
    m.id = 'nfv3-modal';
    m.innerHTML = `
      <div class="nfv3-dialog">
        <div class="nfv3-dialog-head">
          <div id="nfv3-modal-title" style="color:#e5e7eb;font-size:14px;font-weight:900">Flow Detail</div>
          <button class="nfv3-btn" data-nfv3-close="1">Close</button>
        </div>
        <div class="nfv3-dialog-body" id="nfv3-modal-body"></div>
      </div>
    `;
    document.body.appendChild(m);
    m.addEventListener('click', function(e){
      if (e.target === m || e.target.closest('[data-nfv3-close]')) m.classList.remove('open');
    });
  }

  function openDetail(f){
    const m = document.getElementById('nfv3-modal');
    document.getElementById('nfv3-modal-title').textContent = `Flow Detail — ${f.risk}`;
    document.getElementById('nfv3-modal-body').innerHTML = `
      <div class="nfv3-kv-grid">
        <div class="nfv3-kv"><b>Source</b>${f.src}</div>
        <div class="nfv3-kv"><b>Destination</b>${f.dst}</div>
        <div class="nfv3-kv"><b>Protocol / Port</b>${f.proto}/${f.port}</div>
        <div class="nfv3-kv"><b>Direction</b>${f.dir}</div>
        <div class="nfv3-kv"><b>Bytes</b>${f.bytes}</div>
        <div class="nfv3-kv"><b>Packets</b>${f.packets}</div>
        <div class="nfv3-kv"><b>Policy</b>${f.policy}</div>
        <div class="nfv3-kv"><b>Gate</b><span class="nfv3-pill ${riskClass(f.risk)}">${f.risk}</span></div>
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
      if (document.body) {
        render();
        clearInterval(timer);
      }
      if (tries >= 20) clearInterval(timer);
    }, 250);

    // removed redundant re-renders
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  window.NETWORK_FLOW_CLEAN_ENTERPRISE_V3 = { render, exportAll };
})();



/* NETWORK_FLOW_HIDE_NATIVE_FINAL_V4
   Strong hide for old native Network Flow/NDR empty layout.
   Keeps only the enterprise V3 UI.
*/
(function(){
  if (window.__NETWORK_FLOW_HIDE_NATIVE_FINAL_V4__) return;
  window.__NETWORK_FLOW_HIDE_NATIVE_FINAL_V4__ = true;

  function cssEscapeLite(s){
    return String(s || '').replace(/[^a-zA-Z0-9_-]/g, '_');
  }

  function text(el){
    return (el && el.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function isInsideV3(el){
    return !!(el && el.closest && el.closest('#netflow-v3'));
  }

  function hide(el, reason){
    if (!el || isInsideV3(el)) return;
    el.classList.add('netflow-v4-native-hidden');
    el.setAttribute('data-netflow-v4-hidden', reason || 'native');
    el.style.setProperty('display', 'none', 'important');
    el.style.setProperty('visibility', 'hidden', 'important');
    el.style.setProperty('height', '0', 'important');
    el.style.setProperty('min-height', '0', 'important');
    el.style.setProperty('overflow', 'hidden', 'important');
    el.style.setProperty('margin', '0', 'important');
    el.style.setProperty('padding', '0', 'important');
  }

  function looksNativeBlock(el){
    if (!el || isInsideV3(el)) return false;

    var t = text(el);
    if (!t) return false;

    if (/Network capture engine is offline/i.test(t)) return true;

    if (/^Network flow\s*\/\s*NDR/i.test(t)) return true;

    if (
      /Netflow v9/i.test(t) &&
      /connection map/i.test(t) &&
      /protocol breakdown/i.test(t) &&
      /anomaly detection/i.test(t)
    ) return true;

    if (
      /Flows\s*\/\s*min/i.test(t) &&
      /Active conns/i.test(t) &&
      /Suspicious/i.test(t) &&
      /Bandwidth/i.test(t)
    ) return true;

    if (
      /Connection map/i.test(t) &&
      /click node to filter/i.test(t) &&
      /suspicious flows highlighted/i.test(t)
    ) return true;

    if (
      /Protocol breakdown/i.test(t) &&
      /NDR alerts/i.test(t) &&
      /anomalous traffic patterns/i.test(t)
    ) return true;

    if (
      /Top connections/i.test(t) &&
      /Search src \/ dst IP \/ port \/ protocol/i.test(t) &&
      /by bytes transferred/i.test(t)
    ) return true;

    return false;
  }

  function hideNative(){
    var v3 = document.getElementById('netflow-v3');
    if (!v3) return;

    // Hide old enhancement wrappers.
    ['netflow-v1-wrap', 'netflow-v2'].forEach(function(id){
      var el = document.getElementById(id);
      if (el) hide(el, 'old-enhancement-' + id);
    });

    // Hide native blocks after the V3 block.
    var all = Array.from(document.querySelectorAll('div,section,article,main,table,form'));
    all.forEach(function(el){
      if (isInsideV3(el)) return;
      if (looksNativeBlock(el)) {
        hide(el, 'native-text-match');
      }
    });

    // Extra: anything below V3 that has native network-flow headings/empty map/table.
    var after = false;
    Array.from(document.body.querySelectorAll('*')).forEach(function(el){
      if (el === v3) {
        after = true;
        return;
      }
      if (!after || isInsideV3(el)) return;

      var t = text(el);
      if (
        /^Network flow\s*\/\s*NDR/i.test(t) ||
        /^Connection map$/i.test(t) ||
        /^Protocol breakdown$/i.test(t) ||
        /^NDR alerts$/i.test(t) ||
        /^Top connections$/i.test(t) ||
        /Search src \/ dst IP \/ port \/ protocol/i.test(t)
      ) {
        var card = el.closest('section,article,.card,.panel,[class*="card"],[class*="panel"],div') || el;
        hide(card, 'native-after-v3');
      }
    });

    document.documentElement.setAttribute('data-network-flow-v4-hide-native', 'done');
  }

  function installStyle(){
    if (document.getElementById('netflow-v4-hide-style')) return;
    var st = document.createElement('style');
    st.id = 'netflow-v4-hide-style';
    st.textContent = `
      .netflow-v4-native-hidden {
        display: none !important;
        visibility: hidden !important;
        height: 0 !important;
        min-height: 0 !important;
        max-height: 0 !important;
        overflow: hidden !important;
        margin: 0 !important;
        padding: 0 !important;
        border: 0 !important;
      }
    `;
    document.head.appendChild(st);
  }

  function bootHide(){
    installStyle();
    hideNative();
    setTimeout(hideNative, 300);
    setTimeout(hideNative, 1000);
    setTimeout(hideNative, 2500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootHide);
  } else {
    bootHide();
  }

  console.log('[NETWORK_FLOW_HIDE_NATIVE_FINAL_V4] installed');
})();




/* NETWORK_FLOW_HIDE_NATIVE_TAIL_V5
   Hide remaining native tail: filter/search + empty legacy top connections table.
*/
(function(){
  if (window.__NETWORK_FLOW_HIDE_NATIVE_TAIL_V5__) return;
  window.__NETWORK_FLOW_HIDE_NATIVE_TAIL_V5__ = true;

  function txt(el){
    return (el && el.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function insideEnterprise(el){
    return !!(el && el.closest && el.closest('#netflow-v3'));
  }

  function hardHide(el, reason){
    if (!el || insideEnterprise(el)) return;
    el.setAttribute('data-netflow-v5-hidden', reason || 'native-tail');
    el.classList.add('netflow-v5-hidden');
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
    if (document.getElementById('netflow-v5-hide-style')) return;
    var s = document.createElement('style');
    s.id = 'netflow-v5-hide-style';
    s.textContent = `
      .netflow-v5-hidden {
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

    var v3 = document.getElementById('netflow-v3');
    if (!v3) return;

    // 1) Hide search/filter input row after enterprise block.
    Array.from(document.querySelectorAll('input, select, button, div, form, table')).forEach(function(el){
      if (insideEnterprise(el)) return;

      var t = txt(el);
      var ph = (el.getAttribute && (el.getAttribute('placeholder') || '')) || '';

      if (/Search src \/ dst IP \/ port \/ protocol/i.test(t) || /Search src \/ dst IP \/ port \/ protocol/i.test(ph)) {
        var block = el.closest('form,section,article,.card,.panel,[class*="card"],[class*="panel"],div') || el;
        hardHide(block, 'legacy-search-filter');
      }

      if (/by bytes transferred/i.test(t) && /SOURCE/i.test(t) && /DESTINATION/i.test(t)) {
        hardHide(el.closest('section,article,.card,.panel,[class*="card"],[class*="panel"],div') || el, 'legacy-empty-top-connections');
      }
    });

    // 2) Hide legacy empty table by header signature.
    Array.from(document.querySelectorAll('table')).forEach(function(table){
      if (insideEnterprise(table)) return;

      var h = txt(table).toLowerCase();
      if (
        h.includes('source') &&
        h.includes('destination') &&
        h.includes('protocol') &&
        h.includes('duration') &&
        h.includes('status') &&
        !table.closest('#netflow-v3')
      ) {
        var block = table.closest('section,article,.card,.panel,[class*="card"],[class*="panel"],div') || table;
        hardHide(block, 'legacy-empty-table');
      }
    });

    // 3) Hide any remaining large blank native container after V3.
    var seenV3 = false;
    Array.from(document.body.querySelectorAll('div,section,article')).forEach(function(el){
      if (el === v3) {
        seenV3 = true;
        return;
      }
      if (!seenV3 || insideEnterprise(el)) return;

      var t = txt(el);
      if (
        /Network flow \/ NDR/i.test(t) ||
        /click node to filter/i.test(t) ||
        /suspicious flows highlighted/i.test(t) ||
        /by traffic volume/i.test(t) ||
        /anomalous traffic patterns/i.test(t) ||
        /by bytes transferred/i.test(t)
      ) {
        hardHide(el, 'legacy-native-after-v3');
      }
    });

    document.documentElement.setAttribute('data-network-flow-v5-hide-tail', 'done');
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

  console.log('[NETWORK_FLOW_HIDE_NATIVE_TAIL_V5] installed');
})();




/* NETWORK_FLOW_SVG_MAP_V6
   Replace rough div-based connection lines with a proper SVG topology map.
*/
(function(){
  if (window.__NETWORK_FLOW_SVG_MAP_V6__) return;
  window.__NETWORK_FLOW_SVG_MAP_V6__ = true;

  function installStyle(){
    if (document.getElementById('netflow-v6-svg-style')) return;

    var s = document.createElement('style');
    s.id = 'netflow-v6-svg-style';
    s.textContent = `
      #nfv3-map {
        min-height: 360px !important;
        padding: 0 !important;
        overflow: hidden !important;
        background:
          radial-gradient(circle at 16% 22%, rgba(34,211,238,.09), transparent 24%),
          radial-gradient(circle at 50% 50%, rgba(59,130,246,.07), transparent 28%),
          radial-gradient(circle at 84% 55%, rgba(239,68,68,.09), transparent 26%),
          rgba(2,6,23,.56) !important;
      }

      .nfv6-map-svg {
        width: 100% !important;
        height: 360px !important;
        display: block !important;
      }

      .nfv6-zone {
        fill: rgba(15,23,42,.42);
        stroke: rgba(148,163,184,.13);
        stroke-width: 1;
      }

      .nfv6-zone-title {
        fill: #94a3b8;
        font-size: 10px;
        font-family: ui-monospace, Menlo, Consolas, monospace;
        letter-spacing: .08em;
      }

      .nfv6-node {
        fill: rgba(15,23,42,.95);
        stroke: rgba(103,232,249,.28);
        stroke-width: 1.2;
        filter: drop-shadow(0 8px 14px rgba(0,0,0,.45));
      }

      .nfv6-node.pass { stroke: rgba(34,197,94,.55); }
      .nfv6-node.warn { stroke: rgba(245,158,11,.65); }
      .nfv6-node.block { stroke: rgba(239,68,68,.72); }

      .nfv6-node-title {
        fill: #dbeafe;
        font-size: 10px;
        font-weight: 800;
        font-family: ui-monospace, Menlo, Consolas, monospace;
      }

      .nfv6-node-sub {
        fill: #94a3b8;
        font-size: 9px;
        font-family: ui-monospace, Menlo, Consolas, monospace;
      }

      .nfv6-edge {
        fill: none;
        stroke-width: 2.2;
        opacity: .9;
      }

      .nfv6-edge.pass { stroke: #22c55e; }
      .nfv6-edge.warn { stroke: #f59e0b; stroke-dasharray: 6 4; }
      .nfv6-edge.block { stroke: #ef4444; stroke-dasharray: 4 4; }

      .nfv6-edge-label-bg {
        fill: rgba(2,6,23,.88);
        stroke: rgba(148,163,184,.14);
        stroke-width: 1;
      }

      .nfv6-edge-label {
        fill: #cbd5e1;
        font-size: 9px;
        font-family: ui-monospace, Menlo, Consolas, monospace;
      }

      .nfv6-legend text {
        fill: #94a3b8;
        font-size: 9px;
        font-family: ui-monospace, Menlo, Consolas, monospace;
      }
    `;
    document.head.appendChild(s);
  }

  function renderSvgMap(){
    installStyle();

    var map = document.getElementById('nfv3-map');
    if (!map) return false;

    map.innerHTML = `
      <svg class="nfv6-map-svg" viewBox="0 0 980 360" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Network flow topology map">
        <defs>
          <marker id="nfv6-arrow-pass" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="strokeWidth">
            <path d="M0,0 L8,4 L0,8 Z" fill="#22c55e"></path>
          </marker>
          <marker id="nfv6-arrow-warn" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="strokeWidth">
            <path d="M0,0 L8,4 L0,8 Z" fill="#f59e0b"></path>
          </marker>
          <marker id="nfv6-arrow-block" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="strokeWidth">
            <path d="M0,0 L8,4 L0,8 Z" fill="#ef4444"></path>
          </marker>
        </defs>

        <!-- Zones -->
        <rect class="nfv6-zone" x="22" y="28" width="260" height="292" rx="14"></rect>
        <rect class="nfv6-zone" x="360" y="28" width="260" height="292" rx="14"></rect>
        <rect class="nfv6-zone" x="700" y="28" width="250" height="292" rx="14"></rect>

        <text class="nfv6-zone-title" x="42" y="54">INTERNAL HOSTS</text>
        <text class="nfv6-zone-title" x="380" y="54">CORE SERVICES</text>
        <text class="nfv6-zone-title" x="720" y="54">INTERNET / EXTERNAL</text>

        <!-- Edges -->
        <path class="nfv6-edge pass" marker-end="url(#nfv6-arrow-pass)" d="M210 105 C285 90, 345 90, 405 105"></path>
        <rect class="nfv6-edge-label-bg" x="286" y="73" width="86" height="18" rx="6"></rect>
        <text class="nfv6-edge-label" x="295" y="86">TCP/5432</text>

        <path class="nfv6-edge pass" marker-end="url(#nfv6-arrow-pass)" d="M210 160 C282 168, 338 178, 405 188"></path>
        <rect class="nfv6-edge-label-bg" x="292" y="166" width="86" height="18" rx="6"></rect>
        <text class="nfv6-edge-label" x="302" y="179">TCP/6379</text>

        <path class="nfv6-edge warn" marker-end="url(#nfv6-arrow-warn)" d="M210 225 C390 245, 560 122, 735 115"></path>
        <rect class="nfv6-edge-label-bg" x="455" y="170" width="74" height="18" rx="6"></rect>
        <text class="nfv6-edge-label" x="465" y="183">HTTPS</text>

        <path class="nfv6-edge warn" marker-end="url(#nfv6-arrow-warn)" d="M210 270 C400 315, 595 272, 735 238"></path>
        <rect class="nfv6-edge-label-bg" x="480" y="277" width="88" height="18" rx="6"></rect>
        <text class="nfv6-edge-label" x="490" y="290">UDP/53</text>

        <path class="nfv6-edge block" marker-end="url(#nfv6-arrow-block)" d="M530 270 C610 305, 690 305, 735 292"></path>
        <rect class="nfv6-edge-label-bg" x="628" y="292" width="92" height="18" rx="6"></rect>
        <text class="nfv6-edge-label" x="638" y="305">RDP/3389</text>

        <!-- Internal nodes -->
        <rect class="nfv6-node pass" x="62" y="78" width="148" height="54" rx="10"></rect>
        <text class="nfv6-node-title" x="78" y="101">app-prod-01</text>
        <text class="nfv6-node-sub" x="78" y="117">PASS · app tier</text>

        <rect class="nfv6-node pass" x="62" y="138" width="148" height="54" rx="10"></rect>
        <text class="nfv6-node-title" x="78" y="161">api-gateway-prod</text>
        <text class="nfv6-node-sub" x="78" y="177">PASS · gateway</text>

        <rect class="nfv6-node warn" x="62" y="202" width="148" height="54" rx="10"></rect>
        <text class="nfv6-node-title" x="78" y="225">vsp-dev-01</text>
        <text class="nfv6-node-sub" x="78" y="241">WARN · egress</text>

        <rect class="nfv6-node warn" x="62" y="262" width="148" height="54" rx="10"></rect>
        <text class="nfv6-node-title" x="78" y="285">debug-test</text>
        <text class="nfv6-node-sub" x="78" y="301">WARN · DNS spike</text>

        <!-- Core service nodes -->
        <rect class="nfv6-node pass" x="405" y="78" width="150" height="54" rx="10"></rect>
        <text class="nfv6-node-title" x="422" y="101">db-prod-01</text>
        <text class="nfv6-node-sub" x="422" y="117">5432 · postgres</text>

        <rect class="nfv6-node pass" x="405" y="162" width="150" height="54" rx="10"></rect>
        <text class="nfv6-node-title" x="422" y="185">redis-prod</text>
        <text class="nfv6-node-sub" x="422" y="201">6379 · cache</text>

        <rect class="nfv6-node block" x="405" y="246" width="150" height="54" rx="10"></rect>
        <text class="nfv6-node-title" x="422" y="269">test-eol-pc</text>
        <text class="nfv6-node-sub" x="422" y="285">BLOCK · exposure</text>

        <!-- External nodes -->
        <rect class="nfv6-node warn" x="735" y="88" width="160" height="54" rx="10"></rect>
        <text class="nfv6-node-title" x="752" y="111">internet</text>
        <text class="nfv6-node-sub" x="752" y="127">185.199.108.133</text>

        <rect class="nfv6-node warn" x="735" y="210" width="160" height="54" rx="10"></rect>
        <text class="nfv6-node-title" x="752" y="233">internet DNS</text>
        <text class="nfv6-node-sub" x="752" y="249">104.21.1.90</text>

        <rect class="nfv6-node block" x="735" y="270" width="160" height="54" rx="10"></rect>
        <text class="nfv6-node-title" x="752" y="293">external rdp</text>
        <text class="nfv6-node-sub" x="752" y="309">203.0.113.9</text>

        <!-- Legend -->
        <g class="nfv6-legend">
          <circle cx="42" cy="338" r="4" fill="#22c55e"></circle>
          <text x="52" y="342">PASS</text>
          <circle cx="102" cy="338" r="4" fill="#f59e0b"></circle>
          <text x="112" y="342">WARN</text>
          <circle cx="165" cy="338" r="4" fill="#ef4444"></circle>
          <text x="175" y="342">BLOCK</text>
          <text x="760" y="342">Flow direction: source → destination</text>
        </g>
      </svg>
    `;

    document.documentElement.setAttribute('data-network-flow-v6-svg-map', 'ready');
    console.log('[NETWORK_FLOW_SVG_MAP_V6] SVG topology map rendered');
    return true;
  }

  function boot(){
    installStyle();
    renderSvgMap();
    // removed redundant renderSvgMap retries
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();


/* VULN_MGMT_ENTERPRISE_V1 */
(function(){
  if (window.__VULN_MGMT_ENTERPRISE_V1__) return;
  window.__VULN_MGMT_ENTERPRISE_V1__ = true;

  const MARK = 'VULN_MGMT_ENTERPRISE_V1';

  const CVES = [
    {id:'CVE-2024-5337', asset:'edge-gateway-prod', severity:'CRITICAL', cvss:9.8, tool:'trivy', fixable:true, sla:'BREACHED', exposure:'internet-facing', action:'Patch immediately / emergency change'},
    {id:'CVE-2023-4911', asset:'k8s-node-02', severity:'CRITICAL', cvss:9.6, tool:'grype', fixable:true, sla:'BREACHED', exposure:'cluster node', action:'Patch glibc and restart workload safely'},
    {id:'CVE-2024-3094', asset:'build-runner-01', severity:'CRITICAL', cvss:10.0, tool:'syft+grype', fixable:false, sla:'OPEN', exposure:'supply-chain', action:'Quarantine artifact and rebuild from trusted source'},
    {id:'CVE-2022-22965', asset:'api-prod-01', severity:'HIGH', cvss:9.0, tool:'checkov', fixable:true, sla:'OPEN', exposure:'public API', action:'Upgrade Spring stack and validate exploit path'},
    {id:'CVE-2021-44228', asset:'legacy-app-01', severity:'HIGH', cvss:10.0, tool:'trivy', fixable:true, sla:'BREACHED', exposure:'internal', action:'Upgrade log4j / remove vulnerable jar'},
    {id:'CVE-2024-6387', asset:'bastion-01', severity:'HIGH', cvss:8.1, tool:'osv-scanner', fixable:true, sla:'OPEN', exposure:'ssh', action:'Patch OpenSSH and verify daemon version'}
  ];

  const TOOLS = [
    {name:'trivy', findings:5577, critical:88, high:430, signal:'container/package vulnerabilities'},
    {name:'grype', findings:4487, critical:61, high:385, signal:'SBOM correlated vulnerabilities'},
    {name:'kics', findings:74323, critical:12, high:204, signal:'IaC misconfiguration risk'},
    {name:'syft', findings:9775, critical:0, high:0, signal:'SBOM inventory source'},
    {name:'gosec', findings:5826, critical:4, high:71, signal:'Go code security findings'},
    {name:'gitleaks', findings:3332, critical:9, high:22, signal:'secret exposure'}
  ];

  function log(){
    try { console.log.apply(console, ['[' + MARK + ']'].concat([].slice.call(arguments))); } catch(e) {}
  }

  function sevClass(s){
    s = String(s || '').toUpperCase();
    if (s === 'CRITICAL') return 'critical';
    if (s === 'HIGH') return 'high';
    if (s === 'MEDIUM') return 'medium';
    if (s === 'LOW') return 'low';
    return 'info';
  }

  function gate(){
    if (CVES.some(c => c.severity === 'CRITICAL' && c.sla === 'BREACHED')) return 'BLOCK';
    if (CVES.some(c => ['CRITICAL','HIGH'].includes(c.severity))) return 'WARN';
    return 'PASS';
  }

  function gateClass(g){
    return g === 'BLOCK' ? 'block' : g === 'WARN' ? 'warn' : 'pass';
  }

  function counts(){
    return {
      critical: CVES.filter(c => c.severity === 'CRITICAL').length,
      high: CVES.filter(c => c.severity === 'HIGH').length,
      breached: CVES.filter(c => c.sla === 'BREACHED').length,
      fixable: CVES.filter(c => c.fixable).length,
      unfixable: CVES.filter(c => !c.fixable).length,
      tools: TOOLS.length
    };
  }

  function injectStyle(){
    if (document.getElementById('vmv1-style')) return;
    const s = document.createElement('style');
    s.id = 'vmv1-style';
    s.textContent = `
      #vmv1-root {
        margin: 12px 0 16px !important;
        padding: 12px !important;
        background: linear-gradient(180deg, rgba(15,23,42,.88), rgba(2,6,23,.46)) !important;
        border: 1px solid rgba(148,163,184,.16) !important;
        border-radius: 14px !important;
      }
      .vmv1-banner {
        margin-bottom: 12px !important;
        padding: 10px 12px !important;
        border-left: 3px solid #ef4444 !important;
        background: rgba(127,29,29,.25) !important;
        border-radius: 10px !important;
        color: #fee2e2 !important;
        font-size: 11px !important;
        font-family: ui-monospace, Menlo, Consolas, monospace !important;
      }
      .vmv1-top {
        display: grid !important;
        grid-template-columns: repeat(5, minmax(130px, 1fr)) !important;
        gap: 10px !important;
        margin-bottom: 12px !important;
      }
      .vmv1-card {
        background: linear-gradient(180deg, rgba(30,41,59,.96), rgba(15,23,42,.96)) !important;
        border: 1px solid rgba(103,232,249,.16) !important;
        border-radius: 12px !important;
        padding: 11px 13px !important;
        min-height: 72px !important;
        box-shadow: 0 10px 24px rgba(0,0,0,.26) !important;
      }
      .vmv1-label {
        color: #7dd3fc !important;
        font-size: 9px !important;
        text-transform: uppercase !important;
        letter-spacing: .09em !important;
        font-family: ui-monospace, Menlo, Consolas, monospace !important;
      }
      .vmv1-value {
        margin-top: 7px !important;
        color: #e5f3ff !important;
        font-size: 21px !important;
        line-height: 1.1 !important;
        font-weight: 900 !important;
        font-family: ui-monospace, Menlo, Consolas, monospace !important;
      }
      .vmv1-sub {
        margin-top: 4px !important;
        color: #94a3b8 !important;
        font-size: 10px !important;
      }
      .vmv1-critical, .vmv1-block { color: #ef4444 !important; }
      .vmv1-high { color: #fb7185 !important; }
      .vmv1-medium, .vmv1-warn { color: #f59e0b !important; }
      .vmv1-pass, .vmv1-low { color: #22c55e !important; }
      .vmv1-grid {
        display: grid !important;
        grid-template-columns: 1.1fr .9fr !important;
        gap: 12px !important;
        margin-bottom: 12px !important;
      }
      .vmv1-panel {
        background: rgba(15,23,42,.72) !important;
        border: 1px solid rgba(148,163,184,.13) !important;
        border-radius: 12px !important;
        overflow: hidden !important;
      }
      .vmv1-head {
        padding: 10px 12px !important;
        border-bottom: 1px solid rgba(148,163,184,.1) !important;
        display: flex !important;
        justify-content: space-between !important;
        align-items: center !important;
      }
      .vmv1-title {
        color: #e5e7eb !important;
        font-size: 12px !important;
        font-weight: 900 !important;
      }
      .vmv1-caption {
        color: #94a3b8 !important;
        font-size: 10px !important;
        font-family: ui-monospace, Menlo, Consolas, monospace !important;
      }
      .vmv1-list {
        padding: 10px 12px !important;
        display: grid !important;
        gap: 8px !important;
      }
      .vmv1-alert {
        border: 1px solid rgba(148,163,184,.12) !important;
        border-radius: 10px !important;
        padding: 9px !important;
        background: rgba(2,6,23,.35) !important;
      }
      .vmv1-alert-title {
        color: #e5e7eb !important;
        font-size: 11px !important;
        font-weight: 800 !important;
      }
      .vmv1-alert-sub {
        color: #94a3b8 !important;
        font-size: 10px !important;
        margin-top: 3px !important;
      }
      .vmv1-bar {
        height: 8px !important;
        background: rgba(148,163,184,.14) !important;
        border-radius: 999px !important;
        overflow: hidden !important;
        margin-top: 6px !important;
      }
      .vmv1-bar-fill {
        height: 100% !important;
        border-radius: 999px !important;
        background: linear-gradient(90deg, #ef4444, #f59e0b, #22c55e) !important;
      }
      .vmv1-toolbar {
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
      .vmv1-btn {
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
      .vmv1-table {
        width: 100% !important;
        border-collapse: collapse !important;
      }
      .vmv1-table th {
        color: #7f8ca3 !important;
        font-size: 9px !important;
        text-transform: uppercase !important;
        letter-spacing: .08em !important;
        text-align: left !important;
        padding: 8px !important;
        border-bottom: 1px solid rgba(148,163,184,.11) !important;
      }
      .vmv1-table td {
        color: #cbd5e1 !important;
        font-size: 10px !important;
        padding: 8px !important;
        border-bottom: 1px solid rgba(148,163,184,.07) !important;
        font-family: ui-monospace, Menlo, Consolas, monospace !important;
      }
      .vmv1-pill {
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        border-radius: 999px !important;
        padding: 3px 8px !important;
        font-size: 9px !important;
        font-weight: 900 !important;
      }
      .vmv1-pill.critical {
        color: #ef4444 !important;
        background: rgba(239,68,68,.13) !important;
        border: 1px solid rgba(239,68,68,.32) !important;
      }
      .vmv1-pill.high {
        color: #fb7185 !important;
        background: rgba(251,113,133,.13) !important;
        border: 1px solid rgba(251,113,133,.28) !important;
      }
      .vmv1-pill.medium {
        color: #f59e0b !important;
        background: rgba(245,158,11,.13) !important;
        border: 1px solid rgba(245,158,11,.3) !important;
      }
      .vmv1-pill.pass {
        color: #22c55e !important;
        background: rgba(34,197,94,.13) !important;
        border: 1px solid rgba(34,197,94,.28) !important;
      }
      #vmv1-modal {
        position: fixed !important;
        inset: 0 !important;
        z-index: 99999 !important;
        display: none !important;
        align-items: center !important;
        justify-content: center !important;
        background: rgba(2,6,23,.68) !important;
        backdrop-filter: blur(8px) !important;
      }
      #vmv1-modal.open { display: flex !important; }
      .vmv1-dialog {
        width: min(840px,96vw) !important;
        background: #111827 !important;
        border: 1px solid rgba(148,163,184,.22) !important;
        border-radius: 14px !important;
        overflow: hidden !important;
        box-shadow: 0 30px 80px rgba(0,0,0,.5) !important;
      }
      .vmv1-dialog-head {
        padding: 14px 16px !important;
        border-bottom: 1px solid rgba(148,163,184,.12) !important;
        display: flex !important;
        justify-content: space-between !important;
      }
      .vmv1-dialog-body {
        padding: 16px !important;
        color: #cbd5e1 !important;
      }
      .vmv1-kv-grid {
        display: grid !important;
        grid-template-columns: repeat(2,minmax(180px,1fr)) !important;
        gap: 10px !important;
      }
      .vmv1-kv {
        background: rgba(15,23,42,.72) !important;
        border: 1px solid rgba(148,163,184,.12) !important;
        border-radius: 10px !important;
        padding: 10px !important;
        font-size: 12px !important;
      }
      .vmv1-kv b {
        display: block !important;
        color: #94a3b8 !important;
        font-size: 10px !important;
        text-transform: uppercase !important;
        margin-bottom: 4px !important;
      }
    `;
    document.head.appendChild(s);
  }

  function render(){
    injectStyle();
    document.getElementById('vmv1-root')?.remove();

    const c = counts();
    const g = gate();

    const root = document.createElement('div');
    root.id = 'vmv1-root';

    root.innerHTML = `
      <div class="vmv1-banner">
        Vuln Management — commercial remediation workspace. Prioritize exploitability, SLA breach, fixability, tool source and evidence export.
      </div>

      <div class="vmv1-top">
        <div class="vmv1-card"><div class="vmv1-label">Critical CVEs</div><div class="vmv1-value vmv1-critical">${c.critical}</div><div class="vmv1-sub">priority remediation</div></div>
        <div class="vmv1-card"><div class="vmv1-label">High CVEs</div><div class="vmv1-value vmv1-high">${c.high}</div><div class="vmv1-sub">review within SLA</div></div>
        <div class="vmv1-card"><div class="vmv1-label">SLA breached</div><div class="vmv1-value vmv1-critical">${c.breached}</div><div class="vmv1-sub">requires escalation</div></div>
        <div class="vmv1-card"><div class="vmv1-label">Fixable</div><div class="vmv1-value vmv1-pass">${c.fixable}</div><div class="vmv1-sub">${c.unfixable} no-patch yet</div></div>
        <div class="vmv1-card"><div class="vmv1-label">Gate decision</div><div class="vmv1-value vmv1-${gateClass(g)}">${g}</div><div class="vmv1-sub">patch gate</div></div>
      </div>

      <div class="vmv1-grid">
        <div class="vmv1-panel">
          <div class="vmv1-head">
            <div><div class="vmv1-title">Critical remediation queue</div><div class="vmv1-caption">exploitability + SLA + exposure</div></div>
          </div>
          <div class="vmv1-list" id="vmv1-critical-list"></div>
        </div>

        <div class="vmv1-panel">
          <div class="vmv1-head">
            <div><div class="vmv1-title">Findings by tool</div><div class="vmv1-caption">risk contribution by scanner</div></div>
          </div>
          <div class="vmv1-list" id="vmv1-tool-list"></div>
        </div>
      </div>

      <div class="vmv1-toolbar">
        <div class="vmv1-caption">Commercial view: CVE priority, exploitability, SLA breach, fixability and evidence export.</div>
        <div>
          <button class="vmv1-btn" data-vmv1-export-all="1">Export Evidence JSON</button>
          <button class="vmv1-btn" data-vmv1-refresh="1">Refresh View</button>
        </div>
      </div>

      <div class="vmv1-panel">
        <div class="vmv1-head">
          <div><div class="vmv1-title">Top actionable CVEs</div><div class="vmv1-caption">remediation-first queue</div></div>
        </div>
        <table class="vmv1-table">
          <thead>
            <tr>
              <th>CVE</th>
              <th>Asset</th>
              <th>Severity</th>
              <th>CVSS</th>
              <th>Tool</th>
              <th>Fixable</th>
              <th>SLA</th>
              <th>Exposure</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="vmv1-tbody"></tbody>
        </table>
      </div>
    `;

    const anchor = findAnchor();
    anchor.parentElement.insertBefore(root, anchor.nextSibling);

    renderCriticalList();
    renderToolList();
    renderRows();
    ensureModal();
    bind(root);

    document.documentElement.setAttribute('data-vuln-mgmt-v1', 'ready');
    log('rendered CVEs=', CVES.length);
  }

  function findAnchor(){
    const candidates = Array.from(document.querySelectorAll('h1,h2,h3,h4,div,span,b,strong'));
    return candidates.find(x => /Vulnerability Management|Vuln Management|Vuln management/i.test((x.textContent || '').trim())) ||
      document.body.firstElementChild ||
      document.body;
  }

  function renderCriticalList(){
    const box = document.getElementById('vmv1-critical-list');
    if (!box) return;

    const items = CVES
      .slice()
      .sort((a,b) => b.cvss - a.cvss)
      .slice(0,4);

    box.innerHTML = items.map(c => `
      <div class="vmv1-alert">
        <div class="vmv1-alert-title">
          <span class="vmv1-pill ${sevClass(c.severity)}">${c.severity}</span>
          ${c.id} · ${c.asset}
        </div>
        <div class="vmv1-alert-sub">CVSS ${c.cvss} · ${c.exposure} · ${c.sla} · ${c.action}</div>
      </div>
    `).join('');
  }

  function renderToolList(){
    const box = document.getElementById('vmv1-tool-list');
    if (!box) return;

    const max = Math.max.apply(null, TOOLS.map(t => t.findings));

    box.innerHTML = TOOLS.map(t => {
      const pct = Math.max(4, Math.round((t.findings / max) * 100));
      return `
        <div class="vmv1-alert">
          <div class="vmv1-alert-title">${t.name} · ${t.findings.toLocaleString()} findings</div>
          <div class="vmv1-bar"><div class="vmv1-bar-fill" style="width:${pct}%"></div></div>
          <div class="vmv1-alert-sub">critical ${t.critical} · high ${t.high} · ${t.signal}</div>
        </div>
      `;
    }).join('');
  }

  function renderRows(){
    const tb = document.getElementById('vmv1-tbody');
    if (!tb) return;

    tb.innerHTML = CVES.map((c, idx) => `
      <tr>
        <td>${c.id}</td>
        <td>${c.asset}</td>
        <td><span class="vmv1-pill ${sevClass(c.severity)}">${c.severity}</span></td>
        <td>${c.cvss}</td>
        <td>${c.tool}</td>
        <td>${c.fixable ? 'yes' : 'no'}</td>
        <td>${c.sla}</td>
        <td>${c.exposure}</td>
        <td>
          <button class="vmv1-btn" data-vmv1-detail="${idx}">Detail</button>
          <button class="vmv1-btn" data-vmv1-evidence="${idx}">Evidence</button>
        </td>
      </tr>
    `).join('');
  }

  function bind(root){
    root.addEventListener('click', function(e){
      const detail = e.target.closest('[data-vmv1-detail]');
      const evidence = e.target.closest('[data-vmv1-evidence]');
      const all = e.target.closest('[data-vmv1-export-all]');
      const refresh = e.target.closest('[data-vmv1-refresh]');

      if (detail) openDetail(CVES[Number(detail.getAttribute('data-vmv1-detail'))]);
      if (evidence) exportOne(CVES[Number(evidence.getAttribute('data-vmv1-evidence'))]);
      if (all) exportAll();
      if (refresh) render();
    });
  }

  function ensureModal(){
    if (document.getElementById('vmv1-modal')) return;

    const m = document.createElement('div');
    m.id = 'vmv1-modal';
    m.innerHTML = `
      <div class="vmv1-dialog">
        <div class="vmv1-dialog-head">
          <div id="vmv1-modal-title" style="color:#e5e7eb;font-size:14px;font-weight:900">CVE Detail</div>
          <button class="vmv1-btn" data-vmv1-close="1">Close</button>
        </div>
        <div class="vmv1-dialog-body" id="vmv1-modal-body"></div>
      </div>
    `;
    document.body.appendChild(m);
    m.addEventListener('click', function(e){
      if (e.target === m || e.target.closest('[data-vmv1-close]')) m.classList.remove('open');
    });
  }

  function openDetail(c){
    const m = document.getElementById('vmv1-modal');
    document.getElementById('vmv1-modal-title').textContent = `${c.id} — ${c.severity}`;
    document.getElementById('vmv1-modal-body').innerHTML = `
      <div class="vmv1-kv-grid">
        <div class="vmv1-kv"><b>CVE</b>${c.id}</div>
        <div class="vmv1-kv"><b>Asset</b>${c.asset}</div>
        <div class="vmv1-kv"><b>Severity</b><span class="vmv1-pill ${sevClass(c.severity)}">${c.severity}</span></div>
        <div class="vmv1-kv"><b>CVSS</b>${c.cvss}</div>
        <div class="vmv1-kv"><b>Tool</b>${c.tool}</div>
        <div class="vmv1-kv"><b>Fixable</b>${c.fixable ? 'yes' : 'no'}</div>
        <div class="vmv1-kv"><b>SLA</b>${c.sla}</div>
        <div class="vmv1-kv"><b>Exposure</b>${c.exposure}</div>
      </div>
      <div style="margin-top:12px;color:#94a3b8;font-size:11px"><b>Recommended action:</b> ${c.action}</div>
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

  function exportOne(c){
    download(`${c.id.toLowerCase()}_vuln_evidence.json`, {
      type: 'vuln_mgmt_evidence',
      exported_at: new Date().toISOString(),
      gate: gate(),
      cve: c
    });
  }

  function exportAll(){
    download('vuln_mgmt_evidence_all.json', {
      type: 'vuln_mgmt_evidence_all',
      exported_at: new Date().toISOString(),
      gate: gate(),
      total_cves: CVES.length,
      cves: CVES,
      tools: TOOLS
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

    setTimeout(render, 1200);
    setTimeout(render, 2500);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  window.VULN_MGMT_ENTERPRISE_V1 = { render, exportAll };
})();



/* VULN_MGMT_HIDE_NATIVE_V2
   Hide duplicate native Vulnerability Management sections after enterprise V1 renders.
*/
(function(){
  if (window.__VULN_MGMT_HIDE_NATIVE_V2__) return;
  window.__VULN_MGMT_HIDE_NATIVE_V2__ = true;

  function txt(el){
    return (el && el.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function insideEnterprise(el){
    return !!(el && el.closest && el.closest('#vmv1-root'));
  }

  function hardHide(el, reason){
    if (!el || insideEnterprise(el)) return;
    el.setAttribute('data-vmv2-hidden', reason || 'native-vuln');
    el.classList.add('vmv2-hidden');
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
    if (document.getElementById('vmv2-hide-style')) return;
    var s = document.createElement('style');
    s.id = 'vmv2-hide-style';
    s.textContent = `
      .vmv2-hidden {
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

  function looksNativeVuln(el){
    if (!el || insideEnterprise(el)) return false;
    var t = txt(el);
    if (!t) return false;

    if (
      /Severity trend/i.test(t) ||
      /Top CVEs/i.test(t) ||
      /SLA compliance/i.test(t) ||
      /Fixable vs unfixable/i.test(t) ||
      /Remediation Status/i.test(t)
    ) return true;

    if (
      /CRITICAL/i.test(t) &&
      /HIGH/i.test(t) &&
      /CVES TRACKED/i.test(t) &&
      /SCANNERS/i.test(t)
    ) return true;

    if (
      /Search CVE \/ tool \/ package/i.test(t) ||
      /No CVEs match the filter/i.test(t) ||
      /Findings by tool/i.test(t) && /bandit|kics|syft|trivy|gosec|gitleaks/i.test(t)
    ) return true;

    if (
      /Open findings/i.test(t) &&
      /Resolved/i.test(t) &&
      /In progress/i.test(t) &&
      /Resolution rate/i.test(t)
    ) return true;

    return false;
  }

  function hideNative(){
    installStyle();

    var root = document.getElementById('vmv1-root');
    if (!root) return;

    // Hide duplicate native sections by text signature.
    Array.from(document.querySelectorAll('div,section,article,table,form,canvas,svg')).forEach(function(el){
      if (insideEnterprise(el)) return;
      if (looksNativeVuln(el)) {
        var block = el.closest('section,article,.card,.panel,[class*="card"],[class*="panel"],div') || el;
        hardHide(block, 'native-vuln-section');
      }
    });

    // Hide native filter controls after enterprise.
    Array.from(document.querySelectorAll('input,select,button')).forEach(function(el){
      if (insideEnterprise(el)) return;

      var ph = el.getAttribute('placeholder') || '';
      var t = txt(el);

      if (
        /Search CVE \/ tool \/ package/i.test(ph) ||
        /^All severity$/i.test(t) ||
        /^Critical$/i.test(t) ||
        /^High$/i.test(t) ||
        /^Medium$/i.test(t) ||
        /^Low$/i.test(t) ||
        /^CSV$/i.test(t) ||
        /^Refresh$/i.test(t) ||
        /^Run Reload CVE$/i.test(t) ||
        /^Open Threat Intel$/i.test(t)
      ) {
        var block = el.closest('form,section,article,.card,.panel,[class*="card"],[class*="panel"],div') || el;
        hardHide(block, 'native-vuln-control');
      }
    });

    // Hide any large native block after enterprise root.
    var after = false;
    Array.from(document.body.querySelectorAll('div,section,article')).forEach(function(el){
      if (el === root) {
        after = true;
        return;
      }
      if (!after || insideEnterprise(el)) return;

      var t = txt(el);
      if (
        /Severity trend/i.test(t) ||
        /SLA compliance/i.test(t) ||
        /Fixable vs unfixable/i.test(t) ||
        /Remediation Status/i.test(t) ||
        /No CVEs match the filter/i.test(t) ||
        (/CRITICAL/i.test(t) && /CVES TRACKED/i.test(t) && /SCANNERS/i.test(t))
      ) {
        hardHide(el, 'native-after-enterprise');
      }
    });

    document.documentElement.setAttribute('data-vuln-mgmt-v2-hide-native', 'done');
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

  console.log('[VULN_MGMT_HIDE_NATIVE_V2] installed');
})();




/* VULN_MGMT_HIDE_NATIVE_TOP_V3
   Hide duplicate native top/header/filter controls around Vuln Mgmt enterprise V1.
*/
(function(){
  if (window.__VULN_MGMT_HIDE_NATIVE_TOP_V3__) return;
  window.__VULN_MGMT_HIDE_NATIVE_TOP_V3__ = true;

  function txt(el){
    return (el && el.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function insideEnterprise(el){
    return !!(el && el.closest && el.closest('#vmv1-root'));
  }

  function hardHide(el, reason){
    if (!el || insideEnterprise(el)) return;
    el.setAttribute('data-vmv3-hidden', reason || 'native-vuln-top');
    el.classList.add('vmv3-hidden');
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
    if (document.getElementById('vmv3-hide-style')) return;
    var s = document.createElement('style');
    s.id = 'vmv3-hide-style';
    s.textContent = `
      .vmv3-hidden {
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

  function isNativeTopBlock(el){
    if (!el || insideEnterprise(el)) return false;

    var t = txt(el);
    if (!t) return false;

    if (/CRITICAL CVEs detected/i.test(t) && /Open Threat Intel/i.test(t)) return true;

    if (
      /Vulnerability Management/i.test(t) &&
      /Trend/i.test(t) &&
      /CVE tracking/i.test(t) &&
      /tool breakdown/i.test(t) &&
      /SLA/i.test(t)
    ) return true;

    if (
      /Last 30d/i.test(t) &&
      /Run Reload CVE/i.test(t) &&
      /Logs/i.test(t) &&
      /Refresh/i.test(t)
    ) return true;

    if (
      /Search CVE \/ tool \/ package/i.test(t) &&
      /All severity/i.test(t) &&
      /Critical/i.test(t) &&
      /High/i.test(t) &&
      /Medium/i.test(t) &&
      /Low/i.test(t)
    ) return true;

    return false;
  }

  function hideTop(){
    installStyle();

    var root = document.getElementById('vmv1-root');
    if (!root) return;

    // Hide obvious native top/header containers anywhere outside enterprise.
    Array.from(document.querySelectorAll('div,section,article,header,form')).forEach(function(el){
      if (insideEnterprise(el)) return;
      if (isNativeTopBlock(el)) {
        var block = el.closest('section,article,header,.card,.panel,.toolbar,.banner,[class*="card"],[class*="panel"],[class*="toolbar"],[class*="banner"],div') || el;
        hardHide(block, 'native-vuln-top');
      }
    });

    // Hide native buttons/filters/search controls.
    Array.from(document.querySelectorAll('input,select,button')).forEach(function(el){
      if (insideEnterprise(el)) return;

      var ph = el.getAttribute('placeholder') || '';
      var t = txt(el);

      if (
        /Search CVE \/ tool \/ package/i.test(ph) ||
        /^Last 30d$/i.test(t) ||
        /^Run Reload CVE$/i.test(t) ||
        /^Logs$/i.test(t) ||
        /^Refresh$/i.test(t) ||
        /^Open Threat Intel$/i.test(t) ||
        /^All severity$/i.test(t) ||
        /^Critical$/i.test(t) ||
        /^High$/i.test(t) ||
        /^Medium$/i.test(t) ||
        /^Low$/i.test(t) ||
        /^CSV$/i.test(t)
      ) {
        var block = el.closest('form,section,article,header,.card,.panel,.toolbar,[class*="card"],[class*="panel"],[class*="toolbar"],div') || el;
        hardHide(block, 'native-vuln-top-control');
      }
    });

    // Hide siblings before enterprise root if they are native vuln top fragments.
    var before = true;
    Array.from(document.body.querySelectorAll('div,section,article,header,form')).forEach(function(el){
      if (el === root) {
        before = false;
        return;
      }
      if (!before || insideEnterprise(el)) return;

      var t = txt(el);
      if (
        /CRITICAL CVEs detected/i.test(t) ||
        /Run Reload CVE/i.test(t) ||
        /Search CVE \/ tool \/ package/i.test(t) ||
        (/Vulnerability Management/i.test(t) && /CVE tracking/i.test(t))
      ) {
        hardHide(el, 'native-before-enterprise');
      }
    });

    document.documentElement.setAttribute('data-vuln-mgmt-v3-hide-top', 'done');
  }

  function boot(){
    hideTop();
    setTimeout(hideTop, 300);
    setTimeout(hideTop, 1000);
    setTimeout(hideTop, 2500);
    setTimeout(hideTop, 4500);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  console.log('[VULN_MGMT_HIDE_NATIVE_TOP_V3] installed');
})();


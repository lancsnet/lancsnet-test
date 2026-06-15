/* CICD_SETTINGS_REPORTS_V16 */
(function(){
  if (window.__CICD_SETTINGS_REPORTS_V16__) return;
  window.__CICD_SETTINGS_REPORTS_V16__ = true;

  const API = {
    config: "/api/v1/cicd/config",
    updateConfig: "/api/v1/cicd/config/update",
    queue: "/api/v1/cicd/queue",
    status: "/api/v1/cicd/status"
  };

  function parentDoc(){
    try {
      if (window.parent && window.parent !== window && window.parent.document) return window.parent.document;
    } catch (_) {}
    return document;
  }

  function panelDoc(){
    return document;
  }

  async function getJSON(url){
    const res = await fetch(url, {
      method: "GET",
      headers: { "Accept": "application/json" },
      credentials: "same-origin"
    });
    const text = await res.text();
    let data = {};
    try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
    if (!res.ok) throw Object.assign(new Error("HTTP " + res.status), { status: res.status, data });
    return data;
  }

  function cookie(name){
    for (const p of document.cookie.split(";").map(x => x.trim())) {
      if (p.startsWith(name + "=")) return decodeURIComponent(p.slice(name.length + 1));
    }
    return "";
  }

  async function postJSON(url, payload){
    const token = cookie("vsp_csrf");
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "X-CSRF-Token": token,
        "X-CSRFToken": token,
        "X-VSP-CSRF": token
      },
      credentials: "same-origin",
      body: JSON.stringify(payload)
    });
    const text = await res.text();
    let data = {};
    try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
    if (!res.ok) throw Object.assign(new Error("HTTP " + res.status), { status: res.status, data });
    return data;
  }

  function baseConfig(raw){ return raw && raw.config ? raw.config : raw || {}; }

  function attr(id, label){ return `id="${id}" name="${id}" aria-label="${label}" autocomplete="off"`; }

  function field(id, label, value, textarea){
    const a = attr(id, label);
    const html = textarea ? `<textarea ${a}>${value || ""}</textarea>` : `<input ${a} value="${value || ""}">`;
    return `<div class="cicd-v16-field"><label for="${id}">${label}</label>${html}</div>`;
  }

  function select(id, label, value, opts){
    return `<div class="cicd-v16-field"><label for="${id}">${label}</label><select ${attr(id, label)}>${
      opts.map(o => {
        const v = Array.isArray(o) ? o[0] : o;
        const t = Array.isArray(o) ? o[1] : o;
        return `<option value="${v}" ${String(value) === String(v) ? "selected" : ""}>${t}</option>`;
      }).join("")
    }</select></div>`;
  }

  function full(x){ return `<div class="full">${x}</div>`; }

  function val(id, fallback){
    const el = document.querySelector("#" + id);
    return el && typeof el.value === "string" && el.value.trim() ? el.value.trim() : fallback;
  }

  function boolVal(id, fallback){ return val(id, fallback ? "true" : "false") === "true"; }
  function numVal(id, fallback){ const n = Number(val(id, String(fallback))); return Number.isFinite(n) ? n : fallback; }

  function cleanupWrongUi(){
    const pd = parentDoc();
    [
      "#cicd-v13-schedule-btn",
      "#cicd-v12e-product-card",
      "#cicd-v12f-pin-host",
      "#cicd-v12g-parent-host",
      "#cicd-v12e-floating-btn"
    ].forEach(sel => {
      document.querySelectorAll(sel).forEach(x => x.remove());
      try { pd.querySelectorAll(sel).forEach(x => x.remove()); } catch (_) {}
    });
  }

  function drawer(id){
    let d = document.querySelector("#" + id);
    if (!d) {
      d = document.createElement("aside");
      d.id = id;
      d.className = "cicd-v16-drawer";
      d.setAttribute("role", "dialog");
      document.body.appendChild(d);
    }
    return d;
  }

  function closeAll(){
    document.querySelectorAll(".cicd-v16-drawer").forEach(x => x.classList.remove("open"));
  }

  function tabs(names){
    return `<div class="cicd-v16-tabs">${
      names.map((t,i)=>`<button class="cicd-v16-tab ${i===0?"active":""}" type="button" data-v16-tab="${t.key}">${t.label}</button>`).join("")
    }</div>`;
  }

  function setActiveTab(root, key){
    root.querySelectorAll(".cicd-v16-tab").forEach(x => x.classList.toggle("active", x.getAttribute("data-v16-tab") === key));
    root.querySelectorAll(".cicd-v16-section").forEach(x => x.classList.toggle("active", x.getAttribute("data-v16-section") === key));
  }

  async function openSettings(){
    cleanupWrongUi();

    let cfg = {};
    let status = {};
    let queue = { count: 0, items: [] };

    try { cfg = await getJSON(API.config); } catch (_) {}
    try { status = await getJSON(API.status); } catch (_) {}
    try { queue = await getJSON(API.queue); } catch (_) {}

    const c = baseConfig(cfg);
    const tools = c.tools || {};
    const thresholds = c.thresholds || {};
    const gate = c.gate_policy || {};
    const evidence = c.evidence || {};
    const scheduler = c.scheduler || {};

    const d = drawer("cicd-v16-settings-drawer");
    d.setAttribute("aria-label", "CI/CD Settings");

    d.innerHTML = `
      <div class="cicd-v16-head">
        <div>
          <div class="cicd-v16-title">CI/CD Settings</div>
          <div class="cicd-v16-sub">Configure scan tools, gate policy, thresholds, evidence retention, branch profile and notification behavior.</div>
        </div>
        <button class="cicd-v16-close" type="button" data-v16-close="1">×</button>
      </div>
      <div class="cicd-v16-body">
        <div class="cicd-v16-kpis">
          <div class="cicd-v16-kpi"><div class="num">${status.latest_status || "n/a"}</div><div class="txt">Latest gate</div></div>
          <div class="cicd-v16-kpi"><div class="num">${queue.count || 0}</div><div class="txt">Queue items</div></div>
          <div class="cicd-v16-kpi"><div class="num">${thresholds.max_critical ?? 0}</div><div class="txt">Max critical</div></div>
          <div class="cicd-v16-kpi"><div class="num">${thresholds.max_high ?? 4}</div><div class="txt">Max high</div></div>
        </div>

        ${tabs([
          {key:"tools",label:"Tools"},
          {key:"gate",label:"Gate Policy"},
          {key:"thresholds",label:"Thresholds"},
          {key:"evidence",label:"Evidence"},
          {key:"profile",label:"Profile"},
          {key:"preview",label:"Preview"}
        ])}

        <section class="cicd-v16-section active" data-v16-section="tools">
          <div class="cicd-v16-section-title">Security tools</div>
          <div class="cicd-v16-grid">
            ${select("v16-tool-sast","SAST",String(tools.sast !== false),[["true","Enabled"],["false","Disabled"]])}
            ${select("v16-tool-sca","SCA",String(tools.sca !== false),[["true","Enabled"],["false","Disabled"]])}
            ${select("v16-tool-secrets","Secrets",String(tools.secrets !== false),[["true","Enabled"],["false","Disabled"]])}
            ${select("v16-tool-iac","IaC",String(tools.iac !== false),[["true","Enabled"],["false","Disabled"]])}
            ${select("v16-tool-container","Container",String(tools.container !== false),[["true","Enabled"],["false","Disabled"]])}
            ${select("v16-tool-finalgate","Final Gate",String(true),[["true","Enabled"],["false","Disabled"]])}
          </div>
        </section>

        <section class="cicd-v16-section" data-v16-section="gate">
          <div class="cicd-v16-section-title">Gate policy</div>
          <div class="cicd-v16-grid">
            ${select("v16-gate-critical","Critical",gate.critical || "block",[["block","Block"],["review","Review"],["track","Track"]])}
            ${select("v16-gate-high","High",gate.high || "review",[["block","Block"],["review","Review"],["track","Track"]])}
            ${select("v16-gate-medium","Medium",gate.medium || "track",[["block","Block"],["review","Review"],["track","Track"]])}
            ${select("v16-gate-mode","Gate mode",scheduler?.gate?.mode || "block-critical-review-high",[["block-critical-review-high","Block critical, review high"],["block-critical-high","Block critical and high"],["audit-only","Audit only"]])}
          </div>
        </section>

        <section class="cicd-v16-section" data-v16-section="thresholds">
          <div class="cicd-v16-section-title">Thresholds</div>
          <div class="cicd-v16-grid">
            ${field("v16-max-critical","Max critical",thresholds.max_critical ?? 0)}
            ${field("v16-max-high","Max high",thresholds.max_high ?? 4)}
            ${field("v16-max-medium","Max medium",thresholds.max_medium ?? 20)}
            ${field("v16-timeout-min","Default scan timeout minutes",scheduler?.timeout?.scan_timeout_min ?? 60)}
          </div>
        </section>

        <section class="cicd-v16-section" data-v16-section="evidence">
          <div class="cicd-v16-section-title">Evidence retention</div>
          <div class="cicd-v16-grid">
            ${select("v16-keep-reports","Keep reports",String(evidence.keep_reports !== false),[["true","Yes"],["false","No"]])}
            ${select("v16-keep-screenshots","Keep screenshots",String(evidence.keep_screenshots !== false),[["true","Yes"],["false","No"]])}
            ${select("v16-keep-logs","Keep logs",String(scheduler?.retention?.keep_logs !== false),[["true","Yes"],["false","No"]])}
            ${field("v16-keep-days","Retention days",scheduler?.retention?.keep_days ?? 30)}
          </div>
        </section>

        <section class="cicd-v16-section" data-v16-section="profile">
          <div class="cicd-v16-section-title">Profile</div>
          <div class="cicd-v16-grid">
            ${field("v16-profile","Profile",c.profile || scheduler.profile || "commercial-full-gate")}
            ${field("v16-branch","Default branch",scheduler.branch || "main")}
            ${full(field("v16-scope","Default scope",scheduler.scope || "SAST,SCA,Secrets,IaC,Container,Final Gate,Evidence Pack",true))}
          </div>
        </section>

        <section class="cicd-v16-section" data-v16-section="preview">
          <div class="cicd-v16-section-title">Preview</div>
          <pre class="cicd-v16-preview" id="v16-settings-preview"></pre>
        </section>

        <div class="cicd-v16-actions">
          <button class="cicd-v16-btn secondary" type="button" data-v16-close="1">Close</button>
          <button class="cicd-v16-btn secondary" type="button" id="v16-settings-refresh">Refresh preview</button>
          <button class="cicd-v16-btn primary" type="button" id="v16-settings-save">Save settings</button>
        </div>
      </div>
    `;

    window.__CICD_V16_SETTINGS_RAW__ = c;
    closeAll();
    d.classList.add("open");
    refreshSettingsPreview();

    console.log("[CICD-V16] CI/CD Settings drawer opened", { cfg, status, queue });
  }

  function buildSettingsPayload(){
    const base = window.__CICD_V16_SETTINGS_RAW__ || {};
    const scheduler = base.scheduler || {};
    return {
      ...base,
      source: "CICD_SETTINGS_PRODUCT_V16",
      profile: val("v16-profile", base.profile || "commercial-full-gate"),
      tools: {
        ...(base.tools || {}),
        sast: boolVal("v16-tool-sast", true),
        sca: boolVal("v16-tool-sca", true),
        secrets: boolVal("v16-tool-secrets", true),
        iac: boolVal("v16-tool-iac", true),
        container: boolVal("v16-tool-container", true)
      },
      gate_policy: {
        critical: val("v16-gate-critical", "block"),
        high: val("v16-gate-high", "review"),
        medium: val("v16-gate-medium", "track")
      },
      thresholds: {
        max_critical: numVal("v16-max-critical", 0),
        max_high: numVal("v16-max-high", 4),
        max_medium: numVal("v16-max-medium", 20)
      },
      evidence: {
        keep_reports: boolVal("v16-keep-reports", true),
        keep_screenshots: boolVal("v16-keep-screenshots", true)
      },
      scheduler: {
        ...scheduler,
        branch: val("v16-branch", scheduler.branch || "main"),
        profile: val("v16-profile", scheduler.profile || "commercial-full-gate"),
        scope: val("v16-scope", scheduler.scope || "SAST,SCA,Secrets,IaC,Container,Final Gate,Evidence Pack"),
        timeout: {
          ...(scheduler.timeout || {}),
          scan_timeout_min: numVal("v16-timeout-min", 60)
        },
        retention: {
          ...(scheduler.retention || {}),
          keep_logs: boolVal("v16-keep-logs", true),
          keep_days: numVal("v16-keep-days", 30)
        },
        gate: {
          ...(scheduler.gate || {}),
          mode: val("v16-gate-mode", "block-critical-review-high")
        }
      },
      updated_at: new Date().toISOString()
    };
  }

  function refreshSettingsPreview(){
    const box = document.querySelector("#v16-settings-preview");
    if (box) box.textContent = JSON.stringify(buildSettingsPayload(), null, 2);
  }

  async function saveSettings(){
    const payload = buildSettingsPayload();
    const res = await postJSON(API.updateConfig, payload);
    console.log("[CICD-V16] CI/CD Settings saved", { payload, res });
    closeAll();
  }

  async function openReports(){
    cleanupWrongUi();

    let queue = { count: 0, items: [] };
    let status = {};
    let cfg = {};

    try { queue = await getJSON(API.queue); } catch (_) {}
    try { status = await getJSON(API.status); } catch (_) {}
    try { cfg = await getJSON(API.config); } catch (_) {}

    const c = baseConfig(cfg);
    const items = Array.isArray(queue.items) ? queue.items : [];

    const d = drawer("cicd-v16-reports-drawer");
    d.setAttribute("aria-label", "CI/CD Reports");

    d.innerHTML = `
      <div class="cicd-v16-head">
        <div>
          <div class="cicd-v16-title">CI/CD Reports</div>
          <div class="cicd-v16-sub">Run summary, queue, evidence artifacts, gate decisions and export-ready operational report.</div>
        </div>
        <button class="cicd-v16-close" type="button" data-v16-close="1">×</button>
      </div>

      <div class="cicd-v16-body">
        <div class="cicd-v16-kpis">
          <div class="cicd-v16-kpi"><div class="num">${status.latest_status || "n/a"}</div><div class="txt">Latest gate</div></div>
          <div class="cicd-v16-kpi"><div class="num">${status.total_runs_today ?? 0}</div><div class="txt">Runs today</div></div>
          <div class="cicd-v16-kpi"><div class="num">${status.blocked_prs ?? 0}</div><div class="txt">Blocked PR/MR</div></div>
          <div class="cicd-v16-kpi"><div class="num">${queue.count ?? 0}</div><div class="txt">Queue items</div></div>
        </div>

        ${tabs([
          {key:"summary",label:"Summary"},
          {key:"queue",label:"Queue"},
          {key:"evidence",label:"Evidence"},
          {key:"gate",label:"Gate"},
          {key:"export",label:"Export"}
        ])}

        <section class="cicd-v16-section active" data-v16-section="summary">
          <div class="cicd-v16-section-title">Executive summary</div>
          <table class="cicd-v16-table">
            <tbody>
              <tr><th>Status source</th><td>${status.source || "n/a"}</td></tr>
              <tr><th>Data table</th><td>${status.table || "n/a"}</td></tr>
              <tr><th>Generated at</th><td>${status.generated_at || "n/a"}</td></tr>
              <tr><th>Config source</th><td>${c.source || "n/a"}</td></tr>
              <tr><th>Profile</th><td>${c.profile || c.scheduler?.profile || "n/a"}</td></tr>
            </tbody>
          </table>
        </section>

        <section class="cicd-v16-section" data-v16-section="queue">
          <div class="cicd-v16-section-title">Queue detail</div>
          <table class="cicd-v16-table">
            <thead><tr><th>RID</th><th>Branch</th><th>Profile</th><th>Status</th><th>Owner</th></tr></thead>
            <tbody>
              ${
                items.length
                ? items.map(it => `<tr><td>${it.rid || ""}</td><td>${it.branch || ""}</td><td>${it.profile || ""}</td><td><span class="cicd-v16-pill">${it.status || "QUEUED"}</span></td><td>${it.owner || "DevSecOps"}</td></tr>`).join("")
                : `<tr><td colspan="5">No queued jobs. Queue API is active.</td></tr>`
              }
            </tbody>
          </table>
        </section>

        <section class="cicd-v16-section" data-v16-section="evidence">
          <div class="cicd-v16-section-title">Evidence artifacts</div>
          <table class="cicd-v16-table">
            <tbody>
              <tr><th>Reports</th><td>${c.evidence?.keep_reports !== false ? "Retained" : "Disabled"}</td></tr>
              <tr><th>Screenshots</th><td>${c.evidence?.keep_screenshots !== false ? "Retained" : "Disabled"}</td></tr>
              <tr><th>Logs</th><td>${c.scheduler?.retention?.keep_logs !== false ? "Retained" : "Disabled"}</td></tr>
              <tr><th>Retention days</th><td>${c.scheduler?.retention?.keep_days ?? 30}</td></tr>
            </tbody>
          </table>
        </section>

        <section class="cicd-v16-section" data-v16-section="gate">
          <div class="cicd-v16-section-title">Gate decisions</div>
          <table class="cicd-v16-table">
            <tbody>
              <tr><th>Latest status</th><td><span class="cicd-v16-pill">${status.latest_status || "n/a"}</span></td></tr>
              <tr><th>Gate fail today</th><td>${status.gate_fail_today ?? 0}</td></tr>
              <tr><th>Gate pass today</th><td>${status.gate_pass_today ?? 0}</td></tr>
              <tr><th>Blocked PR/MR</th><td>${status.blocked_prs ?? 0}</td></tr>
              <tr><th>Critical policy</th><td>${c.gate_policy?.critical || "block"}</td></tr>
              <tr><th>High policy</th><td>${c.gate_policy?.high || "review"}</td></tr>
            </tbody>
          </table>
        </section>

        <section class="cicd-v16-section" data-v16-section="export">
          <div class="cicd-v16-section-title">Export payload</div>
          <pre class="cicd-v16-preview" id="v16-report-json">${JSON.stringify({status, queue, config:c}, null, 2)}</pre>
        </section>

        <div class="cicd-v16-actions">
          <button class="cicd-v16-btn secondary" type="button" data-v16-close="1">Close</button>
          <button class="cicd-v16-btn primary" type="button" id="v16-copy-report">Copy report JSON</button>
        </div>
      </div>
    `;

    closeAll();
    d.classList.add("open");
    console.log("[CICD-V16] CI/CD Reports drawer opened", { status, queue, config: c });
  }

  function findLeftMenu(textWanted){
    // Only search within CI/CD panel itself, never hijack main sidebar nav
    const cicdPanel = document.getElementById("panel-cicd")
      || document.querySelector(".cicd-panel")
      || document.querySelector("[data-panel='cicd']");
    const root = cicdPanel || document;
    const want = textWanted.toLowerCase();
    return Array.from(root.querySelectorAll("a, button, [role='button'], li, div, span"))
      .find(el => {
        // Skip main nav items (have onclick with showPanel)
        const onclick = el.getAttribute("onclick") || "";
        if (onclick.includes("showPanel")) return false;
        const text = (el.innerText || el.textContent || "").trim().toLowerCase();
        if (text !== want) return false;
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });
  }

  function bindMenu(text, handler){
    const pd = parentDoc();
    const item = findLeftMenu(text);
    if (!item) return false;

    item.classList.add("v16-cicd-menu-bound");
    item.setAttribute("title", "Open CI/CD " + text);
    item.setAttribute("data-cicd-v16-bound", text);

    if (!item.dataset.v16Bound) {
      item.dataset.v16Bound = "1";
      item.addEventListener("click", function(e){
        e.preventDefault();
        e.stopPropagation();

        pd.querySelectorAll(".v16-cicd-menu-active").forEach(x => x.classList.remove("v16-cicd-menu-active"));
        item.classList.add("v16-cicd-menu-active");

        handler();
        return false;
      }, true);
    }

    return true;
  }

  function bindEvents(){
    if (document.__CICD_V16_EVENTS__) return;
    document.__CICD_V16_EVENTS__ = true;

    document.addEventListener("click", function(e){
      const root = e.target.closest(".cicd-v16-drawer");
      if (!root) return;

      const tab = e.target.closest("[data-v16-tab]");
      if (tab) {
        setActiveTab(root, tab.getAttribute("data-v16-tab"));
        if (tab.getAttribute("data-v16-tab") === "preview") refreshSettingsPreview();
      }

      if (e.target.closest("[data-v16-close]")) closeAll();

      if (e.target.closest("#v16-settings-refresh")) {
        e.preventDefault();
        refreshSettingsPreview();
      }

      if (e.target.closest("#v16-settings-save")) {
        e.preventDefault();
        saveSettings().catch(err => console.error("[CICD-V16] settings save failed", err));
      }

      if (e.target.closest("#v16-copy-report")) {
        e.preventDefault();
        const txt = document.querySelector("#v16-report-json")?.textContent || "";
        navigator.clipboard?.writeText(txt);
        console.log("[CICD-V16] report JSON copied");
      }
    }, true);

    document.addEventListener("input", function(e){
      if (e.target && e.target.id && e.target.id.startsWith("v16-")) refreshSettingsPreview();
    }, true);
  }

  function boot(){
    cleanupWrongUi();
    bindEvents();

    const settingsBound = bindMenu("Settings", openSettings);
    const reportsBound = false;

    // In the current sidebar, "Export" is the report-like existing menu.
    const exportBound = bindMenu("Export", openReports);

    window.openCICDSettingsV16 = openSettings;
    window.openCICDReportsV16 = openReports;

    console.log("[CICD-V16] Settings/Reports menu binding installed", {
      settingsBound,
      schedulerBound: reportsBound,
      exportBound
    });
  }

  if (document.__CICD_V16_BOOT__) return;
  document.__CICD_V16_BOOT__ = true;
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();

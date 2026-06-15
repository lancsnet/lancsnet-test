/* CICD_REAL_CONFIG_EDITOR_UI_V52 */

/* CICD_REAL_CONFIG_EDITOR_UI_V52B_STATIC_TOOL_IDS
Real runtime checkbox IDs rendered by the V52 editor:
cicd-v52-tool-sast
cicd-v52-tool-sca
cicd-v52-tool-secrets
cicd-v52-tool-iac
cicd-v52-tool-container
cicd-v52-tool-keep_reports
cicd-v52-tool-keep_screenshots
*/

(function(){
  if (window.__CICD_REAL_CONFIG_EDITOR_UI_V52__) return;
  window.__CICD_REAL_CONFIG_EDITOR_UI_V52__ = true;

  const API_READ = "/api/v1/cicd/config";
  const API_SAVE = "/api/v1/cicd/config/update";
  let currentConfig = null;

  function esc(v){
    return String(v == null ? "" : v)
      .replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function cfgOf(data){
    return data && data.config && typeof data.config === "object" ? data.config : {};
  }

  function rid(){
    const d = new Date();
    const pad = n => String(n).padStart(2,"0");
    return "UIV52_" + d.getFullYear() + pad(d.getMonth()+1) + pad(d.getDate()) + "_" + pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds());
  }

  function ensureEditor(){
    let el = document.querySelector("#cicd-v52-real-config-editor");
    if (el) return el;

    el = document.createElement("section");
    el.id = "cicd-v52-real-config-editor";
    el.className = "cicd-v52-editor";
    el.setAttribute("data-cicd-real-config-editor", "v52");

    const candidates = [
      ...Array.from(document.querySelectorAll("section, div")).filter(x => /Current Config Snapshot|CI\/CD Configuration|Config actions|Gate policy|Tool coverage/i.test(x.textContent || "")),
      document.querySelector("#cicd-v51-config-snapshot"),
      document.querySelector("#cicd-v32-shell"),
      document.querySelector("main"),
      document.body
    ].filter(Boolean);

    const target = candidates[0] || document.body;
    target.parentNode ? target.parentNode.insertBefore(el, target.nextSibling) : document.body.insertBefore(el, document.body.firstChild);
    return el;
  }

  function field(id){
    return document.querySelector("#" + id);
  }

  function boolTool(name){
    const el = field("cicd-v52-tool-" + name);
    return !!(el && el.checked);
  }

  function buildPayload(){
    return {
      source: "CICD_REAL_CONFIG_EDITOR_UI_V52",
      rid: rid(),
      profile: field("cicd-v52-profile").value.trim() || "commercial-ui-v52",
      gate_policy: {
        critical: field("cicd-v52-critical").value,
        high: field("cicd-v52-high").value,
        medium: field("cicd-v52-medium").value
      },
      tools: {
        sast: boolTool("sast"),
        sca: boolTool("sca"),
        secrets: boolTool("secrets"),
        iac: boolTool("iac"),
        container: boolTool("container"),
        v52_marker: true
      },
      thresholds: {
        max_critical: Number(field("cicd-v52-max-critical").value || 0),
        max_high: Number(field("cicd-v52-max-high").value || 0)
      },
      evidence: {
        keep_reports: boolTool("keep_reports"),
        keep_screenshots: boolTool("keep_screenshots")
      }
    };
  }

  function validatePayload(p){
    const errors = [];
    if (!p.profile) errors.push("profile required");
    if (!p.gate_policy.critical) errors.push("critical policy required");
    if (!p.gate_policy.high) errors.push("high policy required");
    if (!p.gate_policy.medium) errors.push("medium policy required");
    if (Number.isNaN(p.thresholds.max_critical) || p.thresholds.max_critical < 0) errors.push("max_critical must be >= 0");
    if (Number.isNaN(p.thresholds.max_high) || p.thresholds.max_high < 0) errors.push("max_high must be >= 0");
    return errors;
  }

  function setStatus(msg, ok=true){
    const el = field("cicd-v52-status");
    if (!el) return;
    el.textContent = msg;
    el.style.color = ok ? "#bbf7d0" : "#fecaca";
  }

  function render(data){
    currentConfig = data || {};
    const cfg = cfgOf(currentConfig);
    const gp = cfg.gate_policy || {};
    const th = cfg.thresholds || {};
    const tools = cfg.tools || {};
    const evidence = cfg.evidence || {};

    const el = ensureEditor();
    el.innerHTML = `
      <div class="cicd-v52-head">
        <div>
          <div class="cicd-v52-title">Real CI/CD Config Editor</div>
          <div class="cicd-v52-sub">This form edits the persisted backend config using <b>POST /api/v1/cicd/config/update</b>.</div>
        </div>
        <span class="cicd-v52-badge">REAL CONFIG EDITOR V52</span>
      </div>

      <div class="cicd-v52-grid">
        <div class="cicd-v52-card">
          <label class="cicd-v52-label">Current RID</label>
          <input class="cicd-v52-input" id="cicd-v52-current-rid" value="${esc(cfg.rid || "")}" readonly>
        </div>

        <div class="cicd-v52-card">
          <label class="cicd-v52-label">Profile</label>
          <input class="cicd-v52-input" id="cicd-v52-profile" value="${esc(cfg.profile || "commercial-ui-v52")}">
        </div>

        <div class="cicd-v52-card wide">
          <label class="cicd-v52-label">Gate Policy</label>
          <div class="cicd-v52-row">
            <select class="cicd-v52-select" id="cicd-v52-critical">
              ${["block-v46","block","review","track","allow"].map(x=>`<option value="${x}" ${String(gp.critical||"block-v46")===x?"selected":""}>Critical: ${x}</option>`).join("")}
            </select>
            <select class="cicd-v52-select" id="cicd-v52-high">
              ${["review-v46","review","block","track","allow"].map(x=>`<option value="${x}" ${String(gp.high||"review-v46")===x?"selected":""}>High: ${x}</option>`).join("")}
            </select>
            <select class="cicd-v52-select" id="cicd-v52-medium">
              ${["track-v46","track","review","block","allow"].map(x=>`<option value="${x}" ${String(gp.medium||"track-v46")===x?"selected":""}>Medium: ${x}</option>`).join("")}
            </select>
          </div>
        </div>

        <div class="cicd-v52-card wide">
          <label class="cicd-v52-label">Thresholds</label>
          <div class="cicd-v52-row">
            <input class="cicd-v52-input" id="cicd-v52-max-critical" type="number" min="0" value="${esc(th.max_critical ?? 0)}" placeholder="max critical">
            <input class="cicd-v52-input" id="cicd-v52-max-high" type="number" min="0" value="${esc(th.max_high ?? 4)}" placeholder="max high">
            <input class="cicd-v52-input" value="${esc(currentConfig.persisted === true ? "persisted=true" : "persisted=false")}" readonly>
          </div>
        </div>

        <div class="cicd-v52-card full">
          <label class="cicd-v52-label">Tools / Evidence</label>
          <div class="cicd-v52-tools">
            ${["sast","sca","secrets","iac","container"].map(k => `
              <label class="cicd-v52-check"><input id="cicd-v52-tool-${k}" type="checkbox" ${tools[k] ? "checked" : ""}> ${k.toUpperCase()}</label>
            `).join("")}
            <label class="cicd-v52-check"><input id="cicd-v52-tool-keep_reports" type="checkbox" ${evidence.keep_reports !== false ? "checked" : ""}> KEEP REPORTS</label>
            <label class="cicd-v52-check"><input id="cicd-v52-tool-keep_screenshots" type="checkbox" ${evidence.keep_screenshots !== false ? "checked" : ""}> KEEP SCREENSHOTS</label>
          </div>
        </div>
      </div>

      <div class="cicd-v52-actions">
        <button class="cicd-v52-btn primary" id="cicd-v52-save" type="button">Save Config to Backend</button>
        <button class="cicd-v52-btn" id="cicd-v52-refresh" type="button">Reload From Backend</button>
        <button class="cicd-v52-btn" id="cicd-v52-validate" type="button">Validate Form</button>
        <button class="cicd-v52-btn warn" id="cicd-v52-export" type="button">Export JSON</button>
        <button class="cicd-v52-btn" id="cicd-v52-toggle-json" type="button">Show Current JSON</button>
      </div>

      <div class="cicd-v52-status" id="cicd-v52-status">Loaded current config from backend.</div>
      <pre class="cicd-v52-json" id="cicd-v52-json">${esc(JSON.stringify(currentConfig, null, 2))}</pre>
    `;

    bindActions();
  }

  function bindActions(){
    field("cicd-v52-refresh")?.addEventListener("click", loadConfig);
    field("cicd-v52-validate")?.addEventListener("click", () => {
      const p = buildPayload();
      const errors = validatePayload(p);
      setStatus(errors.length ? "Validation failed: " + errors.join(", ") : "Validation OK. Ready to save.", errors.length === 0);
    });

    field("cicd-v52-save")?.addEventListener("click", async () => {
      const payload = buildPayload();
      const errors = validatePayload(payload);
      if (errors.length) {
        setStatus("Validation failed: " + errors.join(", "), false);
        return;
      }

      setStatus("Saving config to backend...");
      try {
        const res = await fetch(API_SAVE, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Accept": "application/json" },
          body: JSON.stringify(payload)
        });
        const body = await res.json().catch(()=>({}));
        if (!res.ok || body.ok === false) {
          setStatus("Save failed: " + JSON.stringify(body), false);
          return;
        }
        setStatus("Saved. Reloading persisted config...");
        await loadConfig();
        setStatus("Saved and reloaded from backend. RID should now start with UIV52_.");
      } catch(e) {
        setStatus("Save error: " + (e && e.message ? e.message : e), false);
      }
    });

    field("cicd-v52-export")?.addEventListener("click", () => {
      const payload = buildPayload();
      const text = JSON.stringify(payload, null, 2);
      const blob = new Blob([text], {type:"application/json"});
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "cicd-config-v52-" + Date.now() + ".json";
      a.click();
      URL.revokeObjectURL(a.href);
      setStatus("Exported form config JSON.");
    });

    field("cicd-v52-toggle-json")?.addEventListener("click", () => {
      const pre = field("cicd-v52-json");
      pre.classList.toggle("show");
      field("cicd-v52-toggle-json").textContent = pre.classList.contains("show") ? "Hide Current JSON" : "Show Current JSON";
    });
  }

  async function loadConfig(){
    const el = ensureEditor();
    el.innerHTML = `<div class="cicd-v52-title">Real CI/CD Config Editor</div><div class="cicd-v52-sub">Loading from ${API_READ}...</div>`;
    try {
      const res = await fetch(API_READ + "?v=v52_" + Date.now(), { headers: { "Accept": "application/json" }, cache: "no-store" });
      const data = await res.json();
      render(data);
    } catch(e) {
      el.innerHTML = `<div class="cicd-v52-title">Real CI/CD Config Editor</div><div class="cicd-v52-sub">Load failed: ${esc(e && e.message ? e.message : e)}</div>`;
    }
  }

  function bindConfigTab(){
    document.addEventListener("click", function(ev){
      const t = ev.target && (ev.target.textContent || "").trim();
      if (/^Config$/i.test(t)) setTimeout(loadConfig, 250);
    }, true);
  }

  function boot(){
    bindConfigTab();
    loadConfig();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();

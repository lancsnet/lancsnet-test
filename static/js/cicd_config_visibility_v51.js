/* CICD_CONFIG_VISIBILITY_UI_V51 */
(function(){
  if (window.__CICD_CONFIG_VISIBILITY_UI_V51__) return;
  window.__CICD_CONFIG_VISIBILITY_UI_V51__ = true;

  const MARK = "CICD_CONFIG_VISIBILITY_UI_V51";
  const API = "/api/v1/cicd/config";

  function esc(v){
    return String(v == null ? "" : v)
      .replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function pretty(v){
    try { return JSON.stringify(v, null, 2); } catch(e) { return String(v || ""); }
  }

  function getConfigPayload(data){
    if (!data || typeof data !== "object") return {};
    return data.config && typeof data.config === "object" ? data.config : data;
  }

  function toolBadges(tools){
    if (!tools || typeof tools !== "object") return '<span class="cicd-v51-tool">No tool map</span>';
    return Object.entries(tools).map(([k,v]) =>
      `<span class="cicd-v51-tool">${esc(k)}: ${v ? "ON" : "OFF"}</span>`
    ).join("");
  }

  function render(data, err){
    const card = ensureCard();
    const cfg = getConfigPayload(data);
    const gp = cfg.gate_policy || {};
    const th = cfg.thresholds || {};
    const tools = cfg.tools || {};
    const persisted = data && data.persisted === true;
    const ok = data && data.ok !== false && !err;

    card.innerHTML = `
      <div class="cicd-v51-config-head">
        <div>
          <div class="cicd-v51-title">Current Config Snapshot</div>
          <div class="cicd-v51-sub">Loaded from <b>GET /api/v1/cicd/config</b>. This panel makes the persisted CI/CD config visible in UI.</div>
        </div>
        <div class="cicd-v51-badges">
          <span class="cicd-v51-badge ${ok ? "ok" : "warn"}">${ok ? "CONFIG API OK" : "CONFIG API ERROR"}</span>
          <span class="cicd-v51-badge ${persisted ? "ok" : "warn"}">${persisted ? "CONFIG PERSISTED" : "CONFIG DEFAULT"}</span>
          <span class="cicd-v51-badge ok">V51</span>
        </div>
      </div>

      <div class="cicd-v51-grid">
        <div class="cicd-v51-box">
          <div class="cicd-v51-label">RID</div>
          <div class="cicd-v51-value">${esc(cfg.rid || "N/A")}</div>
          <div class="cicd-v51-small">source: ${esc(cfg.source || "N/A")}</div>
        </div>
        <div class="cicd-v51-box">
          <div class="cicd-v51-label">Profile</div>
          <div class="cicd-v51-value">${esc(cfg.profile || "N/A")}</div>
          <div class="cicd-v51-small">persisted: ${persisted ? "true" : "false"}</div>
        </div>
        <div class="cicd-v51-box">
          <div class="cicd-v51-label">Gate Policy</div>
          <div class="cicd-v51-value">Critical: ${esc(gp.critical || "N/A")}</div>
          <div class="cicd-v51-small">High: ${esc(gp.high || "N/A")} · Medium: ${esc(gp.medium || "N/A")}</div>
        </div>
        <div class="cicd-v51-box">
          <div class="cicd-v51-label">Thresholds</div>
          <div class="cicd-v51-value">Critical ≤ ${esc(th.max_critical ?? "N/A")}</div>
          <div class="cicd-v51-small">High ≤ ${esc(th.max_high ?? "N/A")}</div>
        </div>
      </div>

      <div class="cicd-v51-box" style="margin-top:10px">
        <div class="cicd-v51-label">Enabled Tools</div>
        <div class="cicd-v51-tools">${toolBadges(tools)}</div>
      </div>

      <div class="cicd-v51-actions">
        <button class="cicd-v51-btn" id="cicd-v51-refresh-config" type="button">Refresh Config</button>
        <button class="cicd-v51-btn" id="cicd-v51-toggle-json" type="button">Show JSON</button>
        <button class="cicd-v51-btn" id="cicd-v51-copy-json" type="button">Copy JSON</button>
      </div>
      <pre class="cicd-v51-pre" id="cicd-v51-json">${esc(err ? String(err) : pretty(data))}</pre>
    `;

    const refresh = card.querySelector("#cicd-v51-refresh-config");
    const toggle = card.querySelector("#cicd-v51-toggle-json");
    const copy = card.querySelector("#cicd-v51-copy-json");
    const pre = card.querySelector("#cicd-v51-json");

    refresh && refresh.addEventListener("click", loadConfig);
    toggle && toggle.addEventListener("click", () => {
      pre.classList.toggle("show");
      toggle.textContent = pre.classList.contains("show") ? "Hide JSON" : "Show JSON";
    });
    copy && copy.addEventListener("click", () => {
      const text = pre.textContent || "";
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(()=>{}).catch(()=>{});
      }
      copy.textContent = "Copied / Ready";
      setTimeout(()=>copy.textContent="Copy JSON", 1200);
    });
  }

  function ensureCard(){
    let card = document.querySelector("#cicd-v51-config-snapshot");
    if (card) return card;

    card = document.createElement("section");
    card.id = "cicd-v51-config-snapshot";
    card.className = "cicd-v51-config-card";
    card.setAttribute("data-cicd-config-visibility", "v51");

    const candidates = [
      ...Array.from(document.querySelectorAll("section, div, main")).filter(x => /CI\/CD Configuration|Config actions|Gate policy|Tool coverage/i.test(x.textContent || "")),
      document.querySelector("#cicd-v32-shell"),
      document.querySelector("main"),
      document.body
    ].filter(Boolean);

    const target = candidates[0] || document.body;
    if (target === document.body) {
      document.body.insertBefore(card, document.body.firstChild);
    } else {
      target.insertBefore(card, target.firstChild);
    }
    return card;
  }

  async function loadConfig(){
    const card = ensureCard();
    card.innerHTML = `<div class="cicd-v51-title">Current Config Snapshot</div><div class="cicd-v51-sub">Loading config from ${API}...</div>`;
    try {
      const res = await fetch(API + "?v=v51_" + Date.now(), { headers: { "Accept": "application/json" }, cache: "no-store" });
      const data = await res.json();
      render(data, null);
    } catch(e) {
      render({ok:false, persisted:false, config:{}}, e && e.message ? e.message : e);
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

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  setTimeout(loadConfig, 1200);
})();

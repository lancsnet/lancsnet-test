/* CICD_FINAL_GATE_REAL_DRAWER_V5 */
(function () {
  if (window.__CICD_FINAL_GATE_REAL_DRAWER_V5__) return;
  window.__CICD_FINAL_GATE_REAL_DRAWER_V5__ = true;

  const API = {
    status: "/api/v1/cicd/status",
    config: "/api/v1/cicd/config"
  };

  function qs(sel, root) {
    return (root || document).querySelector(sel);
  }

  function qsa(sel, root) {
    return Array.from((root || document).querySelectorAll(sel));
  }

  function getCookie(name) {
    const parts = document.cookie.split(";").map(x => x.trim());
    for (const p of parts) {
      if (p.startsWith(name + "=")) return decodeURIComponent(p.slice(name.length + 1));
    }
    return "";
  }

  function headers() {
    const token = getCookie("vsp_csrf");
    const h = { "Accept": "application/json" };
    if (token) {
      h["X-CSRF-Token"] = token;
      h["X-CSRFToken"] = token;
      h["X-VSP-CSRF"] = token;
    }
    return h;
  }

  async function getJSON(url) {
    const res = await fetch(url, {
      method: "GET",
      headers: headers(),
      credentials: "same-origin"
    });

    const text = await res.text();
    let data;
    try { data = text ? JSON.parse(text) : {}; }
    catch (_) { data = { raw: text }; }

    if (!res.ok) {
      throw Object.assign(new Error("HTTP " + res.status), { status: res.status, data });
    }

    return data;
  }

  function closeAll() {
    qsa(".vsp-modal-backdrop.open,.vsp-drawer.open").forEach(el => el.classList.remove("open"));
  }

  function toast(msg, kind) {
    let t = qs("#vsp-action-toast");
    if (!t) {
      t = document.createElement("div");
      t.id = "vsp-action-toast";
      t.className = "vsp-toast";
      document.body.appendChild(t);
    }

    t.textContent = msg;
    t.style.borderColor = kind === "error" ? "rgba(255,99,99,.45)" : "rgba(111,231,118,.32)";
    t.style.color = kind === "error" ? "#ffd1d1" : "#dfffe2";
    t.classList.add("show");
    setTimeout(() => t.classList.remove("show"), 3200);
  }

  function boolChip(v) {
    return `<span class="vsp-gate-real-chip ${v ? "" : "off"}">${v ? "ON" : "OFF"}</span>`;
  }

  function safe(v, fallback) {
    return v === undefined || v === null || v === "" ? fallback : v;
  }

  function normalizeGate(status, cfg) {
    const config = cfg && cfg.config ? cfg.config : cfg || {};
    const tools = config.tools || {};
    const thresholds = config.thresholds || {};
    const gatePolicy = config.gate_policy || {};

    const blocked = Number(status && status.blocked_prs || 0);
    const failToday = Number(status && status.gate_fail_today || 0);
    const latest = String(status && status.latest_status || "unknown").toLowerCase();

    const pass = blocked === 0 && failToday === 0 && latest !== "fail" && latest !== "failed";

    return {
      decision: pass ? "PASS" : "REVIEW",
      decisionClass: pass ? "vsp-gate-real-pass" : "vsp-gate-real-fail",
      reason: pass
        ? "No blocked PR/MR and no failed gate today."
        : "Blocked or failed gate signals require review.",
      status,
      config,
      tools,
      thresholds,
      gatePolicy,
      generated_at: new Date().toISOString()
    };
  }

  function ensureDrawer() {
    let drawer = qs("#vsp-final-gate-drawer");

    if (!drawer) {
      drawer = document.createElement("aside");
      drawer.id = "vsp-final-gate-drawer";
      drawer.className = "vsp-drawer";
      document.body.appendChild(drawer);
    }

    return drawer;
  }

  function renderDrawer(model) {
    const drawer = ensureDrawer();

    const tools = model.tools || {};
    const thresholds = model.thresholds || {};
    const policy = model.gatePolicy || {};
    const status = model.status || {};
    const config = model.config || {};

    drawer.innerHTML = `
      <div class="vsp-drawer-head">
        <div>
          <div class="vsp-modal-title">Final Gate Review</div>
          <div class="vsp-modal-sub">Real data from /api/v1/cicd/status and /api/v1/cicd/config</div>
        </div>
        <button class="vsp-modal-close" data-vsp-close-gate-v5="1">×</button>
      </div>

      <div class="vsp-drawer-body">
        <div class="vsp-gate-real-grid">
          <div class="vsp-gate-real-box">
            <div class="vsp-gate-real-title">Decision</div>
            <div class="vsp-gate-real-value ${model.decisionClass}">${model.decision}</div>
          </div>
          <div class="vsp-gate-real-box">
            <div class="vsp-gate-real-title">Latest status</div>
            <div class="vsp-gate-real-value">${safe(status.latest_status, "unknown")}</div>
          </div>
          <div class="vsp-gate-real-box">
            <div class="vsp-gate-real-title">Blocked PR/MR</div>
            <div class="vsp-gate-real-value">${safe(status.blocked_prs, 0)}</div>
          </div>
          <div class="vsp-gate-real-box">
            <div class="vsp-gate-real-title">Runs today</div>
            <div class="vsp-gate-real-value">${safe(status.total_runs_today, 0)}</div>
          </div>
        </div>

        <div class="vsp-gate-real-box">
          <div class="vsp-gate-real-title">Gate reason</div>
          <div class="vsp-gate-real-row">
            <span class="vsp-gate-real-key">Result</span>
            <span class="vsp-gate-real-val">${model.reason}</span>
          </div>
          <div class="vsp-gate-real-row">
            <span class="vsp-gate-real-key">Source table</span>
            <span class="vsp-gate-real-val">${safe(status.table, "n/a")}</span>
          </div>
          <div class="vsp-gate-real-row">
            <span class="vsp-gate-real-key">Generated at</span>
            <span class="vsp-gate-real-val">${safe(status.generated_at, "n/a")}</span>
          </div>
        </div>

        <div class="vsp-gate-real-box">
          <div class="vsp-gate-real-title">Policy / Thresholds</div>
          <div class="vsp-gate-real-row">
            <span class="vsp-gate-real-key">Critical</span>
            <span class="vsp-gate-real-val">${safe(policy.critical, "block")} / max ${safe(thresholds.max_critical, 0)}</span>
          </div>
          <div class="vsp-gate-real-row">
            <span class="vsp-gate-real-key">High</span>
            <span class="vsp-gate-real-val">${safe(policy.high, "review")} / max ${safe(thresholds.max_high, 4)}</span>
          </div>
          <div class="vsp-gate-real-row">
            <span class="vsp-gate-real-key">Medium</span>
            <span class="vsp-gate-real-val">${safe(policy.medium, "track")}</span>
          </div>
          <div class="vsp-gate-real-row">
            <span class="vsp-gate-real-key">Profile</span>
            <span class="vsp-gate-real-val">${safe(config.profile, "n/a")}</span>
          </div>
          <div class="vsp-gate-real-row">
            <span class="vsp-gate-real-key">RID</span>
            <span class="vsp-gate-real-val">${safe(config.rid, "n/a")}</span>
          </div>
        </div>

        <div class="vsp-gate-real-box">
          <div class="vsp-gate-real-title">Tool coverage</div>
          <div class="vsp-gate-real-row"><span class="vsp-gate-real-key">SAST</span><span>${boolChip(!!tools.sast)}</span></div>
          <div class="vsp-gate-real-row"><span class="vsp-gate-real-key">SCA</span><span>${boolChip(!!tools.sca)}</span></div>
          <div class="vsp-gate-real-row"><span class="vsp-gate-real-key">Secrets</span><span>${boolChip(!!tools.secrets)}</span></div>
          <div class="vsp-gate-real-row"><span class="vsp-gate-real-key">IaC</span><span>${boolChip(!!tools.iac)}</span></div>
          <div class="vsp-gate-real-row"><span class="vsp-gate-real-key">Container</span><span>${boolChip(!!tools.container)}</span></div>
        </div>

        <div class="vsp-gate-real-box">
          <div class="vsp-gate-real-title">Raw evidence preview</div>
          <div class="vsp-gate-real-pre">${JSON.stringify({ status, config }, null, 2)}</div>
        </div>

        <div class="vsp-modal-actions">
          <button class="vsp-btn-secondary" data-vsp-close-gate-v5="1">Close</button>
          <button class="vsp-btn-primary" id="vsp-export-gate-v5">Export evidence JSON</button>
        </div>
      </div>
    `;

    drawer.classList.add("open");
  }

  async function openRealGate() {
    try {
      const [status, config] = await Promise.all([
        getJSON(API.status),
        getJSON(API.config)
      ]);

      const model = normalizeGate(status, config);
      window.__CICD_FINAL_GATE_V5__ = model;

      closeAll();
      renderDrawer(model);

      console.log("[CICD-FINAL-GATE-V5] loaded", model);
    } catch (e) {
      console.error("[CICD-FINAL-GATE-V5] load failed", e);
      toast("Final Gate load failed: HTTP " + (e.status || "ERR"), "error");
    }
  }

  function exportEvidence() {
    const model = window.__CICD_FINAL_GATE_V5__;
    if (!model) {
      toast("No gate evidence loaded yet", "error");
      return;
    }

    const blob = new Blob([JSON.stringify(model, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const rid = model.config && model.config.rid ? model.config.rid : "gate";
    const a = document.createElement("a");
    a.href = url;
    a.download = `cicd_final_gate_${rid}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    toast("Gate evidence JSON exported", "ok");
  }

  function findFinalGateButton() {
    return qsa("button,a,[role='button']").find(el => {
      const t = (el.innerText || el.textContent || "").toLowerCase();
      return t.includes("final") && t.includes("gate");
    });
  }

  function bind() {
    const gateBtn = findFinalGateButton();
    if (gateBtn && !gateBtn.dataset.vspFinalGateV5) {
      gateBtn.dataset.vspFinalGateV5 = "1";
      gateBtn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopImmediatePropagation();
        openRealGate();
      }, true);
    }
  }

  function boot() {
    bind();

    document.addEventListener("click", function (e) {
      if (e.target.closest("[data-vsp-close-gate-v5]")) {
        const d = qs("#vsp-final-gate-drawer");
        if (d) d.classList.remove("open");
      }

      if (e.target.closest("#vsp-export-gate-v5")) {
        exportEvidence();
      }
    }, true);

    const mo = new MutationObserver(bind);
    mo.observe(document.body, { childList: true, subtree: true });

    console.log("[CICD-FINAL-GATE-REAL-V5] installed", API);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();

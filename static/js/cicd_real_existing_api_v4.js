/* CICD_BIND_REAL_EXISTING_API_V4
   Uses only existing routes:
   - GET  /api/v1/cicd/status
   - GET  /api/v1/cicd/config
   - POST /api/v1/cicd/config/update
*/
(function () {
  if (window.__CICD_REAL_EXISTING_API_V4__) return;
  window.__CICD_REAL_EXISTING_API_V4__ = true;

  const API = {
    status: "/api/v1/cicd/status",
    config: "/api/v1/cicd/config",
    updateConfig: "/api/v1/cicd/config/update"
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

  function headers(json) {
    const token = getCookie("vsp_csrf");
    const h = { "Accept": "application/json" };
    if (json) h["Content-Type"] = "application/json";
    if (token) {
      h["X-CSRF-Token"] = token;
      h["X-CSRFToken"] = token;
      h["X-VSP-CSRF"] = token;
    }
    return h;
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
    t.style.borderColor =
      kind === "error" ? "rgba(255,99,99,.45)" :
      kind === "warn" ? "rgba(255,190,90,.45)" :
      "rgba(111,231,118,.32)";
    t.style.color =
      kind === "error" ? "#ffd1d1" :
      kind === "warn" ? "#ffe2aa" :
      "#dfffe2";

    t.classList.add("show");
    setTimeout(() => t.classList.remove("show"), 3400);
  }

  function closeAll() {
    qsa(".vsp-modal-backdrop.open,.vsp-drawer.open").forEach(el => el.classList.remove("open"));
  }

  function getVal(id, fallback) {
    const el = qs("#" + id);
    return el && typeof el.value === "string" && el.value.trim() ? el.value.trim() : fallback;
  }

  async function getJSON(url) {
    const res = await fetch(url, {
      method: "GET",
      headers: headers(false),
      credentials: "same-origin"
    });
    const text = await res.text();
    let data;
    try { data = text ? JSON.parse(text) : {}; } catch (_) { data = { raw: text }; }
    if (!res.ok) throw Object.assign(new Error("HTTP " + res.status), { status: res.status, data });
    return data;
  }

  async function postJSON(url, payload) {
    const res = await fetch(url, {
      method: "POST",
      headers: headers(true),
      credentials: "same-origin",
      body: JSON.stringify(payload)
    });
    const text = await res.text();
    let data;
    try { data = text ? JSON.parse(text) : {}; } catch (_) { data = { raw: text }; }
    if (!res.ok) throw Object.assign(new Error("HTTP " + res.status), { status: res.status, data });
    return data;
  }

  function buildRunConfig() {
    const rid = "CICD_UI_" + new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
    const toolsText = getVal("vsp-run-tools", "SAST, SCA, Secrets, IaC, Container, V25B");

    return {
      source: "CICD_REAL_EXISTING_API_V4_UI",
      rid,
      profile: getVal("vsp-run-profile", "commercial-full-gate"),
      repo_url: getVal("vsp-run-repo", "https://git.company.local/vsp/security-platform.git"),
      branch: getVal("vsp-run-branch", "main"),
      gate_policy: {
        mode: getVal("vsp-run-policy", "block-critical-high"),
        critical: "block",
        high: "review",
        medium: "track"
      },
      tools: {
        sast: toolsText.toLowerCase().includes("sast"),
        sca: toolsText.toLowerCase().includes("sca"),
        secrets: toolsText.toLowerCase().includes("secret"),
        iac: toolsText.toLowerCase().includes("iac"),
        container: toolsText.toLowerCase().includes("container"),
        v25b: toolsText.toLowerCase().includes("v25b")
      },
      thresholds: {
        max_critical: 0,
        max_high: 4
      },
      evidence: {
        keep_reports: true,
        keep_screenshots: true,
        keep_logs: true
      },
      note: getVal("vsp-run-note", "Run from CI/CD Enterprise Control Center."),
      ui_queued: true,
      created_at: new Date().toISOString()
    };
  }

  function injectQueuedRow(config) {
    const tables = qsa("table");
    let table = tables.find(t => /task|action|owner|status/i.test(t.innerText || ""));
    if (!table) return;

    const tbody = qs("tbody", table) || table;
    const tr = document.createElement("tr");
    tr.setAttribute("data-ui-queued-rid", config.rid);
    tr.innerHTML = `
      <td>
        <div style="font-weight:800;color:#dbe7f5">${config.rid}</div>
        <div style="font-size:11px;color:#8795ab">${config.profile} · ${config.branch}</div>
      </td>
      <td>UI queued scan</td>
      <td>DevSecOps</td>
      <td><span class="badge ready" data-status="READY">QUEUED</span></td>
    `;
    tbody.prepend(tr);
  }

  async function refreshStatusCards() {
    try {
      const status = await getJSON(API.status);
      window.__CICD_V4_STATUS__ = status;

      const text = JSON.stringify(status);
      console.log("[CICD-V4] status", status);

      qsa("*").forEach(el => {
        const label = (el.textContent || "").trim().toLowerCase();
        if (label === "blocked pr/mr") {
          const box = el.closest(".card,.metric-card,.kpi-card,.panel,.box") || el.parentElement;
          if (box) {
            const num = box.querySelector(".num, .value, h2, h3, strong");
            if (num && typeof status.blocked_prs !== "undefined") num.textContent = status.blocked_prs;
          }
        }
      });

      return status;
    } catch (e) {
      console.warn("[CICD-V4] status refresh failed", e);
      return null;
    }
  }

  async function loadConfig() {
    try {
      const cfg = await getJSON(API.config);
      window.__CICD_V4_CONFIG__ = cfg;
      console.log("[CICD-V4] config", cfg);
      return cfg;
    } catch (e) {
      console.warn("[CICD-V4] config load failed", e);
      return null;
    }
  }

  async function submitRun(e) {
    const btn = e.target && e.target.closest ? e.target.closest("#vsp-submit-run") : null;
    if (!btn) return;

    e.preventDefault();
    e.stopImmediatePropagation();

    const oldText = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Saving...";

    const payload = buildRunConfig();
    window.__CICD_V4_LAST_PAYLOAD__ = payload;

    try {
      const res = await postJSON(API.updateConfig, payload);
      window.__CICD_V4_LAST_RESPONSE__ = res;

      closeAll();
      injectQueuedRow(payload);
      await refreshStatusCards();

      toast("Run request saved: " + payload.rid, "ok");
      console.log("[CICD-V4] run request saved via config/update", { payload, res });
    } catch (err) {
      console.error("[CICD-V4] config/update failed", err);

      injectQueuedRow(payload);
      closeAll();

      if (err.status === 404) {
        toast("UI queued locally; config/update route not found", "warn");
      } else if (err.status === 403) {
        toast("UI queued locally; config/update CSRF rejected", "warn");
      } else {
        toast("UI queued locally; backend update failed", "warn");
      }
    } finally {
      btn.disabled = false;
      btn.textContent = oldText || "Create scan job";
    }
  }

  function boot() {
    document.addEventListener("click", submitRun, true);
    loadConfig();
    refreshStatusCards();

    console.log("[CICD-REAL-EXISTING-API-V4] installed", API);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();

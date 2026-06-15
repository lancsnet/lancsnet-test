/* CICD_BIND_RUN_MODAL_TO_REAL_API_V2 */
(function () {
  if (window.__CICD_BIND_RUN_MODAL_TO_REAL_API_V2__) return;
  window.__CICD_BIND_RUN_MODAL_TO_REAL_API_V2__ = true;

  const API_CREATE = "/api/v1/cicd/task/create";
  const API_QUEUE = "/api/v1/cicd/queue";

  function qs(sel, root) {
    return (root || document).querySelector(sel);
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

  function closeAll() {
    document.querySelectorAll(".vsp-modal-backdrop.open,.vsp-drawer.open").forEach(el => {
      el.classList.remove("open");
    });
  }

  function getVal(id, fallback) {
    const el = qs("#" + id);
    return el && typeof el.value === "string" && el.value.trim()
      ? el.value.trim()
      : fallback;
  }

  function buildPayload() {
    const toolsText = getVal("vsp-run-tools", "SAST, SCA, Secrets, IaC, Container, V25B");
    const tools = toolsText
      .split(",")
      .map(x => x.trim())
      .filter(Boolean);

    const rid = "CICD_UI_" + new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);

    return {
      rid,
      source: "cicd-ui-modal-v2",
      repo_url: getVal("vsp-run-repo", "https://git.company.local/vsp/security-platform.git"),
      branch: getVal("vsp-run-branch", "main"),
      profile: getVal("vsp-run-profile", "commercial-full-gate"),
      gate_policy: getVal("vsp-run-policy", "block-critical-high"),
      tools,
      note: getVal("vsp-run-note", "Run from CI/CD Enterprise Control Center."),
      created_at: new Date().toISOString()
    };
  }

  async function postJSON(url, payload) {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      credentials: "same-origin",
      body: JSON.stringify(payload)
    });

    const text = await res.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : {};
    } catch (_) {
      data = { raw: text };
    }

    if (!res.ok) {
      const err = new Error("HTTP " + res.status);
      err.status = res.status;
      err.data = data;
      throw err;
    }

    return data;
  }

  async function refreshQueue() {
    try {
      const res = await fetch(API_QUEUE, {
        method: "GET",
        headers: { "Accept": "application/json" },
        credentials: "same-origin"
      });

      if (!res.ok) return null;

      const data = await res.json().catch(() => null);
      window.__CICD_LAST_QUEUE__ = data;

      const evt = new CustomEvent("vsp:cicd:queue-refreshed", { detail: data });
      window.dispatchEvent(evt);

      return data;
    } catch (_) {
      return null;
    }
  }

  async function submitRealRun(e) {
    const btn = e.target && e.target.closest ? e.target.closest("#vsp-submit-run") : null;
    if (!btn) return;

    e.preventDefault();
    e.stopPropagation();

    const oldText = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Creating...";

    const payload = buildPayload();
    window.__CICD_LAST_CREATE_PAYLOAD__ = payload;

    try {
      const data = await postJSON(API_CREATE, payload);
      window.__CICD_LAST_CREATE_RESPONSE__ = data;

      closeAll();
      toast("Real scan job created: " + (data.rid || data.task_id || payload.rid), "ok");

      await refreshQueue();

      console.log("[CICD-API-BIND-V2] created", { payload, data });
    } catch (err) {
      console.error("[CICD-API-BIND-V2] create failed", err);

      const msg = err && err.status
        ? "Create scan failed: HTTP " + err.status
        : "Create scan failed";

      toast(msg + " — check API /api/v1/cicd/task/create", "error");
    } finally {
      btn.disabled = false;
      btn.textContent = oldText || "Create scan job";
    }
  }

  function boot() {
    document.addEventListener("click", submitRealRun, true);
    console.log("[CICD-API-BIND-V2] installed", { create: API_CREATE, queue: API_QUEUE });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();

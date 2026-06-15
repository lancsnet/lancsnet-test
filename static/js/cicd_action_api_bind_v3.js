/* CICD_ACTION_API_BIND_V3: CSRF + route fallback */
(function () {
  if (window.__CICD_ACTION_API_BIND_V3__) return;
  window.__CICD_ACTION_API_BIND_V3__ = true;

  const CREATE_URL = "/api/v1/cicd/task/create";
  const QUEUE_CANDIDATES = [
    "/api/v1/cicd/queue",
    "/api/v1/cicd/tasks",
    "/api/v1/cicd/task/list",
    "/api/v1/cicd/runs",
    "/api/v1/cicd/status",
    "/api/v1/cicd/config"
  ];

  function qs(sel, root) {
    return (root || document).querySelector(sel);
  }

  function getCookie(name) {
    const parts = document.cookie.split(";").map(x => x.trim());
    for (const p of parts) {
      if (p.startsWith(name + "=")) return decodeURIComponent(p.slice(name.length + 1));
    }
    return "";
  }

  function csrfHeaders() {
    const token = getCookie("vsp_csrf");
    const h = {
      "Content-Type": "application/json",
      "Accept": "application/json"
    };
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
    t.style.borderColor = kind === "error"
      ? "rgba(255,99,99,.45)"
      : kind === "warn"
        ? "rgba(255,190,90,.45)"
        : "rgba(111,231,118,.32)";
    t.style.color = kind === "error"
      ? "#ffd1d1"
      : kind === "warn"
        ? "#ffe2aa"
        : "#dfffe2";

    t.classList.add("show");
    setTimeout(() => t.classList.remove("show"), 3600);
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
    const tools = toolsText.split(",").map(x => x.trim()).filter(Boolean);

    const rid = "CICD_UI_" + new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);

    return {
      rid,
      source: "cicd-ui-modal-v3",
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
      headers: csrfHeaders(),
      credentials: "same-origin",
      body: JSON.stringify(payload)
    });

    const text = await res.text();
    let data;
    try { data = text ? JSON.parse(text) : {}; }
    catch (_) { data = { raw: text }; }

    if (!res.ok) {
      const err = new Error("HTTP " + res.status);
      err.status = res.status;
      err.data = data;
      throw err;
    }

    return data;
  }

  async function getFirstWorkingQueue() {
    for (const url of QUEUE_CANDIDATES) {
      try {
        const res = await fetch(url, {
          method: "GET",
          headers: {
            "Accept": "application/json",
            ...csrfHeaders()
          },
          credentials: "same-origin"
        });

        const text = await res.text();
        let data;
        try { data = text ? JSON.parse(text) : {}; }
        catch (_) { data = { raw: text }; }

        console.log("[CICD-API-BIND-V3] probe", url, res.status, data);

        if (res.ok) {
          window.__CICD_QUEUE_URL__ = url;
          window.__CICD_LAST_QUEUE__ = data;
          window.dispatchEvent(new CustomEvent("vsp:cicd:queue-refreshed", { detail: data }));
          return { url, data };
        }
      } catch (e) {
        console.warn("[CICD-API-BIND-V3] queue probe failed", url, e);
      }
    }

    return null;
  }

  async function submitRealRun(e) {
    const btn = e.target && e.target.closest ? e.target.closest("#vsp-submit-run") : null;
    if (!btn) return;

    e.preventDefault();
    e.stopImmediatePropagation();

    const oldText = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Creating...";

    const payload = buildPayload();
    window.__CICD_LAST_CREATE_PAYLOAD__ = payload;

    try {
      const data = await postJSON(CREATE_URL, payload);
      window.__CICD_LAST_CREATE_RESPONSE__ = data;

      closeAll();
      toast("Real scan job created: " + (data.rid || data.task_id || payload.rid), "ok");

      const q = await getFirstWorkingQueue();
      if (!q) {
        toast("Created, but queue API route is not exposed yet", "warn");
      }

      console.log("[CICD-API-BIND-V3] created", { payload, data });
    } catch (err) {
      console.error("[CICD-API-BIND-V3] create failed", err);

      if (err.status === 403) {
        toast("Create failed: CSRF rejected. Need backend CSRF header name check.", "error");
      } else if (err.status === 404) {
        toast("Create failed: API route not found.", "error");
      } else {
        toast("Create failed: HTTP " + (err.status || "ERR"), "error");
      }
    } finally {
      btn.disabled = false;
      btn.textContent = oldText || "Create scan job";
    }
  }

  function boot() {
    document.addEventListener("click", submitRealRun, true);
    getFirstWorkingQueue();
    console.log("[CICD-API-BIND-V3] installed", {
      create: CREATE_URL,
      queue_candidates: QUEUE_CANDIDATES,
      csrf_cookie: !!getCookie("vsp_csrf")
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();

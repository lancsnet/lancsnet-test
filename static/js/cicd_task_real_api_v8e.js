/* CICD_TASK_REAL_API_V8E */
(function () {
  if (window.__CICD_TASK_REAL_API_V8E__) return;
  window.__CICD_TASK_REAL_API_V8E__ = true;

  const API = {
    create: "/api/v1/cicd/task/create",
    queue: "/api/v1/cicd/queue",
    status: "/api/v1/cicd/status"
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
    // [VSP-TOKEN-FIX-V1] inject Bearer token lazily at call time
    const bearer = (window.parent && window.parent.TOKEN)
      || window.TOKEN
      || localStorage.getItem('vsp_token')
      || localStorage.getItem('token')
      || '';
    if (bearer) h["Authorization"] = "Bearer " + bearer;
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
    setTimeout(() => t.classList.remove("show"), 3600);
  }

  function closeAll() {
    qsa(".vsp-modal-backdrop.open,.vsp-drawer.open").forEach(el => el.classList.remove("open"));
  }

  function val(id, fallback) {
    const el = qs("#" + id);
    return el && typeof el.value === "string" && el.value.trim() ? el.value.trim() : fallback;
  }

  function buildTaskPayload() {
    const rid = "CICD_TASK_UI_" + new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
    const toolsText = val("vsp-run-tools", "SAST, SCA, Secrets, IaC, Container");

    return {
      rid,
      source: "CICD_TASK_REAL_API_V8E_UI",
      repo_url: val("vsp-run-repo", "https://git.company.local/vsp/security-platform.git"),
      branch: val("vsp-run-branch", "main"),
      profile: val("vsp-run-profile", "commercial-full-gate"),
      gate_policy: val("vsp-run-policy", "block-critical-high"),
      tools: toolsText.split(",").map(x => x.trim()).filter(Boolean),
      note: val("vsp-run-note", "Run from CI/CD Enterprise Control Center."),
      status: "QUEUED",
      owner: "DevSecOps",
      created_at: new Date().toISOString()
    };
  }

  async function getJSON(url) {
    let res = await fetch(url, {
      method: "GET",
      headers: headers(false),
      credentials: "same-origin"
    });
    // [VSP-TOKEN-FIX-V1] retry once after 800ms if 401
    if (res.status === 401) {
      await new Promise(function(r){ setTimeout(r, 800); });
      res = await fetch(url, { method: "GET", headers: headers(false), credentials: "same-origin" });
    }

    const text = await res.text();
    let data;
    try { data = text ? JSON.parse(text) : {}; }
    catch (_) { data = { raw: text }; }

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
    try { data = text ? JSON.parse(text) : {}; }
    catch (_) { data = { raw: text }; }

    if (!res.ok) throw Object.assign(new Error("HTTP " + res.status), { status: res.status, data });
    return data;
  }

  function renderQueueBadge(queue) {
    let host = qs("#cicd-v8e-queue-status");
    if (!host) {
      host = document.createElement("div");
      host.id = "cicd-v8e-queue-status";
      host.style.cssText = "position:fixed;right:20px;top:72px;z-index:99960;border:1px solid rgba(126,234,134,.28);background:rgba(12,24,18,.92);color:#bfffc5;border-radius:999px;padding:8px 12px;font-size:12px;font-weight:900;box-shadow:0 12px 32px rgba(0,0,0,.28)";
      document.body.appendChild(host);
    }

    host.textContent = "CI/CD Queue: " + (queue && typeof queue.count !== "undefined" ? queue.count : "ready");
    setTimeout(() => { if (host) host.remove(); }, 3500);
  }

  async function refreshQueue() {
    const q = await getJSON(API.queue);
    window.__CICD_TASK_QUEUE_V8E__ = q;
    renderQueueBadge(q);
    console.log("[CICD-TASK-REAL-API-V8E] queue", q);
    return q;
  }

  async function submitRun(e) {
    const btn = e.target && e.target.closest ? e.target.closest("#vsp-submit-run") : null;
    if (!btn) return;

    e.preventDefault();
    e.stopImmediatePropagation();

    const old = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Creating task...";

    const payload = buildTaskPayload();
    window.__CICD_TASK_V8E_LAST_PAYLOAD__ = payload;

    try {
      const res = await postJSON(API.create, payload);
      window.__CICD_TASK_V8E_LAST_RESPONSE__ = res;

      closeAll();
      toast("Real CI/CD task created: " + (res.rid || payload.rid), "ok");
      await refreshQueue();

      console.log("[CICD-TASK-REAL-API-V8E] created", { payload, res });
    } catch (err) {
      console.error("[CICD-TASK-REAL-API-V8E] create failed", err);

      if (err.status === 404) toast("Task API not found. Backend route not active.", "error");
      else if (err.status === 403) toast("Task API rejected CSRF/auth.", "error");
      else toast("Task create failed: HTTP " + (err.status || "ERR"), "error");
    } finally {
      btn.disabled = false;
      btn.textContent = old || "Create scan job";
    }
  }

  function boot() {
    document.addEventListener("click", submitRun, true);
    /* CICD_V12D_REAL_QUEUE_ENABLED */
    window.__CICD_QUEUE_API_AVAILABLE__ = true;
    refreshQueue().catch(e => console.warn("[CICD-TASK-REAL-API-V8E] initial real queue failed", e));
    console.log("[CICD-TASK-REAL-API-V8E] installed", API);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();

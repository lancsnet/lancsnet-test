// CICD_UI_BACKEND_V25
(function(){
  
  /* CICD_V25_AUTH_HEADER_V27 */
  function v25Token(){
    try {
      return window.TOKEN ||
        localStorage.getItem("vsp_token") ||
        localStorage.getItem("token") ||
        sessionStorage.getItem("vsp_token") ||
        sessionStorage.getItem("token") || "";
    } catch(e) { return window.TOKEN || ""; }
  }

  function v25Headers(extra){
    var h = {};
    try {
      if (typeof window.hdr === "function") h = Object.assign({}, window.hdr() || {});
    } catch(e) {}
    var t = v25Token();
    if (t && !h.Authorization) h.Authorization = "Bearer " + t;
    if (extra) h = Object.assign(h, extra);
    return h;
  }
"use strict";

  if (window.__CICD_UI_BACKEND_V25__) return;
  window.__CICD_UI_BACKEND_V25__ = true;

  const API = {
    tools: "/api/v1/cicd/tools",
    configGet: "/api/v1/cicd/config/get",
    configUpdate: "/api/v1/cicd/config/update",
    task: "/api/v1/cicd/remediation/task",
    queue: "/api/v1/cicd/autofix/queue",
    status: "/api/v1/cicd/autofix/status",
    createPr: "/api/v1/cicd/autofix/create-pr",
    rescan: "/api/v1/cicd/autofix/rescan"
  };

  function esc(v) {
    return String(v == null ? "" : v)
      .replace(/&/g,"&amp;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;")
      .replace(/'/g,"&#39;");
  }

  function badge(v) {
    const s = String(v || "UNKNOWN").toUpperCase();
    let c = "neutral";
    if (["PASS","ACTIVE","DONE","READY","ENABLED","OPEN"].includes(s)) c = "pass";
    else if (["FAIL","BLOCK","BLOCKED","CRITICAL"].includes(s)) c = "fail";
    else if (["WARN","PAUSED","PENDING","REVIEW"].includes(s)) c = "warn";
    else c = "info";
    return '<span class="badge ' + c + '">' + esc(s) + '</span>';
  }

  async function apiGet(path) {
    const r = await fetch(path, { credentials: "same-origin", headers: v25Headers() });
    const txt = await r.text();
    let data = {};
    try { data = txt ? JSON.parse(txt) : {}; } catch(e) { data = { raw: txt }; }
    if (!r.ok) throw new Error(path + " HTTP " + r.status + " " + txt.slice(0,120));
    return data;
  }

  async function apiPost(path, body) {
    const r = await fetch(path, { credentials: "same-origin", method: "POST",
      credentials: "same-origin",
      headers: v25Headers({ "Content-Type": "application/json" }),
      body: JSON.stringify(body || {})
    });
    const txt = await r.text();
    let data = {};
    try { data = txt ? JSON.parse(txt) : {}; } catch(e) { data = { raw: txt }; }
    if (!r.ok) throw new Error(path + " HTTP " + r.status + " " + txt.slice(0,120));
    return data;
  }

  function showToast(title, sub) {
    let toast = document.querySelector(".cicd-v22-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.className = "cicd-v22-toast";
      document.body.appendChild(toast);
    }
    toast.innerHTML = '<div class="cicd-v22-toast-title">' + esc(title) + '</div><div class="cicd-v22-toast-sub">' + esc(sub) + '</div>';
    toast.classList.add("open");
    clearTimeout(window.__cicdV25ToastTimer);
    window.__cicdV25ToastTimer = setTimeout(() => toast.classList.remove("open"), 2800);
  }

  function detailPayload() {
    const drawer = document.querySelector(".cicd-detail-drawer-v21");
    const fields = {};
    if (!drawer) return fields;

    drawer.querySelectorAll(".cicd-detail-field-v21").forEach(f => {
      const k = (f.querySelector(".cicd-detail-key-v21")?.innerText || "").trim();
      const v = (f.querySelector(".cicd-detail-val-v21")?.innerText || "").trim();
      if (k) fields[k] = v;
    });

    return fields;
  }

  function normalizeTaskBody() {
    const f = detailPayload();
    return {
      record_id: f["Record ID"] || "manual-ui-record",
      owner: f["Suggested owner"] || "DevSecOps",
      severity: (f["Status / Labels"] || "").includes("CRITICAL") ? "CRITICAL" : "HIGH",
      action: f["Suggested action"] || "Review, remediate, re-scan and retain evidence.",
      evidence_path: f["Raw row"] || "",
      source: "ui-v25-detail-drawer"
    };
  }

  async function backendCreateTask() {
    const body = normalizeTaskBody();
    const data = await apiPost(API.task, body);
    await renderBackendTasks();
    showToast("Backend task created", (data.task && data.task.id) ? data.task.id : "Task saved to backend queue.");
    return data;
  }

  async function backendCreatePr() {
    const body = normalizeTaskBody();
    const data = await apiPost(API.createPr, { record_id: body.record_id, dry_run: true });
    showToast("Auto PR backend ready", data.pr ? (data.pr.id + " · " + data.pr.branch) : "PR action completed.");
    return data;
  }

  async function backendRescan() {
    const body = normalizeTaskBody();
    const data = await apiPost(API.rescan, { record_id: body.record_id, dry_run: true });
    showToast("Re-scan queued", data.rescan ? data.rescan.id : "Re-scan request accepted.");
    return data;
  }

  async function renderBackendTasks() {
    const drawer = document.querySelector(".cicd-detail-drawer-v21");
    if (!drawer) return;

    let holder = drawer.querySelector("#cicdV22TaskList");
    if (!holder) {
      holder = document.createElement("div");
      holder.id = "cicdV22TaskList";
      holder.className = "cicd-v22-task-list";
      drawer.appendChild(holder);
    }

    let data;
    try {
      data = await apiGet(API.queue);
    } catch(e) {
      holder.innerHTML = '<div class="cicd-v25-api-box"><div class="cicd-v25-api-title">Backend queue unavailable</div><div class="cicd-v25-api-sub">' + esc(e.message) + '</div></div>';
      return;
    }

    const tasks = (data.queue || []).slice(0, 6);
    holder.innerHTML = [
      '<div class="cicd-detail-key-v21">Backend remediation tasks</div>',
      tasks.length ? tasks.map(t => [
        '<div class="cicd-v22-task">',
          '<div class="cicd-v22-task-title">' + esc(t.id) + ' ' + badge(t.status || "OPEN") + '</div>',
          '<div class="cicd-v22-task-sub">Record: ' + esc(t.record_id || "—") + '</div>',
          '<div class="cicd-v22-task-sub">Owner: ' + esc(t.owner || "—") + ' · Severity: ' + esc(t.severity || "—") + '</div>',
          '<div class="cicd-v22-task-sub">' + esc(t.action || "—") + '</div>',
          '<div class="cicd-v25-task-source">source: backend /api/v1/cicd/autofix/queue</div>',
        '</div>'
      ].join("")).join("") : '<div class="cicd-v22-task"><div class="cicd-v22-task-title">No backend task yet</div><div class="cicd-v22-task-sub">Create task from any detail drawer.</div></div>'
    ].join("");
  }

  function patchDrawerButtons() {
    const drawer = document.querySelector(".cicd-detail-drawer-v21");
    if (!drawer) return;

    drawer.querySelectorAll("button").forEach(btn => {
      const txt = (btn.textContent || "").trim().toLowerCase();

      if (txt.includes("create task") && btn.dataset.v25Backend !== "1") {
        btn.dataset.v25Backend = "1";
        btn.addEventListener("click", async function(e){
          e.preventDefault();
          e.stopImmediatePropagation();
          try { await backendCreateTask(); }
          catch(err) { showToast("Create task failed", err.message); }
        }, true);
      }

      if (txt.includes("copy evidence") && btn.dataset.v25Copy !== "1") {
        btn.dataset.v25Copy = "1";
        btn.addEventListener("click", async function(){
          await renderBackendTasks();
        }, false);
      }
    });

    if (!drawer.querySelector("#cicdV25BackendActions")) {
      const box = document.createElement("div");
      box.id = "cicdV25BackendActions";
      box.className = "cicd-v25-api-box";
      box.innerHTML = [
        '<div class="cicd-v25-api-title">Backend actions</div>',
        '<div class="cicd-v25-api-sub">These buttons call real backend APIs.</div>',
        '<div class="cicd-v21-actions" style="margin-top:10px">',
          '<button class="cicd-v21-btn" type="button" id="v25CreatePrBtn">Create PR</button>',
          '<button class="cicd-v21-btn" type="button" id="v25RescanBtn">Re-scan</button>',
          '<button class="cicd-v21-btn" type="button" id="v25RefreshQueueBtn">Refresh queue</button>',
        '</div>'
      ].join("");
      drawer.appendChild(box);

      drawer.querySelector("#v25CreatePrBtn").addEventListener("click", async () => {
        try { await backendCreatePr(); }
        catch(err) { showToast("Create PR failed", err.message); }
      });

      drawer.querySelector("#v25RescanBtn").addEventListener("click", async () => {
        try { await backendRescan(); }
        catch(err) { showToast("Re-scan failed", err.message); }
      });

      drawer.querySelector("#v25RefreshQueueBtn").addEventListener("click", async () => {
        await renderBackendTasks();
        showToast("Queue refreshed", "Loaded from backend queue API.");
      });
    }

    renderBackendTasks();
  }

  async function replaceToolRegistryFromBackend() {
    const config = document.querySelector("#tab-config");
    if (!config) return;

    const registry = config.querySelector("#cicdToolRegistryV22");
    if (!registry || registry.dataset.v25Backend === "1") return;

    let data;
    try {
      data = await apiGet(API.tools);
    } catch(e) {
      registry.insertAdjacentHTML("afterbegin", '<div class="cicd-v25-backend-pill warn">Backend tools unavailable</div>');
      return;
    }

    const tools = data.tools || [];
    const list = registry.querySelector(".cicd-v22-tool-registry");
    if (list && tools.length) {
      list.innerHTML = tools.map((t, i) => [
        '<div class="cicd-v22-tool-card">',
          '<div class="cicd-v22-tool-icon">' + esc(String(i+1).padStart(2,"0")) + '</div>',
          '<div>',
            '<div class="cicd-v22-tool-name">' + esc(t.name || t.id) + '</div>',
            '<div class="cicd-v22-tool-sub">' + esc((t.category || "Tool") + " · " + (t.desc || "")) + '</div>',
          '</div>',
          badge(t.enabled === false ? "DISABLED" : "ENABLED"),
        '</div>'
      ].join("")).join("");
    }

    const head = registry.querySelector(".cicd-v21-head");
    if (head && !head.querySelector(".cicd-v25-backend-pill")) {
      head.insertAdjacentHTML("beforeend", '<span class="cicd-v25-backend-pill">Backend tools · ' + esc(data.total || tools.length) + '</span>');
    }

    registry.dataset.v25Backend = "1";
  }

  function patchConfigActions() {
    const config = document.querySelector("#tab-config");
    if (!config || config.dataset.v25Actions === "1") return;
    config.dataset.v25Actions = "1";

    config.querySelectorAll("button").forEach(btn => {
      const txt = (btn.textContent || "").trim().toLowerCase();

      if (txt.includes("save draft")) {
        btn.textContent = "Save backend config";
        btn.addEventListener("click", async function(){
          try {
            const data = await apiPost(API.configUpdate, {
              gate_policy: { critical: "block", high: "review", medium: "track", low: "allow" },
              autofix: { create_patch_branch: true, open_pull_request: true, request_reviewer: true, rescan_after_fix: true },
              evidence: { keep_reports: true, keep_screenshots: true, keep_browser_trace: true, sha_pinning: true },
              source: "ui-v25-config"
            });
            showToast("Config saved", data.saved ? "Backend config updated." : "Backend accepted request.");
          } catch(e) {
            showToast("Config save failed", e.message);
          }
        });
      }

      if (txt.includes("validate policy")) {
        btn.addEventListener("click", async function(){
          try {
            const data = await apiGet(API.configGet);
            showToast("Policy valid", "Loaded config " + ((data.config && data.config.version) || "backend"));
          } catch(e) {
            showToast("Policy validate failed", e.message);
          }
        });
      }

      if (txt.includes("export config")) {
        btn.addEventListener("click", async function(){
          try {
            const data = await apiGet(API.configGet);
            await navigator.clipboard.writeText(JSON.stringify(data.config || data, null, 2));
            showToast("Config exported", "Backend config copied to clipboard.");
          } catch(e) {
            showToast("Config export failed", e.message);
          }
        });
      }
    });
  }

  async function addBackendStatusPill() {
    const nav = document.querySelector(".nav");
    if (!nav || document.querySelector("#cicdV25BackendStatus")) return;

    let ok = false, total = 0, open = 0;
    try {
      const s = await apiGet(API.status);
      ok = s.status === "PASS";
      total = s.autofix ? s.autofix.total : 0;
      open = s.autofix ? s.autofix.open : 0;
    } catch(e) {}

    const pill = document.createElement("span");
    pill.id = "cicdV25BackendStatus";
    pill.className = "cicd-v25-backend-pill" + (ok ? "" : " warn");
    pill.textContent = ok ? ("Backend ON · open " + open + "/" + total) : "Backend offline";
    nav.appendChild(pill);
  }

  function bindRowsForDrawer() {
    document.querySelectorAll(".cicd-clickable-detail-v21,.cicd-v19-row,.cicd-v20-row").forEach(row => {
      if (row.dataset.v25DrawerPatch === "1") return;
      row.dataset.v25DrawerPatch = "1";
      row.addEventListener("click", function(){
        setTimeout(patchDrawerButtons, 120);
      }, true);
    });
  }

  async function init() {
    await addBackendStatusPill();
    await replaceToolRegistryFromBackend();
    patchConfigActions();
    patchDrawerButtons();
    bindRowsForDrawer();
  }

  document.addEventListener("DOMContentLoaded", init);
  window.addEventListener("load", init);
  setTimeout(init, 800);
  setTimeout(init, 1800);
  setTimeout(init, 3200);

  const obs = new MutationObserver(() => {
    clearTimeout(window.__cicdV25Timer);
    window.__cicdV25Timer = setTimeout(init, 180);
  });

  if (document.documentElement) {
    obs.observe(document.documentElement, { childList: true, subtree: true });
  }
})();

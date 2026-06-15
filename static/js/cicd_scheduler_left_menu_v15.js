/* CICD_SCHEDULER_LEFT_MENU_V15 */
(function(){
  if (window.__CICD_SCHEDULER_LEFT_MENU_V15__) return;
  window.__CICD_SCHEDULER_LEFT_MENU_V15__ = true;

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

  function panelWindow(){
    try {
      const pd = parentDoc();
      const frame = pd.querySelector('iframe[src*="/panels/cicd.html"], iframe');
      if (frame && frame.contentWindow) return frame.contentWindow;
    } catch (_) {}
    return window;
  }

  function cleanOldUi(){
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

  async function getJSON(url){
    const res = await fetch(url, { method: "GET", headers: { "Accept": "application/json" }, credentials: "same-origin" });
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

  function defaults(raw){
    const c = baseConfig(raw);
    const s = c.scheduler || {};
    const co = s.concurrency || {};
    const r = s.retry || {};
    const to = s.timeout || {};
    const re = s.retention || {};
    const g = s.gate || {};
    const n = s.notification || {};
    const wh = n.webhook || {};
    return {
      enabled: s.enabled !== false,
      name: s.name || "Production CI/CD security gate",
      frequency: s.frequency || "nightly",
      cron: s.cron || "0 2 * * *",
      time: s.time || "02:00",
      timezone: s.timezone || "Asia/Ho_Chi_Minh",
      branch: s.branch || "main",
      profile: s.profile || "commercial-full-gate",
      scope: s.scope || "SAST, SCA, Secrets, IaC, Container, Final Gate, Evidence Pack",
      runOnPr: s.run_on_pr !== false,
      runOnPush: s.run_on_push === true,
      runOnRelease: s.run_on_release !== false,
      maxParallel: co.max_parallel || 2,
      dedupeWindowMin: co.dedupe_window_min || 30,
      queueMaxItems: co.queue_max_items || 100,
      cancelOldQueued: co.cancel_old_queued !== false,
      retryEnabled: r.enabled !== false,
      retryMax: r.max_attempts || 2,
      retryBackoffMin: r.backoff_min || 10,
      scanTimeoutMin: to.scan_timeout_min || 60,
      toolTimeoutMin: to.tool_timeout_min || 20,
      gateTimeoutMin: to.gate_timeout_min || 10,
      keepReports: re.keep_reports !== false,
      keepScreenshots: re.keep_screenshots !== false,
      keepLogs: re.keep_logs !== false,
      keepTrace: re.keep_trace !== false,
      keepDays: re.keep_days || 30,
      gateMode: g.mode || "block-critical-review-high",
      autoPromotePass: g.auto_promote_pass === true,
      requireEvidence: g.require_evidence !== false,
      requireApprovalOnHigh: g.require_approval_on_high !== false,
      notifyEnabled: n.enabled !== false,
      notifyEmail: n.email || "devsecops@company.local",
      notifyOnStart: n.on_start === true,
      notifyOnPass: n.on_pass === true,
      notifyOnFail: n.on_fail !== false,
      webhookEnabled: wh.enabled === true,
      webhookUrl: wh.url || ""
    };
  }

  function attr(id, label){ return `id="${id}" name="${id}" aria-label="${label}" autocomplete="off"`; }

  function field(id, label, value, textarea){
    const a = attr(id, label);
    const html = textarea ? `<textarea ${a}>${value}</textarea>` : `<input ${a} value="${value}">`;
    return `<div class="cicd-v15-field"><label for="${id}">${label}</label>${html}</div>`;
  }

  function select(id, label, value, opts){
    return `<div class="cicd-v15-field"><label for="${id}">${label}</label><select ${attr(id, label)}>${
      opts.map(o => {
        const v = Array.isArray(o) ? o[0] : o;
        const t = Array.isArray(o) ? o[1] : o;
        return `<option value="${v}" ${String(value) === String(v) ? "selected" : ""}>${t}</option>`;
      }).join("")
    }</select></div>`;
  }

  function full(x){ return `<div class="full">${x}</div>`; }

  function val(id, fallback){
    const d = panelWindow().document;
    const el = d.querySelector("#" + id);
    return el && typeof el.value === "string" && el.value.trim() ? el.value.trim() : fallback;
  }

  function boolVal(id, fallback){ return val(id, fallback ? "true" : "false") === "true"; }
  function numVal(id, fallback){ const n = Number(val(id, String(fallback))); return Number.isFinite(n) ? n : fallback; }

  function buildPayload(){
    const raw = panelWindow().__CICD_V15_RAW__ || {};
    const base = baseConfig(raw.raw || {});
    return {
      ...base,
      source: "CICD_SCHEDULER_PRODUCT_V15",
      rid: base.rid || ("SCHED_PRODUCT_V15_" + new Date().toISOString().replace(/[-:.TZ]/g,"").slice(0,14)),
      scheduler: {
        enabled: boolVal("c15-enabled", true),
        name: val("c15-name", "Production CI/CD security gate"),
        frequency: val("c15-frequency", "nightly"),
        cron: val("c15-cron", "0 2 * * *"),
        time: val("c15-time", "02:00"),
        timezone: val("c15-timezone", "Asia/Ho_Chi_Minh"),
        branch: val("c15-branch", "main"),
        profile: val("c15-profile", "commercial-full-gate"),
        scope: val("c15-scope", "SAST, SCA, Secrets, IaC, Container, Final Gate"),
        run_on_pr: boolVal("c15-run-pr", true),
        run_on_push: boolVal("c15-run-push", false),
        run_on_release: boolVal("c15-run-release", true),
        concurrency: {
          max_parallel: numVal("c15-max-parallel", 2),
          dedupe_window_min: numVal("c15-dedupe-window", 30),
          queue_max_items: numVal("c15-queue-max", 100),
          cancel_old_queued: boolVal("c15-cancel-old", true)
        },
        retry: {
          enabled: boolVal("c15-retry-enabled", true),
          max_attempts: numVal("c15-retry-max", 2),
          backoff_min: numVal("c15-retry-backoff", 10)
        },
        timeout: {
          scan_timeout_min: numVal("c15-scan-timeout", 60),
          tool_timeout_min: numVal("c15-tool-timeout", 20),
          gate_timeout_min: numVal("c15-gate-timeout", 10)
        },
        retention: {
          keep_reports: boolVal("c15-keep-reports", true),
          keep_screenshots: boolVal("c15-keep-screenshots", true),
          keep_logs: boolVal("c15-keep-logs", true),
          keep_trace: boolVal("c15-keep-trace", true),
          keep_days: numVal("c15-keep-days", 30)
        },
        gate: {
          mode: val("c15-gate-mode", "block-critical-review-high"),
          auto_promote_pass: boolVal("c15-auto-promote", false),
          require_evidence: boolVal("c15-require-evidence", true),
          require_approval_on_high: boolVal("c15-require-approval-high", true)
        },
        notification: {
          enabled: boolVal("c15-notify-enabled", true),
          email: val("c15-notify-email", "devsecops@company.local"),
          on_start: boolVal("c15-notify-start", false),
          on_pass: boolVal("c15-notify-pass", false),
          on_fail: boolVal("c15-notify-fail", true),
          webhook: {
            enabled: boolVal("c15-webhook-enabled", false),
            url: val("c15-webhook-url", "")
          }
        },
        updated_at: new Date().toISOString()
      }
    };
  }

  function queuePreview(queue){
    const items = Array.isArray(queue.items) ? queue.items : [];
    if (!items.length) return `<pre class="cicd-v15-preview">No queued jobs. Queue API is active.</pre>`;
    return `<pre class="cicd-v15-preview">${JSON.stringify(items.slice(0, 20), null, 2)}</pre>`;
  }

  async function openDrawer(){
    cleanOldUi();

    const w = panelWindow();
    const d = w.document;

    let raw = {}, queue = { count: 0, items: [] }, status = {};
    try { raw = await getJSON(API.config); } catch (_) {}
    try { queue = await getJSON(API.queue); } catch (_) {}
    try { status = await getJSON(API.status); } catch (_) {}

    w.__CICD_V15_RAW__ = { raw, queue, status };

    const x = defaults(raw);

    let drawer = d.querySelector("#cicd-v15-drawer");
    if (!drawer) {
      drawer = d.createElement("aside");
      drawer.id = "cicd-v15-drawer";
      drawer.setAttribute("role", "dialog");
      drawer.setAttribute("aria-label", "CI/CD Schedule Settings");
      d.body.appendChild(drawer);
    }

    drawer.innerHTML = `
      <div class="cicd-v15-head">
        <div>
          <div class="cicd-v15-title">Schedule Settings</div>
          <div class="cicd-v15-sub">Production CI/CD schedule, real queue, runtime controls, evidence retention and gate behavior.</div>
        </div>
        <button class="cicd-v15-close" type="button" name="c15-close" data-c15-close="1">×</button>
      </div>

      <div class="cicd-v15-body">
        <div class="cicd-v15-kpis">
          <div class="cicd-v15-kpi"><div class="num">${x.enabled ? "ACTIVE" : "PAUSED"}</div><div class="txt">Schedule status</div></div>
          <div class="cicd-v15-kpi"><div class="num">${x.frequency}</div><div class="txt">Frequency</div></div>
          <div class="cicd-v15-kpi"><div class="num">${queue.count || 0}</div><div class="txt">Queued jobs</div></div>
          <div class="cicd-v15-kpi"><div class="num">${status.latest_status || "n/a"}</div><div class="txt">Latest gate</div></div>
        </div>

        <div class="cicd-v15-tabs">
          ${["basic","trigger","queue","runtime","evidence","gate","notify","preview"].map((t,i)=>`<button class="cicd-v15-tab ${i===0?"active":""}" type="button" data-c15-tab="${t}">${t[0].toUpperCase()+t.slice(1)}</button>`).join("")}
        </div>

        <section class="cicd-v15-section active" data-c15-section="basic">
          <div class="cicd-v15-section-title">Basic schedule</div>
          <div class="cicd-v15-grid">
            ${full(field("c15-name","Schedule name",x.name))}
            ${select("c15-enabled","Status",String(x.enabled),[["true","Active"],["false","Paused"]])}
            ${select("c15-frequency","Frequency",x.frequency,[["nightly","Nightly"],["every_6_hours","Every 6 hours"],["on_pr","On PR/MR"],["on_push","On push"],["on_release","On release"],["manual","Manual only"],["cron","Custom cron"]])}
            ${field("c15-time","Run time",x.time)}
            ${field("c15-timezone","Timezone",x.timezone)}
            ${field("c15-branch","Default branch",x.branch)}
            ${field("c15-profile","Scan profile",x.profile)}
            ${full(field("c15-scope","Scan scope",x.scope,true))}
          </div>
        </section>

        <section class="cicd-v15-section" data-c15-section="trigger">
          <div class="cicd-v15-section-title">Trigger policy</div>
          <div class="cicd-v15-grid">
            ${field("c15-cron","Cron expression",x.cron)}
            ${select("c15-run-pr","Run on PR/MR",String(x.runOnPr),[["true","Yes"],["false","No"]])}
            ${select("c15-run-push","Run on push",String(x.runOnPush),[["true","Yes"],["false","No"]])}
            ${select("c15-run-release","Run on release",String(x.runOnRelease),[["true","Yes"],["false","No"]])}
          </div>
        </section>

        <section class="cicd-v15-section" data-c15-section="queue">
          <div class="cicd-v15-section-title">Queue policy</div>
          <div class="cicd-v15-grid">
            ${field("c15-max-parallel","Max parallel jobs",x.maxParallel)}
            ${field("c15-dedupe-window","Dedupe window minutes",x.dedupeWindowMin)}
            ${field("c15-queue-max","Queue max items",x.queueMaxItems)}
            ${select("c15-cancel-old","Cancel old queued jobs",String(x.cancelOldQueued),[["true","Yes"],["false","No"]])}
            ${full(queuePreview(queue))}
          </div>
        </section>

        <section class="cicd-v15-section" data-c15-section="runtime">
          <div class="cicd-v15-section-title">Runtime controls</div>
          <div class="cicd-v15-grid">
            ${select("c15-retry-enabled","Retry enabled",String(x.retryEnabled),[["true","Enabled"],["false","Disabled"]])}
            ${field("c15-retry-max","Max retry attempts",x.retryMax)}
            ${field("c15-retry-backoff","Backoff minutes",x.retryBackoffMin)}
            ${field("c15-scan-timeout","Full scan timeout minutes",x.scanTimeoutMin)}
            ${field("c15-tool-timeout","Per-tool timeout minutes",x.toolTimeoutMin)}
            ${field("c15-gate-timeout","Gate timeout minutes",x.gateTimeoutMin)}
          </div>
        </section>

        <section class="cicd-v15-section" data-c15-section="evidence">
          <div class="cicd-v15-section-title">Evidence retention</div>
          <div class="cicd-v15-grid">
            ${select("c15-keep-reports","Keep reports",String(x.keepReports),[["true","Yes"],["false","No"]])}
            ${select("c15-keep-screenshots","Keep screenshots",String(x.keepScreenshots),[["true","Yes"],["false","No"]])}
            ${select("c15-keep-logs","Keep logs",String(x.keepLogs),[["true","Yes"],["false","No"]])}
            ${select("c15-keep-trace","Keep trace",String(x.keepTrace),[["true","Yes"],["false","No"]])}
            ${field("c15-keep-days","Retention days",x.keepDays)}
          </div>
        </section>

        <section class="cicd-v15-section" data-c15-section="gate">
          <div class="cicd-v15-section-title">Release gate behavior</div>
          <div class="cicd-v15-grid">
            ${select("c15-gate-mode","Gate mode",x.gateMode,[["block-critical-review-high","Block critical, review high"],["block-critical-high","Block critical and high"],["audit-only","Audit only"]])}
            ${select("c15-auto-promote","Auto promote pass",String(x.autoPromotePass),[["false","No"],["true","Yes"]])}
            ${select("c15-require-evidence","Require evidence",String(x.requireEvidence),[["true","Yes"],["false","No"]])}
            ${select("c15-require-approval-high","Require approval on high",String(x.requireApprovalOnHigh),[["true","Yes"],["false","No"]])}
          </div>
        </section>

        <section class="cicd-v15-section" data-c15-section="notify">
          <div class="cicd-v15-section-title">Notification policy</div>
          <div class="cicd-v15-grid">
            ${select("c15-notify-enabled","Notification enabled",String(x.notifyEnabled),[["true","Enabled"],["false","Disabled"]])}
            ${field("c15-notify-email","Email or target",x.notifyEmail)}
            ${select("c15-notify-start","Notify on start",String(x.notifyOnStart),[["false","No"],["true","Yes"]])}
            ${select("c15-notify-pass","Notify on pass",String(x.notifyOnPass),[["false","No"],["true","Yes"]])}
            ${select("c15-notify-fail","Notify on fail",String(x.notifyOnFail),[["true","Yes"],["false","No"]])}
            ${select("c15-webhook-enabled","Webhook enabled",String(x.webhookEnabled),[["false","No"],["true","Yes"]])}
            ${full(field("c15-webhook-url","Webhook URL",x.webhookUrl))}
          </div>
        </section>

        <section class="cicd-v15-section" data-c15-section="preview">
          <div class="cicd-v15-section-title">Configuration preview</div>
          <pre class="cicd-v15-preview" id="c15-preview-box"></pre>
        </section>

        <div class="cicd-v15-actions">
          <button class="cicd-v15-btn secondary" type="button" data-c15-close="1">Close</button>
          <button class="cicd-v15-btn secondary" type="button" id="c15-preview-refresh">Refresh preview</button>
          <button class="cicd-v15-btn primary" type="button" id="c15-save">Save settings</button>
        </div>
      </div>
    `;

    drawer.classList.add("open");
    refreshPreview();

    console.log("[CICD-V15] Schedule Settings drawer opened", { raw, queue, status });
  }

  function refreshPreview(){
    const d = panelWindow().document;
    const box = d.querySelector("#c15-preview-box");
    if (box) box.textContent = JSON.stringify(buildPayload(), null, 2);
  }

  async function save(){
    const payload = buildPayload();
    const res = await postJSON(API.updateConfig, payload);
    console.log("[CICD-V15] Schedule Settings saved", { payload, res });
    panelWindow().document.querySelector("#cicd-v15-drawer")?.classList.remove("open");
  }

  function bindDrawerEvents(){
    const d = panelWindow().document;

    if (d.__CICD_V15_DRAWER_EVENTS__) return;
    d.__CICD_V15_DRAWER_EVENTS__ = true;

    d.addEventListener("click", function(e){
      const tab = e.target.closest("[data-c15-tab]");
      if (tab) {
        const name = tab.getAttribute("data-c15-tab");
        d.querySelectorAll(".cicd-v15-tab").forEach(x => x.classList.toggle("active", x === tab));
        d.querySelectorAll(".cicd-v15-section").forEach(x => x.classList.toggle("active", x.getAttribute("data-c15-section") === name));
        if (name === "preview") refreshPreview();
      }

      if (e.target.closest("[data-c15-close]")) {
        d.querySelector("#cicd-v15-drawer")?.classList.remove("open");
      }

      if (e.target.closest("#c15-preview-refresh")) {
        e.preventDefault();
        refreshPreview();
      }

      if (e.target.closest("#c15-save")) {
        e.preventDefault();
        save().catch(err => console.error("[CICD-V15] save failed", err));
      }
    }, true);

    d.addEventListener("input", function(e){
      if (e.target && e.target.id && e.target.id.startsWith("c15-")) refreshPreview();
    }, true);
  }

  function findSchedulerMenu(){
    const pd = parentDoc();
    return Array.from(pd.querySelectorAll("a, button, [role='button'], li, div, span"))
      .find(el => {
        const text = (el.innerText || el.textContent || "").trim().toLowerCase();
        if (text !== "scheduler") return false;
        const rect = el.getBoundingClientRect();
        return rect.left <= 260 && rect.width > 0 && rect.height > 0;
      });
  }

  function bindSchedulerMenu(){
    cleanOldUi();
    bindDrawerEvents();

    const pd = parentDoc();
    const item = findSchedulerMenu();

    if (!item) {
      if (!window.__CICD_V15_NO_MENU_WARNED__) {
        console.warn("[CICD-V15] left Scheduler menu not found yet");
        window.__CICD_V15_NO_MENU_WARNED__ = true;
      }
      return false;
    }

    item.classList.add("v15-scheduler-menu-bound");
    item.setAttribute("title", "Open CI/CD Schedule Settings");
    item.setAttribute("data-cicd-scheduler-bound", "v15");

    if (!item.dataset.v15SchedulerClickBound) {
      item.dataset.v15SchedulerClickBound = "1";
      item.addEventListener("click", function(e){
        e.preventDefault();
        e.stopPropagation();

        pd.querySelectorAll(".v15-scheduler-menu-active").forEach(x => x.classList.remove("v15-scheduler-menu-active"));
        item.classList.add("v15-scheduler-menu-active");

        var __f=(window.parent||window).document.querySelector("#panel-cicd iframe");if(__f&&__f.contentWindow)__f.contentWindow.postMessage({type:"CICD_NAV",tab:"schedule"},"*");
        return false;
      }, true);
    }

    window.openCICDSchedulerFromLeftMenu = openDrawer;
    try {
      if (window.parent && window.parent !== window) {
        window.parent.openCICDSchedulerFromLeftMenu = openDrawer;
      }
    } catch (_) {}

    if (!window.__CICD_V15_BOUND_LOGGED__) {
      console.log("[CICD-V15] left Scheduler menu bound", {
        text: (item.innerText || item.textContent || "").trim(),
        left: item.getBoundingClientRect().left,
        top: item.getBoundingClientRect().top
      });
      window.__CICD_V15_BOUND_LOGGED__ = true;
    }

    return true;
  }

  function boot(){
    bindSchedulerMenu();
    setTimeout(bindSchedulerMenu, 800);
    setTimeout(bindSchedulerMenu, 2000);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();

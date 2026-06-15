/* CICD_SCHEDULER_PRODUCT_V12D_CLEAN */
(function(){
  if (window.__CICD_SCHEDULER_PRODUCT_V12D__) return;
  window.__CICD_SCHEDULER_PRODUCT_V12D__ = true;

  const API = {
    config: "/api/v1/cicd/config",
    updateConfig: "/api/v1/cicd/config/update",
    queue: "/api/v1/cicd/queue",
    status: "/api/v1/cicd/status"
  };

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

  function getCookie(name){
    for (const p of document.cookie.split(";").map(x => x.trim())) {
      if (p.startsWith(name + "=")) return decodeURIComponent(p.slice(name.length + 1));
    }
    return "";
  }

  function headers(json){
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

  async function getJSON(url){
    const res = await fetch(url, { method: "GET", headers: headers(false), credentials: "same-origin" });
    const text = await res.text();
    let data;
    try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
    if (!res.ok) throw Object.assign(new Error("HTTP " + res.status), { status: res.status, data });
    return data;
  }

  async function postJSON(url, payload){
    const res = await fetch(url, {
      method: "POST",
      headers: headers(true),
      credentials: "same-origin",
      body: JSON.stringify(payload)
    });
    const text = await res.text();
    let data;
    try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
    if (!res.ok) throw Object.assign(new Error("HTTP " + res.status), { status: res.status, data });
    return data;
  }

  function toast(msg){
    let t = $("#vsp-action-toast");
    if (!t) {
      t = document.createElement("div");
      t.id = "vsp-action-toast";
      t.className = "vsp-toast";
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.style.borderColor = "rgba(111,231,118,.32)";
    t.style.color = "#dfffe2";
    t.classList.add("show");
    setTimeout(() => t.classList.remove("show"), 3200);
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

  function attr(id, label){
    return `id="${id}" name="${id}" aria-label="${label}" autocomplete="off"`;
  }

  function field(id, label, value, textarea){
    const a = attr(id, label);
    const html = textarea ? `<textarea ${a}>${value}</textarea>` : `<input ${a} value="${value}">`;
    return `<div class="cicd11-field"><label for="${id}">${label}</label>${html}</div>`;
  }

  function select(id, label, value, opts){
    return `<div class="cicd11-field"><label for="${id}">${label}</label><select ${attr(id, label)}>${
      opts.map(o => {
        const v = Array.isArray(o) ? o[0] : o;
        const t = Array.isArray(o) ? o[1] : o;
        return `<option value="${v}" ${String(value) === String(v) ? "selected" : ""}>${t}</option>`;
      }).join("")
    }</select></div>`;
  }

  function full(x){ return `<div class="full">${x}</div>`; }

  function val(id, fallback){
    const el = $("#" + id);
    return el && typeof el.value === "string" && el.value.trim() ? el.value.trim() : fallback;
  }

  function boolVal(id, fallback){ return val(id, fallback ? "true" : "false") === "true"; }
  function numVal(id, fallback){ const n = Number(val(id, String(fallback))); return Number.isFinite(n) ? n : fallback; }

  function buildPayload(){
    const raw = window.__CICD11_RAW__ || {};
    const base = baseConfig(raw.raw || {});
    return {
      ...base,
      source: "CICD_SCHEDULER_PRODUCT_V12D",
      rid: base.rid || ("SCHED_PRODUCT_V11_" + new Date().toISOString().replace(/[-:.TZ]/g,"").slice(0,14)),
      scheduler: {
        enabled: boolVal("c11-enabled", true),
        name: val("c11-name", "Production CI/CD security gate"),
        frequency: val("c11-frequency", "nightly"),
        cron: val("c11-cron", "0 2 * * *"),
        time: val("c11-time", "02:00"),
        timezone: val("c11-timezone", "Asia/Ho_Chi_Minh"),
        branch: val("c11-branch", "main"),
        profile: val("c11-profile", "commercial-full-gate"),
        scope: val("c11-scope", "SAST, SCA, Secrets, IaC, Container, Final Gate"),
        run_on_pr: boolVal("c11-run-pr", true),
        run_on_push: boolVal("c11-run-push", false),
        run_on_release: boolVal("c11-run-release", true),
        concurrency: {
          max_parallel: numVal("c11-max-parallel", 2),
          dedupe_window_min: numVal("c11-dedupe-window", 30),
          queue_max_items: numVal("c11-queue-max", 100),
          cancel_old_queued: boolVal("c11-cancel-old", true)
        },
        retry: {
          enabled: boolVal("c11-retry-enabled", true),
          max_attempts: numVal("c11-retry-max", 2),
          backoff_min: numVal("c11-retry-backoff", 10)
        },
        timeout: {
          scan_timeout_min: numVal("c11-scan-timeout", 60),
          tool_timeout_min: numVal("c11-tool-timeout", 20),
          gate_timeout_min: numVal("c11-gate-timeout", 10)
        },
        retention: {
          keep_reports: boolVal("c11-keep-reports", true),
          keep_screenshots: boolVal("c11-keep-screenshots", true),
          keep_logs: boolVal("c11-keep-logs", true),
          keep_trace: boolVal("c11-keep-trace", true),
          keep_days: numVal("c11-keep-days", 30)
        },
        gate: {
          mode: val("c11-gate-mode", "block-critical-review-high"),
          auto_promote_pass: boolVal("c11-auto-promote", false),
          require_evidence: boolVal("c11-require-evidence", true),
          require_approval_on_high: boolVal("c11-require-approval-high", true)
        },
        notification: {
          enabled: boolVal("c11-notify-enabled", true),
          email: val("c11-notify-email", "devsecops@company.local"),
          on_start: boolVal("c11-notify-start", false),
          on_pass: boolVal("c11-notify-pass", false),
          on_fail: boolVal("c11-notify-fail", true),
          webhook: {
            enabled: boolVal("c11-webhook-enabled", false),
            url: val("c11-webhook-url", "")
          }
        },
        updated_at: new Date().toISOString()
      }
    };
  }

  function queueTable(queue){
    const items = Array.isArray(queue.items) ? queue.items : [];
    if (!items.length) return `<span class="cicd11-chip warn">No queued jobs</span>`;
    return `<pre class="cicd11-preview">${JSON.stringify(items.slice(0, 20), null, 2)}</pre>`;
  }

  function ensureButton(){
    let btn = $("#cicd11-open");
    if (!btn) {
      btn = document.createElement("button");
      btn.id = "cicd11-open";
      btn.className = "cicd11-btn";
      btn.type = "button";
      btn.name = "cicd11-open";
      btn.setAttribute("aria-label", "Open schedule settings");
      btn.textContent = "Schedule settings";

      const topActions = document.querySelector(".top-actions,.toolbar,.actions") || document.body;
      topActions.appendChild(btn);
    }
    btn.onclick = function(e){
      e.preventDefault();
      e.stopPropagation();
      openDrawer();
      return false;
    };
  }

  function ensureDrawer(){
    let d = $("#cicd11-drawer");
    if (!d) {
      d = document.createElement("aside");
      d.id = "cicd11-drawer";
      d.className = "cicd11-drawer";
      d.setAttribute("role", "dialog");
      d.setAttribute("aria-label", "CI/CD Schedule Settings");
      document.body.appendChild(d);
    }
    return d;
  }

  async function openDrawer(){
    let raw = {}, queue = {count:0, items:[]}, status = {};
    try { raw = await getJSON(API.config); } catch {}
    /* CICD_V11C_QUEUE_FALLBACK_PATCH */
    try { queue = await getJSON(API.queue); } catch {}
    try { status = await getJSON(API.status); } catch {}

    window.__CICD11_RAW__ = { raw, queue, status };

    const x = defaults(raw);
    const d = ensureDrawer();

    d.innerHTML = `
      <div class="cicd11-head">
        <div>
          <div class="cicd11-title">Schedule Settings</div>
          <div class="cicd11-sub">Production configuration for CI/CD security schedule, triggers, queue policy, runtime controls, evidence retention, release gate and notifications.</div>
        </div>
        <button class="cicd11-close" type="button" name="cicd11-close" aria-label="Close schedule settings" data-cicd11-close="1">×</button>
      </div>

      <div class="cicd11-body">
        <div class="cicd11-kpis">
          <div class="cicd11-kpi"><div class="num">${x.enabled ? "ACTIVE" : "PAUSED"}</div><div class="txt">Schedule status</div></div>
          <div class="cicd11-kpi"><div class="num">${x.frequency}</div><div class="txt">Frequency</div></div>
          <div class="cicd11-kpi"><div class="num">${queue.count || 0}</div><div class="txt">Queued jobs</div></div>
          <div class="cicd11-kpi"><div class="num">${status.latest_status || "n/a"}</div><div class="txt">Latest gate</div></div>
        </div>

        <div class="cicd11-tabs">
          ${["basic","trigger","queue","runtime","evidence","gate","notify","preview"].map((t,i)=>`<button class="cicd11-tab ${i===0?"active":""}" type="button" name="tab-${t}" data-cicd11-tab="${t}">${t[0].toUpperCase()+t.slice(1)}</button>`).join("")}
        </div>

        <section class="cicd11-section active" data-cicd11-section="basic">
          <div class="cicd11-section-title">Basic schedule</div>
          <div class="cicd11-desc">Core schedule definition for the CI/CD security gate.</div>
          <div class="cicd11-grid">
            ${full(field("c11-name","Schedule name",x.name))}
            ${select("c11-enabled","Status",String(x.enabled),[["true","Active"],["false","Paused"]])}
            ${select("c11-frequency","Frequency",x.frequency,[["nightly","Nightly"],["every_6_hours","Every 6 hours"],["on_pr","On PR/MR"],["on_push","On push"],["on_release","On release"],["manual","Manual only"],["cron","Custom cron"]])}
            ${field("c11-time","Run time",x.time)}
            ${field("c11-timezone","Timezone",x.timezone)}
            ${field("c11-branch","Default branch",x.branch)}
            ${field("c11-profile","Scan profile",x.profile)}
            ${full(field("c11-scope","Scan scope",x.scope,true))}
          </div>
        </section>

        <section class="cicd11-section" data-cicd11-section="trigger">
          <div class="cicd11-section-title">Trigger policy</div>
          <div class="cicd11-grid">
            ${field("c11-cron","Cron expression",x.cron)}
            ${select("c11-run-pr","Run on PR/MR",String(x.runOnPr),[["true","Yes"],["false","No"]])}
            ${select("c11-run-push","Run on push",String(x.runOnPush),[["true","Yes"],["false","No"]])}
            ${select("c11-run-release","Run on release",String(x.runOnRelease),[["true","Yes"],["false","No"]])}
          </div>
        </section>

        <section class="cicd11-section" data-cicd11-section="queue">
          <div class="cicd11-section-title">Queue policy</div>
          <div class="cicd11-grid">
            ${field("c11-max-parallel","Max parallel jobs",x.maxParallel)}
            ${field("c11-dedupe-window","Dedupe window minutes",x.dedupeWindowMin)}
            ${field("c11-queue-max","Queue max items",x.queueMaxItems)}
            ${select("c11-cancel-old","Cancel old queued jobs",String(x.cancelOldQueued),[["true","Yes"],["false","No"]])}
          </div>
          <div style="margin-top:12px">${queueTable(queue)}</div>
        </section>

        <section class="cicd11-section" data-cicd11-section="runtime">
          <div class="cicd11-section-title">Runtime controls</div>
          <div class="cicd11-grid">
            ${select("c11-retry-enabled","Retry enabled",String(x.retryEnabled),[["true","Enabled"],["false","Disabled"]])}
            ${field("c11-retry-max","Max retry attempts",x.retryMax)}
            ${field("c11-retry-backoff","Backoff minutes",x.retryBackoffMin)}
            ${field("c11-scan-timeout","Full scan timeout minutes",x.scanTimeoutMin)}
            ${field("c11-tool-timeout","Per-tool timeout minutes",x.toolTimeoutMin)}
            ${field("c11-gate-timeout","Gate timeout minutes",x.gateTimeoutMin)}
          </div>
        </section>

        <section class="cicd11-section" data-cicd11-section="evidence">
          <div class="cicd11-section-title">Evidence retention</div>
          <div class="cicd11-grid">
            ${select("c11-keep-reports","Keep reports",String(x.keepReports),[["true","Yes"],["false","No"]])}
            ${select("c11-keep-screenshots","Keep screenshots",String(x.keepScreenshots),[["true","Yes"],["false","No"]])}
            ${select("c11-keep-logs","Keep logs",String(x.keepLogs),[["true","Yes"],["false","No"]])}
            ${select("c11-keep-trace","Keep trace",String(x.keepTrace),[["true","Yes"],["false","No"]])}
            ${field("c11-keep-days","Retention days",x.keepDays)}
          </div>
        </section>

        <section class="cicd11-section" data-cicd11-section="gate">
          <div class="cicd11-section-title">Release gate behavior</div>
          <div class="cicd11-grid">
            ${select("c11-gate-mode","Gate mode",x.gateMode,[["block-critical-review-high","Block critical, review high"],["block-critical-high","Block critical and high"],["audit-only","Audit only"]])}
            ${select("c11-auto-promote","Auto promote pass",String(x.autoPromotePass),[["false","No"],["true","Yes"]])}
            ${select("c11-require-evidence","Require evidence",String(x.requireEvidence),[["true","Yes"],["false","No"]])}
            ${select("c11-require-approval-high","Require approval on high",String(x.requireApprovalOnHigh),[["true","Yes"],["false","No"]])}
          </div>
        </section>

        <section class="cicd11-section" data-cicd11-section="notify">
          <div class="cicd11-section-title">Notification policy</div>
          <div class="cicd11-grid">
            ${select("c11-notify-enabled","Notification enabled",String(x.notifyEnabled),[["true","Enabled"],["false","Disabled"]])}
            ${field("c11-notify-email","Email or target",x.notifyEmail)}
            ${select("c11-notify-start","Notify on start",String(x.notifyOnStart),[["false","No"],["true","Yes"]])}
            ${select("c11-notify-pass","Notify on pass",String(x.notifyOnPass),[["false","No"],["true","Yes"]])}
            ${select("c11-notify-fail","Notify on fail",String(x.notifyOnFail),[["true","Yes"],["false","No"]])}
            ${select("c11-webhook-enabled","Webhook enabled",String(x.webhookEnabled),[["false","No"],["true","Yes"]])}
            ${full(field("c11-webhook-url","Webhook URL",x.webhookUrl))}
          </div>
        </section>

        <section class="cicd11-section" data-cicd11-section="preview">
          <div class="cicd11-section-title">Configuration preview</div>
          <pre class="cicd11-preview" id="cicd11-preview-box"></pre>
        </section>

        <div class="cicd11-actions">
          <button class="cicd11-action secondary" type="button" name="cicd11-close2" data-cicd11-close="1">Close</button>
          <button class="cicd11-action secondary" type="button" name="cicd11-preview-refresh" id="cicd11-preview-refresh">Refresh preview</button>
          <button class="cicd11-action primary" type="button" name="cicd11-save" id="cicd11-save">Save settings</button>
        </div>
      </div>
    `;

    d.classList.add("open");
    refreshPreview();
    console.log("[CICD-SCHEDULER-PRODUCT-V12D] opened", { raw, queue, status });
  }

  function refreshPreview(){
    const box = $("#cicd11-preview-box");
    if (box) box.textContent = JSON.stringify(buildPayload(), null, 2);
  }

  async function save(){
    const payload = buildPayload();
    const res = await postJSON(API.updateConfig, payload);
    window.__CICD11_LAST_SAVE__ = { payload, res };
    toast("Schedule settings saved");
    const d = $("#cicd11-drawer");
    if (d) d.classList.remove("open");
    console.log("[CICD-SCHEDULER-PRODUCT-V12D] saved", { payload, res });
  }

  function bind(){
    ensureButton();

    document.addEventListener("click", function(e){
      const tab = e.target.closest("[data-cicd11-tab]");
      if (tab) {
        const name = tab.getAttribute("data-cicd11-tab");
        $$(".cicd11-tab").forEach(x => x.classList.toggle("active", x === tab));
        $$(".cicd11-section").forEach(x => x.classList.toggle("active", x.getAttribute("data-cicd11-section") === name));
        if (name === "preview") refreshPreview();
      }

      if (e.target.closest("[data-cicd11-close]")) {
        const d = $("#cicd11-drawer");
        if (d) d.classList.remove("open");
      }

      if (e.target.closest("#cicd11-preview-refresh")) {
        e.preventDefault();
        refreshPreview();
        toast("Preview refreshed");
      }

      if (e.target.closest("#cicd11-save")) {
        e.preventDefault();
        save().catch(err => {
          console.error("[CICD-SCHEDULER-PRODUCT-V12D] save failed", err);
          toast("Save failed");
        });
      }
    }, true);

    document.addEventListener("input", function(e){
      if (e.target && e.target.id && e.target.id.startsWith("c11-")) refreshPreview();
    }, true);

    window.openCICDScheduleSettings = openDrawer;
    try {
      if (window.parent && window.parent !== window) {
        window.parent.openCICDScheduleSettings = function(){
          const frame = window.parent.document.querySelector('iframe[src*="/panels/cicd.html"], iframe');
          if (frame && frame.contentWindow && frame.contentWindow.openCICDScheduleSettings) {
            return frame.contentWindow.openCICDScheduleSettings();
          }
        };
      }
    } catch {}

    console.log("[CICD-SCHEDULER-PRODUCT-V12D] installed", API);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bind);
  else bind();
})();

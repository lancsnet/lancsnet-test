/* CICD_SCHEDULER_PRODUCT_V10E_CLEAN */
(function(){
  if (window.__CICD_SCHEDULER_PRODUCT_V10E__) return;
  window.__CICD_SCHEDULER_PRODUCT_V10E__ = true;

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
    return `<div class="cicd10e-field"><label for="${id}">${label}</label>${html}</div>`;
  }

  function select(id, label, value, opts){
    return `<div class="cicd10e-field"><label for="${id}">${label}</label><select ${attr(id, label)}>${
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
    const raw = window.__CICD10E_RAW__ || {};
    const base = baseConfig(raw.raw || {});
    return {
      ...base,
      source: "CICD_SCHEDULER_PRODUCT_V10E",
      rid: base.rid || ("SCHED_PRODUCT_" + new Date().toISOString().replace(/[-:.TZ]/g,"").slice(0,14)),
      scheduler: {
        enabled: boolVal("c10e-enabled", true),
        name: val("c10e-name", "Production CI/CD security gate"),
        frequency: val("c10e-frequency", "nightly"),
        cron: val("c10e-cron", "0 2 * * *"),
        time: val("c10e-time", "02:00"),
        timezone: val("c10e-timezone", "Asia/Ho_Chi_Minh"),
        branch: val("c10e-branch", "main"),
        profile: val("c10e-profile", "commercial-full-gate"),
        scope: val("c10e-scope", "SAST, SCA, Secrets, IaC, Container, Final Gate"),
        run_on_pr: boolVal("c10e-run-pr", true),
        run_on_push: boolVal("c10e-run-push", false),
        run_on_release: boolVal("c10e-run-release", true),
        concurrency: {
          max_parallel: numVal("c10e-max-parallel", 2),
          dedupe_window_min: numVal("c10e-dedupe-window", 30),
          queue_max_items: numVal("c10e-queue-max", 100),
          cancel_old_queued: boolVal("c10e-cancel-old", true)
        },
        retry: {
          enabled: boolVal("c10e-retry-enabled", true),
          max_attempts: numVal("c10e-retry-max", 2),
          backoff_min: numVal("c10e-retry-backoff", 10)
        },
        timeout: {
          scan_timeout_min: numVal("c10e-scan-timeout", 60),
          tool_timeout_min: numVal("c10e-tool-timeout", 20),
          gate_timeout_min: numVal("c10e-gate-timeout", 10)
        },
        retention: {
          keep_reports: boolVal("c10e-keep-reports", true),
          keep_screenshots: boolVal("c10e-keep-screenshots", true),
          keep_logs: boolVal("c10e-keep-logs", true),
          keep_trace: boolVal("c10e-keep-trace", true),
          keep_days: numVal("c10e-keep-days", 30)
        },
        gate: {
          mode: val("c10e-gate-mode", "block-critical-review-high"),
          auto_promote_pass: boolVal("c10e-auto-promote", false),
          require_evidence: boolVal("c10e-require-evidence", true),
          require_approval_on_high: boolVal("c10e-require-approval-high", true)
        },
        notification: {
          enabled: boolVal("c10e-notify-enabled", true),
          email: val("c10e-notify-email", "devsecops@company.local"),
          on_start: boolVal("c10e-notify-start", false),
          on_pass: boolVal("c10e-notify-pass", false),
          on_fail: boolVal("c10e-notify-fail", true),
          webhook: {
            enabled: boolVal("c10e-webhook-enabled", false),
            url: val("c10e-webhook-url", "")
          }
        },
        updated_at: new Date().toISOString()
      }
    };
  }

  function queueTable(queue){
    const items = Array.isArray(queue.items) ? queue.items : [];
    if (!items.length) return `<span class="cicd10e-chip warn">No queued jobs</span>`;
    return `<pre class="cicd10e-preview">${JSON.stringify(items.slice(0, 20), null, 2)}</pre>`;
  }

  function ensureButton(){
    let btn = $("#cicd10e-open");
    if (!btn) {
      btn = document.createElement("button");
      btn.id = "cicd10e-open";
      btn.className = "cicd10e-btn";
      btn.type = "button";
      btn.name = "cicd10e-open";
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
    let d = $("#cicd10e-drawer");
    if (!d) {
      d = document.createElement("aside");
      d.id = "cicd10e-drawer";
      d.className = "cicd10e-drawer";
      d.setAttribute("role", "dialog");
      d.setAttribute("aria-label", "CI/CD Schedule Settings");
      document.body.appendChild(d);
    }
    return d;
  }

  async function openDrawer(){
    let raw = {}, queue = {count:0, items:[]}, status = {};
    try { raw = await getJSON(API.config); } catch {}
    try { queue = await getJSON(API.queue); } catch {}
    try { status = await getJSON(API.status); } catch {}

    window.__CICD10E_RAW__ = { raw, queue, status };

    const x = defaults(raw);
    const d = ensureDrawer();

    d.innerHTML = `
      <div class="cicd10e-head">
        <div>
          <div class="cicd10e-title">Schedule Settings</div>
          <div class="cicd10e-sub">Production configuration for CI/CD security schedule, triggers, queue policy, runtime controls, evidence retention, release gate and notifications.</div>
        </div>
        <button class="cicd10e-close" type="button" name="cicd10e-close" aria-label="Close schedule settings" data-cicd10e-close="1">×</button>
      </div>

      <div class="cicd10e-body">
        <div class="cicd10e-kpis">
          <div class="cicd10e-kpi"><div class="num">${x.enabled ? "ACTIVE" : "PAUSED"}</div><div class="txt">Schedule status</div></div>
          <div class="cicd10e-kpi"><div class="num">${x.frequency}</div><div class="txt">Frequency</div></div>
          <div class="cicd10e-kpi"><div class="num">${queue.count || 0}</div><div class="txt">Queued jobs</div></div>
          <div class="cicd10e-kpi"><div class="num">${status.latest_status || "n/a"}</div><div class="txt">Latest gate</div></div>
        </div>

        <div class="cicd10e-tabs">
          ${["basic","trigger","queue","runtime","evidence","gate","notify","preview"].map((t,i)=>`<button class="cicd10e-tab ${i===0?"active":""}" type="button" name="tab-${t}" data-cicd10e-tab="${t}">${t[0].toUpperCase()+t.slice(1)}</button>`).join("")}
        </div>

        <section class="cicd10e-section active" data-cicd10e-section="basic">
          <div class="cicd10e-section-title">Basic schedule</div>
          <div class="cicd10e-desc">Core schedule definition for the CI/CD security gate.</div>
          <div class="cicd10e-grid">
            ${full(field("c10e-name","Schedule name",x.name))}
            ${select("c10e-enabled","Status",String(x.enabled),[["true","Active"],["false","Paused"]])}
            ${select("c10e-frequency","Frequency",x.frequency,[["nightly","Nightly"],["every_6_hours","Every 6 hours"],["on_pr","On PR/MR"],["on_push","On push"],["on_release","On release"],["manual","Manual only"],["cron","Custom cron"]])}
            ${field("c10e-time","Run time",x.time)}
            ${field("c10e-timezone","Timezone",x.timezone)}
            ${field("c10e-branch","Default branch",x.branch)}
            ${field("c10e-profile","Scan profile",x.profile)}
            ${full(field("c10e-scope","Scan scope",x.scope,true))}
          </div>
        </section>

        <section class="cicd10e-section" data-cicd10e-section="trigger">
          <div class="cicd10e-section-title">Trigger policy</div>
          <div class="cicd10e-grid">
            ${field("c10e-cron","Cron expression",x.cron)}
            ${select("c10e-run-pr","Run on PR/MR",String(x.runOnPr),[["true","Yes"],["false","No"]])}
            ${select("c10e-run-push","Run on push",String(x.runOnPush),[["true","Yes"],["false","No"]])}
            ${select("c10e-run-release","Run on release",String(x.runOnRelease),[["true","Yes"],["false","No"]])}
          </div>
        </section>

        <section class="cicd10e-section" data-cicd10e-section="queue">
          <div class="cicd10e-section-title">Queue policy</div>
          <div class="cicd10e-grid">
            ${field("c10e-max-parallel","Max parallel jobs",x.maxParallel)}
            ${field("c10e-dedupe-window","Dedupe window minutes",x.dedupeWindowMin)}
            ${field("c10e-queue-max","Queue max items",x.queueMaxItems)}
            ${select("c10e-cancel-old","Cancel old queued jobs",String(x.cancelOldQueued),[["true","Yes"],["false","No"]])}
          </div>
          <div style="margin-top:12px">${queueTable(queue)}</div>
        </section>

        <section class="cicd10e-section" data-cicd10e-section="runtime">
          <div class="cicd10e-section-title">Runtime controls</div>
          <div class="cicd10e-grid">
            ${select("c10e-retry-enabled","Retry enabled",String(x.retryEnabled),[["true","Enabled"],["false","Disabled"]])}
            ${field("c10e-retry-max","Max retry attempts",x.retryMax)}
            ${field("c10e-retry-backoff","Backoff minutes",x.retryBackoffMin)}
            ${field("c10e-scan-timeout","Full scan timeout minutes",x.scanTimeoutMin)}
            ${field("c10e-tool-timeout","Per-tool timeout minutes",x.toolTimeoutMin)}
            ${field("c10e-gate-timeout","Gate timeout minutes",x.gateTimeoutMin)}
          </div>
        </section>

        <section class="cicd10e-section" data-cicd10e-section="evidence">
          <div class="cicd10e-section-title">Evidence retention</div>
          <div class="cicd10e-grid">
            ${select("c10e-keep-reports","Keep reports",String(x.keepReports),[["true","Yes"],["false","No"]])}
            ${select("c10e-keep-screenshots","Keep screenshots",String(x.keepScreenshots),[["true","Yes"],["false","No"]])}
            ${select("c10e-keep-logs","Keep logs",String(x.keepLogs),[["true","Yes"],["false","No"]])}
            ${select("c10e-keep-trace","Keep trace",String(x.keepTrace),[["true","Yes"],["false","No"]])}
            ${field("c10e-keep-days","Retention days",x.keepDays)}
          </div>
        </section>

        <section class="cicd10e-section" data-cicd10e-section="gate">
          <div class="cicd10e-section-title">Release gate behavior</div>
          <div class="cicd10e-grid">
            ${select("c10e-gate-mode","Gate mode",x.gateMode,[["block-critical-review-high","Block critical, review high"],["block-critical-high","Block critical and high"],["audit-only","Audit only"]])}
            ${select("c10e-auto-promote","Auto promote pass",String(x.autoPromotePass),[["false","No"],["true","Yes"]])}
            ${select("c10e-require-evidence","Require evidence",String(x.requireEvidence),[["true","Yes"],["false","No"]])}
            ${select("c10e-require-approval-high","Require approval on high",String(x.requireApprovalOnHigh),[["true","Yes"],["false","No"]])}
          </div>
        </section>

        <section class="cicd10e-section" data-cicd10e-section="notify">
          <div class="cicd10e-section-title">Notification policy</div>
          <div class="cicd10e-grid">
            ${select("c10e-notify-enabled","Notification enabled",String(x.notifyEnabled),[["true","Enabled"],["false","Disabled"]])}
            ${field("c10e-notify-email","Email or target",x.notifyEmail)}
            ${select("c10e-notify-start","Notify on start",String(x.notifyOnStart),[["false","No"],["true","Yes"]])}
            ${select("c10e-notify-pass","Notify on pass",String(x.notifyOnPass),[["false","No"],["true","Yes"]])}
            ${select("c10e-notify-fail","Notify on fail",String(x.notifyOnFail),[["true","Yes"],["false","No"]])}
            ${select("c10e-webhook-enabled","Webhook enabled",String(x.webhookEnabled),[["false","No"],["true","Yes"]])}
            ${full(field("c10e-webhook-url","Webhook URL",x.webhookUrl))}
          </div>
        </section>

        <section class="cicd10e-section" data-cicd10e-section="preview">
          <div class="cicd10e-section-title">Configuration preview</div>
          <pre class="cicd10e-preview" id="cicd10e-preview-box"></pre>
        </section>

        <div class="cicd10e-actions">
          <button class="cicd10e-action secondary" type="button" name="cicd10e-close2" data-cicd10e-close="1">Close</button>
          <button class="cicd10e-action secondary" type="button" name="cicd10e-preview-refresh" id="cicd10e-preview-refresh">Refresh preview</button>
          <button class="cicd10e-action primary" type="button" name="cicd10e-save" id="cicd10e-save">Save settings</button>
        </div>
      </div>
    `;

    d.classList.add("open");
    refreshPreview();
    console.log("[CICD-SCHEDULER-PRODUCT-V10E] opened", { raw, queue, status });
  }

  function refreshPreview(){
    const box = $("#cicd10e-preview-box");
    if (box) box.textContent = JSON.stringify(buildPayload(), null, 2);
  }

  async function save(){
    const payload = buildPayload();
    const res = await postJSON(API.updateConfig, payload);
    window.__CICD10E_LAST_SAVE__ = { payload, res };
    toast("Schedule settings saved");
    const d = $("#cicd10e-drawer");
    if (d) d.classList.remove("open");
    console.log("[CICD-SCHEDULER-PRODUCT-V10E] saved", { payload, res });
  }

  function bind(){
    ensureButton();

    document.addEventListener("click", function(e){
      const tab = e.target.closest("[data-cicd10e-tab]");
      if (tab) {
        const name = tab.getAttribute("data-cicd10e-tab");
        $$(".cicd10e-tab").forEach(x => x.classList.toggle("active", x === tab));
        $$(".cicd10e-section").forEach(x => x.classList.toggle("active", x.getAttribute("data-cicd10e-section") === name));
        if (name === "preview") refreshPreview();
      }

      if (e.target.closest("[data-cicd10e-close]")) {
        const d = $("#cicd10e-drawer");
        if (d) d.classList.remove("open");
      }

      if (e.target.closest("#cicd10e-preview-refresh")) {
        e.preventDefault();
        refreshPreview();
        toast("Preview refreshed");
      }

      if (e.target.closest("#cicd10e-save")) {
        e.preventDefault();
        save().catch(err => {
          console.error("[CICD-SCHEDULER-PRODUCT-V10E] save failed", err);
          toast("Save failed");
        });
      }
    }, true);

    document.addEventListener("input", function(e){
      if (e.target && e.target.id && e.target.id.startsWith("c10e-")) refreshPreview();
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

    console.log("[CICD-SCHEDULER-PRODUCT-V10E] installed", API);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bind);
  else bind();
})();

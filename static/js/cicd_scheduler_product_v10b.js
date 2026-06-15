/* CICD_SCHEDULER_PRODUCT_V10B_HARDFIX */
(function () {
  if (window.__CICD_SCHEDULER_PRODUCT_V10B__) return;
  window.__CICD_SCHEDULER_PRODUCT_V10B__ = true;

  const API = {
    config: "/api/v1/cicd/config",
    updateConfig: "/api/v1/cicd/config/update",
    queue: "/api/v1/cicd/queue",
    status: "/api/v1/cicd/status"
  };

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

  function cookie(name) {
    for (const p of document.cookie.split(";").map(x => x.trim())) {
      if (p.startsWith(name + "=")) return decodeURIComponent(p.slice(name.length + 1));
    }
    return "";
  }

  function headers(json) {
    const token = cookie("vsp_csrf");
    const h = { "Accept": "application/json" };
    if (json) h["Content-Type"] = "application/json";
    if (token) {
      h["X-CSRF-Token"] = token;
      h["X-CSRFToken"] = token;
      h["X-VSP-CSRF"] = token;
    }
    return h;
  }

  async function getJSON(url) {
    const res = await fetch(url, { method: "GET", headers: headers(false), credentials: "same-origin" });
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

  function toast(msg, kind) {
    let t = $("#vsp-action-toast");
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
    setTimeout(() => t.classList.remove("show"), 3600);
  }

  function baseConfig(raw) {
    return raw && raw.config ? raw.config : raw || {};
  }

  function defaults(raw) {
    const c = baseConfig(raw);
    const s = c.scheduler || {};
    const concurrency = s.concurrency || {};
    const retry = s.retry || {};
    const timeout = s.timeout || {};
    const retention = s.retention || {};
    const gate = s.gate || {};
    const notification = s.notification || {};
    const webhook = notification.webhook || {};

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
      maxParallel: concurrency.max_parallel || 2,
      dedupeWindowMin: concurrency.dedupe_window_min || 30,
      queueMaxItems: concurrency.queue_max_items || 100,
      cancelOldQueued: concurrency.cancel_old_queued !== false,
      retryEnabled: retry.enabled !== false,
      retryMax: retry.max_attempts || 2,
      retryBackoffMin: retry.backoff_min || 10,
      scanTimeoutMin: timeout.scan_timeout_min || 60,
      toolTimeoutMin: timeout.tool_timeout_min || 20,
      gateTimeoutMin: timeout.gate_timeout_min || 10,
      keepReports: retention.keep_reports !== false,
      keepScreenshots: retention.keep_screenshots !== false,
      keepLogs: retention.keep_logs !== false,
      keepTrace: retention.keep_trace !== false,
      keepDays: retention.keep_days || 30,
      gateMode: gate.mode || "block-critical-review-high",
      autoPromotePass: gate.auto_promote_pass === true,
      requireEvidence: gate.require_evidence !== false,
      requireApprovalOnHigh: gate.require_approval_on_high !== false,
      notifyEnabled: notification.enabled !== false,
      notifyEmail: notification.email || "devsecops@company.local",
      notifyOnStart: notification.on_start === true,
      notifyOnPass: notification.on_pass === true,
      notifyOnFail: notification.on_fail !== false,
      webhookEnabled: webhook.enabled === true,
      webhookUrl: webhook.url || ""
    };
  }

  function val(id, fallback) {
    const el = $("#" + id);
    return el && typeof el.value === "string" && el.value.trim() ? el.value.trim() : fallback;
  }

  function boolVal(id, fallback) {
    return val(id, fallback ? "true" : "false") === "true";
  }

  function numVal(id, fallback) {
    const n = Number(val(id, String(fallback)));
    return Number.isFinite(n) ? n : fallback;
  }

  function field(id, label, value, textarea) {
    const input = textarea ? `<textarea id="${id}">${value}</textarea>` : `<input id="${id}" value="${value}">`;
    return `<div class="cicd10b-field"><label>${label}</label>${input}</div>`;
  }

  function select(id, label, value, opts) {
    return `<div class="cicd10b-field"><label>${label}</label><select id="${id}">${
      opts.map(o => {
        const v = Array.isArray(o) ? o[0] : o;
        const t = Array.isArray(o) ? o[1] : o;
        return `<option value="${v}" ${String(value) === String(v) ? "selected" : ""}>${t}</option>`;
      }).join("")
    }</select></div>`;
  }

  function full(x) { return `<div class="full">${x}</div>`; }

  function ensureButton() {
    let b = $("#cicd10b-open-schedule");
    if (!b) {
      b = document.createElement("button");
      b.id = "cicd10b-open-schedule";
      b.type = "button";
      b.textContent = "Schedule settings";
      document.body.appendChild(b);
    }
    b.onclick = function (e) {
      e.preventDefault();
      e.stopPropagation();
      openDrawer();
      return false;
    };
    return b;
  }

  function ensureDrawer() {
    let d = $("#cicd10b-drawer");
    if (!d) {
      d = document.createElement("aside");
      d.id = "cicd10b-drawer";
      d.className = "cicd10b-drawer";
      document.body.appendChild(d);
    }
    return d;
  }

  function queueTable(queue) {
    const items = Array.isArray(queue.items) ? queue.items : [];
    if (!items.length) return `<span class="cicd10b-chip warn">No queued jobs</span>`;
    return `
      <table class="cicd10b-queue-table">
        <thead><tr><th>RID</th><th>Branch</th><th>Profile</th><th>Owner</th><th>Status</th><th>Created</th></tr></thead>
        <tbody>
          ${items.slice(0, 20).map(it => `
            <tr>
              <td>${it.rid || "n/a"}</td>
              <td>${it.branch || "n/a"}</td>
              <td>${it.profile || "n/a"}</td>
              <td>${it.owner || "n/a"}</td>
              <td><span class="cicd10b-chip">${it.status || "QUEUED"}</span></td>
              <td>${it.created_at || "n/a"}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;
  }

  async function openDrawer() {
    let raw = {};
    let queue = { count: 0, items: [] };
    let status = {};
    try { raw = await getJSON(API.config); } catch (e) { toast("Cannot load scheduler config", "error"); }
    try { queue = await getJSON(API.queue); } catch (e) {}
    try { status = await getJSON(API.status); } catch (e) {}

    window.__CICD10B_RAW__ = { raw, queue, status };
    const x = defaults(raw);
    const d = ensureDrawer();

    d.innerHTML = `
      <div class="cicd10b-head">
        <div>
          <div class="cicd10b-title">Schedule Settings</div>
          <div class="cicd10b-sub">Production configuration for CI/CD security schedule, trigger policy, queue policy, runtime controls, evidence retention, release gate and notifications.</div>
        </div>
        <button class="cicd10b-close" data-cicd10b-close="1">×</button>
      </div>

      <div class="cicd10b-body">
        <div class="cicd10b-kpis">
          <div class="cicd10b-kpi"><div class="num">${x.enabled ? "ACTIVE" : "PAUSED"}</div><div class="txt">Schedule status</div></div>
          <div class="cicd10b-kpi"><div class="num">${x.frequency}</div><div class="txt">Frequency</div></div>
          <div class="cicd10b-kpi"><div class="num">${queue.count || 0}</div><div class="txt">Queued jobs</div></div>
          <div class="cicd10b-kpi"><div class="num">${status.latest_status || "n/a"}</div><div class="txt">Latest gate</div></div>
        </div>

        <div class="cicd10b-tabs">
          <button class="cicd10b-tab active" data-cicd10b-tab="basic">Basic</button>
          <button class="cicd10b-tab" data-cicd10b-tab="trigger">Trigger</button>
          <button class="cicd10b-tab" data-cicd10b-tab="queue">Queue</button>
          <button class="cicd10b-tab" data-cicd10b-tab="runtime">Runtime</button>
          <button class="cicd10b-tab" data-cicd10b-tab="evidence">Evidence</button>
          <button class="cicd10b-tab" data-cicd10b-tab="gate">Gate</button>
          <button class="cicd10b-tab" data-cicd10b-tab="notify">Notification</button>
          <button class="cicd10b-tab" data-cicd10b-tab="preview">Preview</button>
        </div>

        <section class="cicd10b-section active" data-cicd10b-section="basic">
          <div class="cicd10b-section-title">Basic schedule</div>
          <div class="cicd10b-desc">Core schedule definition for the CI/CD security gate.</div>
          <div class="cicd10b-grid">
            ${full(field("c10b-name", "Schedule name", x.name))}
            ${select("c10b-enabled", "Status", String(x.enabled), [["true","Active"],["false","Paused"]])}
            ${select("c10b-frequency", "Frequency", x.frequency, [["nightly","Nightly"],["every_6_hours","Every 6 hours"],["on_pr","On PR/MR"],["on_push","On push"],["on_release","On release"],["manual","Manual only"],["cron","Custom cron"]])}
            ${field("c10b-time", "Run time", x.time)}
            ${field("c10b-timezone", "Timezone", x.timezone)}
            ${field("c10b-branch", "Default branch", x.branch)}
            ${field("c10b-profile", "Scan profile", x.profile)}
            ${full(field("c10b-scope", "Scan scope", x.scope, true))}
          </div>
        </section>

        <section class="cicd10b-section" data-cicd10b-section="trigger">
          <div class="cicd10b-section-title">Trigger policy</div>
          <div class="cicd10b-desc">Controls which development events create CI/CD security jobs.</div>
          <div class="cicd10b-grid">
            ${field("c10b-cron", "Cron expression", x.cron)}
            ${select("c10b-run-pr", "Run on PR/MR", String(x.runOnPr), [["true","Yes"],["false","No"]])}
            ${select("c10b-run-push", "Run on push", String(x.runOnPush), [["true","Yes"],["false","No"]])}
            ${select("c10b-run-release", "Run on release", String(x.runOnRelease), [["true","Yes"],["false","No"]])}
          </div>
        </section>

        <section class="cicd10b-section" data-cicd10b-section="queue">
          <div class="cicd10b-section-title">Queue policy</div>
          <div class="cicd10b-desc">Queue data is loaded from the CI/CD task queue API.</div>
          <div class="cicd10b-grid">
            ${field("c10b-max-parallel", "Max parallel jobs", x.maxParallel)}
            ${field("c10b-dedupe-window", "Dedupe window minutes", x.dedupeWindowMin)}
            ${field("c10b-queue-max", "Queue max items", x.queueMaxItems)}
            ${select("c10b-cancel-old", "Cancel old queued jobs", String(x.cancelOldQueued), [["true","Yes"],["false","No"]])}
          </div>
          <div style="display:flex;justify-content:flex-end;margin-top:12px">
            <button class="cicd10b-btn secondary" id="cicd10b-refresh-queue">Refresh queue</button>
          </div>
          <div id="cicd10b-queue-box" style="margin-top:12px">${queueTable(queue)}</div>
        </section>

        <section class="cicd10b-section" data-cicd10b-section="runtime">
          <div class="cicd10b-section-title">Runtime controls</div>
          <div class="cicd10b-desc">Retry and timeout policy to prevent stuck CI/CD jobs.</div>
          <div class="cicd10b-grid">
            ${select("c10b-retry-enabled", "Retry enabled", String(x.retryEnabled), [["true","Enabled"],["false","Disabled"]])}
            ${field("c10b-retry-max", "Max retry attempts", x.retryMax)}
            ${field("c10b-retry-backoff", "Backoff minutes", x.retryBackoffMin)}
            ${field("c10b-scan-timeout", "Full scan timeout minutes", x.scanTimeoutMin)}
            ${field("c10b-tool-timeout", "Per-tool timeout minutes", x.toolTimeoutMin)}
            ${field("c10b-gate-timeout", "Gate timeout minutes", x.gateTimeoutMin)}
          </div>
        </section>

        <section class="cicd10b-section" data-cicd10b-section="evidence">
          <div class="cicd10b-section-title">Evidence retention</div>
          <div class="cicd10b-desc">Controls artifact retention for audit, compliance and release evidence.</div>
          <div class="cicd10b-grid">
            ${select("c10b-keep-reports", "Keep reports", String(x.keepReports), [["true","Yes"],["false","No"]])}
            ${select("c10b-keep-screenshots", "Keep screenshots", String(x.keepScreenshots), [["true","Yes"],["false","No"]])}
            ${select("c10b-keep-logs", "Keep logs", String(x.keepLogs), [["true","Yes"],["false","No"]])}
            ${select("c10b-keep-trace", "Keep trace", String(x.keepTrace), [["true","Yes"],["false","No"]])}
            ${field("c10b-keep-days", "Retention days", x.keepDays)}
          </div>
        </section>

        <section class="cicd10b-section" data-cicd10b-section="gate">
          <div class="cicd10b-section-title">Release gate behavior</div>
          <div class="cicd10b-desc">Controls blocking, approval and evidence requirements for release decisions.</div>
          <div class="cicd10b-grid">
            ${select("c10b-gate-mode", "Gate mode", x.gateMode, [["block-critical-review-high","Block critical, review high"],["block-critical-high","Block critical and high"],["audit-only","Audit only"]])}
            ${select("c10b-auto-promote", "Auto promote pass", String(x.autoPromotePass), [["false","No"],["true","Yes"]])}
            ${select("c10b-require-evidence", "Require evidence", String(x.requireEvidence), [["true","Yes"],["false","No"]])}
            ${select("c10b-require-approval-high", "Require approval on high", String(x.requireApprovalOnHigh), [["true","Yes"],["false","No"]])}
          </div>
        </section>

        <section class="cicd10b-section" data-cicd10b-section="notify">
          <div class="cicd10b-section-title">Notification policy</div>
          <div class="cicd10b-desc">Controls notification targets for schedule events and gate decisions.</div>
          <div class="cicd10b-grid">
            ${select("c10b-notify-enabled", "Notification enabled", String(x.notifyEnabled), [["true","Enabled"],["false","Disabled"]])}
            ${field("c10b-notify-email", "Email / target", x.notifyEmail)}
            ${select("c10b-notify-start", "Notify on start", String(x.notifyOnStart), [["false","No"],["true","Yes"]])}
            ${select("c10b-notify-pass", "Notify on pass", String(x.notifyOnPass), [["false","No"],["true","Yes"]])}
            ${select("c10b-notify-fail", "Notify on fail", String(x.notifyOnFail), [["true","Yes"],["false","No"]])}
            ${select("c10b-webhook-enabled", "Webhook enabled", String(x.webhookEnabled), [["false","No"],["true","Yes"]])}
            ${full(field("c10b-webhook-url", "Webhook URL", x.webhookUrl))}
          </div>
        </section>

        <section class="cicd10b-section" data-cicd10b-section="preview">
          <div class="cicd10b-section-title">Configuration preview</div>
          <div class="cicd10b-desc">Review the configuration payload before saving it to the backend.</div>
          <pre class="cicd10b-preview" id="cicd10b-preview-box"></pre>
        </section>

        <div class="cicd10b-actions">
          <button class="cicd10b-btn secondary" data-cicd10b-close="1">Close</button>
          <button class="cicd10b-btn secondary" id="cicd10b-refresh-preview">Refresh preview</button>
          <button class="cicd10b-btn primary" id="cicd10b-save">Save settings</button>
        </div>
      </div>
    `;

    d.classList.add("open");
    refreshPreview();
    console.log("[CICD-SCHEDULER-PRODUCT-V10B] opened", { raw, queue, status });
  }

  function buildPayload() {
    const raw = window.__CICD10B_RAW__ || {};
    const base = baseConfig(raw.raw || {});
    return {
      ...base,
      source: "CICD_SCHEDULER_PRODUCT_V10B",
      rid: base.rid || ("SCHED_PRODUCT_" + new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0,14)),
      scheduler: {
        enabled: boolVal("c10b-enabled", true),
        name: val("c10b-name", "Production CI/CD security gate"),
        frequency: val("c10b-frequency", "nightly"),
        cron: val("c10b-cron", "0 2 * * *"),
        time: val("c10b-time", "02:00"),
        timezone: val("c10b-timezone", "Asia/Ho_Chi_Minh"),
        branch: val("c10b-branch", "main"),
        profile: val("c10b-profile", "commercial-full-gate"),
        scope: val("c10b-scope", "SAST, SCA, Secrets, IaC, Container, Final Gate"),
        run_on_pr: boolVal("c10b-run-pr", true),
        run_on_push: boolVal("c10b-run-push", false),
        run_on_release: boolVal("c10b-run-release", true),
        concurrency: {
          max_parallel: numVal("c10b-max-parallel", 2),
          dedupe_window_min: numVal("c10b-dedupe-window", 30),
          queue_max_items: numVal("c10b-queue-max", 100),
          cancel_old_queued: boolVal("c10b-cancel-old", true)
        },
        retry: {
          enabled: boolVal("c10b-retry-enabled", true),
          max_attempts: numVal("c10b-retry-max", 2),
          backoff_min: numVal("c10b-retry-backoff", 10)
        },
        timeout: {
          scan_timeout_min: numVal("c10b-scan-timeout", 60),
          tool_timeout_min: numVal("c10b-tool-timeout", 20),
          gate_timeout_min: numVal("c10b-gate-timeout", 10)
        },
        retention: {
          keep_reports: boolVal("c10b-keep-reports", true),
          keep_screenshots: boolVal("c10b-keep-screenshots", true),
          keep_logs: boolVal("c10b-keep-logs", true),
          keep_trace: boolVal("c10b-keep-trace", true),
          keep_days: numVal("c10b-keep-days", 30)
        },
        gate: {
          mode: val("c10b-gate-mode", "block-critical-review-high"),
          auto_promote_pass: boolVal("c10b-auto-promote", false),
          require_evidence: boolVal("c10b-require-evidence", true),
          require_approval_on_high: boolVal("c10b-require-approval-high", true)
        },
        notification: {
          enabled: boolVal("c10b-notify-enabled", true),
          email: val("c10b-notify-email", "devsecops@company.local"),
          on_start: boolVal("c10b-notify-start", false),
          on_pass: boolVal("c10b-notify-pass", false),
          on_fail: boolVal("c10b-notify-fail", true),
          webhook: {
            enabled: boolVal("c10b-webhook-enabled", false),
            url: val("c10b-webhook-url", "")
          }
        },
        updated_at: new Date().toISOString()
      }
    };
  }

  function validate() {
    $$(".cicd10b-invalid").forEach(el => el.classList.remove("cicd10b-invalid"));
    const required = ["c10b-name", "c10b-timezone", "c10b-branch", "c10b-profile"];
    const nums = ["c10b-max-parallel", "c10b-dedupe-window", "c10b-queue-max", "c10b-retry-max", "c10b-retry-backoff", "c10b-scan-timeout", "c10b-tool-timeout", "c10b-gate-timeout", "c10b-keep-days"];
    let ok = true;
    required.forEach(id => {
      const el = $("#" + id);
      if (!el || !el.value.trim()) { if (el) el.classList.add("cicd10b-invalid"); ok = false; }
    });
    nums.forEach(id => {
      const el = $("#" + id);
      const n = el ? Number(el.value) : NaN;
      if (!Number.isFinite(n) || n < 0) { if (el) el.classList.add("cicd10b-invalid"); ok = false; }
    });
    if (!ok) toast("Please fix invalid schedule settings", "error");
    return ok;
  }

  function refreshPreview() {
    const box = $("#cicd10b-preview-box");
    if (!box) return;
    try { box.textContent = JSON.stringify(buildPayload(), null, 2); }
    catch (e) { box.textContent = "Cannot build preview: " + e.message; }
  }

  async function save() {
    if (!validate()) return;
    const payload = buildPayload();
    window.__CICD10B_LAST_PAYLOAD__ = payload;
    try {
      const res = await postJSON(API.updateConfig, payload);
      window.__CICD10B_LAST_RESPONSE__ = res;
      toast("Schedule settings saved", "ok");
      console.log("[CICD-SCHEDULER-PRODUCT-V10B] saved", { payload, res });
      const d = $("#cicd10b-drawer");
      if (d) d.classList.remove("open");
    } catch (e) {
      console.error("[CICD-SCHEDULER-PRODUCT-V10B] save failed", e);
      toast("Save failed: HTTP " + (e.status || "ERR"), "error");
    }
  }

  async function refreshQueue() {
    try {
      const queue = await getJSON(API.queue);
      const box = $("#cicd10b-queue-box");
      if (box) box.innerHTML = queueTable(queue);
      toast("Queue refreshed", "ok");
    } catch (e) {
      toast("Queue refresh failed", "error");
    }
  }

  function bindGlobal() {
    document.addEventListener("click", function(e) {
      const tab = e.target.closest("[data-cicd10b-tab]");
      if (tab) {
        const name = tab.getAttribute("data-cicd10b-tab");
        $$(".cicd10b-tab").forEach(x => x.classList.toggle("active", x === tab));
        $$(".cicd10b-section").forEach(x => x.classList.toggle("active", x.getAttribute("data-cicd10b-section") === name));
        if (name === "preview") refreshPreview();
      }

      if (e.target.closest("[data-cicd10b-close]")) {
        const d = $("#cicd10b-drawer");
        if (d) d.classList.remove("open");
      }

      if (e.target.closest("#cicd10b-refresh-preview")) {
        e.preventDefault();
        refreshPreview();
        toast("Preview refreshed", "ok");
      }

      if (e.target.closest("#cicd10b-save")) {
        e.preventDefault();
        e.stopImmediatePropagation();
        save();
      }

      if (e.target.closest("#cicd10b-refresh-queue")) {
        e.preventDefault();
        refreshQueue();
      }
    }, true);

    document.addEventListener("input", function(e) {
      if (e.target && e.target.id && e.target.id.startsWith("c10b-")) refreshPreview();
    }, true);
  }

  function boot() {
    ensureButton();
    bindGlobal();
    console.log("[CICD-SCHEDULER-PRODUCT-V10B] installed", API);
    window.openCICDScheduleSettings = openDrawer;
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();


/* CICD_SCHEDULER_PRODUCT_V10C_EXPOSE_FIX */
(function(){
  function exposeWhenReady(){
    try {
      if (typeof openDrawer === "function") {
        window.openCICDScheduleSettings = function(){
          return openDrawer();
        };

        try {
          if (window.parent && window.parent !== window) {
            window.parent.openCICDScheduleSettings = function(){
              var frame = window.parent.document.querySelector('iframe[src*="/panels/cicd.html"], iframe#panel-frame, iframe');
              if (frame && frame.contentWindow && typeof frame.contentWindow.openCICDScheduleSettings === "function") {
                return frame.contentWindow.openCICDScheduleSettings();
              }
              return window.openCICDScheduleSettings();
            };
          }
        } catch(e) {}

        var btn = document.getElementById("cicd10b-open-schedule");
        if (btn) {
          btn.onclick = function(e){
            if (e) {
              e.preventDefault();
              e.stopPropagation();
            }
            return openDrawer();
          };
          btn.textContent = "Schedule settings";
          btn.style.display = "inline-flex";
          btn.style.alignItems = "center";
          btn.style.justifyContent = "center";
        }

        console.log("[CICD-SCHEDULER-PRODUCT-V10C] exposed openCICDScheduleSettings");
        return true;
      }
    } catch(e) {
      console.error("[CICD-SCHEDULER-PRODUCT-V10C] expose failed", e);
    }
    return false;
  }

  if (!exposeWhenReady()) {
    var n = 0;
    var t = setInterval(function(){
      n++;
      if (exposeWhenReady() || n > 20) clearInterval(t);
    }, 250);
  }
})();


/* CICD_SCHEDULER_PRODUCT_V10D_FORM_POLISH */
(function(){
  if (window.__CICD_SCHEDULER_PRODUCT_V10D__) return;
  window.__CICD_SCHEDULER_PRODUCT_V10D__ = true;

  function polishScheduleForm(){
    var root = document.getElementById("cicd10b-drawer");
    if (!root) return;

    root.setAttribute("role", "dialog");
    root.setAttribute("aria-label", "CI/CD Schedule Settings");

    root.querySelectorAll("input, select, textarea").forEach(function(el){
      if (!el.id) {
        el.id = "cicd10b-field-" + Math.random().toString(36).slice(2, 10);
      }

      if (!el.getAttribute("name")) {
        el.setAttribute("name", el.id);
      }

      if (!el.getAttribute("autocomplete")) {
        el.setAttribute("autocomplete", "off");
      }

      if (!el.getAttribute("aria-label")) {
        var label = "";
        var wrap = el.closest(".cicd10b-field");
        if (wrap) {
          var lab = wrap.querySelector("label");
          if (lab) label = (lab.textContent || "").trim();
        }
        el.setAttribute("aria-label", label || el.id);
      }
    });

    var closeBtn = root.querySelector(".cicd10b-close");
    if (closeBtn) {
      closeBtn.setAttribute("aria-label", "Close schedule settings");
      closeBtn.setAttribute("type", "button");
    }

    root.querySelectorAll("button").forEach(function(btn){
      if (!btn.getAttribute("type")) btn.setAttribute("type", "button");
    });

    console.log("[CICD-SCHEDULER-PRODUCT-V10D] form polished");
  }

  var original = window.openCICDScheduleSettings;
  if (typeof original === "function") {
    window.openCICDScheduleSettings = function(){
      var ret = original();
      setTimeout(polishScheduleForm, 450);
      setTimeout(polishScheduleForm, 1000);
      return ret;
    };
  }

  document.addEventListener("click", function(e){
    if (e.target && e.target.closest && e.target.closest("#cicd10b-open-schedule")) {
      setTimeout(polishScheduleForm, 450);
      setTimeout(polishScheduleForm, 1000);
    }
  }, true);

  var mo = new MutationObserver(function(){
    polishScheduleForm();
  });

  mo.observe(document.body, { childList: true, subtree: true });

  setTimeout(polishScheduleForm, 1000);
})();

/* CICD_SCHEDULER_SETTINGS_COMPLETE_V9 */
(function () {
  if (window.__CICD_SCHEDULER_SETTINGS_COMPLETE_V9__) return;
  window.__CICD_SCHEDULER_SETTINGS_COMPLETE_V9__ = true;

  const API = {
    config: "/api/v1/cicd/config",
    updateConfig: "/api/v1/cicd/config/update",
    queue: "/api/v1/cicd/queue",
    create: "/api/v1/cicd/task/create",
    status: "/api/v1/cicd/status"
  };

  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }

  function getCookie(name) {
    for (const p of document.cookie.split(";").map(x => x.trim())) {
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
    qsa(".vsp-modal-backdrop.open,.vsp-drawer.open,.v9-sch-drawer.open").forEach(el => el.classList.remove("open"));
  }

  function val(id, fallback) {
    const el = qs("#" + id);
    return el && typeof el.value === "string" && el.value.trim() ? el.value.trim() : fallback;
  }

  function boolVal(id, fallback) {
    return val(id, fallback ? "true" : "false") === "true";
  }

  function numVal(id, fallback) {
    const n = Number(val(id, String(fallback)));
    return Number.isFinite(n) ? n : fallback;
  }

  function baseConfig(raw) {
    return raw && raw.config ? raw.config : raw || {};
  }

  function defaults(raw) {
    const c = baseConfig(raw);
    const s = c.scheduler || {};
    const ret = s.retention || {};
    const retry = s.retry || {};
    const timeout = s.timeout || {};
    const notify = s.notification || {};
    const gate = s.gate || {};
    const concurrency = s.concurrency || {};
    const webhook = notify.webhook || {};

    return {
      enabled: s.enabled !== false,
      name: s.name || "Nightly CI/CD security gate",
      frequency: s.frequency || "nightly",
      cron: s.cron || "0 2 * * *",
      time: s.time || "02:00",
      timezone: s.timezone || "Asia/Ho_Chi_Minh",
      branch: s.branch || c.branch || "main",
      profile: s.profile || c.profile || "commercial-full-gate",
      scope: s.scope || "SAST, SCA, Secrets, IaC, Container, Final Gate, Evidence Pack",
      runOnPr: s.run_on_pr !== false,
      runOnPush: s.run_on_push === true,
      runOnRelease: s.run_on_release !== false,

      maxParallel: concurrency.max_parallel || 2,
      dedupeWindowMin: concurrency.dedupe_window_min || 30,
      cancelOldQueued: concurrency.cancel_old_queued !== false,
      queueMaxItems: concurrency.queue_max_items || 100,

      retryEnabled: retry.enabled !== false,
      retryMax: retry.max_attempts || 2,
      retryBackoffMin: retry.backoff_min || 10,

      scanTimeoutMin: timeout.scan_timeout_min || 60,
      toolTimeoutMin: timeout.tool_timeout_min || 20,
      gateTimeoutMin: timeout.gate_timeout_min || 10,

      keepReports: ret.keep_reports !== false,
      keepScreenshots: ret.keep_screenshots !== false,
      keepLogs: ret.keep_logs !== false,
      keepTrace: ret.keep_trace !== false,
      keepDays: ret.keep_days || 30,

      gateMode: gate.mode || "block-critical-review-high",
      autoPromotePass: gate.auto_promote_pass === true,
      requireEvidence: gate.require_evidence !== false,
      requireApprovalOnHigh: gate.require_approval_on_high !== false,

      notifyEnabled: notify.enabled !== false,
      notifyEmail: notify.email || "devsecops@company.local",
      notifyOnPass: notify.on_pass === true,
      notifyOnFail: notify.on_fail !== false,
      notifyOnStart: notify.on_start === true,
      webhookEnabled: webhook.enabled === true,
      webhookUrl: webhook.url || "",

      source: c.source || "CICD_SCHEDULER_SETTINGS_COMPLETE_V9",
      rid: c.rid || ""
    };
  }

  function ensureDrawer() {
    let d = qs("#v9-sch-drawer");
    if (!d) {
      d = document.createElement("aside");
      d.id = "v9-sch-drawer";
      d.className = "v9-sch-drawer";
      document.body.appendChild(d);
    }
    return d;
  }

  function field(id, label, value, type) {
    const tag = type === "textarea"
      ? `<textarea id="${id}">${value}</textarea>`
      : `<input id="${id}" value="${value}">`;
    return `<div class="v9-field"><label>${label}</label>${tag}</div>`;
  }

  function select(id, label, value, options) {
    return `<div class="v9-field"><label>${label}</label><select id="${id}">${
      options.map(o => {
        const v = Array.isArray(o) ? o[0] : o;
        const t = Array.isArray(o) ? o[1] : o;
        return `<option value="${v}" ${String(value) === String(v) ? "selected" : ""}>${t}</option>`;
      }).join("")
    }</select></div>`;
  }

  function full(inner) {
    return `<div class="full">${inner}</div>`;
  }

  async function openScheduler() {
    let raw = {};
    let queue = { count: 0, items: [] };
    let status = {};

    try { raw = await getJSON(API.config); } catch (e) { toast("Config API failed, using defaults", "warn"); }
    try { queue = await getJSON(API.queue); } catch (e) { console.warn("[V9] queue failed", e); }
    try { status = await getJSON(API.status); } catch (e) { console.warn("[V9] status failed", e); }

    window.__CICD_SCHEDULER_V9_RAW__ = { raw, queue, status };

    const s = defaults(raw);
    const d = ensureDrawer();

    d.innerHTML = `
      <div class="v9-sch-head">
        <div>
          <div class="v9-sch-title">CI/CD Scheduler Settings</div>
          <div class="v9-sch-sub">Hoàn thiện cài đặt lịch chạy, queue, retry, timeout, evidence, gate và notification. Dữ liệu lưu qua API thật.</div>
        </div>
        <button class="v9-sch-close" data-v9-close="1">×</button>
      </div>

      <div class="v9-sch-body">
        <div class="v9-summary-grid">
          <div class="v9-kpi"><div class="num">${s.enabled ? "ACTIVE" : "PAUSED"}</div><div class="txt">Schedule status</div></div>
          <div class="v9-kpi"><div class="num">${s.frequency}</div><div class="txt">Frequency</div></div>
          <div class="v9-kpi"><div class="num">${queue.count || 0}</div><div class="txt">Queued tasks</div></div>
          <div class="v9-kpi"><div class="num">${status.latest_status || "n/a"}</div><div class="txt">Latest gate</div></div>
        </div>

        <div class="v9-sch-tabs">
          <button class="v9-sch-tab active" data-v9-tab="basic">Basic</button>
          <button class="v9-sch-tab" data-v9-tab="queue">Queue</button>
          <button class="v9-sch-tab" data-v9-tab="runtime">Runtime</button>
          <button class="v9-sch-tab" data-v9-tab="evidence">Evidence</button>
          <button class="v9-sch-tab" data-v9-tab="gate">Gate</button>
          <button class="v9-sch-tab" data-v9-tab="notify">Notify</button>
          <button class="v9-sch-tab" data-v9-tab="preview">Preview</button>
        </div>

        <section class="v9-sch-section active" data-v9-section="basic">
          <div class="v9-sch-section-title">Basic schedule</div>
          <div class="v9-sch-section-desc">Cấu hình lịch chạy cơ bản cho CI/CD security gate.</div>
          <div class="v9-sch-grid">
            ${full(field("v9-name", "Schedule name", s.name))}
            ${select("v9-enabled", "Status", String(s.enabled), [["true","Active"],["false","Paused"]])}
            ${select("v9-frequency", "Frequency", s.frequency, [["nightly","Nightly"],["every_6_hours","Every 6 hours"],["on_pr","On PR/MR"],["on_push","On push"],["on_release","On release"],["manual","Manual only"],["cron","Custom cron"]])}
            ${field("v9-cron", "Cron expression", s.cron)}
            ${field("v9-time", "Time", s.time)}
            ${field("v9-timezone", "Timezone", s.timezone)}
            ${field("v9-branch", "Branch", s.branch)}
            ${field("v9-profile", "Profile", s.profile)}
            ${full(field("v9-scope", "Scope", s.scope, "textarea"))}
            ${select("v9-run-pr", "Run on PR/MR", String(s.runOnPr), [["true","Yes"],["false","No"]])}
            ${select("v9-run-push", "Run on push", String(s.runOnPush), [["true","Yes"],["false","No"]])}
            ${select("v9-run-release", "Run on release", String(s.runOnRelease), [["true","Yes"],["false","No"]])}
          </div>
        </section>

        <section class="v9-sch-section" data-v9-section="queue">
          <div class="v9-sch-section-title">Queue management</div>
          <div class="v9-sch-section-desc">Điều khiển hàng đợi task CI/CD và xem queue thật từ backend.</div>
          <div class="v9-sch-grid">
            ${field("v9-max-parallel", "Max parallel jobs", s.maxParallel)}
            ${field("v9-dedupe-window", "Dedupe window minutes", s.dedupeWindowMin)}
            ${field("v9-queue-max", "Queue max items", s.queueMaxItems)}
            ${select("v9-cancel-old", "Cancel old queued jobs", String(s.cancelOldQueued), [["true","Yes"],["false","No"]])}
          </div>
          <div style="margin-top:14px;display:flex;gap:8px;justify-content:flex-end">
            <button class="v9-btn secondary" id="v9-refresh-queue">Refresh queue</button>
            <button class="v9-btn warn" id="v9-create-test-task">Create test task</button>
          </div>
          <div id="v9-queue-box" style="margin-top:12px">${renderQueue(queue)}</div>
        </section>

        <section class="v9-sch-section" data-v9-section="runtime">
          <div class="v9-sch-section-title">Retry & timeout</div>
          <div class="v9-sch-section-desc">Chống treo pipeline: retry có kiểm soát và timeout rõ ràng.</div>
          <div class="v9-sch-grid">
            ${select("v9-retry-enabled", "Retry enabled", String(s.retryEnabled), [["true","Enabled"],["false","Disabled"]])}
            ${field("v9-retry-max", "Max retry attempts", s.retryMax)}
            ${field("v9-retry-backoff", "Backoff minutes", s.retryBackoffMin)}
            ${field("v9-scan-timeout", "Full scan timeout minutes", s.scanTimeoutMin)}
            ${field("v9-tool-timeout", "Per-tool timeout minutes", s.toolTimeoutMin)}
            ${field("v9-gate-timeout", "Gate timeout minutes", s.gateTimeoutMin)}
          </div>
        </section>

        <section class="v9-sch-section" data-v9-section="evidence">
          <div class="v9-sch-section-title">Evidence retention</div>
          <div class="v9-sch-section-desc">Lưu bằng chứng phục vụ audit, SOC, DevSecOps gate và compliance.</div>
          <div class="v9-sch-grid">
            ${select("v9-keep-reports", "Keep reports", String(s.keepReports), [["true","Yes"],["false","No"]])}
            ${select("v9-keep-screenshots", "Keep screenshots", String(s.keepScreenshots), [["true","Yes"],["false","No"]])}
            ${select("v9-keep-logs", "Keep logs", String(s.keepLogs), [["true","Yes"],["false","No"]])}
            ${select("v9-keep-trace", "Keep trace", String(s.keepTrace), [["true","Yes"],["false","No"]])}
            ${field("v9-keep-days", "Retention days", s.keepDays)}
          </div>
        </section>

        <section class="v9-sch-section" data-v9-section="gate">
          <div class="v9-sch-section-title">Gate behavior</div>
          <div class="v9-sch-section-desc">Quy định khi nào chặn release, khi nào review, khi nào cho pass.</div>
          <div class="v9-sch-grid">
            ${select("v9-gate-mode", "Gate mode", s.gateMode, [["block-critical-review-high","Block critical, review high"],["block-critical-high","Block critical and high"],["audit-only","Audit only"]])}
            ${select("v9-auto-promote", "Auto promote pass", String(s.autoPromotePass), [["false","No"],["true","Yes"]])}
            ${select("v9-require-evidence", "Require evidence", String(s.requireEvidence), [["true","Yes"],["false","No"]])}
            ${select("v9-require-approval-high", "Require approval on high", String(s.requireApprovalOnHigh), [["true","Yes"],["false","No"]])}
          </div>
        </section>

        <section class="v9-sch-section" data-v9-section="notify">
          <div class="v9-sch-section-title">Notification</div>
          <div class="v9-sch-section-desc">Thông báo khi task start, pass, fail hoặc khi gate cần review.</div>
          <div class="v9-sch-grid">
            ${select("v9-notify-enabled", "Notification enabled", String(s.notifyEnabled), [["true","Enabled"],["false","Disabled"]])}
            ${field("v9-notify-email", "Email / target", s.notifyEmail)}
            ${select("v9-notify-start", "Notify on start", String(s.notifyOnStart), [["false","No"],["true","Yes"]])}
            ${select("v9-notify-pass", "Notify on pass", String(s.notifyOnPass), [["false","No"],["true","Yes"]])}
            ${select("v9-notify-fail", "Notify on fail", String(s.notifyOnFail), [["true","Yes"],["false","No"]])}
            ${select("v9-webhook-enabled", "Webhook enabled", String(s.webhookEnabled), [["false","No"],["true","Yes"]])}
            ${full(field("v9-webhook-url", "Webhook URL", s.webhookUrl))}
          </div>
        </section>

        <section class="v9-sch-section" data-v9-section="preview">
          <div class="v9-sch-section-title">Config preview</div>
          <div class="v9-sch-section-desc">Xem JSON sẽ lưu xuống backend trước khi Save.</div>
          <pre class="v9-preview" id="v9-preview-box"></pre>
        </section>

        <div class="v9-actions">
          <button class="v9-btn secondary" data-v9-close="1">Close</button>
          <button class="v9-btn secondary" id="v9-preview-refresh">Refresh preview</button>
          <button class="v9-btn primary" id="v9-save-settings">Save scheduler settings</button>
        </div>
      </div>
    `;

    closeAll();
    d.classList.add("open");
    refreshPreview();
    console.log("[CICD-SCHEDULER-COMPLETE-V9] opened", { config: raw, queue, status });
  }

  function renderQueue(queue) {
    const items = Array.isArray(queue.items) ? queue.items : [];
    if (!items.length) return `<div class="v9-chip warn">Queue empty</div>`;

    return `
      <table class="v9-queue-table">
        <thead>
          <tr>
            <th>RID</th>
            <th>Branch</th>
            <th>Profile</th>
            <th>Owner</th>
            <th>Status</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          ${items.slice(0, 20).map(it => `
            <tr>
              <td>${it.rid || "n/a"}</td>
              <td>${it.branch || "n/a"}</td>
              <td>${it.profile || "n/a"}</td>
              <td>${it.owner || "n/a"}</td>
              <td><span class="v9-chip">${it.status || "QUEUED"}</span></td>
              <td>${it.created_at || "n/a"}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;
  }

  function buildPayload() {
    const current = window.__CICD_SCHEDULER_V9_RAW__ || {};
    const base = baseConfig(current.raw || {});

    return {
      ...base,
      source: "CICD_SCHEDULER_SETTINGS_COMPLETE_V9",
      rid: base.rid || ("SCHED_V9_" + new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)),
      scheduler: {
        enabled: boolVal("v9-enabled", true),
        name: val("v9-name", "Nightly CI/CD security gate"),
        frequency: val("v9-frequency", "nightly"),
        cron: val("v9-cron", "0 2 * * *"),
        time: val("v9-time", "02:00"),
        timezone: val("v9-timezone", "Asia/Ho_Chi_Minh"),
        branch: val("v9-branch", "main"),
        profile: val("v9-profile", "commercial-full-gate"),
        scope: val("v9-scope", "SAST, SCA, Secrets, IaC, Container, Final Gate"),
        run_on_pr: boolVal("v9-run-pr", true),
        run_on_push: boolVal("v9-run-push", false),
        run_on_release: boolVal("v9-run-release", true),

        concurrency: {
          max_parallel: numVal("v9-max-parallel", 2),
          dedupe_window_min: numVal("v9-dedupe-window", 30),
          queue_max_items: numVal("v9-queue-max", 100),
          cancel_old_queued: boolVal("v9-cancel-old", true)
        },

        retry: {
          enabled: boolVal("v9-retry-enabled", true),
          max_attempts: numVal("v9-retry-max", 2),
          backoff_min: numVal("v9-retry-backoff", 10)
        },

        timeout: {
          scan_timeout_min: numVal("v9-scan-timeout", 60),
          tool_timeout_min: numVal("v9-tool-timeout", 20),
          gate_timeout_min: numVal("v9-gate-timeout", 10)
        },

        retention: {
          keep_reports: boolVal("v9-keep-reports", true),
          keep_screenshots: boolVal("v9-keep-screenshots", true),
          keep_logs: boolVal("v9-keep-logs", true),
          keep_trace: boolVal("v9-keep-trace", true),
          keep_days: numVal("v9-keep-days", 30)
        },

        gate: {
          mode: val("v9-gate-mode", "block-critical-review-high"),
          auto_promote_pass: boolVal("v9-auto-promote", false),
          require_evidence: boolVal("v9-require-evidence", true),
          require_approval_on_high: boolVal("v9-require-approval-high", true)
        },

        notification: {
          enabled: boolVal("v9-notify-enabled", true),
          email: val("v9-notify-email", "devsecops@company.local"),
          on_start: boolVal("v9-notify-start", false),
          on_pass: boolVal("v9-notify-pass", false),
          on_fail: boolVal("v9-notify-fail", true),
          webhook: {
            enabled: boolVal("v9-webhook-enabled", false),
            url: val("v9-webhook-url", "")
          }
        },

        updated_at: new Date().toISOString()
      }
    };
  }

  function validate() {
    const required = ["v9-name", "v9-timezone", "v9-branch", "v9-profile"];
    let ok = true;
    qsa(".v9-invalid").forEach(el => el.classList.remove("v9-invalid"));

    for (const id of required) {
      const el = qs("#" + id);
      if (!el || !el.value.trim()) {
        if (el) el.classList.add("v9-invalid");
        ok = false;
      }
    }

    const nums = ["v9-max-parallel", "v9-dedupe-window", "v9-queue-max", "v9-retry-max", "v9-retry-backoff", "v9-scan-timeout", "v9-tool-timeout", "v9-gate-timeout", "v9-keep-days"];
    for (const id of nums) {
      const el = qs("#" + id);
      const n = el ? Number(el.value) : NaN;
      if (!Number.isFinite(n) || n < 0) {
        if (el) el.classList.add("v9-invalid");
        ok = false;
      }
    }

    if (!ok) toast("Please fix invalid scheduler fields", "error");
    return ok;
  }

  function refreshPreview() {
    const box = qs("#v9-preview-box");
    if (!box) return;
    try {
      box.textContent = JSON.stringify(buildPayload(), null, 2);
    } catch (e) {
      box.textContent = "Preview error: " + e.message;
    }
  }

  async function saveSettings() {
    if (!validate()) return;

    const payload = buildPayload();
    window.__CICD_SCHEDULER_V9_LAST_PAYLOAD__ = payload;

    try {
      const res = await postJSON(API.updateConfig, payload);
      window.__CICD_SCHEDULER_V9_LAST_RESPONSE__ = res;
      toast("Scheduler settings saved", "ok");
      console.log("[CICD-SCHEDULER-COMPLETE-V9] saved", { payload, res });
      const d = qs("#v9-sch-drawer");
      if (d) d.classList.remove("open");
    } catch (e) {
      console.error("[CICD-SCHEDULER-COMPLETE-V9] save failed", e);
      toast("Save failed: HTTP " + (e.status || "ERR"), "error");
    }
  }

  async function refreshQueueBox() {
    try {
      const queue = await getJSON(API.queue);
      const box = qs("#v9-queue-box");
      if (box) box.innerHTML = renderQueue(queue);
      toast("Queue refreshed: " + (queue.count || 0), "ok");
      console.log("[CICD-SCHEDULER-COMPLETE-V9] queue refreshed", queue);
    } catch (e) {
      toast("Queue refresh failed", "error");
    }
  }

  async function createTestTask() {
    const rid = "CICD_SCHED_TEST_" + new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
    const payload = {
      rid,
      source: "CICD_SCHEDULER_SETTINGS_COMPLETE_V9_TEST",
      repo_url: "scheduler-settings",
      branch: val("v9-branch", "main"),
      profile: val("v9-profile", "commercial-full-gate"),
      gate_policy: val("v9-gate-mode", "block-critical-review-high"),
      tools: val("v9-scope", "SAST,SCA,Secrets,IaC,Container").split(",").map(x => x.trim()).filter(Boolean),
      note: "Created from Scheduler Settings V9",
      status: "QUEUED",
      owner: "DevSecOps",
      created_at: new Date().toISOString()
    };

    try {
      const res = await postJSON(API.create, payload);
      toast("Test task created: " + (res.rid || rid), "ok");
      await refreshQueueBox();
    } catch (e) {
      toast("Create test task failed: HTTP " + (e.status || "ERR"), "error");
    }
  }

  function bindSchedulerButton() {
    const btn = qsa("button,a,[role='button']").find(el => {
      const t = (el.innerText || el.textContent || "").toLowerCase();
      return t.includes("queue") || t.includes("schedule") || t.includes("scheduler");
    });

    if (btn && !btn.dataset.v9SchedulerBound) {
      btn.dataset.v9SchedulerBound = "1";
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopImmediatePropagation();
        openScheduler();
      }, true);
    }
  }

  function boot() {
    bindSchedulerButton();

    document.addEventListener("click", function (e) {
      const tab = e.target.closest("[data-v9-tab]");
      if (tab) {
        const name = tab.getAttribute("data-v9-tab");
        qsa(".v9-sch-tab").forEach(x => x.classList.toggle("active", x === tab));
        qsa(".v9-sch-section").forEach(x => x.classList.toggle("active", x.getAttribute("data-v9-section") === name));
        if (name === "preview") refreshPreview();
      }

      if (e.target.closest("[data-v9-close]")) {
        const d = qs("#v9-sch-drawer");
        if (d) d.classList.remove("open");
      }

      if (e.target.closest("#v9-preview-refresh")) {
        e.preventDefault();
        refreshPreview();
        toast("Preview refreshed", "ok");
      }

      if (e.target.closest("#v9-save-settings")) {
        e.preventDefault();
        e.stopImmediatePropagation();
        saveSettings();
      }

      if (e.target.closest("#v9-refresh-queue")) {
        e.preventDefault();
        refreshQueueBox();
      }

      if (e.target.closest("#v9-create-test-task")) {
        e.preventDefault();
        createTestTask();
      }
    }, true);

    document.addEventListener("input", function (e) {
      if (e.target && e.target.id && e.target.id.startsWith("v9-")) {
        refreshPreview();
      }
    }, true);

    const mo = new MutationObserver(bindSchedulerButton);
    mo.observe(document.body, { childList: true, subtree: true });

    console.log("[CICD-SCHEDULER-SETTINGS-COMPLETE-V9] installed", API);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();

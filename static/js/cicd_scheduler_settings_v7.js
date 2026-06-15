/* CICD_SCHEDULER_SETTINGS_V7 */
(function () {
  if (window.__CICD_SCHEDULER_SETTINGS_V7__) return;
  window.__CICD_SCHEDULER_SETTINGS_V7__ = true;

  const API = {
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

  async function getJSON(url) {
    const res = await fetch(url, {
      method: "GET",
      headers: headers(false),
      credentials: "same-origin"
    });

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

  function ensureDrawer() {
    let drawer = qs("#vsp-scheduler-drawer");
    if (!drawer) {
      drawer = document.createElement("aside");
      drawer.id = "vsp-scheduler-drawer";
      drawer.className = "vsp-drawer";
      document.body.appendChild(drawer);
    }
    return drawer;
  }

  function baseConfig(raw) {
    return raw && raw.config ? raw.config : raw || {};
  }

  function defaults(raw) {
    const c = baseConfig(raw);
    const s = c.scheduler || {};
    const retention = s.retention || {};
    const retry = s.retry || {};
    const timeout = s.timeout || {};
    const notify = s.notification || {};
    const gate = s.gate || {};
    const concurrency = s.concurrency || {};

    return {
      enabled: s.enabled !== false,
      name: s.name || "Nightly CI/CD security gate",
      frequency: s.frequency || "nightly",
      time: s.time || "02:00",
      timezone: s.timezone || "Asia/Ho_Chi_Minh",
      branch: s.branch || c.branch || "main",
      profile: s.profile || c.profile || "commercial-full-gate",
      scope: s.scope || "SAST, SCA, Secrets, IaC, Container, Final Gate, Evidence Pack",

      maxParallel: concurrency.max_parallel || 2,
      dedupeWindowMin: concurrency.dedupe_window_min || 30,
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
      keepDays: retention.keep_days || 30,

      notifyEnabled: notify.enabled !== false,
      notifyEmail: notify.email || "devsecops@company.local",
      notifyOnPass: notify.on_pass === true,
      notifyOnFail: notify.on_fail !== false,

      gateMode: gate.mode || "block-critical-review-high",
      autoPromotePass: gate.auto_promote_pass === true,
      requireEvidence: gate.require_evidence !== false,
      requireApprovalOnHigh: gate.require_approval_on_high !== false
    };
  }

  async function openSchedulerV7() {
    let raw = {};
    try {
      raw = await getJSON(API.config);
      window.__CICD_SCHEDULER_V7_CONFIG__ = raw;
    } catch (e) {
      console.warn("[CICD-SCHEDULER-V7] config load failed", e);
      toast("Scheduler opened with defaults; config API failed", "warn");
    }

    const s = defaults(raw);
    const drawer = ensureDrawer();

    drawer.innerHTML = `
      <div class="vsp-drawer-head">
        <div>
          <div class="vsp-modal-title">CI/CD Scheduler Settings</div>
          <div class="vsp-modal-sub">Commercial schedule policy saved through /api/v1/cicd/config/update</div>
        </div>
        <button class="vsp-modal-close" data-vsp-close-scheduler-v7="1">×</button>
      </div>

      <div class="vsp-drawer-body">
        <div class="vsp-scheduler-v7-summary">
          <div class="vsp-scheduler-v7-kpi"><div class="num">${s.enabled ? "ACTIVE" : "PAUSED"}</div><div class="txt">Schedule status</div></div>
          <div class="vsp-scheduler-v7-kpi"><div class="num">${s.frequency}</div><div class="txt">Frequency</div></div>
          <div class="vsp-scheduler-v7-kpi"><div class="num">${s.time}</div><div class="txt">${s.timezone}</div></div>
          <div class="vsp-scheduler-v7-kpi"><div class="num">${s.keepDays}d</div><div class="txt">Evidence retention</div></div>
        </div>

        <div class="vsp-scheduler-v7-section">
          <div class="vsp-scheduler-v7-title">Basic schedule</div>
          <div class="vsp-scheduler-v7-desc">Cấu hình lịch chạy chính cho CI/CD gate: thời điểm, branch, profile và phạm vi scan.</div>
          <div class="vsp-scheduler-v7-grid">
            <div class="full vsp-scheduler-v7-field">
              <label>Schedule name</label>
              <input id="v7-sch-name" value="${s.name}">
            </div>

            <div class="vsp-scheduler-v7-field">
              <label>Status</label>
              <select id="v7-sch-enabled">
                <option value="true" ${s.enabled ? "selected" : ""}>Active</option>
                <option value="false" ${!s.enabled ? "selected" : ""}>Paused</option>
              </select>
            </div>

            <div class="vsp-scheduler-v7-field">
              <label>Frequency</label>
              <select id="v7-sch-frequency">
                <option value="nightly" ${s.frequency === "nightly" ? "selected" : ""}>Nightly</option>
                <option value="every_6_hours" ${s.frequency === "every_6_hours" ? "selected" : ""}>Every 6 hours</option>
                <option value="on_pr" ${s.frequency === "on_pr" ? "selected" : ""}>On PR/MR</option>
                <option value="manual" ${s.frequency === "manual" ? "selected" : ""}>Manual only</option>
              </select>
            </div>

            <div class="vsp-scheduler-v7-field">
              <label>Time</label>
              <input id="v7-sch-time" value="${s.time}">
            </div>

            <div class="vsp-scheduler-v7-field">
              <label>Timezone</label>
              <input id="v7-sch-timezone" value="${s.timezone}">
            </div>

            <div class="vsp-scheduler-v7-field">
              <label>Branch</label>
              <input id="v7-sch-branch" value="${s.branch}">
            </div>

            <div class="vsp-scheduler-v7-field">
              <label>Profile</label>
              <input id="v7-sch-profile" value="${s.profile}">
            </div>

            <div class="full vsp-scheduler-v7-field">
              <label>Scope</label>
              <textarea id="v7-sch-scope">${s.scope}</textarea>
            </div>
          </div>
        </div>

        <div class="vsp-scheduler-v7-section">
          <div class="vsp-scheduler-v7-title">Concurrency & queue policy</div>
          <div class="vsp-scheduler-v7-desc">Điều khiển số job chạy đồng thời, chống trùng lịch và xử lý job cũ đang chờ.</div>
          <div class="vsp-scheduler-v7-grid">
            <div class="vsp-scheduler-v7-field">
              <label>Max parallel jobs</label>
              <input id="v7-max-parallel" value="${s.maxParallel}">
            </div>
            <div class="vsp-scheduler-v7-field">
              <label>Dedupe window minutes</label>
              <input id="v7-dedupe-window" value="${s.dedupeWindowMin}">
            </div>
            <div class="vsp-scheduler-v7-field">
              <label>Cancel old queued jobs</label>
              <select id="v7-cancel-old">
                <option value="true" ${s.cancelOldQueued ? "selected" : ""}>Yes</option>
                <option value="false" ${!s.cancelOldQueued ? "selected" : ""}>No</option>
              </select>
            </div>
          </div>
        </div>

        <div class="vsp-scheduler-v7-section">
          <div class="vsp-scheduler-v7-title">Retry & timeout</div>
          <div class="vsp-scheduler-v7-desc">Tránh pipeline treo: giới hạn thời gian chạy và retry có kiểm soát.</div>
          <div class="vsp-scheduler-v7-grid">
            <div class="vsp-scheduler-v7-field">
              <label>Retry enabled</label>
              <select id="v7-retry-enabled">
                <option value="true" ${s.retryEnabled ? "selected" : ""}>Enabled</option>
                <option value="false" ${!s.retryEnabled ? "selected" : ""}>Disabled</option>
              </select>
            </div>
            <div class="vsp-scheduler-v7-field">
              <label>Max retry attempts</label>
              <input id="v7-retry-max" value="${s.retryMax}">
            </div>
            <div class="vsp-scheduler-v7-field">
              <label>Backoff minutes</label>
              <input id="v7-retry-backoff" value="${s.retryBackoffMin}">
            </div>
            <div class="vsp-scheduler-v7-field">
              <label>Full scan timeout minutes</label>
              <input id="v7-scan-timeout" value="${s.scanTimeoutMin}">
            </div>
            <div class="vsp-scheduler-v7-field">
              <label>Per-tool timeout minutes</label>
              <input id="v7-tool-timeout" value="${s.toolTimeoutMin}">
            </div>
            <div class="vsp-scheduler-v7-field">
              <label>Gate timeout minutes</label>
              <input id="v7-gate-timeout" value="${s.gateTimeoutMin}">
            </div>
          </div>
        </div>

        <div class="vsp-scheduler-v7-section">
          <div class="vsp-scheduler-v7-title">Evidence retention</div>
          <div class="vsp-scheduler-v7-desc">Lưu artifact phục vụ audit, traceability, compliance và báo cáo gate.</div>
          <div class="vsp-scheduler-v7-grid">
            <div class="vsp-scheduler-v7-field">
              <label>Keep reports</label>
              <select id="v7-keep-reports">
                <option value="true" ${s.keepReports ? "selected" : ""}>Yes</option>
                <option value="false" ${!s.keepReports ? "selected" : ""}>No</option>
              </select>
            </div>
            <div class="vsp-scheduler-v7-field">
              <label>Keep screenshots</label>
              <select id="v7-keep-screenshots">
                <option value="true" ${s.keepScreenshots ? "selected" : ""}>Yes</option>
                <option value="false" ${!s.keepScreenshots ? "selected" : ""}>No</option>
              </select>
            </div>
            <div class="vsp-scheduler-v7-field">
              <label>Keep logs</label>
              <select id="v7-keep-logs">
                <option value="true" ${s.keepLogs ? "selected" : ""}>Yes</option>
                <option value="false" ${!s.keepLogs ? "selected" : ""}>No</option>
              </select>
            </div>
            <div class="vsp-scheduler-v7-field">
              <label>Retention days</label>
              <input id="v7-keep-days" value="${s.keepDays}">
            </div>
          </div>
        </div>

        <div class="vsp-scheduler-v7-section">
          <div class="vsp-scheduler-v7-title">Gate behavior</div>
          <div class="vsp-scheduler-v7-desc">Cấu hình hành vi chặn/review/promote khi có kết quả CI/CD security gate.</div>
          <div class="vsp-scheduler-v7-grid">
            <div class="vsp-scheduler-v7-field">
              <label>Gate mode</label>
              <select id="v7-gate-mode">
                <option value="block-critical-review-high" ${s.gateMode === "block-critical-review-high" ? "selected" : ""}>Block critical, review high</option>
                <option value="block-critical-high" ${s.gateMode === "block-critical-high" ? "selected" : ""}>Block critical and high</option>
                <option value="audit-only" ${s.gateMode === "audit-only" ? "selected" : ""}>Audit only</option>
              </select>
            </div>
            <div class="vsp-scheduler-v7-field">
              <label>Auto promote pass</label>
              <select id="v7-auto-promote">
                <option value="false" ${!s.autoPromotePass ? "selected" : ""}>No</option>
                <option value="true" ${s.autoPromotePass ? "selected" : ""}>Yes</option>
              </select>
            </div>
            <div class="vsp-scheduler-v7-field">
              <label>Require evidence</label>
              <select id="v7-require-evidence">
                <option value="true" ${s.requireEvidence ? "selected" : ""}>Yes</option>
                <option value="false" ${!s.requireEvidence ? "selected" : ""}>No</option>
              </select>
            </div>
            <div class="vsp-scheduler-v7-field">
              <label>Require approval on high</label>
              <select id="v7-require-approval-high">
                <option value="true" ${s.requireApprovalOnHigh ? "selected" : ""}>Yes</option>
                <option value="false" ${!s.requireApprovalOnHigh ? "selected" : ""}>No</option>
              </select>
            </div>
          </div>
        </div>

        <div class="vsp-scheduler-v7-section">
          <div class="vsp-scheduler-v7-title">Notification</div>
          <div class="vsp-scheduler-v7-desc">Gửi thông báo khi gate fail/pass hoặc khi scheduler tạo job mới.</div>
          <div class="vsp-scheduler-v7-grid">
            <div class="vsp-scheduler-v7-field">
              <label>Notification enabled</label>
              <select id="v7-notify-enabled">
                <option value="true" ${s.notifyEnabled ? "selected" : ""}>Enabled</option>
                <option value="false" ${!s.notifyEnabled ? "selected" : ""}>Disabled</option>
              </select>
            </div>
            <div class="vsp-scheduler-v7-field">
              <label>Email / webhook target</label>
              <input id="v7-notify-email" value="${s.notifyEmail}">
            </div>
            <div class="vsp-scheduler-v7-field">
              <label>Notify on pass</label>
              <select id="v7-notify-pass">
                <option value="false" ${!s.notifyOnPass ? "selected" : ""}>No</option>
                <option value="true" ${s.notifyOnPass ? "selected" : ""}>Yes</option>
              </select>
            </div>
            <div class="vsp-scheduler-v7-field">
              <label>Notify on fail</label>
              <select id="v7-notify-fail">
                <option value="true" ${s.notifyOnFail ? "selected" : ""}>Yes</option>
                <option value="false" ${!s.notifyOnFail ? "selected" : ""}>No</option>
              </select>
            </div>
          </div>
        </div>

        <div class="vsp-modal-actions">
          <button class="vsp-btn-secondary" data-vsp-close-scheduler-v7="1">Close</button>
          <button class="vsp-btn-primary" id="v7-save-scheduler">Save scheduler settings</button>
        </div>
      </div>
    `;

    closeAll();
    drawer.classList.add("open");
    console.log("[CICD-SCHEDULER-SETTINGS-V7] loaded", s);
  }

  async function saveV7() {
    const current = window.__CICD_SCHEDULER_V7_CONFIG__ || {};
    const base = baseConfig(current);

    const scheduler = {
      enabled: boolVal("v7-sch-enabled", true),
      name: val("v7-sch-name", "Nightly CI/CD security gate"),
      frequency: val("v7-sch-frequency", "nightly"),
      time: val("v7-sch-time", "02:00"),
      timezone: val("v7-sch-timezone", "Asia/Ho_Chi_Minh"),
      branch: val("v7-sch-branch", "main"),
      profile: val("v7-sch-profile", "commercial-full-gate"),
      scope: val("v7-sch-scope", "SAST, SCA, Secrets, IaC, Container, Final Gate"),

      concurrency: {
        max_parallel: numVal("v7-max-parallel", 2),
        dedupe_window_min: numVal("v7-dedupe-window", 30),
        cancel_old_queued: boolVal("v7-cancel-old", true)
      },

      retry: {
        enabled: boolVal("v7-retry-enabled", true),
        max_attempts: numVal("v7-retry-max", 2),
        backoff_min: numVal("v7-retry-backoff", 10)
      },

      timeout: {
        scan_timeout_min: numVal("v7-scan-timeout", 60),
        tool_timeout_min: numVal("v7-tool-timeout", 20),
        gate_timeout_min: numVal("v7-gate-timeout", 10)
      },

      retention: {
        keep_reports: boolVal("v7-keep-reports", true),
        keep_screenshots: boolVal("v7-keep-screenshots", true),
        keep_logs: boolVal("v7-keep-logs", true),
        keep_days: numVal("v7-keep-days", 30)
      },

      gate: {
        mode: val("v7-gate-mode", "block-critical-review-high"),
        auto_promote_pass: boolVal("v7-auto-promote", false),
        require_evidence: boolVal("v7-require-evidence", true),
        require_approval_on_high: boolVal("v7-require-approval-high", true)
      },

      notification: {
        enabled: boolVal("v7-notify-enabled", true),
        email: val("v7-notify-email", "devsecops@company.local"),
        on_pass: boolVal("v7-notify-pass", false),
        on_fail: boolVal("v7-notify-fail", true)
      },

      updated_at: new Date().toISOString(),
      source: "CICD_SCHEDULER_SETTINGS_V7"
    };

    const payload = {
      ...base,
      source: "CICD_SCHEDULER_SETTINGS_V7",
      rid: base.rid || ("SCHED_V7_" + new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)),
      scheduler
    };

    try {
      const res = await postJSON(API.updateConfig, payload);
      window.__CICD_SCHEDULER_V7_LAST_SAVE__ = { payload, res };
      toast("Scheduler settings saved", "ok");
      console.log("[CICD-SCHEDULER-SETTINGS-V7] saved", { payload, res });

      const d = qs("#vsp-scheduler-drawer");
      if (d) d.classList.remove("open");
    } catch (e) {
      console.error("[CICD-SCHEDULER-SETTINGS-V7] save failed", e);
      toast("Scheduler settings save failed: HTTP " + (e.status || "ERR"), "error");
    }
  }

  function findSchedulerButton() {
    return qsa("button,a,[role='button']").find(el => {
      const t = (el.innerText || el.textContent || "").toLowerCase();
      return t.includes("queue") || t.includes("schedule") || t.includes("scheduler");
    });
  }

  function bind() {
    const btn = findSchedulerButton();
    if (btn && !btn.dataset.vspSchedulerV7) {
      btn.dataset.vspSchedulerV7 = "1";
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopImmediatePropagation();
        openSchedulerV7();
      }, true);
    }
  }

  function boot() {
    bind();

    document.addEventListener("click", function (e) {
      if (e.target.closest("[data-vsp-close-scheduler-v7]")) {
        const d = qs("#vsp-scheduler-drawer");
        if (d) d.classList.remove("open");
      }

      if (e.target.closest("#v7-save-scheduler")) {
        e.preventDefault();
        e.stopImmediatePropagation();
        saveV7();
      }
    }, true);

    const mo = new MutationObserver(bind);
    mo.observe(document.body, { childList: true, subtree: true });

    console.log("[CICD-SCHEDULER-SETTINGS-V7] installed", API);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();

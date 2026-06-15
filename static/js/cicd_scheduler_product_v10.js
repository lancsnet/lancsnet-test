/* CICD_SCHEDULER_PRODUCT_V10 */
(function () {
  if (window.__CICD_SCHEDULER_PRODUCT_V10__) return;
  window.__CICD_SCHEDULER_PRODUCT_V10__ = true;

  const API = {
    config: "/api/v1/cicd/config",
    updateConfig: "/api/v1/cicd/config/update",
    queue: "/api/v1/cicd/queue",
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
    qsa(".vsp-modal-backdrop.open,.vsp-drawer.open,.v9-sch-drawer.open,.cicd10-drawer.open").forEach(el => el.classList.remove("open"));
  }

  function baseConfig(raw) {
    return raw && raw.config ? raw.config : raw || {};
  }

  function d(raw) {
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
      webhookUrl: webhook.url || "",

      rid: c.rid || "",
      source: c.source || "CICD_SCHEDULER_PRODUCT_V10"
    };
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

  function f(id, label, value, textarea) {
    const field = textarea
      ? `<textarea id="${id}">${value}</textarea>`
      : `<input id="${id}" value="${value}">`;
    return `<div class="cicd10-field"><label>${label}</label>${field}</div>`;
  }

  function sel(id, label, value, options) {
    return `<div class="cicd10-field"><label>${label}</label><select id="${id}">${
      options.map(o => {
        const v = Array.isArray(o) ? o[0] : o;
        const t = Array.isArray(o) ? o[1] : o;
        return `<option value="${v}" ${String(value) === String(v) ? "selected" : ""}>${t}</option>`;
      }).join("")
    }</select></div>`;
  }

  function full(x) { return `<div class="full">${x}</div>`; }

  function ensureDrawer() {
    let drawer = qs("#cicd10-scheduler-drawer");
    if (!drawer) {
      drawer = document.createElement("aside");
      drawer.id = "cicd10-scheduler-drawer";
      drawer.className = "cicd10-drawer";
      document.body.appendChild(drawer);
    }
    return drawer;
  }

  function queueTable(queue) {
    const items = Array.isArray(queue.items) ? queue.items : [];
    if (!items.length) return `<span class="cicd10-chip warn">No queued jobs</span>`;

    return `
      <table class="cicd10-queue-table">
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
              <td><span class="cicd10-chip">${it.status || "QUEUED"}</span></td>
              <td>${it.created_at || "n/a"}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;
  }

  async function openScheduler() {
    let raw = {};
    let queue = { count: 0, items: [] };
    let status = {};

    try { raw = await getJSON(API.config); } catch (e) { toast("Cannot load scheduler config. Using default values.", "warn"); }
    try { queue = await getJSON(API.queue); } catch (e) { console.warn("[CICD10] queue load failed", e); }
    try { status = await getJSON(API.status); } catch (e) { console.warn("[CICD10] status load failed", e); }

    window.__CICD10_RAW__ = { raw, queue, status };
    const x = d(raw);
    const drawer = ensureDrawer();

    drawer.innerHTML = `
      <div class="cicd10-head">
        <div>
          <div class="cicd10-title">Schedule Settings</div>
          <div class="cicd10-sub">Configure production CI/CD security schedule, triggers, queue policy, runtime controls, evidence retention, release gate and notifications.</div>
        </div>
        <button class="cicd10-close" data-cicd10-close="1">×</button>
      </div>

      <div class="cicd10-body">
        <div class="cicd10-kpis">
          <div class="cicd10-kpi"><div class="num">${x.enabled ? "ACTIVE" : "PAUSED"}</div><div class="txt">Schedule status</div></div>
          <div class="cicd10-kpi"><div class="num">${x.frequency}</div><div class="txt">Frequency</div></div>
          <div class="cicd10-kpi"><div class="num">${queue.count || 0}</div><div class="txt">Queued jobs</div></div>
          <div class="cicd10-kpi"><div class="num">${status.latest_status || "n/a"}</div><div class="txt">Latest gate</div></div>
        </div>

        <div class="cicd10-tabs">
          <button class="cicd10-tab active" data-cicd10-tab="basic">Basic</button>
          <button class="cicd10-tab" data-cicd10-tab="trigger">Trigger</button>
          <button class="cicd10-tab" data-cicd10-tab="queue">Queue</button>
          <button class="cicd10-tab" data-cicd10-tab="runtime">Runtime</button>
          <button class="cicd10-tab" data-cicd10-tab="evidence">Evidence</button>
          <button class="cicd10-tab" data-cicd10-tab="gate">Gate</button>
          <button class="cicd10-tab" data-cicd10-tab="notify">Notification</button>
          <button class="cicd10-tab" data-cicd10-tab="preview">Preview</button>
        </div>

        <section class="cicd10-section active" data-cicd10-section="basic">
          <div class="cicd10-section-title">Basic schedule</div>
          <div class="cicd10-desc">Core schedule definition for the CI/CD security gate.</div>
          <div class="cicd10-grid">
            ${full(f("c10-name", "Schedule name", x.name))}
            ${sel("c10-enabled", "Status", String(x.enabled), [["true","Active"],["false","Paused"]])}
            ${sel("c10-frequency", "Frequency", x.frequency, [["nightly","Nightly"],["every_6_hours","Every 6 hours"],["on_pr","On PR/MR"],["on_push","On push"],["on_release","On release"],["manual","Manual only"],["cron","Custom cron"]])}
            ${f("c10-time", "Run time", x.time)}
            ${f("c10-timezone", "Timezone", x.timezone)}
            ${f("c10-branch", "Default branch", x.branch)}
            ${f("c10-profile", "Scan profile", x.profile)}
            ${full(f("c10-scope", "Scan scope", x.scope, true))}
          </div>
        </section>

        <section class="cicd10-section" data-cicd10-section="trigger">
          <div class="cicd10-section-title">Trigger policy</div>
          <div class="cicd10-desc">Controls which development events create CI/CD security jobs.</div>
          <div class="cicd10-grid">
            ${f("c10-cron", "Cron expression", x.cron)}
            ${sel("c10-run-pr", "Run on PR/MR", String(x.runOnPr), [["true","Yes"],["false","No"]])}
            ${sel("c10-run-push", "Run on push", String(x.runOnPush), [["true","Yes"],["false","No"]])}
            ${sel("c10-run-release", "Run on release", String(x.runOnRelease), [["true","Yes"],["false","No"]])}
          </div>
        </section>

        <section class="cicd10-section" data-cicd10-section="queue">
          <div class="cicd10-section-title">Queue policy</div>
          <div class="cicd10-desc">Real queue data is loaded from the CI/CD task queue API.</div>
          <div class="cicd10-grid">
            ${f("c10-max-parallel", "Max parallel jobs", x.maxParallel)}
            ${f("c10-dedupe-window", "Dedupe window minutes", x.dedupeWindowMin)}
            ${f("c10-queue-max", "Queue max items", x.queueMaxItems)}
            ${sel("c10-cancel-old", "Cancel old queued jobs", String(x.cancelOldQueued), [["true","Yes"],["false","No"]])}
          </div>
          <div style="display:flex;justify-content:flex-end;margin-top:12px">
            <button class="cicd10-btn secondary" id="cicd10-refresh-queue">Refresh queue</button>
          </div>
          <div id="cicd10-queue-box" style="margin-top:12px">${queueTable(queue)}</div>
        </section>

        <section class="cicd10-section" data-cicd10-section="runtime">
          <div class="cicd10-section-title">Runtime controls</div>
          <div class="cicd10-desc">Retry and timeout policy to prevent stuck CI/CD jobs.</div>
          <div class="cicd10-grid">
            ${sel("c10-retry-enabled", "Retry enabled", String(x.retryEnabled), [["true","Enabled"],["false","Disabled"]])}
            ${f("c10-retry-max", "Max retry attempts", x.retryMax)}
            ${f("c10-retry-backoff", "Backoff minutes", x.retryBackoffMin)}
            ${f("c10-scan-timeout", "Full scan timeout minutes", x.scanTimeoutMin)}
            ${f("c10-tool-timeout", "Per-tool timeout minutes", x.toolTimeoutMin)}
            ${f("c10-gate-timeout", "Gate timeout minutes", x.gateTimeoutMin)}
          </div>
        </section>

        <section class="cicd10-section" data-cicd10-section="evidence">
          <div class="cicd10-section-title">Evidence retention</div>
          <div class="cicd10-desc">Controls artifact retention for audit, compliance and release evidence.</div>
          <div class="cicd10-grid">
            ${sel("c10-keep-reports", "Keep reports", String(x.keepReports), [["true","Yes"],["false","No"]])}
            ${sel("c10-keep-screenshots", "Keep screenshots", String(x.keepScreenshots), [["true","Yes"],["false","No"]])}
            ${sel("c10-keep-logs", "Keep logs", String(x.keepLogs), [["true","Yes"],["false","No"]])}
            ${sel("c10-keep-trace", "Keep trace", String(x.keepTrace), [["true","Yes"],["false","No"]])}
            ${f("c10-keep-days", "Retention days", x.keepDays)}
          </div>
        </section>

        <section class="cicd10-section" data-cicd10-section="gate">
          <div class="cicd10-section-title">Release gate behavior</div>
          <div class="cicd10-desc">Controls blocking, approval and evidence requirements for release decisions.</div>
          <div class="cicd10-grid">
            ${sel("c10-gate-mode", "Gate mode", x.gateMode, [["block-critical-review-high","Block critical, review high"],["block-critical-high","Block critical and high"],["audit-only","Audit only"]])}
            ${sel("c10-auto-promote", "Auto promote pass", String(x.autoPromotePass), [["false","No"],["true","Yes"]])}
            ${sel("c10-require-evidence", "Require evidence", String(x.requireEvidence), [["true","Yes"],["false","No"]])}
            ${sel("c10-require-approval-high", "Require approval on high", String(x.requireApprovalOnHigh), [["true","Yes"],["false","No"]])}
          </div>
        </section>

        <section class="cicd10-section" data-cicd10-section="notify">
          <div class="cicd10-section-title">Notification policy</div>
          <div class="cicd10-desc">Controls notification targets for schedule events and gate decisions.</div>
          <div class="cicd10-grid">
            ${sel("c10-notify-enabled", "Notification enabled", String(x.notifyEnabled), [["true","Enabled"],["false","Disabled"]])}
            ${f("c10-notify-email", "Email / target", x.notifyEmail)}
            ${sel("c10-notify-start", "Notify on start", String(x.notifyOnStart), [["false","No"],["true","Yes"]])}
            ${sel("c10-notify-pass", "Notify on pass", String(x.notifyOnPass), [["false","No"],["true","Yes"]])}
            ${sel("c10-notify-fail", "Notify on fail", String(x.notifyOnFail), [["true","Yes"],["false","No"]])}
            ${sel("c10-webhook-enabled", "Webhook enabled", String(x.webhookEnabled), [["false","No"],["true","Yes"]])}
            ${full(f("c10-webhook-url", "Webhook URL", x.webhookUrl))}
          </div>
        </section>

        <section class="cicd10-section" data-cicd10-section="preview">
          <div class="cicd10-section-title">Configuration preview</div>
          <div class="cicd10-desc">Review the configuration payload before saving it to the backend.</div>
          <pre class="cicd10-preview" id="cicd10-preview-box"></pre>
        </section>

        <div class="cicd10-actions">
          <button class="cicd10-btn secondary" data-cicd10-close="1">Close</button>
          <button class="cicd10-btn secondary" id="cicd10-refresh-preview">Refresh preview</button>
          <button class="cicd10-btn primary" id="cicd10-save">Save settings</button>
        </div>
      </div>
    `;

    closeAll();
    drawer.classList.add("open");
    refreshPreview();
    console.log("[CICD-SCHEDULER-PRODUCT-V10] opened", { raw, queue, status });
  }

  function buildPayload() {
    const raw = window.__CICD10_RAW__ || {};
    const base = baseConfig(raw.raw || {});
    return {
      ...base,
      source: "CICD_SCHEDULER_PRODUCT_V10",
      rid: base.rid || ("SCHED_PRODUCT_" + new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0,14)),
      scheduler: {
        enabled: boolVal("c10-enabled", true),
        name: val("c10-name", "Production CI/CD security gate"),
        frequency: val("c10-frequency", "nightly"),
        cron: val("c10-cron", "0 2 * * *"),
        time: val("c10-time", "02:00"),
        timezone: val("c10-timezone", "Asia/Ho_Chi_Minh"),
        branch: val("c10-branch", "main"),
        profile: val("c10-profile", "commercial-full-gate"),
        scope: val("c10-scope", "SAST, SCA, Secrets, IaC, Container, Final Gate"),
        run_on_pr: boolVal("c10-run-pr", true),
        run_on_push: boolVal("c10-run-push", false),
        run_on_release: boolVal("c10-run-release", true),
        concurrency: {
          max_parallel: numVal("c10-max-parallel", 2),
          dedupe_window_min: numVal("c10-dedupe-window", 30),
          queue_max_items: numVal("c10-queue-max", 100),
          cancel_old_queued: boolVal("c10-cancel-old", true)
        },
        retry: {
          enabled: boolVal("c10-retry-enabled", true),
          max_attempts: numVal("c10-retry-max", 2),
          backoff_min: numVal("c10-retry-backoff", 10)
        },
        timeout: {
          scan_timeout_min: numVal("c10-scan-timeout", 60),
          tool_timeout_min: numVal("c10-tool-timeout", 20),
          gate_timeout_min: numVal("c10-gate-timeout", 10)
        },
        retention: {
          keep_reports: boolVal("c10-keep-reports", true),
          keep_screenshots: boolVal("c10-keep-screenshots", true),
          keep_logs: boolVal("c10-keep-logs", true),
          keep_trace: boolVal("c10-keep-trace", true),
          keep_days: numVal("c10-keep-days", 30)
        },
        gate: {
          mode: val("c10-gate-mode", "block-critical-review-high"),
          auto_promote_pass: boolVal("c10-auto-promote", false),
          require_evidence: boolVal("c10-require-evidence", true),
          require_approval_on_high: boolVal("c10-require-approval-high", true)
        },
        notification: {
          enabled: boolVal("c10-notify-enabled", true),
          email: val("c10-notify-email", "devsecops@company.local"),
          on_start: boolVal("c10-notify-start", false),
          on_pass: boolVal("c10-notify-pass", false),
          on_fail: boolVal("c10-notify-fail", true),
          webhook: {
            enabled: boolVal("c10-webhook-enabled", false),
            url: val("c10-webhook-url", "")
          }
        },
        updated_at: new Date().toISOString()
      }
    };
  }

  function validate() {
    qsa(".cicd10-invalid").forEach(el => el.classList.remove("cicd10-invalid"));

    const required = ["c10-name", "c10-timezone", "c10-branch", "c10-profile"];
    const nums = ["c10-max-parallel", "c10-dedupe-window", "c10-queue-max", "c10-retry-max", "c10-retry-backoff", "c10-scan-timeout", "c10-tool-timeout", "c10-gate-timeout", "c10-keep-days"];
    let ok = true;

    required.forEach(id => {
      const el = qs("#" + id);
      if (!el || !el.value.trim()) {
        if (el) el.classList.add("cicd10-invalid");
        ok = false;
      }
    });

    nums.forEach(id => {
      const el = qs("#" + id);
      const n = el ? Number(el.value) : NaN;
      if (!Number.isFinite(n) || n < 0) {
        if (el) el.classList.add("cicd10-invalid");
        ok = false;
      }
    });

    if (!ok) toast("Please fix invalid schedule settings", "error");
    return ok;
  }

  function refreshPreview() {
    const box = qs("#cicd10-preview-box");
    if (!box) return;
    try {
      box.textContent = JSON.stringify(buildPayload(), null, 2);
    } catch (e) {
      box.textContent = "Cannot build preview: " + e.message;
    }
  }

  async function save() {
    if (!validate()) return;
    const payload = buildPayload();
    window.__CICD10_LAST_PAYLOAD__ = payload;

    try {
      const res = await postJSON(API.updateConfig, payload);
      window.__CICD10_LAST_RESPONSE__ = res;
      toast("Schedule settings saved", "ok");
      console.log("[CICD-SCHEDULER-PRODUCT-V10] saved", { payload, res });
      const d = qs("#cicd10-scheduler-drawer");
      if (d) d.classList.remove("open");
    } catch (e) {
      console.error("[CICD-SCHEDULER-PRODUCT-V10] save failed", e);
      toast("Save failed: HTTP " + (e.status || "ERR"), "error");
    }
  }

  async function refreshQueue() {
    try {
      const queue = await getJSON(API.queue);
      const box = qs("#cicd10-queue-box");
      if (box) box.innerHTML = queueTable(queue);
      toast("Queue refreshed", "ok");
    } catch (e) {
      toast("Queue refresh failed", "error");
    }
  }

  function installButton() {
    const candidates = qsa("button,a,[role='button']");
    let host = candidates.find(el => {
      const t = (el.innerText || el.textContent || "").toLowerCase();
      return t.includes("queue") || t.includes("schedule") || t.includes("scheduler");
    });

    if (host) {
      host.textContent = "Schedule settings";
      host.id = "cicd-product-schedule-btn";
      host.setAttribute("type", "button");
    } else {
      const topRight = document.body;
      host = document.createElement("button");
      host.id = "cicd-product-schedule-btn";
      host.textContent = "Schedule settings";
      host.style.position = "fixed";
      host.style.right = "120px";
      host.style.top = "72px";
      host.style.zIndex = "99950";
      topRight.appendChild(host);
    }

    if (!host.dataset.cicd10Bound) {
      host.dataset.cicd10Bound = "1";
      host.addEventListener("click", function(e) {
        e.preventDefault();
        e.stopImmediatePropagation();
        openScheduler();
      }, true);
    }
  }

  function boot() {
    installButton();

    document.addEventListener("click", function(e) {
      const tab = e.target.closest("[data-cicd10-tab]");
      if (tab) {
        const name = tab.getAttribute("data-cicd10-tab");
        qsa(".cicd10-tab").forEach(x => x.classList.toggle("active", x === tab));
        qsa(".cicd10-section").forEach(x => x.classList.toggle("active", x.getAttribute("data-cicd10-section") === name));
        if (name === "preview") refreshPreview();
      }

      if (e.target.closest("[data-cicd10-close]")) {
        const d = qs("#cicd10-scheduler-drawer");
        if (d) d.classList.remove("open");
      }

      if (e.target.closest("#cicd10-refresh-preview")) {
        e.preventDefault();
        refreshPreview();
        toast("Preview refreshed", "ok");
      }

      if (e.target.closest("#cicd10-save")) {
        e.preventDefault();
        e.stopImmediatePropagation();
        save();
      }

      if (e.target.closest("#cicd10-refresh-queue")) {
        e.preventDefault();
        refreshQueue();
      }
    }, true);

    document.addEventListener("input", function(e) {
      if (e.target && e.target.id && e.target.id.startsWith("c10-")) refreshPreview();
    }, true);

    const mo = new MutationObserver(installButton);
    mo.observe(document.body, { childList: true, subtree: true });

    console.log("[CICD-SCHEDULER-PRODUCT-V10] installed", API);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();

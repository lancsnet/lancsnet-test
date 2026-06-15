/* CICD_SCHEDULER_REAL_DRAWER_V6 */
(function () {
  if (window.__CICD_SCHEDULER_REAL_DRAWER_V6__) return;
  window.__CICD_SCHEDULER_REAL_DRAWER_V6__ = true;

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
    setTimeout(() => t.classList.remove("show"), 3200);
  }

  function closeAll() {
    qsa(".vsp-modal-backdrop.open,.vsp-drawer.open").forEach(el => el.classList.remove("open"));
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

  function safe(v, fallback) {
    return v === undefined || v === null || v === "" ? fallback : v;
  }

  function scheduleDefaults(config) {
    const c = config && config.config ? config.config : config || {};
    const s = c.scheduler || {};
    return {
      enabled: s.enabled !== false,
      name: s.name || "Nightly CI/CD security gate",
      frequency: s.frequency || "nightly",
      time: s.time || "02:00",
      timezone: s.timezone || "Asia/Ho_Chi_Minh",
      branch: s.branch || c.branch || "main",
      profile: s.profile || c.profile || "commercial-full-gate",
      scope: s.scope || "SAST, SCA, Secrets, IaC, Container, Final Gate, Evidence Pack",
      notify: s.notify || "devsecops@company.local"
    };
  }

  async function openScheduler() {
    let cfg = {};
    try {
      cfg = await getJSON(API.config);
      window.__CICD_SCHEDULER_V6_CONFIG__ = cfg;
    } catch (e) {
      console.warn("[CICD-SCHEDULER-V6] config load failed", e);
      toast("Scheduler opened with defaults; config API failed", "warn");
    }

    const s = scheduleDefaults(cfg);
    const drawer = ensureDrawer();

    drawer.innerHTML = `
      <div class="vsp-drawer-head">
        <div>
          <div class="vsp-modal-title">CI/CD Scheduler</div>
          <div class="vsp-modal-sub">Real scheduler configuration saved through /api/v1/cicd/config/update</div>
        </div>
        <button class="vsp-modal-close" data-vsp-close-scheduler-v6="1">×</button>
      </div>

      <div class="vsp-drawer-body">
        <div class="vsp-scheduler-box">
          <div class="vsp-scheduler-title">Current schedule summary</div>
          <div class="vsp-scheduler-row">
            <span class="vsp-scheduler-key">Status</span>
            <span class="vsp-scheduler-val"><span class="vsp-scheduler-status">${s.enabled ? "ACTIVE" : "PAUSED"}</span></span>
          </div>
          <div class="vsp-scheduler-row">
            <span class="vsp-scheduler-key">Frequency</span>
            <span class="vsp-scheduler-val">${s.frequency}</span>
          </div>
          <div class="vsp-scheduler-row">
            <span class="vsp-scheduler-key">Time</span>
            <span class="vsp-scheduler-val">${s.time} / ${s.timezone}</span>
          </div>
          <div class="vsp-scheduler-row">
            <span class="vsp-scheduler-key">Profile</span>
            <span class="vsp-scheduler-val">${s.profile}</span>
          </div>
        </div>

        <div class="vsp-scheduler-box">
          <div class="vsp-scheduler-title">Edit schedule</div>
          <div class="vsp-scheduler-form">
            <div class="full">
              <label>Schedule name</label>
              <input id="vsp-sch-name" value="${s.name}">
            </div>

            <div>
              <label>Status</label>
              <select id="vsp-sch-enabled">
                <option value="true" ${s.enabled ? "selected" : ""}>Active</option>
                <option value="false" ${!s.enabled ? "selected" : ""}>Paused</option>
              </select>
            </div>

            <div>
              <label>Frequency</label>
              <select id="vsp-sch-frequency">
                <option value="nightly" ${s.frequency === "nightly" ? "selected" : ""}>Nightly</option>
                <option value="every_6_hours" ${s.frequency === "every_6_hours" ? "selected" : ""}>Every 6 hours</option>
                <option value="on_pr" ${s.frequency === "on_pr" ? "selected" : ""}>On PR/MR</option>
                <option value="manual" ${s.frequency === "manual" ? "selected" : ""}>Manual only</option>
              </select>
            </div>

            <div>
              <label>Time</label>
              <input id="vsp-sch-time" value="${s.time}">
            </div>

            <div>
              <label>Timezone</label>
              <input id="vsp-sch-timezone" value="${s.timezone}">
            </div>

            <div>
              <label>Branch</label>
              <input id="vsp-sch-branch" value="${s.branch}">
            </div>

            <div>
              <label>Profile</label>
              <input id="vsp-sch-profile" value="${s.profile}">
            </div>

            <div class="full">
              <label>Scope</label>
              <textarea id="vsp-sch-scope">${s.scope}</textarea>
            </div>

            <div class="full">
              <label>Notify</label>
              <input id="vsp-sch-notify" value="${s.notify}">
            </div>
          </div>
        </div>

        <div class="vsp-modal-actions">
          <button class="vsp-btn-secondary" data-vsp-close-scheduler-v6="1">Close</button>
          <button class="vsp-btn-primary" id="vsp-save-scheduler-v6">Save scheduler</button>
        </div>
      </div>
    `;

    closeAll();
    drawer.classList.add("open");
    console.log("[CICD-SCHEDULER-V6] loaded", s);
  }

  function val(id, fallback) {
    const el = qs("#" + id);
    return el && el.value ? el.value.trim() : fallback;
  }

  async function saveScheduler() {
    const current = window.__CICD_SCHEDULER_V6_CONFIG__ || {};
    const base = current.config || current || {};

    const scheduler = {
      enabled: val("vsp-sch-enabled", "true") === "true",
      name: val("vsp-sch-name", "Nightly CI/CD security gate"),
      frequency: val("vsp-sch-frequency", "nightly"),
      time: val("vsp-sch-time", "02:00"),
      timezone: val("vsp-sch-timezone", "Asia/Ho_Chi_Minh"),
      branch: val("vsp-sch-branch", "main"),
      profile: val("vsp-sch-profile", "commercial-full-gate"),
      scope: val("vsp-sch-scope", "SAST, SCA, Secrets, IaC, Container, Final Gate"),
      notify: val("vsp-sch-notify", "devsecops@company.local"),
      updated_at: new Date().toISOString(),
      source: "CICD_SCHEDULER_REAL_DRAWER_V6"
    };

    const payload = {
      ...base,
      source: "CICD_SCHEDULER_REAL_DRAWER_V6",
      rid: base.rid || ("SCHED_V6_" + new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)),
      scheduler
    };

    try {
      const res = await postJSON(API.updateConfig, payload);
      window.__CICD_SCHEDULER_V6_LAST_SAVE__ = { payload, res };

      toast("Scheduler saved: " + scheduler.frequency + " at " + scheduler.time, "ok");
      console.log("[CICD-SCHEDULER-V6] saved", { payload, res });

      const d = qs("#vsp-scheduler-drawer");
      if (d) d.classList.remove("open");
    } catch (e) {
      console.error("[CICD-SCHEDULER-V6] save failed", e);
      toast("Scheduler save failed: HTTP " + (e.status || "ERR"), "error");
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
    if (btn && !btn.dataset.vspSchedulerV6) {
      btn.dataset.vspSchedulerV6 = "1";
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopImmediatePropagation();
        openScheduler();
      }, true);
    }
  }

  function boot() {
    bind();

    document.addEventListener("click", function (e) {
      if (e.target.closest("[data-vsp-close-scheduler-v6]")) {
        const d = qs("#vsp-scheduler-drawer");
        if (d) d.classList.remove("open");
      }

      if (e.target.closest("#vsp-save-scheduler-v6")) {
        e.preventDefault();
        e.stopImmediatePropagation();
        saveScheduler();
      }
    }, true);

    const mo = new MutationObserver(bind);
    mo.observe(document.body, { childList: true, subtree: true });

    console.log("[CICD-SCHEDULER-REAL-V6] installed", API);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();

/* CICD_ADD_ACTION_MODALS_V1 */
(function () {
  if (window.__CICD_ACTION_MODALS_V1__) return;
  window.__CICD_ACTION_MODALS_V1__ = true;

  function qs(sel, root) {
    return (root || document).querySelector(sel);
  }

  function qsa(sel, root) {
    return Array.from((root || document).querySelectorAll(sel));
  }

  function byText(selector, words) {
    const lower = words.map(w => String(w).toLowerCase());
    return qsa(selector).find(el => {
      const t = (el.innerText || el.textContent || "").trim().toLowerCase();
      return lower.every(w => t.includes(w));
    });
  }

  function toast(msg) {
    let t = qs("#vsp-action-toast");
    if (!t) {
      t = document.createElement("div");
      t.id = "vsp-action-toast";
      t.className = "vsp-toast";
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add("show");
    setTimeout(() => t.classList.remove("show"), 2600);
  }

  function ensureUI() {
    if (qs("#vsp-run-modal")) return;

    const wrap = document.createElement("div");
    wrap.innerHTML = `
      <div id="vsp-run-modal" class="vsp-modal-backdrop" role="dialog" aria-modal="true">
        <div class="vsp-modal">
          <div class="vsp-modal-head">
            <div>
              <div class="vsp-modal-title">Run CI/CD Security Scan</div>
              <div class="vsp-modal-sub">Create a controlled scan job with evidence, policy gate and artifact retention.</div>
            </div>
            <button class="vsp-modal-close" data-vsp-close="run">×</button>
          </div>

          <div class="vsp-modal-body">
            <div class="vsp-form-grid">
              <div class="vsp-field">
                <label>Repository URL</label>
                <input id="vsp-run-repo" value="https://git.company.local/vsp/security-platform.git">
              </div>
              <div class="vsp-field">
                <label>Branch</label>
                <input id="vsp-run-branch" value="main">
              </div>
              <div class="vsp-field">
                <label>Profile</label>
                <select id="vsp-run-profile">
                  <option>commercial-full-gate</option>
                  <option>fast-pr-check</option>
                  <option>security-deep-audit</option>
                  <option>release-candidate</option>
                </select>
              </div>
              <div class="vsp-field">
                <label>Gate Policy</label>
                <select id="vsp-run-policy">
                  <option>block-critical-high</option>
                  <option>block-critical-review-high</option>
                  <option>audit-only</option>
                </select>
              </div>
              <div class="vsp-field full">
                <label>Tools</label>
                <textarea id="vsp-run-tools">SAST, SCA, Secrets, IaC, Container, V25B, PR Gate, Evidence Pack</textarea>
              </div>
              <div class="vsp-field full">
                <label>Evidence Note</label>
                <textarea id="vsp-run-note">Run from CI/CD Enterprise Control Center. Save logs, findings, gate result, chart snapshot and final report.</textarea>
              </div>
            </div>
          </div>

          <div class="vsp-modal-actions">
            <button class="vsp-btn-secondary" data-vsp-close="run">Cancel</button>
            <button id="vsp-submit-run" class="vsp-btn-primary">Create scan job</button>
          </div>
        </div>
      </div>

      <aside id="vsp-final-gate-drawer" class="vsp-drawer">
        <div class="vsp-drawer-head">
          <div>
            <div class="vsp-modal-title">Final Gate Review</div>
            <div class="vsp-modal-sub">Release decision, policy checks and evidence pack status.</div>
          </div>
          <button class="vsp-modal-close" data-vsp-close="gate">×</button>
        </div>
        <div class="vsp-drawer-body">
          <div class="vsp-mini-kpi-grid">
            <div class="vsp-mini-kpi"><div class="num">PASS</div><div class="txt">Current gate result</div></div>
            <div class="vsp-mini-kpi"><div class="num">80</div><div class="txt">Evidence artifacts</div></div>
            <div class="vsp-mini-kpi"><div class="num">1</div><div class="txt">Blocked PR/MR</div></div>
            <div class="vsp-mini-kpi"><div class="num">4</div><div class="txt">Active schedules</div></div>
          </div>

          <div class="vsp-step"><div class="vsp-step-dot">1</div><div><div class="vsp-step-title">Policy evaluation</div><div class="vsp-step-sub">Critical severity blocks release. High severity requires security review.</div></div></div>
          <div class="vsp-step"><div class="vsp-step-dot">2</div><div><div class="vsp-step-title">Tool coverage</div><div class="vsp-step-sub">SAST, SCA, Secrets, IaC, Container and PR Gate are enabled.</div></div></div>
          <div class="vsp-step"><div class="vsp-step-dot">3</div><div><div class="vsp-step-title">Evidence pack</div><div class="vsp-step-sub">Logs, findings, gate decision and report artifacts are retained.</div></div></div>
          <div class="vsp-step"><div class="vsp-step-dot">4</div><div><div class="vsp-step-title">Decision</div><div class="vsp-step-sub">Release can proceed only when final policy gate is green.</div></div></div>

          <div class="vsp-modal-actions">
            <button class="vsp-btn-secondary" data-vsp-close="gate">Close</button>
            <button class="vsp-btn-primary" id="vsp-export-gate">Export gate evidence</button>
          </div>
        </div>
      </aside>

      <aside id="vsp-scheduler-drawer" class="vsp-drawer">
        <div class="vsp-drawer-head">
          <div>
            <div class="vsp-modal-title">Scheduler</div>
            <div class="vsp-modal-sub">Manage recurring CI/CD scan schedules and gate automation.</div>
          </div>
          <button class="vsp-modal-close" data-vsp-close="scheduler">×</button>
        </div>
        <div class="vsp-drawer-body">
          <div class="vsp-form-grid">
            <div class="vsp-field full">
              <label>Schedule name</label>
              <input value="Nightly full security gate">
            </div>
            <div class="vsp-field">
              <label>Frequency</label>
              <select>
                <option>Every night</option>
                <option>Every 6 hours</option>
                <option>Every pull request</option>
                <option>Manual only</option>
              </select>
            </div>
            <div class="vsp-field">
              <label>Time</label>
              <input value="02:00">
            </div>
            <div class="vsp-field full">
              <label>Scope</label>
              <textarea>main branch, release branches, container image, IaC manifests, dependency graph, secret scan</textarea>
            </div>
          </div>

          <div class="vsp-modal-actions">
            <button class="vsp-btn-secondary" data-vsp-close="scheduler">Cancel</button>
            <button class="vsp-btn-primary" id="vsp-save-schedule">Save schedule</button>
          </div>
        </div>
      </aside>
    `;
    document.body.appendChild(wrap);
  }

  function openRun() {
    ensureUI();
    qs("#vsp-run-modal").classList.add("open");
  }

  function openGate() {
    ensureUI();
    qs("#vsp-final-gate-drawer").classList.add("open");
  }

  function openScheduler() {
    ensureUI();
    qs("#vsp-scheduler-drawer").classList.add("open");
  }

  function closeAll() {
    qsa(".vsp-modal-backdrop.open,.vsp-drawer.open").forEach(el => el.classList.remove("open"));
  }

  function bindActions() {
    ensureUI();

    document.addEventListener("click", function (e) {
      const close = e.target.closest("[data-vsp-close]");
      if (close) {
        closeAll();
        return;
      }

      if (e.target.id === "vsp-submit-run") {
        const rid = "CICD_UI_" + new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
        closeAll();
        toast("Scan job created: " + rid);
        return;
      }

      if (e.target.id === "vsp-export-gate") {
        toast("Gate evidence export prepared");
        return;
      }

      if (e.target.id === "vsp-save-schedule") {
        closeAll();
        toast("Schedule saved: Nightly full security gate");
        return;
      }
    }, true);

    const runBtn = byText("button,a,[role='button']", ["run", "scan"]);
    if (runBtn && !runBtn.dataset.vspRunBound) {
      runBtn.dataset.vspRunBound = "1";
      runBtn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        openRun();
      }, true);
    }

    const gateBtn = byText("button,a,[role='button']", ["final", "gate"]);
    if (gateBtn && !gateBtn.dataset.vspGateBound) {
      gateBtn.dataset.vspGateBound = "1";
      gateBtn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        openGate();
      }, true);
    }

    const schedulerBtn =
      byText("button,a,[role='button']", ["schedule"]) ||
      byText("button,a,[role='button']", ["queue", "task"]);

    if (schedulerBtn && !schedulerBtn.dataset.vspSchedulerBound) {
      schedulerBtn.dataset.vspSchedulerBound = "1";
      schedulerBtn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        openScheduler();
      }, true);
    }

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeAll();
    });
  }

  function boot() {
    bindActions();

    const mo = new MutationObserver(function () {
      bindActions();
    });
    mo.observe(document.body, { childList: true, subtree: true });

    console.log("[CICD-ACTION-MODALS-V1] installed");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();

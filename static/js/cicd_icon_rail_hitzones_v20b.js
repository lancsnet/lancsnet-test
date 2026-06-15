/* CICD_ICON_RAIL_HITZONES_V20B */
(function(){
  if (window.__CICD_ICON_RAIL_HITZONES_V20B__) return;
  window.__CICD_ICON_RAIL_HITZONES_V20B__ = true;

  function openSettings() {
    if (typeof window.openCICDSettingsV16 === "function") return window.openCICDSettingsV16();
    console.warn("[CICD-V20B] openCICDSettingsV16 not found");
  }

  function openScheduler() {
    if (typeof window.openCICDSchedulerFromLeftMenu === "function") return window.openCICDSchedulerFromLeftMenu();
    console.warn("[CICD-V20B] openCICDSchedulerFromLeftMenu not found");
  }

  function openReports() {
    if (typeof window.openCICDReportsV16 === "function") return window.openCICDReportsV16();
    console.warn("[CICD-V20B] openCICDReportsV16 not found");
  }

  function openRuns() {
    if (typeof window.openCICDRunHistoryV18 === "function") return window.openCICDRunHistoryV18();
    console.warn("[CICD-V20B] openCICDRunHistoryV18 not found");
  }

  function closeActive() {
    document.querySelectorAll(".cicd-v20b-hotzone.active").forEach(x => x.classList.remove("active"));
  }

  function makeHotzone(id, top, title, handler) {
    let z = document.querySelector("#" + id);
    if (!z) {
      z = document.createElement("button");
      z.id = id;
      z.type = "button";
      z.name = id;
      z.className = "cicd-v20b-hotzone";
      z.setAttribute("aria-label", title);
      z.setAttribute("title", title);
      document.body.appendChild(z);
    }

    z.style.top = top + "px";

    if (!z.dataset.bound) {
      z.dataset.bound = "1";
      z.addEventListener("click", function(e){
        e.preventDefault();
        e.stopPropagation();
        closeActive();
        z.classList.add("active");
        handler();
        return false;
      }, true);
    }

    return z;
  }

  function install() {
    // Theo layout panel hiện tại:
    // icon 1 grid ~ 84, icon 2 gear/settings ~ 124,
    // icon 3 list/runs ~ 164, icon 4 calendar/scheduler ~ 204,
    // icon 6 chart/report ~ 284.
    const zones = {
      settings: makeHotzone("cicd-v20b-settings-hotzone", 112, "Open CI/CD Settings", openSettings),
      runs: makeHotzone("cicd-v20b-runs-hotzone", 154, "Open CI/CD Run History & Evidence", openRuns),
      scheduler: makeHotzone("cicd-v20b-scheduler-hotzone", 196, "Open CI/CD Schedule Settings", openScheduler),
      reports: makeHotzone("cicd-v20b-reports-hotzone", 282, "Open CI/CD Reports", openReports)
    };

    window.__CICD_V20B_ICON_RAIL_STATE__ = {
      settings: !!zones.settings,
      runs: !!zones.runs,
      scheduler: !!zones.scheduler,
      reports: !!zones.reports,
      mode: "fixed transparent hitzones"
    };

    window.openCICDSettingsFromIconRailV20B = openSettings;
    window.openCICDSchedulerFromIconRailV20B = openScheduler;
    window.openCICDReportsFromIconRailV20B = openReports;
    window.openCICDRunsFromIconRailV20B = openRuns;

    if (!window.__CICD_V20B_LOGGED__) {
      console.log("[CICD-V20B] icon rail hitzones installed", window.__CICD_V20B_ICON_RAIL_STATE__);
      window.__CICD_V20B_LOGGED__ = true;
    }

    return window.__CICD_V20B_ICON_RAIL_STATE__;
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install);
  else install();

  setTimeout(install, 800);
  setTimeout(install, 2000);
})();

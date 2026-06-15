/* CICD_ICON_RAIL_BIND_V20 */
(function(){
  if (window.__CICD_ICON_RAIL_BIND_V20__) return;
  window.__CICD_ICON_RAIL_BIND_V20__ = true;

  function textOf(el) {
    return (el.innerText || el.textContent || el.getAttribute("aria-label") || el.getAttribute("title") || "").trim().toLowerCase();
  }

  function iconClass(el) {
    return (el.className || "").toString().toLowerCase();
  }

  function cleanActive() {
    document.querySelectorAll(".v20-cicd-icon-active").forEach(x => x.classList.remove("v20-cicd-icon-active"));
  }

  function openSettings() {
    if (typeof window.openCICDSettingsV16 === "function") return window.openCICDSettingsV16();
    console.warn("[CICD-V20] openCICDSettingsV16 not found");
  }

  function openScheduler() {
    if (typeof window.openCICDSchedulerFromLeftMenu === "function") return window.openCICDSchedulerFromLeftMenu();
    console.warn("[CICD-V20] openCICDSchedulerFromLeftMenu not found");
  }

  function openReports() {
    if (typeof window.openCICDReportsV16 === "function") return window.openCICDReportsV16();
    console.warn("[CICD-V20] openCICDReportsV16 not found");
  }

  function openRuns() {
    if (typeof window.openCICDRunHistoryV18 === "function") return window.openCICDRunHistoryV18();
    console.warn("[CICD-V20] openCICDRunHistoryV18 not found");
  }

  function looksLikeGear(el) {
    const t = textOf(el);
    const c = iconClass(el);
    const html = (el.outerHTML || "").toLowerCase();

    return (
      t === "settings" ||
      t.includes("setting") ||
      c.includes("settings") ||
      c.includes("gear") ||
      c.includes("cog") ||
      html.includes("ti-settings") ||
      html.includes("fa-gear") ||
      html.includes("fa-cog") ||
      html.includes("lucide-settings") ||
      html.includes("icon-settings")
    );
  }

  function looksLikeCalendar(el) {
    const t = textOf(el);
    const c = iconClass(el);
    const html = (el.outerHTML || "").toLowerCase();

    return (
      t === "scheduler" ||
      t.includes("schedule") ||
      c.includes("calendar") ||
      html.includes("ti-calendar") ||
      html.includes("fa-calendar") ||
      html.includes("lucide-calendar") ||
      html.includes("icon-calendar")
    );
  }

  function looksLikeReports(el) {
    const t = textOf(el);
    const c = iconClass(el);
    const html = (el.outerHTML || "").toLowerCase();

    return (
      t === "reports" ||
      t.includes("report") ||
      t.includes("analytics") ||
      c.includes("chart") ||
      c.includes("report") ||
      html.includes("ti-chart") ||
      html.includes("ti-report") ||
      html.includes("fa-chart") ||
      html.includes("lucide-chart") ||
      html.includes("icon-chart")
    );
  }

  function looksLikeRuns(el) {
    const t = textOf(el);
    const c = iconClass(el);
    const html = (el.outerHTML || "").toLowerCase();

    return (
      t === "runs" ||
      t.includes("run") ||
      c.includes("list") ||
      html.includes("ti-list") ||
      html.includes("fa-list") ||
      html.includes("lucide-list") ||
      html.includes("icon-list")
    );
  }

  function candidateButtons() {
    return Array.from(document.querySelectorAll(
      "button, a, [role='button'], .nav-item, .rail-item, .sidebar-icon, .icon-btn, [class*='icon'], [class*='rail']"
    )).filter(function(el){
      const r = el.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) return false;

      // Chỉ lấy icon rail trong panel CI/CD: vùng x khoảng 0-90px của iframe/panel.
      if (r.left > 95) return false;

      return true;
    });
  }

  function bindOne(el, type, handler, title) {
    if (!el || el.dataset.v20CicdIconBound === type) return;

    el.dataset.v20CicdIconBound = type;
    el.classList.add("v20-cicd-icon-bound");
    el.setAttribute("title", title);
    el.setAttribute("aria-label", title);

    el.addEventListener("click", function(e){
      e.preventDefault();
      e.stopPropagation();

      cleanActive();
      el.classList.add("v20-cicd-icon-active");

      handler();
      return false;
    }, true);
  }

  function bindIconRail() {
    const items = candidateButtons();

    let settings = items.find(looksLikeGear);
    let scheduler = items.find(looksLikeCalendar);
    let reports = items.find(looksLikeReports);
    let runs = items.find(looksLikeRuns);

    // Fallback theo thứ tự icon rail trong ảnh:
    // icon 1 grid/dash, icon 2 gear, icon 3 list, icon 4 calendar, icon 5 folder, icon 6 chart, icon 7 bell.
    if (!settings && items[1]) settings = items[1];
    if (!runs && items[2]) runs = items[2];
    if (!scheduler && items[3]) scheduler = items[3];
    if (!reports && items[5]) reports = items[5];

    bindOne(settings, "settings", openSettings, "Open CI/CD Settings");
    bindOne(scheduler, "scheduler", openScheduler, "Open CI/CD Schedule Settings");
    bindOne(reports, "reports", openReports, "Open CI/CD Reports");
    bindOne(runs, "runs", openRuns, "Open CI/CD Run History & Evidence");

    window.openCICDSettingsFromIconRailV20 = openSettings;
    window.openCICDSchedulerFromIconRailV20 = openScheduler;
    window.openCICDReportsFromIconRailV20 = openReports;
    window.openCICDRunsFromIconRailV20 = openRuns;

    const result = {
      settings: !!settings,
      scheduler: !!scheduler,
      reports: !!reports,
      runs: !!runs,
      candidates: items.length
    };

    window.__CICD_V20_ICON_RAIL_STATE__ = result;

    if (!window.__CICD_V20_ICON_RAIL_LOGGED__) {
      console.log("[CICD-V20] panel icon rail bound", result);
      window.__CICD_V20_ICON_RAIL_LOGGED__ = true;
    }

    return result;
  }

  function boot() {
    bindIconRail();
    setTimeout(bindIconRail, 800);
    setTimeout(bindIconRail, 2000);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();

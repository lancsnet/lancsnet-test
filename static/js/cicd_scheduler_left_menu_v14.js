/* CICD_SCHEDULER_LEFT_MENU_V14 */
(function(){
  if (window.__CICD_SCHEDULER_LEFT_MENU_V14__) return;
  window.__CICD_SCHEDULER_LEFT_MENU_V14__ = true;

  function getParentDoc(){
    try {
      if (window.parent && window.parent !== window && window.parent.document) {
        return window.parent.document;
      }
    } catch (_) {}
    return document;
  }

  function getPanelWindow(){
    try {
      const pd = getParentDoc();
      const frame = pd.querySelector('iframe[src*="/panels/cicd.html"], iframe');
      if (frame && frame.contentWindow) return frame.contentWindow;
    } catch (_) {}
    return window;
  }

  function cleanupWrongUI(){
    const pd = getParentDoc();

    [
      "#cicd-v13-schedule-btn",
      "#cicd-v12e-product-card",
      "#cicd-v12f-pin-host",
      "#cicd-v12g-parent-host",
      "#cicd-v12e-floating-btn"
    ].forEach(function(sel){
      document.querySelectorAll(sel).forEach(function(x){ x.remove(); });
      try { pd.querySelectorAll(sel).forEach(function(x){ x.remove(); }); } catch (_) {}
    });
  }

  function openScheduleDrawer(){
    cleanupWrongUI();

    const cw = getPanelWindow();

    try {
      if (cw && typeof cw.openCICDScheduleSettings === "function") {
        return cw.openCICDScheduleSettings();
      }
    } catch (_) {}

    try {
      const btn =
        cw.document.querySelector("#cicd11-open") ||
        cw.document.querySelector("#cicd10e-open") ||
        cw.document.querySelector("#cicd10b-open-schedule") ||
        cw.document.querySelector("#cicd-product-schedule-btn");

      if (btn) return btn.click();
    } catch (_) {}

    console.warn("[CICD-V14] cannot open Schedule Settings drawer");
  }

  function isSchedulerMenu(el){
    const text = (el.innerText || el.textContent || "").trim().toLowerCase();
    if (!text) return false;

    // Exact left-menu Scheduler item, not random text in panel.
    if (text === "scheduler") return true;

    // Some menu rows include icons or extra whitespace.
    if (/^scheduler\s*$/.test(text)) return true;

    return false;
  }

  function findSchedulerMenu(){
    const pd = getParentDoc();

    const candidates = Array.from(pd.querySelectorAll(
      'a, button, [role="button"], li, div, span'
    ));

    return candidates.find(function(el){
      if (!isSchedulerMenu(el)) return false;

      const rect = el.getBoundingClientRect();
      // Left sidebar area only.
      if (rect.left > 260) return false;
      if (rect.width <= 0 || rect.height <= 0) return false;

      return true;
    });
  }

  function bindSchedulerMenu(){
    cleanupWrongUI();

    const pd = getParentDoc();
    const item = findSchedulerMenu();

    if (!item) {
      console.warn("[CICD-V14] left Scheduler menu not found yet");
      return false;
    }

    item.classList.add("v14-scheduler-menu-bound");
    item.setAttribute("title", "Open CI/CD Schedule Settings");
    item.setAttribute("data-cicd-scheduler-bound", "v14");

    if (!item.dataset.v14SchedulerClickBound) {
      item.dataset.v14SchedulerClickBound = "1";

      item.addEventListener("click", function(e){
        e.preventDefault();
        e.stopPropagation();

        Array.from(pd.querySelectorAll(".v14-scheduler-menu-active")).forEach(function(x){
          x.classList.remove("v14-scheduler-menu-active");
        });

        item.classList.add("v14-scheduler-menu-active");
        openScheduleDrawer();

        return false;
      }, true);
    }

    window.openCICDSchedulerFromLeftMenu = openScheduleDrawer;

    try {
      if (window.parent && window.parent !== window) {
        window.parent.openCICDSchedulerFromLeftMenu = openScheduleDrawer;
      }
    } catch (_) {}

    console.log("[CICD-V14] left Scheduler menu bound", {
      text: (item.innerText || item.textContent || "").trim(),
      left: item.getBoundingClientRect().left,
      top: item.getBoundingClientRect().top
    });

    return true;
  }

  function boot(){
    bindSchedulerMenu();
    setTimeout(bindSchedulerMenu, 800);
    setTimeout(bindSchedulerMenu, 2000);

    try {
      const pd = getParentDoc();
      const mo = new MutationObserver(function(){
        cleanupWrongUI();
        bindSchedulerMenu();
      });
      mo.observe(pd.body, { childList: true, subtree: true });
    } catch (_) {}
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();

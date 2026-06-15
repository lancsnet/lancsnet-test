/* CICD_SCHEDULER_TOOLBAR_V13 */
(function(){
  if (window.__CICD_SCHEDULER_TOOLBAR_V13__) return;
  window.__CICD_SCHEDULER_TOOLBAR_V13__ = true;

  function qsa(sel, root){ return Array.from((root || document).querySelectorAll(sel)); }

  function cleanupBadCards(){
    [
      "#cicd-v12e-product-card",
      "#cicd-v12f-pin-host",
      "#cicd-v12g-parent-host",
      "#cicd-v12e-floating-btn"
    ].forEach(function(sel){
      document.querySelectorAll(sel).forEach(function(x){ x.remove(); });
      try {
        if (window.parent && window.parent !== window) {
          window.parent.document.querySelectorAll(sel).forEach(function(x){ x.remove(); });
        }
      } catch (_) {}
    });
  }

  function openSchedule(){
    if (typeof window.openCICDScheduleSettings === "function") {
      return window.openCICDScheduleSettings();
    }

    var btn =
      document.querySelector("#cicd11-open") ||
      document.querySelector("#cicd10e-open") ||
      document.querySelector("#cicd10b-open-schedule");

    if (btn) {
      btn.click();
      return;
    }

    console.warn("[CICD-V13] schedule drawer opener not found");
  }

  function findToolbar(){
    var buttons = qsa("button,a,[role='button']");
    var finalBtn = buttons.find(function(b){
      return /final gate|gate pass|run scan|queue task|be check/i.test((b.innerText || b.textContent || "").trim());
    });

    if (finalBtn && finalBtn.parentElement) return finalBtn.parentElement;

    return (
      document.querySelector(".top-actions") ||
      document.querySelector(".toolbar") ||
      document.querySelector(".actions") ||
      document.querySelector(".cicd-actions") ||
      document.querySelector(".cicd-header") ||
      null
    );
  }

  function installButton(){
    cleanupBadCards();

    var old = document.querySelector("#cicd-v13-schedule-btn");
    if (old) old.remove();

    var btn = document.createElement("button");
    btn.id = "cicd-v13-schedule-btn";
    btn.type = "button";
    btn.name = "cicd-v13-schedule-btn";
    btn.setAttribute("aria-label", "Open CI/CD schedule settings");
    btn.textContent = "Schedule settings";
    btn.onclick = function(e){
      e.preventDefault();
      e.stopPropagation();
      openSchedule();
      return false;
    };

    var toolbar = findToolbar();

    if (toolbar) {
      toolbar.appendChild(btn);
      btn.classList.remove("v13-fixed");
    } else {
      btn.classList.add("v13-fixed");
      document.body.appendChild(btn);
    }

    window.openCICDScheduleSettingsV13 = openSchedule;

    console.log("[CICD-V13] toolbar schedule button installed", {
      toolbar: !!toolbar,
      button: true
    });
  }

  function boot(){
    installButton();
    setTimeout(installButton, 800);
    setTimeout(installButton, 2000);

    var mo = new MutationObserver(function(){
      cleanupBadCards();
      if (!document.querySelector("#cicd-v13-schedule-btn")) installButton();
    });
    mo.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();

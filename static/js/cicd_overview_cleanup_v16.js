// CICD_OVERVIEW_CLEANUP_V16
(function(){
  "use strict";

  if (window.__CICD_OVERVIEW_CLEANUP_V16__) return;
  window.__CICD_OVERVIEW_CLEANUP_V16__ = true;

  function cleanup() {
    const overview = document.getElementById("tab-overview");
    if (!overview) return;

    const v15 = overview.querySelector(".cicd-v15-overview-grid");
    if (!v15) return;

    overview.classList.add("cicd-v16-cleaned");

    // Remove duplicate V15 if mutation created more than one.
    const allV15 = Array.from(overview.querySelectorAll(".cicd-v15-overview-grid"));
    allV15.slice(1).forEach(x => x.remove());

    // Hide legacy direct children except section header and V15 grid.
    Array.from(overview.children).forEach(child => {
      if (child.classList.contains("section-head")) return;
      if (child.classList.contains("cicd-v15-overview-grid")) return;
      child.style.display = "none";
      child.dataset.v16LegacyHidden = "1";
    });

    // Prevent duplicate old timeline from occupying space.
    const oldTimeline = document.getElementById("timeline");
    if (oldTimeline) {
      const oldCard = oldTimeline.closest(".card");
      if (oldCard && !oldCard.closest(".cicd-v15-overview-grid")) {
        oldCard.style.display = "none";
        oldCard.dataset.v16LegacyHidden = "1";
      }
    }

    // Validate only one visible Control timeline title inside overview.
    const timelineTitles = Array.from(overview.querySelectorAll(".card-title,.cicd-v15-title"))
      .filter(x => /Control timeline/i.test(x.textContent || ""));
    timelineTitles.slice(1).forEach(x => {
      const box = x.closest(".card,.cicd-v15-panel");
      if (box && !box.closest(".cicd-v15-overview-grid")) {
        box.style.display = "none";
        box.dataset.v16LegacyHidden = "1";
      }
    });
  }

  document.addEventListener("DOMContentLoaded", cleanup);
  window.addEventListener("load", cleanup);
  setTimeout(cleanup, 500);
  setTimeout(cleanup, 1600);
  setTimeout(cleanup, 3200);

  const obs = new MutationObserver(() => {
    clearTimeout(window.__cicdV16Timer);
    window.__cicdV16Timer = setTimeout(cleanup, 120);
  });

  if (document.documentElement) {
    obs.observe(document.documentElement, { childList: true, subtree: true });
  }
})();

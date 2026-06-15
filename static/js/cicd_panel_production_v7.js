// CICD_PANEL_PRODUCTION_V7
(function(){
  "use strict";

  if (window.__CICD_PANEL_PRODUCTION_V7__) return;
  window.__CICD_PANEL_PRODUCTION_V7__ = true;

  function txt(el){
    return (el && el.textContent || "").replace(/\s+/g, " ").trim();
  }

  function isCicdPanelDocument(){
    var path = String(location.pathname || "");
    if (path.endsWith("/panels/cicd.html")) return true;

    // Allow only a real standalone CI/CD panel, not root dashboard shell.
    var body = (document.body && document.body.innerText || "");
    var hasPanelMarkers =
      /CI\/CD Scheduler/i.test(body) &&
      /CI\/CD PR Gate/i.test(body) &&
      /CI\/CD Run History/i.test(body);

    var looksLikeRootShell =
      /Dashboard/i.test(body) &&
      /Security score/i.test(body) &&
      /Recent runs/i.test(body);

    return hasPanelMarkers && !looksLikeRootShell;
  }

  function removeWrongGlobalToolbar(){
    // Remove old V5/V6 toolbars/classes if this script is ever loaded outside panel.
    if (isCicdPanelDocument()) return;

    document.querySelectorAll(
      ".cicd-prod-toolbar,.cicd-prod-toolbar-v7,[data-cicd-polish-toolbar]"
    ).forEach(function(el){ el.remove(); });

    document.body && document.body.classList.remove(
      "cicd-production-strict",
      "cicd-commercial-clean",
      "cicd-panel-production-v7"
    );
  }

  function statusOf(row){
    var t = txt(row);
    if (/\bFAIL\b/i.test(t)) return "FAIL";
    if (/\bBLOCK\b/i.test(t)) return "BLOCK";
    if (/\bPASS\b/i.test(t)) return "PASS";
    return "";
  }

  function findRunHistoryBlock(){
    var all = Array.from(document.querySelectorAll("h1,h2,h3,h4,div,section,article"));
    var anchor = all.find(function(el){
      return /CI\/CD Run History|CICD Run History|Run History/i.test(txt(el));
    });
    if (!anchor) return null;

    var cur = anchor;
    for (var i = 0; i < 8 && cur; i++, cur = cur.parentElement) {
      if (cur.querySelector && cur.querySelector("table")) return cur;
    }
    return anchor.closest("section, article, .card, [class*='card'], [class*='panel']") || anchor.parentElement;
  }

  function shortenEvidencePaths(){
    Array.from(document.querySelectorAll("td, a, span, div")).forEach(function(el){
      if (el.dataset.cicdV7Shortened === "1") return;
      if (el.children.length > 2) return;

      var t = txt(el);
      if (!t.includes("/home/test/Data/GOLANG_VSP/out_ci/")) return;

      el.dataset.cicdV7Shortened = "1";
      el.title = t;

      var short = t
        .replace("/home/test/Data/GOLANG_VSP/out_ci/", "out_ci/")
        .replace(/\/([^/]+)$/, "/…/$1");

      if (el.children.length === 0) {
        el.textContent = "";

        var s = document.createElement("span");
        s.className = "cicd-evidence-short-v7";
        s.textContent = short;

        var b = document.createElement("button");
        b.type = "button";
        b.className = "cicd-copy-path-v7";
        b.textContent = "copy";
        b.addEventListener("click", function(ev){
          ev.preventDefault();
          ev.stopPropagation();
          if (navigator.clipboard) navigator.clipboard.writeText(t).catch(function(){});
        });

        el.appendChild(s);
        el.appendChild(b);
      }
    });
  }

  function buildToolbar(){
    var block = findRunHistoryBlock();
    if (!block || block.dataset.cicdPanelProductionV7 === "1") return;

    block.dataset.cicdPanelProductionV7 = "1";

    var rows = Array.from(block.querySelectorAll("table tr")).filter(function(r){
      return r.querySelectorAll("td").length > 0;
    });

    rows.forEach(function(r){
      r.classList.remove(
        "cicd-old-fail-hidden",
        "cicd-old-fail-muted",
        "cicd-row-latest-pass",
        "cicd-prod-filter-hidden",
        "cicd-prod-filter-hidden-v7"
      );

      var st = statusOf(r);
      if (st === "FAIL") r.classList.add("cicd-prod-row-fail-v7");
      if (st === "PASS") r.classList.add("cicd-prod-row-pass-v7");
      if (st === "BLOCK") r.classList.add("cicd-prod-row-block-v7");
    });

    var pass = rows.filter(function(r){ return statusOf(r) === "PASS"; }).length;
    var fail = rows.filter(function(r){ return statusOf(r) === "FAIL"; }).length;
    var blockCount = rows.filter(function(r){ return statusOf(r) === "BLOCK"; }).length;

    var toolbar = document.createElement("div");
    toolbar.className = "cicd-prod-toolbar-v7";
    toolbar.innerHTML = [
      '<div>',
        '<div class="cicd-prod-title-v7">CI/CD Production Evidence</div>',
        '<div class="cicd-prod-sub-v7">All records are visible by default. PASS=' + pass + ', FAIL=' + fail + ', BLOCK=' + blockCount + '. Filters are user-driven only.</div>',
      '</div>',
      '<div class="cicd-prod-actions-v7">',
        '<button type="button" data-prod-filter-v7="ALL" class="active">All Records</button>',
        '<button type="button" data-prod-filter-v7="PASS">PASS</button>',
        '<button type="button" data-prod-filter-v7="FAIL">FAIL</button>',
        '<button type="button" data-prod-filter-v7="BLOCK">BLOCK</button>',
      '</div>'
    ].join("");

    block.insertBefore(toolbar, block.firstChild);

    function applyFilter(mode){
      toolbar.querySelectorAll("button").forEach(function(b){ b.classList.remove("active"); });
      var active = toolbar.querySelector('[data-prod-filter-v7="' + mode + '"]');
      if (active) active.classList.add("active");

      rows.forEach(function(r){
        r.classList.remove("cicd-prod-filter-hidden-v7");
        if (mode !== "ALL" && statusOf(r) !== mode) {
          r.classList.add("cicd-prod-filter-hidden-v7");
        }
      });
    }

    toolbar.querySelectorAll("[data-prod-filter-v7]").forEach(function(btn){
      btn.addEventListener("click", function(){ applyFilter(btn.dataset.prodFilterV7); });
    });

    applyFilter("ALL");
  }

  function apply(){
    removeWrongGlobalToolbar();

    if (!isCicdPanelDocument()) return;

    document.body.classList.add("cicd-panel-production-v7");
    shortenEvidencePaths();
    buildToolbar();
  }

  document.addEventListener("DOMContentLoaded", apply);
  window.addEventListener("load", apply);
  setTimeout(apply, 300);
  setTimeout(apply, 1200);
  setTimeout(apply, 2500);

  var obs = new MutationObserver(function(){
    clearTimeout(window.__cicdPanelV7Timer);
    window.__cicdPanelV7Timer = setTimeout(apply, 120);
  });

  if (document.documentElement) {
    obs.observe(document.documentElement, { childList: true, subtree: true });
  }
})();

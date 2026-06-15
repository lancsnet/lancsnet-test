// CICD_SUBTAB_LOGIC_V8
(function(){
  "use strict";

  if (window.__CICD_SUBTAB_LOGIC_V8__) return;
  window.__CICD_SUBTAB_LOGIC_V8__ = true;

  function txt(el){
    return (el && el.textContent || "").replace(/\s+/g, " ").trim();
  }

  function isCicdPanel(){
    var path = String(location.pathname || "");
    if (path.endsWith("/panels/cicd.html")) return true;

    var body = document.body ? document.body.innerText || "" : "";
    return /CI\/CD Scheduler/i.test(body) &&
           /CI\/CD PR Gate/i.test(body) &&
           /CI\/CD Run History/i.test(body);
  }

  function findBlockByTitle(pattern){
    var all = Array.from(document.querySelectorAll("h1,h2,h3,h4,div,section,article"));
    var anchor = all.find(function(el){ return pattern.test(txt(el)); });
    if (!anchor) return null;

    var cur = anchor;
    for (var i = 0; i < 10 && cur; i++, cur = cur.parentElement) {
      if (cur.querySelector && cur.querySelector("table")) return cur;
    }
    return anchor.closest("section, article, .card, [class*='card'], [class*='panel']") || anchor.parentElement;
  }

  function runIdOf(row){
    var cells = Array.from(row.querySelectorAll("td"));
    if (!cells.length) return "";
    return txt(cells[0]);
  }

  function statusOf(row){
    var t = txt(row);
    if (/\bFAIL\b/i.test(t)) return "FAIL";
    if (/\bBLOCK\b/i.test(t)) return "BLOCK";
    if (/\bPASS\b/i.test(t)) return "PASS";
    return "";
  }

  function classifyRun(row){
    var t = txt(row);
    var id = runIdOf(row);

    var opsEvidence =
      /^FIX_/i.test(id) ||
      /^PRODUCTION_/i.test(id) ||
      /^CICD_UI_/i.test(id) ||
      /^MASTER_CONTROL_/i.test(id) ||
      /^CICD_Q2_SLA_/i.test(id) ||
      /UI Polish|Production Strict|Toolbar Scope|SLA escalation worker|Master Control Report/i.test(t);

    var businessRun =
      /^CICD_FINAL_CONTROL_REPORT_/i.test(id) ||
      /^CICD_SCHEDULER_/i.test(id) ||
      /^CICD_PR_GATE_/i.test(id) ||
      /^CICD_RUN_HISTORY_/i.test(id) ||
      /^CICD_TEMPLATES_/i.test(id) ||
      /^CICD_PLATFORM_PROFILES_/i.test(id) ||
      /^POLICY_GATE_/i.test(id) ||
      /^AUDIT_COMPLIANCE_/i.test(id);

    if (opsEvidence) return "EVIDENCE";
    if (businessRun) return "BUSINESS";
    return "BUSINESS";
  }

  function addTypePill(row, type){
    if (row.querySelector(".cicd-row-type-pill-v8")) return;

    var first = row.querySelector("td");
    if (!first) return;

    var pill = document.createElement("span");
    pill.className = "cicd-row-type-pill-v8 " + (type === "BUSINESS" ? "cicd-row-type-business-v8" : "cicd-row-type-evidence-v8");
    pill.textContent = type === "BUSINESS" ? "RUN" : "EVIDENCE";
    first.appendChild(pill);
  }

  function shortenEvidencePaths(){
    Array.from(document.querySelectorAll("td, a, span, div")).forEach(function(el){
      if (el.dataset.cicdV8Shortened === "1") return;
      if (el.children.length > 2) return;

      var t = txt(el);
      if (!t.includes("/home/test/Data/GOLANG_VSP/out_ci/")) return;

      el.dataset.cicdV8Shortened = "1";
      el.title = t;

      var short = t
        .replace("/home/test/Data/GOLANG_VSP/out_ci/", "out_ci/")
        .replace(/\/([^/]+)$/, "/…/$1");

      if (el.children.length === 0) {
        el.textContent = "";

        var s = document.createElement("span");
        s.className = "cicd-evidence-short-v8";
        s.textContent = short;

        var b = document.createElement("button");
        b.type = "button";
        b.className = "cicd-copy-path-v8";
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

  function fixRunHistoryLogic(){
    var block = findBlockByTitle(/CI\/CD Run History|CICD Run History|Run History/i);
    if (!block || block.dataset.cicdSubtabLogicV8 === "1") return;

    block.dataset.cicdSubtabLogicV8 = "1";

    var rows = Array.from(block.querySelectorAll("table tr")).filter(function(r){
      return r.querySelectorAll("td").length > 0;
    });

    var counts = { BUSINESS: 0, EVIDENCE: 0, PASS: 0, FAIL: 0, BLOCK: 0 };

    rows.forEach(function(row){
      var type = classifyRun(row);
      var st = statusOf(row);

      row.dataset.cicdTypeV8 = type;
      row.classList.remove("cicd-filter-hidden-v8");

      if (type === "BUSINESS") {
        row.classList.add("cicd-row-business-run-v8");
        counts.BUSINESS++;
      } else {
        row.classList.add("cicd-row-ops-evidence-v8");
        counts.EVIDENCE++;
      }

      if (st && counts[st] !== undefined) counts[st]++;

      addTypePill(row, type);
    });

    var banner = document.createElement("div");
    banner.className = "cicd-subtab-audit-banner";
    banner.innerHTML = [
      '<div class="cicd-subtab-audit-title">Run History Logic Check</div>',
      '<div class="cicd-subtab-audit-sub">',
      'Production rule: Run History shows CI/CD business runs by default. Operational fix artifacts are not deleted; they are classified as Evidence.',
      ' RUN=', counts.BUSINESS,
      ' EVIDENCE=', counts.EVIDENCE,
      ' PASS=', counts.PASS,
      ' FAIL=', counts.FAIL,
      ' BLOCK=', counts.BLOCK,
      '</div>',
      '<div class="cicd-subtab-actions">',
        '<button type="button" data-cicd-mode-v8="BUSINESS" class="active">Run History</button>',
        '<button type="button" data-cicd-mode-v8="EVIDENCE">Evidence Artifacts</button>',
        '<button type="button" data-cicd-mode-v8="ALL">All Records</button>',
        '<button type="button" data-cicd-mode-v8="FAIL">FAIL Only</button>',
      '</div>'
    ].join("");

    block.insertBefore(banner, block.firstChild);

    function applyMode(mode){
      banner.querySelectorAll("button").forEach(function(b){ b.classList.remove("active"); });
      var btn = banner.querySelector('[data-cicd-mode-v8="' + mode + '"]');
      if (btn) btn.classList.add("active");

      rows.forEach(function(row){
        row.classList.remove("cicd-filter-hidden-v8");

        var type = row.dataset.cicdTypeV8 || "BUSINESS";
        var st = statusOf(row);

        if (mode === "BUSINESS" && type !== "BUSINESS") row.classList.add("cicd-filter-hidden-v8");
        if (mode === "EVIDENCE" && type !== "EVIDENCE") row.classList.add("cicd-filter-hidden-v8");
        if (mode === "FAIL" && st !== "FAIL") row.classList.add("cicd-filter-hidden-v8");
      });
    }

    banner.querySelectorAll("[data-cicd-mode-v8]").forEach(function(btn){
      btn.addEventListener("click", function(){ applyMode(btn.dataset.cicdModeV8); });
    });

    // Production default: Run History = business runs. Evidence remains available in Evidence Artifacts / All Records.
    applyMode("BUSINESS");
  }

  function validateSubtabs(){
    var body = document.body ? document.body.innerText || "" : "";
    var expected = [
      "Pipeline flow",
      "Templates",
      "Scheduler",
      "PR Gate",
      "Autofix",
      "Run history",
      "Evidence"
    ];

    var missing = expected.filter(function(x){
      return !new RegExp(x.replace(/\s+/g, "\\s+"), "i").test(body);
    });

    window.__CICD_SUBTAB_LOGIC_V8_STATE__ = window.__CICD_SUBTAB_LOGIC_V8_STATE__ || {};
    window.__CICD_SUBTAB_LOGIC_V8_STATE__.missingSubtabs = missing;
    window.__CICD_SUBTAB_LOGIC_V8_STATE__.expectedSubtabs = expected;
  }

  function removeWrongGlobalToolbars(){
    document.querySelectorAll(".cicd-prod-toolbar,.cicd-prod-toolbar-v7,[data-cicd-polish-toolbar]").forEach(function(el){
      el.remove();
    });
    document.body && document.body.classList.remove("cicd-production-strict", "cicd-commercial-clean");
  }

  function apply(){
    if (!isCicdPanel()) {
      removeWrongGlobalToolbars();
      return;
    }

    document.body.classList.add("cicd-subtab-logic-v8");
    validateSubtabs();
    shortenEvidencePaths();
    fixRunHistoryLogic();
  }

  document.addEventListener("DOMContentLoaded", apply);
  window.addEventListener("load", apply);
  setTimeout(apply, 300);
  setTimeout(apply, 1200);
  setTimeout(apply, 2500);

  var obs = new MutationObserver(function(){
    clearTimeout(window.__cicdSubtabLogicV8Timer);
    window.__cicdSubtabLogicV8Timer = setTimeout(apply, 120);
  });

  if (document.documentElement) {
    obs.observe(document.documentElement, { childList: true, subtree: true });
  }
})();

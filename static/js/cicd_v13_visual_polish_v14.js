// CICD_V13_VISUAL_POLISH_V14
(function(){
  "use strict";

  if (window.__CICD_V13_VISUAL_POLISH_V14__) return;
  window.__CICD_V13_VISUAL_POLISH_V14__ = true;

  function shortId(s) {
    s = String(s || "");
    if (s.length <= 28) return s;
    if (/^[0-9a-f-]{32,}$/i.test(s)) return s.slice(0, 8) + "…" + s.slice(-6);
    if (s.includes("_")) {
      var parts = s.split("_");
      if (parts.length >= 4) {
        return parts.slice(0, 3).join("_") + "_…" + parts[parts.length - 1];
      }
    }
    return s.slice(0, 22) + "…" + s.slice(-6);
  }

  function wrapCellText(cell, className) {
    if (!cell || cell.dataset.v14Wrapped === "1") return;
    var full = (cell.textContent || "").trim();
    if (!full) return;

    cell.dataset.v14Wrapped = "1";
    cell.title = full;
    cell.textContent = "";

    var span = document.createElement("span");
    span.className = className;
    span.textContent = shortId(full);
    span.title = full;
    cell.appendChild(span);
  }

  function polishOverviewTables() {
    document.querySelectorAll("#overviewRuns tr").forEach(function(row){
      var cells = row.querySelectorAll("td");
      if (cells.length < 3) return;
      wrapCellText(cells[0], "cicd-compact-id-v14");
      wrapCellText(cells[1], "cicd-compact-control-v14");
    });

    document.querySelectorAll("#overviewPr tr").forEach(function(row){
      var cells = row.querySelectorAll("td");
      if (cells.length < 3) return;
      wrapCellText(cells[0], "cicd-compact-id-v14");
      wrapCellText(cells[1], "cicd-compact-control-v14");
    });

    document.querySelectorAll("#timeline .time-title").forEach(function(el){
      if (el.dataset.v14Wrapped === "1") return;
      var full = (el.textContent || "").trim();
      el.dataset.v14Wrapped = "1";
      el.title = full;
      el.textContent = shortId(full);
    });
  }

  function apply() {
    polishOverviewTables();
  }

  document.addEventListener("DOMContentLoaded", apply);
  window.addEventListener("load", apply);
  setTimeout(apply, 500);
  setTimeout(apply, 1500);
  setTimeout(apply, 3000);

  var obs = new MutationObserver(function(){
    clearTimeout(window.__cicdV14Timer);
    window.__cicdV14Timer = setTimeout(apply, 100);
  });

  if (document.documentElement) {
    obs.observe(document.documentElement, { childList: true, subtree: true });
  }
})();

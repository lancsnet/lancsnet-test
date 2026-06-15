// CICD_COMMERCIAL_POLISH_V5
(function(){
  "use strict";

  window.VSP_DEBUG = window.VSP_DEBUG || false;

  // Production-clean console: only show debug logs when explicitly enabled.
  if (!window.VSP_DEBUG && !window.__CICD_CONSOLE_GUARD_V5__) {
    window.__CICD_CONSOLE_GUARD_V5__ = true;
    const rawLog = console.log.bind(console);
    console.log = function(){
      const msg = String(arguments[0] || "");
      const noisy =
        msg.includes("[VSP-LOGIN-") ||
        msg.includes("[VSP-V") ||
        msg.includes("Unified showPanel dispatcher") ||
        msg.includes("selected panel iframe restored") ||
        msg.includes("VSP PRO v");
      if (noisy) return;
      return rawLog.apply(console, arguments);
    };
  }

  function textOf(el){
    return (el && el.textContent || "").replace(/\s+/g, " ").trim();
  }

  function lower(s){ return String(s || "").toLowerCase(); }

  function isCicdPage(){
    const t = lower(document.body ? document.body.innerText : "");
    return t.includes("ci/cd") || t.includes("cicd") || t.includes("scheduler") || t.includes("pr gate");
  }

  function normalizeHeader(){
    const candidates = Array.from(document.querySelectorAll("h1,h2,h3,.title,[class*='title'],[class*='breadcrumb'],[class*='page']"));
    candidates.forEach(el => {
      const t = textOf(el);
      if (/^cicd$/i.test(t) || /^ci\/cd$/i.test(t)) {
        el.textContent = "CI/CD DevSecOps";
        const note = document.createElement("span");
        note.className = "cicd-production-note";
        note.textContent = "PoC Ready";
        el.appendChild(note);
      }
    });
  }

  function shortenEvidencePaths(){
    Array.from(document.querySelectorAll("td, a, span, div")).forEach(el => {
      const t = textOf(el);
      if (!t.includes("/home/test/Data/GOLANG_VSP/out_ci/")) return;
      if (el.dataset.cicdShortened === "1") return;

      el.dataset.cicdShortened = "1";
      el.title = t;

      const short = t
        .replace("/home/test/Data/GOLANG_VSP/out_ci/", "out_ci/")
        .replace(/\/([^/]+)$/, "/…/$1");

      if (el.children.length === 0) {
        el.innerHTML = "";
        const s = document.createElement("span");
        s.className = "cicd-evidence-short";
        s.textContent = short;
        el.appendChild(s);
      }
    });
  }

  function findRunHistoryBlock(){
    const headings = Array.from(document.querySelectorAll("h1,h2,h3,h4,div,section"));
    let anchor = headings.find(el => /CI\/CD Run History|CICD Run History|Run History/i.test(textOf(el)));
    if (!anchor) return null;

    let cur = anchor;
    for (let i = 0; i < 6 && cur; i++, cur = cur.parentElement) {
      if (cur.querySelector && cur.querySelector("table")) return cur;
    }

    return anchor.closest("section, article, .card, [class*='card'], [class*='panel']") || anchor.parentElement;
  }

  function rowStatus(row){
    const t = textOf(row);
    if (/\bFAIL\b/i.test(t)) return "FAIL";
    if (/\bPASS\b/i.test(t)) return "PASS";
    if (/\bBLOCK\b/i.test(t)) return "BLOCK";
    return "";
  }

  function polishRunHistory(){
    const block = findRunHistoryBlock();
    if (!block || block.dataset.cicdPolished === "1") return;
    block.dataset.cicdPolished = "1";

    const toolbar = document.createElement("div");
    toolbar.setAttribute("data-cicd-polish-toolbar", "1");
    toolbar.innerHTML = `
      <div>
        <div class="title">CI/CD Evidence View</div>
        <div class="sub">Clean view prioritizes latest PASS evidence; archived FAIL rows are hidden by default.</div>
      </div>
      <div class="actions">
        <button type="button" data-cicd-clean class="active">Clean View</button>
        <button type="button" data-cicd-all>Show All</button>
        <button type="button" data-cicd-fail>Show FAIL Only</button>
      </div>
    `;

    block.insertBefore(toolbar, block.firstChild);

    const legend = document.createElement("div");
    legend.className = "cicd-polish-legend";
    legend.innerHTML = `
      <span class="cicd-polish-pill">Latest PASS evidence = highlighted</span>
      <span class="cicd-polish-pill">Old FAIL evidence = hidden in Clean View</span>
      <span class="cicd-polish-pill">Full path available on hover</span>
    `;
    toolbar.insertAdjacentElement("afterend", legend);

    const rows = Array.from(block.querySelectorAll("table tr")).filter(r => r.querySelectorAll("td").length > 0);
    const passRows = rows.filter(r => rowStatus(r) === "PASS");
    passRows.slice(0, 8).forEach(r => r.classList.add("cicd-row-latest-pass"));

    function setMode(mode){
      toolbar.querySelectorAll("button").forEach(b => b.classList.remove("active"));
      const active = toolbar.querySelector(`[data-cicd-${mode}]`);
      if (active) active.classList.add("active");

      rows.forEach((r, idx) => {
        r.classList.remove("cicd-old-fail-hidden", "cicd-old-fail-muted");
        const st = rowStatus(r);
        const isOld = idx > 8;
        if (mode === "clean") {
          if (st === "FAIL" && isOld) r.classList.add("cicd-old-fail-hidden");
          else if (st === "FAIL") r.classList.add("cicd-old-fail-muted");
        }
        if (mode === "fail") {
          if (st !== "FAIL") r.classList.add("cicd-old-fail-hidden");
        }
      });
    }

    toolbar.querySelector("[data-cicd-clean]").addEventListener("click", () => setMode("clean"));
    toolbar.querySelector("[data-cicd-all]").addEventListener("click", () => setMode("all"));
    toolbar.querySelector("[data-cicd-fail]").addEventListener("click", () => setMode("fail"));

    setMode("clean");
  }

  function polishTables(){
    Array.from(document.querySelectorAll("table")).forEach(table => {
      table.dataset.cicdPolished = "1";
    });
  }

  function apply(){
    if (!document.body || !isCicdPage()) return;
    document.body.classList.add("cicd-commercial-clean");
    normalizeHeader();
    shortenEvidencePaths();
    polishRunHistory();
    polishTables();
  }

  document.addEventListener("DOMContentLoaded", apply);
  window.addEventListener("load", apply);
  setTimeout(apply, 500);
  setTimeout(apply, 1500);
  setTimeout(apply, 3000);

  // iframe/panel lazy load can repaint; keep lightweight observer.
  const obs = new MutationObserver(() => {
    clearTimeout(window.__cicdPolishTimer);
    window.__cicdPolishTimer = setTimeout(apply, 150);
  });
  if (document.documentElement) {
    obs.observe(document.documentElement, { childList: true, subtree: true });
  }
})();

// CICD_PRODUCTION_STRICT_V6
(function(){
  "use strict";

  function txt(el){
    return (el && el.textContent || "").replace(/\s+/g, " ").trim();
  }

  function isCicdPage(){
    const t = (document.body && document.body.innerText || "").toLowerCase();
    return t.includes("ci/cd") || t.includes("cicd") || t.includes("scheduler") || t.includes("pr gate") || t.includes("run history");
  }

  function statusOf(row){
    const t = txt(row);
    if (/\bFAIL\b/i.test(t)) return "FAIL";
    if (/\bBLOCK\b/i.test(t)) return "BLOCK";
    if (/\bPASS\b/i.test(t)) return "PASS";
    return "";
  }

  function normalizeHeader(){
    const els = Array.from(document.querySelectorAll("h1,h2,h3,.title,[class*='title'],[class*='breadcrumb'],[class*='page']"));
    els.forEach(el => {
      const t = txt(el);
      if (/^cicd$/i.test(t) || /^ci\/cd$/i.test(t)) {
        el.textContent = "CI/CD DevSecOps";
        const badge = document.createElement("span");
        badge.className = "cicd-prod-badge";
        badge.textContent = "Production";
        el.appendChild(badge);
      }
    });
  }

  function shortenEvidencePaths(){
    Array.from(document.querySelectorAll("td, a, span, div")).forEach(el => {
      if (el.dataset.cicdProdShortened === "1") return;
      if (el.children.length > 2) return;

      const t = txt(el);
      if (!t.includes("/home/test/Data/GOLANG_VSP/out_ci/")) return;

      el.dataset.cicdProdShortened = "1";
      el.title = t;

      const short = t
        .replace("/home/test/Data/GOLANG_VSP/out_ci/", "out_ci/")
        .replace(/\/([^/]+)$/, "/…/$1");

      if (el.children.length === 0) {
        el.textContent = "";
        const s = document.createElement("span");
        s.className = "cicd-evidence-short";
        s.textContent = short;

        const b = document.createElement("button");
        b.type = "button";
        b.className = "cicd-copy-path";
        b.textContent = "copy";
        b.addEventListener("click", function(ev){
          ev.preventDefault();
          ev.stopPropagation();
          navigator.clipboard && navigator.clipboard.writeText(t).catch(function(){});
        });

        el.appendChild(s);
        el.appendChild(b);
      }
    });
  }

  function findRunHistoryBlock(){
    const all = Array.from(document.querySelectorAll("h1,h2,h3,h4,div,section,article"));
    const anchor = all.find(el => /CI\/CD Run History|CICD Run History|Run History/i.test(txt(el)));
    if (!anchor) return null;

    let cur = anchor;
    for (let i=0; i<8 && cur; i++, cur=cur.parentElement) {
      if (cur.querySelector && cur.querySelector("table")) return cur;
    }
    return anchor.closest("section, article, .card, [class*='card'], [class*='panel']") || anchor.parentElement;
  }

  function productionToolbar(){
    const block = findRunHistoryBlock();
    if (!block || block.dataset.cicdProductionToolbar === "1") return;
    block.dataset.cicdProductionToolbar = "1";

    const rows = Array.from(block.querySelectorAll("table tr")).filter(r => r.querySelectorAll("td").length > 0);
    rows.forEach(r => {
      r.classList.remove("cicd-old-fail-hidden", "cicd-old-fail-muted", "cicd-row-latest-pass");
      const st = statusOf(r);
      if (st === "FAIL") r.classList.add("cicd-prod-row-fail");
      if (st === "PASS") r.classList.add("cicd-prod-row-pass");
      if (st === "BLOCK") r.classList.add("cicd-prod-row-block");
    });

    const pass = rows.filter(r => statusOf(r) === "PASS").length;
    const fail = rows.filter(r => statusOf(r) === "FAIL").length;
    const blockCount = rows.filter(r => statusOf(r) === "BLOCK").length;

    const toolbar = document.createElement("div");
    toolbar.className = "cicd-prod-toolbar";
    toolbar.innerHTML = `
      <div>
        <div class="cicd-prod-title">CI/CD Production Evidence</div>
        <div class="cicd-prod-sub">All records are visible by default. PASS=${pass}, FAIL=${fail}, BLOCK=${blockCount}. Filters are user-driven only.</div>
      </div>
      <div class="cicd-prod-actions">
        <button type="button" data-prod-filter="ALL" class="active">All Records</button>
        <button type="button" data-prod-filter="PASS">PASS</button>
        <button type="button" data-prod-filter="FAIL">FAIL</button>
        <button type="button" data-prod-filter="BLOCK">BLOCK</button>
      </div>
    `;

    block.insertBefore(toolbar, block.firstChild);

    function applyFilter(mode){
      toolbar.querySelectorAll("button").forEach(b => b.classList.remove("active"));
      const active = toolbar.querySelector(`[data-prod-filter="${mode}"]`);
      if (active) active.classList.add("active");

      rows.forEach(r => {
        r.classList.remove("cicd-prod-filter-hidden");
        if (mode !== "ALL" && statusOf(r) !== mode) {
          r.classList.add("cicd-prod-filter-hidden");
        }
      });
    }

    toolbar.querySelectorAll("[data-prod-filter]").forEach(btn => {
      btn.addEventListener("click", () => applyFilter(btn.dataset.prodFilter));
    });

    applyFilter("ALL");
  }

  function removeV5DemoClasses(){
    document.querySelectorAll(".cicd-old-fail-hidden,.cicd-old-fail-muted,.cicd-row-latest-pass").forEach(el => {
      el.classList.remove("cicd-old-fail-hidden", "cicd-old-fail-muted", "cicd-row-latest-pass");
    });
  }

  function apply(){
    if (!document.body || !isCicdPage()) return;
    document.body.classList.add("cicd-production-strict");
    removeV5DemoClasses();
    normalizeHeader();
    shortenEvidencePaths();
    productionToolbar();
  }

  document.addEventListener("DOMContentLoaded", apply);
  window.addEventListener("load", apply);
  setTimeout(apply, 400);
  setTimeout(apply, 1200);
  setTimeout(apply, 2500);

  const obs = new MutationObserver(function(){
    clearTimeout(window.__cicdProdStrictTimer);
    window.__cicdProdStrictTimer = setTimeout(apply, 120);
  });

  if (document.documentElement) {
    obs.observe(document.documentElement, { childList: true, subtree: true });
  }
})();

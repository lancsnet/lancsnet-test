// CICD_ENTERPRISE_OVERVIEW_V15
(function(){
  "use strict";

  if (window.__CICD_ENTERPRISE_OVERVIEW_V15__) return;
  window.__CICD_ENTERPRISE_OVERVIEW_V15__ = true;

  const $ = (id) => document.getElementById(id);

  function esc(v) {
    return String(v == null ? "" : v)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function shortId(s, n = 34) {
    s = String(s || "");
    if (s.length <= n) return s;
    if (/^[0-9a-f-]{28,}$/i.test(s)) return s.slice(0, 8) + "…" + s.slice(-6);
    if (s.includes("_")) {
      const parts = s.split("_");
      if (parts.length >= 4) return parts.slice(0, 3).join("_") + "_…" + parts[parts.length - 1];
    }
    return s.slice(0, n - 8) + "…" + s.slice(-6);
  }

  function badge(v) {
    const s = String(v || "UNKNOWN").toUpperCase();
    let c = "neutral";
    if (["PASS", "ACTIVE", "DONE", "READY", "BUSINESS"].includes(s)) c = "pass";
    else if (["FAIL", "BLOCK", "BLOCKED"].includes(s)) c = "fail";
    else if (["WARN", "PAUSED", "PENDING"].includes(s)) c = "warn";
    else c = "info";
    return '<span class="badge ' + c + '">' + esc(s) + '</span>';
  }

  function extractOverviewRows(tbodyId) {
    const tbody = $(tbodyId);
    if (!tbody) return [];
    return Array.from(tbody.querySelectorAll("tr")).map((tr) => {
      const cells = Array.from(tr.querySelectorAll("td"));
      if (!cells.length) return null;
      return {
        a: (cells[0]?.innerText || "").trim(),
        b: (cells[1]?.innerText || "").trim(),
        c: (cells[2]?.innerText || "").trim()
      };
    }).filter(Boolean);
  }

  function listRows(rows, kind) {
    if (!rows.length) return '<div class="cicd-v15-empty">No data loaded.</div>';
    return rows.slice(0, 7).map((r) => {
      const title = r.a;
      const meta = r.b;
      const st = r.c;
      return [
        '<div class="cicd-v15-row">',
          '<div class="cicd-v15-main">',
            '<div class="cicd-v15-id" title="' + esc(title) + '">' + esc(shortId(title)) + '</div>',
            '<div class="cicd-v15-meta" title="' + esc(meta) + '">' + esc(shortId(meta, 42)) + '</div>',
          '</div>',
          '<div class="cicd-v15-status">' + badge(st) + '</div>',
        '</div>'
      ].join("");
    }).join("");
  }

  function numberFromText(id) {
    const el = $(id);
    if (!el) return 0;
    const m = (el.textContent || "").match(/\d+/);
    return m ? Number(m[0]) : 0;
  }

  function buildV15() {
    const overview = $("tab-overview");
    if (!overview || overview.dataset.v15Built === "1") return;

    const runs = extractOverviewRows("overviewRuns");
    const prs = extractOverviewRows("overviewPr");
    const sched = extractOverviewRows("overviewSched");

    // Wait until data is loaded.
    if (!runs.length && !prs.length && !sched.length) return;

    overview.dataset.v15Built = "1";

    const passRate = ($("kpiPassRate")?.textContent || "—").trim();
    const blocked = ($("kpiBlocked")?.textContent || "0").trim();
    const schedules = ($("kpiSchedules")?.textContent || "0").trim();
    const evidence = ($("kpiEvidence")?.textContent || "0").trim();

    const passNumber = Number(String(passRate).replace("%", "")) || 0;

    const business = $("bizCount")?.textContent || "0";
    const ops = $("opsCount")?.textContent || "0";

    const v15 = document.createElement("div");
    v15.className = "cicd-v15-overview-grid";
    v15.innerHTML = [
      '<div class="cicd-v15-stack">',
        '<div class="cicd-v15-panel">',
          '<div class="cicd-v15-head">',
            '<div><div class="cicd-v15-title">Control health</div><div class="cicd-v15-sub">Production gate health, scheduler state and current evidence footprint.</div></div>',
            badge("PRODUCTION READY"),
          '</div>',
          '<div class="cicd-v15-two">',
            '<div class="cicd-v15-mini"><div class="cicd-v15-mini-label">Gate pass rate</div><div class="cicd-v15-mini-value green">' + esc(passRate) + '</div><div class="cicd-v15-mini-sub">Business decisions</div><div class="cicd-v15-bar"><span style="width:' + Math.max(0, Math.min(100, passNumber)) + '%"></span></div></div>',
            '<div class="cicd-v15-mini"><div class="cicd-v15-mini-label">Blocked PR/MR</div><div class="cicd-v15-mini-value red">' + esc(blocked) + '</div><div class="cicd-v15-mini-sub">Policy or severity block</div><div class="cicd-v15-bar"><span style="width:' + (Number(blocked) ? 28 : 4) + '%;background:linear-gradient(90deg,rgba(239,68,68,.85),rgba(245,158,11,.75))"></span></div></div>',
          '</div>',
        '</div>',

        '<div class="cicd-v15-panel">',
          '<div class="cicd-v15-head">',
            '<div><div class="cicd-v15-title">Latest business runs</div><div class="cicd-v15-sub">Business CI/CD controls only. Fix/UI artifacts are routed to Evidence.</div></div>',
            '<span class="badge info">' + runs.length + ' runs</span>',
          '</div>',
          '<div class="cicd-v15-list">' + listRows(runs, "run") + '</div>',
        '</div>',

        '<div class="cicd-v15-panel">',
          '<div class="cicd-v15-head">',
            '<div><div class="cicd-v15-title">Latest PR/MR decisions</div><div class="cicd-v15-sub">Merge/block decisions with branches and current policy result.</div></div>',
            '<span class="badge info">' + prs.length + ' decisions</span>',
          '</div>',
          '<div class="cicd-v15-list">' + listRows(prs, "pr") + '</div>',
        '</div>',
      '</div>',

      '<div class="cicd-v15-stack">',
        '<div class="cicd-v15-panel">',
          '<div class="cicd-v15-head">',
            '<div><div class="cicd-v15-title">Operational footprint</div><div class="cicd-v15-sub">Scheduler and evidence split for production traceability.</div></div>',
          '</div>',
          '<div class="cicd-v15-risk">',
            '<div class="cicd-v15-risk-card"><div class="cicd-v15-risk-label">Schedules</div><div class="cicd-v15-risk-value blue">' + esc(schedules) + '</div></div>',
            '<div class="cicd-v15-risk-card"><div class="cicd-v15-risk-label">Evidence</div><div class="cicd-v15-risk-value amber">' + esc(evidence) + '</div></div>',
            '<div class="cicd-v15-risk-card"><div class="cicd-v15-risk-label">Business</div><div class="cicd-v15-risk-value green">' + esc(business) + '</div></div>',
            '<div class="cicd-v15-risk-card"><div class="cicd-v15-risk-label">Ops / Fix</div><div class="cicd-v15-risk-value violet">' + esc(ops) + '</div></div>',
          '</div>',
        '</div>',

        '<div class="cicd-v15-panel">',
          '<div class="cicd-v15-head">',
            '<div><div class="cicd-v15-title">Scheduler snapshot</div><div class="cicd-v15-sub">Current active/paused schedules and last result.</div></div>',
            '<span class="badge info">' + sched.length + ' schedules</span>',
          '</div>',
          '<div class="cicd-v15-list">' + listRows(sched, "sched") + '</div>',
        '</div>',

        '<div class="cicd-v15-panel">',
          '<div class="cicd-v15-head">',
            '<div><div class="cicd-v15-title">Control timeline</div><div class="cicd-v15-sub">Latest retained artifacts and control updates.</div></div>',
          '</div>',
          '<div class="timeline" id="timelineV15"></div>',
        '</div>',
      '</div>'
    ].join("");

    // Put V15 right after the section head, before old overview content.
    const head = overview.querySelector(".section-head");
    if (head && head.nextSibling) overview.insertBefore(v15, head.nextSibling);
    else overview.appendChild(v15);

    const originalTimeline = document.querySelector("#timeline");
    const timelineV15 = document.querySelector("#timelineV15");
    if (originalTimeline && timelineV15) {
      timelineV15.innerHTML = originalTimeline.innerHTML;
    }
  }

  function apply() {
    buildV15();
  }

  document.addEventListener("DOMContentLoaded", apply);
  window.addEventListener("load", apply);
  setTimeout(apply, 700);
  setTimeout(apply, 1600);
  setTimeout(apply, 3000);

  const obs = new MutationObserver(() => {
    clearTimeout(window.__cicdV15Timer);
    window.__cicdV15Timer = setTimeout(apply, 120);
  });

  if (document.documentElement) obs.observe(document.documentElement, { childList: true, subtree: true });
})();

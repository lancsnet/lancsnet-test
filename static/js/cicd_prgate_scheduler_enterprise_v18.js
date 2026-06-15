// CICD_PRGATE_SCHEDULER_ENTERPRISE_V18
(function(){
  "use strict";

  if (window.__CICD_PRGATE_SCHEDULER_ENTERPRISE_V18__) return;
  window.__CICD_PRGATE_SCHEDULER_ENTERPRISE_V18__ = true;

  function esc(v) {
    return String(v == null ? "" : v)
      .replace(/&/g,"&amp;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;")
      .replace(/'/g,"&#39;");
  }

  function badge(v) {
    const s = String(v || "UNKNOWN").toUpperCase();
    let c = "neutral";
    if (["PASS","ACTIVE","DONE","READY","ENABLED"].includes(s)) c = "pass";
    else if (["FAIL","BLOCK","BLOCKED"].includes(s)) c = "fail";
    else if (["WARN","PAUSED","PENDING","REVIEW"].includes(s)) c = "warn";
    else c = "info";
    return '<span class="badge ' + c + '">' + esc(s) + '</span>';
  }

  function shortId(s) {
    s = String(s || "");
    if (s.length <= 30) return s;
    if (/^[0-9a-f-]{28,}$/i.test(s)) return s.slice(0, 8) + "…" + s.slice(-6);
    if (s.includes("_")) {
      const p = s.split("_");
      if (p.length >= 4) return p.slice(0,3).join("_") + "_…" + p[p.length - 1];
    }
    return s.slice(0, 22) + "…" + s.slice(-6);
  }

  async function getJson(path) {
    const r = await fetch(path, { credentials: "same-origin" });
    if (!r.ok) throw new Error(path + " HTTP " + r.status);
    return await r.json();
  }

  function arr(x) {
    if (Array.isArray(x)) return x;
    return (x && (x.items || x.rows || x.runs || x.history || x.schedules || x.decisions || x.data)) || [];
  }

  function normPr(x) {
    return {
      id: x.id || x.pr || x.mr || x.name || x.pr_mr || "—",
      platform: x.platform || "—",
      branch: x.branch || "—",
      score: x.score == null ? "—" : x.score,
      chm: x.chm || x.c_h_m || [x.critical || 0, x.high || 0, x.medium || 0].join("/"),
      decision: x.decision || x.status || x.result || "UNKNOWN",
      evidence: x.evidence || x.evidence_path || x.path || ""
    };
  }

  function normSched(x) {
    return {
      name: x.name || x.id || x.schedule_id || "—",
      platform: x.platform || "—",
      branch: x.branch || x.ref || "—",
      profile: x.profile || x.mode || "—",
      frequency: x.frequency || x.cron || x.interval || "—",
      status: x.status || (x.active === false ? "paused" : "active"),
      next: x.next_run || x.next || "—",
      last: x.last_result || x.last || x.result || "—",
      evidence: x.evidence || x.evidence_path || ""
    };
  }

  function prRows(rows) {
    if (!rows.length) return '<div class="cicd-v18-empty">No PR/MR decisions found.</div>';
    return rows.map(r => [
      '<div class="cicd-v18-row">',
        '<div>',
          '<div class="cicd-v18-id" title="' + esc(r.id) + '">' + esc(shortId(r.id)) + '</div>',
          '<div class="cicd-v18-meta">' + esc(r.platform) + ' · ' + esc(r.branch) + ' · score ' + esc(r.score) + ' · C/H/M ' + esc(r.chm) + '</div>',
        '</div>',
        badge(r.decision),
      '</div>'
    ].join("")).join("");
  }

  function schedRows(rows) {
    if (!rows.length) return '<div class="cicd-v18-empty">No schedules found.</div>';
    return rows.map(r => [
      '<div class="cicd-v18-row">',
        '<div>',
          '<div class="cicd-v18-id" title="' + esc(r.name) + '">' + esc(shortId(r.name)) + '</div>',
          '<div class="cicd-v18-meta">' + esc(r.frequency) + ' · ' + esc(r.branch) + ' · next ' + esc(r.next) + ' · last ' + esc(r.last) + '</div>',
        '</div>',
        badge(r.status),
      '</div>'
    ].join("")).join("");
  }

  function lane(title, cls, rows) {
    return [
      '<div class="cicd-v18-lane ' + cls + '">',
        '<div class="cicd-v18-lane-title">' + esc(title) + '</div>',
        '<div class="cicd-v18-list">' + prRows(rows.slice(0, 4)) + '</div>',
      '</div>'
    ].join("");
  }

  function calCards(rows) {
    if (!rows.length) return '<div class="cicd-v18-empty">No schedules found.</div>';
    return rows.map(r => [
      '<div class="cicd-v18-cal-card">',
        '<div class="cicd-v18-cal-title" title="' + esc(r.name) + '">' + esc(shortId(r.name)) + '</div>',
        '<div class="cicd-v18-cal-sub">' + esc(r.frequency) + ' · ' + esc(r.branch) + '</div>',
        '<div style="margin-top:8px">' + badge(r.status) + ' ' + badge(r.last) + '</div>',
      '</div>'
    ].join("")).join("");
  }

  function buildPrGate(pr) {
    const tab = document.getElementById("tab-prgate");
    if (!tab || tab.dataset.v18Built === "1") return;
    tab.dataset.v18Built = "1";
    tab.classList.add("cicd-v18-ready");

    const pass = pr.filter(x => String(x.decision).toUpperCase() === "PASS");
    const block = pr.filter(x => /BLOCK|FAIL/.test(String(x.decision).toUpperCase()));
    const review = pr.filter(x => /WARN|REVIEW|PENDING/.test(String(x.decision).toUpperCase()));
    const total = pr.length;
    const rate = total ? Math.round(pass.length * 100 / total) : 0;

    const ui = document.createElement("div");
    ui.className = "cicd-v18-grid";
    ui.innerHTML = [
      '<div class="cicd-v18-stack">',
        '<div class="cicd-v18-panel">',
          '<div class="cicd-v18-head">',
            '<div><div class="cicd-v18-title">PR/MR decision center</div><div class="cicd-v18-sub">Merge/block decision board based on current policy gate results.</div></div>',
            badge(block.length ? "WARN" : "PASS"),
          '</div>',
          '<div class="cicd-v18-kpis">',
            '<div class="cicd-v18-kpi"><div class="cicd-v18-label">Total decisions</div><div class="cicd-v18-value blue">' + total + '</div><div class="cicd-v18-mini">Loaded PR/MR gates</div></div>',
            '<div class="cicd-v18-kpi"><div class="cicd-v18-label">Pass rate</div><div class="cicd-v18-value green">' + rate + '%</div><div class="cicd-v18-mini">' + pass.length + '/' + total + ' pass</div><div class="cicd-v18-bar"><span style="width:' + rate + '%;background:linear-gradient(90deg,rgba(34,197,94,.9),rgba(96,165,250,.85))"></span></div></div>',
            '<div class="cicd-v18-kpi"><div class="cicd-v18-label">Blocked</div><div class="cicd-v18-value red">' + block.length + '</div><div class="cicd-v18-mini">Merge blocked</div></div>',
            '<div class="cicd-v18-kpi"><div class="cicd-v18-label">Review</div><div class="cicd-v18-value amber">' + review.length + '</div><div class="cicd-v18-mini">Manual review</div></div>',
          '</div>',
        '</div>',

        '<div class="cicd-v18-panel">',
          '<div class="cicd-v18-head">',
            '<div><div class="cicd-v18-title">Decision board</div><div class="cicd-v18-sub">Separated lanes for allowed, blocked and review decisions.</div></div>',
          '</div>',
          '<div class="cicd-v18-board">',
            lane("PASS / Merge allowed", "pass", pass),
            lane("BLOCK / Merge denied", "block", block),
            lane("REVIEW / Manual action", "review", review),
          '</div>',
        '</div>',
      '</div>',

      '<div class="cicd-v18-stack">',
        '<div class="cicd-v18-panel">',
          '<div class="cicd-v18-head">',
            '<div><div class="cicd-v18-title">Policy thresholds</div><div class="cicd-v18-sub">Production gate interpretation for merge protection.</div></div>',
          '</div>',
          '<div class="cicd-v18-policy-grid">',
            '<div class="cicd-v18-policy"><div class="cicd-v18-label">Critical</div><div class="cicd-v18-policy-value red">Block</div><div class="cicd-v18-mini">No merge</div></div>',
            '<div class="cicd-v18-policy"><div class="cicd-v18-label">High</div><div class="cicd-v18-policy-value amber">Review</div><div class="cicd-v18-mini">Approver needed</div></div>',
            '<div class="cicd-v18-policy"><div class="cicd-v18-label">Medium</div><div class="cicd-v18-policy-value blue">Track</div><div class="cicd-v18-mini">SLA tracking</div></div>',
          '</div>',
        '</div>',

        '<div class="cicd-v18-panel">',
          '<div class="cicd-v18-head">',
            '<div><div class="cicd-v18-title">Latest decisions</div><div class="cicd-v18-sub">Most recent PR/MR gate records.</div></div>',
            '<span class="badge info">' + total + ' records</span>',
          '</div>',
          '<div class="cicd-v18-list">' + prRows(pr.slice(0, 8)) + '</div>',
        '</div>',
      '</div>'
    ].join("");

    const head = tab.querySelector(".section-head");
    if (head && head.nextSibling) tab.insertBefore(ui, head.nextSibling);
    else tab.appendChild(ui);
  }

  function buildScheduler(schedules) {
    const tab = document.getElementById("tab-scheduler");
    if (!tab || tab.dataset.v18Built === "1") return;
    tab.dataset.v18Built = "1";
    tab.classList.add("cicd-v18-ready");

    const active = schedules.filter(x => String(x.status).toLowerCase() === "active");
    const paused = schedules.filter(x => String(x.status).toLowerCase() === "paused");
    const lastPass = schedules.filter(x => String(x.last).toUpperCase() === "PASS");

    const ui = document.createElement("div");
    ui.className = "cicd-v18-grid";
    ui.innerHTML = [
      '<div class="cicd-v18-stack">',
        '<div class="cicd-v18-panel">',
          '<div class="cicd-v18-head">',
            '<div><div class="cicd-v18-title">Scheduler command center</div><div class="cicd-v18-sub">Scheduled scans, cadence, active state and latest evidence signal.</div></div>',
            badge(paused.length ? "WARN" : "ACTIVE"),
          '</div>',
          '<div class="cicd-v18-kpis">',
            '<div class="cicd-v18-kpi"><div class="cicd-v18-label">Schedules</div><div class="cicd-v18-value blue">' + schedules.length + '</div><div class="cicd-v18-mini">Total configured</div></div>',
            '<div class="cicd-v18-kpi"><div class="cicd-v18-label">Active</div><div class="cicd-v18-value green">' + active.length + '</div><div class="cicd-v18-mini">Enabled scans</div></div>',
            '<div class="cicd-v18-kpi"><div class="cicd-v18-label">Paused</div><div class="cicd-v18-value amber">' + paused.length + '</div><div class="cicd-v18-mini">Temporarily paused</div></div>',
            '<div class="cicd-v18-kpi"><div class="cicd-v18-label">Last PASS</div><div class="cicd-v18-value green">' + lastPass.length + '</div><div class="cicd-v18-mini">Healthy schedules</div></div>',
          '</div>',
        '</div>',

        '<div class="cicd-v18-panel">',
          '<div class="cicd-v18-head">',
            '<div><div class="cicd-v18-title">Schedule cards</div><div class="cicd-v18-sub">Compact production view of cadence and last result.</div></div>',
          '</div>',
          '<div class="cicd-v18-cal">' + calCards(schedules) + '</div>',
        '</div>',
      '</div>',

      '<div class="cicd-v18-stack">',
        '<div class="cicd-v18-panel">',
          '<div class="cicd-v18-head">',
            '<div><div class="cicd-v18-title">Active schedules</div><div class="cicd-v18-sub">Currently enabled scheduled scans.</div></div>',
            '<span class="badge pass">' + active.length + ' active</span>',
          '</div>',
          '<div class="cicd-v18-list">' + schedRows(active) + '</div>',
        '</div>',

        '<div class="cicd-v18-panel">',
          '<div class="cicd-v18-head">',
            '<div><div class="cicd-v18-title">Paused schedules</div><div class="cicd-v18-sub">Schedules intentionally not running.</div></div>',
            '<span class="badge warn">' + paused.length + ' paused</span>',
          '</div>',
          '<div class="cicd-v18-list">' + schedRows(paused) + '</div>',
        '</div>',
      '</div>'
    ].join("");

    const head = tab.querySelector(".section-head");
    if (head && head.nextSibling) tab.insertBefore(ui, head.nextSibling);
    else tab.appendChild(ui);
  }

  async function init() {
    let pr = [], schedules = [];
    try { pr = arr(await getJson("/api/v1/cicd/pr-gate")).map(normPr); } catch(e) { console.warn("[cicd-v18] pr-gate", e.message); }
    try { schedules = arr(await getJson("/api/v1/cicd/schedules")).map(normSched); } catch(e) { console.warn("[cicd-v18] schedules", e.message); }

    buildPrGate(pr);
    buildScheduler(schedules);
  }

  document.addEventListener("DOMContentLoaded", init);
  window.addEventListener("load", init);
  setTimeout(init, 800);
  setTimeout(init, 1800);
})();

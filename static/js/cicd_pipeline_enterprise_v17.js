// CICD_PIPELINE_ENTERPRISE_V17
(function(){
  "use strict";

  if (window.__CICD_PIPELINE_ENTERPRISE_V17__) return;
  window.__CICD_PIPELINE_ENTERPRISE_V17__ = true;

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
    else if (["WARN","PAUSED","PENDING"].includes(s)) c = "warn";
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

  function normalizePr(x) {
    return {
      id: x.id || x.pr || x.mr || x.name || x.pr_mr || "—",
      branch: x.branch || "—",
      platform: x.platform || "—",
      score: x.score == null ? "—" : x.score,
      chm: x.chm || x.c_h_m || [x.critical || 0, x.high || 0, x.medium || 0].join("/"),
      decision: x.decision || x.status || x.result || "UNKNOWN"
    };
  }

  function normalizeSched(x) {
    return {
      name: x.name || x.id || x.schedule_id || "—",
      status: x.status || (x.active === false ? "paused" : "active"),
      last: x.last_result || x.last || x.result || "—",
      branch: x.branch || x.ref || "—"
    };
  }

  function buildRows(pr) {
    if (!pr.length) return '<div class="cicd-p17-row"><div class="cicd-p17-id">No recent PR/MR decisions</div>' + badge("INFO") + '</div>';
    return pr.slice(0, 6).map(r => [
      '<div class="cicd-p17-row">',
        '<div>',
          '<div class="cicd-p17-id" title="' + esc(r.id) + '">' + esc(shortId(r.id)) + '</div>',
          '<div class="cicd-p17-meta">' + esc(r.platform) + ' · ' + esc(r.branch) + ' · score ' + esc(r.score) + ' · C/H/M ' + esc(r.chm) + '</div>',
        '</div>',
        badge(r.decision),
      '</div>'
    ].join("")).join("");
  }

  function buildSchedulerRows(schedules) {
    if (!schedules.length) return '<div class="cicd-p17-row"><div class="cicd-p17-id">No schedules loaded</div>' + badge("INFO") + '</div>';
    return schedules.slice(0, 5).map(r => [
      '<div class="cicd-p17-row">',
        '<div>',
          '<div class="cicd-p17-id" title="' + esc(r.name) + '">' + esc(shortId(r.name)) + '</div>',
          '<div class="cicd-p17-meta">' + esc(r.branch) + ' · last ' + esc(r.last) + '</div>',
        '</div>',
        badge(r.status),
      '</div>'
    ].join("")).join("");
  }

  function buildPipeline(pr, schedules) {
    const tab = document.getElementById("tab-pipeline");
    if (!tab || tab.dataset.v17Built === "1") return;

    const total = pr.length;
    const pass = pr.filter(x => String(x.decision).toUpperCase() === "PASS").length;
    const block = pr.filter(x => /BLOCK|FAIL/.test(String(x.decision).toUpperCase())).length;
    const rate = total ? Math.round(pass * 100 / total) : 0;
    const active = schedules.filter(x => String(x.status).toLowerCase() === "active").length;
    const paused = schedules.filter(x => String(x.status).toLowerCase() === "paused").length;

    tab.dataset.v17Built = "1";
    tab.classList.add("cicd-pipeline-v17-ready");

    const panel = document.createElement("div");
    panel.className = "cicd-pipeline-v17";
    panel.innerHTML = [
      '<div class="cicd-p17-stack">',
        '<div class="cicd-p17-panel">',
          '<div class="cicd-p17-head">',
            '<div><div class="cicd-p17-title">Runtime pipeline lifecycle</div><div class="cicd-p17-sub">Operational stages from source event to merge/block decision.</div></div>',
            badge(block > 0 ? "WARN" : "PASS"),
          '</div>',
          '<div class="cicd-p17-flow">',
            '<div class="cicd-p17-step"><div class="cicd-p17-step-title">Code Push</div><div class="cicd-p17-step-sub">GitHub/GitLab/Bitbucket source event</div></div>',
            '<div class="cicd-p17-step"><div class="cicd-p17-step-title">CI Scan</div><div class="cicd-p17-step-sub">Build, collect metadata, run scanners</div></div>',
            '<div class="cicd-p17-step"><div class="cicd-p17-step-title">Security Tools</div><div class="cicd-p17-step-sub">SAST, SCA, Secrets, IaC</div></div>',
            '<div class="cicd-p17-step"><div class="cicd-p17-step-title">Policy Gate</div><div class="cicd-p17-step-sub">Severity and threshold evaluation</div></div>',
            '<div class="cicd-p17-step pass"><div class="cicd-p17-step-title">Merge</div><div class="cicd-p17-step-sub">Allowed when criteria pass</div></div>',
            '<div class="cicd-p17-step block"><div class="cicd-p17-step-title">Block</div><div class="cicd-p17-step-sub">Blocked when policy fails</div></div>',
          '</div>',
        '</div>',

        '<div class="cicd-p17-panel">',
          '<div class="cicd-p17-head">',
            '<div><div class="cicd-p17-title">Gate metrics</div><div class="cicd-p17-sub">Current business PR/MR gate state.</div></div>',
          '</div>',
          '<div class="cicd-p17-metrics">',
            '<div class="cicd-p17-metric"><div class="cicd-p17-label">Pass rate</div><div class="cicd-p17-value green">' + rate + '%</div><div class="cicd-p17-mini">' + pass + '/' + total + ' pass</div></div>',
            '<div class="cicd-p17-metric"><div class="cicd-p17-label">Blocked</div><div class="cicd-p17-value red">' + block + '</div><div class="cicd-p17-mini">Blocked decisions</div></div>',
            '<div class="cicd-p17-metric"><div class="cicd-p17-label">Active schedules</div><div class="cicd-p17-value blue">' + active + '</div><div class="cicd-p17-mini">' + paused + ' paused</div></div>',
            '<div class="cicd-p17-metric"><div class="cicd-p17-label">Policy mode</div><div class="cicd-p17-value amber">Gate</div><div class="cicd-p17-mini">Merge protection</div></div>',
          '</div>',
        '</div>',

        '<div class="cicd-p17-panel">',
          '<div class="cicd-p17-head">',
            '<div><div class="cicd-p17-title">Recent gate activity</div><div class="cicd-p17-sub">Latest PR/MR decisions used by the pipeline gate.</div></div>',
            '<span class="badge info">' + total + ' decisions</span>',
          '</div>',
          '<div class="cicd-p17-list">' + buildRows(pr) + '</div>',
        '</div>',
      '</div>',

      '<div class="cicd-p17-stack">',
        '<div class="cicd-p17-panel">',
          '<div class="cicd-p17-head">',
            '<div><div class="cicd-p17-title">Tool coverage</div><div class="cicd-p17-sub">Security controls expected in the CI/CD gate.</div></div>',
            badge("ENABLED"),
          '</div>',
          '<div class="cicd-p17-tool-grid">',
            tool("S", "SAST", "Code security analysis", "ENABLED"),
            tool("D", "SCA", "Dependency and CVE checks", "ENABLED"),
            tool("K", "Secrets", "Token and credential detection", "ENABLED"),
            tool("I", "IaC", "KICS / cloud config checks", "ENABLED"),
            tool("P", "Policy", "Severity threshold gate", "ACTIVE"),
            tool("E", "Evidence", "Result and report retention", "ACTIVE"),
          '</div>',
        '</div>',

        '<div class="cicd-p17-panel">',
          '<div class="cicd-p17-head">',
            '<div><div class="cicd-p17-title">Policy thresholds</div><div class="cicd-p17-sub">Production decision model for merge protection.</div></div>',
          '</div>',
          '<div class="cicd-p17-policy">',
            '<div class="cicd-p17-policy-card"><div class="cicd-p17-label">Critical</div><div class="cicd-p17-policy-value red">Block</div></div>',
            '<div class="cicd-p17-policy-card"><div class="cicd-p17-label">High</div><div class="cicd-p17-policy-value amber">Review</div></div>',
            '<div class="cicd-p17-policy-card"><div class="cicd-p17-label">Medium</div><div class="cicd-p17-policy-value blue">Track</div></div>',
          '</div>',
        '</div>',

        '<div class="cicd-p17-panel">',
          '<div class="cicd-p17-head">',
            '<div><div class="cicd-p17-title">Scheduler activity</div><div class="cicd-p17-sub">Active and paused schedules feeding the pipeline.</div></div>',
            '<span class="badge info">' + schedules.length + ' schedules</span>',
          '</div>',
          '<div class="cicd-p17-list">' + buildSchedulerRows(schedules) + '</div>',
        '</div>',

        '<div class="cicd-p17-panel">',
          '<div class="cicd-p17-head">',
            '<div><div class="cicd-p17-title">Remediation actions</div><div class="cicd-p17-sub">What should happen after each gate result.</div></div>',
          '</div>',
          '<div class="cicd-p17-actions">',
            '<div class="cicd-p17-action"><div class="cicd-p17-action-title">PASS</div><div class="cicd-p17-action-sub">Allow merge, retain result.json/report artifacts, update audit history.</div></div>',
            '<div class="cicd-p17-action"><div class="cicd-p17-action-title">BLOCK</div><div class="cicd-p17-action-sub">Block merge, create remediation task, notify owner, require re-scan.</div></div>',
            '<div class="cicd-p17-action"><div class="cicd-p17-action-title">WARN</div><div class="cicd-p17-action-sub">Track SLA, request manual approval, keep evidence for review.</div></div>',
          '</div>',
        '</div>',
      '</div>'
    ].join("");

    const head = tab.querySelector(".section-head");
    if (head && head.nextSibling) tab.insertBefore(panel, head.nextSibling);
    else tab.appendChild(panel);
  }

  function tool(icon, name, sub, status) {
    return [
      '<div class="cicd-p17-tool">',
        '<div class="cicd-p17-icon">' + icon + '</div>',
        '<div><div class="cicd-p17-tool-name">' + esc(name) + '</div><div class="cicd-p17-tool-sub">' + esc(sub) + '</div></div>',
        badge(status),
      '</div>'
    ].join("");
  }

  async function init() {
    const tab = document.getElementById("tab-pipeline");
    if (!tab || tab.dataset.v17Init === "1") return;
    tab.dataset.v17Init = "1";

    let pr = [], schedules = [];
    try { pr = arr(await getJson("/api/v1/cicd/pr-gate")).map(normalizePr); } catch(e) { console.warn("[cicd-v17] pr-gate", e.message); }
    try { schedules = arr(await getJson("/api/v1/cicd/schedules")).map(normalizeSched); } catch(e) { console.warn("[cicd-v17] schedules", e.message); }

    buildPipeline(pr, schedules);
  }

  document.addEventListener("DOMContentLoaded", init);
  window.addEventListener("load", init);
  setTimeout(init, 800);
  setTimeout(init, 1800);
})();

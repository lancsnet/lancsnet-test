// CICD_AUTOFIX_REMEDIATION_V20
(function(){
  "use strict";

  if (window.__CICD_AUTOFIX_REMEDIATION_V20__) return;
  window.__CICD_AUTOFIX_REMEDIATION_V20__ = true;

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
    if (["PASS","ACTIVE","DONE","READY","MERGED","RESCAN"].includes(s)) c = "pass";
    else if (["FAIL","BLOCK","BLOCKED","CRITICAL"].includes(s)) c = "fail";
    else if (["WARN","PAUSED","PENDING","REVIEW","OPEN"].includes(s)) c = "warn";
    else c = "info";
    return '<span class="badge ' + c + '">' + esc(s) + '</span>';
  }

  function shortId(s) {
    s = String(s || "");
    if (s.length <= 34) return s;
    if (/^[0-9a-f-]{28,}$/i.test(s)) return s.slice(0, 8) + "…" + s.slice(-6);
    if (s.includes("_")) {
      const p = s.split("_");
      if (p.length >= 4) return p.slice(0,3).join("_") + "_…" + p[p.length - 1];
    }
    return s.slice(0, 25) + "…" + s.slice(-6);
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

  function classify(x) {
    const id = String(x.id || x.run_id || x.rid || x.name || x.artifact_id || "");
    const control = String(x.control || x.control_group || x.name || x.type || "");
    const t = (id + " " + control).toUpperCase();

    if (/^(FIX_|PRODUCTION_|CICD_UI_|MASTER_CONTROL_|CICD_Q2_SLA_)/.test(id.toUpperCase())) return "OPS";
    if (/UI POLISH|PRODUCTION STRICT|TOOLBAR SCOPE|SLA ESCALATION|MASTER CONTROL|FIX /.test(t)) return "OPS";
    return "BUSINESS";
  }

  function normHist(x) {
    const item = {
      id: x.id || x.run_id || x.rid || x.name || x.artifact_id || "—",
      generated: x.generated || x.generated_at || x.created || x.created_at || x.time || "—",
      control: x.control || x.control_group || x.name || x.type || "—",
      status: x.status || x.result || "UNKNOWN",
      path: x.evidence_path || x.evidence || x.path || x.evidence_dir || ""
    };
    item.type = classify(item);
    return item;
  }

  function fixType(item) {
    const t = (item.id + " " + item.control).toUpperCase();
    if (/SUBTAB|LAYOUT|UI|POLISH|OVERVIEW|TOOLBAR/.test(t)) return "UI_FIX";
    if (/PRGATE|PIPELINE|SCHEDULER|HISTORY|EVIDENCE/.test(t)) return "FLOW_FIX";
    if (/SLA/.test(t)) return "SLA_FIX";
    return "SECURITY_FIX";
  }

  function severity(item) {
    const st = String(item.status || "").toUpperCase();
    const t = (item.id + " " + item.control).toUpperCase();
    if (st === "FAIL") return "CRITICAL";
    if (/BLOCK|CRITICAL|SUBTAB|LAYOUT/.test(t)) return "HIGH";
    if (/SLA|POLICY/.test(t)) return "MEDIUM";
    return "LOW";
  }

  function owner(item) {
    const t = (item.id + " " + item.control).toUpperCase();
    if (/UI|LAYOUT|OVERVIEW|TOOLBAR/.test(t)) return "Frontend";
    if (/PIPELINE|PRGATE|SCHEDULER|HISTORY/.test(t)) return "DevSecOps";
    if (/SLA|POLICY/.test(t)) return "Governance";
    return "Security";
  }

  function row(item, mode) {
    const sev = severity(item);
    const fix = fixType(item);
    const own = owner(item);
    const status = String(item.status).toUpperCase() === "FAIL" ? "OPEN" : "READY";

    return [
      '<div class="cicd-v20-row">',
        '<div>',
          '<div class="cicd-v20-id" title="' + esc(item.id) + '">' + esc(shortId(item.id)) + '</div>',
          '<div class="cicd-v20-meta">' + esc(fix) + ' · owner ' + esc(own) + ' · ' + esc(item.generated) + '</div>',
          item.path ? '<div class="cicd-v20-meta"><span class="cicd-v20-path" title="' + esc(item.path) + '">' + esc(String(item.path).replace("/home/test/Data/GOLANG_VSP/out_ci/","out_ci/")) + '</span></div>' : '',
        '</div>',
        '<div>' + badge(sev) + ' ' + badge(status) + '</div>',
      '</div>'
    ].join("");
  }

  function rows(items) {
    if (!items.length) return '<div class="cicd-v20-empty">No remediation records found.</div>';
    return items.map(x => row(x)).join("");
  }

  function lane(title, cls, items) {
    return [
      '<div class="cicd-v20-lane ' + cls + '">',
        '<div class="cicd-v20-lane-title">' + esc(title) + '</div>',
        '<div class="cicd-v20-list">' + rows(items.slice(0, 5)) + '</div>',
      '</div>'
    ].join("");
  }

  function buildAutoFix(history) {
    if (document.getElementById("tab-autofix")) return;

    const nav = document.querySelector(".nav");
    const afterEvidence = nav ? nav.querySelector('[data-tab="evidence"]') : null;

    if (nav && !nav.querySelector('[data-tab="autofix"]')) {
      const btn = document.createElement("button");
      btn.dataset.tab = "autofix";
      btn.textContent = "AutoFix";
      nav.appendChild(btn);

      btn.addEventListener("click", function(){
        document.querySelectorAll(".nav button").forEach(x => x.classList.remove("active"));
        btn.classList.add("active");
        document.querySelectorAll(".panel").forEach(p => p.classList.remove("active"));
        document.getElementById("tab-autofix").classList.add("active");
      });
    }

    const panel = document.createElement("section");
    panel.className = "panel detail";
    panel.id = "tab-autofix";

    const failed = history.filter(x => String(x.status).toUpperCase() === "FAIL");
    const ops = history.filter(x => x.type === "OPS");
    const business = history.filter(x => x.type === "BUSINESS");
    const queue = failed.concat(ops.filter(x => /FIX|UI|LAYOUT|PIPELINE|PRGATE|SCHEDULER/i.test(x.id + " " + x.control)));

    const critical = queue.filter(x => severity(x) === "CRITICAL");
    const high = queue.filter(x => severity(x) === "HIGH");
    const ready = queue.filter(x => String(x.status).toUpperCase() !== "FAIL");

    panel.innerHTML = [
      '<div class="section-head">',
        '<div><div class="section-title">AutoFix / Remediation</div><div class="section-sub">Fix recommendation, auto PR bot, owner/SLA and re-scan workflow.</div></div>',
        '<span class="badge ' + (failed.length ? 'warn' : 'pass') + '">' + (failed.length ? 'ACTION NEEDED' : 'READY') + '</span>',
      '</div>',

      '<div class="cicd-autofix-v20">',
        '<div class="cicd-v20-stack">',
          '<div class="cicd-v20-panel">',
            '<div class="cicd-v20-head">',
              '<div><div class="cicd-v20-title">Remediation command center</div><div class="cicd-v20-sub">Queue of failed gates and fix artifacts that require owner action or re-scan.</div></div>',
              badge(failed.length ? "WARN" : "PASS"),
            '</div>',
            '<div class="cicd-v20-kpis">',
              '<div class="cicd-v20-kpi"><div class="cicd-v20-label">Open fixes</div><div class="cicd-v20-value red">' + failed.length + '</div><div class="cicd-v20-mini">Failed items</div></div>',
              '<div class="cicd-v20-kpi"><div class="cicd-v20-label">Fix queue</div><div class="cicd-v20-value amber">' + queue.length + '</div><div class="cicd-v20-mini">Actionable records</div></div>',
              '<div class="cicd-v20-kpi"><div class="cicd-v20-label">Ops evidence</div><div class="cicd-v20-value blue">' + ops.length + '</div><div class="cicd-v20-mini">UI/fix/prod artifacts</div></div>',
              '<div class="cicd-v20-kpi"><div class="cicd-v20-label">Business</div><div class="cicd-v20-value green">' + business.length + '</div><div class="cicd-v20-mini">Control evidence</div></div>',
            '</div>',
          '</div>',

          '<div class="cicd-v20-panel">',
            '<div class="cicd-v20-head">',
              '<div><div class="cicd-v20-title">AutoFix lifecycle</div><div class="cicd-v20-sub">Production workflow from finding to evidence-backed closure.</div></div>',
            '</div>',
            '<div class="cicd-v20-flow">',
              '<div class="cicd-v20-step warn"><div class="cicd-v20-step-title">Detect</div><div class="cicd-v20-step-sub">Gate fail or finding detected</div></div>',
              '<div class="cicd-v20-step"><div class="cicd-v20-step-title">Recommend</div><div class="cicd-v20-step-sub">Suggest fix and owner</div></div>',
              '<div class="cicd-v20-step"><div class="cicd-v20-step-title">Auto PR</div><div class="cicd-v20-step-sub">Patch branch or PR bot</div></div>',
              '<div class="cicd-v20-step"><div class="cicd-v20-step-title">Re-scan</div><div class="cicd-v20-step-sub">Validate after fix</div></div>',
              '<div class="cicd-v20-step pass"><div class="cicd-v20-step-title">Close</div><div class="cicd-v20-step-sub">Evidence retained</div></div>',
            '</div>',
          '</div>',

          '<div class="cicd-v20-panel">',
            '<div class="cicd-v20-head">',
              '<div><div class="cicd-v20-title">Remediation queue</div><div class="cicd-v20-sub">Current items requiring fix, review or re-scan.</div></div>',
              '<span class="badge info">' + queue.length + ' items</span>',
            '</div>',
            '<div class="cicd-v20-list">' + rows(queue.slice(0, 12)) + '</div>',
          '</div>',
        '</div>',

        '<div class="cicd-v20-stack">',
          '<div class="cicd-v20-panel">',
            '<div class="cicd-v20-head">',
              '<div><div class="cicd-v20-title">Priority lanes</div><div class="cicd-v20-sub">Separate critical, high and ready-to-rescan remediation work.</div></div>',
            '</div>',
            '<div class="cicd-v20-board">',
              lane("Critical / Open", "critical", critical),
              lane("High / Review", "review", high),
              lane("Ready / Re-scan", "ready", ready),
            '</div>',
          '</div>',

          '<div class="cicd-v20-panel">',
            '<div class="cicd-v20-head">',
              '<div><div class="cicd-v20-title">Auto PR bot</div><div class="cicd-v20-sub">How automated fixes should behave in production.</div></div>',
              badge("READY"),
            '</div>',
            '<div class="cicd-v20-action-grid">',
              '<div class="cicd-v20-action"><div class="cicd-v20-action-title">Create patch branch</div><div class="cicd-v20-action-sub">Generate minimal patch branch from fix recommendation.</div></div>',
              '<div class="cicd-v20-action"><div class="cicd-v20-action-title">Open pull request</div><div class="cicd-v20-action-sub">Attach finding, evidence path and remediation reason.</div></div>',
              '<div class="cicd-v20-action"><div class="cicd-v20-action-title">Request review</div><div class="cicd-v20-action-sub">Assign owner by module or rule category.</div></div>',
              '<div class="cicd-v20-action"><div class="cicd-v20-action-title">Re-scan after merge</div><div class="cicd-v20-action-sub">Run CI/CD gate again and retain result.json.</div></div>',
            '</div>',
          '</div>',

          '<div class="cicd-v20-panel">',
            '<div class="cicd-v20-head">',
              '<div><div class="cicd-v20-title">SLA / owner rules</div><div class="cicd-v20-sub">Suggested production assignment model.</div></div>',
            '</div>',
            '<div class="cicd-v20-list">',
              '<div class="cicd-v20-row"><div><div class="cicd-v20-id">Critical / FAIL</div><div class="cicd-v20-meta">Owner: Security + DevSecOps · SLA: immediate</div></div>' + badge("CRITICAL") + '</div>',
              '<div class="cicd-v20-row"><div><div class="cicd-v20-id">UI / Layout fix</div><div class="cicd-v20-meta">Owner: Frontend · SLA: next release gate</div></div>' + badge("HIGH") + '</div>',
              '<div class="cicd-v20-row"><div><div class="cicd-v20-id">Policy / SLA worker</div><div class="cicd-v20-meta">Owner: Governance · SLA: tracked</div></div>' + badge("MEDIUM") + '</div>',
            '</div>',
          '</div>',
        '</div>',
      '</div>'
    ].join("");

    const anchor = document.getElementById("tab-evidence");
    if (anchor && anchor.parentElement) anchor.parentElement.appendChild(panel);
    else document.body.appendChild(panel);
  }

  async function init() {
    let history = [];
    try {
      history = arr(await getJson("/api/v1/cicd/run-history")).map(normHist);
    } catch(e) {
      console.warn("[cicd-v20] run-history", e.message);
    }

    buildAutoFix(history);
  }

  document.addEventListener("DOMContentLoaded", init);
  window.addEventListener("load", init);
  setTimeout(init, 800);
  setTimeout(init, 1800);
})();

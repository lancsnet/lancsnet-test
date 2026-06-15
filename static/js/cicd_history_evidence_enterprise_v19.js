// CICD_HISTORY_EVIDENCE_ENTERPRISE_V19
(function(){
  "use strict";

  if (window.__CICD_HISTORY_EVIDENCE_ENTERPRISE_V19__) return;
  window.__CICD_HISTORY_EVIDENCE_ENTERPRISE_V19__ = true;

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
    if (["PASS","ACTIVE","DONE","READY","BUSINESS"].includes(s)) c = "pass";
    else if (["FAIL","BLOCK","BLOCKED"].includes(s)) c = "fail";
    else if (["WARN","PAUSED","PENDING","OPS"].includes(s)) c = "warn";
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

  function row(r, showType) {
    return [
      '<div class="cicd-v19-row">',
        '<div>',
          '<div class="cicd-v19-id" title="' + esc(r.id) + '">' + esc(shortId(r.id)) + '</div>',
          '<div class="cicd-v19-meta" title="' + esc(r.control + " · " + r.generated + " · " + r.path) + '">' +
            esc(shortId(r.control, 44)) + ' · ' + esc(r.generated) +
          '</div>',
          r.path ? '<div class="cicd-v19-meta"><span class="cicd-v19-path" title="' + esc(r.path) + '">' + esc(String(r.path).replace("/home/test/Data/GOLANG_VSP/out_ci/","out_ci/")) + '</span></div>' : '',
        '</div>',
        '<div>' + (showType ? badge(r.type) + ' ' : '') + badge(r.status) + '</div>',
      '</div>'
    ].join("");
  }

  function rows(items, showType) {
    if (!items.length) return '<div class="cicd-v19-empty">No records found.</div>';
    return items.map(x => row(x, showType)).join("");
  }

  function buildHistory(all) {
    const tab = document.getElementById("tab-history");
    if (!tab || tab.dataset.v19Built === "1") return;

    const business = all.filter(x => x.type === "BUSINESS");
    const pass = business.filter(x => String(x.status).toUpperCase() === "PASS");
    const fail = business.filter(x => String(x.status).toUpperCase() === "FAIL");
    const recent = business.slice(0, 10);

    tab.dataset.v19Built = "1";
    tab.classList.add("cicd-v19-ready");

    const ui = document.createElement("div");
    ui.className = "cicd-v19-grid";
    ui.innerHTML = [
      '<div class="cicd-v19-stack">',
        '<div class="cicd-v19-panel">',
          '<div class="cicd-v19-head">',
            '<div><div class="cicd-v19-title">Run history command center</div><div class="cicd-v19-sub">Business CI/CD runs only. Operational evidence remains available in Evidence.</div></div>',
            badge(fail.length ? "WARN" : "PASS"),
          '</div>',
          '<div class="cicd-v19-kpis">',
            '<div class="cicd-v19-kpi"><div class="cicd-v19-label">Business runs</div><div class="cicd-v19-value blue">' + business.length + '</div><div class="cicd-v19-mini">Filtered from evidence history</div></div>',
            '<div class="cicd-v19-kpi"><div class="cicd-v19-label">PASS</div><div class="cicd-v19-value green">' + pass.length + '</div><div class="cicd-v19-mini">Successful controls</div></div>',
            '<div class="cicd-v19-kpi"><div class="cicd-v19-label">FAIL</div><div class="cicd-v19-value red">' + fail.length + '</div><div class="cicd-v19-mini">Requires attention</div></div>',
            '<div class="cicd-v19-kpi"><div class="cicd-v19-label">Retained</div><div class="cicd-v19-value amber">' + all.length + '</div><div class="cicd-v19-mini">All evidence artifacts</div></div>',
          '</div>',
        '</div>',

        '<div class="cicd-v19-panel">',
          '<div class="cicd-v19-head">',
            '<div><div class="cicd-v19-title">Latest business runs</div><div class="cicd-v19-sub">Clean operational run list for CI/CD controls.</div></div>',
            '<span class="badge info">' + recent.length + ' latest</span>',
          '</div>',
          '<div class="cicd-v19-list">' + rows(recent, false) + '</div>',
        '</div>',
      '</div>',

      '<div class="cicd-v19-stack">',
        '<div class="cicd-v19-panel">',
          '<div class="cicd-v19-head">',
            '<div><div class="cicd-v19-title">Run outcome split</div><div class="cicd-v19-sub">Separate successful controls from runs needing review.</div></div>',
          '</div>',
          '<div class="cicd-v19-split">',
            '<div class="cicd-v19-split-card business"><div class="cicd-v19-split-title">PASS runs</div><div class="cicd-v19-list">' + rows(pass.slice(0, 5), false) + '</div></div>',
            '<div class="cicd-v19-split-card fail"><div class="cicd-v19-split-title">FAIL runs</div><div class="cicd-v19-list">' + rows(fail.slice(0, 5), false) + '</div></div>',
            '<div class="cicd-v19-split-card ops"><div class="cicd-v19-split-title">Audit trail</div><div class="cicd-v19-list">' + rows(business.slice(0, 5), false) + '</div></div>',
          '</div>',
        '</div>',
      '</div>'
    ].join("");

    const head = tab.querySelector(".section-head");
    if (head && head.nextSibling) tab.insertBefore(ui, head.nextSibling);
    else tab.appendChild(ui);
  }

  function buildEvidence(all) {
    const tab = document.getElementById("tab-evidence");
    if (!tab || tab.dataset.v19Built === "1") return;

    const business = all.filter(x => x.type === "BUSINESS");
    const ops = all.filter(x => x.type === "OPS");
    const pass = all.filter(x => String(x.status).toUpperCase() === "PASS");
    const fail = all.filter(x => String(x.status).toUpperCase() === "FAIL");

    tab.dataset.v19Built = "1";
    tab.classList.add("cicd-v19-ready");

    const ui = document.createElement("div");
    ui.className = "cicd-v19-grid";
    ui.innerHTML = [
      '<div class="cicd-v19-stack">',
        '<div class="cicd-v19-panel">',
          '<div class="cicd-v19-head">',
            '<div><div class="cicd-v19-title">Evidence center</div><div class="cicd-v19-sub">All retained proof: business controls, production gates, UI fixes, reports and screenshots.</div></div>',
            badge(fail.length ? "WARN" : "PASS"),
          '</div>',
          '<div class="cicd-v19-kpis">',
            '<div class="cicd-v19-kpi"><div class="cicd-v19-label">Total artifacts</div><div class="cicd-v19-value amber">' + all.length + '</div><div class="cicd-v19-mini">Retained proof</div></div>',
            '<div class="cicd-v19-kpi"><div class="cicd-v19-label">Business</div><div class="cicd-v19-value green">' + business.length + '</div><div class="cicd-v19-mini">Control evidence</div></div>',
            '<div class="cicd-v19-kpi"><div class="cicd-v19-label">Ops / Fix</div><div class="cicd-v19-value blue">' + ops.length + '</div><div class="cicd-v19-mini">Operational artifacts</div></div>',
            '<div class="cicd-v19-kpi"><div class="cicd-v19-label">Failed</div><div class="cicd-v19-value red">' + fail.length + '</div><div class="cicd-v19-mini">Needs review</div></div>',
          '</div>',
        '</div>',

        '<div class="cicd-v19-panel">',
          '<div class="cicd-v19-head">',
            '<div><div class="cicd-v19-title">Latest evidence</div><div class="cicd-v19-sub">Most recent artifacts retained by the CI/CD evidence model.</div></div>',
            '<span class="badge info">' + all.length + ' artifacts</span>',
          '</div>',
          '<div class="cicd-v19-list">' + rows(all.slice(0, 12), true) + '</div>',
        '</div>',
      '</div>',

      '<div class="cicd-v19-stack">',
        '<div class="cicd-v19-panel">',
          '<div class="cicd-v19-head">',
            '<div><div class="cicd-v19-title">Evidence classification</div><div class="cicd-v19-sub">Business evidence is separated from ops/fix artifacts.</div></div>',
          '</div>',
          '<div class="cicd-v19-matrix">',
            '<div class="cicd-v19-split-card business"><div class="cicd-v19-split-title">Business controls</div><div class="cicd-v19-list">' + rows(business.slice(0, 6), true) + '</div></div>',
            '<div class="cicd-v19-split-card ops"><div class="cicd-v19-split-title">Ops / UI / Fix</div><div class="cicd-v19-list">' + rows(ops.slice(0, 6), true) + '</div></div>',
          '</div>',
        '</div>',

        '<div class="cicd-v19-panel">',
          '<div class="cicd-v19-head">',
            '<div><div class="cicd-v19-title">Failed evidence</div><div class="cicd-v19-sub">Artifacts that should be reviewed before promotion.</div></div>',
            '<span class="badge fail">' + fail.length + ' fail</span>',
          '</div>',
          '<div class="cicd-v19-list">' + rows(fail.slice(0, 8), true) + '</div>',
        '</div>',
      '</div>'
    ].join("");

    const head = tab.querySelector(".section-head");
    if (head && head.nextSibling) tab.insertBefore(ui, head.nextSibling);
    else tab.appendChild(ui);
  }

  async function init() {
    let history = [];
    try {
      history = arr(await getJson("/api/v1/cicd/run-history")).map(normHist);
    } catch(e) {
      console.warn("[cicd-v19] run-history", e.message);
    }

    buildHistory(history);
    buildEvidence(history);
  }

  document.addEventListener("DOMContentLoaded", init);
  window.addEventListener("load", init);
  setTimeout(init, 800);
  setTimeout(init, 1800);
})();

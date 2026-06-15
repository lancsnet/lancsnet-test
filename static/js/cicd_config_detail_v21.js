// CICD_CONFIG_DETAIL_V21
(function(){
  "use strict";

  if (window.__CICD_CONFIG_DETAIL_V21__) return;
  window.__CICD_CONFIG_DETAIL_V21__ = true;

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
    else if (["FAIL","BLOCK","BLOCKED","CRITICAL"].includes(s)) c = "fail";
    else if (["WARN","PAUSED","PENDING","REVIEW","OPEN"].includes(s)) c = "warn";
    else c = "info";
    return '<span class="badge ' + c + '">' + esc(s) + '</span>';
  }

  function addConfigTab() {
    if (document.querySelector('[data-tab="config"]')) return;

    const nav = document.querySelector(".nav");
    if (!nav) return;

    const btn = document.createElement("button");
    btn.dataset.tab = "config";
    btn.textContent = "Config";
    nav.appendChild(btn);

    btn.addEventListener("click", function(){
      document.querySelectorAll(".nav button").forEach(x => x.classList.remove("active"));
      btn.classList.add("active");
      document.querySelectorAll(".panel").forEach(p => p.classList.remove("active"));
      document.getElementById("tab-config").classList.add("active");
    });
  }

  function buildConfigPanel() {
    if (document.getElementById("tab-config")) return;

    const panel = document.createElement("section");
    panel.className = "panel detail";
    panel.id = "tab-config";

    panel.innerHTML = [
      '<div class="section-head">',
        '<div><div class="section-title">CI/CD Configuration</div><div class="section-sub">Production configuration for gate policy, tools, SLA, owner routing and AutoFix behavior.</div></div>',
        '<span class="badge pass">CONFIG READY</span>',
      '</div>',

      '<div class="cicd-config-v21">',
        '<div class="cicd-v21-stack">',
          '<div class="cicd-v21-panel">',
            '<div class="cicd-v21-head">',
              '<div><div class="cicd-v21-title">Gate policy</div><div class="cicd-v21-sub">Thresholds controlling merge/block behavior.</div></div>',
              badge("ACTIVE"),
            '</div>',
            '<div class="cicd-v21-policy">',
              policy("Critical", "Block", "No merge allowed", "fail"),
              policy("High", "Review", "Approval required", "warn"),
              policy("Medium", "Track", "SLA follow-up", "info"),
            '</div>',
          '</div>',

          '<div class="cicd-v21-panel">',
            '<div class="cicd-v21-head">',
              '<div><div class="cicd-v21-title">Tool coverage</div><div class="cicd-v21-sub">Security tools enabled in the CI/CD gate.</div></div>',
            '</div>',
            '<div class="cicd-v21-grid">',
              setting("SAST", "Code security analysis", true),
              setting("SCA", "Dependency / CVE checks", true),
              setting("Secrets", "Token and credential detection", true),
              setting("IaC", "KICS / cloud configuration checks", true),
              setting("Policy Gate", "Severity threshold decision", true),
              setting("Evidence Retention", "Store result.json, reports, screenshots", true),
            '</div>',
          '</div>',

          '<div class="cicd-v21-panel">',
            '<div class="cicd-v21-head">',
              '<div><div class="cicd-v21-title">AutoFix behavior</div><div class="cicd-v21-sub">Controls for automated remediation workflow.</div></div>',
              badge("READY"),
            '</div>',
            '<div class="cicd-v21-grid">',
              setting("Create patch branch", "Generate branch from recommendation", true),
              setting("Open pull request", "Attach finding and evidence", false),
              setting("Request reviewer", "Assign owner automatically", true),
              setting("Re-scan after fix", "Run CI/CD gate again", true),
            '</div>',
          '</div>',
        '</div>',

        '<div class="cicd-v21-stack">',
          '<div class="cicd-v21-panel">',
            '<div class="cicd-v21-head">',
              '<div><div class="cicd-v21-title">Owner routing</div><div class="cicd-v21-sub">Suggested ownership model by finding type.</div></div>',
            '</div>',
            '<div class="cicd-v21-grid">',
              route("UI / Layout", "Frontend", "Next release gate"),
              route("Pipeline / PR Gate", "DevSecOps", "Same day"),
              route("Policy / SLA", "Governance", "Tracked"),
              route("Critical security", "Security + Dev", "Immediate"),
            '</div>',
          '</div>',

          '<div class="cicd-v21-panel">',
            '<div class="cicd-v21-head">',
              '<div><div class="cicd-v21-title">Evidence settings</div><div class="cicd-v21-sub">Retention and traceability options.</div></div>',
            '</div>',
            '<div class="cicd-v21-grid">',
              setting("Keep reports", "HTML/PDF/result.json retained", true),
              setting("Keep screenshots", "UI evidence retained", true),
              setting("Keep browser trace", "Debug trace when failed", true),
              setting("SHA pinning", "Freeze manifest for regression", true),
            '</div>',
          '</div>',

          '<div class="cicd-v21-panel">',
            '<div class="cicd-v21-head">',
              '<div><div class="cicd-v21-title">Config actions</div><div class="cicd-v21-sub">UI-only controls now. Backend API can be wired next.</div></div>',
            '</div>',
            '<div class="cicd-v21-actions">',
              '<button class="cicd-v21-btn primary" type="button">Save draft</button>',
              '<button class="cicd-v21-btn" type="button">Export config</button>',
              '<button class="cicd-v21-btn" type="button">Validate policy</button>',
              '<button class="cicd-v21-btn" type="button">Reset to baseline</button>',
            '</div>',
          '</div>',
        '</div>',
      '</div>'
    ].join("");

    const last = document.querySelector(".panel:last-of-type");
    if (last && last.parentElement) last.parentElement.appendChild(panel);
    else document.body.appendChild(panel);
  }

  function setting(name, desc, on) {
    return [
      '<div class="cicd-v21-row">',
        '<div>',
          '<div class="cicd-v21-label">' + esc(name) + '</div>',
          '<div class="cicd-v21-mini">' + esc(desc) + '</div>',
        '</div>',
        '<div class="cicd-v21-switch ' + (on ? '' : 'off') + '"></div>',
      '</div>'
    ].join("");
  }

  function route(rule, owner, sla) {
    return [
      '<div class="cicd-v21-row">',
        '<div>',
          '<div class="cicd-v21-label">' + esc(rule) + '</div>',
          '<div class="cicd-v21-value">' + esc(owner) + '</div>',
          '<div class="cicd-v21-mini">SLA: ' + esc(sla) + '</div>',
        '</div>',
        badge("ROUTE"),
      '</div>'
    ].join("");
  }

  function policy(name, action, desc, cls) {
    const label = cls === "fail" ? "BLOCK" : cls === "warn" ? "REVIEW" : "TRACK";
    return [
      '<div class="cicd-v21-policy-card">',
        '<div class="cicd-v21-label">' + esc(name) + '</div>',
        '<div class="cicd-v21-policy-value">' + esc(action) + '</div>',
        '<div class="cicd-v21-mini">' + esc(desc) + '</div>',
        '<div style="margin-top:8px">' + badge(label) + '</div>',
      '</div>'
    ].join("");
  }

  function buildDrawer() {
    if (document.querySelector(".cicd-detail-drawer-v21")) return;

    const backdrop = document.createElement("div");
    backdrop.className = "cicd-detail-backdrop-v21";

    const drawer = document.createElement("aside");
    drawer.className = "cicd-detail-drawer-v21";
    drawer.innerHTML = [
      '<div class="cicd-detail-title-v21">Record detail</div>',
      '<div class="cicd-detail-sub-v21">Click any CI/CD row to inspect metadata, owner, severity and suggested action.</div>',
      '<div id="cicdDetailBodyV21"></div>',
      '<div class="cicd-v21-actions" style="margin-top:12px">',
        '<button class="cicd-v21-btn primary" type="button" id="detailCloseV21">Close</button>',
        '<button class="cicd-v21-btn" type="button">Copy evidence</button>',
        '<button class="cicd-v21-btn" type="button">Create task</button>',
      '</div>'
    ].join("");

    document.body.appendChild(backdrop);
    document.body.appendChild(drawer);

    function close() {
      drawer.classList.remove("open");
      backdrop.classList.remove("open");
    }

    backdrop.addEventListener("click", close);
    drawer.querySelector("#detailCloseV21").addEventListener("click", close);
  }

  function openDetailFromRow(row) {
    buildDrawer();

    const drawer = document.querySelector(".cicd-detail-drawer-v21");
    const backdrop = document.querySelector(".cicd-detail-backdrop-v21");
    const body = document.getElementById("cicdDetailBodyV21");

    const text = (row.innerText || "").replace(/\n+/g, "\n").trim();
    const id = row.querySelector(".cicd-v20-id,.cicd-v19-id,.cicd-v18-id,.cicd-p17-id,.cicd-v15-id,.mono")?.textContent || "—";
    const badges = Array.from(row.querySelectorAll(".badge")).map(x => x.textContent.trim()).join(", ") || "—";

    body.innerHTML = [
      field("Record ID", id),
      field("Status / Labels", badges),
      field("Raw row", text),
      field("Suggested owner", suggestOwner(text)),
      field("Suggested action", suggestAction(text)),
      field("Evidence policy", "Keep result.json/report/screenshot and link this record to the next gate run.")
    ].join("");

    drawer.classList.add("open");
    backdrop.classList.add("open");
  }

  function field(k, v) {
    return [
      '<div class="cicd-detail-field-v21">',
        '<div class="cicd-detail-key-v21">' + esc(k) + '</div>',
        '<div class="cicd-detail-val-v21">' + esc(v) + '</div>',
      '</div>'
    ].join("");
  }

  function suggestOwner(text) {
    const t = String(text || "").toUpperCase();
    if (/UI|LAYOUT|OVERVIEW|TOOLBAR/.test(t)) return "Frontend";
    if (/PIPELINE|PRGATE|SCHEDULER|HISTORY|EVIDENCE|AUTOFIX/.test(t)) return "DevSecOps";
    if (/POLICY|SLA|GOVERNANCE/.test(t)) return "Governance";
    if (/CRITICAL|FAIL|BLOCK/.test(t)) return "Security + Dev";
    return "Security";
  }

  function suggestAction(text) {
    const t = String(text || "").toUpperCase();
    if (/FAIL|BLOCK|CRITICAL/.test(t)) return "Open remediation task, assign owner, patch, re-scan, retain evidence.";
    if (/READY|PASS/.test(t)) return "Ready for re-scan or closure after evidence verification.";
    return "Review record, classify severity, link evidence and decide next action.";
  }

  function makeRowsClickable() {
    const selector = [
      ".cicd-v20-row",
      ".cicd-v19-row",
      ".cicd-v18-row",
      ".cicd-p17-row",
      ".cicd-v15-row",
      "#tab-prgate tbody tr",
      "#tab-scheduler tbody tr",
      "#tab-history tbody tr",
      "#tab-evidence tbody tr"
    ].join(",");

    document.querySelectorAll(selector).forEach(row => {
      if (row.dataset.v21Clickable === "1") return;
      row.dataset.v21Clickable = "1";
      row.classList.add("cicd-clickable-detail-v21");
      row.addEventListener("click", () => openDetailFromRow(row));
    });
  }

  function init() {
    addConfigTab();
    buildConfigPanel();
    buildDrawer();
    makeRowsClickable();
  }

  document.addEventListener("DOMContentLoaded", init);
  window.addEventListener("load", init);
  setTimeout(init, 800);
  setTimeout(init, 1800);
  setTimeout(init, 3200);

  const obs = new MutationObserver(() => {
    clearTimeout(window.__cicdV21Timer);
    window.__cicdV21Timer = setTimeout(makeRowsClickable, 150);
  });

  if (document.documentElement) {
    obs.observe(document.documentElement, { childList: true, subtree: true });
  }
})();

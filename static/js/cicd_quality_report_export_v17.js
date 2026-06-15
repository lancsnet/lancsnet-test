/* CICD_QUALITY_REPORT_EXPORT_V17 */
(function(){
  if (window.__CICD_QUALITY_REPORT_EXPORT_V17__) return;
  window.__CICD_QUALITY_REPORT_EXPORT_V17__ = true;

  const API = {
    config: "/api/v1/cicd/config",
    queue: "/api/v1/cicd/queue",
    status: "/api/v1/cicd/status"
  };

  async function getJSON(url) {
    const res = await fetch(url, {
      method: "GET",
      headers: { "Accept": "application/json" },
      credentials: "same-origin"
    });
    const text = await res.text();
    let data = {};
    try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
    if (!res.ok) throw Object.assign(new Error("HTTP " + res.status), { status: res.status, data });
    return data;
  }

  function normalizeControls(root) {
    root = root || document;

    const controls = Array.from(root.querySelectorAll("input, select, textarea, button"));
    let fixed = 0;

    controls.forEach(function(el, idx){
      const type = el.tagName.toLowerCase();
      const stable = el.id || el.name || el.getAttribute("aria-label") || `${type}-${idx}`;
      const clean = stable
        .toString()
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/g, "-")
        .replace(/^-+|-+$/g, "") || `${type}-${idx}`;

      if (!el.id) {
        el.id = "cicd-v17-" + clean;
        fixed++;
      }

      if (!el.name) {
        el.name = el.id;
        fixed++;
      }

      if (!el.getAttribute("aria-label")) {
        const label = root.querySelector(`label[for="${el.id}"]`);
        el.setAttribute("aria-label", label ? label.textContent.trim() : el.name);
        fixed++;
      }

      if ((type === "input" || type === "textarea" || type === "select") && !el.getAttribute("autocomplete")) {
        el.setAttribute("autocomplete", "off");
        fixed++;
      }
    });

    return {
      total: controls.length,
      fixed,
      missingName: root.querySelectorAll("input:not([name]), select:not([name]), textarea:not([name]), button:not([name])").length,
      missingId: root.querySelectorAll("input:not([id]), select:not([id]), textarea:not([id]), button:not([id])").length
    };
  }

  function reportPayload() {
    const raw = document.querySelector("#v16-report-json")?.textContent || "";
    try { return JSON.parse(raw); } catch { return { raw }; }
  }

  function downloadFile(name, type, content) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(function(){
      URL.revokeObjectURL(url);
      a.remove();
    }, 250);
  }

  function buildHtmlReport(payload) {
    const esc = (s) => String(s ?? "")
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;");

    const status = payload.status || {};
    const queue = payload.queue || {};
    const config = payload.config || {};

    const items = Array.isArray(queue.items) ? queue.items : [];

    return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>CI/CD Security Report</title>
<style>
body{font-family:Inter,Arial,sans-serif;background:#0b1020;color:#e5edf8;margin:0;padding:28px}
.card{background:#111827;border:1px solid #26324a;border-radius:16px;padding:18px;margin-bottom:16px}
h1{margin:0 0 8px;font-size:24px}
h2{font-size:16px;margin:0 0 12px;color:#b8c6dc}
.grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
.kpi{background:#0b1220;border:1px solid #26324a;border-radius:12px;padding:12px}
.num{font-size:22px;font-weight:800;color:#7fea86}
.txt{font-size:12px;color:#8ea0ba;margin-top:4px}
table{width:100%;border-collapse:collapse}
th,td{border-bottom:1px solid #26324a;padding:10px;text-align:left;font-size:13px}
th{color:#95a3b8;text-transform:uppercase;font-size:11px}
pre{white-space:pre-wrap;background:#050814;border:1px solid #26324a;border-radius:12px;padding:12px;overflow:auto}
</style>
</head>
<body>
  <div class="card">
    <h1>CI/CD Security Report</h1>
    <div>Generated from VSP CI/CD module using real queue/status/config APIs.</div>
  </div>

  <div class="grid card">
    <div class="kpi"><div class="num">${esc(status.latest_status || "n/a")}</div><div class="txt">Latest gate</div></div>
    <div class="kpi"><div class="num">${esc(status.total_runs_today ?? 0)}</div><div class="txt">Runs today</div></div>
    <div class="kpi"><div class="num">${esc(status.blocked_prs ?? 0)}</div><div class="txt">Blocked PR/MR</div></div>
    <div class="kpi"><div class="num">${esc(queue.count ?? 0)}</div><div class="txt">Queue items</div></div>
  </div>

  <div class="card">
    <h2>Queue</h2>
    <table>
      <thead><tr><th>RID</th><th>Branch</th><th>Profile</th><th>Status</th><th>Owner</th></tr></thead>
      <tbody>
        ${
          items.length
          ? items.map(it => `<tr><td>${esc(it.rid)}</td><td>${esc(it.branch)}</td><td>${esc(it.profile)}</td><td>${esc(it.status || "QUEUED")}</td><td>${esc(it.owner || "DevSecOps")}</td></tr>`).join("")
          : `<tr><td colspan="5">No queued jobs. Queue API is active.</td></tr>`
        }
      </tbody>
    </table>
  </div>

  <div class="card">
    <h2>Gate Policy</h2>
    <table>
      <tbody>
        <tr><th>Critical</th><td>${esc(config.gate_policy?.critical || "block")}</td></tr>
        <tr><th>High</th><td>${esc(config.gate_policy?.high || "review")}</td></tr>
        <tr><th>Medium</th><td>${esc(config.gate_policy?.medium || "track")}</td></tr>
        <tr><th>Profile</th><td>${esc(config.profile || config.scheduler?.profile || "n/a")}</td></tr>
      </tbody>
    </table>
  </div>

  <div class="card">
    <h2>Raw Evidence Payload</h2>
    <pre>${esc(JSON.stringify(payload, null, 2))}</pre>
  </div>
</body>
</html>`;
  }

  function enhanceReportsDrawer() {
    const drawer = document.querySelector("#cicd-v16-reports-drawer");
    if (!drawer) return false;

    normalizeControls(drawer);

    const actions = drawer.querySelector(".cicd-v16-actions");
    if (!actions) return false;

    if (!drawer.querySelector("#v17-download-json")) {
      const btn = document.createElement("button");
      btn.id = "v17-download-json";
      btn.name = "v17-download-json";
      btn.type = "button";
      btn.className = "cicd-v17-export-btn";
      btn.textContent = "Download JSON";
      btn.onclick = function(){
        const payload = reportPayload();
        downloadFile("cicd-security-report.json", "application/json", JSON.stringify(payload, null, 2));
      };
      actions.insertBefore(btn, actions.firstChild);
    }

    if (!drawer.querySelector("#v17-download-html")) {
      const btn = document.createElement("button");
      btn.id = "v17-download-html";
      btn.name = "v17-download-html";
      btn.type = "button";
      btn.className = "cicd-v17-export-btn primary";
      btn.textContent = "Download HTML";
      btn.onclick = function(){
        const payload = reportPayload();
        downloadFile("cicd-security-report.html", "text/html", buildHtmlReport(payload));
      };
      actions.insertBefore(btn, actions.firstChild);
    }

    console.log("[CICD-V17] Reports drawer enhanced with JSON/HTML export");
    return true;
  }

  function enhanceAllDrawers() {
    const stats = normalizeControls(document);

    enhanceReportsDrawer();

    document.querySelectorAll(".cicd-v15-drawer, .cicd-v16-drawer").forEach(function(d){
      normalizeControls(d);
    });

    return stats;
  }

  function wrapOpeners() {
    if (!window.__CICD_V17_WRAPPED_OPENERS__) {
      window.__CICD_V17_WRAPPED_OPENERS__ = true;

      ["openCICDSettingsV16", "openCICDReportsV16", "openCICDSchedulerFromLeftMenu"].forEach(function(name){
        const fn = window[name];
        if (typeof fn !== "function") return;

        window[name] = async function(){
          const result = await fn.apply(this, arguments);
          setTimeout(enhanceAllDrawers, 80);
          setTimeout(enhanceAllDrawers, 400);
          return result;
        };
      });
    }
  }

  async function runGate() {
    const status = await getJSON(API.status).catch(e => ({ error: String(e) }));
    const queue = await getJSON(API.queue).catch(e => ({ error: String(e) }));
    const config = await getJSON(API.config).catch(e => ({ error: String(e) }));
    const dom = enhanceAllDrawers();

    const result = {
      ok: !status.error && !queue.error && !config.error && dom.missingName === 0,
      status,
      queue,
      config_source: config.config?.source || config.source || "n/a",
      dom
    };

    window.__CICD_V17_QUALITY_GATE__ = result;
    console.log("[CICD-V17] quality gate", result);
    return result;
  }

  function boot() {
    wrapOpeners();
    enhanceAllDrawers();

    window.runCICDQualityGateV17 = runGate;
    window.enhanceCICDReportsV17 = enhanceReportsDrawer;

    if (!window.__CICD_V17_BOOT_LOGGED__) {
      console.log("[CICD-V17] quality/report export installed");
      window.__CICD_V17_BOOT_LOGGED__ = true;
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  setTimeout(boot, 800);
  setTimeout(boot, 2000);
})();

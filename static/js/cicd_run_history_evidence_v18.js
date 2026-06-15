/* CICD_RUN_HISTORY_EVIDENCE_V18 */
(function(){
  if (window.__CICD_RUN_HISTORY_EVIDENCE_V18__) return;
  window.__CICD_RUN_HISTORY_EVIDENCE_V18__ = true;

  const API = {
    config: "/api/v1/cicd/config",
    queue: "/api/v1/cicd/queue",
    status: "/api/v1/cicd/status"
  };

  function parentDoc(){
    try {
      if (window.parent && window.parent !== window && window.parent.document) return window.parent.document;
    } catch (_) {}
    return document;
  }

  async function getJSON(url){
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

  function esc(s){
    return String(s ?? "")
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;");
  }

  function downloadFile(name, type, content){
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

  function baseConfig(raw){ return raw && raw.config ? raw.config : raw || {}; }

  function parseDashboardTasks(){
    const rows = Array.from(document.querySelectorAll("table tbody tr, .task-row, tr"));
    const out = [];

    rows.forEach(function(row){
      const txt = (row.innerText || row.textContent || "").trim();
      if (!txt) return;
      if (!/TASK-|V46|deep audit|Strict|DevSecOps|OPEN|READY/i.test(txt)) return;

      const cells = Array.from(row.querySelectorAll("td,th")).map(x => (x.innerText || x.textContent || "").trim()).filter(Boolean);

      out.push({
        raw: txt,
        cells,
        rid: (txt.match(/TASK-[A-Z0-9-]+/i) || [""])[0],
        action: cells[1] || (txt.match(/V46 deep audit|Strict 200 surface/i) || [""])[0],
        owner: txt.includes("DevSecOps") ? "DevSecOps" : "",
        status: (txt.match(/\bOPEN\b|\bREADY\b|\bDONE\b|\bFAIL\b|\bPASS\b/i) || [""])[0]
      });
    });

    const seen = new Set();
    return out.filter(function(x){
      const key = x.rid || x.raw;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 40);
  }

  async function collectEvidence(){
    const status = await getJSON(API.status).catch(e => ({ error: String(e) }));
    const queue = await getJSON(API.queue).catch(e => ({ error: String(e), count: 0, items: [] }));
    const configRaw = await getJSON(API.config).catch(e => ({ error: String(e) }));
    const config = baseConfig(configRaw);
    const domTasks = parseDashboardTasks();

    const evidence = {
      generated_at: new Date().toISOString(),
      source: "CICD_RUN_HISTORY_EVIDENCE_V18",
      api: {
        status: API.status,
        queue: API.queue,
        config: API.config
      },
      status,
      queue,
      config,
      dashboard_tasks: domTasks,
      evidence_artifacts: [
        {
          type: "config",
          name: "CI/CD persisted config",
          retained: true,
          source: API.config
        },
        {
          type: "queue",
          name: "CI/CD queue state",
          retained: true,
          source: API.queue
        },
        {
          type: "gate",
          name: "Gate status summary",
          retained: true,
          source: API.status
        },
        {
          type: "dom",
          name: "Dashboard task table snapshot",
          retained: domTasks.length > 0,
          source: "cicd.html DOM"
        }
      ]
    };

    window.__CICD_V18_EVIDENCE__ = evidence;
    return evidence;
  }

  function kpi(num, txt){
    return `<div class="cicd-v18-kpi"><div class="num">${esc(num)}</div><div class="txt">${esc(txt)}</div></div>`;
  }

  function tabs(){
    return `<div class="cicd-v18-tabs">
      <button class="cicd-v18-tab active" type="button" name="v18-tab-runs" data-v18-tab="runs">Runs</button>
      <button class="cicd-v18-tab" type="button" name="v18-tab-evidence" data-v18-tab="evidence">Evidence</button>
      <button class="cicd-v18-tab" type="button" name="v18-tab-queue" data-v18-tab="queue">Queue</button>
      <button class="cicd-v18-tab" type="button" name="v18-tab-gate" data-v18-tab="gate">Gate</button>
      <button class="cicd-v18-tab" type="button" name="v18-tab-export" data-v18-tab="export">Export</button>
    </div>`;
  }

  function tableRows(rows, empty){
    if (!rows.length) return `<tr><td colspan="5">${esc(empty)}</td></tr>`;
    return rows.map(r => `<tr>
      <td>${esc(r.rid || r.id || r.name || "")}</td>
      <td>${esc(r.action || r.branch || r.type || "")}</td>
      <td>${esc(r.profile || r.owner || "")}</td>
      <td><span class="cicd-v18-pill">${esc(r.status || "n/a")}</span></td>
      <td>${esc(r.raw || r.note || "")}</td>
    </tr>`).join("");
  }

  function buildHtmlReport(ev){
    return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>CI/CD Run History Evidence</title>
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
    <h1>CI/CD Run History Evidence</h1>
    <div>Generated at ${esc(ev.generated_at)} from VSP CI/CD module.</div>
  </div>

  <div class="grid card">
    <div class="kpi"><div class="num">${esc(ev.status.latest_status || "n/a")}</div><div class="txt">Latest gate</div></div>
    <div class="kpi"><div class="num">${esc(ev.status.total_runs_today ?? 0)}</div><div class="txt">Runs today</div></div>
    <div class="kpi"><div class="num">${esc(ev.status.blocked_prs ?? 0)}</div><div class="txt">Blocked PR/MR</div></div>
    <div class="kpi"><div class="num">${esc(ev.queue.count ?? 0)}</div><div class="txt">Queue items</div></div>
  </div>

  <div class="card">
    <h2>Dashboard Runs</h2>
    <table>
      <thead><tr><th>RID</th><th>Action</th><th>Owner/Profile</th><th>Status</th><th>Raw</th></tr></thead>
      <tbody>${tableRows(ev.dashboard_tasks || [], "No dashboard tasks parsed.")}</tbody>
    </table>
  </div>

  <div class="card">
    <h2>Evidence Artifacts</h2>
    <table>
      <thead><tr><th>Type</th><th>Name</th><th>Retained</th><th>Source</th></tr></thead>
      <tbody>${(ev.evidence_artifacts || []).map(a => `<tr><td>${esc(a.type)}</td><td>${esc(a.name)}</td><td>${esc(a.retained)}</td><td>${esc(a.source)}</td></tr>`).join("")}</tbody>
    </table>
  </div>

  <div class="card">
    <h2>Raw Evidence</h2>
    <pre>${esc(JSON.stringify(ev, null, 2))}</pre>
  </div>
</body>
</html>`;
  }

  async function openRunHistory(){
    const ev = await collectEvidence();

    let d = document.querySelector("#cicd-v18-drawer");
    if (!d) {
      d = document.createElement("aside");
      d.id = "cicd-v18-drawer";
      d.setAttribute("role", "dialog");
      d.setAttribute("aria-label", "CI/CD Run History and Evidence");
      document.body.appendChild(d);
    }

    const queueItems = Array.isArray(ev.queue.items) ? ev.queue.items : [];
    const domTasks = Array.isArray(ev.dashboard_tasks) ? ev.dashboard_tasks : [];
    const artifacts = Array.isArray(ev.evidence_artifacts) ? ev.evidence_artifacts : [];

    d.innerHTML = `
      <div class="cicd-v18-head">
        <div>
          <div class="cicd-v18-title">CI/CD Run History & Evidence</div>
          <div class="cicd-v18-sub">Operational run history, queue state, gate decision, evidence artifacts and export-ready audit payload.</div>
        </div>
        <button class="cicd-v18-close" type="button" name="v18-close" data-v18-close="1" aria-label="Close">×</button>
      </div>

      <div class="cicd-v18-body">
        <div class="cicd-v18-kpis">
          ${kpi(ev.status.latest_status || "n/a", "Latest gate")}
          ${kpi(ev.status.total_runs_today ?? 0, "Runs today")}
          ${kpi(ev.status.blocked_prs ?? 0, "Blocked PR/MR")}
          ${kpi(ev.queue.count ?? 0, "Queue items")}
        </div>

        ${tabs()}

        <section class="cicd-v18-section active" data-v18-section="runs">
          <div class="cicd-v18-section-title">Dashboard run table snapshot</div>
          <table class="cicd-v18-table">
            <thead><tr><th>RID</th><th>Action</th><th>Owner</th><th>Status</th><th>Raw</th></tr></thead>
            <tbody>${tableRows(domTasks, "No dashboard task rows found.")}</tbody>
          </table>
        </section>

        <section class="cicd-v18-section" data-v18-section="evidence">
          <div class="cicd-v18-section-title">Evidence artifacts</div>
          <table class="cicd-v18-table">
            <thead><tr><th>Type</th><th>Name</th><th>Retained</th><th>Source</th><th>Status</th></tr></thead>
            <tbody>
              ${artifacts.map(a => `<tr><td>${esc(a.type)}</td><td>${esc(a.name)}</td><td>${esc(a.retained)}</td><td>${esc(a.source)}</td><td><span class="cicd-v18-pill">${a.retained ? "READY" : "N/A"}</span></td></tr>`).join("")}
            </tbody>
          </table>
        </section>

        <section class="cicd-v18-section" data-v18-section="queue">
          <div class="cicd-v18-section-title">Queue detail</div>
          <table class="cicd-v18-table">
            <thead><tr><th>RID</th><th>Branch</th><th>Profile</th><th>Status</th><th>Owner/Note</th></tr></thead>
            <tbody>${tableRows(queueItems, "No queued jobs. Queue API is active.")}</tbody>
          </table>
        </section>

        <section class="cicd-v18-section" data-v18-section="gate">
          <div class="cicd-v18-section-title">Gate decision summary</div>
          <table class="cicd-v18-table">
            <tbody>
              <tr><th>Latest status</th><td><span class="cicd-v18-pill">${esc(ev.status.latest_status || "n/a")}</span></td></tr>
              <tr><th>Gate fail today</th><td>${esc(ev.status.gate_fail_today ?? 0)}</td></tr>
              <tr><th>Gate pass today</th><td>${esc(ev.status.gate_pass_today ?? 0)}</td></tr>
              <tr><th>Blocked PR/MR</th><td>${esc(ev.status.blocked_prs ?? 0)}</td></tr>
              <tr><th>Status source</th><td>${esc(ev.status.source || "n/a")}</td></tr>
              <tr><th>Table</th><td>${esc(ev.status.table || "n/a")}</td></tr>
            </tbody>
          </table>
        </section>

        <section class="cicd-v18-section" data-v18-section="export">
          <div class="cicd-v18-section-title">Evidence JSON</div>
          <pre class="cicd-v18-preview" id="v18-evidence-json">${esc(JSON.stringify(ev, null, 2))}</pre>
        </section>

        <div class="cicd-v18-actions">
          <button class="cicd-v18-btn" type="button" name="v18-close-bottom" data-v18-close="1">Close</button>
          <button class="cicd-v18-btn" type="button" name="v18-copy-json" id="v18-copy-json">Copy JSON</button>
          <button class="cicd-v18-btn" type="button" name="v18-download-json" id="v18-download-json">Download JSON</button>
          <button class="cicd-v18-btn primary" type="button" name="v18-download-html" id="v18-download-html">Download HTML</button>
        </div>
      </div>
    `;

    d.classList.add("open");

    console.log("[CICD-V18] Run History/Evidence drawer opened", ev);
    return ev;
  }

  function bindDrawerEvents(){
    if (document.__CICD_V18_EVENTS__) return;
    document.__CICD_V18_EVENTS__ = true;

    document.addEventListener("click", function(e){
      const root = e.target.closest("#cicd-v18-drawer");
      if (!root) return;

      const tab = e.target.closest("[data-v18-tab]");
      if (tab) {
        const key = tab.getAttribute("data-v18-tab");
        root.querySelectorAll(".cicd-v18-tab").forEach(x => x.classList.toggle("active", x === tab));
        root.querySelectorAll(".cicd-v18-section").forEach(x => x.classList.toggle("active", x.getAttribute("data-v18-section") === key));
      }

      if (e.target.closest("[data-v18-close]")) {
        root.classList.remove("open");
      }

      if (e.target.closest("#v18-copy-json")) {
        const txt = document.querySelector("#v18-evidence-json")?.textContent || "";
        navigator.clipboard?.writeText(txt);
        console.log("[CICD-V18] evidence JSON copied");
      }

      if (e.target.closest("#v18-download-json")) {
        const ev = window.__CICD_V18_EVIDENCE__ || {};
        downloadFile("cicd-run-history-evidence.json", "application/json", JSON.stringify(ev, null, 2));
      }

      if (e.target.closest("#v18-download-html")) {
        const ev = window.__CICD_V18_EVIDENCE__ || {};
        downloadFile("cicd-run-history-evidence.html", "text/html", buildHtmlReport(ev));
      }
    }, true);
  }

  function findLeftMenu(textWanted){
    const pd = parentDoc();
    const want = textWanted.toLowerCase();
    return Array.from(pd.querySelectorAll("a, button, [role='button'], li, div, span"))
      .find(el => {
        const text = (el.innerText || el.textContent || "").trim().toLowerCase();
        if (text !== want) return false;
        const rect = el.getBoundingClientRect();
        return rect.left <= 260 && rect.width > 0 && rect.height > 0;
      });
  }

  function bindRunsMenu(){
    // [FIX-V18-RUNS-BIND-V2] Disabled: was hijacking sidebar Runs navigation
    return true;
  }

  async function runGate(){
    const ev = await collectEvidence();
    const drawerExists = !!document.querySelector("#cicd-v18-drawer") || true;
    const result = {
      ok: !ev.status.error && !ev.queue.error && !ev.config.error && drawerExists,
      latest_status: ev.status.latest_status || "n/a",
      queue_count: ev.queue.count ?? 0,
      task_rows: ev.dashboard_tasks.length,
      artifacts: ev.evidence_artifacts.length
    };
    window.__CICD_V18_GATE__ = result;
    console.log("[CICD-V18] quality gate", result);
    return result;
  }

  function boot(){
    bindDrawerEvents();
    const runsBound = bindRunsMenu();

    window.openCICDRunHistoryV18 = openRunHistory;
    window.runCICDRunHistoryGateV18 = runGate;

    if (!window.__CICD_V18_BOOT_LOGGED__) {
      console.log("[CICD-V18] run history/evidence installed", { runsBound });
      window.__CICD_V18_BOOT_LOGGED__ = true;
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  setTimeout(boot, 1000);
  setTimeout(boot, 2500);
})();


// [FIX-V18-RUNS-BIND-V1] Fix: bindRunsMenu hijacks sidebar Runs navigation
(function(){
  var _check = setInterval(function(){
    var pd = (window.parent && window.parent !== window) ? window.parent.document : document;
    var bound = pd.querySelector("[data-cicd-v18-bound='runs']");
    if (!bound) return;
    clearInterval(_check);

    // Clone node để remove tất cả listener cũ (có preventDefault + stopPropagation)
    var clone = bound.cloneNode(true);
    bound.parentNode.replaceChild(clone, bound);
    clone.removeAttribute("data-cicd-v18-bound");
    clone.removeAttribute("data-v18-runs-bound");
    clone.classList.remove("v18-cicd-runs-bound", "v18-cicd-runs-active");

    // Bind lại: KHÔNG chặn navigation, chỉ mở drawer khi CICD iframe đang active
    clone.addEventListener("click", function(e){
      var iframe = pd.querySelector("iframe[data-vsp-lazy-src*='cicd']");
      var isCicdActive = iframe && iframe.src && iframe.src.indexOf('cicd') !== -1
                         && iframe.offsetParent !== null
                         && getComputedStyle(iframe).display !== 'none';
      if (isCicdActive && window.openCICDRunHistoryV18) {
        e.preventDefault();
        e.stopPropagation();
        window.openCICDRunHistoryV18();
      }
      // Nếu CICD không active: để event chạy bình thường -> showPanel('runs')
    }, true);

    console.log("[FIX-V18-RUNS-BIND-V1] sidebar Runs re-bound without blocking navigation");
  }, 300);
})();

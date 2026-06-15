// CICD_REAL_DASHBOARD_API_BLOCK_V1
(function () {
  const MARK = "CICD_REAL_DASHBOARD_API_BLOCK_V1";

  const api = {
    summary: "/api/v1/cicd/summary",
    history: "/api/v1/cicd/run-history",
    latest: "/api/v1/cicd/run-history/latest",
    tools: "/api/v1/cicd/tools",
    autofix: "/api/v1/autofix/metrics"
  };

  function safeText(v, fallback = "-") {
    if (v === null || v === undefined || v === "") return fallback;
    return String(v);
  }

  function esc(v) {
    return safeText(v)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function statusClass(status) {
    const s = safeText(status).toLowerCase();
    if (s.includes("pass") || s.includes("success") || s === "ok") return "cicd-real-status-pass";
    if (s.includes("fail") || s.includes("error")) return "cicd-real-status-fail";
    if (s.includes("block")) return "cicd-real-status-blocked";
    if (s.includes("auth") || s.includes("lock")) return "cicd-real-status-locked";
    return "cicd-real-status-warn";
  }

  async function getJson(url) {
    const res = await fetch(url, {
      headers: { "Accept": "application/json" },
      credentials: "same-origin"
    });
    let data = null;
    try {
      data = await res.json();
    } catch (e) {
      data = { error: "invalid json response" };
    }
    return { ok: res.ok, status: res.status, data };
  }

  function kpi(label, value, cls = "") {
    return `
      <div class="cicd-real-card">
        <div class="cicd-real-label">${esc(label)}</div>
        <div class="cicd-real-value ${cls}">${esc(value)}</div>
      </div>
    `;
  }

  function renderLatest(latestPayload) {
    const latest = latestPayload && latestPayload.latest ? latestPayload.latest : {};
    const status = latestPayload && latestPayload.status ? latestPayload.status : latest.status;

    return `
      <div class="cicd-real-section">
        <h3>Latest Pipeline Run</h3>
        <div class="cicd-real-body">
          <div class="cicd-real-meta">
            <b>Run ID</b><span>${esc(latest.run_id)}</span>
            <b>Control</b><span>${esc(latest.control)}</span>
            <b>Status</b><span class="${statusClass(status)}">${esc(status)}</span>
            <b>Generated</b><span>${esc(latest.generated_at)}</span>
            <b>Source</b><span>${esc(latest.source)}</span>
            <b>Evidence</b><span class="cicd-real-path">${esc(latest.evidence_dir)}</span>
            <b>Result file</b><span class="cicd-real-path">${esc(latest.result_file)}</span>
          </div>
        </div>
      </div>
    `;
  }

  function renderTools(toolsPayload) {
    const categories = toolsPayload && toolsPayload.categories ? toolsPayload.categories : {};
    const tools = Array.isArray(toolsPayload && toolsPayload.tools) ? toolsPayload.tools : [];

    const chips = Object.keys(categories).sort().map(k => {
      return `<span class="cicd-real-chip">${esc(k)}: ${esc(categories[k])}</span>`;
    }).join("");

    const topTools = tools.slice(0, 12).map(t => {
      const enabled = t.enabled ? "ON" : "OFF";
      return `<span class="cicd-real-chip">${esc(t.name || t.id)} / ${esc(t.category)} / ${enabled}</span>`;
    }).join("");

    return `
      <div class="cicd-real-section">
        <h3>Security Tool Coverage</h3>
        <div class="cicd-real-body">
          <div class="cicd-real-label">Categories</div>
          <div class="cicd-real-tools">${chips || '<span class="cicd-real-small">No category data</span>'}</div>
          <div style="height:12px"></div>
          <div class="cicd-real-label">Enabled Tool Matrix</div>
          <div class="cicd-real-tools">${topTools || '<span class="cicd-real-small">No tool data</span>'}</div>
        </div>
      </div>
    `;
  }

  function renderHistory(historyPayload) {
    const items = Array.isArray(historyPayload && historyPayload.items) ? historyPayload.items : [];
    const rows = items.slice(0, 20).map(it => {
      const st = safeText(it.status);
      return `
        <tr>
          <td><b>${esc(it.run_id)}</b></td>
          <td>${esc(it.control)}</td>
          <td class="${statusClass(st)}"><b>${esc(st)}</b></td>
          <td>${esc(it.generated_at)}</td>
          <td>${esc(it.source)}</td>
          <td class="cicd-real-path">${esc(it.evidence_dir)}</td>
          <td class="cicd-real-path">${esc(it.result_file)}</td>
        </tr>
      `;
    }).join("");

    return `
      <div class="cicd-real-table-wrap">
        <table class="cicd-real-table">
          <thead>
            <tr>
              <th>Run ID</th>
              <th>Control</th>
              <th>Status</th>
              <th>Generated At</th>
              <th>Source</th>
              <th>Evidence Dir</th>
              <th>Result File</th>
            </tr>
          </thead>
          <tbody>
            ${rows || '<tr><td colspan="7" class="cicd-real-small">No CI/CD run history found</td></tr>'}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderAutofix(autofixRes) {
    const data = autofixRes && autofixRes.data ? autofixRes.data : {};
    const locked = data.error || !autofixRes.ok;
    const label = locked ? "Locked / Auth required" : "Available";
    return `
      <div class="cicd-real-section">
        <h3>AutoFix Metrics</h3>
        <div class="cicd-real-body">
          <div class="cicd-real-meta">
            <b>Status</b><span class="${statusClass(label)}">${esc(label)}</span>
            <b>Reason</b><span>${esc(data.error || "OK")}</span>
            <b>Endpoint</b><span class="cicd-real-path">${esc(api.autofix)}</span>
          </div>
          <div style="height:10px"></div>
          <div class="cicd-real-small">
            AutoFix không hiển thị số liệu giả. Khi backend/session/token sẵn sàng, block này có thể mở rộng để đọc metrics thật.
          </div>
        </div>
      </div>
    `;
  }

  async function loadCicdRealDashboard() {
    const root = document.getElementById("cicd-real-dashboard-root");
    if (!root) return;

    root.innerHTML = `
      <div class="cicd-real-wrap">
        <div class="cicd-real-head">
          <div>
            <div class="cicd-real-title">CI/CD Real Runtime Dashboard</div>
            <div class="cicd-real-sub">Loading live API data...</div>
          </div>
        </div>
      </div>
    `;

    try {
      const [summaryRes, latestRes, historyRes, toolsRes, autofixRes] = await Promise.all([
        getJson(api.summary),
        getJson(api.latest),
        getJson(api.history),
        getJson(api.tools),
        getJson(api.autofix)
      ]);

      const summary = summaryRes.data || {};
      const latestPayload = latestRes.data || {};
      const historyPayload = historyRes.data || {};
      const toolsPayload = toolsRes.data || {};

      const latestStatus = safeText(summary.latest_status || latestPayload.status);
      const updatedAt = safeText(summary.generated_at || historyPayload.generated_at);

      root.innerHTML = `
        <div class="cicd-real-wrap" data-marker="${MARK}">
          <div class="cicd-real-head">
            <div>
              <div class="cicd-real-title">CI/CD Real Runtime Dashboard</div>
              <div class="cicd-real-sub">
                Source: ${esc(summary.source)} / ${esc(summary.table)} · Updated: ${esc(updatedAt)}
              </div>
            </div>
            <button class="cicd-real-refresh" id="cicd-real-refresh-btn">Refresh</button>
          </div>

          <div class="cicd-real-kpis">
            ${kpi("Total Runs Today", summary.total_runs_today)}
            ${kpi("Gate Pass Today", summary.gate_pass_today, "cicd-real-status-pass")}
            ${kpi("Gate Fail Today", summary.gate_fail_today, "cicd-real-status-fail")}
            ${kpi("Blocked PRs", summary.blocked_prs, "cicd-real-status-blocked")}
            ${kpi("Latest Status", latestStatus, statusClass(latestStatus))}
          </div>

          <div class="cicd-real-grid">
            ${renderLatest(latestPayload)}
            ${renderTools(toolsPayload)}
          </div>

          <div class="cicd-real-grid">
            ${renderAutofix(autofixRes)}
            <div class="cicd-real-section">
              <h3>API Wiring</h3>
              <div class="cicd-real-body">
                <div class="cicd-real-meta">
                  <b>Summary</b><span class="cicd-real-path">${esc(api.summary)}</span>
                  <b>History</b><span class="cicd-real-path">${esc(api.history)}</span>
                  <b>Latest</b><span class="cicd-real-path">${esc(api.latest)}</span>
                  <b>Tools</b><span class="cicd-real-path">${esc(api.tools)}</span>
                </div>
              </div>
            </div>
          </div>

          <h3 style="margin:18px 0 8px;font-size:14px;">Recent CI/CD Runs</h3>
          ${renderHistory(historyPayload)}
        </div>
      `;

      const btn = document.getElementById("cicd-real-refresh-btn");
      if (btn) btn.addEventListener("click", loadCicdRealDashboard);

      window.__CICD_REAL_DASHBOARD_API_BLOCK_V1__ = {
        loaded: true,
        marker: MARK,
        summary,
        latest: latestPayload,
        history_count: historyPayload.count,
        tools_count: Array.isArray(toolsPayload.tools) ? toolsPayload.tools.length : 0,
        autofix_status: autofixRes.status,
        autofix_error: autofixRes.data && autofixRes.data.error
      };
    } catch (err) {
      root.innerHTML = `
        <div class="cicd-real-wrap" data-marker="${MARK}">
          <div class="cicd-real-error">
            <b>CI/CD real dashboard failed to load.</b><br>
            ${esc(err && err.message ? err.message : err)}
          </div>
        </div>
      `;
    }
  }

  function boot() {
    loadCicdRealDashboard();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();

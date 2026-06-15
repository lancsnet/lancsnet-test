// FIX_CICD_SYNTAX_RESTORE_P0V5_EXTERNAL
(function () {
  "use strict";

  const MARK = "FIX_CICD_SYNTAX_RESTORE_P0V5_EXTERNAL";
  const KNOWN_SEV = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];

  function normStrSafe(value) {
    return String(value == null ? "" : value).toUpperCase().trim();
  }

  function normSevSafe(value) {
    const v = normStrSafe(value);
    return KNOWN_SEV.includes(v) ? v : "UNKNOWN";
  }

  function sevBadgeClsSafe(value) {
    const v = normSevSafe(value);
    return {
      CRITICAL: "r critical",
      HIGH: "a warn",
      MEDIUM: "b info",
      LOW: "n neutral",
      UNKNOWN: "n neutral"
    }[v] || "n neutral";
  }

  function stBadgeClsSafe(value) {
    const v = normStrSafe(value);
    return {
      OPEN: "g open",
      READY: "b ready",
      DONE: "n neutral",
      BLOCKED: "r block",
      FAIL: "r fail",
      FAILED: "r fail",
      PASS: "g pass",
      UNKNOWN: "n neutral"
    }[v] || "n neutral";
  }

  function escSafe(value) {
    if (typeof window.esc === "function") return window.esc(value);
    return String(value == null ? "—" : value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  async function apiSafe(url) {
    if (typeof window.api === "function") return window.api(url);
    try {
      const response = await fetch(url, { credentials: "same-origin" });
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      console.error("[CICD-P0-V5] API fail", url, error);
      return null;
    }
  }

  window.normStr = normStrSafe;
  window.normSev = normSevSafe;
  window.sevBadgeCls = sevBadgeClsSafe;
  window.stBadgeCls = stBadgeClsSafe;

  window.loadQueue = async function loadQueue() {
    const data = await apiSafe("/api/v1/cicd/autofix/queue");

    if (data && Array.isArray(data.queue)) {
      window.TASKS = data.queue.map((item) => ({
        id: item.id,
        action: item.action || (item.raw && item.raw.action) || "—",
        owner: item.owner || "—",
        status: normStrSafe(item.status || "OPEN"),
        severity: normSevSafe(item.severity),
        detail: item.raw || item
      }));
    }

    const tasks = Array.isArray(window.TASKS) ? window.TASKS : [];
    const count = tasks.length;
    const openCount = tasks.filter((item) => normStrSafe(item.status) === "OPEN").length;
    const readyCount = tasks.filter((item) => normStrSafe(item.status) === "READY").length;

    const setText = (id, value) => {
      const element = document.getElementById(id);
      if (element) element.textContent = value;
    };

    setText("m-queue", count);
    setText("m-queue-sub", openCount + " open · " + readyCount + " ready");
    setText("tc-queue", count);
    setText("qc-all", count);
    setText("qc-open", openCount);
    setText("qc-ready", readyCount);

    const queueMetric = document.getElementById("m-queue");
    if (queueMetric) {
      queueMetric.className = "mcard-val " + (count > 50 ? "r" : count > 20 ? "a" : "b");
    }

    if (typeof window.renderQ === "function") {
      window.renderQ(window.curFilter || "all");
    }
  };

  window.renderQ = function renderQ(filter) {
    const tbody = document.getElementById("q-body");
    if (!tbody) return;

    tbody.innerHTML = "";

    const tasks = Array.isArray(window.TASKS) ? window.TASKS : [];
    const selected = normStrSafe(filter || "all");
    const list = selected === "ALL"
      ? tasks
      : tasks.filter((item) => normStrSafe(item.status) === selected);

    if (!list.length) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--t3);padding:24px;font-size:11px">No tasks</td></tr>';
      return;
    }

    list.forEach((item) => {
      const row = document.createElement("tr");
      row.className = "task-row" + (window.expandedId === item.id ? " expanded" : "");

      const severityLabel = normSevSafe(item.severity);
      const statusLabel = normStrSafe(item.status) || "UNKNOWN";
      const severityClass = sevBadgeClsSafe(severityLabel);
      const statusClass = stBadgeClsSafe(statusLabel);

      row.innerHTML =
        '<td><span class="task-id">' + escSafe(item.id) + "</span>" + escSafe(item.action) + "</td>" +
        "<td>" + escSafe(item.action) + "</td>" +
        "<td>" + escSafe(item.owner) + "</td>" +
        '<td><span class="badge ' + severityClass + '">' + severityLabel + "</span></td>" +
        '<td><span class="badge ' + statusClass + '">' + statusLabel + "</span></td>";

      row.onclick = function () {
        window.expandedId = window.expandedId === item.id ? null : item.id;
        window.renderQ(filter);
      };

      tbody.appendChild(row);

      if (window.expandedId === item.id) {
        const expandRow = document.createElement("tr");
        expandRow.className = "expand-row";

        const detail = item.detail || {};
        const lines = Object.entries(detail)
          .filter(([, value]) => value !== null && value !== undefined)
          .map(([key, value]) => {
            const valueClass = typeof value === "boolean" || typeof value === "number" ? "ev" : "es";
            return '<span class="ek">' + escSafe(key) + '</span>: <span class="' + valueClass + '">' + escSafe(JSON.stringify(value)) + "</span>";
          })
          .join("\n");

        expandRow.innerHTML = '<td colspan="5"><div class="expand-inner">' + lines + "</div></td>";
        tbody.appendChild(expandRow);
      }
    });
  };

  window.filterQ = function filterQ(filter, button) {
    window.curFilter = filter || "all";
    document.querySelectorAll("#qtabs .tab-btn").forEach((item) => item.classList.remove("active"));
    if (button) button.classList.add("active");
    window.expandedId = null;
    window.renderQ(window.curFilter);
  };

  window.__CICD_P0_V5_EXTERNAL__ = {
    marker: MARK,
    loaded: true,
    strategy: "restore-clean-html-plus-external-js",
    fixes: ["UNKNOWN severity fallback", "source normalization", "lane empty tint", "parse-time aria-label"]
  };

  console.log("[CICD-P0-V5] installed", window.__CICD_P0_V5_EXTERNAL__);
})();

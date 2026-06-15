/* CICD_ICON_RAIL_DELEGATE_V20C */
(function(){
  if (window.__CICD_ICON_RAIL_DELEGATE_V20C__) return;
  window.__CICD_ICON_RAIL_DELEGATE_V20C__ = true;

  function removeBadOverlays() {
    [
      "#cicd-v20b-settings-hotzone",
      "#cicd-v20b-runs-hotzone",
      "#cicd-v20b-scheduler-hotzone",
      "#cicd-v20b-reports-hotzone",
      ".cicd-v20b-hotzone",
      ".v20-cicd-icon-bound"
    ].forEach(function(sel){
      document.querySelectorAll(sel).forEach(function(x){
        x.classList.remove("v20-cicd-icon-bound", "v20-cicd-icon-active");
        if (x.classList.contains("cicd-v20b-hotzone") || x.id.startsWith("cicd-v20b-")) x.remove();
      });
    });
  }

  function call(name, warn) {
    const fn = window[name];
    if (typeof fn === "function") return fn();
    console.warn("[CICD-V20C] missing opener:", name, warn || "");
  }

  const actions = {
    settings: function(){ return call("openCICDSettingsV16", "Settings"); },
    runs: function(){ return call("openCICDRunHistoryV18", "Runs"); },
    scheduler: function(){ var f=document.querySelector("#panel-cicd iframe"); if(f) f.contentWindow.postMessage({type:"CICD_NAV",tab:"schedule"},"*"); },
    reports: function(){ return call("openCICDReportsV16", "Reports"); }
  };

  function visible(el) {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && cs.display !== "none" && cs.visibility !== "hidden" && Number(cs.opacity || 1) > 0;
  }

  function railCandidates() {
    const all = Array.from(document.querySelectorAll("body *"));
    const candidates = [];

    for (const el of all) {
      if (!visible(el)) continue;
      if (el.id && el.id.startsWith("cicd-v20b-")) continue;

      const r = el.getBoundingClientRect();
      const html = (el.outerHTML || "").toLowerCase();
      const cls = (el.className || "").toString().toLowerCase();

      // Icon rail thật nằm trong vùng trái của iframe/panel.
      if (r.left < 0 || r.left > 72) continue;
      if (r.top < 40 || r.top > 520) continue;
      if (r.width < 12 || r.height < 12 || r.width > 72 || r.height > 72) continue;

      const isIconLike =
        html.includes("<svg") ||
        html.includes("<i") ||
        cls.includes("icon") ||
        cls.includes("rail") ||
        cls.includes("nav") ||
        el.getAttribute("role") === "button" ||
        el.tagName === "BUTTON" ||
        el.tagName === "A";

      if (!isIconLike) continue;

      candidates.push({
        el,
        top: Math.round(r.top),
        left: Math.round(r.left),
        width: Math.round(r.width),
        height: Math.round(r.height),
        cy: Math.round(r.top + r.height / 2),
        cx: Math.round(r.left + r.width / 2),
        text: (el.innerText || el.textContent || el.getAttribute("title") || el.getAttribute("aria-label") || "").trim()
      });
    }

    // Deduplicate nested SVG/path/icon wrappers by center Y bucket.
    const sorted = candidates.sort((a,b) => a.cy - b.cy || b.width*b.height - a.width*a.height);
    const groups = [];

    for (const c of sorted) {
      const g = groups.find(x => Math.abs(x.cy - c.cy) <= 8);
      if (!g) {
        groups.push(c);
      } else {
        const area1 = c.width * c.height;
        const area2 = g.width * g.height;
        if (area1 > area2) Object.assign(g, c);
      }
    }

    return groups;
  }

  function buildMap() {
    const items = railCandidates();

    // Theo rail trong ảnh:
    // 0: CI/logo, 1: grid/dashboard, 2: gear/settings, 3: list/runs,
    // 4: calendar/scheduler, 5: folder/evidence, 6: chart/reports, 7: bell.
    const map = {
      settings: items[2] || items.find(x => /setting|gear|cog/i.test(x.text)),
      runs: items[3] || items.find(x => /run|list/i.test(x.text)),
      scheduler: items[4] || items.find(x => /schedule|calendar/i.test(x.text)),
      reports: items[6] || items.find(x => /report|chart|analytics/i.test(x.text))
    };

    window.__CICD_V20C_RAIL_ITEMS__ = items.map((x, idx) => ({
      idx,
      top: x.top,
      cy: x.cy,
      left: x.left,
      width: x.width,
      height: x.height,
      text: x.text
    }));

    window.__CICD_V20C_RAIL_MAP__ = Object.fromEntries(
      Object.entries(map).map(([k,v]) => [k, v ? { top: v.top, cy: v.cy, text: v.text } : null])
    );

    return map;
  }

  function nearestActionFromClick(ev, map) {
    const y = ev.clientY;
    const x = ev.clientX;

    // Chỉ xử lý click trong icon rail trái.
    if (x > 78) return null;

    const entries = Object.entries(map).filter(([,v]) => !!v);
    if (!entries.length) return null;

    let best = null;
    for (const [name, item] of entries) {
      const dist = Math.abs(y - item.cy);
      if (!best || dist < best.dist) best = { name, item, dist };
    }

    // tránh bắt nhầm click ngoài rail.
    if (!best || best.dist > 24) return null;
    return best;
  }

  function bind() {
    removeBadOverlays();

    const map = buildMap();

    if (!document.__CICD_V20C_CLICK_BOUND__) {
      document.__CICD_V20C_CLICK_BOUND__ = true;

      document.addEventListener("click", function(ev){
        removeBadOverlays();

        const currentMap = buildMap();
        const hit = nearestActionFromClick(ev, currentMap);
        if (!hit) return;

        ev.preventDefault();
        ev.stopPropagation();

        document.querySelectorAll(".cicd-v20c-rail-active").forEach(x => x.classList.remove("cicd-v20c-rail-active"));
        hit.item.el.classList.add("cicd-v20c-rail-active");

        console.log("[CICD-V20C] icon rail click", {
          action: hit.name,
          cy: hit.item.cy,
          dist: hit.dist
        });

        actions[hit.name]();
        return false;
      }, true);
    }

    window.openCICDSettingsFromIconRailV20C = actions.settings;
    window.openCICDRunsFromIconRailV20C = actions.runs;
    window.openCICDSchedulerFromIconRailV20C = actions.scheduler;
    window.openCICDReportsFromIconRailV20C = actions.reports;

    window.__CICD_V20C_STATE__ = {
      mode: "clean event delegation, no visible overlay",
      items: window.__CICD_V20C_RAIL_ITEMS__,
      map: window.__CICD_V20C_RAIL_MAP__
    };

    if (!window.__CICD_V20C_LOGGED__) {
      console.log("[CICD-V20C] clean icon rail delegate installed", window.__CICD_V20C_STATE__);
      window.__CICD_V20C_LOGGED__ = true;
    }

    return window.__CICD_V20C_STATE__;
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bind);
  else bind();

  setTimeout(bind, 800);
  setTimeout(bind, 2000);
})();

/* ============================================================
   JS FIXES v20c-patch1 — 2026-05-28
   ============================================================ */

(function cicdUIFixes() {
  "use strict";

  // ── FIX 2: Queue Items threshold color ───────────────────────────────────
  function applyQueueThreshold() {
    const queueEls = document.querySelectorAll(
      '[data-metric="queue_items"] .metric-value, .cicd-metric-queue-value'
    );
    queueEls.forEach(el => {
      const n = parseInt(el.textContent.trim(), 10);
      if (isNaN(n)) return;
      el.removeAttribute("data-count");
      if      (n > 50) el.setAttribute("data-count", "high");
      else if (n > 20) el.setAttribute("data-count", "mid");
      else             el.setAttribute("data-count", "low");
    });
  }

  // ── FIX 6: Console log deduplication ─────────────────────────────────────
  function dedupeConsoleEntries() {
    const container = document.querySelector(
      ".cicd-console-log, [class*='console-log'], [class*='console-panel']"
    );
    if (!container) return;

    const entries = Array.from(container.querySelectorAll(
      ".cicd-console-entry, [class*='console-entry'], [class*='log-entry']"
    ));
    if (entries.length < 2) return;

    const seen = new Map(); // text → first DOM node
    entries.forEach(el => {
      const key = el.textContent.replace(/\s+/g, " ").trim();
      if (!seen.has(key)) {
        seen.set(key, { node: el, count: 1 });
      } else {
        const record = seen.get(key);
        record.count++;
        el.remove();
        // Update or add badge on first node
        let badge = record.node.querySelector(".cicd-console-dup-badge");
        if (!badge) {
          badge = document.createElement("span");
          badge.className = "cicd-console-dup-badge";
          record.node.prepend(badge);
        }
        badge.textContent = `×${record.count}`;
        badge.title = `${record.count} identical entries collapsed`;
      }
    });
  }

  // ── FIX 4: Settings modal tab active state ────────────────────────────────
  function initSettingsTabs() {
    const tabContainers = document.querySelectorAll(
      ".cicd-settings-tabs, [class*='settings-tab'], .cicd-settings-modal"
    );
    tabContainers.forEach(container => {
      const buttons = container.querySelectorAll("button.tab-btn, [role='tab']");
      buttons.forEach(btn => {
        btn.addEventListener("click", () => {
          buttons.forEach(b => b.classList.remove("active"));
          btn.classList.add("active");
        });
      });
      // Set first as active if none active
      if (buttons.length && !container.querySelector(".active, [aria-selected='true']")) {
        buttons[0].classList.add("active");
      }
    });
  }

  // ── FIX 5: Gate chart Y-axis label + low-point highlight ─────────────────
  function enhanceGateChart() {
    const chartWrapper = document.querySelector(
      ".cicd-chart-wrapper, [class*='gate-pass-chart']"
    );
    if (!chartWrapper) return;

    // Inject Y-axis label if not present
    if (!chartWrapper.querySelector(".cicd-chart-yaxis-label")) {
      const label = document.createElement("div");
      label.className = "cicd-chart-yaxis-label";
      label.textContent = "PASS RATE %";
      chartWrapper.appendChild(label);
    }

    // Mark lowest SVG circle/dot
    const svg = chartWrapper.querySelector("svg");
    if (!svg) return;
    const circles = Array.from(svg.querySelectorAll("circle"));
    if (!circles.length) return;
    let lowest = circles[0];
    circles.forEach(c => {
      if (parseFloat(c.getAttribute("cy")) > parseFloat(lowest.getAttribute("cy"))) {
        lowest = c; // higher cy = lower on chart
      }
    });
    lowest.classList.add("cicd-chart-lowpoint");
    lowest.setAttribute("title", "Lowest gate pass rate in window");
  }

  // ── INIT ─────────────────────────────────────────────────────────────────
  function init() {
    applyQueueThreshold();
    dedupeConsoleEntries();
    initSettingsTabs();
    enhanceGateChart();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // Re-run on dynamic DOM changes (task queue updates, console streaming)
  const observer = new MutationObserver(() => {
    applyQueueThreshold();
    dedupeConsoleEntries();
  });
  const root = document.querySelector("#cicd-root, .cicd-panel, body");
  if (root) {
    observer.observe(root, { childList: true, subtree: true });
  }

})();

/* ============================================================
   JS FIXES v20c-patch2 — 2026-05-28
   ============================================================ */
(function cicdUIFixesP2() {
  "use strict";

  // FIX 2: Queue/metric threshold coloring
  function applyMetricThresholds() {
    // .mcard-val elements — find queue item card by label
    document.querySelectorAll(".mcard").forEach(card => {
      const lbl = (card.querySelector(".mcard-lbl") || card.querySelector(".mcard-sub") || {}).textContent || "";
      const valEl = card.querySelector(".mcard-val");
      if (!valEl) return;
      const n = parseInt(valEl.textContent.trim(), 10);
      if (isNaN(n)) return;

      if (/queue/i.test(lbl)) {
        valEl.setAttribute("data-level", n > 50 ? "high" : n > 20 ? "warn" : "ok");
      }
    });

    // scard-big blocked PR pulse
    document.querySelectorAll(".scard-big").forEach(el => {
      const n = parseInt(el.textContent.trim(), 10);
      if (!isNaN(n) && n > 0) el.classList.add("has-block");
      else el.classList.remove("has-block");
    });
  }

  // FIX 6: Console log dedup — target DevTools-style console panel in shadow
  function dedupeConsole() {
    // Right-side DevTools panel rows — generic selectors
    const containers = document.querySelectorAll(
      ".console-entries, [class*='log-list'], [class*='console-body']"
    );
    containers.forEach(container => {
      const rows = Array.from(container.children);
      const seen = new Map();
      rows.forEach(row => {
        const key = row.textContent.replace(/\s+/g, " ").trim().slice(0, 120);
        if (!seen.has(key)) {
          seen.set(key, { node: row, count: 1 });
        } else {
          const rec = seen.get(key);
          rec.count++;
          row.remove();
          let badge = rec.node.querySelector(".dup-badge");
          if (!badge) {
            badge = document.createElement("span");
            badge.className = "dup-badge";
            rec.node.prepend(badge);
          }
          badge.textContent = "\xd7" + rec.count;
          badge.title = rec.count + " identical entries collapsed";
        }
      });
    });
  }

  // ── INIT ──────────────────────────────────────────────────────────────────
  function init() {
    applyMetricThresholds();
    dedupeConsole();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // MutationObserver for live updates
  const root = document.querySelector(".content, .panel, body");
  if (root) {
    const obs = new MutationObserver(() => {
      applyMetricThresholds();
      dedupeConsole();
    });
    obs.observe(root, { childList: true, subtree: true });
  }
})();

/* ============================================================
   JS FIXES v20c-patch3 — DOM-exact — 2026-05-28
   ============================================================ */
(function cicdUIFixesP3() {
  "use strict";

  // FIX 2 — #m-queue threshold color via data-level attribute
  function applyQueueLevel() {
    const el = document.getElementById("m-queue");
    if (!el) return;
    const n = parseInt(el.textContent.trim(), 10);
    if (isNaN(n)) return;
    el.setAttribute("data-level", n > 50 ? "high" : n > 20 ? "warn" : "ok");
  }

  // FIX 2b — Blocked PR scard-big pulse
  function applyBlockPulse() {
    // scard with label "Blocked PR/MR" → its .scard-big
    document.querySelectorAll(".scard").forEach(card => {
      const lbl = card.querySelector(".scard-lbl");
      if (!lbl || !/blocked/i.test(lbl.textContent)) return;
      const big = card.querySelector(".scard-big");
      if (!big) return;
      const n = parseInt(big.textContent.trim(), 10);
      big.classList.toggle("has-block", !isNaN(n) && n > 0);
    });
  }

  // FIX 5 — Chart: annotate lowest data point with red dot
  // Chart.js plugin — runs after chart renders
  function annotateChartLow() {
    const canvas = document.getElementById("gateChart");
    if (!canvas || !window.Chart) return;
    // Get chart instance (Chart.js 4.x)
    const chart = Chart.getChart(canvas);
    if (!chart) return;
    const data = chart.data.datasets[0].data; // pass rate series
    const minVal = Math.min(...data);
    const minIdx = data.indexOf(minVal);

    // Register a one-time afterDraw plugin
    const pluginId = "cicd-lowpoint";
    if (Chart.registry.plugins.get(pluginId)) return; // already added

    Chart.register({
      id: pluginId,
      afterDraw(ch) {
        if (ch.canvas.id !== "gateChart") return;
        const ds = ch.data.datasets[0];
        const meta = ch.getDatasetMeta(0);
        const pt = meta.data[minIdx];
        if (!pt) return;
        const ctx = ch.ctx;
        const {x, y} = pt.getProps(["x","y"], true);
        // Outer ring
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, 7, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(239,68,68,0.5)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        // Inner dot
        ctx.beginPath();
        ctx.arc(x, y, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = "#ef4444";
        ctx.fill();
        // Label
        ctx.font = "9px monospace";
        ctx.fillStyle = "#f87171";
        ctx.textAlign = "center";
        ctx.fillText("LOW " + minVal + "%", x, y - 12);
        ctx.restore();
      }
    });
    chart.update("none");
  }

  // ── INIT ──────────────────────────────────────────────────────────────────
  function init() {
    applyQueueLevel();
    applyBlockPulse();
    // Chart might not be ready yet — wait for it
    const ready = () => { annotateChartLow(); };
    if (document.readyState === "complete") ready();
    else window.addEventListener("load", ready);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // Live queue update tracking
  const queueEl = document.getElementById("m-queue");
  if (queueEl) {
    new MutationObserver(() => applyQueueLevel())
      .observe(queueEl, { childList: true, characterData: true, subtree: true });
  }
})();

/* UI FIXES v20c-patch5 — 2026-05-28
   ============================================================ */
(function cicdUIFixesP5() {
  "use strict";

  function applyQueueLevel() {
    var el = document.getElementById("m-queue");
    if (!el) return;
    var n = parseInt(el.textContent.trim(), 10);
    if (isNaN(n)) return;
    el.setAttribute("data-level", n > 50 ? "high" : n > 20 ? "warn" : "ok");
  }

  function applyBlockPulse() {
    document.querySelectorAll(".scard").forEach(function(card) {
      var lbl = card.querySelector(".scard-lbl");
      if (!lbl || !/blocked/i.test(lbl.textContent)) return;
      var big = card.querySelector(".scard-big");
      if (!big) return;
      var n = parseInt(big.textContent.trim(), 10);
      big.classList.toggle("has-block", !isNaN(n) && n > 0);
    });
  }

  function injectChartLabel() {
    var wrap = document.querySelector(".chart-wrap");
    if (!wrap || wrap.querySelector(".chart-yaxis-label")) return;
    var lbl = document.createElement("span");
    lbl.className = "chart-yaxis-label";
    lbl.textContent = "PASS %";
    wrap.appendChild(lbl);
  }

  function annotateChartLow() {
    if (!window.Chart) return;
    var canvas = document.getElementById("gateChart");
    if (!canvas) return;
    var chart = Chart.getChart(canvas);
    if (!chart) return;
    if (Chart.registry.plugins.get("cicd-low-v5")) return;
    var data = chart.data.datasets[0].data;
    var minVal = Math.min.apply(null, data);
    var minIdx = data.indexOf(minVal);
    Chart.register({
      id: "cicd-low-v5",
      afterDraw: function(ch) {
        if (ch.canvas.id !== "gateChart") return;
        var meta = ch.getDatasetMeta(0);
        var pt = meta.data[minIdx];
        if (!pt) return;
        var pos = pt.getProps(["x","y"], true);
        var ctx = ch.ctx;
        ctx.save();
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 6, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(239,68,68,0.6)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = "#ef4444";
        ctx.fill();
        ctx.font = "bold 9px monospace";
        ctx.fillStyle = "#f87171";
        ctx.textAlign = "center";
        ctx.fillText("LOW " + minVal + "%", pos.x, pos.y - 11);
        ctx.restore();
      }
    });
    chart.update("none");
  }

  function init() {
    applyQueueLevel();
    applyBlockPulse();
    injectChartLabel();
    if (document.readyState === "complete") {
      annotateChartLow();
    } else {
      window.addEventListener("load", annotateChartLow);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  var qEl = document.getElementById("m-queue");
  if (qEl) {
    new MutationObserver(applyQueueLevel)
      .observe(qEl, { childList: true, characterData: true, subtree: true });
  }
})();


/* UI-FIXES-V20C-START */
(function cicdUIFixesP6() {
  "use strict";

  function applyQueueLevel() {
    var el = document.getElementById("m-queue");
    if (!el) return;
    var n = parseInt(el.textContent.trim(), 10);
    if (isNaN(n)) return;
    el.setAttribute("data-level", n > 50 ? "high" : n > 20 ? "warn" : "ok");
  }

  function applyBlockPulse() {
    document.querySelectorAll(".scard").forEach(function(card) {
      var lbl = card.querySelector(".scard-lbl");
      if (!lbl || !/blocked/i.test(lbl.textContent)) return;
      var big = card.querySelector(".scard-big");
      if (!big) return;
      var n = parseInt(big.textContent.trim(), 10);
      big.classList.toggle("has-block", !isNaN(n) && n > 0);
    });
  }

  function injectChartLabel() {
    var wrap = document.querySelector(".chart-wrap");
    if (!wrap || wrap.querySelector(".chart-yaxis-label")) return;
    var lbl = document.createElement("span");
    lbl.className = "chart-yaxis-label";
    lbl.textContent = "PASS %";
    wrap.appendChild(lbl);
  }

  function annotateChartLow() {
    if (!window.Chart) return;
    var canvas = document.getElementById("gateChart");
    if (!canvas) return;
    var chart = Chart.getChart(canvas);
    if (!chart) return;
    if (Chart.registry.plugins.get("cicd-low-v6")) return;
    var data = chart.data.datasets[0].data;
    var minVal = Math.min.apply(null, data);
    var minIdx = data.indexOf(minVal);
    Chart.register({
      id: "cicd-low-v6",
      afterDraw: function(ch) {
        if (ch.canvas.id !== "gateChart") return;
        var meta = ch.getDatasetMeta(0);
        var pt = meta.data[minIdx];
        if (!pt) return;
        var pos = pt.getProps(["x","y"], true);
        var ctx = ch.ctx;
        ctx.save();
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 6, 0, Math.PI*2);
        ctx.strokeStyle = "rgba(239,68,68,0.6)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 3, 0, Math.PI*2);
        ctx.fillStyle = "#ef4444";
        ctx.fill();
        ctx.font = "bold 9px monospace";
        ctx.fillStyle = "#f87171";
        ctx.textAlign = "center";
        ctx.fillText("LOW " + minVal + "%", pos.x, pos.y - 11);
        ctx.restore();
      }
    });
    chart.update("none");
  }

  function init() {
    applyQueueLevel();
    applyBlockPulse();
    injectChartLabel();
    if (document.readyState === "complete") {
      annotateChartLow();
    } else {
      window.addEventListener("load", annotateChartLow);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  var qEl = document.getElementById("m-queue");
  if (qEl) {
    new MutationObserver(applyQueueLevel)
      .observe(qEl, {childList:true, characterData:true, subtree:true});
  }
})();
/* UI-FIXES-V20C-END */
// CICD_DETAIL_CONFIG_TOOLS_V22
(function(){
  "use strict";

  if (window.__CICD_DETAIL_CONFIG_TOOLS_V22__) return;
  window.__CICD_DETAIL_CONFIG_TOOLS_V22__ = true;

  const TOOLS_26 = [
    ["bandit", "Python SAST"],
    ["semgrep", "Multi-language SAST"],
    ["gitleaks", "Secret detection"],
    ["trufflehog", "Secret detection"],
    ["detect-secrets", "Secret baseline"],
    ["checkov", "IaC / cloud config"],
    ["kics", "IaC security"],
    ["hadolint", "Dockerfile lint"],
    ["trivy", "Vuln / image scan"],
    ["grype", "Vulnerability scan"],
    ["syft", "SBOM generation"],
    ["osv-scanner", "Open source vuln"],
    ["npm-audit", "Node dependency audit"],
    ["pip-audit", "Python dependency audit"],
    ["govulncheck", "Go vulnerability scan"],
    ["gosec", "Go SAST"],
    ["staticcheck", "Go static analysis"],
    ["golangci-lint", "Go lint suite"],
    ["shellcheck", "Shell script lint"],
    ["shfmt", "Shell formatting"],
    ["eslint", "JavaScript lint"],
    ["retire-js", "JS dependency risk"],
    ["nikto", "Web server checks"],
    ["nuclei", "Template-based scan"],
    ["sslscan", "TLS/SSL scan"],
    ["nmap", "Network discovery"]
  ];

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

  function getVisibleRows() {
    const selector = [
      "#tab-autofix.active .cicd-v20-row",
      "#tab-evidence.active .cicd-v19-row",
      "#tab-history.active .cicd-v19-row",
      "#tab-prgate.active .cicd-v18-row",
      "#tab-scheduler.active .cicd-v18-row",
      "#tab-pipeline.active .cicd-p17-row",
      "#tab-overview.active .cicd-v15-row"
    ].join(",");

    return Array.from(document.querySelectorAll(selector)).filter(isVisible);
  }

  function isVisible(el) {
    if (!el) return false;
    const st = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return st.display !== "none" && st.visibility !== "hidden" && r.width > 0 && r.height > 0;
  }

  function showToast(title, sub) {
    let toast = document.querySelector(".cicd-v22-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.className = "cicd-v22-toast";
      document.body.appendChild(toast);
    }

    toast.innerHTML = '<div class="cicd-v22-toast-title">' + esc(title) + '</div><div class="cicd-v22-toast-sub">' + esc(sub) + '</div>';
    toast.classList.add("open");
    clearTimeout(window.__cicdV22ToastTimer);
    window.__cicdV22ToastTimer = setTimeout(() => toast.classList.remove("open"), 2600);
  }

  function currentDetailPayload() {
    const drawer = document.querySelector(".cicd-detail-drawer-v21");
    if (!drawer) return "";

    const fields = Array.from(drawer.querySelectorAll(".cicd-detail-field-v21")).map(f => {
      const k = f.querySelector(".cicd-detail-key-v21")?.innerText || "";
      const v = f.querySelector(".cicd-detail-val-v21")?.innerText || "";
      return k + ": " + v;
    });

    return fields.join("\n");
  }

  async function copyEvidence() {
    const payload = currentDetailPayload();

    if (!payload.trim()) {
      showToast("Nothing to copy", "Open a detail record first.");
      return;
    }

    try {
      await navigator.clipboard.writeText(payload);
      showToast("Copied evidence", "Record detail copied to clipboard.");
    } catch (e) {
      const drawer = document.querySelector(".cicd-detail-drawer-v21");
      let box = drawer.querySelector(".cicd-v22-copybox");
      if (!box) {
        box = document.createElement("textarea");
        box.className = "cicd-v22-copybox";
        drawer.appendChild(box);
      }
      box.value = payload;
      box.focus();
      box.select();
      showToast("Clipboard fallback", "Copy manually from the text box in the drawer.");
    }
  }

  function createTask() {
    const payload = currentDetailPayload();

    if (!payload.trim()) {
      showToast("No record selected", "Open a detail record first.");
      return;
    }

    const idMatch = payload.match(/Record ID:\s*(.+)/i);
    const statusMatch = payload.match(/Status \/ Labels:\s*(.+)/i);
    const ownerMatch = payload.match(/Suggested owner:\s*(.+)/i);
    const actionMatch = payload.match(/Suggested action:\s*(.+)/i);

    const task = {
      id: "TASK-CICD-" + new Date().toISOString().replace(/[-:.TZ]/g,"").slice(0,14),
      record_id: idMatch ? idMatch[1].trim() : "unknown",
      status_labels: statusMatch ? statusMatch[1].trim() : "unknown",
      owner: ownerMatch ? ownerMatch[1].trim() : "Security",
      action: actionMatch ? actionMatch[1].trim() : "Review and remediate.",
      created_at: new Date().toISOString(),
      state: "OPEN"
    };

    const key = "cicd_v22_local_tasks";
    const tasks = JSON.parse(localStorage.getItem(key) || "[]");
    tasks.unshift(task);
    localStorage.setItem(key, JSON.stringify(tasks.slice(0,50)));

    renderTasksInDrawer();
    showToast("Task created", task.id + " assigned to " + task.owner);
  }

  function renderTasksInDrawer() {
    const drawer = document.querySelector(".cicd-detail-drawer-v21");
    if (!drawer) return;

    const key = "cicd_v22_local_tasks";
    const tasks = JSON.parse(localStorage.getItem(key) || "[]").slice(0,5);

    let holder = drawer.querySelector("#cicdV22TaskList");
    if (!holder) {
      holder = document.createElement("div");
      holder.id = "cicdV22TaskList";
      holder.className = "cicd-v22-task-list";
      drawer.appendChild(holder);
    }

    if (!tasks.length) {
      holder.innerHTML = "";
      return;
    }

    holder.innerHTML = [
      '<div class="cicd-detail-key-v21">Local remediation tasks</div>',
      tasks.map(t => [
        '<div class="cicd-v22-task">',
          '<div class="cicd-v22-task-title">' + esc(t.id) + ' ' + badge(t.state) + '</div>',
          '<div class="cicd-v22-task-sub">Record: ' + esc(t.record_id) + '</div>',
          '<div class="cicd-v22-task-sub">Owner: ' + esc(t.owner) + '</div>',
          '<div class="cicd-v22-task-sub">' + esc(t.action) + '</div>',
        '</div>'
      ].join("")).join("")
    ].join("");
  }

  function patchDrawerButtons() {
    const drawer = document.querySelector(".cicd-detail-drawer-v21");
    if (!drawer || drawer.dataset.v22Patched === "1") return;

    drawer.dataset.v22Patched = "1";

    Array.from(drawer.querySelectorAll("button")).forEach(btn => {
      const txt = (btn.textContent || "").trim().toLowerCase();

      if (txt.includes("copy evidence")) {
        btn.addEventListener("click", function(e){
          e.preventDefault();
          e.stopPropagation();
          copyEvidence();
        });
      }

      if (txt.includes("create task")) {
        btn.addEventListener("click", function(e){
          e.preventDefault();
          e.stopPropagation();
          createTask();
        });
      }
    });
  }

  function patchDetailOpen() {
    document.querySelectorAll(".cicd-clickable-detail-v21").forEach(row => {
      if (row.dataset.v22VisibleOnly === "1") return;
      row.dataset.v22VisibleOnly = "1";

      row.addEventListener("click", function(){
        setTimeout(function(){
          patchDrawerButtons();
          renderTasksInDrawer();
        }, 80);
      }, true);
    });
  }

  function addToolRegistry() {
    const config = document.querySelector("#tab-config");
    if (!config || config.querySelector("#cicdToolRegistryV22")) return;

    const panel = document.createElement("div");
    panel.className = "cicd-v21-panel";
    panel.id = "cicdToolRegistryV22";

    panel.innerHTML = [
      '<div class="cicd-v21-head">',
        '<div><div class="cicd-v21-title">Tool registry — 26 tools</div><div class="cicd-v21-sub">Full tool coverage for CI/CD, SAST, SCA, Secrets, IaC, SBOM, container and network checks.</div></div>',
        '<span class="badge pass">26 ENABLED</span>',
      '</div>',
      '<div class="cicd-v22-tool-registry">',
        TOOLS_26.map((t, i) => [
          '<div class="cicd-v22-tool-card">',
            '<div class="cicd-v22-tool-icon">' + esc(String(i+1).padStart(2,"0")) + '</div>',
            '<div>',
              '<div class="cicd-v22-tool-name">' + esc(t[0]) + '</div>',
              '<div class="cicd-v22-tool-sub">' + esc(t[1]) + '</div>',
            '</div>',
            badge("ENABLED"),
          '</div>'
        ].join("")).join(""),
      '</div>'
    ].join("");

    const firstStack = config.querySelector(".cicd-v21-stack");
    if (firstStack) firstStack.appendChild(panel);
    else config.appendChild(panel);
  }

  function makeVisibleRowsClickableSafe() {
    const rows = getVisibleRows();

    rows.forEach(row => {
      row.classList.add("cicd-clickable-detail-v21");
      row.dataset.v22ClickableVisible = "1";
    });

    patchDetailOpen();
  }

  function init() {
    patchDrawerButtons();
    addToolRegistry();
    makeVisibleRowsClickableSafe();
    renderTasksInDrawer();
  }

  document.addEventListener("DOMContentLoaded", init);
  window.addEventListener("load", init);
  setTimeout(init, 800);
  setTimeout(init, 1800);
  setTimeout(init, 3200);

  const obs = new MutationObserver(() => {
    clearTimeout(window.__cicdV22Timer);
    window.__cicdV22Timer = setTimeout(init, 150);
  });

  if (document.documentElement) {
    obs.observe(document.documentElement, { childList: true, subtree: true });
  }
})();

/* =============================================================================
 * vsp_sbom_unified.js
 *   Gộp panel SBOM + SBOM Diff thành MỘT panel duy nhất với 3 view-mode:
 *     1. Inventory  — list SBOM của từng run (tương đương panel SBOM cũ)
 *     2. Diff       — so sánh 2 run (tương đương /panels/sbom_diff.html)
 *     3. Trend      — sparkline NEW/FIXED/PERSIST qua N runs gần nhất
 *
 *   Drop-in: chỉ cần thêm 1 dòng <script> vào index.html, sau các vsp_*_patch.
 *   Không cần sửa HTML. Patch tự:
 *     - Inject UI mới vào #panel-sbom (giữ nguyên element cũ ẩn đi để fallback)
 *     - Ẩn nav "SBOM Diff" cũ (do VSP-G2 inject) nếu có
 *     - Wire vào loadSBOM() hiện tại để compatibility
 *
 *   Backend cần có (đã có sẵn):
 *     GET /api/v1/vsp/runs/index?limit=N
 *     GET /api/v1/vsp/findings?run_id=<UUID>&limit=N    (sau patch findings.go)
 *     GET /api/v1/sbom/<rid>
 * ============================================================================= */
(function () {
  'use strict';
  if (window.__VSP_SBOM_UNIFIED__) return;
  window.__VSP_SBOM_UNIFIED__ = true;

  // ---- State ----------------------------------------------------------------
  var S = window._sbomUnified = {
    view: 'inventory',          // 'inventory' | 'diff' | 'trend'
    runs: [],                   // tất cả runs DONE (giảm dần theo created_at)
    newRunUUID: '',             // diff: target run uuid
    baseRunUUID: '',            // diff: baseline run uuid
    newFindings: [],
    baseFindings: [],
    diffCache: null,            // {newOnly, fixed, persisted}
    filters: { sev: '', tool: '', q: '', gate: '', mode: '' },
    pagination: { inv: 0, diff: 0 },
    pageSize: 15,
    trendDays: 30
  };

  function $(id) { return document.getElementById(id); }
  function token() { return window.TOKEN || (typeof localStorage !== 'undefined' && localStorage.getItem('vsp_token')) || ''; }
  function authH() { return { 'Authorization': 'Bearer ' + token() }; }
  function fmtDate(s) { try { return s ? new Date(s).toLocaleString('vi-VN', { dateStyle:'short', timeStyle:'short' }) : '—'; } catch(e){ return '—'; } }
  function esc(s) { return String(s==null?'':s).replace(/[&<>"']/g, function(c){ return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]); }); }
  function toast(msg, type) { try { (window.showToast||function(){})(msg, type||'info'); } catch(e){} }

  // ---- HTML Skeleton --------------------------------------------------------
  // Render 1 khối duy nhất: tab switcher + filter bar + KPI + main content.
  function renderSkeleton() {
    var panel = $('panel-sbom');
    if (!panel) return false;
    if ($('sbom-u-root')) return true;

    // Ẩn cả block cũ (giữ trong DOM cho fallback) — toàn bộ content cũ wrap lại
    Array.prototype.forEach.call(panel.children, function(c){ c.style.display = 'none'; });

    var root = document.createElement('div');
    root.id = 'sbom-u-root';
    root.innerHTML = ''
      // ---- View switcher + run selectors ----
      + '<div class="card mb14" style="padding:0;overflow:hidden">'
      +   '<div style="display:flex;align-items:center;gap:8px;padding:10px 14px;border-bottom:1px solid var(--border);flex-wrap:wrap">'
      +     '<div style="display:flex;gap:4px;background:var(--surface2);padding:3px;border-radius:6px">'
      +       '<button id="sbom-u-tab-inventory" class="sbom-u-tab sbom-u-tab-active" onclick="window._sbomUnified.setView(\'inventory\')">📦 Inventory</button>'
      +       '<button id="sbom-u-tab-diff"      class="sbom-u-tab"                 onclick="window._sbomUnified.setView(\'diff\')">🔄 Diff</button>'
      +       '<button id="sbom-u-tab-trend"     class="sbom-u-tab"                 onclick="window._sbomUnified.setView(\'trend\')">📊 Trend</button>'
      +     '</div>'
      +     '<div id="sbom-u-runsel" style="display:flex;gap:6px;align-items:center;flex:1;flex-wrap:wrap;min-width:0"></div>'
      +     '<button class="btn btn-ghost" style="font-size:10px" onclick="window._sbomUnified.refresh()">↻ Refresh</button>'
      +   '</div>'
      // ---- Filter bar (chung cho mọi view) ----
      +   '<div style="display:flex;gap:6px;padding:8px 14px;border-bottom:1px solid var(--border);align-items:center;flex-wrap:wrap;background:var(--surface)">'
      +     '<select aria-label="Sbom U Fsev" id="sbom-u-fsev"  class="filter-select" style="font-size:10px;padding:3px 8px" onchange="window._sbomUnified.applyFilters()">'
      +       '<option value="">All severity</option><option>CRITICAL</option><option>HIGH</option><option>MEDIUM</option><option>LOW</option>'
      +     '</select>'
      +     '<select aria-label="Sbom U Ftool" id="sbom-u-ftool" class="filter-select" style="font-size:10px;padding:3px 8px" onchange="window._sbomUnified.applyFilters()"><option value="">All tools</option></select>'
      +     '<input aria-label="Component / CVE / path / message…"  id="sbom-u-fq"    class="filter-select" style="font-size:10px;padding:3px 8px;min-width:200px;flex:1" placeholder="Component / CVE / path / message…" oninput="window._sbomUnified.debouncedFilter()">'
      +     '<select aria-label="Sbom U Fgate" id="sbom-u-fgate" class="filter-select" style="font-size:10px;padding:3px 8px" onchange="window._sbomUnified.applyFilters()" data-only="inventory"><option value="">All gates</option><option>PASS</option><option>FAIL</option><option>WARN</option></select>'
      +     '<span id="sbom-u-meta" class="mono-sm c-t3" style="margin-left:auto;font-size:10px"></span>'
      +   '</div>'
      // ---- KPI row ----
      +   '<div id="sbom-u-kpis" class="g4" style="padding:14px;gap:8px"></div>'
      // ---- Main content ----
      +   '<div id="sbom-u-main" style="padding:0 14px 14px"></div>'
      // ---- Action toolbar ----
      +   '<div style="display:flex;gap:6px;padding:10px 14px;border-top:1px solid var(--border);align-items:center;flex-wrap:wrap;background:var(--surface)">'
      +     '<span class="mono-sm c-t3" style="font-size:10px;letter-spacing:.05em">EXPORT:</span>'
      +     '<button class="btn btn-ghost" style="font-size:10px" onclick="window._sbomUnified.exportData(\'csv\')">CSV</button>'
      +     '<button class="btn btn-ghost" style="font-size:10px" onclick="window._sbomUnified.exportData(\'json\')">JSON</button>'
      +     '<button class="btn btn-ghost" style="font-size:10px" onclick="window._sbomUnified.exportData(\'cdx\')">CycloneDX</button>'
      +     '<button class="btn btn-ghost" style="font-size:10px" onclick="window._sbomUnified.exportData(\'vex\')">VEX</button>'
      +     '<button class="btn btn-ghost" style="font-size:10px" onclick="window._sbomUnified.exportData(\'sarif\')">SARIF</button>'
      +     '<span style="margin-left:auto;display:flex;gap:6px">'
      +       '<button class="btn btn-ghost" style="font-size:10px" onclick="window._sbomUnified.savedViews()">⭐ Saved views</button>'
      +       '<button class="btn btn-ghost" style="font-size:10px" onclick="window._sbomUnified.openSettings()">⚙ Config</button>'
      +     '</span>'
      +   '</div>'
      + '</div>';
    panel.appendChild(root);

    // CSS riêng (inline 1 lần)
    if (!document.getElementById('sbom-u-css')) {
      var style = document.createElement('style');
      style.id = 'sbom-u-css';
      style.textContent =
        '.sbom-u-tab{background:transparent;border:0;color:var(--text-2);padding:6px 12px;font-size:11px;font-weight:500;border-radius:4px;cursor:pointer;transition:all .15s}'
       +'.sbom-u-tab:hover{color:var(--text-1)}'
       +'.sbom-u-tab-active{background:var(--cyan2);color:var(--cyan)}'
       +'.sbom-u-row{display:grid;grid-template-columns:80px 60px 70px 1.4fr 1fr 90px 130px;gap:0;padding:8px 10px;font-size:11px;align-items:center;border-bottom:1px solid var(--border);transition:background .12s}'
       +'.sbom-u-row:hover{background:var(--surface2)}'
       +'.sbom-u-row-head{background:var(--surface);font-size:10px;color:var(--text-3);letter-spacing:.05em;font-weight:500;border-bottom:1px solid var(--border)}'
       +'.sbom-u-status-new{color:var(--red)}'
       +'.sbom-u-status-fix{color:var(--green)}'
       +'.sbom-u-status-pst{color:var(--amber)}'
       +'.sbom-u-kpi{background:var(--surface);border-left:3px solid var(--border);padding:10px 14px;border-radius:4px}'
       +'.sbom-u-kpi-label{font-size:10px;color:var(--text-2);letter-spacing:.05em}'
       +'.sbom-u-kpi-value{font-size:22px;font-weight:600;font-family:var(--font-display);margin-top:2px}'
       +'.sbom-u-kpi-sub{font-size:10px;color:var(--text-3);margin-top:2px}'
       +'.sbom-u-mini-btn{background:transparent;border:1px solid var(--border);color:var(--text-2);padding:2px 6px;font-size:9px;border-radius:3px;cursor:pointer}'
       +'.sbom-u-mini-btn:hover{border-color:var(--cyan);color:var(--cyan)}';
      document.head.appendChild(style);
    }
    return true;
  }

  // ---- Run selectors --------------------------------------------------------
  function renderRunSelectors() {
    var sel = $('sbom-u-runsel');
    if (!sel) return;
    var opts = function(selUUID){
      return S.runs.map(function(r){
        var lab = (r.rid||r.id) + ' · ' + (r.mode||'?') + ' · ' + (r.gate||'?') + ' · ' + (r.total_findings||r.total||0);
        return '<option value="'+esc(r.id)+'"'+(r.id===selUUID?' selected':'')+'>'+esc(lab)+'</option>';
      }).join('');
    };
    if (S.view === 'inventory') {
      sel.innerHTML = '<span class="mono-sm c-t3" style="font-size:10px;letter-spacing:.05em">RUNS:</span>'
        + '<span class="mono-sm" style="font-size:10px">'+S.runs.length+' available</span>';
    } else if (S.view === 'diff') {
      sel.innerHTML =
          '<span class="mono-sm c-t3" style="font-size:10px;letter-spacing:.05em">NEW:</span>'
        + '<select aria-label="Sbom U Newsel" id="sbom-u-newsel" class="filter-select" style="font-size:10px;padding:3px 8px;min-width:240px;flex:1" onchange="window._sbomUnified.onSelChange(\'new\')">'+opts(S.newRunUUID)+'</select>'
        + '<span class="mono-sm c-t3" style="font-size:10px">vs</span>'
        + '<span class="mono-sm c-t3" style="font-size:10px;letter-spacing:.05em">BASELINE:</span>'
        + '<select aria-label="Sbom U Basesel" id="sbom-u-basesel" class="filter-select" style="font-size:10px;padding:3px 8px;min-width:240px;flex:1" onchange="window._sbomUnified.onSelChange(\'base\')">'+opts(S.baseRunUUID)+'</select>'
        + '<button class="btn btn-ghost" style="font-size:10px" onclick="window._sbomUnified.swap()" title="Swap NEW & BASELINE">⇄</button>';
    } else {
      sel.innerHTML =
          '<span class="mono-sm c-t3" style="font-size:10px;letter-spacing:.05em">RANGE:</span>'
        + '<select name="filter" aria-label="Filter" class="filter-select" style="font-size:10px;padding:3px 8px" onchange="window._sbomUnified.setTrendRange(this.value)">'
        + '<option value="7">Last 7 runs</option><option value="30" selected>Last 30 runs</option><option value="60">Last 60 runs</option>'
        + '</select>';
    }
    // Toggle filter visibility theo view
    Array.prototype.forEach.call(document.querySelectorAll('[data-only]'), function(el){
      el.style.display = (el.getAttribute('data-only') === S.view) ? '' : 'none';
    });
  }

  // ---- Toolset (cho filter dropdown) ----------------------------------------
  function buildToolDropdown(findings) {
    var sel = $('sbom-u-ftool'); if (!sel) return;
    var tools = {};
    findings.forEach(function(f){ if (f.tool) tools[f.tool] = (tools[f.tool]||0)+1; });
    var keys = Object.keys(tools).sort();
    var cur = sel.value;
    sel.innerHTML = '<option value="">All tools</option>' + keys.map(function(t){
      return '<option value="'+esc(t)+'"'+(t===cur?' selected':'')+'>'+esc(t)+' ('+tools[t]+')</option>';
    }).join('');
  }

  // ---- Data fetching --------------------------------------------------------
  async function fetchRuns() {
    var d = await fetch('/api/v1/vsp/runs/index?limit=200', {headers: authH()}).then(function(r){return r.json();});
    S.runs = (d.runs||[]).filter(function(r){ return r.status==='DONE'||r.status==='PASS'||r.status==='COMPLETED'; });
    if (!S.newRunUUID && S.runs[0])  S.newRunUUID  = S.runs[0].id;
    if (!S.baseRunUUID && S.runs[1]) S.baseRunUUID = S.runs[1].id;
  }

  async function fetchFindings(uuid) {
    if (!uuid) return [];
    var d = await fetch('/api/v1/vsp/findings?run_id='+encodeURIComponent(uuid)+'&limit=2000', {headers: authH()}).then(function(r){return r.json();});
    return d.findings || [];
  }

  // ---- Diff core ------------------------------------------------------------
  // Key dùng để xác định "cùng 1 finding": tool + rule + path + (line nếu có)
  // Tuned cho data thực: rule UUID-like nên path + rule là đủ ổn.
  function fingerprint(f) {
    return [f.tool||'', f.rule||f.rule_id||'', f.path||f.file||'', f.line||0].join('|');
  }
  function computeDiff(newF, baseF) {
    var newMap = {}, baseMap = {};
    newF.forEach(function(f){ newMap[fingerprint(f)] = f; });
    baseF.forEach(function(f){ baseMap[fingerprint(f)] = f; });
    var newOnly = [], fixed = [], persisted = [];
    Object.keys(newMap).forEach(function(k){
      if (baseMap[k]) persisted.push(Object.assign({_status:'PERSISTED'}, newMap[k]));
      else            newOnly.push(Object.assign({_status:'NEW'},        newMap[k]));
    });
    Object.keys(baseMap).forEach(function(k){
      if (!newMap[k]) fixed.push(Object.assign({_status:'FIXED'}, baseMap[k]));
    });
    return { newOnly: newOnly, fixed: fixed, persisted: persisted };
  }

  // ---- Filtering ------------------------------------------------------------
  function applyFiltersToList(list) {
    var f = S.filters;
    var q = (f.q||'').toLowerCase();
    return list.filter(function(x){
      if (f.sev  && (x.severity||'').toUpperCase() !== f.sev) return false;
      if (f.tool && x.tool !== f.tool) return false;
      if (q) {
        var hay = ((x.path||'') + ' ' + (x.message||'') + ' ' + (x.rule||'') + ' ' + (x.cve||'') + ' ' + (x.component||'')).toLowerCase();
        if (hay.indexOf(q) < 0) return false;
      }
      return true;
    });
  }

  // ---- KPI rendering --------------------------------------------------------
  function renderKPIs() {
    var box = $('sbom-u-kpis'); if (!box) return;
    if (S.view === 'inventory') {
      var rs = S.runs.filter(function(r){ return !S.filters.gate || r.gate===S.filters.gate; });
      var total = rs.length;
      var fail  = rs.filter(function(r){ return r.gate==='FAIL'; }).length;
      var pass  = rs.filter(function(r){ return r.gate==='PASS'; }).length;
      var latest = rs[0] ? (rs[0].total_findings||rs[0].total||0) : 0;
      box.innerHTML = ''
        + kpi('TOTAL SBOMs',  total,  'var(--cyan)')
        + kpi('WITH FINDINGS',fail,   'var(--red)')
        + kpi('CLEAN RUNS',   pass,   'var(--green)')
        + kpi('LATEST FINDS', latest, 'var(--amber)');
    } else if (S.view === 'diff') {
      var d = S.diffCache || {newOnly:[],fixed:[],persisted:[]};
      var n  = applyFiltersToList(d.newOnly).length;
      var fx = applyFiltersToList(d.fixed).length;
      var p  = applyFiltersToList(d.persisted).length;
      box.innerHTML = ''
        + kpi('NEW',       n,  'var(--red)',   sevBreakdown(d.newOnly))
        + kpi('FIXED',     fx, 'var(--green)', fx===0?'No regressions resolved':sevBreakdown(d.fixed))
        + kpi('PERSISTED', p,  'var(--amber)', sevBreakdown(d.persisted))
        + kpiTrend();
    } else {
      box.innerHTML = ''
        + kpi('RUNS IN RANGE', Math.min(S.trendDays, S.runs.length), 'var(--cyan)')
        + kpi('AVG NEW/run',   '—', 'var(--red)')
        + kpi('AVG FIXED/run', '—', 'var(--green)')
        + kpi('TRAJECTORY',    '—', 'var(--amber)');
    }
  }
  function kpi(label, value, color, sub) {
    return '<div class="sbom-u-kpi" style="border-left-color:'+color+'">'
      + '<div class="sbom-u-kpi-label">'+esc(label)+'</div>'
      + '<div class="sbom-u-kpi-value" style="color:'+color+'">'+esc(String(value))+'</div>'
      + (sub ? '<div class="sbom-u-kpi-sub">'+esc(sub)+'</div>' : '')
      + '</div>';
  }
  function sevBreakdown(list) {
    var c={CRITICAL:0,HIGH:0,MEDIUM:0,LOW:0};
    list.forEach(function(f){ var s=(f.severity||'').toUpperCase(); if(c[s]!=null) c[s]++; });
    var parts = [];
    if (c.CRITICAL) parts.push(c.CRITICAL+' crit');
    if (c.HIGH)     parts.push(c.HIGH+' high');
    if (c.MEDIUM)   parts.push(c.MEDIUM+' med');
    if (c.LOW)      parts.push(c.LOW+' low');
    return parts.join(' · ') || '—';
  }
  function kpiTrend() {
    // Sparkline: số findings của N runs gần nhất
    var pts = S.runs.slice(0, Math.min(8, S.runs.length)).reverse().map(function(r){ return r.total_findings||r.total||0; });
    if (pts.length < 2) return kpi('TREND', 'n/a', 'var(--text-3)');
    var max = Math.max.apply(null, pts), min = Math.min.apply(null, pts);
    var w = 80, h = 28, dx = pts.length>1 ? w/(pts.length-1) : 0;
    var poly = pts.map(function(v,i){
      var y = max===min ? h/2 : h - ((v-min)/(max-min))*h;
      return (i*dx).toFixed(1)+','+y.toFixed(1);
    }).join(' ');
    var first = pts[0], last = pts[pts.length-1];
    var dir = last>first ? '↑ Worse' : last<first ? '↓ Better' : '→ Stable';
    var color = last>first ? 'var(--red)' : last<first ? 'var(--green)' : 'var(--text-2)';
    return '<div class="sbom-u-kpi" style="border-left-color:'+color+'">'
      + '<div class="sbom-u-kpi-label">TREND ('+pts.length+' runs)</div>'
      + '<svg viewBox="0 0 '+w+' '+h+'" style="width:100%;height:24px;margin-top:2px" preserveAspectRatio="none">'
      +   '<polyline fill="none" stroke="'+color+'" stroke-width="1.5" points="'+poly+'"/>'
      + '</svg>'
      + '<div class="sbom-u-kpi-sub" style="color:'+color+'">'+dir+'</div>'
      + '</div>';
  }

  // ---- Main rendering -------------------------------------------------------
  function renderMain() {
    var main = $('sbom-u-main'); if (!main) return;
    if (S.view === 'inventory') return renderInventory(main);
    if (S.view === 'diff')      return renderDiff(main);
    if (S.view === 'trend')     return renderTrend(main);
  }

  function renderInventory(main) {
    var rs = S.runs.filter(function(r){ return !S.filters.gate || r.gate===S.filters.gate; });
    var start = S.pagination.inv * S.pageSize;
    var end = Math.min(start + S.pageSize, rs.length);
    var page = rs.slice(start, end);
    var rows = page.map(function(r){
      var dt = fmtDate(r.created_at);
      var find = r.total_findings || r.total || 0;
      var fc = find>=10?'c-red':find>=1?'c-orange':'c-green';
      return '<tr style="cursor:pointer" onclick="window._sbomUnified.openDetail(\''+esc(r.rid)+'\')">'
        + '<td class="mono" style="font-size:10px">'+esc(r.rid||r.id)+'</td>'
        + '<td><span class="pill pill-run">'+esc(r.mode||'?')+'</span></td>'
        + '<td><span class="pill pill-'+(r.gate||'').toLowerCase()+'">'+esc(r.gate||'?')+'</span></td>'
        + '<td class="fw7 '+fc+'">'+find+'</td>'
        + '<td class="mono-sm c-t3" style="font-size:9px">'+esc((r.tools_used||[]).join(', ')||'—')+'</td>'
        + '<td class="mono-sm">'+dt+'</td>'
        + '<td><button class="sbom-u-mini-btn" onclick="event.stopPropagation();window._sbomUnified.download(\''+esc(r.rid)+'\')">↓ CDX</button></td>'
        + '</tr>';
    }).join('');
    main.innerHTML =
      '<div class="tbl-wrap" style="margin-top:10px"><table>'
      + '<thead><tr><th>Run ID</th><th>Mode</th><th>Gate</th><th>Findings</th><th>Tools</th><th>Date</th><th></th></tr></thead>'
      + '<tbody>'+(rows||'<tr><td colspan="7" class="c-t3" style="text-align:center;padding:20px">No runs match filter</td></tr>')+'</tbody>'
      +'</table></div>'
      + paginationBar('inv', rs.length, start, end);
    $('sbom-u-meta').textContent = rs.length+' SBOMs'+(S.filters.gate?' · '+S.filters.gate:'');
  }

  function renderDiff(main) {
    var d = S.diffCache;
    if (!d) { main.innerHTML = '<div style="padding:30px;text-align:center;color:var(--text-3)">Loading diff…</div>'; return; }
    // Gộp tất cả: NEW + PERSIST + FIXED, áp filter chung
    var all = [].concat(d.newOnly, d.persisted, d.fixed);
    var filtered = applyFiltersToList(all);
    var start = S.pagination.diff * S.pageSize;
    var end = Math.min(start + S.pageSize, filtered.length);
    var page = filtered.slice(start, end);

    var head =
      '<div class="sbom-u-row sbom-u-row-head">'
      + '<span>STATUS</span><span>SEV</span><span>TOOL</span><span>COMPONENT / RULE</span><span>PATH</span><span>SLA</span><span>ACTIONS</span>'
      + '</div>';
    var body = page.map(function(f){
      var st = f._status, stClass = st==='NEW'?'sbom-u-status-new':st==='FIXED'?'sbom-u-status-fix':'sbom-u-status-pst';
      var sevPill = sevBadge(f.severity);
      var comp = f.component || f.cve || f.rule || f.rule_id || '—';
      var pathClass = st==='FIXED' ? 'mono-sm c-t3" style="font-size:10px;text-decoration:line-through;opacity:.6' : 'mono-sm c-t3" style="font-size:10px';
      var sla = slaBadge(f);
      return '<div class="sbom-u-row">'
        + '<span class="'+stClass+'" style="font-weight:600">'+statusIcon(st)+' '+st+'</span>'
        + sevPill
        + '<span class="mono-sm c-t3">'+esc(f.tool||'—')+'</span>'
        + '<span class="mono-sm" title="'+esc(f.message||'')+'" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(comp)+'</span>'
        + '<span class="'+pathClass+'" title="'+esc(f.path||'')+'">'+esc(f.path||'—')+'</span>'
        + sla
        + actionButtons(f)
        + '</div>';
    }).join('');
    main.innerHTML =
        '<div style="margin-top:10px;border:1px solid var(--border);border-radius:6px;overflow:hidden">'
      +   head + (body || '<div style="padding:20px;text-align:center;color:var(--text-3);font-size:11px">No findings match filter</div>')
      + '</div>'
      + paginationBar('diff', filtered.length, start, end);
    $('sbom-u-meta').textContent = filtered.length+' findings (filtered from '+all.length+')';
  }

  function renderTrend(main) {
    var arr = S.runs.slice(0, S.trendDays).reverse();
    if (arr.length < 2) { main.innerHTML = '<div style="padding:30px;text-align:center;color:var(--text-3)">Need ≥ 2 runs for trend</div>'; return; }
    // Chart đơn giản: số findings mỗi run
    var w=700, h=180, pad=24;
    var totals = arr.map(function(r){ return r.total_findings || r.total || 0; });
    var max = Math.max.apply(null, totals)||1, min = Math.min.apply(null, totals);
    var dx = (w - 2*pad) / Math.max(1, arr.length - 1);
    var pts = totals.map(function(v,i){
      var y = h - pad - ((v - min) / Math.max(1, max-min)) * (h - 2*pad);
      return [pad + i*dx, y, v, arr[i]];
    });
    var poly = pts.map(function(p){ return p[0].toFixed(1)+','+p[1].toFixed(1); }).join(' ');
    var dots = pts.map(function(p,i){
      return '<circle cx="'+p[0].toFixed(1)+'" cy="'+p[1].toFixed(1)+'" r="3" fill="var(--cyan)"><title>'+esc(p[3].rid)+'\n'+p[2]+' findings</title></circle>';
    }).join('');
    main.innerHTML =
      '<div style="margin-top:10px;background:var(--surface);border:1px solid var(--border);border-radius:6px;padding:14px">'
      + '<div class="mono-sm c-t3" style="font-size:10px;letter-spacing:.05em;margin-bottom:8px">FINDINGS PER RUN · last '+arr.length+' runs</div>'
      + '<svg viewBox="0 0 '+w+' '+h+'" style="width:100%;height:'+h+'px" preserveAspectRatio="none">'
      +   '<line x1="'+pad+'" y1="'+(h-pad)+'" x2="'+(w-pad)+'" y2="'+(h-pad)+'" stroke="var(--border)" stroke-width="1"/>'
      +   '<line x1="'+pad+'" y1="'+pad+'" x2="'+pad+'" y2="'+(h-pad)+'" stroke="var(--border)" stroke-width="1"/>'
      +   '<text x="'+pad+'" y="'+(pad-6)+'" fill="var(--text-3)" font-size="9" font-family="var(--font-mono)">'+max+'</text>'
      +   '<text x="'+pad+'" y="'+(h-pad+12)+'" fill="var(--text-3)" font-size="9" font-family="var(--font-mono)">'+min+'</text>'
      +   '<polyline fill="none" stroke="var(--cyan)" stroke-width="1.5" points="'+poly+'"/>'
      +   dots
      + '</svg>'
      + '</div>';
    $('sbom-u-meta').textContent = arr.length+' runs · '+totals.reduce(function(a,b){return a+b;},0)+' total findings';
  }

  // ---- Row helpers ----------------------------------------------------------
  function statusIcon(st) {
    return st==='NEW' ? '●' : st==='FIXED' ? '✓' : '≡';
  }
  function sevBadge(s) {
    s = (s||'').toUpperCase();
    var map = {
      CRITICAL: ['CRIT','var(--red)'],
      HIGH:     ['HIGH','var(--orange)'],
      MEDIUM:   ['MED', 'var(--amber)'],
      LOW:      ['LOW', 'var(--text-2)'],
    };
    var e = map[s] || ['—','var(--text-3)'];
    return '<span class="pill" style="background:transparent;border:1px solid '+e[1]+';color:'+e[1]+';font-size:9px;width:fit-content">'+e[0]+'</span>';
  }
  function slaBadge(f) {
    var days = slaDaysOver(f);
    if (days==null) return '<span class="mono-sm c-t3" style="font-size:10px">—</span>';
    if (days > 0)   return '<span class="mono-sm" style="font-size:10px;color:var(--red)">⚠ '+days+'d over</span>';
    if (days > -3)  return '<span class="mono-sm" style="font-size:10px;color:var(--amber)">'+(-days)+'d left</span>';
    return '<span class="mono-sm c-t3" style="font-size:10px">in SLA</span>';
  }
  function slaDaysOver(f) {
    if (!f.created_at && !f.first_seen) return null;
    var SLA = { CRITICAL:3, HIGH:14, MEDIUM:30, LOW:90 };
    var sla = SLA[(f.severity||'').toUpperCase()];
    if (!sla) return null;
    var t0 = new Date(f.first_seen || f.created_at).getTime();
    if (isNaN(t0)) return null;
    var ageDays = (Date.now() - t0) / 86400000;
    return Math.round(ageDays - sla);
  }
  function actionButtons(f) {
    var fid = esc(f.id || fingerprint(f));
    return '<span style="display:flex;gap:3px">'
      + '<button class="sbom-u-mini-btn" title="Create Jira ticket" onclick="window._sbomUnified.actJira(\''+fid+'\')">Jira</button>'
      + '<button class="sbom-u-mini-btn" title="Mark VEX status"   onclick="window._sbomUnified.actVex(\''+fid+'\')">VEX</button>'
      + (f._status==='PERSISTED' ? '<button class="sbom-u-mini-btn" title="Baseline accept" onclick="window._sbomUnified.actAccept(\''+fid+'\')">Accept</button>' : '')
      + '</span>';
  }

  function paginationBar(kind, total, start, end) {
    var cur = S.pagination[kind];
    var pages = Math.max(1, Math.ceil(total/S.pageSize));
    return '<div style="display:flex;gap:8px;padding:8px 0;align-items:center;font-size:10px;color:var(--text-3)">'
      + '<span class="mono-sm">'+(total?(start+1)+'-'+end+' of '+total:'0 results')+'</span>'
      + '<div style="margin-left:auto;display:flex;gap:6px">'
      + '<button class="btn btn-ghost" style="font-size:9px;padding:2px 8px" '+(cur===0?'disabled':'')+' onclick="window._sbomUnified.pageDelta(\''+kind+'\',-1)">‹ Prev</button>'
      + '<span class="mono-sm">page '+(cur+1)+'/'+pages+'</span>'
      + '<button class="btn btn-ghost" style="font-size:9px;padding:2px 8px" '+(end>=total?'disabled':'')+' onclick="window._sbomUnified.pageDelta(\''+kind+'\',1)">Next ›</button>'
      + '</div></div>';
  }

  // ---- Public API (đặt vào _sbomUnified namespace) --------------------------
  S.setView = function (v) {
    S.view = v;
    ['inventory','diff','trend'].forEach(function(t){
      var el = $('sbom-u-tab-'+t); if (!el) return;
      el.classList.toggle('sbom-u-tab-active', t===v);
    });
    renderRunSelectors();
    if (v === 'diff') ensureDiff().then(function(){ renderKPIs(); renderMain(); });
    else { renderKPIs(); renderMain(); }
  };

  S.onSelChange = function (which) {
    if (which==='new')  S.newRunUUID  = $('sbom-u-newsel').value;
    if (which==='base') S.baseRunUUID = $('sbom-u-basesel').value;
    S.diffCache = null;
    ensureDiff().then(function(){ renderKPIs(); renderMain(); });
  };
  S.swap = function () {
    var a = S.newRunUUID, b = S.baseRunUUID;
    S.newRunUUID = b; S.baseRunUUID = a;
    S.diffCache = null;
    renderRunSelectors();
    ensureDiff().then(function(){ renderKPIs(); renderMain(); });
  };
  S.setTrendRange = function (n) { S.trendDays = parseInt(n,10)||30; renderKPIs(); renderMain(); };

  // Filters
  var debounceTimer;
  S.debouncedFilter = function () {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(function(){ S.applyFilters(); }, 250);
  };
  S.applyFilters = function () {
    S.filters.sev  = ($('sbom-u-fsev')||{}).value || '';
    S.filters.tool = ($('sbom-u-ftool')||{}).value || '';
    S.filters.q    = ($('sbom-u-fq')||{}).value || '';
    S.filters.gate = ($('sbom-u-fgate')||{}).value || '';
    S.pagination.inv = 0; S.pagination.diff = 0;
    renderKPIs(); renderMain();
  };

  S.pageDelta = function (kind, d) { S.pagination[kind] = Math.max(0, S.pagination[kind]+d); renderMain(); };

  S.refresh = async function () {
    toast('Refreshing SBOM…','info');
    S.diffCache = null;
    await fetchRuns();
    if (S.view === 'diff') await ensureDiff();
    renderRunSelectors(); renderKPIs(); renderMain();
    toast('Refreshed','success');
  };

  async function ensureDiff() {
    if (!S.newRunUUID || !S.baseRunUUID) return;
    if (S.diffCache) return;
    var main = $('sbom-u-main');
    if (main) main.innerHTML = '<div style="padding:30px;text-align:center;color:var(--text-3)">Loading diff…</div>';
    var pair = await Promise.all([fetchFindings(S.newRunUUID), fetchFindings(S.baseRunUUID)]);
    S.newFindings = pair[0]; S.baseFindings = pair[1];
    S.diffCache = computeDiff(S.newFindings, S.baseFindings);
    buildToolDropdown([].concat(S.newFindings, S.baseFindings));
  }

  // Actions (placeholder gọi backend nếu có, fallback toast)
  S.actJira = function (fid) {
    fetch('/api/v1/integrations/jira/create', { method:'POST', headers: Object.assign({'Content-Type':'application/json'}, authH()), body: JSON.stringify({finding_id: fid}) })
      .then(function(r){ return r.ok ? r.json() : Promise.reject(r); })
      .then(function(d){ toast('Jira: '+(d.key||'created'),'success'); })
      .catch(function(){ toast('Jira integration not configured','warn'); });
  };
  S.actVex = function (fid) {
    var st = prompt('VEX status (not_affected | under_investigation | affected | fixed):', 'under_investigation');
    if (!st) return;
    fetch('/api/v1/vsp/findings/'+encodeURIComponent(fid)+'/vex', { method:'POST', headers: Object.assign({'Content-Type':'application/json'}, authH()), body: JSON.stringify({status: st}) })
      .then(function(r){ toast(r.ok ? 'VEX recorded' : 'VEX endpoint missing', r.ok?'success':'warn'); });
  };
  S.actAccept = function (fid) {
    if (!confirm('Mark this finding as baseline-accepted? It will bypass SLA tracking.')) return;
    fetch('/api/v1/vsp/findings/'+encodeURIComponent(fid)+'/accept', { method:'POST', headers: authH() })
      .then(function(r){ toast(r.ok ? 'Accepted' : 'Accept endpoint missing', r.ok?'success':'warn'); });
  };

  S.openDetail = function (rid) { (window.sbomDetail||function(){})(rid); };
  S.download   = function (rid) { (window.sbomDownload||function(){})(rid); };

  // Exports
  S.exportData = function (fmt) {
    var rows;
    if (S.view === 'diff' && S.diffCache) {
      rows = applyFiltersToList([].concat(S.diffCache.newOnly, S.diffCache.persisted, S.diffCache.fixed));
    } else {
      rows = S.runs;
    }
    if (fmt === 'json') return downloadBlob(JSON.stringify(rows, null, 2), 'sbom-'+S.view+'.json', 'application/json');
    if (fmt === 'csv')  return downloadBlob(toCSV(rows), 'sbom-'+S.view+'.csv', 'text/csv');
    if (fmt === 'cdx')  {
      if (S.view === 'inventory') {
        var rid = S.runs[0] && S.runs[0].rid;
        if (rid) return S.download(rid);
        return toast('No run selected for CycloneDX export','warn');
      }
      return toast('CycloneDX export available in Inventory view','warn');
    }
    if (fmt === 'vex' || fmt === 'sarif') {
      // gọi backend nếu có
      var rid = (S.runs.find(function(r){ return r.id === S.newRunUUID; })||{}).rid || (S.runs[0]||{}).rid;
      if (!rid) return toast('No run selected','warn');
      var url = fmt==='vex' ? '/api/v1/sbom/'+rid+'/vex' : '/api/v1/findings/'+rid+'/sarif';
      window.open(url+'?token='+encodeURIComponent(token()), '_blank');
    }
  };
  function toCSV(rows) {
    if (!rows.length) return '';
    var keys = Object.keys(rows[0]).filter(function(k){ return typeof rows[0][k] !== 'object'; });
    var head = keys.join(',');
    var body = rows.map(function(r){
      return keys.map(function(k){
        var v = r[k]==null?'':String(r[k]).replace(/"/g,'""');
        return /[",\n]/.test(v) ? '"'+v+'"' : v;
      }).join(',');
    }).join('\n');
    return head + '\n' + body;
  }
  function downloadBlob(text, name, mime) {
    var blob = new Blob([text], {type: mime||'text/plain'});
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name; a.click();
    setTimeout(function(){ URL.revokeObjectURL(a.href); }, 1000);
  }

  // Saved views & settings (simple localStorage-based)
  S.savedViews = function () {
    var raw = localStorage.getItem('vsp_sbom_views') || '{}';
    var views; try { views = JSON.parse(raw); } catch(e){ views = {}; }
    var names = Object.keys(views);
    var pick = prompt('Saved views:\n'+(names.join('\n')||'(none)')+'\n\nEnter view name to load, or "+name" to save current:');
    if (!pick) return;
    if (pick.charAt(0)==='+') {
      var n = pick.substr(1);
      views[n] = { view: S.view, filters: S.filters, newRunUUID: S.newRunUUID, baseRunUUID: S.baseRunUUID };
      localStorage.setItem('vsp_sbom_views', JSON.stringify(views));
      toast('View saved: '+n,'success');
    } else if (views[pick]) {
      Object.assign(S, views[pick]);
      ['fsev','ftool','fq','fgate'].forEach(function(k){
        var el = $('sbom-u-f'+k.replace('f','')); if (el) el.value = S.filters[k.replace('f','')] || '';
      });
      S.diffCache = null; S.setView(S.view);
      toast('Loaded: '+pick,'success');
    }
  };
  S.openSettings = function () {
    alert('SBOM config:\n'
      + '• SLA thresholds: CRITICAL=3d HIGH=14d MEDIUM=30d LOW=90d\n'
      + '• Auto-baseline: previous DONE run\n'
      + '• Page size: '+S.pageSize+'\n'
      + '\n(Edit via /api/v1/settings/sbom — not yet exposed in UI)');
  };

  // ---- Bootstrap ------------------------------------------------------------
  async function bootstrap() {
    if (!renderSkeleton()) return;
    // Ẩn nav SBOM Diff cũ (do VSP-G2 inject) nếu có.
    // Menu đôi khi được inject sau khi script này chạy, vì vậy thử nhiều lần trong vài giây.
    (function hideOldSBOMNav(){
      try {
        var matcher = function(a){
          try{
            var t = (a.textContent||'').trim();
            if (/sbom\s*diff/i.test(t)) return true;
            var oc = a.getAttribute && a.getAttribute('onclick') || '';
            if (/sbomdiff/i.test(oc)) return true;
          }catch(e){}
          return false;
        };

        // Initial pass
        Array.prototype.forEach.call(document.querySelectorAll('.nav-item'), function(a){ if (matcher(a)) a.style.display='none'; });

        // Observe future additions anywhere in the document and hide matching nodes
        try {
          if (!hideOldSBOMNav._obs) {
            hideOldSBOMNav._obs = new MutationObserver(function(muts){
              muts.forEach(function(m){
                Array.prototype.forEach.call(m.addedNodes || [], function(n){
                  if (!n || n.nodeType !== 1) return;
                  if (n.matches && n.matches('.nav-item') && matcher(n)) n.style.display='none';
                  // also check descendants
                  var found = n.querySelectorAll && n.querySelectorAll('.nav-item') || [];
                  Array.prototype.forEach.call(found, function(a){ if (matcher(a)) a.style.display='none'; });
                });
              });
            });
            hideOldSBOMNav._obs.observe(document.body, { childList: true, subtree: true });
          }
        } catch(e) {}
      } catch(e) { /* best-effort */ }
    })();
    try {
      await fetchRuns();
      renderRunSelectors(); renderKPIs(); renderMain();
    } catch(e) { console.error('[SBOM-U] bootstrap', e); }
  }

  // Wrap loadSBOM cũ — gọi bootstrap khi panel SBOM được mở
  var origLoadSBOM = window.loadSBOM;
  window.loadSBOM = async function () {
    await bootstrap();
    if (S.runs.length === 0 && typeof origLoadSBOM === 'function') {
      try { await origLoadSBOM(); } catch(e){}
    }
  };

  // Nếu panel-sbom đang mở sẵn (user đã ở đó khi script load) → bootstrap luôn
  setTimeout(function(){
    var p = document.getElementById('panel-sbom');
    if (p && p.classList.contains('active')) bootstrap();
  }, 300);

  (window.VSP_DEBUG && console.log('[SBOM-U] vsp_sbom_unified.js loaded — Inventory + Diff + Trend gộp thành 1 panel'));
})();

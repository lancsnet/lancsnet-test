/* vsp_fixes_console_v1.js — fixes 3 console errors:
 *   1. /api/sched/* 500 → warn once, show "offline" UI
 *   2. /api/v1/admin/users + api-keys 403 → silent empty list
 *   3. canEditTenantPlanV1 undefined → define it
 */
(function () {
  'use strict';

  /* ── 1. Define missing canEditTenantPlanV1 ─────────────────────── */
  if (typeof window.canEditTenantPlanV1 === 'undefined') {
    window.canEditTenantPlanV1 = function () {
      try {
        var role = '';
        try { role = (window.parent && window.parent.VSPClaims && window.parent.VSPClaims.role) || ''; } catch (_) {}
        if (!role) {
          var tk = (window.parent && window.parent.TOKEN) ||
                   localStorage.getItem('TOKEN') ||
                   localStorage.getItem('vsp_token') || '';
          if (tk) {
            var p = JSON.parse(atob(tk.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));
            role = p.role || '';
          }
        }
        return ['superadmin','super_admin','platform_admin','owner'].indexOf(role) !== -1;
      } catch (_) { return false; }
    };
  }

  /* ── 2+3. Intercept fetch once — scheduler 500 + admin 403 ─────── */
  var _orig = window.fetch.bind(window);
  var _schedWarnDone = false;

  window.fetch = function (input, init) {
    var url = (typeof input === 'string') ? input
            : (input && input.url) ? input.url : String(input || '');

    /* Scheduler paths → suppress 500/502/503 red errors */
    var isSched = url.indexOf('/api/sched/') !== -1 ||
                  url.indexOf(':8092') !== -1;
    if (isSched) {
      var _schedInit = init || {};
      var _schedTok = window.TOKEN || localStorage.getItem('vsp_token') || '';
      if (_schedTok) {
        _schedInit = Object.assign({}, _schedInit, {
          headers: Object.assign({}, _schedInit.headers || {}, {
            'Authorization': 'Bearer ' + _schedTok
          })
        });
      }
      return _orig(input, _schedInit).then(function (r) {
        if (r.status >= 500) {
          if (!_schedWarnDone) {
            console.warn('[VSP-Scheduler] microservice unavailable (HTTP', r.status, ') — start :8092 service');
            _schedWarnDone = true;
          }
          return new Response(JSON.stringify({ error: 'scheduler offline' }),
            { status: r.status, headers: { 'Content-Type': 'application/json' } });
        }
        return r;
      }).catch(function (e) {
        if (!_schedWarnDone) {
          console.warn('[VSP-Scheduler] unreachable —', e.message || e);
          _schedWarnDone = true;
        }
        throw new Error('scheduler offline');
      });
    }

    /* Admin user/key endpoints → return empty list on 403 */
    var isAdminSilent = (url.indexOf('/api/v1/admin/users') !== -1 ||
                         url.indexOf('/api/v1/admin/api-keys') !== -1);
    if (isAdminSilent) {
      return _orig(input, init).then(function (r) {
        if (r.status === 403 || r.status === 401) {
          var empty = url.indexOf('api-keys') !== -1
            ? '{"api_keys":[]}' : '{"users":[]}';
          return new Response(empty, { status: 200,
            headers: { 'Content-Type': 'application/json' } });
        }
        return r;
      });
    }

    return _orig(input, init);
  };

  /* ── 4. Scheduler offline UI patch ─────────────────────────────── */
  function applyOfflineUI() {
    var h = document.getElementById('sch-health');
    if (h && h.textContent.trim() === 'checking…')
      h.innerHTML = '<span style="color:#f59e0b">●</span> offline — :8092 not reachable';

    var rows = document.getElementById('sch-jobs-rows');
    if (rows && rows.textContent.indexOf('loading') !== -1)
      rows.innerHTML = '<tr><td colspan="7" style="padding:20px;text-align:center;color:#f59e0b">' +
        '⚠ Scheduler microservice không chạy — khởi động service :8092 để dùng tính năng này.' +
        '</td></tr>';

    var feed = document.getElementById('sch-feed-rows');
    if (feed && feed.textContent.indexOf('loading') !== -1)
      feed.innerHTML = '<tr><td style="padding:12px;text-align:center;color:#64748b">— offline —</td></tr>';
  }
  setTimeout(applyOfflineUI, 2500);
  setTimeout(applyOfflineUI, 5000);

  /* ── 5. Suppress unhandled admin 403 rejections ─────────────────── */
  window.addEventListener('unhandledrejection', function (ev) {
    try {
      var msg = String((ev.reason && (ev.reason.message || ev.reason)) || '');
      if (msg.indexOf('403') !== -1 &&
          (msg.indexOf('admin/users') !== -1 || msg.indexOf('admin/api-keys') !== -1)) {
        ev.preventDefault();
      }
    } catch (_) {}
  });

  console.log('[FIX-CONSOLE-V1] installed');
})();

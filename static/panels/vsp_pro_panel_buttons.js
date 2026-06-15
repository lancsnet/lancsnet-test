/* VSP PRO panel header helper — auto-injects ⚙ Configure + 🔔 Notifications
 * buttons into any iframe panel that loads this script. Configure form fields
 * can be customized per panel via window._vspProPanelConfig (set before this
 * script loads), otherwise a tiny default form is used.
 *
 * Storage convention: per-panel preferences ride in
 *   feature_config[settings_general].panel_<id>
 * — same sub-key pattern P4 Compliance + Settings panel use, no migration
 *   needed.
 */
(function(){
  'use strict';
  if (window._vspProPanelButtonsLoaded) return;
  window._vspProPanelButtonsLoaded = true;

  function getToken(){
    var t = window.TOKEN || localStorage.getItem('vsp_token') || '';
    if (!t || t.length < 20) {
      try { t = window.parent.TOKEN || ''; } catch(e) {}
    }
    return t;
  }

  function _toast(msg, kind){
    if (typeof window.toast === 'function') return window.toast(msg, kind || 'info');
    if (typeof window.showToast === 'function') return window.showToast(msg, kind || 'info');
    try { window.parent.showToast && window.parent.showToast(msg, kind || 'info'); } catch(e){
      (window.VSP_DEBUG && console.log('[panel]', msg));
    }
  }

  // Best-effort discovery of the panel id (for sub-key naming). Falls back to
  // <title> or pathname when window._vspProPanelConfig.id isn't set.
  function _panelId(){
    var cfg = window._vspProPanelConfig || {};
    if (cfg.id) return cfg.id;
    var path = (location.pathname || '').replace(/^.*\//, '').replace(/\.html$/, '');
    return path || 'panel';
  }

  async function openPanelConfigure(){
    var cfg = window._vspProPanelConfig || {};
    var pid = _panelId();
    var subKey = 'panel_' + pid;
    var token = getToken();
    if (!token) { _toast('Login required', 'warn'); return; }

    var formModal = null;
    try { formModal = window.parent.VSP_PRO_FORM_MODAL; } catch(e) {}
    if (!formModal) { _toast('Configure requires the parent shell', 'warn'); return; }

    // Load existing settings_general blob
    var existing = {};
    try {
      var r = await fetch('/api/v1/features/settings_general/config', {
        headers:{Authorization:'Bearer '+token}, credentials:'same-origin'
      });
      if (r.ok) { var j = await r.json(); existing = (j && j.config) || {}; }
    } catch(e) {}
    var panelCfg = existing[subKey] || {};

    // Default fields if panel didn't supply its own
    var fields = (cfg.fields && cfg.fields.length) ? cfg.fields : [
      { id: 'auto_refresh_secs', label: 'Auto-refresh interval (seconds, 0 = off)', type: 'number',
        value: panelCfg.auto_refresh_secs || 0,
        hint: 'Panel re-runs its loader on this cadence' },
      { id: 'page_size', label: 'Default page size for tables', type: 'number',
        value: panelCfg.page_size || 25 }
    ];
    // Merge defaults with stored values
    fields.forEach(function(f){
      if (panelCfg[f.id] !== undefined) f.value = panelCfg[f.id];
    });

    formModal({
      title: (cfg.title || pid) + ' — panel preferences',
      sub: cfg.sub || 'Stored per tenant under settings_general.' + subKey,
      submitLabel: 'Save',
      fields: fields,
      commit: function(v){
        existing[subKey] = v;
        return fetch('/api/v1/features/settings_general/config', {
          method:'PUT',
          headers:{'Authorization':'Bearer '+token,'Content-Type':'application/json'},
          credentials:'same-origin',
          body: JSON.stringify({ config: existing })
        }).then(function(r){ if (!r.ok) throw new Error('HTTP '+r.status); return r.json(); });
      }
    }).then(function(saved){
      if (saved) _toast('Preferences saved ✓', 'success');
    }).catch(function(e){
      _toast('Save failed: ' + (e.message||e), 'error');
    });
  }

  function openPanelNotifications(){
    try {
      if (window.parent && window.parent.VSP_PRO && window.parent.VSP_PRO.openNotifications) {
        window.parent.VSP_PRO.openNotifications();
        return;
      }
    } catch(e) {}
    _toast('Notifications require the parent shell', 'warn');
  }

  function _btn(label, title, onclick){
    var b = document.createElement('button');
    b.className = 'btn btn-ghost btn-sm';
    b.style.cssText = 'font-size:11px;margin-right:6px';
    b.title = title;
    b.textContent = label;
    b.onclick = onclick;
    return b;
  }

  function _injectInto(host){
    if (!host || host.querySelector('[data-vsp-pro-cfg]')) return;
    var cfgBtn = _btn('⚙ Configure', 'Panel preferences', openPanelConfigure);
    cfgBtn.setAttribute('data-vsp-pro-cfg', '1');
    var notifBtn = _btn('🔔 Notifications', 'Cross-panel notification routing', openPanelNotifications);
    notifBtn.setAttribute('data-vsp-pro-notif', '1');
    // Insert before the existing Refresh button if there is one
    var refresh = Array.from(host.children).find(function(c){
      var t = (c.textContent || '').trim();
      return /Refresh|↻|⟳|↺/.test(t);
    });
    if (refresh) {
      host.insertBefore(notifBtn, refresh);
      host.insertBefore(cfgBtn, notifBtn);
    } else {
      host.appendChild(cfgBtn);
      host.appendChild(notifBtn);
    }
  }

  function autoInject(){
    // Strategy: find the page header row that holds the Refresh button
    var btns = document.querySelectorAll('button.btn');
    var hosts = new Set();
    btns.forEach(function(b){
      var t = (b.textContent || '').trim();
      if (/Refresh|↻|⟳|↺/.test(t) && b.parentElement) hosts.add(b.parentElement);
    });
    hosts.forEach(_injectInto);
    // Fallback: top-most .hdr or .header div
    if (hosts.size === 0) {
      var h = document.querySelector('.hdr, .header, .panel-hdr');
      if (h) _injectInto(h);
    }
  }

  /* Global 402 interceptor — when any /api/* call returns Payment Required,
   * show a themed upgrade modal instead of letting panels render raw error.
   * Reuses parent shell's openModal/toast where available, falls back to a
   * minimal inline overlay otherwise. Throttled so a single 402 storm doesn't
   * spam multiple modals. */
  var _402Cooldown = 0;
  function _show402(featureLabel, required, current){
    var now = Date.now();
    if (now - _402Cooldown < 3000) return;  // throttle
    _402Cooldown = now;
    var req = (required || 'pro').toUpperCase();
    var cur = current || 'starter';
    var msg = featureLabel + ' requires ' + req + ' plan (current: ' + cur + ')';
    // Best path: parent's openModal renders themed Contact Sales / Open Billing
    try {
      if (window.parent && window.parent.VSP_PRO && window.parent.VSP_PRO.upgradeContact) {
        var openModal = window.parent.VSP_PRO_OPEN_MODAL;
        if (openModal) {
          openModal({
            title: req + ' feature — ' + featureLabel,
            body: 'Tenant plan: <code>' + cur + '</code>. Upgrade to <code>' + req.toLowerCase() + '</code> to enable.',
            submitLabel: 'Contact sales',
            cancelLabel: 'Close',
            onSubmit: function(){ window.parent.VSP_PRO.upgradeContact(); }
          });
          return;
        }
      }
    } catch(e) {}
    // Fallback: in-iframe inline banner
    _toast(msg, 'warn');
  }

  if (!window._vspPro402Intercept) {
    window._vspPro402Intercept = true;
    var _origFetch = window.fetch;
    window.fetch = function(url, opts){
      var p = _origFetch.apply(this, arguments);
      return p.then(function(resp){
        if (resp && resp.status === 402 && typeof url === 'string' && url.indexOf('/api/') >= 0) {
          // Clone before reading body so caller still gets the response
          var clone = resp.clone();
          clone.json().then(function(j){
            j = j || {};
            _show402(_panelId(), j.required_plan, j.current_plan);
          }).catch(function(){
            _show402(_panelId(), 'pro', 'starter');
          });
        }
        return resp;
      });
    };
  }

  // Expose for manual call + auto-run when DOM is ready
  window.openPanelConfigure = openPanelConfigure;
  window.openPanelNotifications = openPanelNotifications;
  window.vspProInjectButtons = autoInject;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function(){ setTimeout(autoInject, 100); });
  } else {
    setTimeout(autoInject, 100);
  }
})();

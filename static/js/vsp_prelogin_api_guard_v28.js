/* VSP_PRELOGIN_API_GUARD_V28
   Purpose: prevent protected CI/CD/action APIs from auto-firing on login page before auth.
*/
(function(){
  if (window.__VSP_PRELOGIN_API_GUARD_V28__) return;
  window.__VSP_PRELOGIN_API_GUARD_V28__ = true;

  function token(){
    try {
      return window.TOKEN ||
        localStorage.getItem('vsp_token') ||
        localStorage.getItem('token') ||
        sessionStorage.getItem('vsp_token') ||
        sessionStorage.getItem('token') || '';
    } catch(e) {
      return window.TOKEN || '';
    }
  }

  function isLoginScreen(){
    try {
      if (document.querySelector('input[type="password"]')) return true;
      if (document.querySelector('[data-login], .login-card, #loginForm')) return true;
      if ((location.pathname || '').toLowerCase().includes('login')) return true;
      var txt = (document.body && document.body.innerText || '').toLowerCase();
      if (txt.includes('authenticate') && txt.includes('password')) return true;
    } catch(e) {}
    return false;
  }

  function urlOf(input){
    try {
      if (typeof input === 'string') return input;
      if (input && input.url) return input.url;
    } catch(e) {}
    return '';
  }

  function isAuthEndpoint(u){
    u = String(u || '').toLowerCase();
    return u.includes('/api/v1/auth/login') ||
           u.includes('/api/v1/auth/logout') ||
           u.includes('/api/v1/auth/me') ||
           u.includes('/api/v1/status') ||
           u.endsWith('/health') ||
           u.includes('/health');
  }

  function isProtectedAutoApi(u){
    u = String(u || '').toLowerCase();

    if (!u) return false;
    if (isAuthEndpoint(u)) return false;

    return (
      u.includes('/api/v1/cicd') ||
      u.includes('cicd_production') ||
      u.includes('production_auth') ||
      u.includes('/api/v1/admin/') ||
      u.includes('/api/v1/settings/') ||
      u.includes('/api/v1/features/') ||
      u.includes('/api/v1/schedules') ||
      u.includes('/api/v1/vsp/') ||
      u.includes('/api/p4/')
    );
  }

  function shouldBlock(u){
    return isLoginScreen() && !token() && isProtectedAutoApi(u);
  }

  var nativeFetch = window.fetch ? window.fetch.bind(window) : null;
  if (nativeFetch) {
    window.fetch = function(input, init){
      var u = urlOf(input);
      if (shouldBlock(u)) {
        console.warn('[VSP-PRELOGIN-GUARD-V28] blocked protected API before login:', u);
        return Promise.resolve(new Response(JSON.stringify({
          ok: true,
          blocked_by: 'VSP_PRELOGIN_API_GUARD_V28',
          reason: 'login_screen_no_token',
          url: u
        }), {
          status: 200,
          headers: {'Content-Type':'application/json'}
        }));
      }
      return nativeFetch(input, init);
    };
  }

  var NativeXHR = window.XMLHttpRequest;
  if (NativeXHR) {
    window.XMLHttpRequest = function(){
      var xhr = new NativeXHR();
      var _open = xhr.open;
      var blockedUrl = '';

      xhr.open = function(method, url){
        blockedUrl = String(url || '');
        if (shouldBlock(blockedUrl)) {
          this.__vspBlockedV28 = true;
          console.warn('[VSP-PRELOGIN-GUARD-V28] blocked XHR before login:', blockedUrl);
        }
        return _open.apply(xhr, arguments);
      };

      var _send = xhr.send;
      xhr.send = function(){
        if (this.__vspBlockedV28) {
          setTimeout(function(){
            try {
              Object.defineProperty(xhr, 'readyState', {value: 4});
              Object.defineProperty(xhr, 'status', {value: 200});
              Object.defineProperty(xhr, 'responseText', {value: '{"ok":true,"blocked_by":"VSP_PRELOGIN_API_GUARD_V28"}'});
              if (typeof xhr.onreadystatechange === 'function') xhr.onreadystatechange();
              if (typeof xhr.onload === 'function') xhr.onload();
            } catch(e) {}
          }, 0);
          return;
        }
        return _send.apply(xhr, arguments);
      };

      return xhr;
    };
  }

  console.log('[VSP-PRELOGIN-GUARD-V28] installed');
})();

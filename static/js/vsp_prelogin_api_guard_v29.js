/* VSP_PRELOGIN_API_GUARD_V29 — extends V28, covers all protected APIs */
(function(){
  if (window.__VSP_PRELOGIN_API_GUARD_V29__) return;
  window.__VSP_PRELOGIN_API_GUARD_V29__ = true;

  function token(){
    try {
      return window.TOKEN ||
        localStorage.getItem('vsp_token') ||
        localStorage.getItem('token') ||
        sessionStorage.getItem('vsp_token') || '';
    } catch(e) { return window.TOKEN || ''; }
  }

  function isLoginScreen(){
    try {
      if (document.querySelector('input[type="password"]')) return true;
      if (document.querySelector('[data-login], .login-card, #loginForm')) return true;
      var txt = (document.body && document.body.innerText || '').toLowerCase();
      if (txt.includes('authenticate') && txt.includes('password')) return true;
    } catch(e) {}
    return false;
  }

  function isPublic(u){
    u = String(u || '').toLowerCase();
    return u.includes('/api/v1/auth/') ||
           u.includes('/api/v1/status') ||
           u.endsWith('/health') ||
           u.includes('/health') ||
           u.includes('/static/') ||
           u.includes('/panels/');
  }

  function isProtected(u){
    u = String(u || '').toLowerCase();
    if (!u || isPublic(u)) return false;
    return u.includes('/api/');
  }

  function shouldBlock(u){
    return !token() && isLoginScreen() && isProtected(u);
  }

  function blocked(u){
    return Promise.resolve(new Response(JSON.stringify({
      ok: true, blocked_by: 'VSP_PRELOGIN_API_GUARD_V29',
      reason: 'login_screen_no_token', url: u
    }), { status: 200, headers: {'Content-Type':'application/json'} }));
  }

  var nativeFetch = window.fetch ? window.fetch.bind(window) : null;
  if (nativeFetch && !nativeFetch.__v29) {
    window.fetch = function(input, init){
      var u = typeof input === 'string' ? input : (input && input.url) || '';
      if (shouldBlock(u)) {
        console.warn('[VSP-GUARD-V29] blocked:', u);
        return blocked(u);
      }
      return nativeFetch(input, init);
    };
    window.fetch.__v29 = true;
  }

  console.log('[VSP-GUARD-V29] installed — covers all /api/ routes');
})();

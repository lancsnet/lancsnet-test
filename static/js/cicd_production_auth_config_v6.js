
/* CICD_AUTH_LOGIN_GUARD_V27: prevent CI/CD protected API auto-call on login page */
(function(){
  if (window.__CICD_AUTH_LOGIN_GUARD_V27__) return;
  window.__CICD_AUTH_LOGIN_GUARD_V27__ = true;

  function isLoginScreen(){
    try {
      if (document.querySelector('input[type="password"]')) return true;
      if (document.querySelector('[data-login], .login-card, #loginForm')) return true;
      if ((location.pathname || '').toLowerCase().includes('login')) return true;
    } catch(e) {}
    return false;
  }

  function token(){
    try {
      return window.TOKEN ||
        localStorage.getItem('vsp_token') ||
        localStorage.getItem('token') ||
        sessionStorage.getItem('vsp_token') ||
        sessionStorage.getItem('token') || '';
    } catch(e) { return window.TOKEN || ''; }
  }

  function isCicdProtectedUrl(u){
    u = String(u || '');
    return /\/api\/v1\/cicd\//.test(u) ||
           /cicd_production_auth/i.test(u);
  }

  var nativeFetch = window.fetch ? window.fetch.bind(window) : null;
  if (!nativeFetch) return;

  window.fetch = function(input, init){
    var url = '';
    try { url = typeof input === 'string' ? input : (input && input.url) || ''; } catch(e) {}

    if (isLoginScreen() && !token() && isCicdProtectedUrl(url)) {
      console.warn('[CICD-AUTH-V27] skipped protected CI/CD API before login:', url);
      return Promise.resolve(new Response(JSON.stringify({
        skipped: true,
        reason: 'login_screen_no_token',
        url: url
      }), {
        status: 200,
        headers: {'Content-Type':'application/json'}
      }));
    }

    return nativeFetch(input, init);
  };
})();

// CICD_PRODUCTION_AUTH_CONFIG_V6
// Production rule: do not call protected /api/v1/config before auth token exists.
// This prevents noisy unauthenticated 401 without hiding real authenticated failures.
(function(){
  "use strict";
  if (window.__CICD_PROD_AUTH_CONFIG_V6__) return;
  window.__CICD_PROD_AUTH_CONFIG_V6__ = true;

  const rawFetch = window.fetch ? window.fetch.bind(window) : null;
  if (!rawFetch) return;

  function getToken(){
    try {
      return window.TOKEN ||
        localStorage.getItem("token") ||
        localStorage.getItem("access_token") ||
        sessionStorage.getItem("token") ||
        sessionStorage.getItem("access_token") ||
        "";
    } catch(e) {
      return window.TOKEN || "";
    }
  }

  function isConfigUrl(input){
    try {
      const u = typeof input === "string" ? input : (input && input.url) || "";
      return /\/api\/v1\/config(?:\?|$)/.test(u);
    } catch(e) {
      return false;
    }
  }

  window.fetch = function(input, init){
    init = init || {};
    if (isConfigUrl(input)) {
      const token = getToken();

      // Unauthenticated state: do not hit protected endpoint.
      if (!token) {
        const body = JSON.stringify({
          status: "AUTH_REQUIRED",
          authenticated: false,
          config: null,
          source: "cicd_production_auth_config_v6",
          message: "Config endpoint requires authentication; request skipped before login."
        });
        return Promise.resolve(new Response(body, {
          status: 200,
          headers: {
            "content-type": "application/json",
            "x-vsp-auth-aware": "skipped-before-auth"
          }
        }));
      }

      // Authenticated state: attach bearer token if caller forgot.
      const h = new Headers(init.headers || {});
      if (!h.has("Authorization")) h.set("Authorization", "Bearer " + token);
      init = Object.assign({}, init, { headers: h });
    }

    return rawFetch(input, init);
  };
})();

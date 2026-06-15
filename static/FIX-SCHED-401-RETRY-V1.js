/*!
 * FIX-SCHED-401-RETRY-V1
 * ------------------------------------------------------------------
 * Bug: panel Scheduler gọi /api/sched/* lúc boot/reload TRƯỚC khi token
 *      login được gắn vào request -> backend trả 401 (RBAC đúng), panel
 *      kẹt "Loading…".
 * Fix: bọc thêm 1 lớp fetch ngoài cùng. Nếu request /api/sched/* trả 401
 *      thì tự lấy Bearer token từ storage và GỬI LẠI đúng 1 lần. Hàm api()
 *      trong scheduler 'await fetch' sẽ nhận thẳng response 200 -> panel tự
 *      render. Không cần biết handle panel, reload bao nhiêu lần cũng ổn.
 * An toàn: chỉ retry trên 401 (no-token / expired), KHÔNG đụng 403 (RBAC
 *      deny hợp lệ); retry tối đa 1 lần -> không loop.
 */
(function () {
  if (window.__FIX_SCHED_401_RETRY_V1) return;
  window.__FIX_SCHED_401_RETRY_V1 = true;
  var TAG = '[FIX-SCHED-401-RETRY-V1]';

  // Mặc định chỉ /api/sched/. Panel khác cũng dính thì đổi: var SCOPE = /\/api\//;
  var SCOPE  = /\/api\/sched\//;
  var JWT_RE = /^eyJ[\w-]+\.[\w-]+\.[\w-]+$/;
  var isJWT  = function (v) { return typeof v === 'string' && JWT_RE.test(v.trim()); };

  function findToken() {
    var stores = [];
    try { stores.push(localStorage); } catch (e) {}
    try { stores.push(sessionStorage); } catch (e) {}
    var prefer = [], other = [];
    for (var s = 0; s < stores.length; s++) {
      var st = stores[s];
      for (var i = 0; i < st.length; i++) {
        var k = st.key(i), v;
        try { v = st.getItem(k); } catch (e) { continue; }
        var hit = null;
        if (isJWT(v)) {
          hit = v.trim();
        } else if (v && v.indexOf('eyJ') !== -1) {
          try {
            var o = JSON.parse(v);
            for (var kk in o) { if (isJWT(o[kk])) { hit = o[kk].trim(); break; } }
          } catch (e) {}
        }
        if (hit) {
          (/tok|auth|jwt|access|bearer|session|id_?token/i.test(k) ? prefer : other).push(hit);
        }
      }
    }
    return prefer[0] || other[0] || null;
  }

  function waitForToken(timeoutMs) {
    return new Promise(function (resolve) {
      var tk = findToken(); if (tk) return resolve(tk);
      var t0 = Date.now();
      var iv = setInterval(function () {
        var t = findToken();
        if (t) { clearInterval(iv); resolve(t); }
        else if (Date.now() - t0 > timeoutMs) { clearInterval(iv); resolve(null); }
      }, 150);
    });
  }

  function withAuth(base, init, token) {
    var src = (init && init.headers) ||
              ((typeof Request !== 'undefined' && base instanceof Request) ? base.headers : undefined) ||
              {};
    var headers = new Headers(src);
    headers.set('Authorization', 'Bearer ' + token);
    var next = Object.assign({}, init || {});
    next.headers = headers;
    return next;
  }

  var origFetch = window.fetch.bind(window);
  window.fetch = function (input, init) {
    var url = (typeof input === 'string') ? input : (input && input.url) ? input.url : '';
    if (!SCOPE.test(url)) return origFetch(input, init);

    var reqClone = (typeof Request !== 'undefined' && input instanceof Request) ? input.clone() : null;

    return origFetch(input, init).then(function (res) {
      if (res.status !== 401) return res;
      return waitForToken(15000).then(function (token) {
        if (!token) { console.warn(TAG, 'no token available, leaving 401:', url); return res; }
        console.log(TAG, 'retrying with auth ->', url);
        var base = reqClone || input;
        return origFetch(base, withAuth(base, init, token)).then(function (res2) {
          if (res2.status === 401) {
            console.warn(TAG, 'vẫn 401 sau retry (token hết hạn / bị wrapper khác ghi đè?) ->', url);
          }
          return res2;
        });
      });
    });
  };

  console.log(TAG, 'installed — auto-attach Bearer & retry on first 401');
})();

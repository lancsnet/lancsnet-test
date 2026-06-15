import base64, json, hmac, hashlib, os, time
from http.server import BaseHTTPRequestHandler, HTTPServer
_JWT_SECRET = os.environ.get("JWT_SECRET","")
def _sig_ok(tok):
    if not _JWT_SECRET: return True
    try:
        h,p,sg = tok.split(".")
        _es = base64.urlsafe_b64encode(hmac.new(_JWT_SECRET.encode(), (h+"."+p).encode(), hashlib.sha256).digest()).rstrip(b"=").decode()
        if not hmac.compare_digest(_es, sg): return False
        _cl = json.loads(base64.urlsafe_b64decode(p + "="*(-len(p)%4)))
        _now = time.time()
        if "exp" not in _cl or _cl["exp"] <= _now: return False
        if "nbf" in _cl and _cl["nbf"] > _now: return False
        return True
    except Exception:
        return False
ALLOWED = {"admin", "auditor"}
def role(h):
    if not h or not h.lower().startswith("bearer "): return None
    tok = h.split(None,1)[1]
    if not _sig_ok(tok): return None
    p = tok.split(".")
    if len(p) < 2: return None
    pad = p[1] + "=" * (-len(p[1]) % 4)
    try: return json.loads(base64.urlsafe_b64decode(pad)).get("role")
    except Exception: return None
class H(BaseHTTPRequestHandler):
    def do_GET(self):
        ok = role(self.headers.get("Authorization","")) in ALLOWED
        self.send_response(200 if ok else 403); self.end_headers()
    def log_message(self,*a): pass
HTTPServer(("127.0.0.1",8950), H).serve_forever()

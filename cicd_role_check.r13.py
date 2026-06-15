#!/usr/bin/env python3
import base64, json
from http.server import HTTPServer, ThreadingHTTPServer, BaseHTTPRequestHandler
WRITE_ROLES    = {"admin"}
READ_ROLES     = {"admin", "analyst", "auditor"}
PIPELINE_ROLES = {"admin", "analyst", "auditor", "dev"}
ANALYST_ROLES  = {"admin", "analyst"}
PIPELINE_WRITE_ROLES = {"admin", "dev", "analyst"}
# --- SCOPE-AWARE READ (nguon: /api/v1/rbac/matrix) ---
ROLE_SCOPES = {
 "admin":   {"dashboard:read","runs:read","findings:read","reports:read","admin:users","admin:roles","admin:tenants","audit:read","sso:read","soar:read"},
 "analyst": {"dashboard:read","runs:read","findings:read","reports:read","soar:read"},
 "auditor": {"dashboard:read","findings:read","reports:read","audit:read"},
 "dev":     {"dashboard:read","runs:read","findings:read"},
 "qa":      {"dashboard:read","runs:read","reports:read"},
}
from urllib.parse import unquote as _unq
import re as _re
import hmac as _hmac, hashlib as _hashlib, os as _os, time as _time
_JWT_SECRET = _os.environ.get('JWT_SECRET','')
def _sig_ok(token):
    if not _JWT_SECRET: return True  # secret chua nap -> fail-open (verify khi co)
    try:
        h,p,sg = token.split('.')
        _es = base64.urlsafe_b64encode(_hmac.new(_JWT_SECRET.encode(), (h+'.'+p).encode(), _hashlib.sha256).digest()).rstrip(b'=').decode()
        if not _hmac.compare_digest(_es, sg): return False
        _cl = json.loads(base64.urlsafe_b64decode(p + '='*(-len(p)%4)))
        _now = _time.time()
        if 'exp' not in _cl or _cl['exp'] <= _now: return False
        if 'nbf' in _cl and _cl['nbf'] > _now: return False
        return True
    except Exception:
        return False
def _norm(u):
    u = _unq(u or "")
    u = u.split("?",1)[0].split(";",1)[0]
    u = _re.sub(r"/+","/",u)
    return u
READ_SCOPE_PREFIX = [
 # ROUND12-MAP2: policy theo module. Admin-only (key/config) phai dung TRUOC supply-chain rong.
 ("/api/v1/supply-chain/key","admin:users"), ("/api/v1/supply-chain/config","admin:users"),
 ("/api/v1/observability","admin:users"),
 ("/api/v1/supply-chain","findings:read"), ("/api/v1/export","findings:read"),
 ("/api/v1/data/exports","findings:read"),
 ("/api/v1/security/disclosures","soar:read"), ("/api/v1/attack","soar:read"),
 ("/api/v1/ai/","soar:read"),
 ("/api/v1/dora","dashboard:read"), ("/api/v1/drift","dashboard:read"),
 ("/api/v1/improvement","dashboard:read"),
 ("/api/v1/cato","audit:read"), ("/api/v1/nist-csf","audit:read"),
 ("/api/v1/tabletop","audit:read"),
 ("/api/v1/transparency","reports:read"),
 # ROUND12-MAP: app-shell + dashboard/runs/findings/reports widgets (fallout default-deny)
 ("/api/v1/config","dashboard:read"), ("/api/v1/locale","dashboard:read"),
 ("/api/v1/status","dashboard:read"), ("/api/v1/auth/check","dashboard:read"),
 ("/api/v1/scanners/health","dashboard:read"), ("/api/v1/kpi","dashboard:read"),
 ("/api/v1/vsp/gate","dashboard:read"), ("/api/v1/vsp/posture","dashboard:read"),
 ("/api/v1/vsp/metrics_slos","dashboard:read"), ("/api/v1/vsp/sla","dashboard:read"),
 ("/api/v1/vsp/run_report","reports:read"), ("/api/v1/vsp/executive_report","reports:read"),
 ("/api/v1/vsp/batch","runs:read"), ("/api/v1/vsp/sandbox","runs:read"),
 ("/api/v1/vulns","findings:read"),
 ("/api/v1/soar","soar:read"), ("/api/v1/correlation","soar:read"),
 ("/api/v1/policy/rules","soar:read"), ("/api/v1/vsp/findings","findings:read"),
 ("/api/v1/findings","findings:read"), ("/api/v1/audit","audit:read"),
 ("/api/v1/reports","reports:read"), ("/api/v1/runs","runs:read"),
 ("/api/v1/vsp/run","runs:read"), ("/api/v1/notifications","admin:users"),
]
def required_read_scope(uri):
    uri = _norm(uri)
    for pre, sc in READ_SCOPE_PREFIX:
        if uri.startswith(pre): return sc
    return None
def read_set(uri):
    sc = required_read_scope(uri)
    if sc is None: return READ_ROLES
    return {r for r, sco in ROLE_SCOPES.items() if sc in sco}
WRITE_METHODS  = {"POST", "PUT", "PATCH", "DELETE"}
# write tren cac prefix nay chi admin (compliance/attestation/zt authoring)
COMPLIANCE_WRITE = ("/p4/rmf", "/p4/ssdf", "/p4/control", "/p4/vn-standards",
    "/p4/attestation", "/oscal/", "/cisa-attestation/", "/poam",
    "/governance/evidence", "/p4/zt", "/compliance/", "/logs/sources")  # ROUND11 admin-only
def writeset_for(uri):
    uri = _norm(uri)
    for s in COMPLIANCE_WRITE:
        if s in uri:
            return WRITE_ROLES
    return ANALYST_ROLES
def decode_payload(auth_header):
    try:
        token = auth_header.removeprefix("Bearer ").strip()
        if not token: return None
        if not _sig_ok(token): return None  # ROUND13 HS256 verify
        p = token.split(".")[1]
        p += "=" * (-len(p) % 4)
        return json.loads(base64.urlsafe_b64decode(p))
    except: return None
def decode_role(auth_header):
    pl = decode_payload(auth_header)
    return pl.get("role") if pl else None
def allowset(path, method, uri):
    # tra ve (allowed_set or None). None = path khong phai check -> 404
    w = method in WRITE_METHODS
    if path == "/cicd-read-check":
        return writeset_for(uri) if w else read_set(uri)
    if path == "/cicd-pipeline-check":
        return PIPELINE_WRITE_ROLES if w else PIPELINE_ROLES
    return {
        "/cicd-write-check": WRITE_ROLES,
        "/analyst-check": ANALYST_ROLES,
        "/pipeline-write-check": PIPELINE_WRITE_ROLES,
    }.get(path)
class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        auth = self.headers.get("Authorization","")
        role = decode_role(auth)
        path = self.path.split("?")[0]
        method = (self.headers.get("X-Orig-Method","GET") or "GET").upper()
        ouri = self.headers.get("X-Orig-URI","")
        if path == "/auth-me":
            pl = decode_payload(auth)
            if not pl:
                self.send_response(401); self.send_header("Content-Length","0"); self.end_headers(); return
            body = json.dumps({k: pl.get(k) for k in ("uid","email","role","tid","exp","iat")}).encode()
            self.send_response(200)
            self.send_header("Content-Type","application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers(); self.wfile.write(body); return
        if path == "/role-detect":
            self.send_response(200 if role else 401)
            if role: self.send_header("X-Role", role)
            self.send_header("Content-Length","0"); self.end_headers(); return
        allowed = allowset(path, method, ouri)
        if allowed is None:
            self.send_response(404); self.end_headers(); return
        code = 401 if not role else (200 if role in allowed else 403)
        self.send_response(code)
        if role: self.send_header("X-Role", role)
        self.send_header("Content-Length","0"); self.end_headers()
    def log_message(self,*a): pass
ThreadingHTTPServer(("127.0.0.1",8960), Handler).serve_forever()

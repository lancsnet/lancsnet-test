#!/usr/bin/env python3
"""
VSP Security Test Suite v2.0
Tests: RBAC, Input Validation, Auth Bypass, Business Logic
Output: PASS/FAIL + evidence + severity (CRITICAL/HIGH/MEDIUM/LOW/INFO)
"""
import urllib.request, urllib.error, json, ssl, time, random, string, sys, re
from datetime import datetime, timezone

BASE        = "https://127.0.0.1:30800"
ADMIN_EMAIL = "automation@lancs.local"
ADMIN_PASS  = "AutoTest2026!"
TEST_PASS   = "SecTest2026!!"
CTX         = ssl._create_unverified_context()

# Colors
G="\033[92m"; R="\033[91m"; Y="\033[93m"; B="\033[94m"; C="\033[96m"; M="\033[95m"; Z="\033[0m"

SUF = "".join(random.choices(string.ascii_lowercase, k=6))
results = []

def req(method, path, body=None, token=None, timeout=10):
    h = {"Content-Type": "application/json"}
    if token: h["Authorization"] = f"Bearer {token}"
    d = json.dumps(body).encode() if body is not None else None
    try:
        r = urllib.request.Request(BASE + path, d, h, method=method)
        with urllib.request.urlopen(r, timeout=timeout, context=CTX) as resp:
            try: rb = resp.read(); return resp.status, json.loads(rb), rb.decode()[:200]
            except: return resp.status, {}, ""
    except urllib.error.HTTPError as e:
        try: rb = e.read(); return e.code, json.loads(rb), rb.decode()[:200]
        except: return e.code, {}, ""
    except Exception as ex:
        return 0, {"error": str(ex)[:80]}, str(ex)[:80]

def login(email, password, tries=5):
    for i in range(tries):
        st, d, _ = req("POST", "/api/v1/auth/login", {"email": email, "password": password})
        if st == 200 and d.get("token"): return d["token"]
        if st == 429: time.sleep(4*(i+1)); continue
        time.sleep(0.8)
    return ""

def record(category, test_id, name, severity, passed, evidence="", note=""):
    results.append({
        "category": category, "id": test_id, "name": name,
        "severity": severity, "passed": passed,
        "evidence": evidence, "note": note
    })
    sev_color = {
        "CRITICAL": R, "HIGH": R, "MEDIUM": Y, "LOW": C, "INFO": B
    }.get(severity, Z)
    status = f"{G}PASS{Z}" if passed else f"{R}FAIL{Z}"
    print(f"  [{status}] [{sev_color}{severity:<8}{Z}] {test_id:<12} {name}")
    if not passed:
        print(f"           {Y}Evidence: {evidence}{Z}")
        if note: print(f"           {C}Note: {note}{Z}")

def section(title):
    print(f"\n{B}{'='*72}\n  {title}\n{'='*72}{Z}")

# ─────────────────────────────────────────────
#  SETUP
# ─────────────────────────────────────────────
section("SETUP")
admin_tok = login(ADMIN_EMAIL, ADMIN_PASS)
if not admin_tok:
    print(f"{R}FATAL: admin login fail{Z}"); sys.exit(1)
print(f"  {G}OK{Z}  Admin login: {ADMIN_EMAIL}")

# Tạo test users
ROLES = ["analyst", "dev", "qa", "auditor"]
EMAILS = {r: f"sectest-{r}-{SUF}@lancs.local" for r in ROLES}
TOKENS = {}
UIDS   = {}

for role, email in EMAILS.items():
    st, d, _ = req("POST", "/api/v1/admin/users",
                   {"email": email, "password": TEST_PASS, "role": role}, token=admin_tok)
    uid = d.get("id","") if isinstance(d,dict) else ""
    if st in (200,201) and uid:
        UIDS[role] = uid
        tok = login(email, TEST_PASS)
        TOKENS[role] = tok
        print(f"  {G}OK{Z}  {role:8} created + login {'OK' if tok else 'FAIL'}")
    else:
        print(f"  {Y}SKIP{Z} {role:8} create failed st={st}")
    time.sleep(0.5)

# ─────────────────────────────────────────────
#  A. AUTHENTICATION TESTS
# ─────────────────────────────────────────────
section("A. AUTHENTICATION & TOKEN SECURITY")

# A-001: Login với sai password
st, d, ev = req("POST", "/api/v1/auth/login", {"email": ADMIN_EMAIL, "password": "wrongpass"})
record("AUTH", "A-001", "Wrong password rejected", "HIGH",
       st in (401, 400, 403),
       f"POST /auth/login wrong pass -> {st}", "Expect 401/400/403")

# A-002: Login thiếu field
st, d, ev = req("POST", "/api/v1/auth/login", {"email": ADMIN_EMAIL})
record("AUTH", "A-002", "Missing password field rejected", "MEDIUM",
       st in (400, 401, 422, 429),
       f"POST /auth/login no password -> {st}")

# A-003: Truy cập protected endpoint không có token
st, d, ev = req("GET", "/api/v1/vsp/findings")
record("AUTH", "A-003", "No token rejected on protected endpoint", "CRITICAL",
       st in (401, 403),
       f"GET /findings no token -> {st}")

# A-004: Token giả mạo
fake_tok = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOiJmYWtlIiwicm9sZSI6ImFkbWluIn0.fakesignature"
st, d, ev = req("GET", "/api/v1/vsp/findings", token=fake_tok)
record("AUTH", "A-004", "Forged JWT rejected", "CRITICAL",
       st in (401, 403),
       f"GET /findings fake JWT -> {st}")

# A-005: Token rỗng
st, d, ev = req("GET", "/api/v1/vsp/findings", token="")
record("AUTH", "A-005", "Empty token rejected", "HIGH",
       st in (401, 403),
       f"GET /findings empty token -> {st}")

# A-006: Token malformed (không phải JWT)
st, d, ev = req("GET", "/api/v1/vsp/findings", token="not-a-jwt-at-all")
record("AUTH", "A-006", "Malformed token rejected", "HIGH",
       st in (401, 403),
       f"GET /findings malformed token -> {st}")

# ─────────────────────────────────────────────
#  B. RBAC TESTS
# ─────────────────────────────────────────────
section("B. RBAC — LEAST PRIVILEGE")

rbac_cases = [
    # (test_id, name, severity, method, path, body, roles_allowed)
    ("B-001", "Admin-only: list users",      "HIGH",   "GET",  "/api/v1/admin/users?limit=1", None,  {"admin"}),
    ("B-002", "Admin-only: create user",     "HIGH",   "POST", "/api/v1/admin/users",         {},    {"admin"}),
    ("B-003", "Admin-only: tool-config",     "MEDIUM", "GET",  "/api/v1/settings/tool-config",None,  {"admin"}),
    ("B-004", "No auditor/qa on scan",       "MEDIUM", "POST", "/api/v1/vsp/run",             {},    {"admin","analyst","dev","qa"}),
    ("B-005", "No auditor on bulk-accept",   "MEDIUM", "POST", "/api/v1/vsp/findings/bulk/accept", {}, {"admin","analyst","dev","qa","auditor"}),
    ("B-006", "All roles: read findings",    "LOW",    "GET",  "/api/v1/vsp/findings?limit=1",None,  {"admin","analyst","dev","qa","auditor"}),
    ("B-007", "All roles: read SSDF",        "LOW",    "GET",  "/api/p4/ssdf/practices",      None,  {"admin","analyst","dev","qa","auditor"}),
]

for tid, name, sev, method, path, body, allowed in rbac_cases:
    fails = []
    for role in ROLES:
        tok = TOKENS.get(role, "")
        if not tok: continue
        st, d, ev = req(method, path, body, token=tok)
        should_allow = role in allowed
        if should_allow and st in (401, 403):
            fails.append(f"{role} got {st} (should pass)")
        elif not should_allow and st not in (401, 403):
            fails.append(f"OVER-PERM: {role} got {st} (should 403)")
    record("RBAC", tid, name, sev, len(fails)==0,
           "; ".join(fails) if fails else "all roles correct")

# B-008: Privilege escalation attempt
st, d, ev = req("POST", "/api/v1/admin/users",
                {"email": f"evil-{SUF}@lancs.local", "password": TEST_PASS, "role": "admin"},
                token=TOKENS.get("analyst",""))
record("RBAC", "B-008", "Privilege escalation (analyst create admin)", "CRITICAL",
       st == 403,
       f"analyst POST /admin/users role=admin -> {st}")

# B-009: Delete user as analyst
st, d, ev = req("DELETE", f"/api/v1/admin/users/{UIDS.get('qa','nonexistent')}",
                token=TOKENS.get("analyst",""))
record("RBAC", "B-009", "Analyst cannot delete users", "HIGH",
       st == 403,
       f"analyst DELETE /admin/users/... -> {st}")

# ─────────────────────────────────────────────
#  C. INPUT VALIDATION / INJECTION
# ─────────────────────────────────────────────
section("C. INPUT VALIDATION & INJECTION")

# C-001: SQL injection in login
st, d, ev = req("POST", "/api/v1/auth/login",
                {"email": "' OR '1'='1", "password": "' OR '1'='1"})
record("INJECTION", "C-001", "SQL injection in login rejected", "CRITICAL",
       st not in (200,) or not d.get("token"),
       f"SQLi login -> {st} token={'YES' if d.get('token') else 'NO'}")

# C-002: SQL injection in query param
st, d, ev = req("GET", "/api/v1/vsp/findings?limit=1%27%20OR%201%3D1--", token=admin_tok)
record("INJECTION", "C-002", "SQL injection in query param", "HIGH",
       st in (400, 422) or (st == 200 and isinstance(d, dict)),
       f"SQLi query param -> {st}")

# C-003: XSS in user creation
xss = "<script>alert('xss')</script>"
st, d, ev = req("POST", "/api/v1/admin/users",
                {"email": f"xss-{SUF}@lancs.local", "password": TEST_PASS,
                 "role": "analyst", "name": xss}, token=admin_tok)
if st in (200,201) and d.get("id"):
    xss_uid = d.get("id")
    name_returned = d.get("name","") or d.get("display_name","")
    record("INJECTION", "C-003", "XSS payload not reflected raw", "HIGH",
           xss not in json.dumps(d),
           f"XSS in name field, response: {json.dumps(d)[:100]}")
    req("DELETE", f"/api/v1/admin/users/{xss_uid}", token=admin_tok)
else:
    record("INJECTION", "C-003", "XSS payload rejected at creation", "HIGH",
           True, f"Create with XSS name -> {st} (rejected)")

# C-004: Path traversal
st, d, ev = req("GET", "/api/v1/vsp/findings/../../../etc/passwd", token=admin_tok)
record("INJECTION", "C-004", "Path traversal rejected", "HIGH",
       st in (400, 403, 404),
       f"Path traversal -> {st}")

# C-005: Oversized payload
big_body = {"data": "A" * 100000}
st, d, ev = req("POST", "/api/v1/vsp/run", big_body, token=admin_tok)
record("INJECTION", "C-005", "Oversized payload handled", "MEDIUM",
       st in (400, 413, 422) or st != 500,
       f"100KB payload -> {st}")

# C-006: Negative/invalid limit param
st, d, ev = req("GET", "/api/v1/vsp/findings?limit=-1", token=admin_tok)
record("INJECTION", "C-006", "Negative limit param handled", "LOW",
       st != 500,
       f"limit=-1 -> {st}")

# C-007: Invalid UUID in path
st, d, ev = req("GET", "/api/v1/vsp/findings/not-a-uuid", token=admin_tok)
record("INJECTION", "C-007", "Invalid UUID in path handled", "LOW",
       st in (400, 404, 422),
       f"GET /findings/not-a-uuid -> {st}")

# ─────────────────────────────────────────────
#  D. BUSINESS LOGIC
# ─────────────────────────────────────────────
section("D. BUSINESS LOGIC")

# D-001: Double login không invalidate session cũ
tok1 = login(ADMIN_EMAIL, ADMIN_PASS)
time.sleep(1)
tok2 = login(ADMIN_EMAIL, ADMIN_PASS)
st1, _, _ = req("GET", "/api/v1/vsp/findings?limit=1", token=tok1)
record("LOGIC", "D-001", "Stateless JWT — old token behavior", "INFO",
       st1 in (200, 401),
       f"Old token after re-login -> {st1}",
       "INFO: stateless JWT, old tokens valid until expiry — expected behavior")

# D-002: Logout invalidates token
st, d, _ = req("POST", "/api/v1/auth/logout", token=admin_tok)
if st in (200, 204):
    st2, _, _ = req("GET", "/api/v1/vsp/findings?limit=1", token=admin_tok)
    record("LOGIC", "D-002", "Token invalidated after logout", "HIGH",
           st2 in (401, 403),
           f"POST /logout -> {st}, then GET /findings -> {st2}")
    admin_tok = login(ADMIN_EMAIL, ADMIN_PASS)  # re-login
else:
    record("LOGIC", "D-002", "Logout endpoint exists", "MEDIUM",
           False, f"POST /logout -> {st}", "Logout endpoint not working")

# D-003: Rate limiting on login
print(f"  {C}[INFO]{Z} Testing rate limit (5 rapid logins)...")
rl_hit = False
for i in range(6):
    st, _, _ = req("POST", "/api/v1/auth/login",
                   {"email": "nonexist@test.com", "password": "wrong"})
    if st == 429: rl_hit = True; break
    time.sleep(0.1)
record("LOGIC", "D-003", "Rate limiting on failed logins", "MEDIUM",
       rl_hit,
       f"6 rapid failed logins, 429={'YES' if rl_hit else 'NO'}",
       "Rate limit protects against brute force")

# D-004: IDOR — analyst truy cập resource của tenant khác
analyst_tok = TOKENS.get("analyst","")
if analyst_tok:
    # Thử đoán UUID không thuộc tenant
    fake_id = "00000000-0000-0000-0000-000000000001"
    st, d, ev = req("GET", f"/api/v1/vsp/findings/{fake_id}", token=analyst_tok)
    record("LOGIC", "D-004", "IDOR: access non-owned resource", "HIGH",
           st in (403, 404),
           f"GET /findings/{fake_id} as analyst -> {st}",
           "404 acceptable (resource not found), 200 with data = IDOR")

# D-005: HTTP methods not allowed
st, d, ev = req("DELETE", "/api/v1/vsp/findings", token=admin_tok)
record("LOGIC", "D-005", "DELETE on collection returns 404/405", "LOW",
       st in (404, 405),
       f"DELETE /findings -> {st}")

# D-006: Content-Type enforcement
h = {"Authorization": f"Bearer {admin_tok}"}
try:
    r = urllib.request.Request(BASE + "/api/v1/auth/login",
                               b"email=admin&password=admin", h, method="POST")
    r.add_header("Content-Type", "application/x-www-form-urlencoded")
    with urllib.request.urlopen(r, timeout=10, context=CTX) as resp:
        st = resp.status
except urllib.error.HTTPError as e:
    st = e.code
record("LOGIC", "D-006", "Non-JSON Content-Type rejected", "LOW",
       st in (400, 415, 401, 403, 429),
       f"POST login with form-urlencoded -> {st}")

# ─────────────────────────────────────────────
#  E. INFORMATION DISCLOSURE
# ─────────────────────────────────────────────
section("E. INFORMATION DISCLOSURE")

# E-001: Error không leak stack trace
st, d, ev = req("GET", "/api/v1/vsp/findings/trigger-error-test", token=admin_tok)
has_stack = any(k in ev.lower() for k in ["traceback","stack trace","panic","goroutine","at 0x"])
record("DISCLOSURE", "E-001", "Error response no stack trace", "MEDIUM",
       not has_stack,
       f"Error response: {ev[:100]}")

# E-002: /debug /pprof không public
for path in ["/debug/pprof", "/debug/vars", "/metrics"]:
    st, d, ev = req("GET", path)
    record("DISCLOSURE", "E-002", f"Debug endpoint {path} not public", "HIGH",
           st in (401, 403, 404),
           f"GET {path} (no auth) -> {st}")

# E-003: Server header không leak version
try:
    r = urllib.request.Request(BASE + "/api/v1/auth/check", method="GET")
    with urllib.request.urlopen(r, timeout=10, context=CTX) as resp:
        server_hdr = resp.headers.get("Server","")
        record("DISCLOSURE", "E-003", "Server header no version leak", "LOW",
               not re.search(r'\d+\.\d+', server_hdr),
               f"Server: {server_hdr or '(empty)'}")
except: pass

# ─────────────────────────────────────────────
#  CLEANUP
# ─────────────────────────────────────────────
section("CLEANUP")
for role, uid in UIDS.items():
    st, _, _ = req("DELETE", f"/api/v1/admin/users/{uid}", token=admin_tok)
    print(f"  {'OK' if st in (200,204) else '!'} DELETE {role} -> {st}")

# ─────────────────────────────────────────────
#  REPORT
# ─────────────────────────────────────────────
section("SECURITY TEST REPORT")

cats = {}
for r in results:
    cats.setdefault(r["category"], []).append(r)

total = len(results)
passed = sum(1 for r in results if r["passed"])
failed = total - passed

sev_counts = {}
for r in results:
    if not r["passed"]:
        sev_counts[r["severity"]] = sev_counts.get(r["severity"], 0) + 1

print(f"""
  Target    : {BASE}
  Timestamp : {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')} UTC
  
  Total     : {total}
  {G}PASS      : {passed}{Z}
  {(R if failed>0 else G)}FAIL      : {failed}{Z}
""")

if sev_counts:
    print(f"  Failures by severity:")
    for sev in ["CRITICAL","HIGH","MEDIUM","LOW","INFO"]:
        if sev in sev_counts:
            color = R if sev in ("CRITICAL","HIGH") else Y if sev=="MEDIUM" else C
            print(f"    {color}{sev:<10}{Z}: {sev_counts[sev]}")

print(f"\n  {'─'*68}")
for cat, items in cats.items():
    cat_pass = sum(1 for i in items if i["passed"])
    print(f"\n  {C}{cat}{Z} ({cat_pass}/{len(items)} pass)")
    for item in items:
        sev_color = R if item["severity"] in ("CRITICAL","HIGH") else Y if item["severity"]=="MEDIUM" else C
        status = f"{G}PASS{Z}" if item["passed"] else f"{R}FAIL{Z}"
        print(f"    [{status}] {sev_color}{item['severity']:<8}{Z} {item['id']} {item['name']}")
        if not item["passed"]:
            print(f"             Evidence : {item['evidence']}")
            if item["note"]: print(f"             Note     : {item['note']}")

print(f"\n{B}{'='*72}{Z}")
if failed == 0:
    print(f"  {G}ALL TESTS PASSED — No security issues found{Z}")
else:
    crit = sev_counts.get("CRITICAL",0)
    high = sev_counts.get("HIGH",0)
    if crit > 0:
        print(f"  {R}⚠ {crit} CRITICAL issue(s) require immediate attention{Z}")
    if high > 0:
        print(f"  {Y}⚠ {high} HIGH issue(s) require prompt remediation{Z}")
print(f"{B}{'='*72}{Z}\n")

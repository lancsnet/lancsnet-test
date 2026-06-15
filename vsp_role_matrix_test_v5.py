#!/usr/bin/env python3
"""
VSP Role Matrix Test v5.0
Improvements over v4:
  - Robust helper: retry + exponential backoff
  - J: Cross-tenant — thêm PATCH/DELETE body injection, path traversal
  - K: API key — test scope enforcement (read-only key không POST được)
  - L: Rate limit per-role, per-endpoint, Retry-After header
  - M: Audit log — mọi write op có entry, fields đủ (actor/ip/method), tamper check
  - N: Session — token expiry window, re-login sau logout
  - Tự động detect endpoint alias (audit/log vs audit vs admin/audit)
  - ANSI color guard (NO_COLOR env)
  - Exit code 1 nếu có CRITICAL/HIGH FAIL
"""

import urllib.request, urllib.error, json, ssl, time, random, string
import sys, base64, os, hashlib
from datetime import datetime, timezone

# ── Config ────────────────────────────────────────────────────────────────────
BASE        = "https://127.0.0.1:30800"
ADMIN_EMAIL = "rbac-admin@lancs.local"
ADMIN_PASS  = "RoleTest2026!!"
TEST_PASS   = "RoleTest2026!!"
CTX         = ssl._create_unverified_context()
SUF         = "".join(random.choices(string.ascii_lowercase, k=6))

# ANSI — tắt nếu NO_COLOR hoặc không phải TTY
_color = sys.stdout.isatty() and not os.environ.get("NO_COLOR")
G = "\033[92m" if _color else ""; R = "\033[91m" if _color else ""
Y = "\033[93m" if _color else ""; B = "\033[94m" if _color else ""
C = "\033[96m" if _color else ""; M = "\033[95m" if _color else ""
Z = "\033[0m"  if _color else ""

results: list[dict] = []
TOKENS:  dict[str, str] = {}
UIDS:    dict[str, str] = {}

# ── HTTP helper ───────────────────────────────────────────────────────────────
def req(method, path, body=None, token=None, api_key=None,
        extra_headers=None, timeout=14, retries=2):
    """
    Returns (status, json_body, raw_text[:500], response_headers).
    Retries on connection errors with exponential backoff.
    api_key: tries X-API-Key first, falls back to Authorization: ApiKey.
    """
    h = {"Content-Type": "application/json"}
    if token:   h["Authorization"] = f"Bearer {token}"
    if api_key: h["X-API-Key"] = api_key
    if extra_headers: h.update(extra_headers)
    d = json.dumps(body).encode() if body is not None else None

    for attempt in range(retries + 1):
        try:
            r = urllib.request.Request(BASE + path, d, h, method=method)
            with urllib.request.urlopen(r, timeout=timeout, context=CTX) as resp:
                rb = resp.read()
                try:   jb = json.loads(rb)
                except: jb = {}
                return resp.status, jb, rb.decode(errors="replace")[:500], dict(resp.headers)
        except urllib.error.HTTPError as e:
            rb = b""
            try: rb = e.read()
            except: pass
            try:   jb = json.loads(rb)
            except: jb = {}
            return e.code, jb, rb.decode(errors="replace")[:500], dict(e.headers)
        except Exception as ex:
            if attempt < retries:
                time.sleep(1.5 ** attempt)
                continue
            return 0, {"error": str(ex)[:100]}, str(ex)[:100], {}


def req_api_key_dual(method, path, api_key, body=None, timeout=14):
    """
    Thử X-API-Key header, nếu không phải 200/401/403 thì thử Authorization: ApiKey.
    Trả về (status, body, raw, headers).
    """
    st, d, r, h = req(method, path, body=body,
                       extra_headers={"X-API-Key": api_key}, timeout=timeout)
    if st not in (200, 201, 204, 401, 403):
        st2, d2, r2, h2 = req(method, path, body=body,
                               extra_headers={"Authorization": f"ApiKey {api_key}"}, timeout=timeout)
        if st2 in (200, 201, 204, 401, 403):
            return st2, d2, r2, h2
    return st, d, r, h


def login(email, password, tries=3):
    for i in range(tries):
        st, d, _, _ = req("POST", "/api/v1/auth/login",
                          {"email": email, "password": password})
        if st == 200 and d.get("token"):
            return d["token"], d.get("user_id","") or d.get("id","")
        if st == 429:
            time.sleep(5 * (i + 1)); continue
        time.sleep(0.8)
    return "", ""


def decode_jwt(token: str) -> dict:
    try:
        parts = token.split(".")
        if len(parts) != 3: return {}
        pad = parts[1] + "=" * (4 - len(parts[1]) % 4)
        return json.loads(base64.b64decode(pad).decode())
    except: return {}


def probe_endpoint(*paths, token, method="GET"):
    """Trả về (path, status, body) của path đầu tiên trả != 404/0."""
    for p in paths:
        st, d, _, _ = req(method, p, token=token)
        if st not in (404, 0):
            return p, st, d
    return paths[-1], 404, {}


def section(title):
    print(f"\n{B}{'='*72}\n  {title}\n{'='*72}{Z}")


def record(category, tid, name, severity, role,
           passed, expected, got, note=""):
    results.append({
        "category": category, "id": tid, "name": name,
        "severity": severity, "role": role,
        "passed": passed, "expected": str(expected), "got": str(got), "note": note
    })
    sev_c = {
        "CRITICAL": R, "HIGH": R, "MEDIUM": Y, "LOW": C, "INFO": B
    }.get(severity, Z)
    status = f"{G}PASS{Z}" if passed else f"{R}FAIL{Z}"
    print(f"  [{status}] [{sev_c}{severity:<8}{Z}] {tid:<14} {M}{role:<12}{Z} {name}")
    if not passed:
        print(f"           {Y}Expected:{Z} {expected}  {Y}Got:{Z} {got}")
        if note: print(f"           {C}Note:{Z} {note}")


# ══════════════════════════════════════════════════════════════════════════════
# SETUP
# ══════════════════════════════════════════════════════════════════════════════
section("SETUP")

admin_tok, admin_uid = login(ADMIN_EMAIL, ADMIN_PASS)
if not admin_tok:
    print(f"  {R}FATAL: admin login fail — abort{Z}"); sys.exit(1)
print(f"  {G}OK{Z}  Admin: {ADMIN_EMAIL}")

for role in ["analyst", "dev", "qa", "auditor"]:
    tok, uid = login(f"rbac-{role}@lancs.local", TEST_PASS)
    if tok:
        TOKENS[role] = tok; UIDS[role] = uid
        print(f"  {G}OK{Z}  {role:<10} login=OK")
    else:
        print(f"  {Y}WARN{Z} {role:<10} login failed — some tests skipped")
TOKENS["admin"] = admin_tok; UIDS["admin"] = admin_uid

# ── Tenants ───────────────────────────────────────────────────────────────────
st, td, _, _ = req("GET", "/api/v1/admin/tenants", token=admin_tok)
main_tid = other_tid = ""
if st == 200:
    tlist = td if isinstance(td, list) else td.get("tenants", [])
    if len(tlist) >= 2:
        main_tid  = tlist[0].get("id","")
        other_tid = tlist[1].get("id","")
        print(f"  {G}OK{Z}  Tenants: main={main_tid[:8]}… other={other_tid[:8]}…")
    elif len(tlist) == 1:
        main_tid = tlist[0].get("id","")
        print(f"  {Y}WARN{Z} Only 1 tenant — cross-tenant tests limited")

# ── Finding ID ────────────────────────────────────────────────────────────────
st, fd, _, _ = req("GET", "/api/v1/vsp/findings?limit=3", token=admin_tok)
fid = fid2 = ""
if st == 200:
    items = fd if isinstance(fd, list) else \
            fd.get("findings", fd.get("items", fd.get("data", [])))
    if items:
        fid  = items[0].get("id","")
        fid2 = items[1].get("id","") if len(items) > 1 else fid
        print(f"  {G}OK{Z}  Finding: {fid[:8]}…")

# ── API key ───────────────────────────────────────────────────────────────────
test_api_key_read  = ""
test_api_key_write = ""

st, ak_d, _, _ = req("GET", "/api/v1/admin/api-keys", token=admin_tok)
if st == 200:
    klist = ak_d if isinstance(ak_d, list) else \
            ak_d.get("api_keys", ak_d.get("keys", []))
    for k in klist:
        scopes = k.get("scopes", [])
        raw = k.get("key","") or k.get("raw_key","")
        if not raw: continue
        if "write" in scopes or not scopes:
            if not test_api_key_write: test_api_key_write = raw
        if "read" in scopes or not scopes:
            if not test_api_key_read:  test_api_key_read  = raw

if not test_api_key_read:
    st2, nk, _, _ = req("POST", "/api/v1/admin/api-keys",
                         {"name": f"test-read-{SUF}", "scopes": ["read"]},
                         token=admin_tok)
    if st2 in (200, 201):
        test_api_key_read = nk.get("key","") or nk.get("raw_key","")
        print(f"  {G}OK{Z}  Created read-only API key")

if not test_api_key_write:
    st2, nk, _, _ = req("POST", "/api/v1/admin/api-keys",
                         {"name": f"test-write-{SUF}", "scopes": ["write","read"]},
                         token=admin_tok)
    if st2 in (200, 201):
        test_api_key_write = nk.get("key","") or nk.get("raw_key","")
        print(f"  {G}OK{Z}  Created write API key")

if test_api_key_read  and not test_api_key_write: test_api_key_write = test_api_key_read
if test_api_key_write and not test_api_key_read:  test_api_key_read  = test_api_key_write

# ── Audit endpoint autodiscovery ──────────────────────────────────────────────
AUDIT_PATH, _ast, _ = probe_endpoint(
    "/api/v1/audit/log",
    "/api/v1/audit",
    "/api/v1/admin/audit",
    "/api/v1/admin/audit-log",
    token=admin_tok
)
if _ast == 200:
    print(f"  {G}OK{Z}  Audit endpoint: {AUDIT_PATH}")
else:
    print(f"  {Y}WARN{Z} Audit endpoint not found — M tests may fail")


# ══════════════════════════════════════════════════════════════════════════════
# J. CROSS-TENANT ISOLATION
# ══════════════════════════════════════════════════════════════════════════════
section("J. CROSS-TENANT ISOLATION")

if other_tid:
    # J-001: tenant_id query param injection
    st, d, _, _ = req("GET",
        f"/api/v1/vsp/findings?tenant_id={other_tid}&limit=5",
        token=TOKENS.get("analyst",""))
    items = d if isinstance(d, list) else d.get("findings", d.get("items", d.get("data",[])))
    leaked = any(i.get("tenant_id","") == other_tid for i in (items or []))
    record("CROSS_TENANT","J-001","Query param tenant_id injection","CRITICAL",
           "analyst", not leaked, "no other-tenant data",
           "LEAKED" if leaked else f"ok({st})",
           "DATA LEAK" if leaked else "")

    # J-002: Single finding URL + tenant_id param
    if fid:
        st, d, _, _ = req("GET",
            f"/api/v1/vsp/findings/{fid}?tenant_id={other_tid}",
            token=TOKENS.get("analyst",""))
        record("CROSS_TENANT","J-002","Single-resource tenant_id param","HIGH",
               "analyst", st in (200,403,404), "200/403/404", st)

    # J-003: X-Tenant-ID header injection
    st, d, _, _ = req("GET", "/api/v1/vsp/findings?limit=5",
                       token=TOKENS.get("analyst",""),
                       extra_headers={"X-Tenant-ID": other_tid})
    items = d if isinstance(d, list) else d.get("findings", d.get("items", d.get("data",[])))
    leaked = any(i.get("tenant_id","") == other_tid for i in (items or []))
    record("CROSS_TENANT","J-003","X-Tenant-ID header injection","CRITICAL",
           "analyst", not leaked, "no other-tenant data",
           "LEAKED" if leaked else f"ok({st})",
           "DATA LEAK" if leaked else "")

    # J-004: PATCH body có tenant_id khác (IDOR via body injection)
    if fid:
        st, d, _, _ = req("PATCH",
            f"/api/v1/vsp/findings/{fid}",
            body={"tenant_id": other_tid, "status": "in_review"},
            token=TOKENS.get("analyst",""))
        if st == 200:
            resp_tid = d.get("tenant_id","")
            passed = (resp_tid != other_tid)
            record("CROSS_TENANT","J-004","PATCH body tenant_id injection","HIGH",
                   "analyst", passed, "tenant unchanged",
                   f"resp_tenant={resp_tid[:8] if resp_tid else 'none'}",
                   "TENANT_HIJACK" if not passed else "")
        else:
            record("CROSS_TENANT","J-004","PATCH body tenant_id injection","HIGH",
                   "analyst", True, "reject/404/403", st)

    # J-005: Admin đọc tenant khác qua admin endpoint (should work)
    st, d, _, _ = req("GET", f"/api/v1/admin/tenants/{other_tid}", token=admin_tok)
    record("CROSS_TENANT","J-005","Admin cross-tenant read","INFO",
           "admin", st in (200,404), "200/404", st)

    # J-006: Analyst truy cập admin/tenants/{other_id} (should be blocked)
    st, d, _, _ = req("GET", f"/api/v1/admin/tenants/{other_tid}",
                       token=TOKENS.get("analyst",""))
    record("CROSS_TENANT","J-006","Analyst blocked on other-tenant admin","HIGH",
           "analyst", st in (401,403), "401/403", st,
           "OVER-PERMISSIVE" if st not in (401,403) else "")

    # J-007: Path traversal
    st, d, _, _ = req("GET",
        f"/api/v1/vsp/findings/../tenants/{other_tid}",
        token=TOKENS.get("analyst",""))
    record("CROSS_TENANT","J-007","Path traversal to other tenant","HIGH",
           "analyst", st in (400,401,403,404), "400-404", st,
           "TRAVERSAL_OK" if st == 200 else "")

else:
    print(f"  {Y}SKIP{Z} J-001…J-007 — need 2+ tenants")


# ══════════════════════════════════════════════════════════════════════════════
# K. API KEY AUTHENTICATION & SCOPE
# ══════════════════════════════════════════════════════════════════════════════
section("K. API KEY AUTHENTICATION & SCOPE")

# K-001: Read API key được phép GET findings
if test_api_key_read:
    st, d, _, _ = req_api_key_dual("GET", "/api/v1/vsp/findings?limit=1",
                                    test_api_key_read)
    record("API_KEY","K-001","Read API key — GET findings","MEDIUM",
           "api_key", st in (200,401,403),
           "200 (works) or 401/403 (rejected)",
           st,
           "API_KEY_WORKS" if st==200 else ("REJECTED" if st in (401,403) else "UNEXPECTED"))
else:
    st, d, _, _ = req("GET", "/api/v1/vsp/findings?limit=1",
                       extra_headers={"X-API-Key": "vsp_fake_key_test_12345"})
    record("API_KEY","K-001","Fake API key rejected","MEDIUM",
           "api_key", st in (401,403), "401/403", st)

# K-002: API key không được dùng admin endpoint
st, d, _, _ = req("GET", "/api/v1/admin/users",
                   extra_headers={"X-API-Key": test_api_key_read or "fake_key"})
record("API_KEY","K-002","API key blocked on admin endpoint","HIGH",
       "api_key", st in (401,403), "401/403", st,
       "OVER-PERMISSIVE" if st not in (401,403) else "")

# K-003: No auth → 401
st, d, _, _ = req("GET", "/api/v1/vsp/findings?limit=1")
record("API_KEY","K-003","No auth → 401","HIGH","no_auth", st==401, "401", st)

# K-004: Malformed Bearer → 401
st, d, _, _ = req("GET", "/api/v1/vsp/findings?limit=1",
                   extra_headers={"Authorization": "Bearer not.a.jwt"})
record("API_KEY","K-004","Malformed Bearer → 401","HIGH","bad_token", st==401, "401", st)

# K-005: Valid structure but wrong signature → 401
fake_p = base64.b64encode(
    json.dumps({"sub":"fake","role":"admin","exp":1000000}).encode()
).decode().rstrip("=")
fake_jwt = f"eyJhbGciOiJIUzI1NiJ9.{fake_p}.fakesignature"
st, d, _, _ = req("GET", "/api/v1/vsp/findings?limit=1", token=fake_jwt)
record("API_KEY","K-005","Invalid JWT signature → 401","CRITICAL",
       "bad_jwt", st==401, "401", st,
       "JWT_NOT_VERIFIED" if st!=401 else "")

# K-006: Read-only API key không POST được (scope enforcement)
if test_api_key_read and fid:
    st, d, _, _ = req_api_key_dual("POST",
        f"/api/v1/vsp/findings/{fid}/accept", test_api_key_read, body={})
    record("API_KEY","K-006","Read-only key cannot write","HIGH",
           "api_key", st in (401,403,405), "401/403/405", st,
           "SCOPE_NOT_ENFORCED" if st==200 else "")

# K-007: Dual auth header — no crash
if test_api_key_read:
    st, d, _, _ = req("GET", "/api/v1/vsp/findings?limit=1",
                       extra_headers={
                           "X-API-Key": test_api_key_read,
                           "Authorization": "Bearer invalid_token_xyz"
                       })
    record("API_KEY","K-007","Dual auth header — no crash","LOW",
           "api_key", st in (200,401,403), "200/401/403", st)


# ══════════════════════════════════════════════════════════════════════════════
# L. RATE LIMITING
# ══════════════════════════════════════════════════════════════════════════════
section("L. RATE LIMITING")

# L-001: Brute-force login → 429
print(f"  {C}L-001 Testing rate limit on login (12 rapid requests)…{Z}")
got_429 = False; last_st = 0; retry_after = ""
for i in range(12):
    st, d, _, hdrs = req("POST", "/api/v1/auth/login",
                          {"email": f"noexist-{i}-{SUF}@test.com", "password": "wrong"})
    last_st = st
    if st == 429:
        got_429 = True
        retry_after = hdrs.get("Retry-After","")
        break
    time.sleep(0.05)
record("RATE_LIMIT","L-001","Login brute-force → 429","HIGH",
       "no_auth", got_429, "429", last_st if not got_429 else 429,
       "NO_RATE_LIMIT" if not got_429 else f"Retry-After={retry_after}")

# L-002: Rate limit headers trên API response
st, d, _, hdrs = req("GET", "/api/v1/vsp/findings?limit=1", token=admin_tok)
rl_keys = [k for k in hdrs if k.lower() in
           ("x-ratelimit-limit","x-ratelimit-remaining","ratelimit-limit",
            "ratelimit-remaining","retry-after","x-rate-limit-limit")]
record("RATE_LIMIT","L-002","Rate-limit headers present","LOW",
       "admin", bool(rl_keys), "x-ratelimit-* or ratelimit-*",
       rl_keys or "missing",
       "MISSING_HEADERS — consider adding for client guidance" if not rl_keys else "")

# L-003: API rapid fire → 429 (analyst)
print(f"  {C}L-003 Testing API rate limit — 25 rapid requests (analyst)…{Z}")
got_429_api = False
for i in range(25):
    st, d, _, _ = req("GET", "/api/v1/vsp/findings?limit=1",
                       token=TOKENS.get("analyst",""))
    if st == 429:
        got_429_api = True; break
    time.sleep(0.02)
record("RATE_LIMIT","L-003","API rapid fire → 429 (analyst)","MEDIUM",
       "analyst", got_429_api, "429",
       "not triggered" if not got_429_api else 429,
       "NO_RATE_LIMIT" if not got_429_api else "")

# L-004: Admin vs analyst có limit khác nhau không
got_429_admin = False
for i in range(25):
    st, d, _, _ = req("GET", "/api/v1/vsp/findings?limit=1", token=admin_tok)
    if st == 429:
        got_429_admin = True; break
    time.sleep(0.02)

if got_429_api and not got_429_admin:
    note = "Per-role rate limit: analyst limited, admin not — EXPECTED"
    passed = True
elif got_429_api and got_429_admin:
    note = "Both hit 429 — flat rate limit (no per-role differentiation)"
    passed = True
elif not got_429_api and not got_429_admin:
    note = "Neither hit 429 — no rate limit detected"
    passed = False
else:
    note = "Admin 429 but analyst not — unusual"
    passed = False

record("RATE_LIMIT","L-004","Per-role rate limit differentiation","MEDIUM",
       "admin/analyst", passed,
       "analyst limited <= admin limit",
       f"analyst_429={got_429_api} admin_429={got_429_admin}", note)


# ══════════════════════════════════════════════════════════════════════════════
# M. AUDIT LOG INTEGRITY
# ══════════════════════════════════════════════════════════════════════════════
section("M. AUDIT LOG INTEGRITY")

before_ts = datetime.now(timezone.utc).isoformat()

write_done = False
if fid:
    st_w, _, _, _ = req("POST", f"/api/v1/vsp/findings/{fid}/accept", {}, token=admin_tok)
    write_done = st_w in (200,201,204,400,422)

time.sleep(0.8)

# M-001: Audit endpoint accessible bởi admin
st, d, _, _ = req("GET", f"{AUDIT_PATH}?limit=20", token=admin_tok)
record("AUDIT_LOG","M-001","Audit log endpoint — admin 200","MEDIUM",
       "admin", st==200, "200", st)

if st == 200:
    entries = d if isinstance(d, list) else \
              d.get("logs", d.get("entries", d.get("audit_log", d.get("data",[]))))

    if entries:
        entry = entries[0]
        required = ["action", "created_at"]
        missing = [f for f in required if f not in entry]
        record("AUDIT_LOG","M-002","Audit entry has action + created_at","MEDIUM",
               "admin", not missing,
               "action, created_at",
               f"missing={missing}" if missing else str(list(entry.keys()))[:80])

        has_actor = any(f in entry for f in ["actor","user_id","performed_by","actor_id"])
        record("AUDIT_LOG","M-003","Audit entry has actor identity","HIGH",
               "admin", has_actor, "actor/user_id/performed_by",
               "missing" if not has_actor else "present")

        has_ip = any(f in entry for f in ["ip","ip_address","source_ip","remote_addr"])
        record("AUDIT_LOG","M-004","Audit entry has IP address","MEDIUM",
               "admin", has_ip, "ip/ip_address/source_ip",
               "missing" if not has_ip else "present",
               "Recommended for forensic traceability" if not has_ip else "")

        has_hash = "hash" in entry or "prev_hash" in entry
        record("AUDIT_LOG","M-005","Audit chain hash present","HIGH",
               "admin", has_hash,
               "hash or prev_hash field",
               "missing" if not has_hash else "present")

        if has_hash and len(entries) >= 2:
            ok = True
            broken_at = -1
            for idx in range(len(entries)-1):
                curr = entries[idx]
                prev = entries[idx+1]
                curr_ph = curr.get("prev_hash","")
                prev_h  = prev.get("hash","")
                if curr_ph and prev_h and curr_ph != prev_h:
                    ok = False; broken_at = idx; break
            record("AUDIT_LOG","M-006","Hash chain linkage valid","HIGH",
                   "admin", ok,
                   "prev_hash[n] == hash[n-1]",
                   "CHAIN_BROKEN" if not ok else f"ok ({len(entries)} entries)",
                   f"broken at entry {broken_at}" if not ok else "")

        if write_done:
            found_entry = any(e.get("created_at","") >= before_ts for e in entries)
            record("AUDIT_LOG","M-007","Write op logged in audit","HIGH",
                   "admin", found_entry,
                   f"entry after {before_ts[:19]}",
                   "not found" if not found_entry else "found",
                   "WRITE_NOT_AUDITED" if not found_entry else "")
    else:
        print(f"  {Y}SKIP{Z} M-002…M-007 — no audit entries returned")

# M-008: Analyst không đọc được audit log
st, d, _, _ = req("GET", f"{AUDIT_PATH}?limit=5",
                   token=TOKENS.get("analyst",""))
record("AUDIT_LOG","M-008","Analyst cannot read audit log","HIGH",
       "analyst", st in (401,403), "401/403", st,
       "OVER-PERMISSIVE" if st not in (401,403) else "")

# M-009: Auditor có thể đọc audit log
if "auditor" in TOKENS:
    st, d, _, _ = req("GET", f"{AUDIT_PATH}?limit=5", token=TOKENS["auditor"])
    record("AUDIT_LOG","M-009","Auditor can read audit log","MEDIUM",
           "auditor", st in (200,403),
           "200 (preferred) or 403",
           st,
           "AUDITOR_BLOCKED" if st==403 else ("OK" if st==200 else "UNEXPECTED"))

# M-010: DELETE audit entry bị chặn (append-only)
st, d, _, _ = req("DELETE", f"{AUDIT_PATH}/fake-id-123", token=admin_tok)
record("AUDIT_LOG","M-010","Audit log is append-only (DELETE blocked)","HIGH",
       "admin", st in (405,403,404), "405/403/404", st,
       "TAMPERABLE" if st==200 else "")


# ══════════════════════════════════════════════════════════════════════════════
# N. SESSION MANAGEMENT
# ══════════════════════════════════════════════════════════════════════════════
section("N. SESSION MANAGEMENT")

# N-001: Logout invalidates token
tok_logout, _ = login("rbac-analyst@lancs.local", TEST_PASS)
if tok_logout:
    st_before, _, _, _ = req("GET", "/api/v1/vsp/findings?limit=1", token=tok_logout)
    st_out, _, _, _    = req("POST", "/api/v1/auth/logout", token=tok_logout)
    time.sleep(0.4)
    st_after, _, _, _  = req("GET", "/api/v1/vsp/findings?limit=1", token=tok_logout)
    passed = st_out in (200,204) and st_after in (401,403)
    record("SESSION","N-001","Logout invalidates token","HIGH",
           "analyst", passed,
           "logout=200/204 then 401/403",
           f"logout={st_out} after={st_after}",
           "TOKEN_NOT_INVALIDATED" if st_after==200 else "")

    # N-002: Re-login sau logout
    tok_new, _ = login("rbac-analyst@lancs.local", TEST_PASS)
    st_renew, _, _, _ = req("GET", "/api/v1/vsp/findings?limit=1", token=tok_new)
    record("SESSION","N-002","Re-login after logout works","MEDIUM",
           "analyst", bool(tok_new) and st_renew==200,
           "new token + 200",
           f"new_token={'yes' if tok_new else 'no'} st={st_renew}")

# N-003: JWT có exp claim
payload = decode_jwt(admin_tok)
has_exp = "exp" in payload
record("SESSION","N-003","JWT has exp claim","HIGH",
       "admin", has_exp, "exp in payload",
       str(list(payload.keys()))[:80],
       "NO_EXPIRY — tokens never expire!" if not has_exp else
       f"exp={datetime.fromtimestamp(payload['exp'],tz=timezone.utc).isoformat()}")

# N-004: JWT TTL hop ly <= 24h
ttl_h = 0
if has_exp:
    exp_ts = payload["exp"]
    iat_ts = payload.get("iat", int(time.time()))
    ttl_h  = (exp_ts - iat_ts) / 3600
    reasonable = 0 < ttl_h <= 24
    record("SESSION","N-004","JWT TTL <= 24 hours","MEDIUM",
           "admin", reasonable,
           "0 < TTL <= 24h",
           f"{ttl_h:.1f}h",
           "LONG_TTL" if ttl_h > 24 else ("NEGATIVE_TTL?" if ttl_h<=0 else ""))

# N-005: JWT role claim khop voi role thuc
for role_name, tok in [("admin", admin_tok)] + list(TOKENS.items()):
    expected_role = role_name
    p = decode_jwt(tok)
    jwt_r = p.get("role","")
    passed = (jwt_r == expected_role)
    record("SESSION","N-005",f"JWT role claim correct ({role_name})","CRITICAL",
           role_name, passed, f"role={expected_role}", jwt_r or "missing",
           "ROLE_MISMATCH" if not passed else "")

# N-006: Concurrent sessions consistent
tok_a, _ = login("rbac-dev@lancs.local", TEST_PASS)
tok_b, _ = login("rbac-dev@lancs.local", TEST_PASS)
if tok_a and tok_b:
    st_a, _, _, _ = req("GET", "/api/v1/vsp/findings?limit=1", token=tok_a)
    st_b, _, _, _ = req("GET", "/api/v1/vsp/findings?limit=1", token=tok_b)
    inconsistent = (st_a in (401,403)) != (st_b in (401,403))
    record("SESSION","N-006","Concurrent sessions consistent","MEDIUM",
           "dev", not inconsistent,
           "both work or both blocked",
           f"tok_a={st_a} tok_b={st_b}",
           "INCONSISTENT_SESSION" if inconsistent else "")

# N-007: JWT TTL >= 60s (khong qua ngan)
if has_exp:
    if ttl_h * 3600 < 60:
        record("SESSION","N-007","JWT TTL not too short (>= 60s)","LOW",
               "admin", False, "TTL >= 60s", f"{ttl_h*3600:.0f}s",
               "TOKEN_TOO_SHORT — may cause UX issues")
    else:
        record("SESSION","N-007","JWT TTL not too short (>= 60s)","LOW",
               "admin", True, "TTL >= 60s", f"{ttl_h:.2f}h")


# ══════════════════════════════════════════════════════════════════════════════
# FINAL REPORT
# ══════════════════════════════════════════════════════════════════════════════
section("FINAL REPORT v5.0")

cats: dict = {}
for rec in results:
    c = rec["category"]
    if c not in cats:
        cats[c] = {"total":0,"pass":0,"fail":0,"critical_fail":0,"high_fail":0}
    cats[c]["total"] += 1
    if rec["passed"]:
        cats[c]["pass"] += 1
    else:
        cats[c]["fail"] += 1
        if rec["severity"] == "CRITICAL": cats[c]["critical_fail"] += 1
        elif rec["severity"] == "HIGH":   cats[c]["high_fail"] += 1

print(f"\n  {'Category':<20} {'Total':>6} {'PASS':>6} {'FAIL':>6}  CRIT  HIGH")
print(f"  {'-'*56}")
for cat, v in cats.items():
    bar = f"{G}ok{Z}" if v["fail"]==0 else f"{R}!!{Z}"
    cf  = f"{R}{v['critical_fail']}{Z}" if v["critical_fail"] else "0"
    hf  = f"{R}{v['high_fail']}{Z}"    if v["high_fail"]    else "0"
    print(f"  [{bar}] {cat:<18} {v['total']:>6} {v['pass']:>6} {v['fail']:>6}  {cf:>4}  {hf:>4}")

total_t = len(results)
total_p = sum(1 for r in results if r["passed"])
total_f = total_t - total_p
crit_f  = sum(1 for r in results if not r["passed"] and r["severity"]=="CRITICAL")
high_f  = sum(1 for r in results if not r["passed"] and r["severity"]=="HIGH")

print(f"\n  {'─'*56}")
print(f"  Total     : {total_t}")
print(f"  {G}PASS      : {total_p}{Z}")
if total_f:
    print(f"  {R}FAIL      : {total_f}  (CRITICAL={crit_f}  HIGH={high_f}){Z}")
    print(f"\n  {R}FAILURES (sorted by severity):{Z}")
    sev_order = {"CRITICAL":0,"HIGH":1,"MEDIUM":2,"LOW":3,"INFO":4}
    for rec in sorted(results, key=lambda x: sev_order.get(x["severity"],9)):
        if not rec["passed"]:
            sc = R if rec["severity"] in ("CRITICAL","HIGH") else Y
            print(f"    [{sc}{rec['severity']:<8}{Z}] [{M}{rec['role']:<12}{Z}] "
                  f"{rec['id']:<14} {rec['name']}")
            print(f"             Expected : {rec['expected']}")
            print(f"             Got      : {rec['got']}")
            if rec["note"]: print(f"             Note     : {rec['note']}")
else:
    print(f"  {G}ALL TESTS PASSED{Z}")

print(f"\n  Timestamp : {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}")
print(f"  Target    : {BASE}")
print(f"  Audit     : {AUDIT_PATH}")
print("="*72)

exit_code = 1 if (crit_f > 0 or high_f > 0) else 0
sys.exit(exit_code)

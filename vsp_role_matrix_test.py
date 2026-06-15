#!/usr/bin/env python3
"""
VSP Role Matrix Test v3.0
Deep per-role testing: mỗi role được test toàn bộ endpoint matrix
Categories: Auth, RBAC, IDOR, Privilege Escalation, Data Access, Write Operations
"""
import urllib.request, urllib.error, json, ssl, time, random, string, sys
from datetime import datetime, timezone

BASE        = "https://127.0.0.1:30800"
ADMIN_EMAIL = "rbac-admin@lancs.local"
ADMIN_PASS  = "RoleTest2026!!"
TEST_PASS   = "RoleTest2026!!"
CTX         = ssl._create_unverified_context()

G="\033[92m"; R="\033[91m"; Y="\033[93m"; B="\033[94m"; C="\033[96m"; M="\033[95m"; Z="\033[0m"
SUF = "".join(random.choices(string.ascii_lowercase, k=6))

ALL_ROLES = ["admin", "analyst", "dev", "qa", "auditor"]
results   = []
TOKENS    = {}
UIDS      = {}
SEED      = {}   # seeded resource IDs

# ─────────────────────────────────────────────
def req(method, path, body=None, token=None, timeout=12):
    h = {"Content-Type": "application/json"}
    if token: h["Authorization"] = f"Bearer {token}"
    d = json.dumps(body).encode() if body is not None else None
    try:
        r = urllib.request.Request(BASE + path, d, h, method=method)
        with urllib.request.urlopen(r, timeout=timeout, context=CTX) as resp:
            try: rb = resp.read(); return resp.status, json.loads(rb), rb.decode()[:300]
            except: return resp.status, {}, ""
    except urllib.error.HTTPError as e:
        try: rb = e.read(); return e.code, json.loads(rb), rb.decode()[:300]
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

def record(category, tid, name, severity, role, passed, expected, got, note=""):
    results.append({
        "category": category, "id": tid, "name": name,
        "severity": severity, "role": role,
        "passed": passed, "expected": expected, "got": got, "note": note
    })
    sev_color = {
        "CRITICAL": R, "HIGH": R, "MEDIUM": Y, "LOW": C, "INFO": B
    }.get(severity, Z)
    status = f"{G}PASS{Z}" if passed else f"{R}FAIL{Z}"
    role_c = f"{M}{role:<8}{Z}"
    print(f"  [{status}] [{sev_color}{severity:<8}{Z}] {tid:<12} {role_c} {name}")
    if not passed:
        print(f"           {Y}Expected:{Z} {expected}  {Y}Got:{Z} {got}")
        if note: print(f"           {C}Note:{Z} {note}")

def section(title):
    print(f"\n{B}{'='*72}\n  {title}\n{'='*72}{Z}")

def check_allow(st):
    """Role có quyền: expect NOT 401/403"""
    return st not in (401, 403)

def check_deny(st):
    """Role không có quyền: expect 403 hoặc 404/405 (endpoint chưa implement)"""
    return st in (403, 404, 405)

# ─────────────────────────────────────────────
#  SETUP
# ─────────────────────────────────────────────
section("SETUP — Tạo accounts + seed data")

admin_tok = login(ADMIN_EMAIL, ADMIN_PASS)
if not admin_tok:
    print(f"{R}FATAL: admin login fail{Z}"); sys.exit(1)
print(f"  {G}OK{Z}  Admin: {ADMIN_EMAIL}")
TOKENS["admin"] = admin_tok

for role in ["analyst","dev","qa","auditor"]:
    email = f"roletest-{role}-{SUF}@lancs.local"
    st, d, _ = req("POST", "/api/v1/admin/users",
                   {"email": email, "password": TEST_PASS, "role": role},
                   token=admin_tok)
    uid = d.get("id","") if isinstance(d,dict) else ""
    if st in (200,201) and uid:
        UIDS[role] = uid
        tok = login(email, TEST_PASS)
        TOKENS[role] = tok
        print(f"  {G}OK{Z}  {role:<8} uid={uid[:8]}... login={'OK' if tok else 'FAIL'}")
    else:
        print(f"  {Y}WARN{Z} {role:<8} create st={st}")
    time.sleep(0.5)

# Seed: tạo 1 finding/run để test read/write
st, d, _ = req("POST", "/api/v1/vsp/run", {}, token=admin_tok)
SEED["run_id"] = d.get("id","") if isinstance(d,dict) else ""

st, d, _ = req("GET", "/api/v1/vsp/findings?limit=1", token=admin_tok)
if isinstance(d,dict):
    items = d.get("findings", d.get("items", d.get("data",[])))
    if items: SEED["finding_id"] = items[0].get("id","")

print(f"  {C}Seed:{Z} run={SEED.get('run_id','?')[:8]}  finding={SEED.get('finding_id','?')[:8]}")

# ─────────────────────────────────────────────
#  A. READ-ONLY ENDPOINTS — tất cả role được đọc
# ─────────────────────────────────────────────
section("A. READ ENDPOINTS — all roles allowed")

READ_ALL = [
    ("A-001", "GET findings list",      "/api/v1/vsp/findings?limit=5"),
    ("A-002", "GET runs list",          "/api/v1/vsp/runs?limit=5"),
    ("A-003", "GET SSDF practices",     "/api/p4/ssdf/practices"),
    ("A-004", "GET auth check",         "/api/v1/auth/check"),
    ("A-005", "GET scan log",           "/api/v1/vsp/scan-log?limit=5"),
    ("A-006", "GET compliance score",   "/api/v1/compliance/fedramp"),
]

for tid, name, path in READ_ALL:
    for role in ALL_ROLES:
        tok = TOKENS.get(role,"")
        if not tok: continue
        st, d, ev = req("GET", path, token=tok)
        passed = check_allow(st)
        record("READ_ALL", tid, name, "MEDIUM", role, passed,
               "2xx/4xx(validation)", st,
               "All roles should read" if not passed else "")

# ─────────────────────────────────────────────
#  B. ADMIN-ONLY ENDPOINTS
# ─────────────────────────────────────────────
section("B. ADMIN-ONLY ENDPOINTS — non-admin must get 403")

ADMIN_ONLY = [
    ("B-001", "HIGH",   "GET admin/users",        "GET",  "/api/v1/admin/users?limit=1",    None),
    ("B-002", "HIGH",   "POST admin/users",       "POST", "/api/v1/admin/users",            {"email":f"tmp@x.com","password":"X","role":"analyst"}),
    ("B-003", "HIGH",   "GET tool-config",        "GET",  "/api/v1/settings/tool-config",   None),
    ("B-004", "HIGH",   "GET integrations",       "GET",  "/api/v1/integrations",  None),
    ("B-005", "MEDIUM", "POST settings update",   "POST", "/api/v1/admin/settings/update",   {}),
    ("B-006", "HIGH",   "GET admin tenants",      "GET",  "/api/v1/admin/tenants",          None),
    ("B-007", "MEDIUM", "GET scheduler jobs",     "GET",  "/api/sched/jobs",                None),
]

for tid, sev, name, method, path, body in ADMIN_ONLY:
    # Admin phải được
    tok = TOKENS.get("admin","")
    st, d, ev = req(method, path, body, token=tok)
    record("ADMIN_ONLY", tid, f"[admin] {name}", sev, "admin",
           check_allow(st), "allow(2xx/4xx)", st)

    # Non-admin phải bị chặn
    for role in ["analyst","dev","qa","auditor"]:
        tok = TOKENS.get(role,"")
        if not tok: continue
        st, d, ev = req(method, path, body, token=tok)
        passed = check_deny(st)
        record("ADMIN_ONLY", tid, f"[{role}] {name}", sev, role,
               passed, "403", st,
               "OVER-PERMISSIVE" if not passed else "")

# ─────────────────────────────────────────────
#  C. WRITE OPERATIONS — phân quyền ghi
# ─────────────────────────────────────────────
section("C. WRITE OPERATIONS — role-based write access")

# C-001: Start scan — admin/analyst/dev/qa được, auditor không
SCAN_ALLOWED = {"admin","analyst","dev","qa"}
for role in ALL_ROLES:
    tok = TOKENS.get(role,"")
    if not tok: continue
    st, d, ev = req("POST", "/api/v1/vsp/run", {}, token=tok)
    should_allow = role in SCAN_ALLOWED
    if should_allow:
        passed = check_allow(st)
        record("WRITE", "C-001", "Start scan run", "MEDIUM", role, passed,
               "allow", st, "Should be able to start scan")
    else:
        passed = check_deny(st)
        record("WRITE", "C-001", "Start scan run (blocked)", "MEDIUM", role, passed,
               "403", st, "OVER-PERMISSIVE: auditor started scan" if not passed else "")

# C-002: Accept finding — admin/analyst/dev được
ACCEPT_ALLOWED = {"admin","analyst","dev"}
fid = SEED.get("finding_id","00000000-0000-0000-0000-000000000001")
for role in ALL_ROLES:
    tok = TOKENS.get(role,"")
    if not tok: continue
    st, d, ev = req("POST", f"/api/v1/vsp/findings/{fid}/accept", {}, token=tok)
    should_allow = role in ACCEPT_ALLOWED
    if should_allow:
        passed = check_allow(st)
        record("WRITE", "C-002", "Accept finding", "MEDIUM", role, passed,
               "allow", st)
    else:
        passed = check_deny(st)
        record("WRITE", "C-002", "Accept finding (blocked)", "HIGH", role, passed,
               "403", st, "OVER-PERMISSIVE" if not passed else "")

# C-003: Bulk accept — admin/analyst/dev được
for role in ALL_ROLES:
    tok = TOKENS.get(role,"")
    if not tok: continue
    st, d, ev = req("POST", "/api/v1/vsp/findings/bulk/accept",
                    {"finding_ids": [fid]}, token=tok)
    should_allow = role in ACCEPT_ALLOWED
    if should_allow:
        passed = check_allow(st)
        record("WRITE", "C-003", "Bulk accept findings", "MEDIUM", role, passed, "allow", st)
    else:
        passed = check_deny(st)
        record("WRITE", "C-003", "Bulk accept (blocked)", "HIGH", role, passed,
               "403", st, "OVER-PERMISSIVE" if not passed else "")

# C-004: Create finding (manual) — admin/analyst được
CREATE_ALLOWED = {"admin","analyst"}
for role in ALL_ROLES:
    tok = TOKENS.get(role,"")
    if not tok: continue
    st, d, ev = req("PUT", "/api/v1/vsp/findings",
                    {"title":"test","severity":"LOW","description":"test"}, token=tok)
    should_allow = role in CREATE_ALLOWED
    if should_allow:
        passed = check_allow(st)
        record("WRITE", "C-004", "Create finding", "MEDIUM", role, passed, "allow", st)
    else:
        passed = check_deny(st)
        record("WRITE", "C-004", "Create finding (blocked)", "HIGH", role, passed,
               "403", st, "OVER-PERMISSIVE" if not passed else "")

# ─────────────────────────────────────────────
#  D. PRIVILEGE ESCALATION
# ─────────────────────────────────────────────
section("D. PRIVILEGE ESCALATION attempts")

# D-001: Non-admin tạo user với role=admin
for role in ["analyst","dev","qa","auditor"]:
    tok = TOKENS.get(role,"")
    if not tok: continue
    st, d, ev = req("POST", "/api/v1/admin/users",
                    {"email":f"evil-{role}-{SUF}@x.com",
                     "password": TEST_PASS, "role":"admin"}, token=tok)
    record("ESCALATION", "D-001", "Create admin user", "CRITICAL", role,
           check_deny(st), "403", st,
           "CRITICAL: role escalation possible!" if not check_deny(st) else "")

# D-002: Non-admin sửa role của user khác
analyst_uid = UIDS.get("analyst","nonexistent")
for role in ["dev","qa","auditor"]:
    tok = TOKENS.get(role,"")
    if not tok: continue
    st, d, ev = req("PATCH", f"/api/v1/admin/users/{analyst_uid}",
                    {"role":"admin"}, token=tok)
    record("ESCALATION", "D-002", "Patch user role to admin", "CRITICAL", role,
           st in (403,404,405), "403/404/405", st,
           "CRITICAL: can escalate other user!" if st not in (403,404,405) else "")

# D-003: Non-admin xoá user khác
for role in ["analyst","dev","qa","auditor"]:
    tok = TOKENS.get(role,"")
    if not tok: continue
    target = UIDS.get("qa", "nonexistent")
    if role == "qa": target = UIDS.get("dev","nonexistent")
    st, d, ev = req("DELETE", f"/api/v1/admin/users/{target}", token=tok)
    record("ESCALATION", "D-003", "Delete another user", "HIGH", role,
           st in (403,404), "403/404", st,
           "HIGH: can delete users!" if st not in (403,404) else "")

# D-004: Non-admin thay đổi password user khác
for role in ["analyst","dev"]:
    tok = TOKENS.get(role,"")
    if not tok: continue
    st, d, ev = req("POST", f"/api/v1/admin/users/{analyst_uid}/password",
                    {"password":"Hacked2026!"}, token=tok)
    record("ESCALATION", "D-004", "Change another user password", "CRITICAL", role,
           st in (403,404,405), "403/404/405", st,
           "CRITICAL: can change passwords!" if st not in (403,404,405) else "")

# ─────────────────────────────────────────────
#  E. IDOR — Insecure Direct Object Reference
# ─────────────────────────────────────────────
section("E. IDOR — Direct Object Access")

FAKE_IDS = [
    "00000000-0000-0000-0000-000000000001",
    "ffffffff-ffff-ffff-ffff-ffffffffffff",
    "00000000-0000-0000-0000-000000000000",
]

for role in ALL_ROLES:
    tok = TOKENS.get(role,"")
    if not tok: continue
    for fid in FAKE_IDS[:1]:  # test 1 fake ID per role
        # E-001: Đọc finding không tồn tại
        st, d, ev = req("GET", f"/api/v1/vsp/findings/{fid}", token=tok)
        record("IDOR", "E-001", "Access non-existent finding", "HIGH", role,
               st in (403,404), "403/404", st,
               "IDOR: data returned for fake ID!" if st == 200 and d else "")

        # E-002: Đọc run không tồn tại
        st, d, ev = req("GET", f"/api/v1/vsp/runs/{fid}", token=tok)
        record("IDOR", "E-002", "Access non-existent run", "MEDIUM", role,
               st in (403,404), "403/404", st,
               "IDOR: data returned!" if st == 200 and d else "")

# E-003: Analyst xem user khác
for role in ["analyst","dev","qa","auditor"]:
    tok = TOKENS.get(role,"")
    if not tok: continue
    admin_uid_fake = "00000000-0000-0000-0000-000000000001"
    st, d, ev = req("GET", f"/api/v1/admin/users/{admin_uid_fake}", token=tok)
    record("IDOR", "E-003", "Non-admin access user detail", "HIGH", role,
           st in (403,404), "403/404", st,
           "IDOR: user data exposed!" if st == 200 else "")

# ─────────────────────────────────────────────
#  F. DATA SCOPE — mỗi role chỉ thấy data của mình
# ─────────────────────────────────────────────
section("F. DATA SCOPE — sensitive data visibility")

# F-001: Auditor không thấy raw findings (chỉ summary)
for role in ["qa","auditor"]:
    tok = TOKENS.get(role,"")
    if not tok: continue
    st, d, ev = req("GET", "/api/v1/vsp/findings?limit=10", token=tok)
    if st == 200 and isinstance(d, dict):
        items = d.get("findings", d.get("items", d.get("data",[])))
        # Kiểm tra sensitive fields không bị expose
        has_sensitive = False
        if items:
            sample = items[0] if items else {}
            sensitive_fields = ["internal_notes","raw_output","secret","credential","token"]
            has_sensitive = any(f in str(sample).lower() for f in sensitive_fields)
        record("DATA_SCOPE", "F-001", "No sensitive fields in findings", "MEDIUM", role,
               not has_sensitive, "no sensitive fields", 
               "has sensitive fields" if has_sensitive else "clean", "")
    else:
        record("DATA_SCOPE", "F-001", "No sensitive fields in findings", "MEDIUM", role,
               True, "n/a", f"st={st} (no data)")

# F-002: Non-admin không xem API keys
for role in ["analyst","dev","qa","auditor"]:
    tok = TOKENS.get(role,"")
    if not tok: continue
    st, d, ev = req("GET", "/api/v1/admin/api-keys", token=tok)
    record("DATA_SCOPE", "F-002", "API keys not accessible", "HIGH", role,
           st in (403,404), "403/404", st,
           "EXPOSED: API keys visible!" if st == 200 else "")

# F-003: Non-admin không xem secrets/credentials
for role in ["analyst","dev","qa","auditor"]:
    tok = TOKENS.get(role,"")
    if not tok: continue
    st, d, ev = req("GET", "/api/v1/settings/secrets", token=tok)
    record("DATA_SCOPE", "F-003", "Secrets not accessible", "HIGH", role,
           st in (403,404), "403/404", st,
           "EXPOSED: secrets visible!" if st == 200 else "")

# F-004: Logs accessible nhưng không có PII
for role in ALL_ROLES:
    tok = TOKENS.get(role,"")
    if not tok: continue
    st, d, ev = req("GET", "/api/v1/logs/stats", token=tok)
    record("DATA_SCOPE", "F-004", "Logs stats accessible", "LOW", role,
           check_allow(st), "allow", st)

# ─────────────────────────────────────────────
#  G. MASS ASSIGNMENT
# ─────────────────────────────────────────────
section("G. MASS ASSIGNMENT — inject forbidden fields")

# G-001: Thêm role=admin vào profile update
for role in ["analyst","dev"]:
    tok = TOKENS.get(role,"")
    uid = UIDS.get(role,"")
    if not tok or not uid: continue
    st, d, ev = req("PATCH", f"/api/v1/users/{uid}",
                    {"name":"hacker","role":"admin","is_admin":True}, token=tok)
    # Nếu 200, kiểm tra role có thực sự thay đổi không
    if st == 200:
        st2, d2, _ = req("GET", "/api/v1/admin/users?limit=1", token=tok)
        escalated = check_allow(st2)
        record("MASS_ASSIGN", "G-001", "Mass assign role=admin", "CRITICAL", role,
               not escalated, "role not changed", 
               f"PATCHED 200, admin access={'YES' if escalated else 'NO'}",
               "CRITICAL!" if escalated else "Patch allowed but role not changed")
    else:
        record("MASS_ASSIGN", "G-001", "Mass assign role=admin", "CRITICAL", role,
               True, "rejected", f"st={st}")

# G-002: Thêm tenant_id vào request
for role in ["analyst","dev"]:
    tok = TOKENS.get(role,"")
    if not tok: continue
    fake_tid = "00000000-0000-0000-0000-000000000001"
    st, d, ev = req("GET", f"/api/v1/vsp/findings?limit=1&tenant_id={fake_tid}", token=tok)
    # Nếu trả về data từ tenant khác thì là lỗi
    record("MASS_ASSIGN", "G-002", "tenant_id injection in query", "HIGH", role,
           st in (200,400,403,404),  # 200 OK nếu ignored, 400/403 nếu rejected
           "ignored or rejected", st,
           "Check manually if cross-tenant data returned")

# G-003: Inject is_superuser field
for role in ["analyst"]:
    tok = TOKENS.get(role,"")
    if not tok: continue
    st, d, ev = req("POST", "/api/v1/vsp/run",
                    {"is_superuser":True,"role":"admin","_role":"admin"}, token=tok)
    record("MASS_ASSIGN", "G-003", "Inject superuser flags in body", "HIGH", role,
           check_allow(st), "allow(no escalation)", st,
           "Check if superuser flag was respected")

# ─────────────────────────────────────────────
#  H. HTTP METHOD TAMPERING
# ─────────────────────────────────────────────
section("H. HTTP METHOD TAMPERING")

for role in ["analyst","auditor"]:
    tok = TOKENS.get(role,"")
    if not tok: continue

    # H-001: HEAD trên admin endpoint
    st, d, ev = req("HEAD", "/api/v1/admin/users", token=tok)
    record("METHOD_TAMPER", "H-001", "HEAD on admin endpoint", "MEDIUM", role,
           st in (403,404,405), "403/404/405", st,
           "HEAD bypasses auth check!" if st == 200 else "")

    # H-002: OPTIONS leak allowed methods
    st, d, ev = req("OPTIONS", "/api/v1/admin/users", token=tok)
    record("METHOD_TAMPER", "H-002", "OPTIONS on admin endpoint", "LOW", role,
           True, "any", st, "Check Allow header for dangerous methods")

    # H-003: PUT thay vì PATCH
    fid = SEED.get("finding_id","nonexistent")
    st, d, ev = req("PUT", f"/api/v1/vsp/findings/{fid}",
                    {"severity":"CRITICAL"}, token=tok)
    record("METHOD_TAMPER", "H-003", "PUT to modify finding", "MEDIUM", role,
           st in (403,404,405), "403/404/405", st,
           "PUT allowed for restricted role!" if check_allow(st) and st != 404 else "")

# ─────────────────────────────────────────────
#  I. TOKEN MANIPULATION
# ─────────────────────────────────────────────
section("I. TOKEN MANIPULATION per role")

import base64

for role in ["analyst","dev"]:
    tok = TOKENS.get(role,"")
    if not tok: continue

    parts = tok.split(".")
    if len(parts) != 3: continue

    # I-001: Sửa payload role=admin trong JWT (sẽ fail signature)
    try:
        payload_b64 = parts[1]
        payload_b64 += "=" * (-len(payload_b64) % 4)
        payload = json.loads(base64.urlsafe_b64decode(payload_b64))
        payload["role"] = "admin"
        new_payload = base64.urlsafe_b64encode(
            json.dumps(payload).encode()).decode().rstrip("=")
        tampered = f"{parts[0]}.{new_payload}.{parts[2]}"
        st, d, ev = req("GET", "/api/v1/admin/users?limit=1", token=tampered)
        record("TOKEN_TAMPER", "I-001", "Tampered JWT role=admin rejected", "CRITICAL", role,
               st in (401,403), "401/403", st,
               "CRITICAL: tampered JWT accepted!" if st not in (401,403) else "")
    except Exception as e:
        record("TOKEN_TAMPER", "I-001", "Tampered JWT role=admin rejected", "CRITICAL", role,
               True, "n/a", f"tamper failed: {e}")

    # I-002: alg=none attack
    try:
        none_header = base64.urlsafe_b64encode(
            json.dumps({"alg":"none","typ":"JWT"}).encode()).decode().rstrip("=")
        payload_b64 = parts[1]
        payload_b64 += "=" * (-len(payload_b64) % 4)
        payload = json.loads(base64.urlsafe_b64decode(payload_b64))
        payload["role"] = "admin"
        new_payload = base64.urlsafe_b64encode(
            json.dumps(payload).encode()).decode().rstrip("=")
        none_tok = f"{none_header}.{new_payload}."
        st, d, ev = req("GET", "/api/v1/admin/users?limit=1", token=none_tok)
        record("TOKEN_TAMPER", "I-002", "JWT alg=none attack rejected", "CRITICAL", role,
               st in (401,403), "401/403", st,
               "CRITICAL: alg=none accepted!" if st not in (401,403) else "")
    except Exception as e:
        record("TOKEN_TAMPER", "I-002", "JWT alg=none attack rejected", "CRITICAL", role,
               True, "n/a", f"tamper failed: {e}")

# ─────────────────────────────────────────────
#  CLEANUP
# ─────────────────────────────────────────────
section("CLEANUP")
for role, uid in UIDS.items():
    st, _, _ = req("DELETE", f"/api/v1/admin/users/{uid}", token=admin_tok)
    print(f"  {'OK' if st in (200,204) else '!!'} DELETE {role} -> {st}")

# ─────────────────────────────────────────────
#  REPORT
# ─────────────────────────────────────────────
section("FINAL REPORT — Per Role Security Matrix")

# Per-role summary
print(f"\n  {'Role':<10} {'Total':>6} {'PASS':>6} {'FAIL':>6} {'CRITICAL':>9} {'HIGH':>6}")
print(f"  {'-'*50}")
for role in ALL_ROLES:
    role_res = [r for r in results if r["role"]==role]
    total = len(role_res)
    passed = sum(1 for r in role_res if r["passed"])
    failed = total - passed
    crits = sum(1 for r in role_res if not r["passed"] and r["severity"]=="CRITICAL")
    highs = sum(1 for r in role_res if not r["passed"] and r["severity"]=="HIGH")
    color = R if crits>0 or highs>0 else (Y if failed>0 else G)
    print(f"  {color}{role:<10}{Z} {total:>6} {G}{passed:>6}{Z} {(R if failed>0 else G)}{failed:>6}{Z} {(R if crits>0 else Z)}{crits:>9}{Z} {(R if highs>0 else Z)}{highs:>6}{Z}")

# Per-category summary
print(f"\n  {'Category':<14} {'Total':>6} {'PASS':>6} {'FAIL':>6}")
print(f"  {'-'*35}")
cats = {}
for r in results:
    cats.setdefault(r["category"],[]).append(r)
for cat, items in cats.items():
    p = sum(1 for i in items if i["passed"])
    f = len(items)-p
    print(f"  {cat:<14} {len(items):>6} {G}{p:>6}{Z} {(R if f>0 else G)}{f:>6}{Z}")

# Overall
total = len(results)
passed = sum(1 for r in results if r["passed"])
failed = total - passed
sev_fail = {}
for r in results:
    if not r["passed"]:
        sev_fail[r["severity"]] = sev_fail.get(r["severity"],0)+1

print(f"\n  {'─'*50}")
print(f"  Total   : {total}")
print(f"  {G}PASS    : {passed}{Z}")
print(f"  {(R if failed>0 else G)}FAIL    : {failed}{Z}")

if sev_fail:
    print(f"\n  Failures by severity:")
    for sev in ["CRITICAL","HIGH","MEDIUM","LOW","INFO"]:
        if sev in sev_fail:
            color = R if sev in ("CRITICAL","HIGH") else Y if sev=="MEDIUM" else C
            print(f"    {color}{sev:<10}{Z}: {sev_fail[sev]}")

# List all failures
failures = [r for r in results if not r["passed"]]
if failures:
    print(f"\n  {R}FAILURES DETAIL:{Z}")
    for r in failures:
        sev_color = R if r["severity"] in ("CRITICAL","HIGH") else Y
        print(f"    [{sev_color}{r['severity']:<8}{Z}] [{M}{r['role']:<8}{Z}] {r['id']} {r['name']}")
        print(f"             Expected: {r['expected']}  Got: {r['got']}")
        if r.get("note"): print(f"             Note: {r['note']}")
else:
    print(f"\n  {G}✓ ALL TESTS PASSED — No per-role security issues found{Z}")

print(f"\n  Timestamp : {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')} UTC")
print(f"  Target    : {BASE}")
print(f"{B}{'='*72}{Z}\n")

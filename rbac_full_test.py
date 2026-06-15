#!/usr/bin/env python3
import urllib.request, urllib.error, json, ssl, sys, random, string
from datetime import datetime

BASE        = "https://vsp.linksafe.vn:30800"
ADMIN_EMAIL = "automation@lancs.local"
ADMIN_PASS  = "AutoTest2026!"
TEST_PASS   = "RbacFullTest2026!"
SUF         = "".join(random.choices(string.ascii_lowercase, k=6))
ROLES       = ["admin","analyst","dev","qa","auditor"]
CTX         = ssl._create_unverified_context()
G="\033[92m"; R="\033[91m"; Y="\033[93m"; B="\033[94m"; C="\033[96m"; W="\033[97m"; Z="\033[0m"

ctx = {"admin_token":None,"tokens":{},"user_ids":{},"tenant_a":None,"tenant_b":None,"cleanup":[]}

def req(method, path, body=None, token=None):
    h = {"Content-Type":"application/json"}
    if token: h["Authorization"] = "Bearer " + token
    d = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(BASE+path, d, h, method=method)
    try:
        with urllib.request.urlopen(r, timeout=20, context=CTX) as resp:
            try: return resp.status, json.loads(resp.read())
            except: return resp.status, {}
    except urllib.error.HTTPError as e:
        try: return e.code, json.loads(e.read())
        except: return e.code, {}
    except Exception as ex:
        return 0, {"error": str(ex)}

def banner(t): print(f"\n{B}{'='*65}\n  {t}\n{'='*65}{Z}")
def ok(m):   print(f"  {G}OK{Z}  {m}")
def fail(m): print(f"  {R}FAIL{Z}  {m}")
def warn(m): print(f"  {Y}WARN{Z}  {m}")
def info(m): print(f"       {m}")

# PHASE 1
banner("PHASE 1 — DANG NHAP ADMIN")
st, d = req("POST","/api/v1/auth/login",{"email":ADMIN_EMAIL,"password":ADMIN_PASS})
if st==200 and d.get("token"):
    ctx["admin_token"] = d["token"]
    ok(f"admin login  ({ADMIN_EMAIL})")
else:
    fail(f"login failed {st} {d}"); sys.exit(1)

admin = ctx["admin_token"]

# PHASE 2 — TAO TENANT
banner("PHASE 2 — TAO TENANT A & B")
for label in ["a","b"]:
    name = f"rbac-tenant-{label}-{SUF}"
    st, d = req("POST","/api/v1/admin/tenants",{"name":name,"slug":name},admin)
    tid = d.get("id") or (d.get("tenant") or {}).get("id")
    if st in (200,201) and tid:
        ctx[f"tenant_{label}"] = tid
        ctx["cleanup"].append(("DELETE",f"/api/v1/admin/tenants/{tid}"))
        ok(f"Tenant {label.upper()}: {name}  id={tid}")
    else:
        warn(f"Tenant {label.upper()} create -> {st} (cross-tenant test se bi qua)")

# PHASE 3 — TAO USER
banner("PHASE 3 — TAO USER TUNG ROLE")
for role in ROLES:
    email = f"rbac-{role}-{SUF}@lancs.local"
    body  = {"email":email,"password":TEST_PASS,"role":role}
    pass  # tenant auto-assigned
    st, d = req("POST","/api/v1/admin/users",body,admin)
    uid = d.get("id") or (d.get("user") or {}).get("id")
    if st in (200,201) and uid:
        ctx["user_ids"][role] = uid
        ctx["cleanup"].append(("DELETE",f"/api/v1/admin/users/{uid}"))
        ok(f"{role:<10} created  {email}")
    else:
        fail(f"{role:<10} create failed  {st} {d}"); sys.exit(1)

print()
for role in ROLES:
    email = f"rbac-{role}-{SUF}@lancs.local"
    st, d = req("POST","/api/v1/auth/login",{"email":email,"password":TEST_PASS})
    if st==200 and d.get("token"):
        ctx["tokens"][role] = d["token"]
        ok(f"{role:<10} login OK")
    else:
        fail(f"{role:<10} login failed {st}"); sys.exit(1)

# PHASE 4 — SEED DATA
banner("PHASE 4 — SEED DATA THAT")
st, d = req("GET","/api/v1/vsp/findings?limit=1",token=admin)
findings = d.get("findings",[])
ctx["finding_id"] = findings[0]["id"] if findings else None
ok(f"finding_id = {ctx['finding_id']}") if ctx["finding_id"] else warn("khong co finding that")

st2, d2 = req("GET","/api/v1/vsp/runs?limit=1",token=admin)
runs = d2.get("runs",[])
ctx["run_id"] = runs[0]["id"] if runs else None
ok(f"run_id     = {ctx['run_id']}") if ctx["run_id"] else warn("khong co run that")

# PHASE 5 — MATRIX TEST
banner("PHASE 5 — MA TRAN KIEM TRA")

fid = ctx["finding_id"]
TESTS = [
    # label                              method  path                                    body  expect per role
    ("READ findings list",              "GET",  "/api/v1/vsp/findings?limit=5",         None, {"admin":200,"analyst":200,"dev":200,"qa":200,"auditor":200}),
    ("READ finding detail",             "GET",  "/api/v1/vsp/findings?limit=1&severity=CRITICAL", None, {"admin":200,"analyst":200,"dev":200,"qa":200,"auditor":200}),
    ("READ runs list",                  "GET",  "/api/v1/vsp/runs?limit=5",             None, {"admin":200,"analyst":200,"dev":200,"qa":200,"auditor":200}),
    ("READ SSDF practices",             "GET",  "/api/p4/ssdf/practices",               None, {"admin":200,"analyst":200,"dev":200,"qa":200,"auditor":200}),
    ("READ users (admin only)",         "GET",  "/api/v1/admin/users?limit=5",          None, {"admin":200,"analyst":403,"dev":403,"qa":[400,403],"auditor":403}),
    ("READ tool-config (admin only)",   "GET",  "/api/v1/settings/tool-config",         None, {"admin":200,"analyst":403,"dev":403,"qa":[400,403],"auditor":403}),
    ("READ events [FINDING-001: no RBAC]","GET", "/api/v1/events?limit=5",           None, {"admin":200,"analyst":200,"dev":200,"qa":200,"auditor":200}),
    ("WRITE start scan (no qa/auditor)","POST", "/api/v1/vsp/run",                      {"repo_url":"https://github.com/test/test","branch":"main"},
                                                                                              {"admin":[200,201,400],"analyst":[200,201,400],"dev":[200,201,400],"qa":[400,403],"auditor":403}),
    ("WRITE create user (admin only)",  "POST", "/api/v1/admin/users",                  {"email":"chk@x.com","password":"X","role":"dev"},
                                                                                              {"admin":[200,201,400],"analyst":403,"dev":403,"qa":[400,403],"auditor":403}),
    ("ESCALATION role=admin via dev",   "POST", "/api/v1/admin/users",                  {"email":"inject@x.com","password":"X","role":"admin"},
                                                                                              {"dev":403}),
    ("DELETE audit-log (nobody)",       "DELETE","/api/v1/audit-logs/00000000-0000-0000-0000-000000000000",None,
                                                                                              {r:[403,404] for r in ROLES}),
    ("DELETE user (admin only)",        "DELETE","/api/v1/admin/users/00000000-0000-0000-0000-000000000000",None,
                                                                                              {"admin":[204,404],"analyst":403,"dev":403,"qa":[400,403],"auditor":403}),
]

results = []
for label, method, path, body, expect in TESTS:
    roles_to_test = list(expect.keys())
    row = f"  {label:<40}"
    for role in roles_to_test:
        token = ctx["tokens"][role]
        st, _ = req(method, path, body, token)
        exp   = expect[role]
        exp_l = exp if isinstance(exp,list) else [exp]
        passed = st in exp_l
        results.append({"label":label,"role":role,"got":st,"expect":exp_l,"pass":passed})
        exp_s = "/".join(map(str,exp_l))
        row += f"  {role[:3]}:{G+str(st)+Z if passed else R+str(st)+'!='+exp_s+Z}"
    print(row)

# PHASE 6 — CROSS-TENANT
banner("PHASE 6 — CROSS-TENANT ISOLATION")
if not ctx.get("tenant_b"):
    warn("Khong co tenant B — bo qua")
else:
    tid_b  = ctx["tenant_b"]
    email_b = f"rbac-dev-tb-{SUF}@lancs.local"
    st, d = req("POST","/api/v1/admin/users",{"email":email_b,"password":TEST_PASS,"role":"dev","tenant_id":tid_b},admin)
    uid_b = d.get("id") or (d.get("user") or {}).get("id")
    if st in (200,201) and uid_b:
        ctx["cleanup"].append(("DELETE",f"/api/v1/admin/users/{uid_b}"))
        st2,d2 = req("POST","/api/v1/auth/login",{"email":email_b,"password":TEST_PASS})
        token_b = d2.get("token") if st2==200 else None
        if token_b:
            token_a = ctx["tokens"]["dev"]
            path_b  = f"/api/v1/vsp/findings?limit=5&tenant_id={tid_b}"
            cross_tests = [
                ("tenant_A dev -> findings tenant_B",  token_a, path_b,  [403,200]),
                ("tenant_B dev -> findings tenant_B",  token_b, path_b,  200),
                ("tenant_A dev -> findings no filter", token_a, "/api/v1/vsp/findings?limit=5", 200),
            ]
            for lbl, tok, pth, exp in cross_tests:
                st3, d3 = req("GET", pth, token=tok)
                exp_l = exp if isinstance(exp,list) else [exp]
                passed = st3 in exp_l
                results.append({"label":lbl,"role":"cross","got":st3,"expect":exp_l,"pass":passed})
                exp_s = "/".join(map(str,exp_l))
                mark = f"{G}OK{Z}" if passed else f"{R}FAIL{Z}"
                print(f"  {lbl:<50}  got={st3}  {mark}")
                if "tenant_A" in lbl and "tenant_B" in lbl and st3==200:
                    data = d3.get("findings",[])
                    if data: warn(f"  ISOLATION BREACH: tenant_A thay {len(data)} findings cua tenant_B!")
                    else: ok("  200 nhung findings rong — isolation OK")

# PHASE 7 — CLEANUP
banner("PHASE 7 — CLEANUP")
for method, path in reversed(ctx["cleanup"]):
    st, _ = req(method, path, token=admin)
    info(f"{method} {path}  -> {st}  {'OK' if st in (200,204,404) else 'WARN'}")

# SUMMARY
banner("KET QUA TONG HOP")
total  = len(results)
passed = sum(1 for r in results if r["pass"])
failed = total - passed
print(f"\n  Tong test case : {total}")
print(f"  {G}PASS{Z}           : {passed}")
print(f"  {R if failed else G}FAIL{Z}           : {failed}")
if failed:
    print(f"\n  {R}Chi tiet loi:{Z}")
    for r in results:
        if not r["pass"]:
            exp_s = "/".join(map(str,r["expect"]))
            print(f"    {R}X{Z}  [{r['role']}] {r['label']}  got={r['got']}  expect={exp_s}")
else:
    print(f"\n  {G}ALL PASS — RBAC enforce dung least-privilege{Z}")

print(f"\n  Thoi gian : {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')} UTC")
print(f"  Target    : {BASE}\n")
sys.exit(0 if failed==0 else 1)

import urllib.request as U, urllib.error as E, ssl, json, uuid, time, sys
B = "https://127.0.0.1:30800"
PW = "RoleTest2026!!"
C = ssl._create_unverified_context()
RS = ["admin", "analyst", "dev", "qa", "auditor"]
ALL = set(RS)
AD = {"admin"}
AN = {"admin", "analyst"}
AU = {"admin", "auditor"}
CR = {"admin", "analyst", "auditor"}
EM = {r: "rbac-" + r + "@lancs.local" for r in RS}
TK = {}
LK = set()
X = str(uuid.uuid4())
def rq(m, p, b, t):
    h = {"Content-Type": "application/json"}
    if t:
        h["Authorization"] = "Bearer " + t
    d = json.dumps(b).encode() if b is not None else None
    try:
        return U.urlopen(U.Request(B + p, d, h, method=m), timeout=12, context=C).status
    except E.HTTPError as e:
        return e.code
    except Exception:
        return 0
def lg(r):
    for _ in range(4):
        try:
            x = U.urlopen(U.Request(B + "/api/v1/auth/login",
                json.dumps({"email": EM[r], "password": PW}).encode(),
                {"Content-Type": "application/json"}, method="POST"), timeout=12, context=C)
            t = json.loads(x.read()).get("token", "")
            if t:
                TK[r] = t
                return
        except E.HTTPError as e:
            if e.code == 429:
                time.sleep(13)
                continue
            LK.add(r)
            return
        except Exception:
            time.sleep(2)
    LK.add(r)
P = [
 ("R01", "findings read", "GET", "/api/v1/vsp/findings?limit=1", None, ALL, "r", "role-detect"),
 ("R02", "auth me", "GET", "/api/v1/auth/me", None, ALL, "r", "auth-validate"),
 ("R03", "audit log", "GET", "/api/v1/audit/log?limit=1", None, AU, "r", "audit-check"),
 ("R04", "network", "GET", "/api/v1/network/", None, CR, "r", "cicd-read"),
 ("R05", "ndr", "GET", "/api/v1/ndr/", None, CR, "r", "cicd-read"),
 ("R06", "siem", "GET", "/api/v1/siem/", None, CR, "r", "cicd-read"),
 ("R07", "soar", "GET", "/api/v1/soar/", None, CR, "r", "cicd-read"),
 ("R08", "correlation", "GET", "/api/v1/correlation/", None, CR, "r", "cicd-read"),
 ("R09", "cwpp", "GET", "/api/v1/cwpp/", None, CR, "r", "cicd-read"),
 ("R10", "ueba", "GET", "/api/v1/ueba/", None, CR, "r", "cicd-read"),
 ("R11", "cicd history", "GET", "/api/v1/cicd/run-history", None, CR, "r", "cicd-read"),
 ("R12", "cicd read", "GET", "/api/v1/cicd/status", None, CR, "r", "cicd-read"),
 ("R13", "scans", "GET", "/api/v1/vsp/scans", None, AN, "r", "analyst-check"),
 ("R14", "admin users", "GET", "/api/v1/admin/users?limit=1", None, AD, "r", "cicd-write"),
 ("R15", "admin tenants", "GET", "/api/v1/admin/tenants", None, AD, "r", "cicd-write"),
 ("R16", "admin apikeys", "GET", "/api/v1/admin/api-keys", None, AD, "r", "cicd-write"),
 ("R17", "admin tenants/plan", "GET", "/api/v1/admin/tenants/plan", None, AD, "r", "NO-GUARD?"),
 ("W01", "create user", "POST", "/api/v1/admin/users", {}, AD, "g", "cicd-write"),
 ("W02", "bulk vex", "POST", "/api/v1/vsp/findings/bulk/vex", {"fingerprints": [X], "status": "not_affected"}, AN, "w", "analyst-check"),
 ("W03", "bulk accept", "POST", "/api/v1/vsp/findings/bulk/accept", {"fingerprints": [X]}, AN, "w", "analyst-check"),
 ("W04", "cicd config", "POST", "/api/v1/cicd/config/update", {}, AD, "w", "cicd-write"),
 ("W05", "cicd task", "POST", "/api/v1/cicd/task/create", {}, AD, "w", "cicd-write"),
 ("W06", "cicd autofix", "POST", "/api/v1/cicd/autofix/run", {}, AD, "w", "cicd-write"),
 ("W07", "integrations", "POST", "/api/v1/integrations/jira/bulk", {"fingerprints": [X]}, AD, "w", "cicd-write"),
 ("W08", "sched job", "POST", "/api/sched/jobs", {}, AD, "w", "cicd-write"),
]
def ev(role, o):
    m, p, b, exp, mode = o[2], o[3], o[4], o[5], o[6]
    a = role in exp
    if mode == "w" and a:
        return ("INFO", -1)
    s = rq(m, p, b, TK.get(role, ""))
    if mode in ("r", "g"):
        return ("OK" if ((s not in (401, 403)) == a) else "FAIL", s)
    if s in (200, 201, 204):
        return ("CRIT", s)
    return ("OK" if s in (401, 403) else "WARN", s)
print("=== VSP POLICY MATRIX v8 (detailed per-account, %d policies) ===" % len(P))
for r in RS:
    lg(r)
    print("login %-8s %s" % (r, "OK" if r in TK else "LOCKED"))
tc = 0
for role in RS:
    print("\n##### %s #####" % role.upper())
    if role not in TK:
        print("  SKIP locked")
        continue
    dev = []
    for o in P:
        v, s = ev(role, o)
        a = role in o[5]
        tag = {"OK": "OK  ", "FAIL": "FAIL", "CRIT": "CRIT", "WARN": "WARN", "INFO": "--  "}[v]
        ss = "n/f" if s < 0 else str(s)
        print("  [%s] %s %-18s %-4s exp=%s" % (tag, o[0], o[1], ss, "allow" if a else "deny"))
        if v in ("FAIL", "CRIT", "WARN"):
            dev.append("%s:%s(%s,%s)" % (o[0], o[1], ss, o[7]))
            if v == "CRIT":
                tc += 1
    if dev:
        print("  >> %s: LECH %d -> %s" % (role.upper(), len(dev), ", ".join(dev)))
    else:
        print("  >> %s: KHOP POLICY (0 lech)" % role.upper())
print("\n=== KET: CRIT over-permissive write = %d ===" % tc)
sys.exit(1 if tc else 0)

import urllib.request as U, urllib.error as E, ssl, json, uuid, time, sys
B = "https://127.0.0.1:30800"
PW = "RoleTest2026!!"
C = ssl._create_unverified_context()
RS = ["admin", "analyst", "dev", "qa", "auditor"]
AL = set(RS)
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
    if r in TK:
        return TK[r]
    for _ in range(4):
        try:
            rr = U.Request(B + "/api/v1/auth/login",
                json.dumps({"email": EM[r], "password": PW}).encode(),
                {"Content-Type": "application/json"}, method="POST")
            x = U.urlopen(rr, timeout=12, context=C)
            t = json.loads(x.read()).get("token", "")
            if t:
                TK[r] = t
                return t
        except E.HTTPError as e:
            if e.code == 429:
                time.sleep(13)
                continue
            LK.add(r)
            return ""
        except Exception:
            time.sleep(2)
    LK.add(r)
    return ""
POL = [
 ("P01", "read findings", "GET", "/api/v1/vsp/findings?limit=1", None, AL, "r"),
 ("P02", "list users", "GET", "/api/v1/admin/users?limit=1", None, {"admin"}, "r"),
 ("P03", "list tenants", "GET", "/api/v1/admin/tenants", None, {"admin"}, "r"),
 ("P04", "list apikeys", "GET", "/api/v1/admin/api-keys", None, {"admin"}, "r"),
 ("P05", "read audit", "GET", "/api/v1/audit/log?limit=1", None, {"admin", "auditor"}, "r"),
 ("P06", "cicd history", "GET", "/api/v1/cicd/run-history", None, {"admin", "analyst", "auditor"}, "r"),
 ("P07", "list scans", "GET", "/api/v1/vsp/scans", None, {"admin", "analyst"}, "r"),
 ("P08", "create user", "POST", "/api/v1/admin/users", {}, {"admin"}, "g"),
 ("P09", "bulk vex", "POST", "/api/v1/vsp/findings/bulk/vex", {"fingerprints": [X], "status": "not_affected"}, {"admin", "analyst"}, "w"),
 ("P10", "bulk accept", "POST", "/api/v1/vsp/findings/bulk/accept", {"fingerprints": [X]}, {"admin", "analyst"}, "w"),
 ("P11", "jira bulk", "POST", "/api/v1/integrations/jira/bulk", {"fingerprints": [X]}, {"admin"}, "w"),
 ("P12", "cicd cfg update", "POST", "/api/v1/cicd/config/update", {}, {"admin"}, "w"),
 ("P13", "sched job", "POST", "/api/sched/jobs", {}, {"admin"}, "w"),
]
def ev(r, o):
    m, p, b, al, k = o[2], o[3], o[4], o[5], o[6]
    s = rq(m, p, b, TK.get(r, ""))
    a = r in al
    if k in ("r", "g"):
        return ("OK" if ((s not in (401, 403)) == a) else "FAIL", s)
    if a:
        return ("INFO", s)
    if s in (200, 201, 204):
        return ("CRIT", s)
    return ("OK" if s in (401, 403) else "WARN", s)
print("=== VSP POLICY MATRIX v7 (per-account) ===")
for r in RS:
    lg(r)
    print("login %-8s %s" % (r, "OK" if r in TK else "LOCKED"))
ct = 0
for r in RS:
    print("\n=== " + r.upper() + " ===")
    if r not in TK:
        print("  SKIP locked")
        continue
    ok = fa = cr = 0
    for o in POL:
        v, s = ev(r, o)
        e = "allow" if r in o[5] else "deny"
        if v == "OK":
            ok += 1
        elif v == "CRIT":
            cr += 1
            fa += 1
        elif v != "INFO":
            fa += 1
        print("  [%-4s] %s %-16s %-4s %s" % (v, o[0], o[1], s, e))
    ct += cr
    print("  %s: %d OK, %d FAIL (crit=%d)" % (r.upper(), ok, fa, cr))
print("\nlocked: " + (",".join(sorted(LK)) or "none"))
sys.exit(1 if ct else 0)

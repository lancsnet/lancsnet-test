import urllib.request as U, urllib.error as E, ssl, json, time
B = "https://127.0.0.1:30800"
PW = "RoleTest2026!!"
C = ssl._create_unverified_context()
RS = ["admin", "analyst", "dev", "qa", "auditor"]
EM = {r: "rbac-" + r + "@lancs.local" for r in RS}
CK = [
 ("cicd-read", "http://127.0.0.1:8960/cicd-read-check"),
 ("cicd-write", "http://127.0.0.1:8960/cicd-write-check"),
 ("analyst", "http://127.0.0.1:8960/analyst-check"),
 ("audit", "http://127.0.0.1:8950/audit-rolecheck"),
 ("role-det", "http://127.0.0.1:8960/role-detect"),
]
def login(r):
    for _ in range(4):
        try:
            x = U.urlopen(U.Request(B + "/api/v1/auth/login",
                json.dumps({"email": EM[r], "password": PW}).encode(),
                {"Content-Type": "application/json"}, method="POST"), timeout=12, context=C)
            return json.loads(x.read()).get("token", "")
        except E.HTTPError as e:
            if e.code == 429:
                time.sleep(13)
                continue
            return ""
        except Exception:
            time.sleep(2)
    return ""
def hit(u, t):
    try:
        return str(U.urlopen(U.Request(u, headers={"Authorization": "Bearer " + t}), timeout=6).status)
    except E.HTTPError as e:
        return str(e.code)
    except Exception:
        return "ERR"
TK = {r: login(r) for r in RS}
print("=== role-check service verdict (direct upstream) ===")
print("200=ALLOW  401/403=DENY  ERR=unreachable")
hdr = "%-9s" + " %-10s" * len(CK)
print(hdr % ("role", *[c[0] for c in CK]))
print("-" * 62)
for r in RS:
    vals = [hit(u, TK[r]) if TK[r] else "nologin" for _, u in CK]
    print(hdr % (r, *vals))

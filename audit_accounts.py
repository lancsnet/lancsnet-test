import urllib.request as U, urllib.error as E, ssl, json, time
from collections import Counter
B = "https://127.0.0.1:30800"; PW = "RoleTest2026!!"; C = ssl._create_unverified_context()
RS = ["admin", "analyst", "dev", "qa", "auditor"]
EM = {r: "rbac-" + r + "@lancs.local" for r in RS}
EPS = sorted(set(open("paths.txt").read().split()))
def req(p, t=None, post=False):
    d = json.dumps({"email": EM[t], "password": PW}).encode() if post else None
    h = {"Content-Type": "application/json"} if post else {"Authorization": "Bearer " + (t or "")}
    for _ in range(4):
        try:
            x = U.urlopen(U.Request(B + p, d, h, method="POST" if post else "GET"), timeout=10, context=C)
            return x.read() if post else str(x.status)
        except E.HTTPError as e:
            if e.code == 429: time.sleep(11); continue
            return b"" if post else str(e.code)
        except Exception: return b"" if post else "ERR"
    return b"" if post else "429"
TK = {r: json.loads(req("/api/v1/auth/login", r, True) or b"{}").get("token", "") for r in RS}
M = {r: {p: req(p, TK[r]) for p in EPS} for r in RS}
print("=== PER-ACCOUNT PROFILE (199 GET) ===")
for r in RS:
    c = Counter(M[r].values()); print("%-8s 200=%-3d 403=%-3d 401=%-3d 4xx=%-3d ERR/429=%d" % (r, c["200"], c["403"], c["401"], c["404"] + c["405"], c["ERR"] + c["429"]))
al = [p for p in EPS if M["admin"][p] == "403"]
an = [p for p in EPS if M["analyst"][p] == "403"]
au = [p for p in EPS if M["auditor"][p] == "403"]
inv = [p for p in EPS if (M["dev"][p] == "200" or M["qa"][p] == "200") and (M["analyst"][p] == "403" or M["auditor"][p] == "403")]
print("\n[A] ADMIN-403 (must=0):", al or "none")
print("[B] ANALYST-403:", an or "none")
print("[C] AUDITOR-403:", au or "none")
print("[D] INVERSION dev/qa>analyst/auditor (must=0):", inv or "none")

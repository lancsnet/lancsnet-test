import base64, json, urllib.request as U, urllib.error as E, ssl, time
B = "https://127.0.0.1:30800"; PW = "RoleTest2026!!"; C = ssl._create_unverified_context()
RS = ["admin", "analyst", "dev", "qa", "auditor"]
def b64d(x): return base64.urlsafe_b64decode(x + "=" * (-len(x) % 4))
def login(r):
    try:
        x = U.urlopen(U.Request(B + "/api/v1/auth/login", json.dumps({"email": "rbac-" + r + "@lancs.local", "password": PW}).encode(), {"Content-Type": "application/json"}, method="POST"), timeout=12, context=C)
        return json.loads(x.read())["token"]
    except Exception as e: return None
print("=== IDENTITY / TENANT MAP (5 account) ===")
tids = set(); now = int(time.time())
print("%-9s %-38s %-38s %-12s" % ("role", "tid (tenant)", "uid", "exp-now(s)"))
for r in RS:
    t = login(r)
    if not t: print("%-9s LOGIN FAIL" % r); continue
    pl = json.loads(b64d(t.split(".")[1]))
    tids.add(pl.get("tid"))
    ttl = (pl.get("exp", 0) - now) if pl.get("exp") else "?"
    print("%-9s %-38s %-38s %-12s" % (pl.get("role"), pl.get("tid"), pl.get("uid"), ttl))
    print("           full claims: %s" % json.dumps({k: pl[k] for k in pl}))
print("\n--- so tenant khac nhau: %d ---" % len(tids))
print("=> %s" % ("CUNG 1 tenant -> chi test duoc horizontal (cross-user)" if len(tids) == 1 else "NHIEU tenant -> test duoc cross-tenant isolation"))

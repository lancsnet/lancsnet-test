import urllib.request as U, urllib.error as E, ssl, json
B = "https://127.0.0.1:30800"; PW = "RoleTest2026!!"; C = ssl._create_unverified_context()
def lg(email):
    x = U.urlopen(U.Request(B + "/api/v1/auth/login", json.dumps({"email": email, "password": PW}).encode(), {"Content-Type": "application/json"}, method="POST"), timeout=12, context=C)
    return json.loads(x.read())["token"]
def fetch(p, t):
    try:
        x = U.urlopen(U.Request(B + p, headers={"Authorization": "Bearer " + t}), timeout=10, context=C)
        b = x.read().decode("utf-8", "replace"); n = "?"
        try:
            j = json.loads(b)
            if isinstance(j, list): n = len(j)
            elif isinstance(j, dict):
                for k in ("total", "count", "total_count", "total_findings"):
                    if isinstance(j.get(k), int): n = j[k]; break
                else:
                    for k in ("items", "data", "results", "findings", "rows"):
                        if isinstance(j.get(k), list): n = len(j[k]); break
        except Exception: pass
        return (str(x.status), len(b), n)
    except E.HTTPError as e: return (str(e.code), 0, "-")
    except Exception: return ("ERR", 0, "-")
A = lg("rbac-admin@lancs.local")
Bt = lg("rbac-tenantb@iso.local")
ENDS = ["/api/v1/vsp/findings", "/api/v1/vsp/findings/summary", "/api/v1/vsp/runs", "/api/v1/assets", "/api/v1/cspm/posture", "/api/v1/software-inventory/stats", "/api/v1/audit/logs", "/api/v1/vsp/metrics_slos"]
print("=== CROSS-TENANT ISOLATION TEST ===")
print("A=LANCS admin (533 findings) | B=tenant-B admin (moi tao -> phai RONG)")
print("%-42s %-14s %-14s %s" % ("endpoint  (status/bytes/records)", "LANCS(A)", "tenantB(B)", "verdict"))
print("-" * 90)
leaks = 0
for p in ENDS:
    a = fetch(p, A); bb = fetch(p, Bt)
    leak = bb[0] == "200" and ((isinstance(bb[2], int) and bb[2] > 0) or (bb[1] > 80 and abs(bb[1] - a[1]) < max(a[1], 1) * 0.25))
    if leak: leaks += 1
    v = "LEAK!! tenant-B thay data LANCS" if leak else ("ok-empty" if bb[0] == "200" else "B=" + bb[0])
    print("%-42s %-14s %-14s %s" % (p, "%s/%s/%s" % a, "%s/%s/%s" % bb, v))
print("-" * 90)
print("LEAK count: %d  (>0 = vi pham co lap tenant API1 NGHIEM TRONG)" % leaks)

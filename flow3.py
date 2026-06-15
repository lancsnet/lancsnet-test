import urllib.request as U, urllib.error as E, ssl
B = "https://127.0.0.1:30800"; C = ssl._create_unverified_context()
RO = ["admin", "analyst", "dev", "qa", "auditor"]
T = {r: open("/tmp/tok_" + r).read().strip() for r in RO}
def c(p, t):
    try:
        return U.urlopen(U.Request(B + p, data=b"{}", headers={"Authorization": "Bearer " + t, "Content-Type": "application/json"}, method="POST"), timeout=6, context=C).status
    except E.HTTPError as e: return e.code
    except Exception: return 0
W = []
W.append(("/api/v1/policy/rules/x", {"admin", "analyst"}))
W.append(("/api/v1/settings/tool-config/reset", {"admin"}))
W.append(("/api/v1/remediation/auto", {"admin", "analyst"}))
W.append(("/api/v1/supply-chain/sign", {"admin", "dev"}))
W.append(("/api/p4/vex", {"admin", "dev"}))
W.append(("/api/v1/supply-chain/signatures/x/verify", {"admin", "dev"}))
W.append(("/api/v1/threat-hunt/queries/x/run", {"admin", "analyst"}))
W.append(("/api/v1/correlation/rules/x/toggle", {"admin", "analyst"}))
W.append(("/api/v1/ti/enrich/batch", {"admin", "analyst"}))
W.append(("/api/v1/ti/feeds/sync", {"admin", "analyst"}))
print("%-42s | %s" % ("WRITE endpoint (owner least-priv)", " ".join("%-7s" % r for r in RO)))
for p, own in W:
    row = []; fl = []
    for r in RO:
        allow = c(p, T[r]) not in (401, 403); row.append("ALLOW" if allow else "DENY")
        if allow and r not in own and r != "admin": fl.append("OVER:" + r)
        if (not allow) and r in own: fl.append("UNDER:" + r)
    print("%-42s | %s  %s" % (p[:42], " ".join("%-7s" % v for v in row), " ".join(fl)))

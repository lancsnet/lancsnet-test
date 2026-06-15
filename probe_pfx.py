import urllib.request as U, urllib.error as E, ssl, json, time
B = "https://127.0.0.1:30800"; PW = "RoleTest2026!!"; C = ssl._create_unverified_context()
RS = ["admin", "analyst", "dev", "qa", "auditor"]
EM = {r: "rbac-" + r + "@lancs.local" for r in RS}
EPS = [
 "/api/p4/rmf", "/api/p4/circia/reports", "/api/p4/ir/incidents", "/api/p4/zt/status",
 "/api/p4/sbom/view", "/api/v1/cspm/posture", "/api/v1/cspm/accounts",
 "/api/v1/assets", "/api/v1/software-inventory/stats", "/api/v1/ti/iocs",
 "/api/v1/ti/feeds", "/api/v1/supply-chain/signatures", "/api/v1/soar/playbooks",
 "/api/v1/remediation", "/api/v1/policy/rules", "/api/v1/vulns/stats",
]
def lg(r):
    for _ in range(4):
        try:
            x = U.urlopen(U.Request(B + "/api/v1/auth/login", json.dumps({"email": EM[r], "password": PW}).encode(), {"Content-Type": "application/json"}, method="POST"), timeout=12, context=C)
            return json.loads(x.read()).get("token", "")
        except E.HTTPError as e:
            if e.code == 429: time.sleep(13); continue
            return ""
        except Exception: time.sleep(2)
    return ""
def hit(p, t):
    try: return str(U.urlopen(U.Request(B + p, headers={"Authorization": "Bearer " + t}), timeout=8, context=C).status)
    except E.HTTPError as e: return str(e.code)
    except Exception: return "ERR"
TK = {r: lg(r) for r in RS}
print("200=allow 401/403=deny 404/405=route  (soi dev/qa co doc duoc khong)")
print("%-34s %-6s %-7s %-5s %-5s %-7s" % ("endpoint", *RS))
print("-" * 74)
for p in EPS:
    print("%-34s %-6s %-7s %-5s %-5s %-7s" % (p, *[hit(p, TK[r]) if TK[r] else "n/a" for r in RS]))

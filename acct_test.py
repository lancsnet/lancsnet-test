import sys, urllib.request as U, urllib.error as E, ssl, json, time, re
B = "https://127.0.0.1:30800"; PW = "RoleTest2026!!"; C = ssl._create_unverified_context()
r = sys.argv[1] if len(sys.argv) > 1 else "dev"
EM = "rbac-" + r + "@lancs.local"
EPS = sorted(set(open("paths.txt").read().split()))
SENS = re.compile(r"/(admin|audit|sso|tenants|api-keys|integrations|settings|agentic|alerts|recognition|residency|sbom|threat-hunt|ueba|analytics|forensics|correlation|soc|logs|governance|compliance|oscal|conmon|cisa|cspm|assets|software-inventory|ti|p4)(/|$)")
WF = {"dev": ["/api/v1/cicd/pr-gate", "/api/v1/cicd/run-history", "/api/v1/vulns", "/api/v1/policy/rules", "/api/v1/autofix/leaderboard", "/api/v1/supply-chain/signatures", "/api/v1/vsp/findings"],
      "qa": ["/api/v1/vsp/runs", "/api/v1/vsp/findings", "/api/v1/vulns", "/api/v1/scanners/health"],
      "analyst": ["/api/v1/soc/detection", "/api/v1/ti/iocs", "/api/v1/logs/hunt", "/api/v1/threat-hunt/results"],
      "auditor": ["/api/v1/audit/logs", "/api/v1/compliance/fedramp", "/api/v1/governance/risk-register", "/api/v1/p4/rmf", "/api/v1/logs/stats"],
      "admin": ["/api/v1/admin/users", "/api/v1/sso/config", "/api/v1/tenants", "/api/v1/settings/tool-config"]}
def lg():
    for _ in range(5):
        try:
            x = U.urlopen(U.Request(B + "/api/v1/auth/login", json.dumps({"email": EM, "password": PW}).encode(), {"Content-Type": "application/json"}, method="POST"), timeout=12, context=C)
            return json.loads(x.read()).get("token", "")
        except E.HTTPError as e:
            if e.code == 429: time.sleep(13); continue
            return ""
        except Exception: time.sleep(2)
    return ""
def hit(p, t):
    for _ in range(3):
        try:
            return str(U.urlopen(U.Request(B + p, headers={"Authorization": "Bearer " + t}), timeout=8, context=C).status)
        except E.HTTPError as e:
            if e.code == 429: time.sleep(9); continue
            return str(e.code)
        except Exception: return "ERR"
    return "429"
def grp(p): return "/".join(p.split("/")[:4])
t = lg()
allow = []; deny = []; other = []
for p in EPS:
    s = hit(p, t)
    (allow if s == "200" else deny if s == "403" else other).append(p if s in ("200", "403") else (p, s))
print("======== ACCOUNT: %s ========" % r.upper())
print("ALLOW=%d  DENY(403)=%d  OTHER=%d" % (len(allow), len(deny), len(other)))
from collections import defaultdict
ga = defaultdict(list); [ga[grp(p)].append(p.split("/")[-1]) for p in allow]
print("\n--- DOC DUOC (ALLOW) theo module ---")
for g in sorted(ga): print("  %-32s : %s" % (g, ", ".join(sorted(ga[g]))))
gd = defaultdict(list); [gd[grp(p)].append(p.split("/")[-1]) for p in deny]
print("\n--- BI CHAN (DENY 403) theo module ---")
for g in sorted(gd): print("  %-32s : %s" % (g, ", ".join(sorted(gd[g]))))
sa = [p for p in allow if SENS.search(p)]
print("\n[!] SENSITIVE-ALLOW (%d) -- chu y neu %s la dev/qa:" % (len(sa), r))
for p in sa: print("    " + p)
exp = WF.get(r, [])
miss = [p for p in exp if p in deny or any(o[0] == p for o in other)]
print("\n[!] WORKFLOW-DENY (%d/%d can ma bi chan):" % (len(miss), len(exp)))
for p in miss: print("    " + p)
if other: print("\n(other: %s)" % ", ".join("%s=%s" % o for o in other[:6]))

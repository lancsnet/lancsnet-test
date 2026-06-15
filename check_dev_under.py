import urllib.request as U, urllib.error as E, ssl, json, time
B = "https://127.0.0.1:30800"; PW = "RoleTest2026!!"; C = ssl._create_unverified_context()
EM = lambda r: "rbac-" + r + "@lancs.local"
EXP = {
 "dev": """/api/v1/vsp/findings /api/v1/vsp/findings/summary /api/v1/vsp/findings/by-tool
/api/v1/vsp/findings/chains /api/v1/vsp/findings/dedup /api/v1/vsp/runs /api/v1/vsp/runs/index
/api/v1/vsp/run/latest /api/v1/vsp/runs/full-soc /api/v1/vsp/gate/latest /api/v1/vsp/posture/latest
/api/v1/vsp/metrics_slos /api/v1/vsp/sla_tracker /api/v1/vulns /api/v1/vulns/stats /api/v1/vulns/top-cves
/api/v1/vulns/by-tool /api/v1/vulns/trend /api/v1/policy/rules /api/v1/autofix/config
/api/v1/autofix/leaderboard /api/v1/autofix/metrics /api/v1/autofix/pr/list /api/v1/autofix/repo/list
/api/v1/autofix/validation/stats /api/v1/supply-chain/config /api/v1/supply-chain/signatures
/api/v1/supply-chain/provenance /api/v1/supply-chain/stats /api/v1/supply-chain/vex /api/v1/supply-chain/kpis
/api/v1/scanners/health /api/v1/ai/mode /api/v1/ai/cache/stats /api/v1/cicd/pr-gate /api/v1/cicd/run-history
/api/v1/cicd/tools /api/v1/cicd/config/get /api/v1/cicd/platform-profiles /api/v1/cicd/schedules
/api/v1/drift /api/v1/cato /api/v1/kpi/sanity /api/v1/status""".split(),
 "qa": """/api/v1/vsp/runs /api/v1/vsp/findings /api/v1/vsp/findings/summary /api/v1/vulns
/api/v1/vulns/stats /api/v1/vsp/gate/latest /api/v1/scanners/health /api/v1/status""".split(),
}
def lg(r):
    for _ in range(5):
        try:
            x = U.urlopen(U.Request(B + "/api/v1/auth/login", json.dumps({"email": EM(r), "password": PW}).encode(), {"Content-Type": "application/json"}, method="POST"), timeout=12, context=C)
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
print("=== UNDER CHECK (workflow dev/qa thuc su can) ===")
for r in EXP:
    t = lg(r); under = []; ok = 0
    for p in EXP[r]:
        s = hit(p, t)
        if s == "200": ok += 1
        elif s in ("404", "405"): pass
        else: under.append((p, s))
    print("\n%-4s OK=%d/%d" % (r, ok, len(EXP[r])))
    for p, s in under: print("   UNDER (can ma bi chan): %-42s -> %s" % (p, s))
    if not under: print("   none -- du quyen workflow")

import urllib.request as U, urllib.error as E, ssl, json, time, re
B = "https://127.0.0.1:30800"; PW = "RoleTest2026!!"; C = ssl._create_unverified_context()
RS = ["admin", "analyst", "dev", "qa", "auditor"]
EM = {r: "rbac-" + r + "@lancs.local" for r in RS}
EPS = """/api/p4/forensics/evidence /api/p4/vex /api/v1/admin/api-keys /api/v1/admin/permissions
/api/v1/admin/roles /api/v1/admin/tenants /api/v1/admin/users /api/v1/agentic/sessions
/api/v1/agentic/stats /api/v1/alerts/webhooks /api/v1/analytics/export /api/v1/analytics/summary
/api/v1/api-keys /api/v1/audit /api/v1/audit/logs /api/v1/audit/stats /api/v1/correlation/rules
/api/v1/integrations /api/v1/integrations/virustotal/stats /api/v1/notifications/dlq
/api/v1/recognition/soc2-readiness /api/v1/residency/config /api/v1/residency/violations
/api/v1/sbom /api/v1/settings/dast-targets /api/v1/settings/scan-config /api/v1/settings/tool-config
/api/v1/sso/config /api/v1/sso/providers /api/v1/tenants /api/v1/tenants/quota
/api/v1/threat-hunt/queries /api/v1/threat-hunt/results /api/v1/ueba/anomalies /api/v1/users""".split()
SEC = re.compile(r"(password|passwd|secret|api[_-]?key|token|private[_-]?key|BEGIN [A-Z ]*PRIVATE|aws_access|bearer |[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})", re.I)
def lg(r):
    for _ in range(5):
        try:
            x = U.urlopen(U.Request(B + "/api/v1/auth/login", json.dumps({"email": EM[r], "password": PW}).encode(), {"Content-Type": "application/json"}, method="POST"), timeout=12, context=C)
            return json.loads(x.read()).get("token", "")
        except E.HTTPError as e:
            if e.code == 429: time.sleep(13); continue
            return ""
        except Exception: time.sleep(2)
    return ""
def hit(p, t):
    try:
        x = U.urlopen(U.Request(B + p, headers={"Authorization": "Bearer " + t}), timeout=8, context=C)
        b = x.read().decode("utf-8", "replace"); n = ""
        try:
            j = json.loads(b)
            if isinstance(j, list): n = len(j)
            elif isinstance(j, dict):
                for k in ("items", "data", "results", "rows", "findings", "users", "providers"):
                    if isinstance(j.get(k), list): n = len(j[k]); break
        except Exception: pass
        return (str(x.status), len(b), n, "SEC" if SEC.search(b) else "")
    except E.HTTPError as e: return (str(e.code), 0, "", "")
    except Exception: return ("ERR", 0, "", "")
TK = {r: lg(r) for r in RS}
def f(t): return "%s/%s/%s%s" % (t[0], t[1], t[2] if t[2] != "" else "-", "!" + t[3] if t[3] else "")
leaks = []; secs = []; empty = 0; hasdata = 0
print("fmt = status/bytes/records(!SEC=secret-pattern in body)")
print("%-37s %-13s %-13s %-13s %s" % ("endpoint", "admin", "dev", "qa", "flag"))
print("-" * 92)
for p in EPS:
    res = {r: hit(p, TK[r]) if TK[r] else ("n/a", 0, "", "") for r in RS}
    fl = ""
    if res["dev"][0] == "200": leaks.append((p, "dev")); fl += "LEAK-dev "
    if res["qa"][0] == "200": leaks.append((p, "qa")); fl += "LEAK-qa "
    for r in RS:
        if res[r][3] == "SEC": secs.append((p, r)); fl += "SEC(%s) " % r
    if res["admin"][0] == "200" and res["admin"][1] > 3: hasdata += 1
    elif res["admin"][0] == "200": empty += 1
    print("%-37s %-13s %-13s %-13s %s" % (p, f(res["admin"]), f(res["dev"]), f(res["qa"]), fl))
print("-" * 92)
print("LEAK (dev/qa got 200): %d" % len(leaks))
for p, r in leaks: print("   [%s] %s" % (r, p))
print("SECRET-PATTERN in body: %d" % len(secs))
for p, r in secs: print("   [%s] %s" % (r, p))
print("MOCK-DATA: %d endpoints have data(admin), %d are empty/stub" % (hasdata, empty))

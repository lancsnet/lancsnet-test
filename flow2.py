import urllib.request as U, urllib.error as E, ssl, json
B = "https://127.0.0.1:30800"; C = ssl._create_unverified_context(); PW = "RoleTest2026!!"
def L(e):
    return json.loads(U.urlopen(U.Request(B + "/api/v1/auth/login", json.dumps({"email": e, "password": PW}).encode(), {"Content-Type": "application/json"}, method="POST"), timeout=12, context=C).read())["token"]
RO = ["admin", "analyst", "dev", "qa", "auditor"]
T = {r: open("/tmp/tok_"+r).read().strip() for r in RO}
def c(m, p, t):
    h = {"Authorization": "Bearer " + t}; d = None
    if m == "P": d = b"{}"; h["Content-Type"] = "application/json"
    try:
        return U.urlopen(U.Request(B + p, data=d, headers=h, method="POST" if m == "P" else "GET"), timeout=6, context=C).status
    except E.HTTPError as x: return x.code
    except Exception: return 0
UC = []
UC.append(("dev", "G /api/v1/vsp/findings", "P /api/v1/vsp/run", "G /api/v1/cicd/pr-gate", "P /api/v1/ai/advise", "P /api/v1/cicd/pr-gate/evaluate", "G /api/v1/vsp/gate/latest", "P /api/v1/integrations/jira/create"))
UC.append(("analyst", "G /api/v1/correlation/incidents", "G /api/v1/soc/incidents", "P /api/v1/ai/analyze/findings", "G /api/v1/ti/iocs", "P /api/v1/ueba/analyze", "P /api/p4/ir/incident/create", "P /api/p4/circia/generate", "G /api/v1/logs/hunt"))
UC.append(("auditor", "G /api/p4/rmf", "G /api/p4/ato/expiry", "P /api/p4/zt/assess", "G /api/v1/compliance/fedramp", "P /api/v1/poam/sync", "G /api/v1/oscal/documents", "P /api/v1/cisa-attestation/forms", "P /api/p4/ssdf/assessment"))
seen = set()
for grp in UC:
    own = grp[0]
    if own in seen: continue
    seen.add(own)
    print("\n== owner=%s ==" % own, "|", " ".join(x[:7] for x in RO))
    rec = {r: [] for r in RO}; brk = []
    for stp in grp[1:]:
        m, p = stp.split(" ", 1); row = []
        for r in RO:
            v = "DENY" if c(m, p, T[r]) in (401, 403) else "ALLOW"
            rec[r].append((m, p, v)); row.append(v)
            if r == own and v == "DENY": brk.append(p)
        print(("%s %s" % (m, p))[:38].ljust(38), "|", " ".join(y.ljust(7) for y in row))
    print("  OWNER(%s) buoc KET (under-perm):" % own, brk or "KHONG - tron ven")
    for r in RO:
        if r in ("admin", own): continue
        ov = [p for (m, p, v) in rec[r] if m == "P" and v == "ALLOW"]
        if ov: print("  OVER-PERM %s WRITE duoc:" % r, ov)

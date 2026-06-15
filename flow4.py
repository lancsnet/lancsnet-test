import urllib.request as U, urllib.error as E, ssl
B = "https://127.0.0.1:30800"; C = ssl._create_unverified_context()
RO = ["admin", "analyst", "dev", "qa", "auditor"]
T = {r: open("/tmp/tok_" + r).read().strip() for r in RO}
Z = "00000000-0000-0000-0000-000000000000"
def c(m, p, t):
    h = {"Authorization": "Bearer " + t}; d = None
    if m in ("POST", "PUT", "PATCH"): d = b"{}"; h["Content-Type"] = "application/json"
    try:
        return U.urlopen(U.Request(B + p, data=d, headers=h, method=m), timeout=6, context=C).status
    except E.HTTPError as e: return e.code
    except Exception: return 0
W = []
W.append(("POST", "/api/v1/admin/api-keys", {"admin"}))
W.append(("POST", "/api/v1/admin/users/invite", {"admin"}))
W.append(("POST", "/api/v1/admin/users/bulk-role", {"admin"}))
W.append(("PATCH", "/api/v1/admin/users/" + Z, {"admin"}))
W.append(("DELETE", "/api/v1/admin/users/" + Z, {"admin"}))
W.append(("POST", "/api/v1/admin/tenants", {"admin"}))
W.append(("PUT", "/api/v1/admin/tenants/" + Z + "/plan", {"admin"}))
W.append(("PATCH", "/api/v1/sso/providers/x", {"admin"}))
W.append(("POST", "/api/v1/import/users", {"admin"}))
W.append(("POST", "/api/v1/soar/secrets/x/rotate", {"admin", "analyst"}))
W.append(("POST", "/api/v1/cspm/accounts/x/sync", {"admin", "analyst"}))
W.append(("POST", "/api/v1/integrations/slack", {"admin"}))
print("%-46s | %s" % ("ADMIN-SENSITIVE write (owner)", " ".join("%-7s" % r for r in RO)))
for m, p, own in W:
    row = []; fl = []
    for r in RO:
        allow = c(m, p, T[r]) not in (401, 403); row.append("ALLOW" if allow else "DENY")
        if allow and r not in own and r != "admin": fl.append("!!OVER:" + r)
        if (not allow) and r in own: fl.append("UNDER:" + r)
    lbl = ("%s %s" % (m, p.replace(Z, "{id}")))[:46]
    print("%-46s | %s  %s" % (lbl, " ".join("%-7s" % v for v in row), " ".join(fl)))

import sys
P = "/etc/nginx/sites-available/vsp.linksafe.vn"
s = open(P).read()
if "ROUND6" in s:
    sys.exit("ABORT: round6 da chen roi")

specs = [
 "^/api/v1/supply-chain/(sign|signatures/[^/]+/verify)$",
 "^/api/p4/vex$",
 "^/api/v1/soar/secrets/[^/]+/rotate$",
 "^/api/v1/cspm/accounts/[^/]+/sync$",
 "^/api/v1/audit/(rotate|repair)$",
 "^/api/v1/supply-chain/key/rotate$",
 "^/api/v1/import/policies$",
 "^/api/v1/security/disclosures/[^/]+/transition$",
]
for rgx in specs:
    old = "    location ~ %s {\n" % rgx
    new = "    location ~* %s/?$ {\n" % rgx[:-1]   # bo '$' cuoi, them /?$
    if s.count(old) != 1:
        sys.exit("ABORT edit count=%d :: %s" % (s.count(old), rgx))
    s = s.replace(old, new, 1)

s = s.replace("    # ROUND4_CANON:", "    # ROUND6: 8 sensitive guard -> ~* + /?$\n    # ROUND4_CANON:", 1)
open(P, "w").write(s)
print("OK round6: 8 guard -> ~* + /?$")

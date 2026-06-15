import sys
P = "/etc/nginx/sites-available/vsp.linksafe.vn"
s = open(P).read()
if "ROUND5" in s:
    sys.exit("ABORT: round5 da chen roi")

edits = [
 # line 310: them /?$ VA ~* (exec nhay cam, lo trailing-slash + UPPER)
 ("    location ~ ^/api/v1/(scan/all-modes|vsp/batch|vsp/run/full-soc|vsp/sandbox/(test-fire|clear))$ {\n",
  "    # ROUND5: +/?$ +case-insensitive\n    location ~* ^/api/v1/(scan/all-modes|vsp/batch|vsp/run/full-soc|vsp/sandbox/(test-fire|clear))/?$ {\n"),
 # flip 6 guard round4 -> ~* (bit UPPER guard-miss); /?$ da co
 ("    location ~ ^/api/v1/cato/toggle/?$ {\n",
  "    location ~* ^/api/v1/cato/toggle/?$ {\n"),
 ("    location ~ ^/api/v1/import/users/?$ {\n",
  "    location ~* ^/api/v1/import/users/?$ {\n"),
 ("    location ~ ^/api/(p4/ir/incident/create|p4/circia/generate|v1/ueba/analyze)/?$ {\n",
  "    location ~* ^/api/(p4/ir/incident/create|p4/circia/generate|v1/ueba/analyze)/?$ {\n"),
 ("    location ~ ^/api/(v1/poam/sync|p4/ssdf/assessment|v1/cisa-attestation/forms|p4/zt/assess)/?$ {\n",
  "    location ~* ^/api/(v1/poam/sync|p4/ssdf/assessment|v1/cisa-attestation/forms|p4/zt/assess)/?$ {\n"),
 ("    location ~ ^/api/(v1/cicd/pr-gate/evaluate|v1/vsp/run|v1/integrations/jira/create)/?$ {\n",
  "    location ~* ^/api/(v1/cicd/pr-gate/evaluate|v1/vsp/run|v1/integrations/jira/create)/?$ {\n"),
 ("    location ~ ^/api/v1/(policy/rules/[^/]+|remediation/auto|correlation/rules/[^/]+/toggle)/?$ {\n",
  "    location ~* ^/api/v1/(policy/rules/[^/]+|remediation/auto|correlation/rules/[^/]+/toggle)/?$ {\n"),
]
for old, new in edits:
    if s.count(old) != 1:
        sys.exit("ABORT edit count=%d :: %s" % (s.count(old), old.strip()))
    s = s.replace(old, new, 1)

open(P, "w").write(s)
print("OK round5: line310 +/?$ + 7 guard -> ~*")

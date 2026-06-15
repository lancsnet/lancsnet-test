import sys
P = "/etc/nginx/sites-available/vsp.linksafe.vn"
s = open(P).read()
if "ROUND4_CANON" in s:
    sys.exit("ABORT: round4 da chen roi")

# (1) GLOBAL ;param strip — sau ssl_certificate_key (server HTTPS, truoc moi location)
ssl_anchor = "    ssl_certificate_key /etc/ssl/private/vsp.linksafe.vn.key;\n"
if s.count(ssl_anchor) != 1:
    sys.exit("ABORT ssl_anchor count=%d" % s.count(ssl_anchor))
s = s.replace(ssl_anchor, ssl_anchor +
    "\n    # ROUND4_CANON: strip matrix/path params (;a=1, ;jsessionid) truoc khi match location.\n"
    "    # KHONG strip trailing slash global: bare-collection (/api/v1/soar/ ...) se rot khoi prefix-guard.\n"
    '    rewrite "^([^;]+);.*$" $1;\n', 1)

# (2) PER-GUARD them /?$ cho cac guard exact|anchored nhay cam
edits = [
 ("    location ~ ^/api/v1/cato/toggle$ {\n",
  "    location ~ ^/api/v1/cato/toggle/?$ {\n"),
 ("    location = /api/v1/import/users {\n",
  "    location ~ ^/api/v1/import/users/?$ {\n"),
 ("    location ~ ^/api/(p4/ir/incident/create|p4/circia/generate|v1/ueba/analyze)$ {\n",
  "    location ~ ^/api/(p4/ir/incident/create|p4/circia/generate|v1/ueba/analyze)/?$ {\n"),
 ("    location ~ ^/api/(v1/poam/sync|p4/ssdf/assessment|v1/cisa-attestation/forms|p4/zt/assess)$ {\n",
  "    location ~ ^/api/(v1/poam/sync|p4/ssdf/assessment|v1/cisa-attestation/forms|p4/zt/assess)/?$ {\n"),
 ("    location ~ ^/api/(v1/cicd/pr-gate/evaluate|v1/vsp/run|v1/integrations/jira/create)$ {\n",
  "    location ~ ^/api/(v1/cicd/pr-gate/evaluate|v1/vsp/run|v1/integrations/jira/create)/?$ {\n"),
 ("    location ~ ^/api/v1/(policy/rules/[^/]+|remediation/auto|correlation/rules/[^/]+/toggle)$ {\n",
  "    location ~ ^/api/v1/(policy/rules/[^/]+|remediation/auto|correlation/rules/[^/]+/toggle)/?$ {\n"),
]
for old, new in edits:
    if s.count(old) != 1:
        sys.exit("ABORT edit count=%d :: %s" % (s.count(old), old.strip()))
    s = s.replace(old, new, 1)

open(P, "w").write(s)
print("OK round4: global ;param-strip + /?$ tren 6 guard")

import shutil, time, sys
P = "/etc/nginx/sites-available/vsp.linksafe.vn"
s = open(P).read()
if "FIX-MOD3-readguard" in s:
    print("already patched, skip"); sys.exit(0)
GUARDS = [
    ("", "/api/v1/agentic/", "cicd-read-check"),
    ("", "/api/v1/alerts/", "analyst-check"),
    ("", "/api/v1/analytics/", "cicd-read-check"),
    ("", "/api/v1/recognition/", "cicd-read-check"),
    ("", "/api/v1/tenants", "cicd-read-check"),
    ("", "/api/v1/threat-hunt/", "analyst-check"),
    ("= ", "/api/v1/residency/violations", "cicd-read-check"),
    ("= ", "/api/v1/sbom", "cicd-read-check"),
    ("= ", "/api/v1/settings/dast-targets", "cicd-read-check"),
]
B = "    # FIX-MOD3-readguard: tenants/alerts/agentic/recognition/threat-hunt/etc\n"
for m, pfx, chk in GUARDS:
    B += "    location %s%s {\n        auth_request /%s;\n        error_page 401 = @error401;\n        error_page 403 = @error403;\n        proxy_pass http://127.0.0.1:8921;\n        proxy_set_header Host $host;\n        proxy_set_header Authorization $http_authorization;\n        proxy_set_header X-Real-IP $remote_addr;\n    }\n" % (m, pfx, chk)
i = s.find("location @error401")
if i < 0:
    print("ERR: @error401 not found"); sys.exit(1)
ls = s.rfind("\n", 0, i) + 1
shutil.copy(P, P + ".bak3." + str(int(time.time())))
open(P, "w").write(s[:ls] + B + "\n" + s[ls:])
print("OK inserted %d guards (prefix+exact) before @error401" % len(GUARDS))

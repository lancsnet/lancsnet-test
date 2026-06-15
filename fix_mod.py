import shutil, time, sys
P = "/etc/nginx/sites-available/vsp.linksafe.vn"
s = open(P).read()
if "FIX-MOD-readguard" in s:
    print("already patched, skip"); sys.exit(0)
GUARDS = [
    ("/api/v1/soc/", "cicd-read-check"),
    ("/api/v1/logs/", "analyst-check"),
    ("/api/v1/governance/", "cicd-read-check"),
    ("/api/v1/compliance/", "cicd-read-check"),
    ("/api/v1/oscal/", "cicd-read-check"),
    ("/api/v1/conmon/", "cicd-read-check"),
    ("/api/v1/cisa-attestation/", "cicd-read-check"),
]
B = "    # FIX-MOD-readguard: sensitive module reads require role\n"
for pfx, chk in GUARDS:
    B += "    location %s {\n        auth_request /%s;\n        error_page 401 = @error401;\n        error_page 403 = @error403;\n        proxy_pass http://127.0.0.1:8921;\n        proxy_set_header Host $host;\n        proxy_set_header Authorization $http_authorization;\n        proxy_set_header X-Real-IP $remote_addr;\n    }\n" % (pfx, chk)
i = s.find("location @error401")
if i < 0:
    print("ERR: @error401 not found"); sys.exit(1)
ls = s.rfind("\n", 0, i) + 1
shutil.copy(P, P + ".bak." + str(int(time.time())))
open(P, "w").write(s[:ls] + B + "\n" + s[ls:])
print("OK inserted %d sensitive-prefix guards before @error401" % len(GUARDS))

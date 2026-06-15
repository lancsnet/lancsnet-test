import shutil, time, sys
P = "/etc/nginx/sites-available/vsp.linksafe.vn"
s = open(P).read()
if "FIX-MOD2-readguard" in s:
    print("already patched, skip"); sys.exit(0)
GUARDS = [
    ("/api/p4/", "cicd-read-check"),
    ("/api/v1/cspm/", "cicd-read-check"),
    ("/api/v1/assets", "cicd-read-check"),
    ("/api/v1/software-inventory/", "cicd-read-check"),
    ("/api/v1/ti/secret", "role-detect"),
    ("/api/v1/ti/", "analyst-check"),
]
B = "    # FIX-MOD2-readguard: wider sensitive prefixes (p4/cspm/assets/ti)\n"
for pfx, chk in GUARDS:
    B += "    location %s {\n        auth_request /%s;\n        error_page 401 = @error401;\n        error_page 403 = @error403;\n        proxy_pass http://127.0.0.1:8921;\n        proxy_set_header Host $host;\n        proxy_set_header Authorization $http_authorization;\n        proxy_set_header X-Real-IP $remote_addr;\n    }\n" % (pfx, chk)
i = s.find("location @error401")
if i < 0:
    print("ERR: @error401 not found"); sys.exit(1)
ls = s.rfind("\n", 0, i) + 1
shutil.copy(P, P + ".bak2." + str(int(time.time())))
open(P, "w").write(s[:ls] + B + "\n" + s[ls:])
print("OK inserted %d wider-prefix guards before @error401" % len(GUARDS))

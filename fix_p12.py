import shutil, time, sys
P = "/etc/nginx/sites-available/vsp.linksafe.vn"
s = open(P).read()
if "FIX-P12-cicd-write" in s:
    print("already patched, skip")
    sys.exit(0)
B = """    # FIX-P12-cicd-write: cicd write endpoints admin-only (exact/prefix override regex shadow)
    location = /api/v1/cicd/config/update {
        auth_request /cicd-write-check;
        error_page 401 = @error401;
        error_page 403 = @error403;
        proxy_pass http://127.0.0.1:8921;
        proxy_set_header Host $host;
        proxy_set_header Authorization $http_authorization;
        proxy_set_header X-Real-IP $remote_addr;
    }
    location = /api/v1/cicd/task/create {
        auth_request /cicd-write-check;
        error_page 401 = @error401;
        error_page 403 = @error403;
        proxy_pass http://127.0.0.1:8921;
        proxy_set_header Host $host;
        proxy_set_header Authorization $http_authorization;
        proxy_set_header X-Real-IP $remote_addr;
    }
    location ^~ /api/v1/cicd/autofix {
        auth_request /cicd-write-check;
        error_page 401 = @error401;
        error_page 403 = @error403;
        proxy_pass http://127.0.0.1:8921;
        proxy_set_header Host $host;
        proxy_set_header Authorization $http_authorization;
        proxy_set_header X-Real-IP $remote_addr;
    }
"""
i = s.find("location @error401")
if i < 0:
    print("ERR: @error401 not found")
    sys.exit(1)
ls = s.rfind("\n", 0, i) + 1
shutil.copy(P, P + ".bak." + str(int(time.time())))
open(P, "w").write(s[:ls] + B + "\n" + s[ls:])
print("OK inserted before @error401 (offset %d)" % ls)

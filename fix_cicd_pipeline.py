import shutil, time, sys
P = "/etc/nginx/sites-available/vsp.linksafe.vn"
s = open(P).read()
if "cicd-pipeline-check" in s:
    print("already patched, skip"); sys.exit(0)
RC = '''    location = /cicd-read-check {
        internal;
        proxy_pass http://127.0.0.1:8960/cicd-read-check;
        proxy_pass_request_body off;
        proxy_set_header Content-Length "";
        proxy_set_header Authorization $http_authorization;
        proxy_connect_timeout 2s;
        proxy_read_timeout    2s;
        proxy_intercept_errors on;
        error_page 500 502 503 504 =401 /dev/null;
    }'''
if RC not in s:
    print("ERR: read-check internal block not found verbatim"); sys.exit(1)
PC = RC.replace("cicd-read-check", "cicd-pipeline-check")
s = s.replace(RC, RC + "\n" + PC, 1)
a1 = '    location = /api/v1/cicd/run-history {\n        auth_request /cicd-read-check;'
a2 = '    location ~* ^/api/v1/cicd/ {\n        auth_request /cicd-read-check;'
for a in (a1, a2):
    if a not in s:
        print("ERR: anchor not found ->", a[:45]); sys.exit(1)
    s = s.replace(a, a.replace("cicd-read-check", "cicd-pipeline-check"), 1)
shutil.copy(P, P + ".bak4." + str(int(time.time())))
open(P, "w").write(s)
print("OK: pipeline-check internal added + run-history & cicd-GET switched")

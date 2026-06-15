import sys
P = "/etc/nginx/sites-available/vsp.linksafe.vn"
s = open(P).read()
anchor = "    location = /api/v1/cicd/run-history {\n"
if s.count(anchor) != 1:
    sys.exit("ABORT: anchor count=%d" % s.count(anchor))
if "ROUND2" in s:
    sys.exit("ABORT: round2 da chen")
BL = '''    # ROUND2: writes -> analyst (policy/remediation-auto/correlation-toggle)
    location ~ ^/api/v1/(policy/rules/[^/]+|remediation/auto|correlation/rules/[^/]+/toggle)$ {
        auth_request /analyst-check;
        error_page 401 = @error401;
        error_page 403 = @error403;
        proxy_pass http://127.0.0.1:8921;
        proxy_set_header Host $host;
        proxy_set_header Authorization $http_authorization;
    }
    # ROUND2: supply-chain writes -> admin/dev/analyst
    location ~ ^/api/v1/supply-chain/(sign|signatures/[^/]+/verify)$ {
        auth_request /pipeline-write-check;
        error_page 401 = @error401;
        error_page 403 = @error403;
        proxy_pass http://127.0.0.1:8921;
        proxy_set_header Host $host;
        proxy_set_header Authorization $http_authorization;
    }
    # ROUND2: p4/vex GET=read POST=write
    location ~ ^/api/p4/vex$ {
        auth_request /cicd-read-check;
        limit_except GET HEAD { auth_request /pipeline-write-check; }
        error_page 401 = @error401;
        error_page 403 = @error403;
        proxy_pass http://127.0.0.1:8921;
        proxy_set_header Host $host;
        proxy_set_header Authorization $http_authorization;
    }
'''
s = s.replace(anchor, BL + anchor, 1)
open(P, "w").write(s)
print("OK: round2 chen 3 location guard")

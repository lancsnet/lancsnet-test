import sys
P = "/etc/nginx/sites-available/vsp.linksafe.vn"
s = open(P).read()
anchor = "    location = /api/v1/cicd/run-history {\n"
if s.count(anchor) != 1:
    sys.exit("ABORT: anchor count=%d" % s.count(anchor))
if "AUTH-GUARD SOC write" in s:
    sys.exit("ABORT: da chen guard write")
BL = '''    location = /pipeline-write-check {
        internal;
        proxy_pass http://127.0.0.1:8960/pipeline-write-check;
        proxy_pass_request_body off;
        proxy_set_header Content-Length "";
        proxy_set_header Authorization $http_authorization;
        proxy_connect_timeout 2s;
        proxy_read_timeout    2s;
        proxy_intercept_errors on;
        error_page 500 502 503 504 =401 /dev/null;
    }
    # AUTH-GUARD SOC write -> admin/analyst
    location ~ ^/api/(p4/ir/incident/create|p4/circia/generate|v1/ueba/analyze)$ {
        auth_request /analyst-check;
        error_page 401 = @error401;
        error_page 403 = @error403;
        proxy_pass http://127.0.0.1:8921;
        proxy_set_header Host $host;
        proxy_set_header Authorization $http_authorization;
    }
    # AUTH-GUARD Compliance write -> admin
    location ~ ^/api/(v1/poam/sync|p4/ssdf/assessment|v1/cisa-attestation/forms|p4/zt/assess)$ {
        auth_request /cicd-write-check;
        error_page 401 = @error401;
        error_page 403 = @error403;
        proxy_pass http://127.0.0.1:8921;
        proxy_set_header Host $host;
        proxy_set_header Authorization $http_authorization;
    }
    # AUTH-GUARD CICD write -> admin/dev/analyst
    location ~ ^/api/(v1/cicd/pr-gate/evaluate|v1/vsp/run|v1/integrations/jira/create)$ {
        auth_request /pipeline-write-check;
        error_page 401 = @error401;
        error_page 403 = @error403;
        proxy_pass http://127.0.0.1:8921;
        proxy_set_header Host $host;
        proxy_set_header Authorization $http_authorization;
    }
'''
s = s.replace(anchor, BL + anchor, 1)
open(P, "w").write(s)
print("OK: chen 1 internal + 3 regex guard write")

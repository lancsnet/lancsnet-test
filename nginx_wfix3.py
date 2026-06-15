import sys
P = "/etc/nginx/sites-available/vsp.linksafe.vn"
s = open(P).read()
anchor = "    location = /api/v1/cicd/run-history {\n"
if s.count(anchor) != 1:
    sys.exit("ABORT: anchor count=%d" % s.count(anchor))
if "ROUND3" in s:
    sys.exit("ABORT: round3 da chen")
BL = '''    # ROUND3: import/users -> admin only
    location = /api/v1/import/users {
        auth_request /cicd-write-check;
        error_page 401 = @error401;
        error_page 403 = @error403;
        proxy_pass http://127.0.0.1:8921;
        proxy_set_header Host $host;
        proxy_set_header Authorization $http_authorization;
    }
    # ROUND3: soar secret rotate + cspm account sync -> admin/analyst
    location ~ ^/api/v1/soar/secrets/[^/]+/rotate$ {
        auth_request /analyst-check;
        error_page 401 = @error401;
        error_page 403 = @error403;
        proxy_pass http://127.0.0.1:8921;
        proxy_set_header Host $host;
        proxy_set_header Authorization $http_authorization;
    }
    location ~ ^/api/v1/cspm/accounts/[^/]+/sync$ {
        auth_request /analyst-check;
        error_page 401 = @error401;
        error_page 403 = @error403;
        proxy_pass http://127.0.0.1:8921;
        proxy_set_header Host $host;
        proxy_set_header Authorization $http_authorization;
    }
'''
s = s.replace(anchor, BL + anchor, 1)
open(P, "w").write(s)
print("OK: round3 chen 3 guard (import-users/soar-rotate/cspm-sync)")

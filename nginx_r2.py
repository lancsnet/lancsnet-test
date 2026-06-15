import sys
P = "/etc/nginx/sites-available/vsp.linksafe.vn"
s = open(P).read()
if "ROUND2_GUARD" in s:
    sys.exit("ABORT: round2 da chen roi")
anchor = "    location = /api/v1/cicd/run-history {\n"
if s.count(anchor) != 1:
    sys.exit("ABORT anchor count=%d" % s.count(anchor))
def wblock(loc, chk):
    return ('''    location %s {
        auth_request /%s;
        error_page 401 = @error401;
        error_page 403 = @error403;
        proxy_pass http://127.0.0.1:8921;
        proxy_set_header Host $host;
        proxy_set_header Authorization $http_authorization;
    }
''' % (loc, chk))
BL = "    # ROUND2_GUARD: cac path le chua gated\n"
# admin-only (write-only path, khong lo read)
BL += wblock("~ ^/api/v1/cato/toggle$", "cicd-write-check")
BL += wblock("~ ^/api/v1/supply-chain/key/rotate$", "cicd-write-check")
BL += wblock("~ ^/api/v1/import/policies$", "cicd-write-check")
BL += wblock("~ ^/api/v1/security/disclosures/[^/]+/transition$", "analyst-check")
# method-aware (giu read, chan auditor/qa ghi) qua pipeline-check
BL += wblock("/api/v1/agents", "cicd-pipeline-check")
BL += wblock("/api/v1/autofix/", "cicd-pipeline-check")
BL += wblock("/api/v1/remediation/", "cicd-pipeline-check")
BL += wblock("/api/v1/schedules/", "cicd-pipeline-check")
s = s.replace(anchor, BL + anchor, 1)
open(P, "w").write(s)
print("OK: round2 chen 8 guard")

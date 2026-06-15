import sys
P = "/etc/nginx/sites-available/vsp.linksafe.vn"
s = open(P).read()
if "ROUND3_READ" in s:
    sys.exit("ABORT: round3 da chen roi")
# (1) p4/vex: doi pipeline-write -> cicd-read (method-aware: GET=RC, POST=analyst)
old = "    location ~ ^/api/p4/vex$ {\n        auth_request /pipeline-write-check;\n"
if s.count(old) != 1:
    sys.exit("ABORT vex count=%d" % s.count(old))
s = s.replace(old, "    location ~ ^/api/p4/vex$ {\n        auth_request /cicd-read-check;\n", 1)
# (2)(3)(4) read guard cho sbom sub-path / supply-chain-sbom / features-soar-config
anchor = "    location = /api/v1/cicd/run-history {\n"
if s.count(anchor) != 1:
    sys.exit("ABORT anchor count=%d" % s.count(anchor))
def rb(loc):
    return ("    location %s {\n        auth_request /cicd-read-check;\n"
            "        error_page 401 = @error401;\n        error_page 403 = @error403;\n"
            "        proxy_pass http://127.0.0.1:8921;\n        proxy_set_header Host $host;\n"
            "        proxy_set_header Authorization $http_authorization;\n    }\n" % loc)
BL = "    # ROUND3_READ: sbom sub-path + supply-chain/sbom + features/soar/config\n"
BL += rb("/api/v1/sbom/")
BL += rb("= /api/v1/supply-chain/sbom")
BL += rb("= /api/v1/features/soar/config")
s = s.replace(anchor, BL + anchor, 1)
open(P, "w").write(s)
print("OK round3: vex method-aware + 3 read guard")

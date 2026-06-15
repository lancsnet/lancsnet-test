import sys
P = "/etc/nginx/sites-available/vsp.linksafe.vn"
s = open(P).read()
if "ORIG_METHOD_GUARD" in s:
    sys.exit("ABORT: method-aware da chen roi")
# (a) server-level set, chen truoc audit-rolecheck
a1 = "    location = /audit-rolecheck {\n"
if s.count(a1) != 1:
    sys.exit("ABORT a1 count=%d" % s.count(a1))
setblk = ("    # ORIG_METHOD_GUARD: lo original method/uri cho auth subrequest\n"
          "    set $orig_method $request_method;\n"
          "    set $orig_uri $request_uri;\n")
s = s.replace(a1, setblk + a1, 1)
# (b) truyen header vao 2 check location
for chk in ("cicd-read-check", "cicd-pipeline-check"):
    a = "        proxy_pass http://127.0.0.1:8960/%s;\n" % chk
    if s.count(a) != 1:
        sys.exit("ABORT b %s count=%d" % (chk, s.count(a)))
    hdr = (a + "        proxy_set_header X-Orig-Method $orig_method;\n"
             "        proxy_set_header X-Orig-URI $orig_uri;\n")
    s = s.replace(a, hdr, 1)
# (c) 2 guard moi truoc run-history anchor
anchor = "    location = /api/v1/cicd/run-history {\n"
if s.count(anchor) != 1:
    sys.exit("ABORT anchor count=%d" % s.count(anchor))
BL = '''    # ORIG_METHOD_GUARD c1: scan/sandbox/batch/full-soc write -> pipeline-write
    location ~ ^/api/v1/(scan/all-modes|vsp/batch|vsp/run/full-soc|vsp/sandbox/(test-fire|clear))$ {
        auth_request /pipeline-write-check;
        error_page 401 = @error401;
        error_page 403 = @error403;
        proxy_pass http://127.0.0.1:8921;
        proxy_set_header Host $host;
        proxy_set_header Authorization $http_authorization;
    }
    # ORIG_METHOD_GUARD c2: audit rotate/repair -> admin only
    location ~ ^/api/v1/audit/(rotate|repair)$ {
        auth_request /cicd-write-check;
        error_page 401 = @error401;
        error_page 403 = @error403;
        proxy_pass http://127.0.0.1:8921;
        proxy_set_header Host $host;
        proxy_set_header Authorization $http_authorization;
    }
'''
s = s.replace(anchor, BL + anchor, 1)
open(P, "w").write(s)
print("OK: method-aware + 2 write-guard chen xong")

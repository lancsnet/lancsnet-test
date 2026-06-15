import sys
P="/etc/nginx/sites-available/vsp.linksafe.vn"
s=open(P).read()
if "ROUND10" in s: sys.exit("ABORT round10 da chen")
anchor='    location /api/v1/vsp/findings {\n'
if s.count(anchor)!=1: sys.exit("ABORT anchor count=%d"%s.count(anchor))
blk=('    # ROUND10: vsp/run/* reads (latest,log,tail) -> ep runs:read (bare /vsp/run write van o guard 249/312)\n'
     '    location /api/v1/vsp/run/ {\n'
     '        auth_request /cicd-read-check;\n'
     '        error_page 401 = @error401;\n        error_page 403 = @error403;\n'
     '        proxy_pass http://127.0.0.1:8921;\n        proxy_set_header Host $host;\n'
     '        proxy_set_header Authorization $http_authorization;\n    }\n')
s=s.replace(anchor, blk+anchor, 1)
open(P,"w").write(s); print("OK round10: vsp/run/* reads -> cicd-read-check")

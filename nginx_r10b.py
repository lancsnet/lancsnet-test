import sys
P="/etc/nginx/sites-available/vsp.linksafe.vn"
s=open(P).read()
old=('    # ROUND10: vsp/run/* reads (latest,log,tail) -> ep runs:read (bare /vsp/run write van o guard 249/312)\n'
     '    location /api/v1/vsp/run/ {\n'
     '        auth_request /cicd-read-check;\n'
     '        error_page 401 = @error401;\n        error_page 403 = @error403;\n'
     '        proxy_pass http://127.0.0.1:8921;\n        proxy_set_header Host $host;\n'
     '        proxy_set_header Authorization $http_authorization;\n    }\n')
if old not in s: sys.exit("ABORT: khong thay block ROUND10 prefix")
s=s.replace(old,"",1)
if "ROUND10B" in s: sys.exit("ABORT: r10b da chen")
anchor='    location ~* ^/api/v1/audit/(rotate|repair)/?$ {\n'
if s.count(anchor)!=1: sys.exit("ABORT anchor count=%d"%s.count(anchor))
blk=('    # ROUND10B: vsp/run/* reads -> REGEX (khong auto-301 nhu prefix/). Sau 312 (full-soc giu o 312), truoc catch-all. runs:read\n'
     '    location ~* ^/api/v1/vsp/run/ {\n'
     '        auth_request /cicd-read-check;\n'
     '        error_page 401 = @error401;\n        error_page 403 = @error403;\n'
     '        proxy_pass http://127.0.0.1:8921;\n        proxy_set_header Host $host;\n'
     '        proxy_set_header Authorization $http_authorization;\n    }\n')
s=s.replace(anchor, blk+anchor, 1)
open(P,"w").write(s); print("OK r10b: prefix/ -> regex, het auto-301, van ep runs:read tren reads")

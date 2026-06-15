import sys
P="/etc/nginx/sites-available/vsp.linksafe.vn"
s=open(P).read()
if "ROUND12" in s: sys.exit("ABORT r12 da chen")
anchor='    location / {\n        limit_req zone=api_general burst=50 nodelay;'
if s.count(anchor)!=1: sys.exit("ABORT catch-all anchor count=%d"%s.count(anchor))
blk=('    # ROUND12: DEFAULT-DENY backstop. /api/* CHUA match guard cu the -> cicd-read-check\n'
     '    # (read=scope, write=writeset). Specific prefix/regex dai hon van thang.\n'
     '    location /api/ {\n'
     '        limit_req zone=api_general burst=50 nodelay;\n'
     '        limit_req_status 429;\n'
     '        auth_request /cicd-read-check;\n'
     '        error_page 401 = @error401;\n        error_page 403 = @error403;\n'
     '        proxy_pass http://127.0.0.1:8921;\n'
     '        proxy_http_version 1.1;\n'
     '        proxy_set_header Upgrade $http_upgrade;\n'
     '        proxy_set_header Connection "upgrade";\n'
     '        proxy_set_header Host $host;\n'
     '        proxy_set_header Authorization $http_authorization;\n'
     '        proxy_set_header X-Real-IP $remote_addr;\n'
     '        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n'
     '        proxy_set_header X-Forwarded-Proto $scheme;\n'
     '        proxy_read_timeout 300s;\n'
     '    }\n')
s=s.replace(anchor, blk+anchor, 1)
open(P,"w").write(s); print("OK r12: default-deny /api/ -> cicd-read-check")

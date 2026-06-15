import sys
P="/etc/nginx/sites-available/vsp.linksafe.vn"
s=open(P).read()
if "ROUND11" in s: sys.exit("ABORT r11 da chen")
# (1) soar/secrets/rotate: analyst-check -> cicd-write-check
o1='    location ~* ^/api/v1/soar/secrets/[^/]+/rotate/?$ {\n        auth_request /analyst-check;'
n1='    location ~* ^/api/v1/soar/secrets/[^/]+/rotate/?$ {  # ROUND11 admin-only\n        auth_request /cicd-write-check;'
if s.count(o1)!=1: sys.exit("ABORT secrets/rotate count=%d"%s.count(o1))
s=s.replace(o1,n1,1)
# (2) bare /vsp/run write -> cicd-write-check, TRUOC 249 (cuop truoc pipeline-write); reads van o r10b
anchor='    location ~* ^/api/(v1/cicd/pr-gate/evaluate|v1/vsp/run|v1/integrations/jira/create)/?$ {\n'
if s.count(anchor)!=1: sys.exit("ABORT 249 count=%d"%s.count(anchor))
blk=('    # ROUND11: bare /vsp/run write -> admin-only (tach khoi nhom 249). reads /vsp/run/* van o r10b\n'
     '    location ~* ^/api/v1/vsp/run/?$ {\n'
     '        auth_request /cicd-write-check;\n'
     '        error_page 401 = @error401;\n        error_page 403 = @error403;\n'
     '        proxy_pass http://127.0.0.1:8921;\n        proxy_set_header Host $host;\n'
     '        proxy_set_header Authorization $http_authorization;\n    }\n')
s=s.replace(anchor, blk+anchor, 1)
open(P,"w").write(s); print("OK r11 nginx: secrets/rotate + bare vsp/run -> cicd-write-check")

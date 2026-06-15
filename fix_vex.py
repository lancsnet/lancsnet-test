import sys
P = "/etc/nginx/sites-available/vsp.linksafe.vn"
s = open(P).read()
bad = """    # ROUND2: p4/vex GET=read POST=write
    location ~ ^/api/p4/vex$ {
        auth_request /cicd-read-check;
        limit_except GET HEAD { auth_request /pipeline-write-check; }
"""
good = """    # ROUND2: p4/vex all methods -> admin/dev/analyst
    location ~ ^/api/p4/vex$ {
        auth_request /pipeline-write-check;
"""
if s.count(bad) != 1:
    sys.exit("ABORT: bad-block count=%d" % s.count(bad))
s = s.replace(bad, good, 1)
open(P, "w").write(s)
print("OK: bo limit_except, p4/vex -> pipeline-write")

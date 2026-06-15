import sys
P="/opt/cicd_role_check.py"
s=open(P).read()
if '"/logs/sources"' in s: sys.exit("ABORT: logs/sources da co")
o='"/governance/evidence", "/p4/zt", "/compliance/")'
if s.count(o)!=1: sys.exit("ABORT COMPLIANCE_WRITE count=%d"%s.count(o))
s=s.replace(o,'"/governance/evidence", "/p4/zt", "/compliance/", "/logs/sources")  # ROUND11 admin-only',1)
open(P,"w").write(s); print("OK r11 check: logs/sources write -> admin-only")

import sys
P = "/opt/cicd_role_check.py"
s = open(P).read()
if "PIPELINE_WRITE_ROLES" in s:
    sys.exit("ABORT: PIPELINE_WRITE_ROLES da ton tai")
m1 = 'ANALYST_ROLES = {"admin", "analyst"}\n'
m2 = '            "/analyst-check":    ANALYST_ROLES,\n'
if s.count(m1) != 1 or s.count(m2) != 1:
    sys.exit("ABORT: marker count m1=%d m2=%d" % (s.count(m1), s.count(m2)))
s = s.replace(m1, m1 + 'PIPELINE_WRITE_ROLES = {"admin", "dev", "analyst"}\n', 1)
s = s.replace(m2, m2 + '            "/pipeline-write-check": PIPELINE_WRITE_ROLES,\n', 1)
open(P, "w").write(s)
print("OK: them PIPELINE_WRITE_ROLES + /pipeline-write-check")

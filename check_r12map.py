import sys, ast
P="/opt/cicd_role_check.py"
s=open(P).read()
if "ROUND12-MAP" in s: sys.exit("ABORT da map")
anchor="READ_SCOPE_PREFIX = [\n"
if s.count(anchor)!=1: sys.exit("ABORT anchor count=%d"%s.count(anchor))
add=(' # ROUND12-MAP: app-shell + dashboard/runs/findings/reports widgets (fallout default-deny)\n'
     ' ("/api/v1/config","dashboard:read"), ("/api/v1/locale","dashboard:read"),\n'
     ' ("/api/v1/status","dashboard:read"), ("/api/v1/auth/check","dashboard:read"),\n'
     ' ("/api/v1/scanners/health","dashboard:read"), ("/api/v1/kpi","dashboard:read"),\n'
     ' ("/api/v1/vsp/gate","dashboard:read"), ("/api/v1/vsp/posture","dashboard:read"),\n'
     ' ("/api/v1/vsp/metrics_slos","dashboard:read"), ("/api/v1/vsp/sla","dashboard:read"),\n'
     ' ("/api/v1/vsp/run_report","reports:read"), ("/api/v1/vsp/executive_report","reports:read"),\n'
     ' ("/api/v1/vsp/batch","runs:read"), ("/api/v1/vsp/sandbox","runs:read"),\n'
     ' ("/api/v1/vulns","findings:read"),\n')
s=s.replace(anchor, anchor+add, 1)
ast.parse(s)
open(P,"w").write(s); print("OK r12-map: them prefix dashboard/runs/findings/reports")

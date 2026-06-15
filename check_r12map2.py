import sys, ast
P="/opt/cicd_role_check.py"
s=open(P).read()
if "ROUND12-MAP2" in s: sys.exit("ABORT map2 da co")
anchor="READ_SCOPE_PREFIX = [\n"
if s.count(anchor)!=1: sys.exit("ABORT anchor count=%d"%s.count(anchor))
add=(' # ROUND12-MAP2: policy theo module. Admin-only (key/config) phai dung TRUOC supply-chain rong.\n'
     ' ("/api/v1/supply-chain/key","admin:users"), ("/api/v1/supply-chain/config","admin:users"),\n'
     ' ("/api/v1/observability","admin:users"),\n'
     ' ("/api/v1/supply-chain","findings:read"), ("/api/v1/export","findings:read"),\n'
     ' ("/api/v1/data/exports","findings:read"),\n'
     ' ("/api/v1/security/disclosures","soar:read"), ("/api/v1/attack","soar:read"),\n'
     ' ("/api/v1/ai/","soar:read"),\n'
     ' ("/api/v1/dora","dashboard:read"), ("/api/v1/drift","dashboard:read"),\n'
     ' ("/api/v1/improvement","dashboard:read"),\n'
     ' ("/api/v1/cato","audit:read"), ("/api/v1/nist-csf","audit:read"),\n'
     ' ("/api/v1/tabletop","audit:read"),\n'
     ' ("/api/v1/transparency","reports:read"),\n')
s=s.replace(anchor, anchor+add, 1)
ast.parse(s)
open(P,"w").write(s); print("OK map2: policy theo module")

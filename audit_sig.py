import sys, ast
P="/home/devsecops/audit_rolecheck.py"
s=open(P).read()
if "_sig_ok" in s: sys.exit("ABORT da co")
o1="import base64, json\n"; n1="import base64, json, hmac, hashlib, os\n"
if s.count(o1)!=1: sys.exit("ABORT import"); 
s=s.replace(o1,n1,1)
o2='ALLOWED = {"admin", "auditor"}\n'
if s.count(o2)!=1: sys.exit("ABORT ALLOWED")
helper=('_JWT_SECRET = os.environ.get("JWT_SECRET","")\n'
        'def _sig_ok(tok):\n'
        '    if not _JWT_SECRET: return True\n'
        '    try:\n'
        '        h,p,sg = tok.split(".")\n'
        '        exp = base64.urlsafe_b64encode(hmac.new(_JWT_SECRET.encode(), (h+"."+p).encode(), hashlib.sha256).digest()).rstrip(b"=").decode()\n'
        '        return hmac.compare_digest(exp, sg)\n'
        '    except Exception:\n'
        '        return False\n')
s=s.replace(o2, helper+o2, 1)
o3='    p = h.split(None,1)[1].split(".")\n'
n3='    tok = h.split(None,1)[1]\n    if not _sig_ok(tok): return None\n    p = tok.split(".")\n'
if s.count(o3)!=1: sys.exit("ABORT role split")
s=s.replace(o3,n3,1)
ast.parse(s)
open(P,"w").write(s); print("OK :8950 HS256 verify")

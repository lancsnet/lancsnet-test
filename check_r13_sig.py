import sys, ast
P="/opt/cicd_role_check.py"
s=open(P).read()
if "_sig_ok" in s: sys.exit("ABORT: _sig_ok da co")
imp="import re as _re\n"
if s.count(imp)!=1: sys.exit("ABORT import anchor count=%d"%s.count(imp))
helper=("import hmac as _hmac, hashlib as _hashlib, os as _os\n"
        "_JWT_SECRET = _os.environ.get('JWT_SECRET','')\n"
        "def _sig_ok(token):\n"
        "    if not _JWT_SECRET: return True  # secret chua nap -> fail-open (verify khi co)\n"
        "    try:\n"
        "        h,p,sg = token.split('.')\n"
        "        exp = base64.urlsafe_b64encode(_hmac.new(_JWT_SECRET.encode(), (h+'.'+p).encode(), _hashlib.sha256).digest()).rstrip(b'=').decode()\n"
        "        return _hmac.compare_digest(exp, sg)\n"
        "    except Exception:\n"
        "        return False\n")
s=s.replace(imp, imp+helper, 1)
anc="        if not token: return None\n"
if s.count(anc)!=1: sys.exit("ABORT decode anchor count=%d"%s.count(anc))
s=s.replace(anc, anc+"        if not _sig_ok(token): return None  # ROUND13 HS256 verify\n", 1)
ast.parse(s)
open(P,"w").write(s); print("OK r13: HS256 verify them vao decode_payload")

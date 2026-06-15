import sys, ast
# ---- :8960 ----
P="/opt/cicd_role_check.py"; s=open(P).read()
if "_cl['exp']" in s: print("8960 skip (da co)")
else:
    o="import hmac as _hmac, hashlib as _hashlib, os as _os\n"
    assert s.count(o)==1, "8960 import"; s=s.replace(o,"import hmac as _hmac, hashlib as _hashlib, os as _os, time as _time\n",1)
    o2=("        exp = base64.urlsafe_b64encode(_hmac.new(_JWT_SECRET.encode(), (h+'.'+p).encode(), _hashlib.sha256).digest()).rstrip(b'=').decode()\n"
        "        return _hmac.compare_digest(exp, sg)\n")
    assert s.count(o2)==1, "8960 body"
    n2=("        _es = base64.urlsafe_b64encode(_hmac.new(_JWT_SECRET.encode(), (h+'.'+p).encode(), _hashlib.sha256).digest()).rstrip(b'=').decode()\n"
        "        if not _hmac.compare_digest(_es, sg): return False\n"
        "        _cl = json.loads(base64.urlsafe_b64decode(p + '='*(-len(p)%4)))\n"
        "        _now = _time.time()\n"
        "        if 'exp' not in _cl or _cl['exp'] <= _now: return False\n"
        "        if 'nbf' in _cl and _cl['nbf'] > _now: return False\n"
        "        return True\n")
    s=s.replace(o2,n2,1); ast.parse(s); open(P,"w").write(s); print("8960 exp/nbf OK")
# ---- :8950 ----
P="/home/devsecops/audit_rolecheck.py"; s=open(P).read()
if '_cl["exp"]' in s: print("8950 skip (da co)")
else:
    o="import base64, json, hmac, hashlib, os\n"
    assert s.count(o)==1, "8950 import"; s=s.replace(o,"import base64, json, hmac, hashlib, os, time\n",1)
    o2=('        exp = base64.urlsafe_b64encode(hmac.new(_JWT_SECRET.encode(), (h+"."+p).encode(), hashlib.sha256).digest()).rstrip(b"=").decode()\n'
        '        return hmac.compare_digest(exp, sg)\n')
    assert s.count(o2)==1, "8950 body"
    n2=('        _es = base64.urlsafe_b64encode(hmac.new(_JWT_SECRET.encode(), (h+"."+p).encode(), hashlib.sha256).digest()).rstrip(b"=").decode()\n'
        '        if not hmac.compare_digest(_es, sg): return False\n'
        '        _cl = json.loads(base64.urlsafe_b64decode(p + "="*(-len(p)%4)))\n'
        '        _now = time.time()\n'
        '        if "exp" not in _cl or _cl["exp"] <= _now: return False\n'
        '        if "nbf" in _cl and _cl["nbf"] > _now: return False\n'
        '        return True\n')
    s=s.replace(o2,n2,1); ast.parse(s); open(P,"w").write(s); print("8950 exp/nbf OK")

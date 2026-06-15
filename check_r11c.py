import sys, ast
P="/opt/cicd_role_check.py"
s=open(P).read()
if "_norm(" in s: sys.exit("ABORT: _norm da co")
helper=('from urllib.parse import unquote as _unq\n'
        'import re as _re\n'
        'def _norm(u):\n'
        '    u = _unq(u or "")\n'
        '    u = u.split("?",1)[0].split(";",1)[0]\n'
        '    u = _re.sub(r"/+","/",u)\n'
        '    return u\n')
a1='READ_SCOPE_PREFIX = ['
if s.count(a1)!=1: sys.exit("ABORT READ_SCOPE_PREFIX count=%d"%s.count(a1))
s=s.replace(a1, helper+a1, 1)
a2='    for pre, sc in READ_SCOPE_PREFIX:\n        if uri.startswith(pre): return sc'
if s.count(a2)!=1: sys.exit("ABORT rrs anchor count=%d"%s.count(a2))
s=s.replace(a2, '    uri = _norm(uri)\n'+a2, 1)
a3='def writeset_for(uri):\n    for s in COMPLIANCE_WRITE:'
if s.count(a3)!=1: sys.exit("ABORT wsf anchor count=%d"%s.count(a3))
s=s.replace(a3, 'def writeset_for(uri):\n    uri = _norm(uri)\n    for s in COMPLIANCE_WRITE:', 1)
try: ast.parse(s)
except SyntaxError as e: sys.exit("ABORT syntax: %s"%e)
open(P,"w").write(s); print("OK r11c: _norm trong required_read_scope & writeset_for")

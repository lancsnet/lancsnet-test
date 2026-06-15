import sys, ast
P="/opt/cicd_role_check.py"
s=open(P).read()
if "ThreadingHTTPServer" in s: sys.exit("ABORT: da co ThreadingHTTPServer")
o_imp="from http.server import HTTPServer, BaseHTTPRequestHandler"
n_imp="from http.server import HTTPServer, ThreadingHTTPServer, BaseHTTPRequestHandler"
if s.count(o_imp)!=1: sys.exit("ABORT import count=%d"%s.count(o_imp))
s=s.replace(o_imp,n_imp,1)
o_run='HTTPServer(("127.0.0.1",8960), Handler).serve_forever()'
n_run='ThreadingHTTPServer(("127.0.0.1",8960), Handler).serve_forever()'
if s.count(o_run)!=1: sys.exit("ABORT run count=%d"%s.count(o_run))
s=s.replace(o_run,n_run,1)
ast.parse(s)
open(P,"w").write(s); print("OK thread: HTTPServer -> ThreadingHTTPServer")

import sys
P="nginx_guard_lint.sh"
s=open(P).read()
if "[E]" in s: sys.exit("ABORT: [E] da co")
anchor='[ "$fail" -eq 0 ] && echo "LINT OK: guard convention dat."'
if s.count(anchor)!=1: sys.exit("ABORT anchor count=%d"%s.count(anchor))
blk=("# (E) ROUND12 default-deny backstop phai con (chong mo lai default-open)\n"
     "grep -qE 'location[[:space:]]+/api/[[:space:]]*\\{' \"$CONF\" || "
     "{ echo \"FAIL [E] thieu default-deny backstop (location /api/ ROUND12)\"; fail=1; }\n")
s=s.replace(anchor, blk+anchor, 1)
open(P,"w").write(s); print("OK lint: them check [E]")

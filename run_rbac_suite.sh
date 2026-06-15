#!/usr/bin/env bash
BASE="https://127.0.0.1:30800"; DL="/home/devsecops/Downloads"
LINT="/home/devsecops/vsp-platform-v4.9.0/nginx_guard_lint.sh"; P=0; F=0
code(){ curl -sk -o /dev/null -w '%{http_code}' -X "$2" -H "Authorization: Bearer $(cat /tmp/tok_$1)" "$BASE$3"; }
codet(){ curl -sk -o /dev/null -w '%{http_code}' -H "Authorization: Bearer $1" "$BASE$2"; }
ok(){ P=$((P+1)); printf '  PASS %s\n' "$1"; }; no(){ F=$((F+1)); printf '  FAIL %s\n' "$1"; }
allow(){ c=$(code "$1" "$2" "$3"); case $c in 401|403) no "$1 $2 $3 -> $c (mong ALLOW)";; *) ok "$1 $2 $3 -> $c";; esac; }
deny(){ c=$(code "$1" "$2" "$3"); [ "$c" = 403 ] && ok "$1 $2 $3 -> 403" || no "$1 $2 $3 -> $c (mong DENY)"; }
echo "== [A] Services/nginx/lint =="
[ "$(systemctl is-active cicd-role-check.service)" = active ] && ok "cicd-role-check active" || no "cicd-role-check"
sudo nginx -t >/dev/null 2>&1 && ok "nginx -t" || no "nginx -t"
bash "$LINT" >/tmp/lint_$$.out 2>&1 && grep -q 'LINT OK' /tmp/lint_$$.out && ok "lint" || no "lint"
echo "== [B] Reads scope =="
allow admin GET /api/v1/soar/playbooks; allow analyst GET /api/v1/soar/playbooks
deny auditor GET /api/v1/soar/playbooks; deny dev GET /api/v1/soar/playbooks; deny qa GET /api/v1/soar/playbooks
allow dev GET /api/v1/vsp/findings; deny qa GET /api/v1/vsp/findings
allow dev GET /api/v1/vsp/run/latest; allow qa GET /api/v1/vsp/run/latest; deny auditor GET /api/v1/vsp/run/latest
allow auditor GET /api/v1/cato; deny analyst GET /api/v1/cato
allow admin GET /api/v1/notifications; deny analyst GET /api/v1/notifications
allow qa GET /api/v1/config; allow qa GET /api/v1/dora
allow dev GET /api/v1/supply-chain/stats; deny qa GET /api/v1/supply-chain/stats
allow admin GET /api/v1/supply-chain/key; deny analyst GET /api/v1/supply-chain/key
echo "== [C] Writes admin-only =="
allow admin POST /api/v1/vsp/run; deny analyst POST /api/v1/vsp/run; deny dev POST /api/v1/vsp/run; deny qa POST /api/v1/vsp/run; deny auditor POST /api/v1/vsp/run
allow admin POST /api/v1/soar/secrets/abc/rotate; deny analyst POST /api/v1/soar/secrets/abc/rotate
allow admin DELETE /api/v1/logs/sources/x; deny analyst DELETE /api/v1/logs/sources/x
echo "== [D] Bypass/normalization =="
deny auditor GET /api/v1/vsp/run/latest/; deny auditor GET "/api/v1/vsp/run/latest?z=1"
deny analyst DELETE /api/v1/lo%67s/sources/x; deny analyst POST "/api/v1/vsp/run;a=1"; deny analyst POST /api/v1/vsp/run/
echo "== [E] Default-deny backstop =="
deny qa GET /api/v1/zzz/unmapped/xyz; deny dev GET /api/v1/zzz/unmapped/xyz; allow admin GET /api/v1/zzz/unmapped/xyz
echo "== [F] JWT sig verify (chong forge) =="
FORGED=$(python3 - <<'PY'
import base64,json
d=lambda s:base64.urlsafe_b64decode(s+'='*(-len(s)%4)); e=lambda b:base64.urlsafe_b64encode(b).rstrip(b'=').decode()
h,p,sig=open('/tmp/tok_qa').read().strip().split('.'); pay=json.loads(d(p)); pay['role']='admin'
print(f"{h}.{e(json.dumps(pay,separators=(',',':')).encode())}.{sig}")
PY
)
for ep in /api/v1/soar/playbooks /api/v1/soar/runs /api/v1/correlation/incidents; do
  c=$(codet "$FORGED" "$ep"); [ "$c" = 401 ] && ok "forged qa->admin $ep -> 401" || no "forged $ep -> $c (FORGERY!)"; done
c=$(codet "$(cat /tmp/tok_admin)" /api/v1/soar/playbooks); [ "$c" = 200 ] && ok "real admin soar -> 200" || no "real admin soar -> $c"
c=$(curl -sk -o /dev/null -w '%{http_code}' "$BASE/api/v1/notifications"); [ "$c" = 401 ] && ok "no-token -> 401" || no "no-token -> $c"
echo "== [G] RBAC matrix =="
M=$(cd "$DL" && python3 rbac_matrix_test.py rbac_matrix.csv | tail -1); echo "  $M"
echo "$M" | grep -q 'PRIVESC=0 BYPASS=0' && ok "matrix PRIVESC=0 BYPASS=0" || no "matrix"
echo "$M" | grep -q 'UNDER=0' && ok "matrix UNDER=0" || no "matrix UNDER"
echo; echo "====== PASS=$P FAIL=$F ======"; [ "$F" -eq 0 ] && echo ">>> SUITE GREEN" || echo ">>> CO FAIL"; exit $F

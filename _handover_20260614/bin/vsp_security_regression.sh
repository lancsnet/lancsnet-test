#!/usr/bin/env bash
# ===========================================================================
# VSP SECURITY + FLOW REGRESSION SUITE  — single source of truth
# Encode moi finding da phat hien trong dot test + chay lai kiem chung.
# PASS=dat | FAIL=regression(exit1) | WARN=skip/info | XFAIL=bug backend da biet
# ===========================================================================
set -uo pipefail
BASE="${BASE:-https://127.0.0.1:30800}"
G=$'\033[92m';R=$'\033[91m';Y=$'\033[93m';C=$'\033[96m';D=$'\033[2m';N=$'\033[0m'
P=0;F=0;W=0;X=0; declare -a FAILS=()
pass(){ echo "  ${G}PASS${N} $1"; P=$((P+1)); }
fail(){ echo "  ${R}FAIL${N} $1"; F=$((F+1)); FAILS+=("$1"); }
warn(){ echo "  ${Y}WARN${N} $1"; W=$((W+1)); }
xfail(){ echo "  ${C}XFAIL${N} $1 ${D}(known backend bug)${N}"; X=$((X+1)); }
sec(){ echo; echo "${D}== $1 ==${N}"; }
hasw(){ grep -qw "$2" <<<"$1"; }   # hasw "EXP_LIST" "$CODE"
rq(){ local tok="$1" m="$2" p="$3" b="${4:-}"; local -a a=(-sk -m15 -w $'\n%{http_code}' -X "$m")
  [ -n "$tok" ] && a+=(-H "Authorization: Bearer $tok"); a+=(-H 'Content-Type: application/json')
  [ -n "$b" ] && a+=(-d "$b"); local o; o=$(curl "${a[@]}" "$BASE$p"); RC="${o##*$'\n'}"; RB="${o%$'\n'*}"; }
jget(){ python3 -c "import sys,json
try:
 d=json.load(sys.stdin); print(d.get('$1','') if isinstance(d,dict) else '')
except: print('')"; }
wcode(){ rq "$1" "$2" "$3" '{}'; echo "$RC"; }   # write-probe body {} => khong tao data
login(){ local t; rq "" POST /api/v1/auth/login "{\"email\":\"$1\",\"password\":\"$2\"}"; t=$(echo "$RB"|jget token)
  if [ -z "$t" ] && [ "$RC" = 429 ]; then sleep 5; rq "" POST /api/v1/auth/login "{\"email\":\"$1\",\"password\":\"$2\"}"; t=$(echo "$RB"|jget token); fi
  echo "$t"; }  # KHONG retry khi 401 (tranh lockout); chi backoff khi 429
declare -A EM PW TOK
PWR="${VSP_REGR_PW:-VspRegr2026!}"
EM[admin]=regr-admin@lancs.local;     PW[admin]="$PWR"
EM[analyst]=regr-analyst@lancs.local; PW[analyst]="$PWR"
EM[auditor]=regr-auditor@lancs.local; PW[auditor]="$PWR"
EM[dev]=regr-dev@lancs.local;         PW[dev]="$PWR"
EM[qa]=regr-qa@lancs.local;           PW[qa]="$PWR"
FAKE=00000000-0000-0000-0000-000000000000

sec "0) PREFLIGHT — mint+verify token (role thieu -> skip)"
for r in admin analyst auditor dev qa; do
  cf="/tmp/vsptok_$r"; t=""
  if [ -s "$cf" ]; then rq "$(cat "$cf")" GET /api/v1/auth/check; [ "$RC" = 200 ] && t="$(cat "$cf")"; fi
  if [ -z "$t" ]; then t=$(login "${EM[$r]}" "${PW[$r]}"); [ -n "$t" ] && echo "$t" > "$cf"; sleep 1; fi
  if [ -n "$t" ]; then TOK[$r]="$t"; pass "token $r hop le"; else warn "skip $r: login fail/throttle"; fi
done
A="${TOK[admin]:-}"; AN="${TOK[analyst]:-}"
TW=$([ -n "$AN" ] && login "${EM[analyst]}" "${PW[analyst]}" || echo "")  # throwaway cho logout-test
[ -z "$A" ] && { echo "${R}KHONG co admin token -> dung${N}"; exit 2; }
NEWID=""
cleanup(){ [ -n "$NEWID" ] && curl -sk -o /dev/null -X DELETE -H "Authorization: Bearer $A" "$BASE/api/v1/schedules/$NEWID" 2>/dev/null
  rq "$A" GET /api/v1/schedules/; echo "$RB"|python3 -c "import sys,json
try:
 d=json.load(sys.stdin); L=d.get('schedules',d) if isinstance(d,dict) else d
 [print(x['id']) for x in L if x.get('name','').startswith('__regr')]
except: pass" 2>/dev/null | while read -r i; do [ -n "$i" ] && curl -sk -o /dev/null -X DELETE -H "Authorization: Bearer $A" "$BASE/api/v1/schedules/$i"; done; }
trap cleanup EXIT

sec "1) RBAC SCHEDULES (A01 priv-esc) — ghi chi admin, chong bypass"
if [ -n "$AN" ]; then
  rq "$AN" GET /api/v1/schedules/; hasw "200" "$RC" && pass "analyst DOC schedules" || fail "analyst DOC -> $RC"
  for v in "schedules/$FAKE" "SCHEDULES/$FAKE" "Schedules/$FAKE" "sChEdUlEs/$FAKE"; do
    c=$(wcode "$AN" PATCH "/api/v1/$v"); { [ "$c" = 401 ]||[ "$c" = 403 ]; } && pass "analyst PATCH /$v CHAN ($c)" || fail "PRIV-ESC analyst PATCH /$v -> $c"; done
  c=$(wcode "$AN" POST /api/v1/schedules/); { [ "$c" = 401 ]||[ "$c" = 403 ]; } && pass "analyst CREATE CHAN ($c)" || fail "analyst CREATE -> $c"
else warn "skip (thieu analyst token)"; fi
c=$(wcode "$A" PATCH "/api/v1/schedules/$FAKE"); hasw "200 404" "$c" && pass "admin PATCH qua auth ($c)" || fail "admin PATCH -> $c"

sec "2) RBAC WRITE DEFAULT-DENY — allow-list PASS / nhay cam BLOCK"
if [ -n "$AN" ]; then
  for ep in findings correlation/rules soar/playbooks reports remediation; do
    c=$(wcode "$AN" PATCH "/api/v1/$ep/$FAKE"); { [ "$c" != 401 ]&&[ "$c" != 403 ]&&[ "$c" != 429 ]; } && pass "analyst ghi /$ep (allow-list, $c)" || warn "/$ep -> $c"; done
  for ep in vulns assets notifications config policy/rules admin/users admin/tenants admin/api-keys supply-chain/config oscal/package; do
    c=$(wcode "$AN" PATCH "/api/v1/$ep/$FAKE"); { [ "$c" = 401 ]||[ "$c" = 403 ]; } && pass "analyst ghi /$ep CHAN ($c)" || fail "analyst ghi /$ep -> $c (phai chan)"; done
  for ep in ti/iocs ti/feeds alerts threat-hunt vsp/scans; do
    c=$(wcode "$AN" PATCH "/api/v1/$ep/$FAKE")
    if [ "$c" = 429 ]; then warn "/$ep -> 429 (rate-limit)"
    elif [ "$c" = 401 ] || [ "$c" = 403 ]; then fail "/$ep analyst BI CHAN ($c) — analyst-check PHAI cho ghi (regression)"
    else pass "/$ep analyst ghi duoc ($c, analyst-check by design)"; fi; done
else warn "skip (thieu analyst)"; fi

sec "3) AUTH & SESSION LIFECYCLE"
TT="$TW"
if [ -n "$TT" ]; then
  rq "$TT" GET /api/v1/auth/check; hasw "200" "$RC" && pass "token moi dung duoc" || warn "token moi=$RC"
  rq "$TT" POST /api/v1/auth/logout; hasw "200 204 404" "$RC" && pass "logout ($RC)" || warn "logout=$RC"
  rq "$TT" GET /api/v1/auth/check; [ "$RC" = 401 ] && pass "token thu hoi sau logout (revoke OK)" || warn "token con song sau logout ($RC)"
  rq "${TT%?}X" GET /api/v1/auth/check; [ "$RC" = 401 ] && pass "sua chu ky -> tu choi" || fail "sua chu ky -> $RC"
else warn "skip auth-lifecycle"; fi
FK=$(python3 -c "import base64,json;h=base64.urlsafe_b64encode(b'{\"alg\":\"none\"}').rstrip(b'=').decode();p=base64.urlsafe_b64encode(json.dumps({'role':'admin','exp':9999999999}).encode()).rstrip(b'=').decode();print(h+'.'+p+'.')")
rq "$FK" GET /api/v1/admin/users; [ "$RC" = 401 ] && pass "alg=none gia admin -> tu choi" || fail "alg=none -> $RC"
:  # khong can re-mint: da dung throwaway TW, AN giu nguyen

sec "4) FLOW FUNCTIONAL (create/get-by-id) + KNOWN backend bug"
CB='{"name":"__regr__","mode":"SAST","profile":"STANDARD","src":"gitlab","url":"https://gitlab.com/x/y","cron":"0 5 * * *"}'
rq "$A" POST /api/v1/schedules/ "$CB"; hasw "200 201" "$RC" && pass "CREATE ($RC)" || fail "CREATE -> $RC"; NEWID=$(echo "$RB"|jget id)
rq "$A" GET "/api/v1/schedules/$NEWID"; hasw "200" "$RC" && pass "GET-by-id tra item (persist that)" || fail "GET-by-id -> $RC"
rq "$A" GET /api/v1/schedules/; echo "$RB"|grep -q "$NEWID" && pass "co trong list" || xfail "KHONG trong list collection (seed-stub :8921)"
rq "$A" GET /api/sched/jobs; echo "$RB"|grep -q "$NEWID" && pass "co trong scheduler /api/sched" || xfail "KHONG vao /api/sched/jobs (2 he schedule roi nhau)"
rq "$A" DELETE "/api/v1/schedules/$NEWID"; hasw "200 204" "$RC" && pass "DELETE ($RC)" || fail "DELETE -> $RC"; NEWID=""

sec "5) VSP SCAN CORRECTNESS — trigger scan that + scan-health"
rq "$A" GET '/api/v1/vsp/runs?limit=5'; hasw "200" "$RC" && pass "API /vsp/runs doc duoc ($RC)" || fail "/vsp/runs -> $RC"
rq "$A" GET '/api/v1/vsp/findings?limit=5'; hasw "200" "$RC" && pass "API /vsp/findings doc duoc ($RC)" || warn "findings -> $RC"
TJOB="${SCAN_JOB:-job-seed-cve-recheck}"
rq "$A" POST "/api/sched/jobs/$TJOB/run" '{}'
if hasw "200 201 202" "$RC"; then
  RID=$(echo "$RB"|jget run_id); pass "trigger $TJOB -> $RC (run_id=$RID)"; fin=""
  for i in $(seq 1 15); do sleep 2; rq "$A" GET '/api/sched/runs?limit=30'
    fin=$(echo "$RB"|python3 -c "import sys,json
d=json.load(sys.stdin); r=[x for x in d.get('runs',[]) if x.get('id')=='$RID']
print(r[0].get('status','') if r and r[0].get('finished_at') else '')" 2>/dev/null)
    [ -n "$fin" ] && break; done
  if [ -n "$fin" ]; then pass "run $RID chay toi terminal (status=$fin)"
    rq "$A" GET '/api/sched/runs?limit=30'
    echo "$RB"|python3 -c "import sys,json
d=json.load(sys.stdin); r=[x for x in d.get('runs',[]) if x.get('id')=='$RID'][0]
err=r.get('error',''); out=r.get('output','')
print(('INFRA' if ('connection refused' in err or 'dial tcp' in err) else 'OK')+'|'+((out or err)[:70]).replace(chr(10),' '))" > /tmp/_so
    grep -q '^OK' /tmp/_so && pass "output scan sach: $(cut -d'|' -f2- /tmp/_so)" || fail "scan loi ha tang: $(cut -d'|' -f2- /tmp/_so)"
  else fail "run $RID KHONG terminal sau 30s (scheduler treo?)"; fi
else fail "trigger $TJOB -> $RC"; fi
# --- LIVE scanner assert (nguon su that: trigger target tot -> assert PASS) ---
rq "$A" GET /api/sched/jobs
SIMG=$(echo "$RB"|python3 -c "import sys,json
js=json.load(sys.stdin).get('jobs',[])
print(next((j['id'] for j in js if j.get('type')=='scan_image' and j.get('target')=='alpine:latest'),''))" 2>/dev/null)
if [ -n "$SIMG" ]; then
  rq "$A" POST "/api/sched/jobs/$SIMG/run" '{}'
  if hasw "200 201 202" "$RC"; then
    RID=$(echo "$RB"|jget run_id); fin=""
    for i in $(seq 1 40); do sleep 3; rq "$A" GET '/api/sched/runs?limit=80'
      fin=$(echo "$RB"|python3 -c "import sys,json
d=json.load(sys.stdin); r=[x for x in d.get('runs',[]) if x.get('id')=='$RID']
s=str(r[0].get('status','')).lower() if r else ''
print(s if s in ('pass','fail','success','error','done','completed') else '')" 2>/dev/null)
      [ -n "$fin" ] && break; done
    [ "$fin" = "pass" ] && pass "LIVE scan_image(alpine:latest)=pass" || fail "LIVE scan_image(alpine:latest)=${fin:-timeout}"
  else fail "trigger scan_image -> $RC"; fi
else warn "khong co job scan_image target alpine:latest de assert live"; fi
rq "$A" POST '/api/sched/jobs/job-seed-cosign-verify/run' '{}'
if hasw "200 201 202" "$RC"; then
  RID=$(echo "$RB"|jget run_id); fin=""
  for i in $(seq 1 40); do sleep 3; rq "$A" GET '/api/sched/runs?limit=80'
    fin=$(echo "$RB"|python3 -c "import sys,json
d=json.load(sys.stdin); r=[x for x in d.get('runs',[]) if x.get('id')=='$RID']
s=str(r[0].get('status','')).lower() if r else ''
print(s if s in ('pass','fail','success','error','done','completed') else '')" 2>/dev/null)
    [ -n "$fin" ] && break; done
  [ "$fin" = "pass" ] && pass "LIVE verify_image(cosign seed)=pass" || fail "LIVE verify_image=${fin:-timeout}"
else fail "trigger verify_image -> $RC"; fi

rq "$A" GET /api/sched/jobs
echo "$RB"|python3 -c "import sys,json
from collections import defaultdict
jobs=json.load(sys.stdin).get('jobs',[]); a=defaultdict(lambda:[0,0])
for j in jobs: t=j.get('type','?'); a[t][0]+=j.get('run_count',0); a[t][1]+=j.get('success_count',0)
for t in sorted(a): rn,sc=a[t]; print(t+'|'+('%.1f'%(100*sc/rn if rn else 0))+'|'+str(rn))" > /tmp/_sh
while IFS='|' read -r t rate rn; do
  ok=$(awk "BEGIN{print ($rate>=80)?1:0}")
  case "$t" in
    cve_recheck|sbom_export) [ "$ok" = 1 ] && pass "scan-health $t=${rate}% ($rn runs)" || fail "scan-health $t SUT ${rate}% (regression)" ;;
    scan_image|verify_image) [ "$ok" = 1 ] && pass "scan-health $t=${rate}% (lifetime)" || warn "scan-health $t=${rate}% ($rn runs) — lifetime o nhiem su co cu; xem LIVE-assert tren" ;;
    *) pass "scan-health $t=${rate}%" ;;
  esac
done < /tmp/_sh

echo; echo "${D}========================================${N}"; echo "  PASS=$P FAIL=$F WARN=$W XFAIL=$X"
[ "$F" -gt 0 ] && { echo "${R}REGRESSION:${N}"; for l in "${FAILS[@]}"; do echo "   - $l"; done; }
echo
if [ "$F" -eq 0 ]; then echo "${G}REGRESSION SUITE: PASS${N} (XFAIL=$X = bug backend mo, theo doi rieng)"; exit 0
else echo "${R}REGRESSION SUITE: FAIL${N}"; exit 1; fi

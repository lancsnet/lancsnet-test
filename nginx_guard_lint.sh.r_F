#!/usr/bin/env bash
# Chong tai phat path-confusion tren write-guard. Exit 1 neu vi pham (dung trong CI).
set -u
CONF="${1:-/etc/nginx/sites-available/vsp.linksafe.vn}"
ALLOW="${ALLOW:-__NO_ALLOW__}"   # regex cac dong mien tru (read-only co chu dich); de rong neu khong co
fail=0

# (A) API regex guard case-sensitive -> phai ~* (neu khong: UPPER guard-miss)
a=$(grep -nE 'location[[:space:]]+~[[:space:]]+\^/api/' "$CONF" | grep -vE "$ALLOW")
[ -n "$a" ] && { echo "FAIL [A] API guard case-sensitive (phai ~*):"; echo "$a"; echo; fail=1; }

# (B) API guard anchored '$' thieu '/?' -> lo trailing-slash
b=$(grep -nE 'location[[:space:]]+~\*?[[:space:]]+\^/api/.*[^?]\$[[:space:]]*\{' "$CONF" | grep -vE "$ALLOW")
[ -n "$b" ] && { echo "FAIL [B] API guard anchored thieu /? (lo trailing-slash):"; echo "$b"; echo; fail=1; }

# (C) WARN: exact '=' /api guard -> trailing-slash bypassable tru khi co prefix backstop. Review/verify bang bypass.py.
c=$(grep -nE 'location[[:space:]]+=[[:space:]]+/api/' "$CONF" | grep -vE "$ALLOW")
[ -n "$c" ] && { echo "WARN [C] exact '=' /api guard — verify backstop hoac doi sang ~* ^...(/?)\$:"; echo "$c"; echo; }

# (D) Canon ;param-strip server-level phai con
grep -q 'ROUND4_CANON' "$CONF" || { echo "FAIL [D] thieu ;param-strip canon (ROUND4_CANON)"; fail=1; }

# (E) ROUND12 default-deny backstop phai con (chong mo lai default-open)
grep -qE 'location[[:space:]]+/api/[[:space:]]*\{' "$CONF" || { echo "FAIL [E] thieu default-deny backstop (location /api/ ROUND12)"; fail=1; }
# (F) ROUND-F: location proxy_pass app-backend thieu auth_request.
#     non-gateway (vd :8092 kieu findings 517, service rieng khong tu verify) -> FAIL.
#     gateway :8921 (tu verify sig) -> WARN de review.
f_out=$(awk '
function emit(){
  if (loc!="" && hasapp && !hasauth && !isint && loc !~ /(auth\/login|auth\/refresh|auth\/logout|\/health|^@|^\/$)/) {
    if (port=="8921") print "WARNF " loc " " port; else print "FAILF " loc " " port
  }
}
{
  line=$0
  if (!inloc && line ~ /location[ \t]/ && line ~ /\{/) {
    inloc=1; ldepth=0
    loc=line; sub(/^[ \t]*location[ \t]+/,"",loc); sub(/[ \t]*\{.*/,"",loc)
    hasapp=0; hasauth=0; isint=0; port=""
  }
  if (inloc) {
    if (line ~ /auth_request/) hasauth=1
    if (line ~ /[ \t]internal;/) isint=1
    if (line ~ /proxy_pass[ \t]+http:\/\/127\.0\.0\.1:8/ && line !~ /:(8950|8960)/) {
      hasapp=1; pl=line; sub(/.*127\.0\.0\.1:/,"",pl); sub(/[^0-9].*/,"",pl); port=pl
    }
    o=line; n=gsub(/\{/,"",o); m=gsub(/\}/,"",o); ldepth += n - m
    if (ldepth<=0) { emit(); inloc=0 }
  }
}
' "$CONF")
ff=$(printf "%s\n" "$f_out" | grep "^FAILF" | sed "s/^FAILF /    UNGATED(non-gateway) -> location /")
fw=$(printf "%s\n" "$f_out" | grep "^WARNF" | sed "s/^WARNF /    ungated(gateway,review) -> location /")
[ -n "$ff" ] && { echo "FAIL [F] location proxy_pass non-gateway thieu auth_request:"; echo "$ff"; echo; fail=1; }
[ -n "$fw" ] && { echo "WARN [F] location proxy_pass gateway (:8921) thieu auth_request (gateway tu verify; review):"; echo "$fw"; echo; }

[ "$fail" -eq 0 ] && echo "LINT OK: guard convention dat."
exit $fail

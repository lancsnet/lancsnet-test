#!/bin/bash
ALOG=/var/log/vsp-scanner-watchdog.log
pup(){ ss -ltnH 2>/dev/null | awk '{print $4}' | grep -qE ":$1\$"; }
fix(){ local label=$1 unit=$2 port=$3 ok=1
  if [ -n "$port" ]; then pup "$port" || ok=0; else [ "$(systemctl is-active "$unit")" = active ] || ok=0; fi
  [ $ok -eq 1 ] && return 0
  local m="VSP ALERT: $label ($unit${port:+ :$port}) DOWN — restarting"
  logger -t vsp-watchdog -p daemon.err "$m"; echo "$(date -u +%FT%TZ) $m" >>"$ALOG"
  systemctl restart "$unit"; sleep 3; local ok2=1
  if [ -n "$port" ]; then pup "$port" || ok2=0; else [ "$(systemctl is-active "$unit")" = active ] || ok2=0; fi
  if [ $ok2 -eq 1 ]; then logger -t vsp-watchdog -p daemon.warning "VSP RECOVER: $label"; echo "$(date -u +%FT%TZ) RECOVER $label" >>"$ALOG"
  else logger -t vsp-watchdog -p daemon.err "VSP CRIT: $label van DOWN"; echo "$(date -u +%FT%TZ) CRIT $label van DOWN" >>"$ALOG"; fi; }
fix scan-api  vsp-scan-api.service     8090
fix cosign    vsp-sc.service           8091
fix scheduler vsp-sched.service  8092
fix gateway   vsp-gateway.service      8921
fix siem-api  vsp-siem-api.service
fix ueba-api  vsp-ueba-api.service

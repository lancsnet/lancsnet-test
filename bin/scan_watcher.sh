#!/bin/bash
# Watch for completed scans and auto-remediate
LAST_RID=""
LOG="/var/log/vsp_auto_remediate.log"

while true; do
  TOKEN=$(curl -s -X POST http://localhost:8921/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"scanner@lancs.local","password":"Scanner2026!"}' \
    | python3 -c "import sys,json; print(json.load(sys.stdin).get('token',''))" 2>/dev/null)

  # Get latest completed run
  LATEST=$(curl -s "http://localhost:8921/api/v1/vsp/runs/index?limit=1" \
    -H "Authorization: Bearer $TOKEN" 2>/dev/null)
  
  RID=$(echo $LATEST | python3 -c "
import sys,json
d=json.load(sys.stdin)
runs=d.get('runs',[])
if runs and runs[0].get('status') in ['PASS','FAIL']:
    print(runs[0].get('rid',''))
else:
    print('')
" 2>/dev/null)

  if [ -n "$RID" ] && [ "$RID" != "$LAST_RID" ]; then
    FINDINGS=$(curl -s "http://localhost:8921/api/v1/vsp/run/$RID" \
      -H "Authorization: Bearer $TOKEN" | python3 -c "
import sys,json; d=json.load(sys.stdin); print(d.get('total_findings',0))")
    
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] New run: $RID findings=$FINDINGS" | tee -a $LOG
    
    if [ "$FINDINGS" -gt "0" ]; then
      echo "[$(date '+%Y-%m-%d %H:%M:%S')] Auto-remediating..." | tee -a $LOG
      TOKEN=$TOKEN RID=$RID bash /home/devsecops/vsp-platform-v4.9.0/bin/auto_remediate.sh 2>&1 | tee -a $LOG
    else
      echo "[$(date '+%Y-%m-%d %H:%M:%S')] Clean! No remediation needed." | tee -a $LOG
    fi
    
    LAST_RID=$RID
  fi
  
  sleep 30
done

#!/bin/bash
# Auto-remediation script - runs after each scan

TOKEN=$(curl -s -X POST http://localhost:8921/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"automation@lancs.local","password":"AutoTest2026!"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin).get('token',''))")

# Get latest run
LATEST=$(curl -s "http://localhost:8921/api/v1/vsp/run/latest" \
  -H "Authorization: Bearer $TOKEN")
RID=$(echo $LATEST | python3 -c "import sys,json; print(json.load(sys.stdin).get('rid',''))")
GATE=$(echo $LATEST | python3 -c "import sys,json; print(json.load(sys.stdin).get('gate',''))")
FINDINGS=$(echo $LATEST | python3 -c "import sys,json; print(json.load(sys.stdin).get('total_findings',0))")

echo "[AUTO-FIX] RID=$RID GATE=$GATE FINDINGS=$FINDINGS"

if [ "$FINDINGS" -gt "0" ]; then
  # Get findings and create tasks
  curl -s "http://localhost:8921/api/v1/vsp/findings?run_id=$RID&limit=10" \
    -H "Authorization: Bearer $TOKEN" | python3 -c "
import sys,json,subprocess,os
d=json.load(sys.stdin)
token=os.environ.get('TOKEN','')
for f in d.get('findings',[]):
    fid=f.get('id')
    sev=f.get('severity')
    rule=f.get('rule_id')
    path=f.get('path','')
    print(f'[AUTO-FIX] Creating task for {sev} {rule}')
    # Create task
    import urllib.request
    req=urllib.request.Request(
        'http://localhost:8921/api/v1/cicd/task/create',
        data=json.dumps({'action':f'Auto-fix {rule}','owner':'AutoFix-Bot','severity':sev,'record_id':fid,'evidence_path':path}).encode(),
        headers={'Content-Type':'application/json','Authorization':'Bearer '+token},
        method='POST'
    )
    resp=urllib.request.urlopen(req).read()
    print('[AUTO-FIX] Task:', json.loads(resp).get('task_id'))
" TOKEN=$TOKEN

  # Create PR
  curl -s -X POST "http://localhost:8921/api/v1/cicd/autofix/create-pr" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"branch\":\"autofix/$(date +%Y%m%d-%H%M%S)\",\"message\":\"AutoFix: $FINDINGS findings from $RID\"}" \
    | python3 -c "import sys,json; d=json.load(sys.stdin); print('[AUTO-FIX] PR:', d.get('pr',{}).get('id'))"

  echo "[AUTO-FIX] Done! Check CI/CD panel for results."
else
  echo "[AUTO-FIX] CLEAN - no findings to fix!"
fi

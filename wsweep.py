import urllib.request,ssl,json,time
ctx=ssl._create_unverified_context()
BASE="https://127.0.0.1:30800"
ROLES=["admin","analyst","dev","qa","auditor"]
DUMMY="00000000-0000-0000-0000-000000000000"
TOK={}
for r in ROLES:
    try:TOK[r]=open("/tmp/tok_"+r).read().strip()
    except:TOK[r]=""
EXP={"ADMIN":{"admin"},"AUTH":set(ROLES),"SOC":{"admin","analyst"},
"FIND":{"admin","analyst"},"CICD":{"admin","dev","analyst"},
"AI":{"admin","analyst","dev"},"TH":{"admin","analyst"},
"SC":{"admin","analyst"},"COMP":{"admin"},"CSPM":{"admin","analyst"},
"ASSET":{"admin","analyst"},"RUN":{"admin","analyst","dev"},"GEN":{"admin"}}
LINES=[
"DELETE /api/p4/zt/microseg/{id} GEN|DELETE /api/v1/admin/api-keys/{id} ADMIN|DELETE /api/v1/admin/users ADMIN|DELETE /api/v1/admin/users/{id} ADMIN|DELETE /api/v1/agents/{id} AI|DELETE /api/v1/correlation/rules/{id} SOC|DELETE /api/v1/cspm/accounts/{id} CSPM|DELETE /api/v1/logs/sources/{id} TH|DELETE /api/v1/oscal/documents/{id} COMP|DELETE /api/v1/software-inventory/blacklist/{id} ASSET|DELETE /api/v1/threat-hunt/queries TH|DELETE /api/v1/threat-hunt/queries/{id} TH|DELETE /api/v1/vsp/batch/{id} RUN|DELETE /api/v1/vsp/findings/{id} FIND|DELETE /api/v1/vsp/sandbox/clear RUN|PATCH /api/p4/pipeline/schedules/{id}/toggle CICD|PATCH /api/v1/admin/api-keys/{id} ADMIN|PATCH /api/v1/admin/users ADMIN|PATCH /api/v1/admin/users/{id} ADMIN|PATCH /api/v1/conmon/schedules CICD|PATCH /api/v1/conmon/schedules/{id} CICD|PATCH /api/v1/logs/sources/{id} TH|PATCH /api/v1/policy/rules/{id} GEN|PATCH /api/v1/schedules/{id}/toggle CICD|PATCH /api/v1/soar/playbooks/{id} SOC|PATCH /api/v1/sso/providers/{id} ADMIN|PATCH /api/v1/supply-chain/vex/{id} SC|PATCH /api/v1/threat-hunt/queries TH",
"PATCH /api/v1/threat-hunt/queries/{id} TH|POST /api/p4/attestation/sign COMP|POST /api/p4/circia/generate COMP|POST /api/p4/circia/submit COMP|POST /api/p4/control/pass COMP|POST /api/p4/forensics/custody SOC|POST /api/p4/forensics/evidence SOC|POST /api/p4/ir/incident SOC|POST /api/p4/ir/incident/create SOC|POST /api/p4/ir/incident/lessons SOC|POST /api/p4/ir/incident/ransom-payment SOC|POST /api/p4/ir/incident/transition SOC|POST /api/p4/ir/incident/update SOC|POST /api/p4/ir/playbook/execute SOC|POST /api/p4/pipeline/schedules/{id}/run CICD|POST /api/p4/rmf/task COMP|POST /api/p4/ssdf/assessment COMP|POST /api/p4/ssdf/practice/update COMP|POST /api/p4/vex SC|POST /api/p4/vn-standards/update COMP|POST /api/p4/zt/api-policy GEN|POST /api/p4/zt/assess GEN|POST /api/p4/zt/microseg GEN|POST /api/v1/admin/api-keys ADMIN|POST /api/v1/admin/tenants ADMIN|POST /api/v1/admin/users ADMIN|POST /api/v1/admin/users/bulk-role ADMIN|POST /api/v1/admin/users/invite ADMIN",
"POST /api/v1/agentic/run AI|POST /api/v1/agents/enroll AI|POST /api/v1/agents/heartbeat AI|POST /api/v1/agents/inventory AI|POST /api/v1/ai/advise AI|POST /api/v1/ai/analyze/findings AI|POST /api/v1/ai/chat AI|POST /api/v1/ai/feedback/{id} AI|POST /api/v1/alerts/notify SOC|POST /api/v1/alerts/webhooks/test SOC|POST /api/v1/assets ASSET|POST /api/v1/audit/repair GEN|POST /api/v1/audit/rotate GEN|POST /api/v1/audit/verify GEN|POST /api/v1/auth/mfa/setup AUTH|POST /api/v1/autofix/pr/create AI|POST /api/v1/autofix/repo/register AI|POST /api/v1/autofix/validation/run AI|POST /api/v1/cato/toggle GEN|POST /api/v1/cicd/autofix/create-pr AI|POST /api/v1/cicd/autofix/rescan AI|POST /api/v1/cicd/config/update CICD|POST /api/v1/cicd/platform-profiles CICD|POST /api/v1/cicd/pr-gate/evaluate CICD|POST /api/v1/cicd/remediation/task FIND|POST /api/v1/cicd/schedules CICD|POST /api/v1/cicd/schedules/run-now CICD|POST /api/v1/cisa-attestation/forms COMP",
"POST /api/v1/cisa-attestation/forms/{id}/sign COMP|POST /api/v1/conmon/deviations/{id}/acknowledge COMP|POST /api/v1/conmon/schedules CICD|POST /api/v1/correlation/incidents SOC|POST /api/v1/correlation/incidents/{id}/resolve SOC|POST /api/v1/correlation/rules SOC|POST /api/v1/correlation/rules/{id}/toggle SOC|POST /api/v1/cspm/accounts CSPM|POST /api/v1/cspm/accounts/{id}/sync CSPM|POST /api/v1/data/erasure GEN|POST /api/v1/data/erasure/{id}/cancel GEN|POST /api/v1/data/export GEN|POST /api/v1/governance/evidence/{id}/freeze GEN|POST /api/v1/grafana/config GEN|POST /api/v1/import/policies GEN|POST /api/v1/import/users ADMIN|POST /api/v1/integrations/jira GEN|POST /api/v1/integrations/jira/create GEN|POST /api/v1/integrations/jira/test GEN|POST /api/v1/integrations/jira/test-ticket GEN|POST /api/v1/integrations/slack GEN|POST /api/v1/integrations/slack/test GEN|POST /api/v1/integrations/slack/test-pr-comment GEN|POST /api/v1/locale GEN|POST /api/v1/logs/sources TH|POST /api/v1/logs/sources/{id}/test TH|POST /api/v1/notifications/test GEN|POST /api/v1/oscal/documents/{id}/publish COMP",
"POST /api/v1/poam/sync COMP|POST /api/v1/remediation/auto FIND|POST /api/v1/remediation/bulk FIND|POST /api/v1/remediation/finding/{id}/transition FIND|POST /api/v1/remediation/{id}/comments FIND|POST /api/v1/reports/generate GEN|POST /api/v1/scan/all-modes RUN|POST /api/v1/security/disclose GEN|POST /api/v1/security/disclosures/{id}/transition GEN|POST /api/v1/settings/import GEN|POST /api/v1/settings/tool-config/reset GEN|POST /api/v1/siem/webhooks TH|POST /api/v1/siem/webhooks/{id}/test TH|POST /api/v1/soar/approvals/{id}/decide SOC|POST /api/v1/soar/playbooks SOC|POST /api/v1/soar/playbooks/{id}/execute SOC|POST /api/v1/soar/playbooks/{id}/run SOC|POST /api/v1/soar/playbooks/{id}/test SOC|POST /api/v1/soar/playbooks/{id}/toggle SOC|POST /api/v1/soar/playbooks/{id}/version/{id}/rollback SOC|POST /api/v1/soar/runs/{id}/cancel SOC|POST /api/v1/soar/secrets/{id}/rotate SOC|POST /api/v1/soar/trigger SOC|POST /api/v1/software-inventory/blacklist ASSET|POST /api/v1/software-inventory/whitelist ASSET|POST /api/v1/supply-chain/key/rotate SC|POST /api/v1/supply-chain/sign SC|POST /api/v1/supply-chain/signatures/{id}/verify SC",
"POST /api/v1/supply-chain/verify SC|POST /api/v1/supply-chain/vex SC|POST /api/v1/sw/report GEN|POST /api/v1/threat-hunt/queries TH|POST /api/v1/threat-hunt/queries/{id}/run TH|POST /api/v1/ti/enrich/batch TH|POST /api/v1/ti/feeds/sync TH|POST /api/v1/ti/iocs TH|POST /api/v1/ti/kev/refresh TH|POST /api/v1/ti/secret/check TH|POST /api/v1/ueba/analyze TH|POST /api/v1/vsp/batch RUN|POST /api/v1/vsp/findings/bulk/accept FIND|POST /api/v1/vsp/findings/bulk/vex FIND|POST /api/v1/vsp/run RUN|POST /api/v1/vsp/run/full-soc RUN|POST /api/v1/vsp/sandbox/test-fire RUN|POST /api/v1/vulns/bulk FIND|POST /api/v1/vulns/bulk/undo FIND|PUT /api/v1/admin/tenants/{id}/plan ADMIN|PUT /api/v1/settings/tool-config GEN|PUT /api/v1/sso/config ADMIN",
]
DATA="|".join(LINES)
W=[]
for t in DATA.split("|"):
    t=t.strip()
    if not t:continue
    a=t.split(" ")
    W.append((a[0],a[1],a[2]))
assert len(W)==162,"PASTE INCOMPLETE: got %d/162 - re-paste"%len(W)
def call(m,p,tok):
    url=BASE+p.replace("{id}",DUMMY)
    req=urllib.request.Request(url,method=m,data=b"{}",
      headers={"Authorization":"Bearer "+tok,"Content-Type":"application/json"})
    try:return urllib.request.urlopen(req,context=ctx,timeout=12).status
    except urllib.error.HTTPError as e:return e.code
    except Exception:return -1
def call2(m,p,tok):
    s=call(m,p,tok)
    if s==429:
        time.sleep(1.2);s=call(m,p,tok)
    return s
crit=[];rev=[];allrows=[];r429=0
for m,p,cat in W:
    st={}
    for r in ROLES:
        st[r]=call2(m,p,TOK[r]);time.sleep(0.05)
        if st[r]==429:r429+=1
    allow={r for r in ROLES if st[r] not in (401,403,429,-1)}
    over=allow-EXP.get(cat,{"admin"})
    allrows.append((m,p,cat,allow,st))
    if not over:continue
    hard=over&{"auditor","qa"} or (cat=="ADMIN" and over)
    (crit if hard else rev).append((m,p,cat,sorted(over),st))
out=open("/tmp/wsweep_out.txt","w")
for m,p,cat,allow,st in allrows:
    out.write("%-6s %-52s %-5s allow=%s st=%s\n"%(m,p,cat,sorted(allow),st))
out.close()
print("=== WRITE SWEEP: %d endpoints x5 roles (429 still=%d) ==="%(len(W),r429))
print("full matrix -> /tmp/wsweep_out.txt")
print("")
print("### CRITICAL (auditor/qa write, or non-admin on ADMIN): %d"%len(crit))
for m,p,cat,over,st in crit:
    print("  %-6s %-46s [%s] over=%s st=%s"%(m,p,cat,",".join(over),st))
print("")
print("### REVIEW (dev/analyst outside expected): %d"%len(rev))
for m,p,cat,over,st in rev:
    print("  %-6s %-46s [%s] over=%s"%(m,p,cat,",".join(over)))

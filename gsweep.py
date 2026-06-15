import urllib.request,ssl,time
ctx=ssl._create_unverified_context()
BASE="https://127.0.0.1:30800"
ROLES=["admin","analyst","dev","qa","auditor"]
DUMMY="00000000-0000-0000-0000-000000000000"
TOK={}
for r in ROLES:
    try:TOK[r]=open("/tmp/tok_"+r).read().strip()
    except:TOK[r]=""
EXP={"ADMIN":{"admin"},"AN":{"admin","analyst"},
"PIPE":{"admin","analyst","auditor","dev"},
"RC":{"admin","analyst","auditor"},
"ANY":{"admin","analyst","dev","qa","auditor"}}
LINES=[
"/api/p4/ato/expiry RC|/api/p4/attestation/generate RC|/api/p4/attestation/list RC|/api/p4/circia/report/detail RC|/api/p4/circia/reports RC|/api/p4/forensics/custody RC|/api/p4/forensics/evidence RC|/api/p4/ir/forensics RC|/api/p4/ir/incidents RC|/api/p4/ir/playbooks RC|/api/p4/oscal/ap RC|/api/p4/oscal/ar RC|/api/p4/oscal/assessment-plan RC|/api/p4/oscal/assessment-results RC|/api/p4/oscal/catalog RC|/api/p4/oscal/component RC|/api/p4/oscal/poam RC|/api/p4/oscal/poam-extended RC|/api/p4/oscal/profile RC|/api/p4/oscal/ssp RC|/api/p4/oscal/ssp/extended RC|/api/p4/oscal/{id} RC|/api/p4/pipeline/latest RC|/api/p4/pipeline/schedules RC|/api/p4/rmf RC|/api/p4/rmf/ato-letter RC|/api/p4/rmf/conmon RC|/api/p4/rmf/poam RC|/api/p4/rmf/trend RC|/api/p4/sbom/view RC|/api/p4/sbom/view-db RC|/api/p4/ssdf/practices RC|/api/p4/vex RC|/api/p4/vn-standards RC|/api/p4/zt/api-policy RC|/api/p4/zt/microseg RC|/api/p4/zt/rasp RC|/api/p4/zt/rasp/coverage RC|/api/p4/zt/sbom RC|/api/p4/zt/status RC|/api/v1/admin/api-keys ADMIN|/api/v1/admin/audit ADMIN|/api/v1/admin/permissions ADMIN|/api/v1/admin/roles ADMIN|/api/v1/admin/tenants ADMIN",
"/api/v1/admin/users ADMIN|/api/v1/admin/users/{id} ADMIN|/api/v1/agentic/sessions RC|/api/v1/agentic/stats RC|/api/v1/agentic/trace/{id} RC|/api/v1/agents ANY|/api/v1/agents/{id} ANY|/api/v1/ai/cache/stats ANY|/api/v1/ai/mode ANY|/api/v1/alerts/webhooks AN|/api/v1/analytics/export RC|/api/v1/analytics/summary RC|/api/v1/analytics/trends RC|/api/v1/api-keys ANY|/api/v1/assets RC|/api/v1/assets/stats RC|/api/v1/assets/summary RC|/api/v1/assets/{id} RC|/api/v1/assets/{id}/findings RC|/api/v1/attack/heatmap ANY|/api/v1/audit ANY|/api/v1/audit/bundle ANY|/api/v1/audit/compliance-evidence ANY|/api/v1/audit/log ANY|/api/v1/audit/logs ANY|/api/v1/audit/monthly ANY|/api/v1/audit/stats ANY|/api/v1/auth/check ANY|/api/v1/auth/logout ANY|/api/v1/autofix/config ANY|/api/v1/autofix/leaderboard ANY|/api/v1/autofix/metrics ANY|/api/v1/autofix/pr/list ANY|/api/v1/autofix/precompute/history ANY|/api/v1/autofix/precompute/status ANY|/api/v1/autofix/prs ANY|/api/v1/autofix/repo/list ANY|/api/v1/autofix/repos ANY|/api/v1/autofix/validation-stats ANY|/api/v1/autofix/validation/ac7b08a25a7ed28f5b331521da9b35ec6e8fba969f77896fc9b3566d4768025f ANY|/api/v1/autofix/validation/stats ANY|/api/v1/autofix/validation/{id} ANY|/api/v1/billing/status ANY|/api/v1/cato ANY|/api/v1/cicd/autofix/queue PIPE",
"/api/v1/cicd/autofix/status PIPE|/api/v1/cicd/config/get PIPE|/api/v1/cicd/gate/config PIPE|/api/v1/cicd/platform-profiles PIPE|/api/v1/cicd/platform-profiles/health PIPE|/api/v1/cicd/platform-profiles/{id}/template PIPE|/api/v1/cicd/pr-gate PIPE|/api/v1/cicd/pr-gate/evals PIPE|/api/v1/cicd/pr-gate/health PIPE|/api/v1/cicd/queue PIPE|/api/v1/cicd/run-history PIPE|/api/v1/cicd/run-history/health PIPE|/api/v1/cicd/run-history/latest PIPE|/api/v1/cicd/schedules PIPE|/api/v1/cicd/schedules/health PIPE|/api/v1/cicd/status PIPE|/api/v1/cicd/tools PIPE|/api/v1/cisa-attestation/forms/{id} RC|/api/v1/cisa-attestation/kpis RC|/api/v1/cisa-attestation/list RC|/api/v1/cisa-attestation/practices RC|/api/v1/cisa-attestation/ssdf/draft RC|/api/v1/compliance/cmmc RC|/api/v1/compliance/evidence RC|/api/v1/compliance/evidence/{id} RC|/api/v1/compliance/fedramp RC|/api/v1/compliance/oscal/ar RC|/api/v1/compliance/oscal/poam RC|/api/v1/compliance/ssp.md RC|/api/v1/config ANY|/api/v1/conmon/cadence RC|/api/v1/conmon/deviations RC|/api/v1/conmon/runs RC|/api/v1/conmon/schedules RC|/api/v1/conmon/score RC|/api/v1/conmon/score/trend RC|/api/v1/correlation/incidents RC|/api/v1/correlation/incidents/stats RC|/api/v1/correlation/incidents/{id} RC|/api/v1/correlation/rules RC|/api/v1/correlation/rules/{id} RC|/api/v1/cspm/accounts RC|/api/v1/cspm/config RC|/api/v1/cspm/findings RC|/api/v1/cspm/posture RC",
"/api/v1/cicd/autofix/status PIPE|/api/v1/cicd/config/get PIPE|/api/v1/cicd/gate/config PIPE|/api/v1/cicd/platform-profiles PIPE|/api/v1/cicd/platform-profiles/health PIPE|/api/v1/cicd/platform-profiles/{id}/template PIPE|/api/v1/cicd/pr-gate PIPE|/api/v1/cicd/pr-gate/evals PIPE|/api/v1/cicd/pr-gate/health PIPE|/api/v1/cicd/queue PIPE|/api/v1/cicd/run-history PIPE|/api/v1/cicd/run-history/health PIPE|/api/v1/cicd/run-history/latest PIPE|/api/v1/cicd/schedules PIPE|/api/v1/cicd/schedules/health PIPE|/api/v1/cicd/status PIPE|/api/v1/cicd/tools PIPE|/api/v1/cisa-attestation/forms/{id} RC|/api/v1/cisa-attestation/kpis RC|/api/v1/cisa-attestation/list RC|/api/v1/cisa-attestation/practices RC|/api/v1/cisa-attestation/ssdf/draft RC|/api/v1/compliance/cmmc RC|/api/v1/compliance/evidence RC|/api/v1/compliance/evidence/{id} RC|/api/v1/compliance/fedramp RC|/api/v1/compliance/oscal/ar RC|/api/v1/compliance/oscal/poam RC|/api/v1/compliance/ssp.md RC|/api/v1/config ANY|/api/v1/conmon/cadence RC|/api/v1/conmon/deviations RC|/api/v1/conmon/runs RC|/api/v1/conmon/schedules RC|/api/v1/conmon/score RC|/api/v1/conmon/score/trend RC|/api/v1/correlation/incidents RC|/api/v1/correlation/incidents/stats RC|/api/v1/correlation/incidents/{id} RC|/api/v1/correlation/rules RC|/api/v1/correlation/rules/{id} RC|/api/v1/cspm/accounts RC|/api/v1/cspm/config RC|/api/v1/cspm/findings RC|/api/v1/cspm/posture RC",
"/api/v1/cwpp/config RC|/api/v1/data/exports/{id} ANY|/api/v1/data/requests ANY|/api/v1/dora ANY|/api/v1/drift ANY|/api/v1/export/csv/{id} ANY|/api/v1/export/json/{id} ANY|/api/v1/export/sarif/{id} ANY|/api/v1/features/soar/config RC|/api/v1/findings/{id}/diff ANY|/api/v1/findings/{id}/sarif ANY|/api/v1/governance/effectiveness RC|/api/v1/governance/evidence RC|/api/v1/governance/ownership RC|/api/v1/governance/raci RC|/api/v1/governance/risk-register RC|/api/v1/governance/rule-overrides RC|/api/v1/governance/traceability RC|/api/v1/grafana/config ANY|/api/v1/improvement/quarters ANY|/api/v1/integrations ADMIN|/api/v1/integrations/virustotal/stats ADMIN|/api/v1/kpi/sanity ANY|/api/v1/locale ANY|/api/v1/logs/hunt RC|/api/v1/logs/network-flow RC|/api/v1/logs/sources RC|/api/v1/logs/sources/{id} RC|/api/v1/logs/stats RC|/api/v1/nist-csf/profile ANY|/api/v1/notifications ANY|/api/v1/notifications/dlq ANY|/api/v1/notifications/log ANY|/api/v1/observability/config ANY|/api/v1/oscal/documents RC|/api/v1/oscal/documents/{id} RC|/api/v1/oscal/package RC|/api/v1/policy/rules ANY|/api/v1/policy/rules/{id} ANY|/api/v1/rbac/matrix ANY|/api/v1/recognition/ccpa-mapping RC|/api/v1/recognition/hitrust-mapping RC|/api/v1/recognition/iso27001-mapping RC|/api/v1/recognition/nis2-mapping RC|/api/v1/recognition/pci-dss-mapping RC",
"/api/v1/recognition/soc2-readiness RC|/api/v1/remediation ANY|/api/v1/remediation/finding/{id} ANY|/api/v1/remediation/finding/{id}/history ANY|/api/v1/remediation/kpis ANY|/api/v1/remediation/stats ANY|/api/v1/reports/history ANY|/api/v1/reports/templates ANY|/api/v1/residency/config RC|/api/v1/residency/violations RC|/api/v1/runs/{id}/provenance ANY|/api/v1/runs/{id}/provenance/verify ANY|/api/v1/sbom RC|/api/v1/sbom/config RC|/api/v1/sbom/signatures RC|/api/v1/sbom/{id} RC|/api/v1/sbom/{id}/diff RC|/api/v1/sbom/{id}/vex RC|/api/v1/scanners/health ANY|/api/v1/security/disclosures ANY|/api/v1/security/disclosures/{id} ANY|/api/v1/settings/dast-targets ANY|/api/v1/settings/export ANY|/api/v1/settings/sbom RC|/api/v1/settings/scan-config ANY|/api/v1/settings/tool-config ANY|/api/v1/siem/webhooks RC|/api/v1/siem/webhooks/{id} RC|/api/v1/soar/approvals RC|/api/v1/soar/approvals/pending RC|/api/v1/soar/playbooks RC|/api/v1/soar/playbooks/{id} RC|/api/v1/soar/playbooks/{id}/versions RC|/api/v1/soar/runs RC|/api/v1/soar/runs/{id} RC|/api/v1/soar/secrets/audit RC|/api/v1/soar/secrets/config RC|/api/v1/soar/secrets/summary RC|/api/v1/soar/secrets/{id} RC|/api/v1/soar/tickets RC|/api/v1/soc/detection RC|/api/v1/soc/framework-scorecard RC|/api/v1/soc/incidents RC|/api/v1/soc/release-governance RC|/api/v1/soc/roadmap RC",
"/api/v1/soc/supply-chain RC|/api/v1/soc/zero-trust RC|/api/v1/software-inventory RC|/api/v1/software-inventory/blacklist RC|/api/v1/software-inventory/cracks RC|/api/v1/software-inventory/eol RC|/api/v1/software-inventory/eol-database RC|/api/v1/software-inventory/hash-check RC|/api/v1/software-inventory/inventory RC|/api/v1/software-inventory/licenses RC|/api/v1/software-inventory/policy RC|/api/v1/software-inventory/report RC|/api/v1/software-inventory/scan-history RC|/api/v1/software-inventory/stats RC|/api/v1/software-inventory/warning RC|/api/v1/software-inventory/whitelist RC|/api/v1/software-inventory/{id} RC|/api/v1/sso/config ADMIN|/api/v1/sso/providers ADMIN|/api/v1/sso/providers/{id} ADMIN|/api/v1/status ANY|/api/v1/supply-chain/config ANY|/api/v1/supply-chain/key ANY|/api/v1/supply-chain/kpis ANY|/api/v1/supply-chain/provenance ANY|/api/v1/supply-chain/sbom RC|/api/v1/supply-chain/signatures ANY|/api/v1/supply-chain/signatures/{id} ANY|/api/v1/supply-chain/stats ANY|/api/v1/supply-chain/vex ANY|/api/v1/tabletop/cadence ANY|/api/v1/tabletop/exercises ANY|/api/v1/tenants ADMIN|/api/v1/tenants/quota ADMIN|/api/v1/threat-hunt/queries AN|/api/v1/threat-hunt/queries/{id} AN|/api/v1/threat-hunt/results AN|/api/v1/ti/enrich AN|/api/v1/ti/feeds AN|/api/v1/ti/iocs AN|/api/v1/ti/matches AN|/api/v1/ti/mitre AN|/api/v1/ti/mitre/T1078 AN|/api/v1/ti/stats AN|/api/v1/transparency/report ANY",
"/api/v1/ueba/anomalies RC|/api/v1/ueba/anomalies/stats RC|/api/v1/ueba/baseline RC|/api/v1/ueba/score/trend RC|/api/v1/ueba/timeline RC|/api/v1/users ANY|/api/v1/vsp/batch/{id} ANY|/api/v1/vsp/batches ANY|/api/v1/vsp/executive_report_html/{id} ANY|/api/v1/vsp/executive_report_pdf/{id} ANY|/api/v1/vsp/findings ANY|/api/v1/vsp/findings/by-tool ANY|/api/v1/vsp/findings/chains ANY|/api/v1/vsp/findings/dedup ANY|/api/v1/vsp/findings/summary ANY|/api/v1/vsp/findings/{id} ANY|/api/v1/vsp/gate/latest ANY|/api/v1/vsp/metrics_slos ANY|/api/v1/vsp/posture/latest ANY|/api/v1/vsp/run/latest ANY|/api/v1/vsp/run/{id}/log ANY|/api/v1/vsp/run/{id}/tail ANY|/api/v1/vsp/run_report_html/{id} ANY|/api/v1/vsp/run_report_pdf/{id} ANY|/api/v1/vsp/runs ANY|/api/v1/vsp/runs/full-soc ANY|/api/v1/vsp/runs/index ANY|/api/v1/vsp/sandbox ANY|/api/v1/vsp/sla_breaches ANY|/api/v1/vsp/sla_config ANY|/api/v1/vsp/sla_tracker ANY|/api/v1/vulns ANY|/api/v1/vulns/by-tool ANY|/api/v1/vulns/stats ANY|/api/v1/vulns/top-cves ANY|/api/v1/vulns/trend ANY",
]
DATA="|".join(LINES)
W=[]
for t in DATA.split("|"):
    t=t.strip()
    if not t:continue
    a=t.rsplit(" ",1)
    W.append((a[0],a[1])) if (a[0],a[1]) not in W else None
assert len(W)==306,"PASTE INCOMPLETE: got %d/306 - re-paste"%len(W)
def call(p,tok):
    url=BASE+p.replace("{id}",DUMMY)
    req=urllib.request.Request(url,headers={"Authorization":"Bearer "+tok})
    try:return urllib.request.urlopen(req,context=ctx,timeout=12).status
    except urllib.error.HTTPError as e:return e.code
    except Exception:return -1
def call2(p,tok):
    s=call(p,tok)
    if s==429:
        time.sleep(1.2);s=call(p,tok)
    return s
leak=[];under=[];allrows=[];r429=0
for p,cat in W:
    st={}
    for r in ROLES:
        st[r]=call2(p,TOK[r]);time.sleep(0.04)
        if st[r]==429:r429+=1
    allow={r for r in ROLES if st[r] not in (401,403,429,-1)}
    exp=EXP.get(cat,EXP["ANY"])
    over=allow-exp
    und={r for r in exp if st[r] in (401,403)}
    allrows.append((p,cat,allow,st))
    if over and cat!="ANY":
        leak.append((p,cat,sorted(over),st))
    if und:
        under.append((p,cat,sorted(und),st))
out=open("/tmp/gsweep_out.txt","w")
for p,cat,allow,st in allrows:
    out.write("%-5s %-54s allow=%s st=%s\n"%(cat,p,sorted(allow),st))
out.close()
print("=== GET SWEEP: %d endpoints x5 roles (429=%d) ==="%(len(W),r429))
print("full matrix -> /tmp/gsweep_out.txt")
print("")
print("### READ-LEAK (role doc module no khong duoc phep): %d"%len(leak))
for p,cat,over,st in leak:
    print("  %-52s [%s] leak=%s"%(p,cat,",".join(over)))
print("")
print("### UNDER (role bi chan doc nham, ANY=backend tu chan): %d"%len(under))
for p,cat,und,st in under:
    print("  %-52s [%s] under=%s"%(p,cat,",".join(und)))

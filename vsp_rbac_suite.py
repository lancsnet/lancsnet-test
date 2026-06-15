import urllib.request as U, urllib.error as E, ssl, json, re, time, sys
B="https://127.0.0.1:30800"; PW="RoleTest2026!!"; C=ssl._create_unverified_context()
RS=["admin","analyst","dev","qa","auditor"]; EM={r:"rbac-"+r+"@lancs.local" for r in RS}
BOG="00000000-0000-0000-0000-000000000000"; TK={}
def fill(p):
    p=re.sub(r"\{[^}]+\}",BOG,p); p=re.sub(r"([?&]\w+)=(?=&|$)",r"\1=1",p); return p
def rq(m,p,t):
    h={"Content-Type":"application/json"}
    if t: h["Authorization"]="Bearer "+t
    b=b"{}" if m!="GET" else None
    try: return U.urlopen(U.Request(B+fill(p),b,h,method=m),timeout=12,context=C).status
    except E.HTTPError as e: return e.code
    except Exception: return 0
def lg(r):
    for _ in range(4):
        try:
            x=U.urlopen(U.Request(B+"/api/v1/auth/login",json.dumps({"email":EM[r],"password":PW}).encode(),{"Content-Type":"application/json"},method="POST"),timeout=12,context=C)
            t=json.loads(x.read()).get("token","")
            if t: return t
        except E.HTTPError as e:
            if e.code==429: time.sleep(13); continue
            return ""
        except Exception: time.sleep(2)
    return ""
CAT=[
('MOD-01','Dashboard - Security O','GET','/api/v1/vsp/findings',['admin', 'analyst', 'auditor', 'dev', 'qa'],'edge',False),
('MOD-01','Dashboard - Security O','GET','/api/v1/vsp/runs',['admin', 'analyst', 'auditor'],'spec',False),
('MOD-02','Scan Log - Nhật ký qué','GET','/api/v1/vsp/runs',['admin', 'analyst', 'auditor', 'dev'],'spec',False),
('MOD-03','Runs - Pipeline Manage','GET','/api/v1/vsp/runs',['admin', 'analyst', 'dev'],'spec',False),
('MOD-04','Findings - Quản lý lỗi','GET','/api/v1/vsp/findings',['admin', 'analyst', 'auditor', 'dev', 'qa'],'edge',False),
('MOD-04','Findings - Quản lý lỗi','GET','/api/v1/vsp/findings/by-tool',['admin', 'analyst', 'auditor', 'dev', 'qa'],'edge',False),
('MOD-04','Findings - Quản lý lỗi','GET','/api/v1/vsp/findings/dedup',['admin', 'analyst', 'auditor', 'dev', 'qa'],'edge',False),
('MOD-04','Findings - Quản lý lỗi','GET','/api/v1/vsp/findings/chains',['admin', 'analyst', 'auditor', 'dev', 'qa'],'edge',False),
('MOD-04','Findings - Quản lý lỗi','GET','/api/v1/vulns/stats',['admin', 'analyst', 'auditor', 'dev'],'spec',False),
('MOD-05','Remediation - Xử lý lỗ','GET','/api/v1/remediation',['admin', 'analyst', 'auditor', 'dev'],'spec',False),
('MOD-06','Policy - Security Poli','GET','/api/v1/policy/rules',['admin', 'analyst', 'auditor'],'spec',False),
('MOD-07','Audit - Audit Log & Ev','GET','/api/v1/audit/log',['admin', 'auditor'],'edge',False),
('MOD-07','Audit - Audit Log & Ev','GET','/api/v1/audit/stats',['admin', 'auditor'],'edge',False),
('MOD-07','Audit - Audit Log & Ev','GET','/api/v1/audit/monthly',['admin', 'auditor'],'edge',False),
('MOD-08','SOC - Security Operati','GET','/api/v1/soc/detection',['admin', 'analyst', 'auditor'],'spec',False),
('MOD-09','Governance - Complianc','GET','/api/v1/governance/risk-register',['admin', 'analyst', 'auditor'],'spec',False),
('MOD-10','FedRAMP - Federal Risk','GET','/api/v1/compliance/fedramp',['admin', 'analyst', 'auditor'],'spec',False),
('MOD-12','ConMon - Continuous Mo','GET','/api/v1/conmon/score',['admin', 'analyst', 'auditor'],'spec',False),
('MOD-13','AI Advisor - Intellige','GET','/api/v1/ai/mode',['admin', 'analyst', 'auditor', 'dev'],'spec',False),
('MOD-15','OSCAL - Open Security ','GET','/api/v1/oscal/package',['admin', 'analyst', 'auditor'],'spec',False),
('MOD-16','CISA Attestation - SSD','GET','/api/v1/cisa-attestation/forms',['admin', 'analyst', 'auditor'],'spec',False),
('MOD-17','Supply Chain Integrity','GET','/api/v1/supply-chain/key',['admin', 'analyst', 'auditor', 'dev'],'spec',False),
('MOD-18','SBOM - Software Bill o','GET','/api/v1/sbom/{rid}',['admin', 'analyst', 'auditor', 'dev'],'spec',False),
('MOD-21','Secret Vault & Leak Re','POST','/api/v1/ti/secret/check',['admin', 'analyst', 'dev'],'spec',True),
('MOD-22','Observability & Health','GET','/health',['admin', 'analyst', 'auditor', 'dev', 'qa'],'edge',False),
('MOD-22','Observability & Health','GET','/health/deep',['admin', 'analyst', 'auditor', 'dev', 'qa'],'edge',False),
('MOD-23','Tenants - Quản lý tena','GET','/api/v1/admin/tenants',['admin'],'edge',False),
('MOD-23','Tenants - Quản lý tena','POST','/api/v1/admin/tenants',['admin'],'edge',True),
('MOD-23','Tenants - Quản lý tena','PUT','/api/v1/admin/tenants/{id}/plan',['admin'],'edge',True),
('MOD-24','Users & RBAC','GET','/api/v1/admin/users',['admin'],'edge',False),
('MOD-24','Users & RBAC','POST','/api/v1/admin/users',['admin'],'edge',True),
('MOD-24','Users & RBAC','GET','/api/v1/admin/users?search=',['admin'],'edge',False),
('MOD-24','Users & RBAC','GET','/api/v1/admin/roles',['admin'],'edge',False),
('MOD-24','Users & RBAC','POST','/api/v1/vsp/rbac/session-timeout',['admin', 'auditor'],'spec',True),
('MOD-25','SSO/SAML & API Keys','POST','/api/v1/admin/api-keys',['admin'],'edge',True),
('MOD-25','SSO/SAML & API Keys','GET','/api/v1/admin/api-keys',['admin'],'edge',False),
('MOD-25','SSO/SAML & API Keys','GET','/api/v1/admin/roles',['admin'],'edge',False),
('MOD-26','Pipeline Gate & Integr','GET','/api/v1/vsp/gate/latest',['admin', 'analyst', 'dev'],'spec',False),
('MOD-27','PR/Repo Bot & Autofix','GET','/api/v1/autofix/leaderboard',['admin', 'analyst', 'dev'],'spec',False),
('MOD-31','Assets & SW Inventory','GET','/api/v1/vulns/top-cves',['admin', 'analyst', 'auditor'],'spec',False),
('MOD-32','Network Flow','GET','/api/v1/logs/network-flow',['admin', 'analyst'],'spec',False),
('MOD-33','Threat Hunt & Threat I','GET','/api/v1/logs/hunt',['admin', 'analyst'],'spec',False),
('MOD-34','Vulnerability Manageme','GET','/api/v1/vulns/stats',['admin', 'analyst', 'auditor'],'spec',False),
('MOD-35','Executive Reports','GET','/api/v1/vsp/executive_report_html/{rid}',['admin', 'auditor'],'spec',False),
('MOD-36','Export & Evidence Cent','GET','/api/v1/export/sarif/{rid}',['admin', 'analyst', 'auditor'],'spec',False),
('MOD-38','Authentication & Sessi','POST','/api/v1/auth/login',['admin', 'analyst', 'auditor', 'dev', 'qa'],'edge',True),
('MOD-38','Authentication & Sessi','GET','/api/v1/auth/check',['admin', 'analyst', 'auditor', 'dev', 'qa'],'edge',False),
('MOD-38','Authentication & Sessi','POST','/api/v1/vsp/rbac/session-timeout',['admin', 'analyst'],'spec',True),
('MOD-40','API Keys Management','POST','/api/v1/admin/api-keys',['admin'],'edge',True),
('MOD-40','API Keys Management','GET','/api/v1/admin/api-keys',['admin'],'edge',False),
('MOD-41','SSO/SAML Administratio','GET','/api/v1/admin/roles',['admin'],'edge',False),
('MOD-41','SSO/SAML Administratio','GET','/api/v1/admin/users',['admin'],'edge',False),
('MOD-42','Settings & System Conf','PUT','/api/v1/vsp/sla_config',['admin', 'analyst', 'dev'],'spec',True),
('MOD-45','Scanner Management & S','GET','/api/v1/scanners/health',['admin', 'analyst', 'auditor', 'dev', 'qa'],'edge',False),
('MOD-51','Threat Intelligence & ','GET','/api/v1/ti/iocs',['admin', 'analyst'],'spec',False),
]
def vd(role,c):
    meth,path,exp,src,isw=c[2],c[3],c[4],c[5],c[6]; a=role in exp
    if isw and a: return ("INFO",-1)
    if isw and src!="edge": return ("SKIPW",-1)
    s=rq(meth,path,TK.get(role,""))
    if a: return ("OK" if s not in (401,403) else "UNDER", s)
    if s in (401,403): return ("OK",s)
    if s in (200,201,202,204): return ("OVERW" if isw else "OVERR", s)
    if s in (400,422,409) and isw: return ("REACH", s)
    if s in (404,405): return ("rt", s)
    return ("?",s)
print("=== VSP RBAC SUITE (52-module, %d endpoints) ==="%len(CAT))
for r in RS: TK[r]=lg(r); print("login %-8s %s"%(r,"OK" if TK[r] else "FAIL"))
G={}
for role in RS:
    if not TK[role]: print("%-8s SKIP"%role); continue
    ok=un=orr=oww=rh=rt=sk=0; g=[]
    for c in CAT:
        v,s=vd(role,c)
        if v=="OK":ok+=1
        elif v=="UNDER":un+=1; g.append(("UNDER",c,s))
        elif v=="OVERR":orr+=1; g.append(("OVER-READ",c,s))
        elif v=="OVERW":oww+=1; g.append(("OVER-WRITE",c,s))
        elif v=="REACH":rh+=1; g.append(("W-REACH",c,s))
        elif v=="rt":rt+=1
        elif v=="SKIPW":sk+=1
    G[role]=g
    print("%-8s OK=%-3d UNDER=%-2d OVER-READ=%-2d OVER-WRITE=%-2d W-REACH=%-2d skipW=%-2d rt=%-3d"%(role,ok,un,orr,oww,rh,sk,rt))
print("\n=== GAPS (edge=verified / spec=review backend) ===")
crit=0
for role in RS:
    sev=[x for x in G.get(role,[]) if x[0] in ("OVER-WRITE","OVER-READ","W-REACH","UNDER")]
    if not sev: continue
    print("\n#### %s ####"%role.upper())
    for kind,c,s in sev:
        if kind in ("OVER-WRITE","W-REACH"): crit+=1
        print("  [%-10s] %s %-6s %-40s -> %s exp=%s(%s)"%(kind,c[0],c[2],c[3][:40],s,",".join(c[4]),c[5]))
print("\n=== over-permissive WRITE nghi ngo = %d ==="%crit)
sys.exit(1 if crit else 0)

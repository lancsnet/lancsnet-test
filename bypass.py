import http.client,ssl
ctx=ssl._create_unverified_context()
TOK=open("/tmp/tok_auditor").read().strip()
BASE_H={"Authorization":"Bearer "+TOK,"Content-Type":"application/json"}
def req(method,path,extra=None):
    c=http.client.HTTPSConnection("127.0.0.1",30800,context=ctx,timeout=10)
    h=dict(BASE_H)
    if extra:h.update(extra)
    try:
        c.request(method,path,body=b"{}",headers=h)
        r=c.getresponse();r.read();return r.status
    except Exception:
        return -1
    finally:
        c.close()
# (method, path) = cac write auditor PHAI bi 403
TARGETS=[
 ("POST","/api/v1/soar/playbooks"),
 ("POST","/api/v1/correlation/rules"),
 ("POST","/api/p4/rmf/task"),
 ("POST","/api/v1/cicd/schedules"),
 ("POST","/api/v1/cato/toggle"),
 ("POST","/api/v1/governance/evidence/x/freeze"),
 ("POST","/api/v1/import/users"),
 ("DELETE","/api/v1/logs/sources/x"),
 ("POST","/api/p4/ir/incident/create"),
 ("POST","/api/v1/vsp/run"),
 ("POST","/api/v1/poam/sync"),
 ("POST","/api/v1/policy/rules/abc"),
 ("POST","/api/v1/vsp/batch"),
 ("POST","/api/v1/vsp/run/full-soc"),
 ("POST","/api/v1/scan/all-modes"),
 ("POST","/api/v1/vsp/sandbox/test-fire"),
 ("POST","/api/v1/supply-chain/sign"),
 ("POST","/api/p4/vex"),
 ("POST","/api/v1/soar/secrets/abc/rotate"),
 ("POST","/api/v1/cspm/accounts/abc/sync"),
 ("POST","/api/v1/audit/rotate"),
 ("POST","/api/v1/supply-chain/key/rotate"),
 ("POST","/api/v1/import/policies"),
 ("POST","/api/v1/security/disclosures/abc/transition"),
 ("POST","/api/v1/cicd/config/update"),
 ("POST","/api/v1/cicd/task/create"),
]
def variants(p):
    segs=p.split("/")
    up=p
    for i in range(len(segs)-1,0,-1):
        if segs[i].isalpha():
            up="/".join(segs[:i]+[segs[i].upper()]+segs[i+1:]);break
    enc=p
    for i,ch in enumerate(p):
        if ch.isalpha() and i>9:
            enc=p[:i]+"%%%02x"%ord(ch)+p[i+1:];break
    last=p.rsplit("/",1)
    dot=last[0]+"/x/../"+last[1] if len(last)==2 else p
    return [("base",p),("trail",p+"/"),("dslash",p.replace("/api/v1/","/api/v1//",1).replace("/api/p4/","/api/p4//",1)),
            ("upper",up),("semi",p+";a=1"),("dotseg",dot),("enc",enc),("query",p+"?z=1")]
print("BYPASS TEST (auditor) — moi bien the PHAI 403; khac 403 = NGHI NGO LACH")
print("%-8s %-46s %s"%("variant","path","status"))
bad=[]
for m,p in TARGETS:
    print("--- %s %s ---"%(m,p))
    for name,vp in variants(p):
        st=req(m,vp)
        flag="" if st in (401,403) else "  <-- ?? reached backend"
        if flag:bad.append((m,vp,st))
        print("  %-7s %-46s %s%s"%(name,vp[:46],st,flag))
    # method-override: GET (qua read guard) + override header
    for hdr in ("X-HTTP-Method-Override","X-Method-Override","X-HTTP-Method"):
        st=req("GET",p,{hdr:m})
        if st not in (401,403) and st!=200:
            bad.append(("GET+"+hdr,p,st))
        print("  ovr:%-15s %-38s %s"%(hdr,p[:38],st))
print("")
print("### NGHI NGO LACH (write reached backend, !=403): %d"%len(bad))
for m,p,st in bad:
    print("  %s %s -> %s"%(m,p,st))

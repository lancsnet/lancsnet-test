#!/usr/bin/env python3
"""VSP Image Scan API :8090 /scan -> trivy image / cosign verify.
v3 (prod): ThreadingHTTPServer + semaphore gioi han dong thoi + timeout.
200=scan xong · 502=scan loi · 422=verify fail · 400=thieu image · 503=qua tai."""
import json, subprocess, os, datetime, threading
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
PORT=int(os.environ.get("SCAN_API_PORT",8090))
MAXC=int(os.environ.get("SCAN_MAX_CONC",3))
ACQ=float(os.environ.get("SCAN_ACQUIRE_TIMEOUT",20))
SEM=threading.BoundedSemaphore(MAXC)
LOGDIR="/home/devsecops/vsp-platform-v4.9.0/logs"; LOG=os.path.join(LOGDIR,"vsp-scan-api.log"); os.makedirs(LOGDIR,exist_ok=True)
_lk=threading.Lock()
def log(m):
    line=datetime.datetime.utcnow().isoformat()+"Z "+m
    with _lk:
        print(line,flush=True)
        try: open(LOG,"a").write(line+"\n")
        except Exception: pass
def now(): return datetime.datetime.utcnow().isoformat()+"Z"
def pick_image(b):
    if not isinstance(b,dict): return ""
    for k in ("image","image_ref","imageRef","Image","target","Target","ref","tag","name","artifact"):
        v=b.get(k)
        if isinstance(v,str) and v.strip(): return v.strip()
    for p in ("job","spec","params","payload","data"):
        s=b.get(p)
        if isinstance(s,dict):
            r=pick_image(s)
            if r: return r
    return ""
def trivy_image(image):
    r=subprocess.run(["trivy","image","--quiet","--format","json","--timeout","5m",
        "--scanners","vuln","--severity","CRITICAL,HIGH,MEDIUM,LOW",image],
        capture_output=True,text=True,timeout=360)
    if not r.stdout.strip(): raise RuntimeError(f"trivy rc={r.returncode}: {(r.stderr or '').strip()[:300]}")
    d=json.loads(r.stdout); sev={"CRITICAL":0,"HIGH":0,"MEDIUM":0,"LOW":0,"UNKNOWN":0}; tot=0
    for res in (d.get("Results") or []):
        for v in (res.get("Vulnerabilities") or []):
            s=(v.get("Severity") or "UNKNOWN").upper(); sev[s]=sev.get(s,0)+1; tot+=1
    rd=((d.get("Metadata") or {}).get("RepoDigests") or [])
    return tot,sev,(rd[0] if rd else "")
def cosign_verify(image):
    r=subprocess.run(["cosign","verify",image],capture_output=True,text=True,timeout=120)
    return (r.returncode==0),(r.stderr or r.stdout).strip()[:400]
class H(BaseHTTPRequestHandler):
    timeout=400
    def log_message(self,*a): pass
    def _s(self,code,obj):
        b=json.dumps(obj).encode(); self.send_response(code)
        self.send_header("Content-Type","application/json"); self.send_header("Content-Length",str(len(b))); self.end_headers()
        try: self.wfile.write(b)
        except Exception: pass
    def do_GET(self):
        if self.path.startswith("/health") or self.path=="/":
            self._s(200,{"status":"ok","service":"vsp-scan-api","port":PORT,"max_conc":MAXC,"inflight":MAXC-SEM._value})
        else: self._s(404,{"error":"not found"})
    def do_POST(self):
        n=int(self.headers.get("Content-Length") or 0); raw=self.rfile.read(n) if n else b""
        try: body=json.loads(raw or b"{}")
        except Exception: body={}
        image=pick_image(body); is_verify="verify" in self.path.lower() or str((body or {}).get("type","")).lower().startswith("verify")
        log(f"POST {self.path} from {self.client_address[0]} image={image!r} verify={is_verify}")
        if not image: self._s(400,{"status":"fail","error":"no image in request","output":{}}); return
        if not SEM.acquire(timeout=ACQ):
            log(f"  -> 503 busy image={image}"); self._s(503,{"status":"fail","error":"scanner busy","output":{"image":image}}); return
        try:
            if is_verify:
                ok,detail=cosign_verify(image); out={"image":image,"verified":ok,"detail":detail,"server":now()}; log(f"  verify {image} ok={ok}")
                self._s(200 if ok else 422,{"status":"pass" if ok else "fail","output":out,"error":"" if ok else "signature verify failed: "+detail[:200]})
            else:
                tot,sev,digest=trivy_image(image)
                out={"image":image,"digest":digest,"vulnerabilities":tot,"critical":sev["CRITICAL"],"high":sev["HIGH"],"medium":sev["MEDIUM"],"low":sev["LOW"],"server":now()}
                log(f"  scan {image} total={tot} crit={sev['CRITICAL']} high={sev['HIGH']}"); self._s(200,{"status":"pass","output":out,"error":""})
        except Exception as e:
            log(f"  -> 502 scan-err {e}"); self._s(502,{"status":"fail","output":{"image":image},"error":str(e)[:400]})
        finally: SEM.release()
if __name__=="__main__":
    log(f"[vsp-scan-api] v3 listen 127.0.0.1:{PORT} max_conc={MAXC}")
    srv=ThreadingHTTPServer(("127.0.0.1",PORT),H); srv.daemon_threads=True; srv.serve_forever()

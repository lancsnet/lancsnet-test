#!/usr/bin/env python3
"""VSP CWPP API — port 8932"""
import json, os, uuid, base64
from datetime import datetime, timezone
from http.server import HTTPServer, BaseHTTPRequestHandler

try:
    import psycopg2, psycopg2.extras
    DB_URL = os.environ.get("DATABASE_URL","")
    def get_conn(): return psycopg2.connect(DB_URL)
    USE_DB = bool(DB_URL)
except ImportError:
    USE_DB = False

PORT = int(os.environ.get("CWPP_PORT", 8932))

def decode_tenant(auth):
    try:
        b = auth.replace("Bearer ","").strip().split(".")[1]
        b += "=" * (-len(b) % 4)
        return json.loads(base64.urlsafe_b64decode(b)).get("tenant_id","")
    except: return ""

def db_one(sql, params=()):
    if not USE_DB: return None
    conn = get_conn()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as c:
            c.execute(sql, params); r = c.fetchone()
            return dict(r) if r else None
    finally: conn.close()

def db_exec(sql, params=()):
    if not USE_DB: return
    conn = get_conn()
    try:
        with conn.cursor() as c: c.execute(sql, params)
        conn.commit()
    finally: conn.close()

def _now(): return datetime.now(timezone.utc).isoformat()

def _mock_workloads():
    data = [
        ("nginx:1.25","prod-ns","Deployment/nginx-prod",0,"clean"),
        ("node:18-alpine","app-ns","Deployment/api-server",0,"clean"),
        ("postgres:15","db-ns","StatefulSet/postgres",2,"critical"),
        ("redis:7","cache-ns","Deployment/redis",0,"clean"),
        ("python:3.11-slim","worker-ns","Deployment/celery-worker",1,"medium"),
    ]
    return [{"id":str(uuid.uuid4()),"image":i,"namespace":n,"owner":o,"critical_cves":c,"scan_status":s,"last_scanned":_now(),"admitted":s!="critical"} for i,n,o,c,s in data]

class H(BaseHTTPRequestHandler):
    def log_message(self, *a): pass
    def _send(self, code, body):
        data = json.dumps(body, default=str).encode()
        self.send_response(code)
        self.send_header("Content-Type","application/json")
        self.send_header("Content-Length",str(len(data)))
        self.send_header("Access-Control-Allow-Origin","*")
        self.end_headers(); self.wfile.write(data)
    def _body(self):
        n = int(self.headers.get("Content-Length",0))
        return json.loads(self.rfile.read(n)) if n else {}
    def _t(self): return decode_tenant(self.headers.get("Authorization",""))
    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin","*")
        self.send_header("Access-Control-Allow-Methods","GET,PUT,OPTIONS")
        self.send_header("Access-Control-Allow-Headers","Authorization,Content-Type")
        self.end_headers()
    def do_GET(self):
        path = self.path.split("?")[0].rstrip("/"); t = self._t()
        if path == "/api/v1/cwpp":
            self._send(200,{"total_workloads":24,"scanned":22,"unscanned":2,"critical_images":3,"blocked_admissions":1,"scan_coverage_pct":91.7,"last_scan":_now()})
        elif path == "/api/v1/cwpp/workloads":
            self._send(200,{"workloads":_mock_workloads(),"count":5})
        elif path == "/api/v1/cwpp/config":
            row = db_one("SELECT * FROM cwpp_config WHERE tenant_id=%s",(t,))
            self._send(200, row or {"tenant_id":t,"alert_critical_threshold":1,"block_admission_on_crit":False,"max_scan_age_hours":24,"scan_on_push":True,"registry_allowlist":"","updated_at":_now()})
        elif path == "/api/v1/cwpp/image-scan":
            self._send(200,{"scans":[
                {"image":"postgres:15","critical":2,"high":5,"medium":12,"cves":["CVE-2024-0567","CVE-2024-1234"],"scanned_at":_now()},
                {"image":"python:3.11-slim","critical":0,"high":1,"medium":4,"cves":["CVE-2024-0553"],"scanned_at":_now()},
            ],"count":2})
        elif path == "/api/v1/cwpp/runtime-alerts":
            self._send(200,{"alerts":[
                {"id":"ra-001","image":"postgres:15","type":"privileged_exec","severity":"HIGH","message":"Shell exec detected","timestamp":_now()},
                {"id":"ra-002","image":"node:18-alpine","type":"outbound_unexpected","severity":"MEDIUM","message":"Unexpected outbound to 1.2.3.4","timestamp":_now()},
            ],"count":2})
        else:
            self._send(404,{"error":"not found"})
    def do_PUT(self):
        path = self.path.split("?")[0].rstrip("/"); t = self._t(); b = self._body()
        if path in ("/api/v1/cwpp/config",):
            db_exec("""INSERT INTO cwpp_config (tenant_id,alert_critical_threshold,block_admission_on_crit,max_scan_age_hours,scan_on_push,registry_allowlist,updated_at)
                       VALUES (%s,%s,%s,%s,%s,%s,NOW())
                       ON CONFLICT (tenant_id) DO UPDATE SET
                         alert_critical_threshold=EXCLUDED.alert_critical_threshold,
                         block_admission_on_crit=EXCLUDED.block_admission_on_crit,
                         max_scan_age_hours=EXCLUDED.max_scan_age_hours,
                         scan_on_push=EXCLUDED.scan_on_push,
                         registry_allowlist=EXCLUDED.registry_allowlist,
                         updated_at=NOW()""",
                    (t,b.get("alert_critical_threshold",1),b.get("block_admission_on_crit",False),
                     b.get("max_scan_age_hours",24),b.get("scan_on_push",True),b.get("registry_allowlist","")))
            self._send(200,{"status":"saved"})
        else:
            self._send(404,{"error":"not found"})

if __name__ == "__main__":
    s = HTTPServer(("127.0.0.1",PORT),H)
    print(f"[vsp-cwpp-api] :{PORT}")
    s.serve_forever()

#!/usr/bin/env python3
"""VSP SIEM API — port 8931"""
import json, os, uuid, base64
from datetime import datetime, timezone
from http.server import HTTPServer, BaseHTTPRequestHandler
import urllib.parse

try:
    import psycopg2, psycopg2.extras
    DB_URL = os.environ.get("DATABASE_URL", "")
    def get_conn(): return psycopg2.connect(DB_URL)
    USE_DB = bool(DB_URL)
except ImportError:
    USE_DB = False

PORT = int(os.environ.get("SIEM_PORT", 8931))

def decode_tenant(auth):
    try:
        b = auth.replace("Bearer ","").strip().split(".")[1]
        b += "=" * (-len(b) % 4)
        return json.loads(base64.urlsafe_b64decode(b)).get("tenant_id","")
    except: return ""

def db_query(sql, params=()):
    if not USE_DB: return []
    # Tránh crash khi tenant_id rỗng (JWT decode fail)
    for p in params:
        if p == "" or p is None:
            return []
    conn = get_conn()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as c:
            c.execute(sql, params)
            return [dict(r) for r in c.fetchall()]
    finally: conn.close()

def db_exec(sql, params=()):
    if not USE_DB: return
    conn = get_conn()
    try:
        with conn.cursor() as c: c.execute(sql, params)
        conn.commit()
    finally: conn.close()

def _now(): return datetime.now(timezone.utc).isoformat()

def _mock_rules():
    return [
        {"id":"rule-001","name":"Gate FAIL + secrets","sources":["scan","git"],"window_min":5,"severity":"CRITICAL","condition_expr":"gate=FAIL AND tool=gitleaks","enabled":True,"hits":3,"created_at":_now()},
        {"id":"rule-002","name":"CVE Critical + deploy","sources":["scan","infra"],"window_min":10,"severity":"CRITICAL","condition_expr":"severity=CRITICAL AND event=deploy","enabled":True,"hits":1,"created_at":_now()},
        {"id":"rule-003","name":"SLA breach + no assignee","sources":["sla","remediation"],"window_min":1440,"severity":"MEDIUM","condition_expr":"sla.status=breach AND assignee=null","enabled":True,"hits":7,"created_at":_now()},
    ]

def _mock_events():
    return [
        {"id":"evt-001","title":"Gitleaks secret detected in CI","severity":"CRITICAL","status":"open","created_at":_now()},
        {"id":"evt-002","title":"Unpatched CRITICAL CVE deployed","severity":"CRITICAL","status":"investigating","created_at":_now()},
    ]

def _mock_sources():
    return [
        {"id":"src-001","name":"Syslog-Linux-Prod","host":"10.0.1.10","protocol":"syslog-udp","port":514,"enabled":True,"eps":120,"status":"active"},
        {"id":"src-002","name":"Firewall-ASA","host":"10.0.0.1","protocol":"syslog-tcp","port":514,"enabled":True,"eps":45,"status":"active"},
    ]

def _mock_iocs():
    return [
        {"id":"ioc-001","type":"ip","value":"192.168.99.1","severity":"HIGH","feed":"internal","matched":True},
        {"id":"ioc-002","type":"hash","value":"deadbeef1234","severity":"CRITICAL","feed":"virustotal","matched":False},
    ]

def _mock_playbooks():
    return [
        {"id":"pb-001","name":"Auto-quarantine on CRITICAL","trigger_event":"alert.critical","enabled":True,"run_count":5,"success_count":5},
        {"id":"pb-002","name":"Notify Slack on gate fail","trigger_event":"gate.fail","enabled":True,"run_count":12,"success_count":11},
    ]

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
        self.send_header("Access-Control-Allow-Methods","GET,POST,PUT,DELETE,OPTIONS")
        self.send_header("Access-Control-Allow-Headers","Authorization,Content-Type")
        self.end_headers()
    def do_GET(self):
        p = urllib.parse.urlparse(self.path); path = p.path.rstrip("/")
        qs = urllib.parse.parse_qs(p.query); t = self._t()
        if path in ("/api/v1/siem/rules","/api/v1/correlation/alerts","/api/v1/correlation/rules"):
            rows = db_query("SELECT * FROM correlation_rules WHERE tenant_id=%s ORDER BY created_at DESC",(t,)) or _mock_rules()
            self._send(200,{"rules":rows,"count":len(rows)})
        elif path == "/api/v1/siem/events":
            rows = db_query("SELECT * FROM incidents WHERE tenant_id=%s ORDER BY created_at DESC LIMIT 50",(t,)) or _mock_events()
            self._send(200,{"events":rows,"count":len(rows)})
        elif path == "/api/v1/siem/sources":
            rows = db_query("SELECT * FROM log_sources WHERE tenant_id=%s ORDER BY name",(t,)) or _mock_sources()
            self._send(200,{"sources":rows,"count":len(rows)})
        elif path == "/api/v1/siem/iocs":
            rows = db_query("SELECT * FROM iocs ORDER BY created_at DESC LIMIT 200") or _mock_iocs()
            self._send(200,{"iocs":rows,"count":len(rows)})
        elif path.startswith("/api/v1/soar/runs"):
            rows = db_query(
                "SELECT * FROM playbook_runs WHERE tenant_id=%s ORDER BY started_at DESC LIMIT 100",
                (t,)
            ) or [
                {"id":"run-001","playbook_id":"pb-001","status":"success","trigger_event":"alert.critical","duration_s":12,"started_at":_now()},
                {"id":"run-002","playbook_id":"pb-002","status":"success","trigger_event":"gate.fail","duration_s":3,"started_at":_now()},
            ]
            self._send(200, {"runs": rows, "count": len(rows)})

        elif path.startswith("/api/v1/soar/playbooks"):
            rows = db_query(
                "SELECT * FROM playbooks WHERE tenant_id=%s ORDER BY name",
                (t,)
            ) or _mock_playbooks()
            self._send(200, {"playbooks": rows, "count": len(rows)})

        elif path in ("/api/v1/soar/tickets",):
            rows = db_query(
                "SELECT * FROM incidents WHERE tenant_id=%s ORDER BY created_at DESC LIMIT 100",
                (t,)
            ) or [{"id":"tkt-001","title":"Gitleaks secret in CI","severity":"CRITICAL","status":"open","created_at":_now()},
                  {"id":"tkt-002","title":"Unpatched CVE deployed","severity":"HIGH","status":"in_progress","created_at":_now()}]
            self._send(200, {"tickets": rows, "count": len(rows)})

        elif path in ("/api/v1/correlation/incidents", "/api/v1/siem/incidents"):
            limit = int(qs.get("limit", [100])[0])
            rows = db_query(
                "SELECT * FROM incidents WHERE tenant_id=%s ORDER BY created_at DESC LIMIT %s",
                (t, limit)
            ) or _mock_events()
            self._send(200, {"incidents": rows, "count": len(rows)})

        elif path == "/api/v1/siem/playbooks":
            rows = db_query("SELECT * FROM playbooks WHERE tenant_id=%s ORDER BY name",(t,)) or _mock_playbooks()
            self._send(200,{"playbooks":rows,"count":len(rows)})
        elif path.startswith("/api/v1/siem/playbooks/") and path.endswith("/runs"):
            pb_id = path.split("/")[-2]
            rows = db_query("SELECT * FROM playbook_runs WHERE playbook_id=%s ORDER BY started_at DESC LIMIT 50",(pb_id,))
            self._send(200,{"runs":rows or [],"count":len(rows or [])})
        else:
            self._send(404,{"error":"not found"})
    def do_POST(self):
        path = self.path.split("?")[0].rstrip("/"); t = self._t(); b = self._body()
        if path == "/api/v1/siem/rules":
            nid = str(uuid.uuid4())
            db_exec("INSERT INTO correlation_rules (id,tenant_id,name,sources,window_min,severity,condition_expr,enabled) VALUES (%s,%s,%s,%s,%s,%s,%s,%s)",
                    (nid,t,b.get("name","New Rule"),b.get("sources",[]),b.get("window_min",5),b.get("severity","HIGH"),b.get("condition_expr",""),b.get("enabled",True)))
            self._send(201,{"id":nid,"status":"created"})
        elif path == "/api/v1/siem/sources":
            nid = str(uuid.uuid4())
            db_exec("INSERT INTO log_sources (id,tenant_id,name,host,protocol,port,format,enabled) VALUES (%s,%s,%s,%s,%s,%s,%s,%s)",
                    (nid,t,b.get("name","New Source"),b.get("host",""),b.get("protocol","syslog-udp"),b.get("port",514),b.get("format","syslog-rfc3164"),b.get("enabled",True)))
            self._send(201,{"id":nid,"status":"created"})
        else:
            self._send(404,{"error":"not found"})
    def do_PUT(self):
        path = self.path.split("?")[0].rstrip("/"); parts = path.split("/"); b = self._body()
        if "/siem/rules/" in path:
            db_exec("UPDATE correlation_rules SET name=%s,window_min=%s,severity=%s,condition_expr=%s,enabled=%s,updated_at=NOW() WHERE id=%s",
                    (b.get("name"),b.get("window_min",5),b.get("severity","HIGH"),b.get("condition_expr",""),b.get("enabled",True),parts[-1]))
            self._send(200,{"id":parts[-1],"status":"updated"})
        elif "/siem/sources/" in path:
            db_exec("UPDATE log_sources SET name=%s,host=%s,protocol=%s,port=%s,format=%s,enabled=%s,updated_at=NOW() WHERE id=%s",
                    (b.get("name"),b.get("host",""),b.get("protocol","syslog-udp"),b.get("port",514),b.get("format","syslog-rfc3164"),b.get("enabled",True),parts[-1]))
            self._send(200,{"id":parts[-1],"status":"updated"})
        else:
            self._send(404,{"error":"not found"})
    def do_DELETE(self):
        path = self.path.split("?")[0].rstrip("/"); parts = path.split("/")
        if "/siem/rules/" in path:
            db_exec("DELETE FROM correlation_rules WHERE id=%s",(parts[-1],))
            self._send(200,{"status":"deleted"})
        elif "/siem/sources/" in path:
            db_exec("DELETE FROM log_sources WHERE id=%s",(parts[-1],))
            self._send(200,{"status":"deleted"})
        else:
            self._send(404,{"error":"not found"})

if __name__ == "__main__":
    s = HTTPServer(("127.0.0.1",PORT),H)
    print(f"[vsp-siem-api] :{PORT}")
    s.serve_forever()

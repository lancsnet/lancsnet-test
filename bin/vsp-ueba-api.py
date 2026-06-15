#!/usr/bin/env python3
"""VSP UEBA API — port 8933"""
import json, os, base64
from datetime import datetime, timezone
from http.server import HTTPServer, BaseHTTPRequestHandler
import urllib.parse

PORT = int(os.environ.get("UEBA_PORT", 8933))
DISABLED = os.environ.get("DISABLE_ANOMALY_DETECTION","false").lower() == "true"

def _now(): return datetime.now(timezone.utc).isoformat()
def _off(): return {"disabled":True,"reason":"DISABLE_ANOMALY_DETECTION=true","data":[],"count":0}

class H(BaseHTTPRequestHandler):
    def log_message(self, *a): pass
    def _send(self, code, body):
        data = json.dumps(body, default=str).encode()
        self.send_response(code)
        self.send_header("Content-Type","application/json")
        self.send_header("Content-Length",str(len(data)))
        self.send_header("Access-Control-Allow-Origin","*")
        self.end_headers(); self.wfile.write(data)
    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin","*")
        self.send_header("Access-Control-Allow-Methods","GET,OPTIONS")
        self.send_header("Access-Control-Allow-Headers","Authorization,Content-Type")
        self.end_headers()
    def do_GET(self):
        path = self.path.split("?")[0].rstrip("/")
        if path == "/api/v1/ueba/status":
            self._send(200,{"enabled": not DISABLED,"anomaly_detection": not DISABLED,"version":"4.9.0"})
        elif path == "/api/v1/ueba/alerts":
            if DISABLED: self._send(200, _off()); return
            self._send(200,{"alerts":[
                {"id":"ua-001","user":"john.doe@lancs.local","type":"impossible_travel","severity":"HIGH","detail":"Login VN→US within 2h","risk_score":87,"timestamp":_now(),"status":"open"},
                {"id":"ua-002","user":"automation@lancs.local","type":"off_hours_access","severity":"MEDIUM","detail":"API access at 03:17","risk_score":45,"timestamp":_now(),"status":"acknowledged"},
                {"id":"ua-003","user":"admin@lancs.local","type":"bulk_download","severity":"HIGH","detail":"2400 records in 5min","risk_score":72,"timestamp":_now(),"status":"open"},
            ],"count":3,"disabled":False})
        elif path == "/api/v1/ueba/events":
            if DISABLED: self._send(200, _off()); return
            self._send(200,{"events":[{"id":f"ue-{i:03d}","user":"john.doe@lancs.local","action":"login","ip":f"10.0.{i}.1","risk_score":i*3,"timestamp":_now()} for i in range(1,11)],"count":10,"disabled":False})
        elif path == "/api/v1/ueba/users":
            if DISABLED: self._send(200, _off()); return
            self._send(200,{"users":[
                {"user":"john.doe@lancs.local","risk_score":87,"alert_count":2,"last_seen":_now()},
                {"user":"admin@lancs.local","risk_score":72,"alert_count":1,"last_seen":_now()},
            ],"count":2,"disabled":False})
        elif path == "/api/v1/ueba/analyze":
            if DISABLED: self._send(200, _off()); return
            self._send(200, {"anomalies": [
                {"user":"john.doe@lancs.local","score":87,"type":"impossible_travel","ts":_now()},
                {"user":"admin@lancs.local","score":72,"type":"bulk_download","ts":_now()},
            ], "count": 2, "disabled": False})

        elif path == "/api/v1/ueba/baseline":
            if DISABLED: self._send(200, _off()); return
            self._send(200, {"baseline": {
                "avg_login_hour": 9.5, "avg_requests_per_day": 142,
                "typical_ips": ["10.0.1.1","10.0.1.2"],
                "computed_at": _now()
            }, "disabled": False})

        elif path == "/api/v1/ueba/timeline":
            if DISABLED: self._send(200, _off()); return
            self._send(200, {"events": [
                {"ts": _now(), "user": "john.doe@lancs.local", "action": "login", "risk": 10},
                {"ts": _now(), "user": "admin@lancs.local",    "action": "export", "risk": 45},
            ], "count": 2, "disabled": False})

        else:
            self._send(404,{"error":"not found"})

if __name__ == "__main__":
    s = HTTPServer(("127.0.0.1",PORT),H)
    print(f"[vsp-ueba-api] :{PORT} disabled={DISABLED}")
    s.serve_forever()

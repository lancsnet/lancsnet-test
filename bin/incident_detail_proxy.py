#!/usr/bin/env python3
"""Mini proxy: GET /api/p4/ir/incident/detail?id=X -> fetch from /api/p4/ir/incidents, filter by id"""
import http.server, urllib.request, urllib.parse, json, os, sys

TOKEN_FILE = '/tmp/vsp_proxy_token.txt'
BACKEND = 'http://127.0.0.1:8921'

class Handler(http.server.BaseHTTPRequestHandler):
    def log_message(self, *a): pass
    def do_GET(self):
        if '/api/p4/ir/incident/detail' not in self.path:
            self.send_response(404); self.end_headers(); return
        
        # Extract id
        qs = urllib.parse.urlparse(self.path).query
        params = urllib.parse.parse_qs(qs)
        inc_id = (params.get('id') or [''])[0]
        
        # Get auth header
        auth = self.headers.get('Authorization', '')
        
        # Fetch incidents list
        try:
            req = urllib.request.Request(BACKEND + '/api/p4/ir/incidents',
                headers={'Authorization': auth})
            resp = urllib.request.urlopen(req, timeout=5)
            data = json.loads(resp.read())
            incidents = data.get('incidents', [])
            inc = next((i for i in incidents if i.get('incident_id') == inc_id or i.get('id') == inc_id), None)
            if inc:
                # Build full detail response
                detail = {
                    'incident_id': inc.get('incident_id', inc_id),
                    'title': inc.get('title', ''),
                    'severity': inc.get('severity', 'unknown'),
                    'status': inc.get('status', 'open'),
                    'phase': inc.get('phase', 'analysis'),
                    'category': inc.get('category', ''),
                    'reporter': inc.get('reporter', ''),
                    'assigned_to': inc.get('assigned_to', ''),
                    'commander': inc.get('commander', ''),
                    'description': inc.get('description', ''),
                    'is_ransomware': inc.get('is_ransomware', False),
                    'is_substantial': inc.get('is_substantial', False),
                    'ransom_paid': inc.get('ransom_paid', False),
                    'ransom_amount_usd': inc.get('ransom_amount_usd', 0),
                    'detected_at': inc.get('detected_at', inc.get('created_at', '')),
                    'closed_at': inc.get('closed_at', None),
                    'impact': inc.get('impact', {}),
                    'timeline': inc.get('timeline', {
                        'detected_at': inc.get('detected_at', ''),
                        'contained_at': inc.get('closed_at', None)
                    }),
                    'circia_reports': inc.get('circia_reports', []),
                    'forensics': inc.get('forensics', []),
                    'corrective_actions': inc.get('corrective_actions', [])
                }
                body = json.dumps(detail).encode()
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(body)
            else:
                self.send_response(404)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(b'{"error":"incident not found"}')
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'error': str(e)}).encode())

if __name__ == '__main__':
    server = http.server.HTTPServer(('127.0.0.1', 8922), Handler)
    print('Incident detail proxy on :8922')
    server.serve_forever()

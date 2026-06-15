#!/usr/bin/env python3
"""
VSP Network Flow Sidecar API — port 8930
Endpoints:
  GET /api/v1/network/flows       — flow records
  GET /api/v1/network/flows/summary — KPI summary
  GET /api/v1/ndr/alerts          — NDR alerts
  POST /api/v1/ndr/alerts/<id>/ack — acknowledge alert
  GET /api/v1/network/topology    — connection map data
  GET /health                     — healthcheck
"""
from flask import Flask, jsonify, request
import psycopg2, psycopg2.extras, os, logging

logging.basicConfig(level=logging.INFO, format='[VSP-NETFLOW] %(message)s')
app = Flask(__name__)

import decimal, datetime
class SafeEncoder(app.json_encoder):
    def default(self, o):
        if isinstance(o, decimal.Decimal): return float(o)
        if isinstance(o, (datetime.datetime, datetime.date)): return o.isoformat()
        return super().default(o)
app.json_encoder = SafeEncoder

DB = dict(
    host=os.getenv('PGHOST','127.0.0.1'),
    port=int(os.getenv('PGPORT','5432')),
    dbname=os.getenv('PGDATABASE','vsp_netflow'),
    user=os.getenv('PGUSER','vsp_flow'),
    password=os.getenv('NETFLOW_DB_PASSWORD', os.getenv('PGPASSWORD','')),
)

def conn():
    return psycopg2.connect(**DB)

def cors(r):
    r.headers['Access-Control-Allow-Origin'] = '*'
    r.headers['Access-Control-Allow-Headers'] = 'Authorization,Content-Type,X-API-Key'
    r.headers['Content-Language'] = 'vi'
    return r

@app.after_request
def after(r): return cors(r)

@app.route('/health')
def health():
    try:
        with conn() as c:
            with c.cursor() as cur:
                cur.execute('SELECT 1')
        return jsonify(ok=True, service='vsp-netflow-api', db='connected')
    except Exception as e:
        return jsonify(ok=False, error=str(e)), 503

@app.route('/api/v1/network/flows')
def flows():
    limit  = min(int(request.args.get('limit', 100)), 1000)
    risk   = request.args.get('risk')   # PASS|WARN|BLOCK
    proto  = request.args.get('proto')  # TCP|UDP
    tenant = request.args.get('tenant', 'default')
    try:
        with conn() as c:
            with c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                where = ['tenant_id = %s']
                params = [tenant]
                if risk:  where.append('risk = %s');  params.append(risk.upper())
                if proto: where.append('proto_name = %s'); params.append(proto.upper())
                params.append(limit)
                cur.execute(f'''
                    SELECT id, ts, src_ip::text, dst_ip::text, src_port, dst_port,
                           proto_name, bytes, packets, direction, policy, risk, reason
                    FROM flow_records
                    WHERE {" AND ".join(where)}
                    ORDER BY ts DESC LIMIT %s
                ''', params)
                rows = cur.fetchall()
                cur.execute('SELECT count(*) FROM flow_records WHERE tenant_id=%s', [tenant])
                total = cur.fetchone()['count']
        return jsonify(flows=[dict(r) for r in rows], total=total, limit=limit)
    except Exception as e:
        logging.error(e)
        return jsonify(error=str(e)), 500

@app.route('/api/v1/network/flows/summary')
def flows_summary():
    tenant = request.args.get('tenant', 'default')
    try:
        with conn() as c:
            with c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute('''
                    SELECT
                      count(*)                                          AS total_flows,
                      count(*) FILTER (WHERE risk='PASS')              AS allowed,
                      count(*) FILTER (WHERE risk='WARN')              AS suspicious,
                      count(*) FILTER (WHERE risk='BLOCK')             AS blocked,
                      coalesce(sum(bytes),0)                           AS total_bytes,
                      coalesce(sum(packets),0)                         AS total_packets,
                      count(DISTINCT src_ip)                           AS unique_src,
                      count(DISTINCT dst_ip)                           AS unique_dst
                    FROM flow_records WHERE tenant_id=%s
                ''', [tenant])
                s = cur.fetchone()
                cur.execute('''
                    SELECT proto_name, count(*) as flows, sum(bytes) as bytes
                    FROM flow_records WHERE tenant_id=%s
                    GROUP BY proto_name ORDER BY flows DESC
                ''', [tenant])
                protos = cur.fetchall()
                gate = 'BLOCK' if s['blocked'] > 0 else ('WARN' if s['suspicious'] > 0 else 'ALLOW')
        return jsonify(
            total_flows=s['total_flows'],
            allowed=s['allowed'],
            suspicious=s['suspicious'],
            blocked=s['blocked'],
            total_bytes=s['total_bytes'],
            total_packets=s['total_packets'],
            unique_src=s['unique_src'],
            unique_dst=s['unique_dst'],
            gate_decision=gate,
            protocol_breakdown=[dict(p) for p in protos],
        )
    except Exception as e:
        logging.error(e)
        return jsonify(error=str(e)), 500

@app.route('/api/v1/ndr/alerts')
def alerts():
    limit     = min(int(request.args.get('limit', 50)), 500)
    severity  = request.args.get('severity')
    ack       = request.args.get('acknowledged')
    tenant    = request.args.get('tenant', 'default')
    try:
        with conn() as c:
            with c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                where = ['tenant_id = %s']
                params = [tenant]
                if severity: where.append('severity = %s'); params.append(severity.upper())
                if ack is not None: where.append('acknowledged = %s'); params.append(ack=='true')
                params.append(limit)
                cur.execute(f'''
                    SELECT id, ts, src_host, dst_host, proto, dst_port,
                           alert_type, severity, action, reason, acknowledged
                    FROM ndr_alerts
                    WHERE {" AND ".join(where)}
                    ORDER BY ts DESC LIMIT %s
                ''', params)
                rows = cur.fetchall()
                cur.execute('SELECT count(*) FROM ndr_alerts WHERE tenant_id=%s', [tenant])
                total = cur.fetchone()['count']
        return jsonify(alerts=[dict(r) for r in rows], total=total)
    except Exception as e:
        logging.error(e)
        return jsonify(error=str(e)), 500

@app.route('/api/v1/ndr/alerts/<int:alert_id>/ack', methods=['POST','OPTIONS'])
def ack_alert(alert_id):
    if request.method == 'OPTIONS':
        return jsonify(ok=True)
    try:
        with conn() as c:
            with c.cursor() as cur:
                cur.execute('UPDATE ndr_alerts SET acknowledged=TRUE WHERE id=%s', [alert_id])
        return jsonify(ok=True, id=alert_id, acknowledged=True)
    except Exception as e:
        return jsonify(error=str(e)), 500

@app.route('/api/v1/network/topology')
def topology():
    tenant = request.args.get('tenant', 'default')
    try:
        with conn() as c:
            with c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute('''
                    SELECT src_ip::text, dst_ip::text, proto_name, dst_port,
                           direction, policy, risk, reason,
                           sum(bytes) as bytes, sum(packets) as packets,
                           count(*) as flow_count
                    FROM flow_records WHERE tenant_id=%s
                    GROUP BY src_ip,dst_ip,proto_name,dst_port,direction,policy,risk,reason
                    ORDER BY bytes DESC LIMIT 50
                ''', [tenant])
                edges = cur.fetchall()
                nodes = {}
                for e in edges:
                    for ip in [e['src_ip'], e['dst_ip']]:
                        if ip not in nodes:
                            nodes[ip] = {'ip': ip, 'type': 'internal' if (ip.startswith('10.') or ip.startswith('192.168.') or ip.startswith('172.')) else 'external'}
        return jsonify(
            nodes=list(nodes.values()),
            edges=[dict(e) for e in edges],
            total_nodes=len(nodes),
            total_edges=len(edges),
        )
    except Exception as e:
        return jsonify(error=str(e)), 500

if __name__ == '__main__':
    logging.info('VSP NetFlow API starting on :8930')
    app.run(host='0.0.0.0', port=8930, debug=False)

@app.route('/api/v1/logs/network-flow')
def network_flow_from_nmap():
    """Build network topology from nmap scan findings in vsp_go DB."""
    try:
        import psycopg2
        db = psycopg2.connect(os.environ['DATABASE_URL'])
        cur = db.cursor()
        # Lấy nmap findings gần nhất
        cur.execute("""
            SELECT f.path, f.rule_id, f.message, f.severity, r.created_at
            FROM findings f
            JOIN runs r ON r.id = f.run_id
            WHERE f.tool = 'nmap' AND r.mode = 'NETWORK'
            ORDER BY r.created_at DESC
            LIMIT 200
        """)
        rows = cur.fetchall()
        db.close()

        nodes = {}
        edges = []
        connections = []
        proto_counts = {}

        server_ip = '192.168.1.42'
        nodes[server_ip] = {'id': server_ip, 'label': 'vsp.linksafe.vn', 'type': 'server', 'x': 0.5, 'y': 0.5, 'gate': 'PASS'}

        for path, rule_id, message, severity, created_at in rows:
            ip = path if path else 'unknown'
            # Parse port from rule_id: open-port-22
            port = rule_id.replace('open-port-', '') if rule_id.startswith('open-port-') else ''
            # Parse service from message
            svc = message.split('/')[1].split(' ')[0] if '/' in message else ''

            if ip not in nodes:
                import random, math
                angle = random.uniform(0, 2 * math.pi)
                r = random.uniform(0.2, 0.4)
                nodes[ip] = {
                    'id': ip, 'label': ip, 'type': 'host',
                    'x': round(0.5 + r * math.cos(angle), 2),
                    'y': round(0.5 + r * math.sin(angle), 2),
                    'gate': 'WARN' if severity in ('HIGH','CRITICAL') else 'PASS'
                }

            edge_id = f"{ip}-{server_ip}"
            if not any(e['from'] == ip for e in edges):
                edges.append({
                    'from': ip, 'to': server_ip,
                    'label': f":{port}/{svc}" if port else '',
                    'suspicious': severity in ('HIGH', 'CRITICAL')
                })

            connections.append({
                'src': ip, 'dst': server_ip,
                'port': port, 'service': svc,
                'severity': severity, 'message': message
            })

            proto = 'TCP'
            proto_counts[proto] = proto_counts.get(proto, 0) + 1

        protocols = [{'name': k, 'count': v} for k, v in proto_counts.items()]
        alerts = [{'sev': r[3].lower(), 'msg': r[2], 'ts': str(r[4])} 
                  for r in rows if r[3] in ('HIGH', 'CRITICAL')][:10]

        return jsonify({
            'nodes': list(nodes.values()),
            'edges': edges,
            'connections': connections,
            'protocols': protocols,
            'alerts': alerts,
            'flows_per_min': len(rows),
            'suspicious': sum(1 for r in rows if r[3] in ('HIGH','CRITICAL')),
            'total_1h': len(rows),
            'top_hosts': []
        })
    except Exception as e:
        return jsonify({'error': str(e), 'nodes': [], 'edges': [], 'connections': [], 'protocols': [], 'alerts': [], 'flows_per_min': 0, 'suspicious': 0, 'total_1h': 0, 'top_hosts': []})


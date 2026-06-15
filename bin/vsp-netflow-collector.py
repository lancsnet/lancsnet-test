#!/usr/bin/env python3
"""
VSP NetFlow v9 Collector — UDP :2055
Nhận NetFlow packets từ softflowd, parse basic fields, insert vào PostgreSQL
"""
import socket, struct, time, logging, os
import psycopg2

logging.basicConfig(level=logging.INFO, format='[VSP-COLLECTOR] %(message)s')

DB = dict(
    host='127.0.0.1', port=5432, dbname='vsp_netflow',
    user='vsp_flow', password=os.environ.get('NETFLOW_DB_PASSWORD','')
)

KNOWN_PORTS = {
    5432:'postgres', 6379:'redis', 80:'http', 443:'https',
    22:'ssh', 3389:'rdp', 53:'dns', 8080:'http-alt', 2055:'netflow'
}

INTERNAL_NETS = ['10.', '192.168.', '172.16.', '172.17.']

def is_internal(ip):
    return any(ip.startswith(p) for p in INTERNAL_NETS)

def classify(src_ip, dst_ip, dst_port, proto):
    src_int = is_internal(src_ip)
    dst_int = is_internal(dst_ip)
    if src_int and dst_int:
        direction = 'east-west'
    elif src_int and not dst_int:
        direction = 'egress'
    elif not src_int and dst_int:
        direction = 'ingress'
    else:
        direction = 'external'

    risk = 'PASS'
    policy = 'ALLOW'
    reason = 'normal traffic'

    if dst_port == 3389 and not dst_int:
        risk = 'BLOCK'; policy = 'DENY'; reason = 'blocked RDP exposure attempt'
    elif dst_port in [8080, 8443] and not dst_int:
        risk = 'WARN'; reason = 'unusual port to external'
    elif direction == 'egress' and dst_port not in [80, 443, 53, 22, 123]:
        risk = 'WARN'; reason = 'external egress unusual port'
    elif proto == 17 and dst_port == 53:
        risk = 'WARN'; reason = 'high DNS query rate'

    return direction, policy, risk, reason

def parse_netflow_v9(data, src_addr):
    """Parse NetFlow v9 header và extract flow records cơ bản"""
    flows = []
    if len(data) < 20:
        return flows
    try:
        version, count, uptime, ts, seq, src_id = struct.unpack('!HHIIII', data[:20])
        if version != 9:
            return flows
        # Simplified: extract IPs từ raw bytes nếu có đủ data
        offset = 20
        while offset + 4 <= len(data):
            fset_id, fset_len = struct.unpack('!HH', data[offset:offset+4])
            if fset_len < 4 or offset + fset_len > len(data):
                break
            if fset_id >= 256 and fset_len >= 52:
                try:
                    rec = data[offset+4:offset+fset_len]
                    if len(rec) >= 48:
                        src_ip = socket.inet_ntoa(rec[0:4])
                        dst_ip = socket.inet_ntoa(rec[4:8])
                        pkts = struct.unpack('!I', rec[8:12])[0]
                        byt  = struct.unpack('!I', rec[12:16])[0]
                        # NetFlow v9 standard field offsets
                        sp   = struct.unpack('!H', rec[32:34])[0] if len(rec)>34 else 0
                        dp   = struct.unpack('!H', rec[34:36])[0] if len(rec)>36 else 0
                        # Try multiple proto offsets
                        proto = 0
                        for off in [38, 36, 40, 9]:
                            if len(rec) > off:
                                p = rec[off]
                                if p in (6, 17, 1, 58):
                                    proto = p; break
                        if proto == 0: proto = 6
                        pname= 'TCP' if proto==6 else ('UDP' if proto==17 else ('ICMP' if proto in (1,58) else 'OTHER'))
                        flows.append((src_ip,dst_ip,sp,dp,proto,pname,byt,pkts))
                except Exception:
                    pass
            offset += max(fset_len, 4)
    except Exception as e:
        logging.debug(f"Parse error: {e}")
    return flows

def insert_flow(cur, src_ip, dst_ip, src_port, dst_port, proto, proto_name, bytes_, packets):
    direction, policy, risk, reason = classify(src_ip, dst_ip, dst_port, proto)
    cur.execute('''
        INSERT INTO flow_records
          (src_ip,dst_ip,src_port,dst_port,proto,proto_name,bytes,packets,direction,policy,risk,reason)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
    ''', (src_ip,dst_ip,src_port,dst_port,proto,proto_name,bytes_,packets,direction,policy,risk,reason))

    if risk in ('WARN','BLOCK'):
        cur.execute('''
            INSERT INTO ndr_alerts
              (src_host,dst_host,proto,dst_port,alert_type,severity,action,reason)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s)
        ''', (src_ip, f"{dst_ip}:{dst_port}", proto_name, dst_port,
              reason.replace(' ','_')[:32], risk, risk, reason))

def main():
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.bind(('0.0.0.0', 2055))
    sock.settimeout(5.0)
    logging.info("VSP NetFlow Collector listening on UDP :2055")

    db = psycopg2.connect(**DB)
    db.autocommit = False
    cur = db.cursor()
    count = 0

    while True:
        try:
            data, addr = sock.recvfrom(65535)
            flows = parse_netflow_v9(data, addr[0])
            for f in flows:
                insert_flow(cur, *f)
                count += 1
            if flows:
                db.commit()
                logging.info(f"Inserted {len(flows)} flows from {addr[0]} (total={count})")
        except socket.timeout:
            continue
        except psycopg2.Error as e:
            logging.error(f"DB error: {e}")
            db.rollback()
            try: db = psycopg2.connect(**DB); cur = db.cursor()
            except: time.sleep(5)
        except KeyboardInterrupt:
            break

    cur.close(); db.close(); sock.close()

if __name__ == '__main__':
    main()

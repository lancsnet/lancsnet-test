#!/bin/bash
set -e
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'

echo -e "${GREEN}VSP Platform v4.9.0 — Installation${NC}"
echo "================================================"

if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}Please run as root: sudo ./install.sh${NC}"; exit 1
fi

if [ ! -f "bin/license.key" ] && [ -z "$VSP_LICENSE_FILE" ]; then
  echo -e "${RED}❌ License file not found!${NC}"
  echo "   Place license.key in bin/ or set VSP_LICENSE_FILE"; exit 1
fi

INSTALL_DIR=$(pwd)
CURRENT_USER=${SUDO_USER:-$(logname 2>/dev/null || echo "ubuntu")}

echo -e "${YELLOW}[1/7] Installing dependencies...${NC}"
apt-get update -q
apt-get install -y postgresql postgresql-client redis-server libpcap0.8 apache2-utils -q

echo -e "${YELLOW}[2/7] Installing cosign...${NC}"
if ! command -v cosign &>/dev/null; then
  curl -sLo /usr/local/bin/cosign \
    https://github.com/sigstore/cosign/releases/latest/download/cosign-linux-amd64
  chmod +x /usr/local/bin/cosign
fi

echo -e "${YELLOW}[3/7] Starting services...${NC}"
systemctl enable postgresql redis-server
systemctl start postgresql redis-server

echo -e "${YELLOW}[4/7] Setting up database...${NC}"
DB_PASS=$(openssl rand -base64 16 | tr -d "=+/")
sudo -u postgres psql -c "CREATE USER vsp WITH PASSWORD '${DB_PASS}';" 2>/dev/null || \
  sudo -u postgres psql -c "ALTER USER vsp WITH PASSWORD '${DB_PASS}';"
sudo -u postgres psql -c "CREATE DATABASE vsp_go OWNER vsp;" 2>/dev/null || true
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE vsp_go TO vsp;" 2>/dev/null || true

echo -e "${YELLOW}[5/7] Setting up keys and config...${NC}"
mkdir -p /etc/vsp /var/lib/vsp
chown ${CURRENT_USER}:${CURRENT_USER} /var/lib/vsp

# Agent key
openssl rand -base64 32 > /etc/vsp/sw-agent.key
chmod 644 /etc/vsp/sw-agent.key

# Cosign keys
openssl genrsa -out /etc/vsp/cosign.key 2048 2>/dev/null
openssl rsa -in /etc/vsp/cosign.key -pubout -out /etc/vsp/cosign.pub 2>/dev/null
COSIGN_PASS=$(openssl rand -base64 16 | tr -d "=+/")
echo -n "${COSIGN_PASS}" > /etc/vsp/cosign.pass
chown root:${CURRENT_USER} /etc/vsp/cosign.pass
chmod 640 /etc/vsp/cosign.pass
chmod 600 /etc/vsp/cosign.key

JWT_SECRET=$(openssl rand -base64 32)
REPO_KEY=$(openssl rand -base64 16 | tr -d "=+/")

cat > ${INSTALL_DIR}/.env << ENV
DATABASE_URL=postgres://vsp:${DB_PASS}@127.0.0.1:5432/vsp_go?sslmode=disable
REDIS_ADDR=127.0.0.1:6379
JWT_SECRET=${JWT_SECRET}
VSP_REPO_KEY=${REPO_KEY}
SESSION_SECRET=$(openssl rand -base64 32)
SERVER_PORT=8921
ENV
chmod 600 ${INSTALL_DIR}/.env

echo -e "${YELLOW}[6/7] Installing systemd services...${NC}"
# Gateway
cat > /etc/systemd/system/vsp.service << SVC
[Unit]
Description=VSP Platform Gateway v4.9.0
After=network.target postgresql.service redis-server.service vsp-swinv.service vsp-sched.service vsp-sc.service

[Service]
Type=simple
User=${CURRENT_USER}
WorkingDirectory=${INSTALL_DIR}
EnvironmentFile=${INSTALL_DIR}/.env
ExecStart=${INSTALL_DIR}/bin/vsp-gateway
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
SVC

# SW Inventory
cat > /etc/systemd/system/vsp-swinv.service << SVC
[Unit]
Description=VSP Software Inventory
After=network.target

[Service]
Type=simple
User=${CURRENT_USER}
WorkingDirectory=${INSTALL_DIR}
EnvironmentFile=${INSTALL_DIR}/.env
ExecStart=${INSTALL_DIR}/bin/vsp-sw-inventory
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
SVC

# Scheduler
cat > /etc/systemd/system/vsp-sched.service << SVC
[Unit]
Description=VSP Scheduler
After=network.target postgresql.service redis-server.service

[Service]
Type=simple
User=${CURRENT_USER}
WorkingDirectory=${INSTALL_DIR}
EnvironmentFile=${INSTALL_DIR}/.env
Environment=PORT=8092
ExecStart=${INSTALL_DIR}/bin/vsp-scheduler-api
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
SVC

# Supply Chain
cat > /etc/systemd/system/vsp-sc.service << SVC
[Unit]
Description=VSP Supply Chain
After=network.target

[Service]
Type=simple
User=${CURRENT_USER}
WorkingDirectory=${INSTALL_DIR}
EnvironmentFile=${INSTALL_DIR}/.env
Environment=PORT=8091
ExecStart=${INSTALL_DIR}/bin/vsp-cosign-api
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
SVC

systemctl daemon-reload
systemctl enable vsp vsp-swinv vsp-sched vsp-sc
systemctl start vsp-swinv vsp-sched vsp-sc
sleep 3
systemctl start vsp
sleep 5

echo -e "${YELLOW}[7/7] Creating admin user...${NC}"
ADMIN_PASS=$(openssl rand -base64 12 | tr -d "=+/")
BCRYPT=$(htpasswd -bnBC 10 "" "${ADMIN_PASS}" | tr -d ':\n' | sed 's/$2y$/$2a$/')

PGPASSWORD=${DB_PASS} psql -h 127.0.0.1 -U vsp -d vsp_go << SQL 2>/dev/null
INSERT INTO tenants (slug, name, plan, active) VALUES ('default', 'Default', 'enterprise', true) ON CONFLICT DO NOTHING;
INSERT INTO users (tenant_id, email, pw_hash, role) SELECT id, 'admin@vsp.local', '${BCRYPT}', 'admin' FROM tenants WHERE slug='default' ON CONFLICT DO NOTHING;
SQL

echo ""
echo -e "${GREEN}✅ VSP Platform installed!${NC}"
echo "================================================"
echo -e "  URL:      ${GREEN}http://$(hostname -I | awk '{print $1}'):8921${NC}"
echo -e "  Email:    ${GREEN}admin@vsp.local${NC}"
echo -e "  Password: ${GREEN}${ADMIN_PASS}${NC}"
echo ""
echo -e "${YELLOW}⚠️  Save this password — it won't be shown again!${NC}"

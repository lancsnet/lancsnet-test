#!/bin/bash
cd /home/devsecops/vsp-platform-v4.9.0

echo "[1/3] Starting gateway..."
nohup env $(cat .env | grep -v '^#' | xargs) ./bin/vsp-gateway >> /tmp/gateway.log 2>&1 &
sleep 3

echo "[2/3] Starting nginx..."
sudo cp config/nginx_vsp.conf /etc/nginx/sites-available/vsp
sudo ln -sf /etc/nginx/sites-available/vsp /etc/nginx/sites-enabled/vsp
sudo nginx -t && sudo systemctl restart nginx

echo "[3/3] Starting Python proxy (port 19999 -> 18999)..."
# Ensure Python proxy not needed since nginx is on 18999
# Client SSH tunnel: ssh -L 19999:localhost:18999 user@server

echo "Done! Access: http://localhost:18999"
echo "SSH tunnel: ssh -L 19999:localhost:18999 devsecops@SERVER_IP"

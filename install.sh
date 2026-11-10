#!/usr/bin/env bash
# Colyin Automated One-Line Installer for Ubuntu 24.04 LTS
set -e

echo "=========================================================="
echo "         Colyin Self-Hosted PaaS Engine Installer         "
echo "=========================================================="

# 1. Verify root permissions
if [ "$EUID" -ne 0 ]; then
  echo "[Error] Please run this installer as root or with sudo."
  exit 1
fi

# 2. Update package cache and install prerequisites
echo "[1/5] Updating apt packages and installing curl & git..."
apt-get update -qq
apt-get install -y -qq curl git apt-transport-https ca-certificates gnupg lsb-release

# 3. Install Docker Engine & Docker Compose if not present
if ! command -v docker &> /dev/null; then
  echo "[2/5] Docker Engine not found. Installing official Docker Engine..."
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc

  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
    $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
    tee /etc/apt/sources.list.d/docker.list > /dev/null

  apt-get update -qq
  apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  systemctl enable --now docker
else
  echo "[2/5] Docker Engine is already installed."
fi

# 4. Configure Firewall (UFW)
if command -v ufw &> /dev/null && ufw status | grep -q "Status: active"; then
  echo "[3/5] Configuring firewall rules (Ports 22, 80, 443, 3000, 10000-10020, 15672)..."
  ufw allow 22/tcp
  ufw allow 80/tcp
  ufw allow 443/tcp
  ufw allow 3000/tcp
  ufw allow 15672/tcp
  ufw allow 10000:10020/tcp
  ufw reload
fi

# 5. Generate Environment & Secrets
echo "[4/5] Preparing persistent data directories and configuration..."
INSTALL_DIR=$(pwd)
mkdir -p data apps-storage
chmod 700 data apps-storage 2>/dev/null || true

if [ -f data/prod.db ]; then
  echo "[Info] Existing Colyin database detected in ./data/prod.db."
  echo "[Info] Preserving all existing projects, services, and credentials across reinstall!"
fi

if [ ! -f .env ]; then
  RANDOM_MASTER_KEY=$(openssl rand -hex 32 2>/dev/null || node -e 'console.log(require("crypto").randomBytes(32).toString("hex"))')
  RANDOM_AUTH_SECRET=$(openssl rand -hex 32 2>/dev/null || node -e 'console.log(require("crypto").randomBytes(32).toString("hex"))')
  RANDOM_WEBHOOK_SECRET=$(openssl rand -hex 24 2>/dev/null || node -e 'console.log(require("crypto").randomBytes(24).toString("hex"))')
  SERVER_IP=$(curl -s -4 ifconfig.me || curl -s -4 icanhazip.com || echo "localhost")
  
  cat <<EOF > .env
NODE_ENV=production
ENCRYPTION_MASTER_KEY=${RANDOM_MASTER_KEY}
AUTH_SECRET=${RANDOM_AUTH_SECRET}
GITHUB_WEBHOOK_SECRET=${RANDOM_WEBHOOK_SECRET}
PUBLIC_IP=${SERVER_IP}
WILDCARD_DOMAIN=${SERVER_IP}.sslip.io
PAAS_DOMAIN=localhost
ACME_EMAIL=admin@example.com
DATABASE_URL=file:/app/data/prod.db
EOF
  echo "[Info] Detected Public IP: ${SERVER_IP}"
  echo "[Info] Cryptographic secrets auto-generated for AES-256-GCM, JWT & Webhooks."
else
  echo "[Info] Existing .env configuration detected. Preserving all encryption keys."
fi

# 6. Launch via Docker Compose
echo "[5/5] Launching Colyin via Docker Compose..."
docker compose pull || true
docker compose up -d --build

echo ""
echo "=========================================================="
echo "    Colyin is successfully deployed and running!          "
echo "    Dashboard: http://${SERVER_IP:-localhost}:3000        "
echo "    Ingress  : Ports 80 and 443 (Traefik v3)              "
echo "=========================================================="

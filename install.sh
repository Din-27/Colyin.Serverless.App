#!/usr/bin/env bash
# MiniPaaS Automated One-Line Installer for Ubuntu 24.04 LTS
set -e

echo "=========================================================="
echo "      MiniPaaS Self-Hosted Serverless Engine Installer     "
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
  echo "[3/5] Configuring firewall rules (Ports 22, 80, 443)..."
  ufw allow 22/tcp
  ufw allow 80/tcp
  ufw allow 443/tcp
  ufw reload
fi

# 5. Generate Environment & Secrets
echo "[4/5] Preparing environment and generating encryption keys..."
INSTALL_DIR="/opt/minipaas"
mkdir -p "$INSTALL_DIR"
cd "$INSTALL_DIR"

if [ ! -f .env ]; then
  RANDOM_KEY=$(openssl rand -hex 32)
  cat <<EOF > .env
ENCRYPTION_MASTER_KEY=${RANDOM_KEY}
PAAS_DOMAIN=localhost
ACME_EMAIL=admin@example.com
DATABASE_URL=file:/app/data/prod.db
EOF
fi

# 6. Launch via Docker Compose
echo "[5/5] Launching MiniPaaS via Docker Compose..."
docker compose pull || true
docker compose up -d --build

echo ""
echo "=========================================================="
echo "    MiniPaaS is successfully deployed and running!        "
echo "    Dashboard: http://localhost:3000                      "
echo "    Ingress  : Ports 80 and 443 (Traefik v3)              "
echo "=========================================================="

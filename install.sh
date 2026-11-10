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

# 4. Port Availability Detection & Firewall (UFW)
DEFAULT_PORT=3050
COLYIN_PORT=${DEFAULT_PORT}

if [ -f .env ] && grep -q "^PORT=" .env; then
  COLYIN_PORT=$(grep "^PORT=" .env | cut -d '=' -f2 | tr -d '"' | tr -d "'" | tr -d ' ')
elif [ -f .env ] && grep -q "^COLYIN_PORT=" .env; then
  COLYIN_PORT=$(grep "^COLYIN_PORT=" .env | cut -d '=' -f2 | tr -d '"' | tr -d "'" | tr -d ' ')
fi

# If the selected port is currently in use on this server, pick safe port in 3050+ range
if (command -v ss &>/dev/null && ss -tuln | grep -q ":${COLYIN_PORT} ") || (command -v lsof &>/dev/null && lsof -i:${COLYIN_PORT} &>/dev/null); then
  echo "[Notice] Port ${COLYIN_PORT} is currently in use on this server."
  CANDIDATE=3050
  while (command -v ss &>/dev/null && ss -tuln | grep -q ":${CANDIDATE} ") || (command -v lsof &>/dev/null && lsof -i:${CANDIDATE} &>/dev/null); do
    CANDIDATE=$((CANDIDATE + 1))
  done
  COLYIN_PORT=${CANDIDATE}
  echo "[Info] Assigned safe non-colliding dashboard port: ${COLYIN_PORT}"
fi

if command -v ufw &> /dev/null && ufw status | grep -q "Status: active"; then
  echo "[3/5] Configuring firewall rules (Ports 22, 80, 443, ${COLYIN_PORT}, 10000-10020, 15672)..."
  ufw allow 22/tcp
  ufw allow 80/tcp
  ufw allow 443/tcp
  ufw allow ${COLYIN_PORT}/tcp
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
PORT=${COLYIN_PORT}
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
  echo "[Info] Dashboard mapped to port: ${COLYIN_PORT}"
  echo "[Info] Cryptographic secrets auto-generated for AES-256-GCM, JWT & Webhooks."
else
  echo "[Info] Existing .env configuration detected. Preserving all encryption keys."
  if grep -q "^PORT=" .env; then
    # If existing PORT was 3000 and it collided, update to safe port
    OLD_PORT=$(grep "^PORT=" .env | cut -d '=' -f2 | tr -d '"' | tr -d "'" | tr -d ' ')
    if [ "$OLD_PORT" = "3000" ] && [ "$COLYIN_PORT" != "3000" ]; then
      sed -i "s/^PORT=.*/PORT=${COLYIN_PORT}/" .env 2>/dev/null || true
      echo "[Info] Updated .env PORT from 3000 to ${COLYIN_PORT} to prevent collision."
    fi
  elif grep -q "^COLYIN_PORT=" .env; then
    OLD_PORT=$(grep "^COLYIN_PORT=" .env | cut -d '=' -f2 | tr -d '"' | tr -d "'" | tr -d ' ')
    if [ "$OLD_PORT" = "3000" ] && [ "$COLYIN_PORT" != "3000" ]; then
      sed -i "s/^COLYIN_PORT=.*/COLYIN_PORT=${COLYIN_PORT}/" .env 2>/dev/null || true
      echo "[Info] Updated .env COLYIN_PORT from 3000 to ${COLYIN_PORT} to prevent collision."
    fi
  else
    echo "PORT=${COLYIN_PORT}" >> .env
    echo "[Info] Added PORT=${COLYIN_PORT} to .env"
  fi
fi

# 6. Launch via Docker Compose
echo "[5/5] Launching Colyin via Docker Compose..."
docker compose pull || true
docker compose up -d --build

echo ""
echo "=========================================================="
echo "    Colyin is successfully deployed and running!          "
echo "    Dashboard: http://${SERVER_IP:-localhost}:${COLYIN_PORT}        "
echo "    Ingress  : Ports 80 and 443 (Traefik v3)              "
echo "=========================================================="

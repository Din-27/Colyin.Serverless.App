#!/usr/bin/env bash
# Colyin Self-Hosted PaaS Engine Uninstaller
set -e

echo "=========================================================="
echo "         Colyin Self-Hosted PaaS Uninstaller              "
echo "=========================================================="

# 1. Verify root permissions
if [ "$EUID" -ne 0 ]; then
  echo "[Error] Please run this uninstaller as root or with sudo."
  exit 1
fi

INSTALL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$INSTALL_DIR"

FORCE=false
PURGE_DATA=false

for arg in "$@"; do
  case $arg in
    -y|--yes|--force)
      FORCE=true
      shift
      ;;
    --purge-data)
      PURGE_DATA=true
      shift
      ;;
  esac
done

if [ "$FORCE" = false ]; then
  echo ""
  echo "⚠️  WARNING: You are about to uninstall Colyin from this server."
  echo "Installation directory: $INSTALL_DIR"
  echo ""
  read -p "Are you sure you want to stop and remove all Colyin services? (y/N): " CONFIRM
  if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
    echo "Uninstall aborted."
    exit 0
  fi

  read -p "Do you also want to permanently delete all database files, app storage, and credentials? (y/N): " PURGE_CONFIRM
  if [[ "$PURGE_CONFIRM" =~ ^[Yy]$ ]]; then
    PURGE_DATA=true
  fi
fi

echo ""
echo "[1/4] Stopping and removing Colyin core services (Docker Compose)..."
if command -v docker &> /dev/null && [ -f "docker-compose.yml" ]; then
  docker compose down -v --remove-orphans 2>/dev/null || true
fi

echo "[2/4] Stopping user application & database addon containers..."
if command -v docker &> /dev/null; then
  # Remove containers attached to minipaas-global network
  RUNNING_APPS=$(docker ps -a --filter "network=minipaas-global" -q 2>/dev/null || true)
  if [ -n "$RUNNING_APPS" ]; then
    echo "Stopping containers on minipaas-global network..."
    docker rm -f $RUNNING_APPS 2>/dev/null || true
  fi

  # Remove minipaas network
  docker network rm minipaas-global 2>/dev/null || true
fi

echo "[3/4] Cleaning up files and persistent storage..."
if [ "$PURGE_DATA" = true ]; then
  echo "Purging all data directories (./data, ./apps-storage, .env, credentials)..."
  rm -rf data apps-storage .env colyin-credentials.txt
  cd /
  if [ "$INSTALL_DIR" = "/opt/colyin" ]; then
    rm -rf /opt/colyin
    echo "Removed /opt/colyin directory."
  else
    echo "Removed Colyin data files from $INSTALL_DIR."
  fi
else
  echo "[Info] Data preserved in $INSTALL_DIR/data and .env."
  echo "[Info] If you wish to delete everything manually later, run: rm -rf $INSTALL_DIR"
fi

echo "[4/4] Finalizing cleanup..."
echo ""
echo "=========================================================="
echo "✅ Colyin has been successfully uninstalled from this host."
echo "=========================================================="
echo ""
echo "Optional: If you want to close the firewall ports opened by Colyin, run:"
echo "  sudo ufw delete allow 3000/tcp"
echo "  sudo ufw delete allow 15672/tcp"
echo "  sudo ufw delete allow 10000:10020/tcp"
echo "  sudo ufw reload"
echo ""


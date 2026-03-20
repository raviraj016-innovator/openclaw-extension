#!/bin/bash
# =============================================================================
# OpenClaw Extension — EC2 Setup Script
# Run this on a fresh Ubuntu 24.04 EC2 instance
# Usage: ssh ubuntu@your-ec2-ip 'bash -s' < setup-ec2.sh
# =============================================================================

set -euo pipefail

echo "===== OpenClaw Extension — EC2 Setup ====="
echo ""

# --- System packages ---
echo "[1/8] Installing system packages..."
sudo apt-get update -qq
sudo apt-get install -y -qq nginx certbot python3-certbot-nginx git curl build-essential

# --- Node.js 22 ---
echo "[2/8] Installing Node.js 22..."
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y -qq nodejs

# --- PM2 ---
echo "[3/8] Installing PM2..."
sudo npm install -g pm2

# --- Clone the project ---
echo "[4/8] Cloning openclaw-extension..."
cd /home/ubuntu
if [ -d "openclaw-extension" ]; then
  cd openclaw-extension && git pull
else
  git clone https://github.com/YOUR_USERNAME/openclaw-extension.git
  cd openclaw-extension
fi

# --- Install plugin dependencies ---
echo "[5/8] Installing plugin dependencies..."
cd /home/ubuntu/openclaw-extension/openclaw-plugin
npm install --production

# --- Build extension (for serving dashboard) ---
echo "[6/8] Building extension..."
cd /home/ubuntu/openclaw-extension
npm install
npm run build

# --- Create .env for plugin ---
echo "[7/8] Creating plugin config..."
cat > /home/ubuntu/openclaw-extension/openclaw-plugin/.env << 'ENVFILE'
GATEWAY_URL=http://127.0.0.1:18789
GATEWAY_TOKEN=REPLACE_WITH_YOUR_OPENCLAW_TOKEN
EXTENSION_TOKENS=REPLACE_WITH_A_SECURE_TOKEN
PLUGIN_PORT=18790
ENVFILE

echo ""
echo "⚠️  IMPORTANT: Edit the .env file with your actual tokens:"
echo "   nano /home/ubuntu/openclaw-extension/openclaw-plugin/.env"
echo ""

# --- Install OpenClaw ---
echo "[8/8] Installing OpenClaw..."
curl -fsSL https://get.openclaw.ai | bash || echo "OpenClaw install may need manual setup"

echo ""
echo "===== Setup Complete ====="
echo ""
echo "Next steps:"
echo "  1. Edit tokens:  nano ~/openclaw-extension/openclaw-plugin/.env"
echo "  2. Start services: bash ~/openclaw-extension/deploy/start-services.sh"
echo "  3. Setup SSL:     bash ~/openclaw-extension/deploy/setup-ssl.sh YOUR_DOMAIN"
echo ""

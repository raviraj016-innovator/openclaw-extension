#!/bin/bash
# =============================================================================
# Start all services with PM2
# =============================================================================

set -euo pipefail

echo "Starting services..."

# Start OpenClaw (if installed)
if command -v openclaw &> /dev/null; then
  echo "Starting OpenClaw..."
  pm2 start "openclaw start" --name openclaw-agent || echo "OpenClaw may already be running"
fi

# Start the Plugin
echo "Starting OpenClaw Browser Context Plugin..."
cd /home/ubuntu/openclaw-extension/openclaw-plugin
pm2 start "npx tsx src/index.ts" --name openclaw-plugin --cwd /home/ubuntu/openclaw-extension/openclaw-plugin

# Save PM2 config for auto-restart on reboot
pm2 save
pm2 startup | tail -1 | bash || true

echo ""
echo "Services running:"
pm2 list

echo ""
echo "Logs: pm2 logs"
echo "Status: pm2 status"
echo ""

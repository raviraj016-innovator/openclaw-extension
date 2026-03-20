#!/bin/bash
set -euo pipefail

# Write clean OpenClaw config
cat > /home/ubuntu/.openclaw/openclaw.json << 'CONFIGEOF'
{
  "gateway": {
    "port": 18789,
    "mode": "local",
    "bind": "lan"
  },
  "agents": {
    "defaults": {
      "model": {
        "primary": "anthropic/claude-sonnet-4-6"
      }
    }
  }
}
CONFIGEOF

chown ubuntu:ubuntu /home/ubuntu/.openclaw/openclaw.json
chmod 600 /home/ubuntu/.openclaw/openclaw.json
echo "Config written"

# Set API key as env var in PM2
ANTHROPIC_KEY=$(aws ssm get-parameter --name "/openclaw-extension/anthropic-api-key" --with-decryption --region us-east-1 --query "Parameter.Value" --output text)

sudo -u ubuntu pm2 delete openclaw-agent 2>/dev/null || true
sudo -u ubuntu ANTHROPIC_API_KEY="$ANTHROPIC_KEY" pm2 start "openclaw gateway --port 18789" --name openclaw-agent
sleep 5
sudo -u ubuntu pm2 save

echo "=== Status ==="
curl -s http://localhost:18789/health || echo "No health endpoint yet"
echo ""
sudo -u ubuntu pm2 logs openclaw-agent --lines 10 --nostream

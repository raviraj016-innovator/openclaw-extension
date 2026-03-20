#!/bin/bash
REGION=us-east-1
echo "Reading keys from SSM..."
ANTHROPIC_KEY=$(aws ssm get-parameter --name "/openclaw-extension/anthropic-api-key" --with-decryption --region "$REGION" --query "Parameter.Value" --output text)
GW_TOKEN=$(openssl rand -hex 24)
EXT_TOKEN=$(aws ssm get-parameter --name "/openclaw-extension/extension-token" --with-decryption --region "$REGION" --query "Parameter.Value" --output text)
echo "Keys loaded. Configuring OpenClaw..."
mkdir -p /home/ubuntu/.openclaw
printf '{"auth":{"profiles":{"anthropic:default":{"provider":"anthropic","mode":"token","token":"%s"}}},"gateway":{"port":18789,"mode":"local","bind":"0.0.0.0","auth":{"mode":"token","token":"%s"}},"agents":{"defaults":{"model":{"primary":"anthropic/claude-sonnet-4-6"}}}}\n' "$ANTHROPIC_KEY" "$GW_TOKEN" > /home/ubuntu/.openclaw/openclaw.json
chown -R ubuntu:ubuntu /home/ubuntu/.openclaw
echo "OpenClaw config written."
echo "Updating plugin .env..."
printf 'EXTENSION_TOKENS=%s\nPLUGIN_PORT=18790\nGATEWAY_URL=http://127.0.0.1:18789\nGATEWAY_TOKEN=%s\n' "$EXT_TOKEN" "$GW_TOKEN" > /home/ubuntu/openclaw-extension/openclaw-plugin/.env
chown ubuntu:ubuntu /home/ubuntu/openclaw-extension/openclaw-plugin/.env
echo "Starting OpenClaw..."
sudo -u ubuntu pm2 delete openclaw-agent 2>/dev/null || true
sudo -u ubuntu pm2 start "openclaw start" --name openclaw-agent
echo "Restarting plugin..."
sudo -u ubuntu pm2 restart openclaw-plugin 2>/dev/null || true
sudo -u ubuntu pm2 save
echo "Updating Nginx..."
cat > /etc/nginx/sites-available/openclaw-extension << 'NGEOF'
server {
    listen 80;
    server_name claw.raviraj.lol;
    location /ws/extension {
        proxy_pass http://127.0.0.1:18790;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
    location /openclaw/ {
        proxy_pass http://127.0.0.1:18789/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
    location / {
        proxy_pass http://127.0.0.1:18790;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
NGEOF
nginx -t && systemctl reload nginx
echo "Refreshing SSL..."
certbot --nginx -d claw.raviraj.lol --non-interactive --agree-tos --email admin@claw.raviraj.lol 2>/dev/null || echo "SSL already configured"
echo ""
echo "===== ALL DONE ====="
echo "Plugin:   https://claw.raviraj.lol/"
echo "OpenClaw: https://claw.raviraj.lol/openclaw/"
sudo -u ubuntu pm2 list

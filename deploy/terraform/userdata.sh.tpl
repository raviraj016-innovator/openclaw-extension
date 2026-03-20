#!/bin/bash
set -euo pipefail
exec > /var/log/openclaw-setup.log 2>&1

# IMDSv2 requires a token
IMDS_TOKEN=$(curl -s -X PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 300")
REGION=$(curl -s -H "X-aws-ec2-metadata-token: $IMDS_TOKEN" http://169.254.169.254/latest/meta-data/placement/region)
PROJECT="${project_name}"
DOMAIN="${domain}"
REPO="${github_repo}"

echo "===== OpenClaw EC2 Bootstrap ====="
echo "Region: $REGION | Domain: $DOMAIN"

# --- System packages ---
apt-get update -qq
apt-get install -y -qq nginx certbot python3-certbot-nginx git curl build-essential jq unzip

# --- Node.js 22 ---
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y -qq nodejs
npm install -g pm2

# --- AWS CLI v2 ---
if ! command -v aws &> /dev/null; then
  curl -s "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o /tmp/awscliv2.zip
  cd /tmp && unzip -q awscliv2.zip && ./aws/install
fi

# --- Read secrets from SSM ---
echo "Reading secrets from SSM..."
EXT_TOKEN=$(aws ssm get-parameter --name "/$PROJECT/extension-token" --with-decryption --region "$REGION" --query 'Parameter.Value' --output text)

# --- Clone repo ---
cd /home/ubuntu
if [ -d "openclaw-extension" ]; then
  cd openclaw-extension && sudo -u ubuntu git pull && cd ..
else
  sudo -u ubuntu git clone "https://github.com/$REPO.git" openclaw-extension
fi

# --- Plugin setup ---
cd /home/ubuntu/openclaw-extension/openclaw-plugin
sudo -u ubuntu npm install --production

cat > .env << ENVFILE
EXTENSION_TOKENS=$EXT_TOKEN
PLUGIN_PORT=18790
ENVFILE
chown ubuntu:ubuntu .env

# --- Nginx ---
cat > /etc/nginx/sites-available/openclaw-extension << NGINXCONF
server {
    listen 80;
    server_name $DOMAIN;

    location /ws/extension {
        proxy_pass http://127.0.0.1:18790;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }

    location / {
        proxy_pass http://127.0.0.1:18790;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
NGINXCONF

ln -sf /etc/nginx/sites-available/openclaw-extension /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# --- PM2 services ---
cd /home/ubuntu/openclaw-extension/openclaw-plugin
sudo -u ubuntu pm2 start "npx tsx src/index.ts" --name openclaw-plugin --cwd /home/ubuntu/openclaw-extension/openclaw-plugin
sudo -u ubuntu pm2 save
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu | tail -1 | bash || true

# --- SSL ---
certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --email "admin@$DOMAIN" 2>/dev/null || {
  echo "SSL deferred — point DNS first, then: sudo certbot --nginx -d $DOMAIN"
}

echo "===== Bootstrap Complete ====="

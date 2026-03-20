#!/bin/bash
set -euo pipefail
echo "Deploying chat feature..."

# Read Anthropic key from SSM
REGION=us-east-1
ANTHROPIC_KEY=$(aws ssm get-parameter --name "/openclaw-extension/anthropic-api-key" --with-decryption --region "$REGION" --query "Parameter.Value" --output text)
EXT_TOKEN=$(aws ssm get-parameter --name "/openclaw-extension/extension-token" --with-decryption --region "$REGION" --query "Parameter.Value" --output text)

# Install deps
cd /home/ubuntu/openclaw-extension/openclaw-plugin
sudo -u ubuntu npm install --production

# Update .env with Anthropic key
printf 'EXTENSION_TOKENS=%s\nPLUGIN_PORT=18790\nANTHROPIC_API_KEY=%s\n' "$EXT_TOKEN" "$ANTHROPIC_KEY" > .env
chown ubuntu:ubuntu .env

# Restart plugin
sudo -u ubuntu pm2 restart openclaw-plugin
sleep 3
echo "Chat feature deployed!"
sudo -u ubuntu pm2 logs openclaw-plugin --lines 5 --nostream

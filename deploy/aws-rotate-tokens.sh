#!/bin/bash
# =============================================================================
# Rotate tokens in SSM and restart services
# Usage: bash deploy/aws-rotate-tokens.sh
# =============================================================================

set -euo pipefail

REGION=${AWS_REGION:-us-east-1}
STACK_NAME="openclaw-extension"

echo "===== Rotating Tokens ====="

NEW_EXT_TOKEN=$(openssl rand -hex 24)
NEW_GW_TOKEN=$(openssl rand -hex 24)

aws ssm put-parameter \
  --name "/${STACK_NAME}/extension-token" \
  --type SecureString \
  --value "$NEW_EXT_TOKEN" \
  --overwrite \
  --region "$REGION" > /dev/null

aws ssm put-parameter \
  --name "/${STACK_NAME}/gateway-token" \
  --type SecureString \
  --value "$NEW_GW_TOKEN" \
  --overwrite \
  --region "$REGION" > /dev/null

echo "New extension token: $NEW_EXT_TOKEN"
echo "New gateway token:   $NEW_GW_TOKEN"
echo ""

# Read instance IP
if [ -f deploy-info.json ]; then
  IP=$(jq -r '.publicIp' deploy-info.json)
  KEY=$(jq -r '.keyPair' deploy-info.json)

  echo "Restarting services on $IP..."
  ssh -i "$KEY" ubuntu@"$IP" << 'REMOTE'
    REGION=$(curl -s http://169.254.169.254/latest/meta-data/placement/region)
    STACK_NAME="openclaw-extension"
    EXT_TOKEN=$(aws ssm get-parameter --name "/${STACK_NAME}/extension-token" --with-decryption --region "$REGION" --query 'Parameter.Value' --output text)
    GW_TOKEN=$(aws ssm get-parameter --name "/${STACK_NAME}/gateway-token" --with-decryption --region "$REGION" --query 'Parameter.Value' --output text)

    cat > ~/openclaw-extension/openclaw-plugin/.env << ENVFILE
GATEWAY_URL=http://127.0.0.1:18789
GATEWAY_TOKEN=${GW_TOKEN}
EXTENSION_TOKENS=${EXT_TOKEN}
PLUGIN_PORT=18790
ENVFILE

    pm2 restart openclaw-plugin
    echo "Plugin restarted with new tokens."
REMOTE

  echo ""
  echo "Update browser extension with new token: $NEW_EXT_TOKEN"
else
  echo "No deploy-info.json found. Update the EC2 .env manually."
fi

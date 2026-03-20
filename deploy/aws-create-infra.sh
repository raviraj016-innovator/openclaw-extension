#!/bin/bash
# =============================================================================
# OpenClaw Extension — Create ALL AWS Infrastructure from CLI
#
# Prerequisites:
#   - AWS CLI configured (aws configure)
#   - A domain name you control
#
# Usage:
#   export DOMAIN=context.yourdomain.com
#   export ANTHROPIC_API_KEY=sk-ant-...
#   export EXTENSION_TOKEN=$(openssl rand -hex 24)
#   bash deploy/aws-create-infra.sh
# =============================================================================

set -euo pipefail

# --- Config ---
REGION=${AWS_REGION:-us-east-1}
INSTANCE_TYPE=${INSTANCE_TYPE:-t3.medium}
KEY_NAME=${KEY_NAME:-openclaw-extension-key}
STACK_NAME="openclaw-extension"
DOMAIN=${DOMAIN:?"Set DOMAIN=context.yourdomain.com"}
ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY:?"Set ANTHROPIC_API_KEY=sk-ant-..."}
EXTENSION_TOKEN=${EXTENSION_TOKEN:-$(openssl rand -hex 24)}
OPENCLAW_GATEWAY_TOKEN=$(openssl rand -hex 24)

echo "===== OpenClaw Extension — AWS Infrastructure Setup ====="
echo "Region:     $REGION"
echo "Domain:     $DOMAIN"
echo "Instance:   $INSTANCE_TYPE"
echo "Key:        $KEY_NAME"
echo "Ext Token:  $EXTENSION_TOKEN"
echo ""

# --- Step 1: Create SSH key pair ---
echo "[1/9] Creating SSH key pair..."
if aws ec2 describe-key-pairs --key-names "$KEY_NAME" --region "$REGION" 2>/dev/null; then
  echo "  Key pair '$KEY_NAME' already exists, skipping."
else
  aws ec2 create-key-pair \
    --key-name "$KEY_NAME" \
    --region "$REGION" \
    --query 'KeyMaterial' \
    --output text > "${KEY_NAME}.pem"
  chmod 400 "${KEY_NAME}.pem"
  echo "  Created ${KEY_NAME}.pem — keep this safe!"
fi

# --- Step 2: Create VPC + Security Group ---
echo "[2/9] Creating security group..."
VPC_ID=$(aws ec2 describe-vpcs --filters "Name=is-default,Values=true" --region "$REGION" --query 'Vpcs[0].VpcId' --output text)

SG_ID=$(aws ec2 describe-security-groups --filters "Name=group-name,Values=${STACK_NAME}-sg" --region "$REGION" --query 'SecurityGroups[0].GroupId' --output text 2>/dev/null || echo "None")

if [ "$SG_ID" = "None" ] || [ -z "$SG_ID" ]; then
  SG_ID=$(aws ec2 create-security-group \
    --group-name "${STACK_NAME}-sg" \
    --description "OpenClaw Extension - Plugin Server" \
    --vpc-id "$VPC_ID" \
    --region "$REGION" \
    --query 'GroupId' --output text)

  # SSH
  aws ec2 authorize-security-group-ingress --group-id "$SG_ID" --protocol tcp --port 22 --cidr 0.0.0.0/0 --region "$REGION"
  # HTTP
  aws ec2 authorize-security-group-ingress --group-id "$SG_ID" --protocol tcp --port 80 --cidr 0.0.0.0/0 --region "$REGION"
  # HTTPS
  aws ec2 authorize-security-group-ingress --group-id "$SG_ID" --protocol tcp --port 443 --cidr 0.0.0.0/0 --region "$REGION"

  echo "  Created security group: $SG_ID"
else
  echo "  Security group exists: $SG_ID"
fi

# --- Step 3: Store secrets in SSM Parameter Store ---
echo "[3/9] Storing secrets in SSM Parameter Store..."

aws ssm put-parameter \
  --name "/${STACK_NAME}/anthropic-api-key" \
  --type SecureString \
  --value "$ANTHROPIC_API_KEY" \
  --overwrite \
  --region "$REGION" > /dev/null

aws ssm put-parameter \
  --name "/${STACK_NAME}/extension-token" \
  --type SecureString \
  --value "$EXTENSION_TOKEN" \
  --overwrite \
  --region "$REGION" > /dev/null

aws ssm put-parameter \
  --name "/${STACK_NAME}/gateway-token" \
  --type SecureString \
  --value "$OPENCLAW_GATEWAY_TOKEN" \
  --overwrite \
  --region "$REGION" > /dev/null

aws ssm put-parameter \
  --name "/${STACK_NAME}/domain" \
  --type String \
  --value "$DOMAIN" \
  --overwrite \
  --region "$REGION" > /dev/null

echo "  Stored 4 parameters in SSM:"
echo "    /${STACK_NAME}/anthropic-api-key  (SecureString)"
echo "    /${STACK_NAME}/extension-token    (SecureString)"
echo "    /${STACK_NAME}/gateway-token      (SecureString)"
echo "    /${STACK_NAME}/domain             (String)"

# --- Step 4: Create IAM role for EC2 to read SSM ---
echo "[4/9] Creating IAM role for SSM access..."

ROLE_NAME="${STACK_NAME}-ec2-role"
INSTANCE_PROFILE_NAME="${STACK_NAME}-ec2-profile"

# Trust policy
cat > /tmp/ec2-trust-policy.json << 'TRUST'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": { "Service": "ec2.amazonaws.com" },
      "Action": "sts:AssumeRole"
    }
  ]
}
TRUST

# SSM read policy
cat > /tmp/ssm-policy.json << POLICY
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ssm:GetParameter",
        "ssm:GetParameters",
        "ssm:GetParametersByPath"
      ],
      "Resource": "arn:aws:ssm:${REGION}:*:parameter/${STACK_NAME}/*"
    }
  ]
}
POLICY

aws iam create-role \
  --role-name "$ROLE_NAME" \
  --assume-role-policy-document file:///tmp/ec2-trust-policy.json \
  --region "$REGION" 2>/dev/null || echo "  Role exists."

aws iam put-role-policy \
  --role-name "$ROLE_NAME" \
  --policy-name "${STACK_NAME}-ssm-read" \
  --policy-document file:///tmp/ssm-policy.json \
  --region "$REGION"

aws iam create-instance-profile \
  --instance-profile-name "$INSTANCE_PROFILE_NAME" \
  --region "$REGION" 2>/dev/null || echo "  Instance profile exists."

aws iam add-role-to-instance-profile \
  --instance-profile-name "$INSTANCE_PROFILE_NAME" \
  --role-name "$ROLE_NAME" \
  --region "$REGION" 2>/dev/null || echo "  Role already attached."

echo "  IAM role: $ROLE_NAME"
echo "  Instance profile: $INSTANCE_PROFILE_NAME"

# Wait for instance profile to propagate
echo "  Waiting 10s for IAM propagation..."
sleep 10

# --- Step 5: Get latest Ubuntu 24.04 AMI ---
echo "[5/9] Finding Ubuntu 24.04 AMI..."
AMI_ID=$(aws ec2 describe-images \
  --owners 099720109477 \
  --filters "Name=name,Values=ubuntu/images/hvm-ssd-gp3/ubuntu-noble-24.04-amd64-server-*" \
  --query 'sort_by(Images, &CreationDate)[-1].ImageId' \
  --output text \
  --region "$REGION")
echo "  AMI: $AMI_ID"

# --- Step 6: Create user data script (runs on first boot) ---
echo "[6/9] Preparing user data..."

cat > /tmp/userdata.sh << 'USERDATA'
#!/bin/bash
set -euo pipefail
exec > /var/log/openclaw-setup.log 2>&1

REGION=$(curl -s http://169.254.169.254/latest/meta-data/placement/region)
STACK_NAME="openclaw-extension"

echo "===== OpenClaw EC2 Bootstrap ====="

# Install packages
apt-get update -qq
apt-get install -y -qq nginx certbot python3-certbot-nginx git curl build-essential jq

# Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y -qq nodejs

# PM2
npm install -g pm2

# AWS CLI v2 (for SSM)
if ! command -v aws &> /dev/null; then
  curl -s "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o /tmp/awscliv2.zip
  cd /tmp && unzip -q awscliv2.zip && ./aws/install
fi

# --- Read secrets from SSM ---
echo "Reading secrets from SSM Parameter Store..."

ANTHROPIC_KEY=$(aws ssm get-parameter --name "/${STACK_NAME}/anthropic-api-key" --with-decryption --region "$REGION" --query 'Parameter.Value' --output text)
EXT_TOKEN=$(aws ssm get-parameter --name "/${STACK_NAME}/extension-token" --with-decryption --region "$REGION" --query 'Parameter.Value' --output text)
GW_TOKEN=$(aws ssm get-parameter --name "/${STACK_NAME}/gateway-token" --with-decryption --region "$REGION" --query 'Parameter.Value' --output text)
DOMAIN=$(aws ssm get-parameter --name "/${STACK_NAME}/domain" --region "$REGION" --query 'Parameter.Value' --output text)

echo "Domain: $DOMAIN"

# --- Clone and setup ---
cd /home/ubuntu
sudo -u ubuntu git clone https://github.com/YOUR_USERNAME/openclaw-extension.git || {
  cd openclaw-extension && sudo -u ubuntu git pull
}

# Plugin
cd /home/ubuntu/openclaw-extension/openclaw-plugin
sudo -u ubuntu npm install --production

# Create .env from SSM values
cat > /home/ubuntu/openclaw-extension/openclaw-plugin/.env << ENVFILE
GATEWAY_URL=http://127.0.0.1:18789
GATEWAY_TOKEN=${GW_TOKEN}
EXTENSION_TOKENS=${EXT_TOKEN}
PLUGIN_PORT=18790
ENVFILE
chown ubuntu:ubuntu /home/ubuntu/openclaw-extension/openclaw-plugin/.env

# --- Install OpenClaw ---
sudo -u ubuntu bash -c 'curl -fsSL https://get.openclaw.ai | bash' || echo "OpenClaw manual setup needed"

# Configure OpenClaw with Anthropic key
mkdir -p /home/ubuntu/.openclaw
cat > /home/ubuntu/.openclaw/openclaw.json << OCCONFIG
{
  "auth": {
    "profiles": {
      "anthropic:default": {
        "provider": "anthropic",
        "mode": "token",
        "token": "${ANTHROPIC_KEY}"
      }
    }
  },
  "gateway": {
    "port": 18789,
    "mode": "local",
    "bind": "loopback",
    "auth": {
      "mode": "token",
      "token": "${GW_TOKEN}"
    }
  },
  "agents": {
    "defaults": {
      "model": {
        "primary": "anthropic/claude-sonnet-4-6"
      }
    }
  }
}
OCCONFIG
chown -R ubuntu:ubuntu /home/ubuntu/.openclaw

# --- Nginx config ---
cat > /etc/nginx/sites-available/openclaw-extension << NGINXCONF
server {
    listen 80;
    server_name ${DOMAIN};

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

# --- Start services with PM2 ---
cd /home/ubuntu/openclaw-extension/openclaw-plugin
sudo -u ubuntu pm2 start "npx tsx src/index.ts" \
  --name openclaw-plugin \
  --cwd /home/ubuntu/openclaw-extension/openclaw-plugin

# Start OpenClaw
sudo -u ubuntu pm2 start "openclaw start" --name openclaw-agent || echo "OpenClaw start deferred"

sudo -u ubuntu pm2 save
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu | tail -1 | bash || true

# --- SSL (will fail if DNS not pointed yet — that's OK) ---
certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --email admin@"$DOMAIN" 2>/dev/null || {
  echo "SSL setup deferred — point DNS to this server first, then run:"
  echo "  sudo certbot --nginx -d $DOMAIN"
}

echo ""
echo "===== Bootstrap Complete ====="
echo "Plugin:  http://$DOMAIN/"
echo "WebSocket: ws://$DOMAIN/ws/extension"
echo "Logs: sudo -u ubuntu pm2 logs"
USERDATA

# --- Step 7: Launch EC2 instance ---
echo "[7/9] Launching EC2 instance..."

INSTANCE_ID=$(aws ec2 run-instances \
  --image-id "$AMI_ID" \
  --instance-type "$INSTANCE_TYPE" \
  --key-name "$KEY_NAME" \
  --security-group-ids "$SG_ID" \
  --iam-instance-profile Name="$INSTANCE_PROFILE_NAME" \
  --user-data file:///tmp/userdata.sh \
  --block-device-mappings '[{"DeviceName":"/dev/sda1","Ebs":{"VolumeSize":30,"VolumeType":"gp3"}}]' \
  --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=${STACK_NAME}}]" \
  --region "$REGION" \
  --query 'Instances[0].InstanceId' \
  --output text)

echo "  Instance ID: $INSTANCE_ID"

# --- Step 8: Allocate and associate Elastic IP ---
echo "[8/9] Allocating Elastic IP..."

ALLOC_ID=$(aws ec2 allocate-address --domain vpc --region "$REGION" --query 'AllocationId' --output text)
echo "  Waiting for instance to be running..."
aws ec2 wait instance-running --instance-ids "$INSTANCE_ID" --region "$REGION"

ELASTIC_IP=$(aws ec2 associate-address \
  --instance-id "$INSTANCE_ID" \
  --allocation-id "$ALLOC_ID" \
  --region "$REGION" \
  --query 'AssociationId' --output text)

PUBLIC_IP=$(aws ec2 describe-addresses --allocation-ids "$ALLOC_ID" --region "$REGION" --query 'Addresses[0].PublicIp' --output text)

echo "  Elastic IP: $PUBLIC_IP"

# --- Step 9: Output summary ---
echo ""
echo "[9/9] Saving deployment info..."

cat > deploy-info.json << INFO
{
  "instanceId": "$INSTANCE_ID",
  "publicIp": "$PUBLIC_IP",
  "allocationId": "$ALLOC_ID",
  "securityGroupId": "$SG_ID",
  "region": "$REGION",
  "domain": "$DOMAIN",
  "extensionToken": "$EXTENSION_TOKEN",
  "keyPair": "${KEY_NAME}.pem",
  "ssmParameters": {
    "anthropicKey": "/${STACK_NAME}/anthropic-api-key",
    "extensionToken": "/${STACK_NAME}/extension-token",
    "gatewayToken": "/${STACK_NAME}/gateway-token",
    "domain": "/${STACK_NAME}/domain"
  }
}
INFO

echo ""
echo "=========================================="
echo "  DEPLOYMENT COMPLETE"
echo "=========================================="
echo ""
echo "  EC2 Instance: $INSTANCE_ID"
echo "  Public IP:    $PUBLIC_IP"
echo "  Domain:       $DOMAIN"
echo ""
echo "  NEXT STEPS:"
echo ""
echo "  1. Point DNS:"
echo "     $DOMAIN → $PUBLIC_IP (A record)"
echo ""
echo "  2. Wait ~3 minutes for EC2 bootstrap to finish"
echo "     Monitor: ssh -i ${KEY_NAME}.pem ubuntu@$PUBLIC_IP 'tail -f /var/log/openclaw-setup.log'"
echo ""
echo "  3. After DNS propagates, SSH in and run SSL:"
echo "     ssh -i ${KEY_NAME}.pem ubuntu@$PUBLIC_IP 'sudo certbot --nginx -d $DOMAIN'"
echo ""
echo "  4. Update browser extension:"
echo "     URL: https://$DOMAIN"
echo "     Key: $EXTENSION_TOKEN"
echo ""
echo "  Saved to: deploy-info.json"
echo "=========================================="

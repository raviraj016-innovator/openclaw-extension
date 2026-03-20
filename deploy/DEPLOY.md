# Deploying OpenClaw Extension to AWS

## One-Command Deploy

```bash
export DOMAIN=context.yourdomain.com
export ANTHROPIC_API_KEY=sk-ant-...
export EXTENSION_TOKEN=$(openssl rand -hex 24)

bash deploy/aws-create-infra.sh
```

This creates everything: EC2, security group, Elastic IP, IAM role, SSM secrets, Nginx, PM2, OpenClaw, SSL.

## What Gets Created

| Resource | Purpose | Cost |
|----------|---------|------|
| EC2 t3.medium | Plugin + OpenClaw server | ~$30/mo |
| EBS 30GB gp3 | OS + SQLite database | ~$2.40/mo |
| Elastic IP | Static IP for DNS | Free |
| Security Group | Ports 22/80/443 | Free |
| IAM Role | EC2 reads SSM secrets | Free |
| SSM Parameters (4) | Secrets storage | Free |
| **Total** | | **~$37/mo** |

## Secrets Management (SSM)

All secrets stored in AWS SSM Parameter Store — never in code or on disk:

```
/openclaw-extension/anthropic-api-key   (SecureString)
/openclaw-extension/extension-token     (SecureString)
/openclaw-extension/gateway-token       (SecureString)
/openclaw-extension/domain              (String)
```

EC2 reads them at boot via IAM role. No SSH needed to configure secrets.

## After Deploy

### 1. Point DNS
```
context.yourdomain.com → <Elastic IP from output>
```

### 2. Wait for bootstrap (~3 min)
```bash
ssh -i openclaw-extension-key.pem ubuntu@<IP> 'tail -f /var/log/openclaw-setup.log'
```

### 3. Enable SSL (after DNS propagates)
```bash
ssh -i openclaw-extension-key.pem ubuntu@<IP> 'sudo certbot --nginx -d context.yourdomain.com'
```

### 4. Connect extension
- URL: `https://context.yourdomain.com`
- Key: The EXTENSION_TOKEN from the deploy output

## Management

```bash
# View logs
ssh -i openclaw-extension-key.pem ubuntu@<IP> 'pm2 logs'

# Restart services
ssh -i openclaw-extension-key.pem ubuntu@<IP> 'pm2 restart all'

# Rotate tokens
bash deploy/aws-rotate-tokens.sh

# Check DB
ssh -i openclaw-extension-key.pem ubuntu@<IP> 'sqlite3 ~/.openclaw-extension/context.db "SELECT COUNT(*) FROM page_visits;"'

# Update code
ssh -i openclaw-extension-key.pem ubuntu@<IP> 'cd ~/openclaw-extension && git pull && cd openclaw-plugin && npm install && pm2 restart openclaw-plugin'

# Destroy everything
bash deploy/aws-destroy-infra.sh
```

## Scripts

| Script | What it does |
|--------|-------------|
| `aws-create-infra.sh` | Creates ALL AWS resources from scratch |
| `aws-destroy-infra.sh` | Tears down everything cleanly |
| `aws-rotate-tokens.sh` | Rotates extension + gateway tokens via SSM |
| `setup-ec2.sh` | Manual EC2 setup (if not using user-data) |
| `start-services.sh` | Start PM2 services manually |
| `setup-ssl.sh` | Setup Nginx + Let's Encrypt manually |
| `nginx.conf` | Nginx config template |

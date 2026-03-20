#!/bin/bash
cd /home/ubuntu/.openclaw
python3 -c "
import json
with open('openclaw.json') as f:
    c = json.load(f)
c.setdefault('gateway', {}).setdefault('controlUi', {})['allowedOrigins'] = [
    'http://localhost:18789',
    'http://127.0.0.1:18789',
    'http://184.72.237.118:18789',
    'https://claw.raviraj.lol',
    'https://gw.raviraj.lol'
]
with open('openclaw.json', 'w') as f:
    json.dump(c, f, indent=2)
print('Origins updated')
"
chown ubuntu:ubuntu openclaw.json
sudo -u ubuntu pm2 restart openclaw-agent

cat > /etc/nginx/sites-available/openclaw-gateway << 'NGEOF'
server {
    listen 80;
    server_name gw.raviraj.lol;

    location / {
        proxy_pass http://127.0.0.1:18789;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
}
NGEOF

ln -sf /etc/nginx/sites-available/openclaw-gateway /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
certbot --nginx -d gw.raviraj.lol --non-interactive --agree-tos --email admin@raviraj.lol
echo "DONE: https://gw.raviraj.lol/"

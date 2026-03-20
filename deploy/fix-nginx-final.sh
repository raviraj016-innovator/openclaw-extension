#!/bin/bash
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

    location ~ ^/openclaw(?:/(.*))?$ {
        proxy_pass http://127.0.0.1:18789/$1$is_args$args;
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

    location / {
        proxy_pass http://127.0.0.1:18790;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
NGEOF
nginx -t && systemctl reload nginx
certbot --nginx -d claw.raviraj.lol --non-interactive --agree-tos --email admin@claw.raviraj.lol 2>/dev/null || echo "SSL already done"
echo "DONE"

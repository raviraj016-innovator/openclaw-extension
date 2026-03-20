#!/bin/bash
# =============================================================================
# Setup Nginx + Let's Encrypt SSL
# Usage: bash setup-ssl.sh your-domain.com
# =============================================================================

set -euo pipefail

DOMAIN=${1:?"Usage: bash setup-ssl.sh YOUR_DOMAIN"}

echo "Setting up Nginx + SSL for $DOMAIN..."

# Install nginx config
sudo cp /home/ubuntu/openclaw-extension/deploy/nginx.conf /etc/nginx/sites-available/openclaw-extension
sudo sed -i "s/YOUR_DOMAIN/$DOMAIN/g" /etc/nginx/sites-available/openclaw-extension

# Enable the site
sudo ln -sf /etc/nginx/sites-available/openclaw-extension /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test nginx config
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx

# Get SSL cert
echo "Requesting SSL certificate..."
sudo certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --email admin@"$DOMAIN" || {
  echo ""
  echo "Certbot failed. You may need to:"
  echo "  1. Point your DNS A record to this server's IP"
  echo "  2. Wait for DNS propagation"
  echo "  3. Run: sudo certbot --nginx -d $DOMAIN"
}

echo ""
echo "===== SSL Setup Complete ====="
echo ""
echo "Your plugin is now available at:"
echo "  Dashboard:  https://$DOMAIN/"
echo "  WebSocket:  wss://$DOMAIN/ws/extension"
echo "  Context API: https://$DOMAIN/context/summary"
echo ""
echo "Update the extension to connect to: https://$DOMAIN"
echo "  URL: https://$DOMAIN"
echo "  Key: (your EXTENSION_TOKENS value)"
echo ""

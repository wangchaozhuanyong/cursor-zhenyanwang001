#!/usr/bin/env bash
set -euo pipefail

sudo cp /tmp/damatong.prod.conf /etc/nginx/sites-available/damatong.prod.conf
sudo ln -sf /etc/nginx/sites-available/damatong.prod.conf /etc/nginx/sites-enabled/damatong.prod.conf

ENV_FILE=/var/www/click-send-shop/server/.env
NEW_CORS='CORS_ORIGINS=https://damatong.net,https://www.damatong.net,https://console.damatong.net'
if grep -q '^CORS_ORIGINS=' "$ENV_FILE"; then
  sed -i "s|^CORS_ORIGINS=.*|${NEW_CORS}|" "$ENV_FILE"
else
  echo "$NEW_CORS" >> "$ENV_FILE"
fi
grep '^CORS_ORIGINS=' "$ENV_FILE"

sudo nginx -t
sudo systemctl reload nginx
pm2 restart gc-api --update-env
echo DEPLOY_OK

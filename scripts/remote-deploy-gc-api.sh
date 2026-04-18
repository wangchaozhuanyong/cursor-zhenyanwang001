#!/usr/bin/env bash
# One-shot deploy for gc-api (run via: ssh ... "bash -s" < this file)
set -euo pipefail

ROOT="/www/wwwroot/cursor-zhenyanwang001"
SERVER="${ROOT}/server"

echo "==> Fix ownership (ubuntu can write)"
sudo chown -R ubuntu:ubuntu "$ROOT"

echo "==> Write server/.env"
cat > "${SERVER}/.env" << 'EOF'
PORT=3001
DB_HOST=127.0.0.1
DB_USER=click_user
DB_PASSWORD=REPLACE_ME
DB_NAME=click_send_shop
JWT_SECRET=REPLACE_WITH_LONG_RANDOM
EOF
chmod 600 "${SERVER}/.env" || true

cd "$SERVER"

echo "==> Node / npm / pm2 versions"
command -v node && node -v
command -v npm && npm -v
command -v pm2 && pm2 -v

echo "==> npm install"
npm install

echo "==> db:init (ignore errors if already initialized)"
npm run db:init || true

echo "==> migrate"
npm run migrate || true

echo "==> pm2 (restart gc-api)"
pm2 delete gc-api 2>/dev/null || true
pm2 start src/index.js --name gc-api
pm2 save 2>/dev/null || true

sleep 2
echo ""
echo "==> pm2 list"
pm2 list

echo ""
echo "==> pm2 logs gc-api (last 50 lines, no stream)"
pm2 logs gc-api --lines 50 --nostream || true

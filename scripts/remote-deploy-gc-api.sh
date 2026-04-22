#!/usr/bin/env bash
# One-shot deploy for gc-api (run via: ssh ... "bash -s" < this file)
# 统一通过 ecosystem.config.cjs 启动 gc-api，部署完成后强制运行 verify-pm2.sh。
set -euo pipefail

ROOT="${PROJECT_DIR:-/var/www/click-send-shop}"
SERVER="${ROOT}/server"
PM2_APP="${PM2_APP:-gc-api}"

echo "==> Fix ownership (ubuntu can write)"
sudo chown -R ubuntu:ubuntu "$ROOT"

echo "==> Write server/.env (仅当不存在时；已存在则不覆盖)"
if [[ ! -f "${SERVER}/.env" ]]; then
  cat > "${SERVER}/.env" << 'EOF'
PORT=3001
DB_HOST=127.0.0.1
DB_USER=click_user
DB_PASSWORD=REPLACE_ME
DB_NAME=click_send_shop
JWT_SECRET=REPLACE_WITH_LONG_RANDOM
EOF
  chmod 600 "${SERVER}/.env" || true
else
  echo "    .env 已存在，保留原文件"
fi

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

echo "==> pm2 (统一通过 ecosystem.config.cjs 启动 ${PM2_APP})"
mkdir -p "$SERVER/logs"
if pm2 describe "$PM2_APP" >/dev/null 2>&1; then
  pm2 reload "$PM2_APP" --update-env
else
  pm2 start ecosystem.config.cjs --only "$PM2_APP" --env production
fi
pm2 save 2>/dev/null || true

sleep 2
echo ""
echo "==> pm2 list"
pm2 list

echo ""
echo "==> 强制执行 deploy/verify-pm2.sh（唯一验收标准）"
PM2_APP="$PM2_APP" bash "${ROOT}/deploy/verify-pm2.sh"

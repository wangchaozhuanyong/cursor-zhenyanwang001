#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# 全项目统一进程名为 gc-api；ecosystem.config.cjs 是唯一启动入口
APP_NAME="${PM2_APP:-${APP_NAME:-gc-api}}"

echo "[deploy] repo root: ${ROOT_DIR}"
echo "[deploy] app name: ${APP_NAME}"

if ! command -v node >/dev/null 2>&1; then
  echo "[FATAL] node not found on server"
  exit 1
fi
if ! command -v npm >/dev/null 2>&1; then
  echo "[FATAL] npm not found on server"
  exit 1
fi

if ! command -v pm2 >/dev/null 2>&1; then
  echo "[deploy] pm2 not found, installing globally..."
  npm install -g pm2 >/dev/null
fi

echo "[1/5] Install backend deps (server/)..."
cd "${ROOT_DIR}/server"
if [[ ! -f ".env" ]]; then
  echo "[FATAL] missing ${ROOT_DIR}/server/.env (required for production run)"
  exit 1
fi
npm ci --omit=dev

echo "[2/5] Build frontend (click-send-shop-main/...)..."
cd "${ROOT_DIR}/click-send-shop-main/click-send-shop-main"
npm ci
npm run build

echo "[3/5] (Re)Start PM2 via ecosystem.config.cjs (only ${APP_NAME})..."
cd "${ROOT_DIR}/server"
mkdir -p "${ROOT_DIR}/server/logs"
export NODE_ENV=production

if pm2 describe "${APP_NAME}" >/dev/null 2>&1; then
  pm2 reload "${APP_NAME}" --update-env
else
  pm2 start ecosystem.config.cjs --only "${APP_NAME}" --env production
fi
pm2 save

echo "[4/5] Sleep 3s for warmup..."
sleep 3

echo "[5/5] 强制执行 deploy/verify-pm2.sh（唯一验收标准）"
PM2_APP="${APP_NAME}" bash "${ROOT_DIR}/deploy/verify-pm2.sh"

echo "[deploy] Done."

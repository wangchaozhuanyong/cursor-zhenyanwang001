#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

APP_NAME="${APP_NAME:-click-send-shop-api}"

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

echo "[1/4] Install backend deps (server/)..."
cd "${ROOT_DIR}/server"
if [[ ! -f ".env" ]]; then
  echo "[FATAL] missing ${ROOT_DIR}/server/.env (required for production run)"
  exit 1
fi
npm ci --omit=dev

echo "[2/4] Build frontend (click-send-shop-main/...)..."
cd "${ROOT_DIR}/click-send-shop-main/click-send-shop-main"
npm ci
npm run build

echo "[3/4] Restart PM2..."
cd "${ROOT_DIR}/server"
export NODE_ENV=production

if pm2 describe "${APP_NAME}" >/dev/null 2>&1; then
  pm2 restart "${APP_NAME}" --update-env
else
  pm2 start "src/index.js" --name "${APP_NAME}" --time --cwd "$(pwd)"
fi
pm2 save

echo "[4/4] Done."

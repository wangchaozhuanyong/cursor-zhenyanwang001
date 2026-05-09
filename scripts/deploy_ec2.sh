#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# 全项目统一进程名为 gc-api；ecosystem.config.cjs 是唯一启动入口
APP_NAME="${PM2_APP:-${APP_NAME:-gc-api}}"

echo "[deploy] repo root: ${ROOT_DIR}"
echo "[deploy] app name: ${APP_NAME}"

if [[ "${LEGACY_DEPLOY_EC2:-0}" != "1" && -f "${ROOT_DIR}/deploy/ci-deploy.sh" ]]; then
  echo "[deploy] Delegating to deploy/ci-deploy.sh (standard deploy chain with migrations and verification)."
  PROJECT_DIR="${ROOT_DIR}" PM2_APP="${APP_NAME}" AUTO_ROLLBACK="${AUTO_ROLLBACK:-1}" \
    bash "${ROOT_DIR}/deploy/ci-deploy.sh"
  exit $?
fi

echo "[deploy] LEGACY_DEPLOY_EC2=1 enabled; running legacy upload deploy path."

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
if [[ -d "/tmp/click-send-shop.assets.bak" ]]; then
  echo "[2/5] Preserve previous hashed assets for active clients..."
  mkdir -p "${ROOT_DIR}/click-send-shop-main/click-send-shop-main/dist/assets"
  cp -an /tmp/click-send-shop.assets.bak/. "${ROOT_DIR}/click-send-shop-main/click-send-shop-main/dist/assets/" 2>/dev/null || true
  rm -rf /tmp/click-send-shop.assets.bak
fi
echo "[2/5] Verify frontend dist asset references..."
node "${ROOT_DIR}/scripts/verify_frontend_dist_assets.js" "${ROOT_DIR}/click-send-shop-main/click-send-shop-main/dist"

echo "[3/5] (Re)Start PM2 via ecosystem.config.cjs (only ${APP_NAME})..."
cd "${ROOT_DIR}/server"
mkdir -p "${ROOT_DIR}/server/logs"
export NODE_ENV=production

if pm2 describe "${APP_NAME}" >/dev/null 2>&1; then
  if ! pm2 reload "${APP_NAME}" --update-env; then
    echo "[deploy] pm2 reload failed (stale entry?); deleting and starting ${APP_NAME} fresh"
    pm2 delete "${APP_NAME}" 2>/dev/null || true
    pm2 start ecosystem.config.cjs --only "${APP_NAME}" --env production
  fi
else
  pm2 start ecosystem.config.cjs --only "${APP_NAME}" --env production
fi
sleep 2
PM2_POST_STATUS=""
if command -v node >/dev/null 2>&1; then
  PM2_POST_STATUS=$(pm2 jlist 2>/dev/null | node -e "
    let d=''; process.stdin.on('data',c=>d+=c).on('end',()=>{
      try{
        const arr=JSON.parse(d||'[]');
        const a=arr.find(x=>x&&x.name===process.argv[1]);
        if(a&&a.pm2_env&&a.pm2_env.status) process.stdout.write(a.pm2_env.status);
      }catch(e){}
    });" "${APP_NAME}" 2>/dev/null || true)
fi
if [[ "${PM2_POST_STATUS}" != "online" ]]; then
  echo "[deploy] ${APP_NAME} status='${PM2_POST_STATUS}' (expected online); forcing delete + start"
  pm2 delete "${APP_NAME}" 2>/dev/null || true
  pm2 start ecosystem.config.cjs --only "${APP_NAME}" --env production
fi
pm2 save

echo "[4/5] Sleep 3s for warmup..."
sleep 3

echo "[5/5] 强制执行 deploy/verify-pm2.sh（唯一验收标准）"
perl -pi -e 's/\r$//' "${ROOT_DIR}/deploy/verify-pm2.sh" 2>/dev/null || true
PM2_APP="${APP_NAME}" bash "${ROOT_DIR}/deploy/verify-pm2.sh"

echo "[deploy] Done."

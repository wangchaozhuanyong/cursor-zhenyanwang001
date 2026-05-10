#!/usr/bin/env bash
#
# 标准 Linux 生产部署（不依赖宝塔面板）
# 顺序：拉代码 → 后端依赖 + 迁移 → 前端构建 → PM2(ecosystem) → 健康检查 → verify-pm2.sh
# 完整版（含同步 public-frontend、系统 Nginx）：bash deploy.sh
#
# 环境变量：
#   PROJECT_DIR     默认 /var/www/click-send-shop（标准目录，与宝塔 /www/wwwroot 无关）
#   FRONTEND_SUB, HEALTH_PORT, HEALTH_PATH, PM2_APP
#   PUBLIC_FRONTEND 默认 $PROJECT_DIR/public-frontend（若 Nginx 直读静态目录，会同步 dist）
#   VITE_API_BASE_URL  默认 /api（同源部署）；API 分域时请设为完整前缀，如 https://api.xxx.com
#   SKIP_GIT=1        跳过 git pull（适用于 rsync 同步、无 .git 的发布目录；须自行保证代码最新）
#   GIT_BRANCH        默认 main（git fetch / reset 的目标分支）
#   FRONTEND_BUILD_HEAP_MB  vite build 时 Node V8 堆上限（MB），默认 3072；小内存机若仍 OOM 可试 4096 或给机器加 swap
#
set -euo pipefail

echo "🚀 开始部署..."

PROJECT_DIR="${PROJECT_DIR:-/var/www/click-send-shop}"
export PROJECT_DIR
FRONTEND_SUB="${FRONTEND_SUB:-click-send-shop-main/click-send-shop-main}"
export FRONTEND_SUB
FRONTEND_DIR="$PROJECT_DIR/$FRONTEND_SUB"
BACKEND_DIR="$PROJECT_DIR/server"
LOG_FILE="${LOG_FILE:-$PROJECT_DIR/deploy.log}"
HEALTH_PORT="${HEALTH_PORT:-3001}"
HEALTH_PATH="${HEALTH_PATH:-/api/health/live}"
PUBLIC_FRONTEND="${PUBLIC_FRONTEND:-$PROJECT_DIR/public-frontend}"
# 前端构建：同源部署必须指向 /api，否则易出现「页面能开、接口全 404 / 跨域」
export VITE_API_BASE_URL="${VITE_API_BASE_URL:-/api}"
export SKIP_GIT="${SKIP_GIT:-0}"
GIT_BRANCH="${GIT_BRANCH:-main}"

npm_install_here() {
  if [[ -f package-lock.json ]]; then
    npm ci
  else
    npm install
  fi
}

cd "$PROJECT_DIR" || exit 1

echo "📅 部署时间: $(date)" | tee -a "$LOG_FILE"

echo "🔎 部署前自检（preflight）..." | tee -a "$LOG_FILE"
bash "$PROJECT_DIR/deploy/preflight.sh" | tee -a "$LOG_FILE"

LOCAL_COMMIT=""
if [[ "${SKIP_GIT:-0}" != "1" ]]; then
  echo "📦 拉取最新代码（分支 $GIT_BRANCH）..." | tee -a "$LOG_FILE"
  # 服务器上常改 server/ecosystem.config.cjs（端口/实例数）；reset --hard 会抹掉，先 stash 再恢复
  STASH_ECOSYSTEM=0
  if [[ -f "$BACKEND_DIR/ecosystem.config.cjs" ]] \
    && ! git -C "$PROJECT_DIR" diff --quiet "server/ecosystem.config.cjs" 2>/dev/null; then
    echo "📎 暂存本地改动的 server/ecosystem.config.cjs（避免被 reset 覆盖）..." | tee -a "$LOG_FILE"
    if git -C "$PROJECT_DIR" stash push -m "deploy-ecosystem-$(date +%s)" -- "server/ecosystem.config.cjs"; then
      STASH_ECOSYSTEM=1
    fi
  fi
  git -C "$PROJECT_DIR" fetch origin "$GIT_BRANCH"
  git -C "$PROJECT_DIR" reset --hard "origin/$GIT_BRANCH"
  if [[ "$STASH_ECOSYSTEM" == "1" ]]; then
    echo "📎 恢复 server/ecosystem.config.cjs..." | tee -a "$LOG_FILE"
    if ! git -C "$PROJECT_DIR" stash pop; then
      echo "❌ stash pop 冲突：请手工处理 server/ecosystem.config.cjs 后重试部署" | tee -a "$LOG_FILE"
      exit 1
    fi
  fi

  LOCAL_COMMIT=$(git -C "$PROJECT_DIR" rev-parse --short HEAD)
  REMOTE_COMMIT=$(git -C "$PROJECT_DIR" rev-parse --short "origin/$GIT_BRANCH")

  echo "🔖 本地版本: $LOCAL_COMMIT" | tee -a "$LOG_FILE"
  echo "🌐 远程版本: $REMOTE_COMMIT" | tee -a "$LOG_FILE"

  if [[ "$LOCAL_COMMIT" != "$REMOTE_COMMIT" ]]; then
    echo "❌ HEAD 与 origin/$GIT_BRANCH 短哈希不一致（请检查 git 与远端分支）" | tee -a "$LOG_FILE"
    exit 1
  fi
else
  echo "⏭ SKIP_GIT=1，跳过 git fetch/reset（请确认已通过 rsync/手工同步到最新代码）" | tee -a "$LOG_FILE"
  LOCAL_COMMIT=$(git -C "$PROJECT_DIR" rev-parse --short HEAD 2>/dev/null || echo "unknown")
  echo "🔖 当前目录版本: $LOCAL_COMMIT" | tee -a "$LOG_FILE"
fi

if [[ -f "$PROJECT_DIR/package.json" ]]; then
  echo "📦 安装仓库根目录依赖（可选）..." | tee -a "$LOG_FILE"
  npm_install_here
fi

echo "📦 安装后端依赖..." | tee -a "$LOG_FILE"
cd "$BACKEND_DIR" || exit 1
npm_install_here

echo "🧪 部署前数据库连通检查..." | tee -a "$LOG_FILE"
if [[ ! -f "$BACKEND_DIR/.env" ]]; then
  echo "❌ 缺少后端 .env：$BACKEND_DIR/.env" | tee -a "$LOG_FILE"
  exit 1
fi
DB_USER_VAL="$(grep -E '^DB_USER=' "$BACKEND_DIR/.env" | cut -d= -f2- || true)"
if [[ -z "$DB_USER_VAL" ]]; then
  echo "❌ .env 缺少 DB_USER，阻断发布" | tee -a "$LOG_FILE"
  exit 1
fi
if [[ "$DB_USER_VAL" == "root" ]]; then
  echo "❌ 检测到 DB_USER=root，生产环境禁止使用 root，阻断发布" | tee -a "$LOG_FILE"
  exit 1
fi
if ! node -e "require('dotenv').config({path:'$BACKEND_DIR/.env'});const mysql=require('mysql2/promise');(async()=>{const c=await mysql.createConnection({host:process.env.DB_HOST,port:Number(process.env.DB_PORT||3306),user:process.env.DB_USER,password:process.env.DB_PASSWORD||'',database:process.env.DB_NAME});await c.query('SELECT 1');await c.end();})().catch(e=>{console.error(e.message);process.exit(1);});"; then
  echo "❌ 数据库连接检查失败，阻断发布" | tee -a "$LOG_FILE"
  exit 1
fi
echo "✅ 数据库连接检查通过" | tee -a "$LOG_FILE"

if [[ "${SKIP_MIGRATE:-0}" == "1" ]]; then
  echo "⏭  SKIP_MIGRATE=1，跳过数据库迁移（不改 schema）" | tee -a "$LOG_FILE"
else
  echo "🗄 执行数据库迁移..." | tee -a "$LOG_FILE"
  npm run migrate
fi

echo "🎨 构建前端..." | tee -a "$LOG_FILE"
if [[ ! -d "$FRONTEND_DIR" ]]; then
  echo "❌ 找不到前端目录: $FRONTEND_DIR" | tee -a "$LOG_FILE"
  exit 1
fi

ASSET_BACKUP=""
if [[ -d "$FRONTEND_DIR/dist/assets" ]]; then
  ASSET_BACKUP="$(mktemp -d)"
  cp -a "$FRONTEND_DIR/dist/assets/." "$ASSET_BACKUP/" 2>/dev/null || true
fi

cd "$FRONTEND_DIR" || exit 1
npm_install_here
echo "🎨 VITE_API_BASE_URL=$VITE_API_BASE_URL（若 API 不在同域 /api，请导出正确地址后重跑）" | tee -a "$LOG_FILE"
_fe_heap="${FRONTEND_BUILD_HEAP_MB:-3072}"
echo "ℹ️  vite build：heap 上限 ${_fe_heap}MB（FRONTEND_BUILD_HEAP_MB）；直接 node 调 vite，避免 npm 子进程未继承 NODE_OPTIONS 仍 ~512MB OOM" | tee -a "$LOG_FILE"
(
  export NODE_OPTIONS="${NODE_OPTIONS:+$NODE_OPTIONS }--max-old-space-size=${_fe_heap}"
  node ./node_modules/vite/bin/vite.js build
)

if [[ -n "$ASSET_BACKUP" && -d "$ASSET_BACKUP" ]]; then
  echo "🧩 保留上一版 hashed assets，避免已打开页面刷新/懒加载时 chunk 404" | tee -a "$LOG_FILE"
  mkdir -p "$FRONTEND_DIR/dist/assets"
  cp -an "$ASSET_BACKUP/." "$FRONTEND_DIR/dist/assets/" 2>/dev/null || true
  rm -rf "$ASSET_BACKUP"
fi

echo "🔎 校验前端 dist 资源引用一致性..." | tee -a "$LOG_FILE"
node "$PROJECT_DIR/scripts/verify_frontend_dist_assets.js" "$FRONTEND_DIR/dist" | tee -a "$LOG_FILE"

echo "📤 同步 dist → $PUBLIC_FRONTEND（保持 Node dist 与 Nginx 静态目录一致）" | tee -a "$LOG_FILE"
mkdir -p "$PUBLIC_FRONTEND"
if command -v rsync >/dev/null 2>&1; then
  rsync -a --delete "$FRONTEND_DIR/dist/" "$PUBLIC_FRONTEND/"
else
  rm -rf "${PUBLIC_FRONTEND:?}/"*
  cp -a "$FRONTEND_DIR/dist/." "$PUBLIC_FRONTEND/"
fi
node "$PROJECT_DIR/scripts/verify_frontend_dist_assets.js" "$PUBLIC_FRONTEND" | tee -a "$LOG_FILE"

PM2_APP="${PM2_APP:-gc-api}"

echo "🔄 (Re)启动服务（ecosystem.config.cjs / ${PM2_APP}）..." | tee -a "$LOG_FILE"
cd "$BACKEND_DIR" || exit 1
mkdir -p "$BACKEND_DIR/logs"
if pm2 describe "$PM2_APP" >/dev/null 2>&1; then
  pm2 reload "$PM2_APP" --update-env
else
  pm2 start ecosystem.config.cjs --only "$PM2_APP" --env production
  pm2 restart "$PM2_APP" --update-env
fi
pm2 save 2>/dev/null || true

echo "🧪 健康检查 (${HEALTH_PATH})..." | tee -a "$LOG_FILE"
STATUS="000"
for i in 1 2 3 4 5; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:${HEALTH_PORT}${HEALTH_PATH}" || echo "000")

  if [[ "$STATUS" == "200" ]]; then
    echo "✅ 健康检查通过" | tee -a "$LOG_FILE"
    break
  else
    echo "⏳ 第 $i 次检测失败，HTTP=$STATUS" | tee -a "$LOG_FILE"
    sleep 2
  fi
done

if [[ "$STATUS" != "200" ]]; then
  echo "❌ 健康检查失败，HTTP=$STATUS" | tee -a "$LOG_FILE"
  exit 1
fi

echo "🔎 强制执行 deploy/verify-pm2.sh..." | tee -a "$LOG_FILE"
PM2_APP="$PM2_APP" HEALTH_PORT="$HEALTH_PORT" HEALTH_PATH="$HEALTH_PATH" \
  bash "$PROJECT_DIR/deploy/verify-pm2.sh" | tee -a "$LOG_FILE"

echo "🎉 部署成功，版本: $LOCAL_COMMIT" | tee -a "$LOG_FILE"

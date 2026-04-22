#!/usr/bin/env bash
#
# 标准 Linux 生产部署（不依赖宝塔面板）
# 顺序：拉代码 → 后端依赖 + 迁移 → 前端构建 → PM2(ecosystem) → 健康检查 → verify-pm2.sh
# 完整版（含同步 public-frontend、系统 Nginx）：bash deploy.sh
#
# 环境变量：
#   PROJECT_DIR     默认 /var/www/click-send-shop（标准目录，与宝塔 /www/wwwroot 无关）
#   FRONTEND_SUB, HEALTH_PORT, HEALTH_PATH, PM2_APP
#
set -euo pipefail

echo "🚀 开始部署..."

PROJECT_DIR="${PROJECT_DIR:-/var/www/click-send-shop}"
FRONTEND_SUB="${FRONTEND_SUB:-click-send-shop-main/click-send-shop-main}"
FRONTEND_DIR="$PROJECT_DIR/$FRONTEND_SUB"
BACKEND_DIR="$PROJECT_DIR/server"
LOG_FILE="${LOG_FILE:-$PROJECT_DIR/deploy.log}"
HEALTH_PORT="${HEALTH_PORT:-3001}"
HEALTH_PATH="${HEALTH_PATH:-/api/health/live}"

cd "$PROJECT_DIR" || exit 1

echo "📅 部署时间: $(date)" | tee -a "$LOG_FILE"

echo "📦 拉取最新代码..." | tee -a "$LOG_FILE"
git fetch origin main
git reset --hard origin/main

LOCAL_COMMIT=$(git rev-parse --short HEAD)
REMOTE_COMMIT=$(git rev-parse --short origin/main)

echo "🔖 本地版本: $LOCAL_COMMIT" | tee -a "$LOG_FILE"
echo "🌐 远程版本: $REMOTE_COMMIT" | tee -a "$LOG_FILE"

if [[ "$LOCAL_COMMIT" != "$REMOTE_COMMIT" ]]; then
  echo "❌ HEAD 与 origin/main 短哈希不一致（请检查 git 状态与 main 是否存在）" | tee -a "$LOG_FILE"
  exit 1
fi

if [[ -f "$PROJECT_DIR/package.json" ]]; then
  echo "📦 安装仓库根目录依赖（可选）..." | tee -a "$LOG_FILE"
  npm install
fi

echo "📦 安装后端依赖..." | tee -a "$LOG_FILE"
cd "$BACKEND_DIR" || exit 1
npm install

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

cd "$FRONTEND_DIR" || exit 1
npm install
npm run build

PM2_APP="${PM2_APP:-gc-api}"

echo "🔄 (Re)启动服务（ecosystem.config.cjs / ${PM2_APP}）..." | tee -a "$LOG_FILE"
cd "$BACKEND_DIR" || exit 1
mkdir -p "$BACKEND_DIR/logs"
if pm2 describe "$PM2_APP" >/dev/null 2>&1; then
  pm2 reload "$PM2_APP" --update-env
else
  pm2 start ecosystem.config.cjs --only "$PM2_APP" --env production
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

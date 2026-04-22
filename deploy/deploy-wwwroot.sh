#!/usr/bin/env bash
#
# 在 EC2 上于项目目录执行，例如：
#   bash deploy/deploy-wwwroot.sh
#
# 可选环境变量：
#   PROJECT_DIR        默认 /var/www/click-send-shop
#   FRONTEND_DIR       显式指定前端目录（相对 PROJECT_DIR），否则自动探测
#   PUBLIC_FRONTEND    静态资源输出目录，默认 $PROJECT_DIR/public-frontend（与 nginx root 一致）
#   PM2_APP            pm2 进程名，默认 gc-api
#   NPM_CI=1           若存在 package-lock.json 则用 npm ci 替代 npm install（根/前端/后端）
#
set -euo pipefail

npm_install_here() {
  if [[ "${NPM_CI:-}" == "1" ]] && [[ -f package-lock.json ]]; then
    npm ci
  else
    npm install
  fi
}

echo "🚀 开始部署..."

PROJECT_DIR="${PROJECT_DIR:-/var/www/click-send-shop}"
PM2_APP="${PM2_APP:-gc-api}"
LOG_FILE="$PROJECT_DIR/deploy.log"
NGINX_SITE_SRC="$PROJECT_DIR/deploy/cursor-main-frontend.nginx.conf"
NGINX_SITE_DST="${NGINX_SITE_DST:-/etc/nginx/sites-available/cursor-main-frontend.conf}"
PUBLIC_FRONTEND="${PUBLIC_FRONTEND:-$PROJECT_DIR/public-frontend}"

cd "$PROJECT_DIR" || exit 1

echo "📅 部署时间: $(date)" | tee -a "$LOG_FILE"

echo "📥 拉取最新代码" | tee -a "$LOG_FILE"
git fetch origin main
git reset --hard origin/main

LOCAL_COMMIT=$(git rev-parse --short HEAD)
REMOTE_COMMIT=$(git rev-parse --short origin/main)

echo "🔖 本地版本: $LOCAL_COMMIT" | tee -a "$LOG_FILE"
echo "🌐 远程版本: $REMOTE_COMMIT" | tee -a "$LOG_FILE"

if [[ -f "$PROJECT_DIR/package.json" ]]; then
  echo "📦 安装仓库根目录依赖..." | tee -a "$LOG_FILE"
  npm_install_here
else
  echo "⏭ 跳过根目录 npm（无 package.json）" | tee -a "$LOG_FILE"
fi

# 解析前端目录：环境变量 > click-send-shop > 仓库默认嵌套路径
resolve_frontend_dir() {
  if [[ -n "${FRONTEND_DIR:-}" ]]; then
    if [[ -d "$PROJECT_DIR/$FRONTEND_DIR" ]]; then
      echo "$FRONTEND_DIR"
      return 0
    fi
    echo "❌ FRONTEND_DIR 已设置但目录不存在: $PROJECT_DIR/$FRONTEND_DIR" | tee -a "$LOG_FILE" >&2
    return 1
  fi
  if [[ -d "$PROJECT_DIR/click-send-shop" ]]; then
    echo "click-send-shop"
    return 0
  fi
  if [[ -d "$PROJECT_DIR/click-send-shop-main/click-send-shop-main" ]]; then
    echo "click-send-shop-main/click-send-shop-main"
    return 0
  fi
  echo ""
}

if ! FRONTEND_SUB=$(resolve_frontend_dir); then
  exit 1
fi

if [[ -n "$FRONTEND_SUB" ]]; then
  echo "🎨 构建前端 ($FRONTEND_SUB)..." | tee -a "$LOG_FILE"
  cd "$PROJECT_DIR/$FRONTEND_SUB" || exit 1
  npm_install_here
  npm run build
  cd "$PROJECT_DIR" || exit 1

  echo "📤 同步构建产物 → $PUBLIC_FRONTEND" | tee -a "$LOG_FILE"
  mkdir -p "$PUBLIC_FRONTEND"
  if command -v rsync >/dev/null 2>&1; then
    rsync -a --delete "$PROJECT_DIR/$FRONTEND_SUB/dist/" "$PUBLIC_FRONTEND/"
  else
    rm -rf "${PUBLIC_FRONTEND:?}/"*
    cp -a "$PROJECT_DIR/$FRONTEND_SUB/dist/." "$PUBLIC_FRONTEND/"
  fi
else
  echo "⏭ 跳过前端构建（未找到 click-send-shop 或 click-send-shop-main/click-send-shop-main）" | tee -a "$LOG_FILE"
fi

echo "📦 安装后端依赖..." | tee -a "$LOG_FILE"
cd "$PROJECT_DIR/server" || exit 1
npm_install_here

echo "🗄 执行数据库迁移..." | tee -a "$LOG_FILE"
npm run migrate

if [[ -f "$NGINX_SITE_SRC" ]]; then
  echo "🌐 更新 Nginx 配置..." | tee -a "$LOG_FILE"
  sudo cp "$NGINX_SITE_SRC" "$NGINX_SITE_DST"
  sudo nginx -t
  sudo systemctl reload nginx
else
  echo "⏭ 跳过 Nginx（未找到 $NGINX_SITE_SRC）" | tee -a "$LOG_FILE"
fi

echo "🔁 (Re)启动后端（统一通过 ecosystem.config.cjs / $PM2_APP）..." | tee -a "$LOG_FILE"
cd "$PROJECT_DIR/server" || exit 1
mkdir -p "$PROJECT_DIR/server/logs"
if pm2 describe "$PM2_APP" >/dev/null 2>&1; then
  pm2 reload "$PM2_APP" --update-env
else
  pm2 start ecosystem.config.cjs --only "$PM2_APP" --env production
fi
pm2 save 2>/dev/null || true

echo "🩺 健康检查..." | tee -a "$LOG_FILE"

STATUS="000"
for i in 1 2 3 4 5; do
  # 与 server 路由一致：挂载在 /api 下
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:3001/api/health/live" || echo "000")

  if [[ "$STATUS" == "200" ]]; then
    echo "✅ 健康检查通过" | tee -a "$LOG_FILE"
    break
  else
    echo "⏳ 第 $i 次检测失败 (HTTP $STATUS)..." | tee -a "$LOG_FILE"
    sleep 2
  fi
done

if [[ "$STATUS" != "200" ]]; then
  echo "❌ 健康检查失败，状态码: $STATUS" | tee -a "$LOG_FILE"
  exit 1
fi

echo "🔎 强制执行 deploy/verify-pm2.sh（唯一验收标准）..." | tee -a "$LOG_FILE"
PM2_APP="$PM2_APP" bash "$PROJECT_DIR/deploy/verify-pm2.sh" | tee -a "$LOG_FILE"

echo "🎉 部署完成！版本: $LOCAL_COMMIT" | tee -a "$LOG_FILE"

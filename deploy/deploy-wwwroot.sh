#!/usr/bin/env bash
#
# 在 EC2 上于项目目录执行，例如：
#   bash deploy/deploy-wwwroot.sh
# 或复制到 /www/wwwroot/cursor-zhenyanwang001 后：
#   bash deploy-wwwroot.sh
#
set -euo pipefail

echo "🚀 开始部署..."

PROJECT_DIR="${PROJECT_DIR:-/www/wwwroot/cursor-zhenyanwang001}"
LOG_FILE="$PROJECT_DIR/deploy.log"
NGINX_SITE_SRC="$PROJECT_DIR/deploy/cursor-main-frontend.nginx.conf"
NGINX_SITE_DST="${NGINX_SITE_DST:-/etc/nginx/sites-available/cursor-main-frontend.conf}"

cd "$PROJECT_DIR" || exit 1

echo "📅 部署时间: $(date)" | tee -a "$LOG_FILE"

echo "📦 拉取最新代码..." | tee -a "$LOG_FILE"
git fetch origin
git reset --hard origin/main

LOCAL_COMMIT=$(git rev-parse --short HEAD)
REMOTE_COMMIT=$(git rev-parse --short origin/main)

echo "🔖 本地版本: $LOCAL_COMMIT" | tee -a "$LOG_FILE"
echo "🌐 远程版本: $REMOTE_COMMIT" | tee -a "$LOG_FILE"

echo "📦 安装前端依赖..." | tee -a "$LOG_FILE"
npm install || true

echo "📦 安装后端依赖..." | tee -a "$LOG_FILE"
cd "$PROJECT_DIR/server" || exit 1
npm install

echo "🗄 执行数据库迁移..." | tee -a "$LOG_FILE"
npm run migrate

if [[ -f "$NGINX_SITE_SRC" ]]; then
  echo "🌐 同步 Nginx 站点配置..." | tee -a "$LOG_FILE"
  sudo cp "$NGINX_SITE_SRC" "$NGINX_SITE_DST"
  sudo nginx -t
  sudo systemctl reload nginx
else
  echo "⏭ 跳过 Nginx（未找到 $NGINX_SITE_SRC）" | tee -a "$LOG_FILE"
fi

echo "🔄 重启服务..." | tee -a "$LOG_FILE"
pm2 reload gc-api --update-env

echo "🧪 健康检查..." | tee -a "$LOG_FILE"

STATUS="000"
for i in 1 2 3 4 5; do
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
  echo "❌ 健康检查失败" | tee -a "$LOG_FILE"
  exit 1
fi

echo "🎉 部署成功，版本: $LOCAL_COMMIT" | tee -a "$LOG_FILE"

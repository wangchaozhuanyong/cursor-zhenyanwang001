#!/bin/bash

set -e

echo "🚀 开始部署..."

PROJECT_DIR="/www/wwwroot/cursor-zhenyanwang001"
LOG_FILE="$PROJECT_DIR/deploy.log"

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

echo "🔄 重启服务..." | tee -a "$LOG_FILE"
pm2 reload gc-api

sleep 2

echo "🧪 健康检查..." | tee -a "$LOG_FILE"

STATUS="000"

for i in 1 2 3 4 5
do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3001/api/health/live || echo "000")

  if [ "$STATUS" = "200" ]; then
    echo "✅ 健康检查通过" | tee -a "$LOG_FILE"
    break
  else
    echo "⏳ 第 $i 次检测失败..." | tee -a "$LOG_FILE"
    sleep 2
  fi
done

if [ "$STATUS" != "200" ]; then
  echo "❌ 健康检查失败" | tee -a "$LOG_FILE"
  exit 1
fi

echo "🎉 部署成功，版本: $LOCAL_COMMIT" | tee -a "$LOG_FILE"

#!/usr/bin/env bash
#
# 部署后全量验证（标准 Linux，不检查宝塔面板）
# Git / dist / PM2 / 健康 / Nginx / deploy.log
#
# 用法：bash deploy/verify-post-deploy.sh
# 环境变量：PROJECT_DIR（默认 /var/www/click-send-shop）、FRONTEND_SUB、PM2_APP、GIT_FETCH_FIRST
#
set -euo pipefail

PROJECT_DIR="${PROJECT_DIR:-/var/www/click-send-shop}"
FRONTEND_SUB="${FRONTEND_SUB:-click-send-shop-main/click-send-shop-main}"
FRONTEND_DIR="$PROJECT_DIR/$FRONTEND_SUB"
DIST_DIR="$FRONTEND_DIR/dist"

PM2_APP="${PM2_APP:-gc-api}"
HEALTH_PORT="${HEALTH_PORT:-3001}"
HEALTH_PATH="${HEALTH_PATH:-/api/health/live}"

LOG_FILE="$PROJECT_DIR/deploy.log"

echo "🔍 开始部署验证..."
echo "📅 验证时间: $(date)"

cd "$PROJECT_DIR" || exit 1

echo
echo "==== 1. Git 版本检查 ===="
if [[ "${GIT_FETCH_FIRST:-1}" != "0" ]]; then
  echo "📥 git fetch..."
  git fetch origin main 2>/dev/null || git fetch origin 2>/dev/null || true
fi

LOCAL_COMMIT=$(git rev-parse --short HEAD)
REMOTE_COMMIT=$(git rev-parse --short origin/main 2>/dev/null || true)

echo "🔖 本地版本: $LOCAL_COMMIT"
echo "🌐 远程版本: ${REMOTE_COMMIT:-<无 origin/main>}"

if [[ -n "$REMOTE_COMMIT" ]] && [[ "$LOCAL_COMMIT" != "$REMOTE_COMMIT" ]]; then
  echo "❌ 当前 HEAD 与 origin/main 不一致"
  exit 1
fi
echo "✅ Git 版本正常"

echo
echo "==== 2. 前端目录检查 ===="
echo "📁 FRONTEND_DIR=$FRONTEND_DIR"
if [[ ! -d "$FRONTEND_DIR" ]]; then
  echo "❌ 前端目录不存在"
  exit 1
fi

if [[ ! -d "$DIST_DIR" ]]; then
  echo "❌ dist 目录不存在：$DIST_DIR"
  exit 1
fi

echo "✅ 前端目录存在"
echo "📦 dist 最近文件："
ls -lah "$DIST_DIR" | head -n 10

echo
echo "==== 3. PM2 进程检查 ===="
pm2 list

if ! pm2 list --no-color 2>/dev/null | grep -q "$PM2_APP"; then
  echo "❌ 未找到 PM2 进程: $PM2_APP"
  exit 1
fi

if ! pm2 list --no-color 2>/dev/null | grep "$PM2_APP" | grep -q online; then
  echo "❌ $PM2_APP 不在 online 状态"
  exit 1
fi

echo "✅ PM2 进程正常"

echo
echo "==== 4. 健康检查 ===="
HEALTH_URL="http://127.0.0.1:${HEALTH_PORT}${HEALTH_PATH}"
echo "🩺 HEALTH_URL=$HEALTH_URL"

STATUS="000"
for i in 1 2 3 4 5; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL" || echo "000")
  if [[ "$STATUS" == "200" ]]; then
    echo "✅ 健康检查通过，HTTP=$STATUS"
    break
  else
    echo "⏳ 第 $i 次检测失败，HTTP=$STATUS"
    sleep 2
  fi
done

if [[ "$STATUS" != "200" ]]; then
  echo "❌ 健康检查失败，HTTP=$STATUS"
  tail -n 50 "$LOG_FILE" 2>/dev/null || true
  pm2 logs "$PM2_APP" --lines 50 --nostream 2>/dev/null || true
  exit 1
fi

echo
echo "==== 5. 本地直连接口检查 ===="
curl -sS "$HEALTH_URL" || true
echo

echo
echo "==== 6. Nginx 配置检查 ===="
if nginx -t 2>/dev/null; then
  echo "✅ Nginx 配置正常"
elif command -v sudo >/dev/null 2>&1 && sudo nginx -t 2>/dev/null; then
  echo "✅ Nginx 配置正常（已用 sudo）"
else
  echo "⚠️ nginx -t 失败或无权限；手动: sudo nginx -t"
fi

echo
echo "==== 7. 最近部署日志 ===="
tail -n 30 "$LOG_FILE" 2>/dev/null || true

echo
echo "🎉 验证完成：部署看起来正常"

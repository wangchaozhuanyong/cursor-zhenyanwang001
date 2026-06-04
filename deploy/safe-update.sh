#!/usr/bin/env bash
set -uo pipefail

PROJECT_DIR="${PROJECT_DIR:-/var/www/click-send-shop}"
PM2_APP="${PM2_APP:-gc-api}"
HEALTH_PORT="${HEALTH_PORT:-3001}"
HEALTH_PATH="${HEALTH_PATH:-/api/health/live}"
LOG_FILE="${LOG_FILE:-$PROJECT_DIR/deploy.log}"
FRONTEND_SUB="${FRONTEND_SUB:-click-send-shop-main/click-send-shop-main}"
FRONTEND_DIR="$PROJECT_DIR/$FRONTEND_SUB"
BUILD_FRONTEND_ON_SERVER="${BUILD_FRONTEND_ON_SERVER:-0}"
BACKUP_BEFORE_DEPLOY="${BACKUP_BEFORE_DEPLOY:-1}"

START_TS=$(date +%s)
PREV_HEAD=""

log()  { echo "[$(date '+%F %T')] $*" | tee -a "$LOG_FILE"; }
fail() {
  local reason="$*"
  log "❌ FAIL: $reason"
  echo "RESULT=FAIL"
  echo "reason=$reason"
  exit 1
}

cd "$PROJECT_DIR" 2>/dev/null || fail "项目目录不存在: $PROJECT_DIR"
command -v git >/dev/null || fail "git 未安装"
command -v npm >/dev/null || fail "npm 未安装"
command -v pm2 >/dev/null || fail "pm2 未安装"

if [[ "${SAFE_UPDATE_LEGACY_DIRECT_RESET:-0}" != "1" ]]; then
  log "🔒 safe-update 默认改走标准发布链路，避免旧代码直接 reset 覆盖线上"
  PROJECT_DIR="$PROJECT_DIR" \
  PM2_APP="$PM2_APP" \
  GIT_BRANCH="${GIT_BRANCH:-main}" \
  AUTO_ROLLBACK="${AUTO_ROLLBACK:-1}" \
  BACKUP_BEFORE_DEPLOY="$BACKUP_BEFORE_DEPLOY" \
  BUILD_FRONTEND_ON_SERVER="$BUILD_FRONTEND_ON_SERVER" \
    bash "$PROJECT_DIR/deploy/release-deploy.sh"
  exit $?
fi

PREV_HEAD=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
log "🔄 当前版本: $PREV_HEAD"

git fetch origin main >/dev/null 2>&1 || fail "git fetch 失败"
NEW_HEAD=$(git rev-parse --short origin/main)
git reset --hard "origin/main" >/dev/null 2>&1 || fail "git reset 失败"

install_server_deps() {
  local dir="$1"
  [[ -f "$dir/package.json" ]] || return 0
  if [[ -f "$dir/package-lock.json" ]]; then
    ( cd "$dir" && npm ci --omit=dev --no-audit --fund=false ) || fail "server 依赖安装失败"
  else
    ( cd "$dir" && npm install --omit=dev --no-audit --fund=false ) || fail "server 依赖安装失败"
  fi
}

install_frontend_deps_if_needed() {
  local dir="$1"
  if [[ "$BUILD_FRONTEND_ON_SERVER" != "1" ]]; then
    log "⏭️ 跳过前端依赖安装（BUILD_FRONTEND_ON_SERVER=$BUILD_FRONTEND_ON_SERVER）"
    return 0
  fi
  [[ -f "$dir/package.json" ]] || fail "找不到前端 package.json: $dir"
  if [[ -f "$dir/package-lock.json" ]]; then
    ( cd "$dir" && npm ci --no-audit --fund=false ) || fail "frontend 依赖安装失败"
  else
    ( cd "$dir" && npm install --no-audit --fund=false ) || fail "frontend 依赖安装失败"
  fi
}

log "📝 安装后端依赖（生产模式）"
install_server_deps "$PROJECT_DIR/server"

if [[ "$BACKUP_BEFORE_DEPLOY" == "1" ]]; then
  log "💾 部署前强制创建 MySQL 全量备份"
  ( cd "$PROJECT_DIR/server" && BACKUP_KIND=pre_deploy BACKUP_TRIGGER_SOURCE=deploy BACKUP_REASON="before safe update $PREV_HEAD->$NEW_HEAD" npm run backup:full ) || fail "部署前备份失败"
  ( cd "$PROJECT_DIR/server" && BACKUP_TRIGGER_SOURCE=deploy BACKUP_REASON="before safe update $PREV_HEAD->$NEW_HEAD" npm run backup:config ) || log "⚠️ 配置快照失败，请检查备份告警"
fi

log "📝 前端依赖策略检查"
install_frontend_deps_if_needed "$FRONTEND_DIR"

if [[ "$BUILD_FRONTEND_ON_SERVER" == "1" ]]; then
  log "🎨 构建前端"
  ( cd "$FRONTEND_DIR" && npm run build ) || fail "前端构建失败"
else
  log "⏭️ 跳过前端构建"
fi

cd "$PROJECT_DIR/server" || fail "无法进入 server 目录"
if pm2 describe "$PM2_APP" >/dev/null 2>&1; then
  pm2 reload "$PM2_APP" --update-env >/dev/null 2>&1 || fail "pm2 reload 失败"
else
  pm2 start ecosystem.config.cjs --only "$PM2_APP" --env production >/dev/null 2>&1 || fail "pm2 start 失败"
fi

STATUS="000"
for _ in 1 2 3 4 5; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:${HEALTH_PORT}${HEALTH_PATH}" || echo "000")
  [[ "$STATUS" == "200" ]] && break
  sleep 2
done
[[ "$STATUS" == "200" ]] || fail "健康检查失败: HTTP=$STATUS"

DURATION=$(( $(date +%s) - START_TS ))
echo "RESULT=SUCCESS commit=$NEW_HEAD duration=${DURATION}s"
exit 0

#!/usr/bin/env bash
#
# 标准生产环境「安全更新」入口（满足以下硬性约束）：
#   ✅ 拉最新代码
#   ✅ 安装依赖（package-lock 变更时）
#   ✅ 构建前端
#   ✅ 平滑重启服务（pm2 reload，零中断）
#   ✅ 健康检查 + verify-pm2.sh 验收
#   ❌ 不修改任何配置文件（不动 .env、不动 nginx）
#   ❌ 不执行数据库迁移（SKIP_MIGRATE=1）
#   ❌ 不变更部署路径（沿用 PROJECT_DIR）
#   ❌ 不影响在线用户（pm2 reload 而非 restart；任何步骤失败立即停止，不会留下半截状态）
#
# 用法（在生产服务器上执行）：
#   bash deploy/safe-update.sh
#   # 自定义路径：PROJECT_DIR=/var/www/click-send-shop bash deploy/safe-update.sh
#
# 输出：最后一行明确打印 "RESULT=SUCCESS commit=xxxxxxx" 或 "RESULT=FAIL reason=..."

set -uo pipefail

PROJECT_DIR="${PROJECT_DIR:-/var/www/click-send-shop}"
PM2_APP="${PM2_APP:-gc-api}"
HEALTH_PORT="${HEALTH_PORT:-3001}"
HEALTH_PATH="${HEALTH_PATH:-/api/health/live}"
LOG_FILE="${LOG_FILE:-$PROJECT_DIR/deploy.log}"
START_TS=$(date +%s)
PREV_HEAD=""

log()  { echo "[$(date '+%F %T')] $*" | tee -a "$LOG_FILE"; }
fail() {
  local reason="$*"
  log "❌ FAIL: $reason"
  echo
  echo "================ 发布结果 ================"
  echo "RESULT=FAIL"
  echo "reason=$reason"
  echo "prev_commit=${PREV_HEAD:-unknown}"
  echo "duration=$(( $(date +%s) - START_TS ))s"
  echo "log_file=$LOG_FILE"
  echo "回滚一行：cd $PROJECT_DIR && git reset --hard ${PREV_HEAD:-HEAD@{1}} && cd server && pm2 reload $PM2_APP --update-env"
  echo "=========================================="
  exit 1
}

cd "$PROJECT_DIR" 2>/dev/null || fail "项目目录不存在: $PROJECT_DIR"

# 0) 前置检查（不变更任何东西）
command -v git  >/dev/null || fail "git 未安装"
command -v node >/dev/null || fail "node 未安装"
command -v npm  >/dev/null || fail "npm 未安装"
command -v pm2  >/dev/null || fail "pm2 未安装"
[[ -d "$PROJECT_DIR/server" ]]                || fail "缺少 $PROJECT_DIR/server"
[[ -f "$PROJECT_DIR/server/.env" ]]           || fail "缺少 $PROJECT_DIR/server/.env（不会创建，请人工放置）"
[[ -f "$PROJECT_DIR/server/ecosystem.config.cjs" ]] || fail "缺少 server/ecosystem.config.cjs"

PREV_HEAD=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
log "🔖 当前版本: $PREV_HEAD"

# 检测是否有未提交改动（防止 reset 抹掉手工热修）
if ! git diff --quiet || ! git diff --cached --quiet; then
  fail "工作区有未提交改动（git status），拒绝执行以免覆盖热修。请先 git stash 或提交。"
fi

# 1) 拉最新代码（与 origin/main 对齐）
log "📥 拉取最新代码..."
git fetch origin main 2>&1 | tee -a "$LOG_FILE" >/dev/null || fail "git fetch 失败"
NEW_HEAD=$(git rev-parse --short origin/main)

if [[ "$PREV_HEAD" == "$NEW_HEAD" ]]; then
  log "ℹ️  已是最新版本（$NEW_HEAD），无代码变更。继续做依赖/构建/reload 以保持一致。"
fi

git reset --hard "origin/main" 2>&1 | tee -a "$LOG_FILE" >/dev/null \
  || fail "git reset 失败"

LOCAL_HEAD=$(git rev-parse --short HEAD)
[[ "$LOCAL_HEAD" == "$NEW_HEAD" ]] || fail "git reset 后 HEAD($LOCAL_HEAD) ≠ origin/main($NEW_HEAD)"
log "✅ 代码已更新到 $NEW_HEAD"

# 2) 安装依赖（仅当 package-lock 变化时；命令失败即终止）
install_if_lock_changed() {
  local dir="$1" label="$2"
  [[ -f "$dir/package.json" ]] || { log "  ↳ 跳过 $label（无 package.json）"; return 0; }

  local lock_changed=1
  if git diff --quiet "$PREV_HEAD" "$NEW_HEAD" -- "$dir/package-lock.json" "$dir/package.json" 2>/dev/null; then
    lock_changed=0
  fi

  if [[ "$lock_changed" == "1" || ! -d "$dir/node_modules" ]]; then
    log "📦 [$label] 依赖有变更或缺 node_modules → npm ci/install"
    if [[ -f "$dir/package-lock.json" ]]; then
      ( cd "$dir" && npm ci --omit=dev 2>&1 | tee -a "$LOG_FILE" >/dev/null ) \
        || ( cd "$dir" && npm install 2>&1 | tee -a "$LOG_FILE" >/dev/null ) \
        || fail "[$label] 依赖安装失败"
    else
      ( cd "$dir" && npm install 2>&1 | tee -a "$LOG_FILE" >/dev/null ) \
        || fail "[$label] 依赖安装失败"
    fi
  else
    log "  ↳ [$label] 依赖未变更，跳过 npm install"
  fi
}

install_if_lock_changed "$PROJECT_DIR/server" "server"

FRONTEND_SUB="${FRONTEND_SUB:-click-send-shop-main/click-send-shop-main}"
FRONTEND_DIR="$PROJECT_DIR/$FRONTEND_SUB"
HAS_FRONTEND=0
if [[ -f "$FRONTEND_DIR/package.json" ]]; then
  HAS_FRONTEND=1
  install_if_lock_changed "$FRONTEND_DIR" "frontend"
fi

# 3) 前端构建（产物先存到临时目录，构建成功才发布，避免半截 dist）
if [[ "$HAS_FRONTEND" == "1" ]] && grep -q '"build"' "$FRONTEND_DIR/package.json"; then
  log "🎨 构建前端..."
  ( cd "$FRONTEND_DIR" && npm run build 2>&1 | tee -a "$LOG_FILE" >/dev/null ) \
    || fail "前端构建失败"
  [[ -d "$FRONTEND_DIR/dist" ]] || fail "前端构建后未找到 dist/"
  log "✅ 前端构建完成: $FRONTEND_DIR/dist"
else
  log "  ↳ 跳过前端构建（无 build 脚本）"
fi

# 4) 不动数据库（明确跳过）
log "⏭  跳过数据库迁移（约束：不改 schema）"

# 5) 平滑重启（pm2 reload，零中断；进程不存在才 start）
log "🔄 pm2 reload $PM2_APP（零中断）..."
mkdir -p "$PROJECT_DIR/server/logs"
cd "$PROJECT_DIR/server" || fail "无法 cd $PROJECT_DIR/server"
if pm2 describe "$PM2_APP" >/dev/null 2>&1; then
  pm2 reload "$PM2_APP" --update-env 2>&1 | tee -a "$LOG_FILE" >/dev/null \
    || fail "pm2 reload 失败"
else
  log "  ↳ $PM2_APP 不在运行中，改用 pm2 start"
  pm2 start ecosystem.config.cjs --only "$PM2_APP" --env production 2>&1 | tee -a "$LOG_FILE" >/dev/null \
    || fail "pm2 start 失败"
fi
pm2 save >/dev/null 2>&1 || true

# 6) 健康检查（5 次重试，期间老进程仍在服务）
log "🧪 健康检查 ${HEALTH_PATH}..."
STATUS="000"
for i in 1 2 3 4 5 6 7 8 9 10; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    "http://127.0.0.1:${HEALTH_PORT}${HEALTH_PATH}" 2>/dev/null || echo "000")
  if [[ "$STATUS" == "200" ]]; then break; fi
  sleep 2
done
[[ "$STATUS" == "200" ]] || fail "健康检查失败 HTTP=$STATUS（建议查 pm2 logs $PM2_APP --lines 80 --nostream）"
log "✅ 健康检查通过"

# 7) 强制验收
if [[ -x "$PROJECT_DIR/deploy/verify-pm2.sh" || -f "$PROJECT_DIR/deploy/verify-pm2.sh" ]]; then
  log "🔎 verify-pm2.sh..."
  PM2_APP="$PM2_APP" HEALTH_PORT="$HEALTH_PORT" HEALTH_PATH="$HEALTH_PATH" \
    bash "$PROJECT_DIR/deploy/verify-pm2.sh" 2>&1 | tee -a "$LOG_FILE" \
    || fail "verify-pm2.sh 未通过"
fi

# 8) 输出结果
DURATION=$(( $(date +%s) - START_TS ))
echo
echo "================ 发布结果 ================"
echo "RESULT=SUCCESS"
echo "prev_commit=$PREV_HEAD"
echo "new_commit=$LOCAL_HEAD"
echo "duration=${DURATION}s"
echo "pm2_app=$PM2_APP"
echo "health=${HEALTH_PATH} → 200"
echo "log_file=$LOG_FILE"
echo "如需回滚：cd $PROJECT_DIR && git reset --hard $PREV_HEAD && cd server && pm2 reload $PM2_APP --update-env"
echo "=========================================="
log "🎉 SUCCESS  $PREV_HEAD → $LOCAL_HEAD  耗时 ${DURATION}s"
exit 0

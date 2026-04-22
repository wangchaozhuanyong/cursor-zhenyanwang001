#!/usr/bin/env bash
#
# 回滚脚本：把代码回滚到指定（或上一已知良好）commit，然后重新部署 + verify。
#
# 用法：
#   bash deploy/rollback.sh                 # 回滚到 .deploy-state/last_good_head
#   bash deploy/rollback.sh <commit_hash>   # 回滚到指定 commit（必须是仓库内已存在的）
#
# 触发条件（建议）：
#   - ci-deploy.sh 设 AUTO_ROLLBACK=1 时自动触发
#   - 人工：监控告警 / 业务报错时执行
#
# 环境变量：
#   PROJECT_DIR     默认 /var/www/click-send-shop
#   PM2_APP         默认 gc-api
#
set -euo pipefail

PROJECT_DIR="${PROJECT_DIR:-/var/www/click-send-shop}"
PM2_APP="${PM2_APP:-gc-api}"

cd "$PROJECT_DIR" || { echo "❌ 项目目录不存在: $PROJECT_DIR"; exit 1; }

STATE_DIR="$PROJECT_DIR/.deploy-state"
LAST_GOOD="$STATE_DIR/last_good_head"
HISTORY="$STATE_DIR/history.log"
mkdir -p "$STATE_DIR"

ts() { date '+%Y-%m-%d %H:%M:%S'; }
log() { echo "[$(ts)] [rollback] $*"; }

TARGET="${1:-}"
if [[ -z "$TARGET" ]]; then
  if [[ -s "$LAST_GOOD" ]]; then
    TARGET=$(cat "$LAST_GOOD")
  else
    log "❌ 未提供 commit，且 $LAST_GOOD 不存在"
    exit 1
  fi
fi

CUR_HEAD=$(git rev-parse HEAD)
log "当前 HEAD=$CUR_HEAD，目标=$TARGET"

if [[ "$CUR_HEAD" == "$TARGET" ]]; then
  log "⚠️ 当前已在目标提交，直接重跑部署链路"
else
  if ! git cat-file -e "${TARGET}^{commit}" 2>/dev/null; then
    log "📥 目标 commit 在本地不存在，先 git fetch"
    git fetch origin --prune
    if ! git cat-file -e "${TARGET}^{commit}" 2>/dev/null; then
      log "❌ 目标 commit 在远程也找不到：$TARGET"
      exit 1
    fi
  fi
  log "⏪ git reset --hard $TARGET"
  git reset --hard "$TARGET"
fi

log "🚀 重新执行标准部署链路"
bash "$PROJECT_DIR/deploy/production-deploy.sh"

log "🔎 重新执行 verify-pm2"
PM2_APP="$PM2_APP" \
PROJECT_DIR="$PROJECT_DIR" \
  bash "$PROJECT_DIR/deploy/verify-pm2.sh"

NEW_HEAD=$(git rev-parse HEAD)
echo "$NEW_HEAD" > "$LAST_GOOD"
echo "[$(ts)] ROLLBACK_OK from=$CUR_HEAD to=$NEW_HEAD" >> "$HISTORY"

log "✅ 回滚成功，HEAD=$NEW_HEAD"
echo "ROLLBACK=OK"

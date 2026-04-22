#!/usr/bin/env bash
#
# CI/CD 唯一部署入口
#   - GitHub Actions / Webhook / cron 都只调本脚本
#   - 内部调用 deploy/production-deploy.sh + deploy/verify-pm2.sh
#   - 任一步骤失败 → 立即非 0 退出，CI 任务自动失败
#   - AUTO_ROLLBACK=1 时，失败自动回滚到上一已知良好版本并再次 verify
#
# 用法：
#   bash deploy/ci-deploy.sh
#
# 环境变量：
#   PROJECT_DIR     默认 /var/www/click-send-shop
#   PM2_APP         默认 gc-api
#   AUTO_ROLLBACK   1 = 失败时自动回滚（默认 0，仅记录待人工触发）
#   FRONTEND_SUB / HEALTH_PORT / HEALTH_PATH / READY_PATH 透传给下游
#
set -euo pipefail

PROJECT_DIR="${PROJECT_DIR:-/var/www/click-send-shop}"
PM2_APP="${PM2_APP:-gc-api}"

cd "$PROJECT_DIR" || { echo "❌ 项目目录不存在: $PROJECT_DIR"; exit 1; }

STATE_DIR="$PROJECT_DIR/.deploy-state"
mkdir -p "$STATE_DIR"
LAST_GOOD="$STATE_DIR/last_good_head"
LAST_FAILED="$STATE_DIR/last_failed_head"
HISTORY="$STATE_DIR/history.log"

ts() { date '+%Y-%m-%d %H:%M:%S'; }
log() { echo "[$(ts)] $*"; }

PREV_HEAD=""
if git -C "$PROJECT_DIR" rev-parse --git-dir >/dev/null 2>&1; then
  PREV_HEAD=$(git -C "$PROJECT_DIR" rev-parse HEAD 2>/dev/null || true)
fi
log "PREV_HEAD=$PREV_HEAD"

on_fail() {
  local exit_code=$?
  local new_head
  new_head=$(git -C "$PROJECT_DIR" rev-parse HEAD 2>/dev/null || echo "unknown")
  log "❌ 部署失败 exit=$exit_code, NEW_HEAD=$new_head"
  echo "$new_head" > "$LAST_FAILED"
  echo "[$(ts)] FAIL exit=$exit_code prev=$PREV_HEAD new=$new_head" >> "$HISTORY"

  if [[ "${AUTO_ROLLBACK:-0}" == "1" ]]; then
    if [[ -s "$LAST_GOOD" ]]; then
      local good
      good=$(cat "$LAST_GOOD")
      if [[ -n "$good" && "$good" != "$new_head" ]]; then
        log "⏪ AUTO_ROLLBACK=1，触发自动回滚到 $good"
        if PROJECT_DIR="$PROJECT_DIR" PM2_APP="$PM2_APP" \
            bash "$PROJECT_DIR/deploy/rollback.sh" "$good"; then
          log "✅ 自动回滚完成"
          # 回滚成功也算「本次发布失败」，仍以非 0 退出，让 CI 标红
          exit 2
        else
          log "❌ 自动回滚失败"
          exit 3
        fi
      else
        log "⚠️ 无可回滚的 last_good_head（与当前一致或为空）"
      fi
    else
      log "⚠️ 未找到 last_good_head：$LAST_GOOD（首次部署或被清理过）"
    fi
  else
    log "ℹ️ AUTO_ROLLBACK 未启用，请人工执行：bash deploy/rollback.sh"
  fi
  exit "$exit_code"
}
trap on_fail ERR

log "===== ci-deploy: 1) 执行标准部署链路 ====="
bash "$PROJECT_DIR/deploy/production-deploy.sh"

log "===== ci-deploy: 2) 强制 verify-pm2 ====="
PM2_APP="$PM2_APP" \
HEALTH_PORT="${HEALTH_PORT:-3001}" \
HEALTH_PATH="${HEALTH_PATH:-/api/health/live}" \
READY_PATH="${READY_PATH:-/api/health/ready}" \
PROJECT_DIR="$PROJECT_DIR" \
  bash "$PROJECT_DIR/deploy/verify-pm2.sh"

NEW_HEAD=$(git -C "$PROJECT_DIR" rev-parse HEAD 2>/dev/null || echo "unknown")
echo "$NEW_HEAD" > "$LAST_GOOD"
echo "[$(ts)] OK   prev=$PREV_HEAD new=$NEW_HEAD" >> "$HISTORY"

log "🎉 部署成功并通过验收，NEW_HEAD=$NEW_HEAD"
echo "READY=YES"

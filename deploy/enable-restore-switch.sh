#!/usr/bin/env bash
# 在生产服务器上启用/关闭备份生产切换能力（不执行切换本身）
# 用法：
#   bash deploy/enable-restore-switch.sh on
#   bash deploy/enable-restore-switch.sh off
set -euo pipefail

MODE="${1:-}"
if [[ "$MODE" != "on" && "$MODE" != "off" ]]; then
  echo "用法: $0 on|off"
  exit 1
fi

ROOT="${PROJECT_DIR:-/var/www/damatong}"
ENV_FILE="${ROOT}/server/.env"
PM2_APP="${PM2_APP:-gc-api}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "找不到 .env: $ENV_FILE"
  exit 1
fi

VALUE="0"
[[ "$MODE" == "on" ]] && VALUE="1"

if grep -q '^RESTORE_SWITCH_ENABLED=' "$ENV_FILE"; then
  sed -i "s/^RESTORE_SWITCH_ENABLED=.*/RESTORE_SWITCH_ENABLED=${VALUE}/" "$ENV_FILE"
else
  printf '\n# 备份中心生产切换\nRESTORE_SWITCH_ENABLED=%s\n' "$VALUE" >> "$ENV_FILE"
fi

echo "已设置 RESTORE_SWITCH_ENABLED=${VALUE} 于 ${ENV_FILE}"

cd "${ROOT}/server"
if command -v pm2 >/dev/null 2>&1; then
  pm2 reload "$PM2_APP" --update-env || pm2 restart "$PM2_APP" --update-env
  pm2 save 2>/dev/null || true
  echo "已重载 PM2 进程: ${PM2_APP}"
else
  echo "未检测到 pm2，请手动重启 API 服务"
fi

grep '^RESTORE_SWITCH_ENABLED=' "$ENV_FILE" || true

#!/usr/bin/env bash
#
# 将项目从宝塔常用路径迁移到标准目录（在服务器上执行，不在本机 Windows）
#
# 用法：
#   DRY_RUN=1 bash scripts/migrate-from-baota-path.sh
#   sudo bash scripts/migrate-from-baota-path.sh
#
# 默认：
#   SRC=/www/wwwroot/cursor-zhenyanwang001
#   DST=/var/www/click-send-shop
#
set -euo pipefail

SRC="${SRC:-/www/wwwroot/cursor-zhenyanwang001}"
DST="${DST:-/var/www/click-send-shop}"

echo "SRC=$SRC"
echo "DST=$DST"
if [[ ! -d "$SRC" ]]; then
  echo "❌ 源目录不存在: $SRC"
  exit 1
fi

RSYNC_OPTS=(-aH --info=stats2)
EXCLUDES=(--exclude node_modules --exclude '**/dist' --exclude .git/objects)

if [[ "${DRY_RUN:-0}" == "1" ]]; then
  RSYNC_OPTS+=(--dry-run)
  echo "🔍 DRY_RUN=1，仅演示 rsync，不写入 $DST"
fi

sudo mkdir -p "$DST"
sudo rsync "${RSYNC_OPTS[@]}" "${EXCLUDES[@]}" "$SRC/" "$DST/"

echo
echo "✅ rsync 完成。后续请在服务器上："
echo "   1) export PROJECT_DIR=$DST"
echo "   2) 更新系统 Nginx root / proxy_pass 指向新路径"
echo "   3) 更新 PM2：cd $DST/server && pm2 delete gc-api 2>/dev/null; pm2 start ecosystem.config.cjs --only gc-api --env production && pm2 save"
echo "   4) bash $DST/deploy/verify-pm2.sh"
echo "   5) 验收通过后再卸载宝塔、删除旧目录（先备份）"

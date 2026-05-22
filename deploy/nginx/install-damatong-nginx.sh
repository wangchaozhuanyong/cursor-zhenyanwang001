#!/usr/bin/env bash
# 启用 damatong.prod.conf，禁用 flashcast.com.my / cursor-main-frontend 旧配置。
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="${PROJECT_DIR:-$(cd "$SCRIPT_DIR/../.." && pwd)}"
SRC="$SCRIPT_DIR/damatong.prod.conf"
AVAIL="/etc/nginx/sites-available/damatong.prod.conf"
ENABLED="/etc/nginx/sites-enabled/damatong.prod.conf"

LEGACY_ENABLED=(
  "/etc/nginx/sites-enabled/cursor-main-frontend.conf"
  "/etc/nginx/sites-enabled/flashcast.com.my.conf"
  "/etc/nginx/sites-enabled/flashcast.prod.conf"
)

if [[ ! -f "$SRC" ]]; then
  echo "missing $SRC" >&2
  exit 1
fi

echo "==> Install $AVAIL"
sudo cp "$SRC" "$AVAIL"
sudo ln -sf "$AVAIL" "$ENABLED"

echo "==> Disable legacy site configs"
for leg in "${LEGACY_ENABLED[@]}"; do
  if [[ -e "$leg" ]]; then
    sudo rm -f "$leg"
    echo "    removed $leg"
  fi
done
# patch-nginx-admin-spa 等脚本曾在 sites-enabled 留下 .bak，会被 nginx 当作有效配置
for bak in /etc/nginx/sites-enabled/cursor-main-frontend.conf.bak.*; do
  if [[ -e "$bak" ]]; then
    sudo rm -f "$bak"
    echo "    removed $bak"
  fi
done

if grep -R "server_name.*flashcast\.com\.my" /etc/nginx/sites-enabled/ 2>/dev/null; then
  echo "WARN: sites-enabled still serves flashcast.com.my — review manually:" >&2
  grep -R "server_name.*flashcast\.com\.my" /etc/nginx/sites-enabled/ || true
fi

sudo nginx -t
sudo systemctl reload nginx
echo "OK: damatong.prod.conf active (damatong.net / console.damatong.net)"

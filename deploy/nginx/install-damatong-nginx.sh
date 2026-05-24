#!/usr/bin/env bash
# 启用 damatong.prod.conf，禁用旧站 Nginx 配置。
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="${PROJECT_DIR:-$(cd "$SCRIPT_DIR/../.." && pwd)}"
SRC="$SCRIPT_DIR/damatong.prod.conf"
AVAIL="/etc/nginx/sites-available/damatong.prod.conf"
ENABLED="/etc/nginx/sites-enabled/damatong.prod.conf"

echo "==> Install $AVAIL"
sudo cp "$SRC" "$AVAIL"
sudo ln -sf "$AVAIL" "$ENABLED"

echo "==> Disable legacy site configs"
for leg in \
  /etc/nginx/sites-enabled/cursor-main-frontend.conf \
  /etc/nginx/sites-enabled/flashcast*.conf \
  /etc/nginx/sites-available/cursor-main-frontend.conf; do
  for f in $leg; do
    if [[ -e "$f" ]]; then
      sudo rm -f "$f"
      echo "    removed $f"
    fi
  done
done
for bak in /etc/nginx/sites-enabled/cursor-main-frontend.conf.bak.*; do
  if [[ -e "$bak" ]]; then
    sudo rm -f "$bak"
    echo "    removed $bak"
  fi
done

sudo nginx -t
sudo systemctl reload nginx
echo "OK: damatong.prod.conf active (damatong.net / console.damatong.net)"

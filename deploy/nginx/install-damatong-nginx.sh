#!/usr/bin/env bash
# 启用 damatong.prod.conf，禁用旧站 Nginx 配置。
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="${PROJECT_DIR:-$(cd "$SCRIPT_DIR/../.." && pwd)}"
SRC="$SCRIPT_DIR/damatong.prod.conf"
CDN_SRC="$SCRIPT_DIR/damatong-cdn.conf"
CACHE_SRC="$SCRIPT_DIR/damatong-media-cache.conf"
AVAIL="/etc/nginx/sites-available/damatong.prod.conf"
CDN_AVAIL="/etc/nginx/sites-available/damatong-cdn.conf"
ENABLED="/etc/nginx/sites-enabled/damatong.prod.conf"
CDN_ENABLED="/etc/nginx/sites-enabled/damatong-cdn.conf"
CACHE_CONF="/etc/nginx/conf.d/damatong-media-cache.conf"

echo "==> Install $AVAIL"
sudo cp "$SRC" "$AVAIL"
sudo ln -sf "$AVAIL" "$ENABLED"

echo "==> Install $CDN_AVAIL"
sudo cp "$CDN_SRC" "$CDN_AVAIL"
sudo ln -sf "$CDN_AVAIL" "$CDN_ENABLED"

echo "==> Install media cache config"
sudo mkdir -p /var/cache/nginx/damatong-media
sudo chown www-data:www-data /var/cache/nginx/damatong-media || true
sudo cp "$CACHE_SRC" "$CACHE_CONF"

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

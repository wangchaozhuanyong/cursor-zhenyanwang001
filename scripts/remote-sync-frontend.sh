#!/usr/bin/env bash
set -euo pipefail
ROOT=/var/www/click-send-shop
DIST="$ROOT/click-send-shop-main/click-send-shop-main/dist"
PUBLIC="$ROOT/public-frontend"
ARCHIVE=/tmp/frontend_dist_deploy.tgz

backup=""
if [ -d "$PUBLIC/assets" ]; then
  backup="$(mktemp -d)"
  cp -a "$PUBLIC/assets/." "$backup/" 2>/dev/null || true
fi

mkdir -p "$DIST" "$PUBLIC"
tar -xzf "$ARCHIVE" -C "$ROOT/click-send-shop-main/click-send-shop-main"
test -f "$DIST/index.html"
rsync -a --delete "$DIST/" "$PUBLIC/"
if [ -n "$backup" ] && [ -d "$backup" ]; then
  mkdir -p "$PUBLIC/assets"
  cp -an "$backup/." "$PUBLIC/assets/" 2>/dev/null || true
  rm -rf "$backup"
fi
test -f "$PUBLIC/sw.js"
grep -o 'rel="manifest" href="[^"]*"' "$PUBLIC/index.html" | head -1
rm -f "$ARCHIVE"
echo DEPLOY_OK

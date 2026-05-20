#!/usr/bin/env bash
set -euo pipefail
ROOT=/var/www/click-send-shop
DIST="$ROOT/click-send-shop-main/click-send-shop-main/dist"
PUBLIC="$ROOT/public-frontend"
ARCHIVE=/tmp/frontend_dist_deploy.tgz

mkdir -p "$DIST" "$PUBLIC"
tar -xzf "$ARCHIVE" -C "$ROOT/click-send-shop-main/click-send-shop-main"
test -f "$DIST/index.html"
rsync -a --delete "$DIST/" "$PUBLIC/"
test -f "$PUBLIC/sw.js"
grep -o 'rel="manifest" href="[^"]*"' "$PUBLIC/index.html" | head -1
rm -f "$ARCHIVE"
echo DEPLOY_OK

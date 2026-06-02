#!/usr/bin/env bash
set -euo pipefail
ROOT=/var/www/click-send-shop
DIST="$ROOT/click-send-shop-main/click-send-shop-main/dist"
PUBLIC="$ROOT/public-frontend"
ARCHIVE=/tmp/frontend_dist_deploy.tgz

mkdir -p "$DIST" "$PUBLIC"
tar -xzf "$ARCHIVE" -C "$ROOT/click-send-shop-main/click-send-shop-main"
test -f "$DIST/index.html"
if [ -d "$DIST/assets" ]; then
  mkdir -p "$PUBLIC/assets"
  rsync -a "$DIST/assets/" "$PUBLIC/assets/"
fi
for file in "$DIST"/workbox-*.js; do
  [ -f "$file" ] && cp -a "$file" "$PUBLIC/"
done
rsync -a --delete --exclude='/assets/' --exclude='/workbox-*.js' "$DIST/" "$PUBLIC/"
node "$ROOT/scripts/verify_frontend_dist_assets.js" "$DIST"
node "$ROOT/scripts/verify_frontend_dist_assets.js" "$PUBLIC"
test -f "$PUBLIC/sw.js"
grep -o 'rel="manifest" href="[^"]*"' "$PUBLIC/index.html" | head -1
rm -f "$ARCHIVE"
echo DEPLOY_OK

#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="${1:-/var/www/click-send-shop/full-project}"
FRONT_DIR="$ROOT_DIR/click-send-shop-main/click-send-shop-main"
SERVER_DIR="$ROOT_DIR/server"

echo "[atomic-deploy] root: $ROOT_DIR"
cd "$FRONT_DIR"

rm -rf dist.__new dist.__old

echo "[atomic-deploy] building frontend to dist.__new ..."
npm run build -- --outDir dist.__new

if [ -d dist ]; then
  mv dist dist.__old
fi
mv dist.__new dist
rm -rf dist.__old

# Remove legacy hotfix aliases once index cache policy is corrected.
rm -f dist/assets/AdminProducts-CY-imU7a.js
rm -f dist/assets/AdminProductForm-OsdDVNdj.js
rm -f dist/assets/AdminCoupons-BLsIu_w4.js

echo "[atomic-deploy] restarting api ..."
cd "$SERVER_DIR"
pm2 restart gc-api

echo "[atomic-deploy] done."

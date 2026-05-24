#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="${1:-/var/www/click-send-shop}"
FRONT_DIR="$ROOT_DIR/click-send-shop-main/click-send-shop-main"
SERVER_DIR="$ROOT_DIR/server"
PUBLIC_FRONTEND="${PUBLIC_FRONTEND:-/var/www/damatong/dist}"
ADMIN_PUBLIC_FRONTEND="${ADMIN_PUBLIC_FRONTEND:-/var/www/damatong/admin-dist}"
export VITE_API_BASE_URL="${VITE_API_BASE_URL:-/api}"

echo "[atomic-deploy] root: $ROOT_DIR"
cd "$FRONT_DIR"

rm -rf dist.__new dist.__old

echo "[atomic-deploy] building frontend to dist.__new (VITE_API_BASE_URL=$VITE_API_BASE_URL) ..."
npm run build -- --outDir dist.__new

if [ -d dist ]; then
  # Keep old hashed chunks available for users who already loaded the previous
  # index/admin bundle. Removing them immediately can break React lazy imports.
  if [ -d dist/assets ] && [ -d dist.__new/assets ]; then
    cp -an dist/assets/. dist.__new/assets/
  fi
  mv dist dist.__old
fi
mv dist.__new dist
rm -rf dist.__old

# Remove legacy hotfix aliases once index cache policy is corrected.
rm -f dist/assets/AdminProducts-CY-imU7a.js
rm -f dist/assets/AdminProductForm-OsdDVNdj.js
rm -f dist/assets/AdminCoupons-BLsIu_w4.js

if [ ! -f admin-dist/admin-index.html ]; then
  echo "[atomic-deploy] admin-dist/admin-index.html missing; building admin ..."
  npm run build:admin
fi

echo "[atomic-deploy] syncing static roots ..."
mkdir -p "$PUBLIC_FRONTEND" "$ADMIN_PUBLIC_FRONTEND"
if command -v rsync >/dev/null 2>&1; then
  rsync -a --delete dist/ "$PUBLIC_FRONTEND/"
  rsync -a --delete admin-dist/ "$ADMIN_PUBLIC_FRONTEND/"
else
  rm -rf "${PUBLIC_FRONTEND:?}/"* "${ADMIN_PUBLIC_FRONTEND:?}/"*
  cp -a dist/. "$PUBLIC_FRONTEND/"
  cp -a admin-dist/. "$ADMIN_PUBLIC_FRONTEND/"
fi
test -f "$PUBLIC_FRONTEND/index.html"
test -f "$ADMIN_PUBLIC_FRONTEND/admin-index.html"

echo "[atomic-deploy] restarting api ..."
cd "$SERVER_DIR"
pm2 restart gc-api

echo "[atomic-deploy] done."

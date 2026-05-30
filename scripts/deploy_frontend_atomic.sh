#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="${1:-/var/www/click-send-shop}"
FRONT_DIR="$ROOT_DIR/click-send-shop-main/click-send-shop-main"
SERVER_DIR="$ROOT_DIR/server"
PUBLIC_FRONTEND="${PUBLIC_FRONTEND:-/var/www/damatong/dist}"
ADMIN_PUBLIC_FRONTEND="${ADMIN_PUBLIC_FRONTEND:-/var/www/damatong/admin-dist}"
export VITE_API_BASE_URL="${VITE_API_BASE_URL:-/api}"

sync_static_preserve_assets() {
  local src_dir="$1"
  local dest_dir="$2"
  local backup=""

  if [ -d "$dest_dir/assets" ]; then
    backup="$(mktemp -d)"
    cp -a "$dest_dir/assets/." "$backup/" 2>/dev/null || true
  fi

  mkdir -p "$dest_dir"
  if command -v rsync >/dev/null 2>&1; then
    rsync -a --delete "${src_dir%/}/" "${dest_dir%/}/"
  else
    rm -rf "${dest_dir:?}/"*
    cp -a "${src_dir%/}/." "$dest_dir/"
  fi

  if [ -n "$backup" ] && [ -d "$backup" ]; then
    mkdir -p "$dest_dir/assets"
    cp -an "$backup/." "$dest_dir/assets/" 2>/dev/null || true
    rm -rf "$backup"
  fi
}

echo "[atomic-deploy] root: $ROOT_DIR"
cd "$FRONT_DIR"

if [ ! -f admin-dist/admin-index.html ]; then
  echo "[atomic-deploy] admin-dist/admin-index.html missing; building admin ..."
  npm run build:admin
fi

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

echo "[atomic-deploy] syncing static roots ..."
sync_static_preserve_assets dist "$PUBLIC_FRONTEND"
sync_static_preserve_assets admin-dist "$ADMIN_PUBLIC_FRONTEND"
test -f "$PUBLIC_FRONTEND/index.html"
test -f "$ADMIN_PUBLIC_FRONTEND/admin-index.html"

echo "[atomic-deploy] restarting api ..."
cd "$SERVER_DIR"
pm2 restart gc-api

echo "[atomic-deploy] done."

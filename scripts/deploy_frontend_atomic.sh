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

  mkdir -p "$dest_dir"
  if command -v rsync >/dev/null 2>&1; then
    if [ -d "${src_dir%/}/assets" ]; then
      mkdir -p "${dest_dir%/}/assets"
      rsync -a "${src_dir%/}/assets/" "${dest_dir%/}/assets/"
    fi
    for file in "${src_dir%/}"/workbox-*.js; do
      [ -f "$file" ] && cp -a "$file" "${dest_dir%/}/"
    done
    rsync -a --delete --exclude='/assets/' --exclude='/workbox-*.js' "${src_dir%/}/" "${dest_dir%/}/"
  else
    if [ -d "${src_dir%/}/assets" ]; then
      mkdir -p "${dest_dir%/}/assets"
      cp -a "${src_dir%/}/assets/." "${dest_dir%/}/assets/"
    fi
    for file in "${src_dir%/}"/workbox-*.js; do
      [ -f "$file" ] && cp -a "$file" "${dest_dir%/}/"
    done
    find "${dest_dir%/}" -mindepth 1 -maxdepth 1 ! -name assets ! -name 'workbox-*.js' -exec rm -rf {} +
    cp -a "${src_dir%/}/." "$dest_dir/"
  fi
}

echo "[atomic-deploy] root: $ROOT_DIR"
cd "$FRONT_DIR"

rm -rf dist.__new dist.__old admin-dist.__new admin-dist.__old

echo "[atomic-deploy] building admin to admin-dist.__new ..."
VITE_BUILD_OUT_DIR=admin-dist.__new npm run build:admin

if [ -d admin-dist ]; then
  # Keep old admin hashed chunks available until every opened admin tab reloads.
  if [ -d admin-dist/assets ] && [ -d admin-dist.__new/assets ]; then
    cp -an admin-dist/assets/. admin-dist.__new/assets/
  fi
  mv admin-dist admin-dist.__old
fi
mv admin-dist.__new admin-dist
rm -rf admin-dist.__old

echo "[atomic-deploy] building frontend to dist.__new (VITE_API_BASE_URL=$VITE_API_BASE_URL) ..."
VITE_BUILD_OUT_DIR=dist.__new PWA_DIST_DIR=dist.__new npm run build

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

node "$ROOT_DIR/scripts/verify_frontend_dist_assets.js" dist
node "$ROOT_DIR/scripts/verify_frontend_dist_assets.js" admin-dist

echo "[atomic-deploy] syncing static roots ..."
sync_static_preserve_assets dist "$PUBLIC_FRONTEND"
sync_static_preserve_assets admin-dist "$ADMIN_PUBLIC_FRONTEND"
test -f "$PUBLIC_FRONTEND/index.html"
test -f "$ADMIN_PUBLIC_FRONTEND/admin-index.html"

echo "[atomic-deploy] restarting api ..."
cd "$SERVER_DIR"
pm2 restart gc-api

echo "[atomic-deploy] done."

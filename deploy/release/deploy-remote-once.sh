#!/usr/bin/env bash
set -euo pipefail

DEPLOY_BASE="${DEPLOY_BASE:-/var/www/damatong}"
SHARED_ENV="${DEPLOY_BASE}/shared/server.env"
ARCHIVE="${1:-/tmp/damatong-release.tar}"
SHORT_SHA="${2:-unknown}"

timestamp="$(date +%Y%m%d-%H%M%S)"
release_id="${timestamp}-${SHORT_SHA}"
release_dir="${DEPLOY_BASE}/releases/${release_id}"
releases_dir="${DEPLOY_BASE}/releases"
current_link="${DEPLOY_BASE}/current"
dist_link="${DEPLOY_BASE}/dist"
admin_dist_link="${DEPLOY_BASE}/admin-dist"
KEEP_RELEASES="${KEEP_RELEASES:-5}"

echo "[deploy] release=${release_id}"
mkdir -p "${release_dir}"
tar -xf "${ARCHIVE}" -C "${release_dir}"
rm -f "${ARCHIVE}"

if [[ ! -f "${SHARED_ENV}" ]]; then
  echo "[FATAL] missing ${SHARED_ENV}"
  exit 1
fi
ln -sfn "${SHARED_ENV}" "${release_dir}/server/.env"

echo "[deploy] build frontend"
cd "${release_dir}/click-send-shop-main/click-send-shop-main"
npm ci
npm run build
npm run build:admin

echo "[deploy] install server deps + migrate"
cd "${release_dir}/server"
npm ci
set -a
# shellcheck disable=SC1091
source "${release_dir}/server/.env"
set +a
npm run migrate

echo "[deploy] switch symlinks"
ln -sfn "${release_dir}" "${current_link}"
ln -sfn "${release_dir}/click-send-shop-main/click-send-shop-main/dist" "${dist_link}"
ln -sfn "${release_dir}/click-send-shop-main/click-send-shop-main/admin-dist" "${admin_dist_link}"

echo "[deploy] pm2 restart"
cd "${release_dir}/server"
if pm2 describe gc-api >/dev/null 2>&1; then
  pm2 restart gc-api --update-env
else
  pm2 start ecosystem.config.cjs --only gc-api --env production
fi
pm2 save

echo "[deploy] nginx reload"
sudo nginx -t
sudo systemctl reload nginx

echo "[deploy] healthcheck"
bash "${release_dir}/deploy/release/healthcheck.sh" || true

if [[ "${KEEP_RELEASES}" =~ ^[0-9]+$ ]] && (( KEEP_RELEASES > 0 )); then
  mapfile -t all_releases < <(ls -1dt "${releases_dir}"/* 2>/dev/null || true)
  if (( ${#all_releases[@]} > KEEP_RELEASES )); then
    to_delete=("${all_releases[@]:KEEP_RELEASES}")
    for d in "${to_delete[@]}"; do
      if [[ -L "${current_link}" ]] && [[ "$(readlink -f "${current_link}")" == "$(readlink -f "${d}")" ]]; then
        continue
      fi
      rm -rf "${d}"
    done
  fi
fi

echo "[deploy] done ${release_id}"
pm2 list | head -n 8
curl -sS -o /dev/null -w "api_ready=%{http_code}\n" https://damatong.net/api/health/ready || true

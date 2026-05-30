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
KEEP_RELEASES="${KEEP_RELEASES:-2}"

preserve_previous_build_artifacts() {
  local target_build_dir="$1"
  shift

  mkdir -p "${target_build_dir}/assets"
  for source_build_dir in "$@"; do
    if [[ -d "${source_build_dir}/assets" ]]; then
      rsync -a --ignore-existing "${source_build_dir}/assets/" "${target_build_dir}/assets/"
    fi

    local file
    for file in "${source_build_dir}"/workbox-*.js; do
      if [[ -f "${file}" ]]; then
        cp -n "${file}" "${target_build_dir}/"
      fi
    done
  done
}

collect_previous_build_dirs() {
  local build_dir="$1"
  local -n output_ref="$2"
  local relative_build_dir="${build_dir#${release_dir}/}"

  output_ref=()
  local release
  for release in "${releases_dir}"/*; do
    if [[ "${release}" == "${release_dir}" ]]; then
      continue
    fi
    if [[ -d "${release}/${relative_build_dir}" ]]; then
      output_ref+=("${release}/${relative_build_dir}")
    fi
  done
}

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

echo "[deploy] preserve previous frontend static chunks"
storefront_build_dirs=()
admin_build_dirs=()
storefront_build_dir="${release_dir}/click-send-shop-main/click-send-shop-main/dist"
admin_build_dir="${release_dir}/click-send-shop-main/click-send-shop-main/admin-dist"
collect_previous_build_dirs "${storefront_build_dir}" storefront_build_dirs
collect_previous_build_dirs "${admin_build_dir}" admin_build_dirs
preserve_previous_build_artifacts "${storefront_build_dir}" "${storefront_build_dirs[@]}"
preserve_previous_build_artifacts "${admin_build_dir}" "${admin_build_dirs[@]}"

echo "[deploy] switch symlinks"
ln -sfnT "${release_dir}" "${current_link}"
ln -sfnT "${release_dir}/click-send-shop-main/click-send-shop-main/dist" "${dist_link}"
ln -sfnT "${release_dir}/click-send-shop-main/click-send-shop-main/admin-dist" "${admin_dist_link}"

echo "[deploy] pm2 restart"
cd "${release_dir}/server"
pm2 delete gc-api >/dev/null 2>&1 || true
pm2 start ecosystem.config.cjs --only gc-api --env production
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

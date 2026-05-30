#!/usr/bin/env bash
set -euo pipefail

# 版本化发布脚本：releases/<id> 构建 -> current 软链切换 -> 重启后端 -> 健康检查
#
# 约定：
# - storefront root:  /var/www/damatong/dist
# - admin root:       /var/www/damatong/admin-dist
# 这两个目录将被设置为指向 current 中的构建产物的软链。

DEPLOY_BASE="${DEPLOY_BASE:-/var/www/damatong}"
REPO_DIR="${REPO_DIR:-${DEPLOY_BASE}/app}"
KEEP_RELEASES="${KEEP_RELEASES:-2}"
RELEASE_REF="${RELEASE_REF:-origin/main}"
NODE_ENV="${NODE_ENV:-production}"

PM2_APP_NAME="${PM2_APP_NAME:-}"
SYSTEMD_SERVICE="${SYSTEMD_SERVICE:-}"

releases_dir="${DEPLOY_BASE}/releases"
shared_dir="${DEPLOY_BASE}/shared"
current_link="${DEPLOY_BASE}/current"
dist_link="${DEPLOY_BASE}/dist"
admin_dist_link="${DEPLOY_BASE}/admin-dist"

timestamp="$(date +%Y%m%d-%H%M%S)"
short_sha=""

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

echo "[deploy] DEPLOY_BASE=${DEPLOY_BASE}"
echo "[deploy] REPO_DIR=${REPO_DIR}"
echo "[deploy] RELEASE_REF=${RELEASE_REF}"

if [[ ! -d "${REPO_DIR}/.git" ]]; then
  echo "[deploy] 仓库目录不存在或不是 git：${REPO_DIR}"
  echo "[deploy] 请先在服务器上 clone 仓库到该目录，或通过 REPO_DIR 指定正确路径。"
  exit 1
fi

mkdir -p "${releases_dir}" "${shared_dir}"

cd "${REPO_DIR}"
git fetch --all --prune
git checkout -q main || true
git reset --hard "${RELEASE_REF}"
short_sha="$(git rev-parse --short HEAD)"

release_id="${timestamp}-${short_sha}"
release_dir="${releases_dir}/${release_id}"

echo "[deploy] release=${release_id}"
mkdir -p "${release_dir}"

echo "[deploy] 导出工作区到 release 目录"
git archive --format=tar HEAD | tar -x -C "${release_dir}"

# 共享文件：如果你有 `.env` 或上传目录，建议放 shared 并做软链
if [[ -f "${shared_dir}/server.env" && ! -f "${release_dir}/server/.env" ]]; then
  ln -sfn "${shared_dir}/server.env" "${release_dir}/server/.env"
fi

echo "[deploy] 构建前端（storefront + admin）"
pushd "${release_dir}/click-send-shop-main/click-send-shop-main" >/dev/null
# Vite 在 devDependencies；NODE_ENV=production 时 npm ci 会省略 dev 依赖导致 vite: not found
npm ci --include=dev
npm run build
npm run build:admin
popd >/dev/null

export NODE_ENV="${NODE_ENV:-production}"

echo "[deploy] 安装后端依赖"
pushd "${release_dir}/server" >/dev/null
npm ci
popd >/dev/null

echo "[deploy] 保留旧版前端静态分包（避免发布中在线用户旧 JS 分包 404）"
storefront_build_dirs=()
admin_build_dirs=()
storefront_build_dir="${release_dir}/click-send-shop-main/click-send-shop-main/dist"
admin_build_dir="${release_dir}/click-send-shop-main/click-send-shop-main/admin-dist"
collect_previous_build_dirs "${storefront_build_dir}" storefront_build_dirs
collect_previous_build_dirs "${admin_build_dir}" admin_build_dirs
preserve_previous_build_artifacts "${storefront_build_dir}" "${storefront_build_dirs[@]}"
preserve_previous_build_artifacts "${admin_build_dir}" "${admin_build_dirs[@]}"

echo "[deploy] 校验前端入口 HTML 引用的 assets 是否存在（防止 index 引用旧 hash 导致 404 白屏）"
node "${release_dir}/deploy/release/verify-frontend-assets.mjs" "${storefront_build_dir}" "index.html"
node "${release_dir}/deploy/release/verify-frontend-assets.mjs" "${admin_build_dir}" "admin-index.html"

echo "[deploy] 切换 current 软链（原子操作）"
ln -sfnT "${release_dir}" "${current_link}"
ln -sfnT "${release_dir}/click-send-shop-main/click-send-shop-main/dist" "${dist_link}"
ln -sfnT "${release_dir}/click-send-shop-main/click-send-shop-main/admin-dist" "${admin_dist_link}"

echo "[deploy] 重启后端（自动探测：pm2 > systemd）"
restart_done="0"
if command -v pm2 >/dev/null 2>&1; then
  pushd "${release_dir}/server" >/dev/null
  pm2_app="${PM2_APP_NAME:-gc-api}"
  if [[ -f "ecosystem.config.cjs" ]]; then
    pm2 delete "${pm2_app}" >/dev/null 2>&1 || true
    pm2 start ecosystem.config.cjs --only "${pm2_app}" --env production
  else
    pm2 restart "${pm2_app}" --update-env
  fi
  pm2 save
  popd >/dev/null
  restart_done="1"
fi

if [[ "${restart_done}" == "0" ]] && command -v systemctl >/dev/null 2>&1; then
  if [[ -z "${SYSTEMD_SERVICE}" ]]; then
    # 尝试猜测服务名（尽量保守）
    SYSTEMD_SERVICE="$(systemctl list-units --type=service --all --no-pager | awk '{print $1}' | grep -Ei 'damatong|shop_api|cursor' | head -n 1 || true)"
  fi
  if [[ -n "${SYSTEMD_SERVICE}" ]]; then
    sudo systemctl restart "${SYSTEMD_SERVICE}"
    restart_done="1"
  fi
fi

if [[ "${restart_done}" == "0" ]]; then
  echo "[deploy] 未检测到 pm2/systemd 自动重启方式，请你手动重启后端服务。"
fi

echo "[deploy] 健康检查"
bash "${release_dir}/deploy/release/healthcheck.sh"

echo "[deploy] Cloudflare 缓存清理（若已配置 CF_API_TOKEN / CF_ZONE_ID）"
cf_env_file="${DEPLOY_BASE}/shared/server.env"
[[ -f "${cf_env_file}" ]] || cf_env_file="${release_dir}/server/.env"
cf_purge_out="$(CF_ENV_FILE="${cf_env_file}" bash "${release_dir}/deploy/purge-cloudflare-cache.sh" 2>&1)" || true
printf '%s\n' "${cf_purge_out}"
if printf '%s' "${cf_purge_out}" | grep -q 'skip: missing CF_API_TOKEN'; then
  echo "[deploy] 发版后请手动 Purge：Cloudflare → damatong.net → Caching → Configuration → Purge Everything"
  echo "[deploy] 清单：deploy/release/POST-RELEASE-CHECKLIST.md"
fi

echo "[deploy] 清理旧 release（保留 ${KEEP_RELEASES} 个）"
if [[ "${KEEP_RELEASES}" =~ ^[0-9]+$ ]] && (( KEEP_RELEASES > 0 )); then
  mapfile -t all_releases < <(ls -1dt "${releases_dir}"/* 2>/dev/null || true)
  if (( ${#all_releases[@]} > KEEP_RELEASES )); then
    to_delete=("${all_releases[@]:KEEP_RELEASES}")
    for d in "${to_delete[@]}"; do
      # 避免删到 current
      if [[ -L "${current_link}" ]] && [[ "$(readlink -f "${current_link}")" == "$(readlink -f "${d}")" ]]; then
        continue
      fi
      rm -rf "${d}"
    done
  fi
fi

echo "[deploy] 完成：${release_id}"

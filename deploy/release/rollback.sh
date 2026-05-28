#!/usr/bin/env bash
set -euo pipefail

DEPLOY_BASE="${DEPLOY_BASE:-/var/www/damatong}"
KEEP_RELEASES="${KEEP_RELEASES:-5}"

releases_dir="${DEPLOY_BASE}/releases"
current_link="${DEPLOY_BASE}/current"
dist_link="${DEPLOY_BASE}/dist"
admin_dist_link="${DEPLOY_BASE}/admin-dist"

if [[ ! -d "${releases_dir}" ]]; then
  echo "[rollback] releases 目录不存在：${releases_dir}"
  exit 1
fi

current_target=""
if [[ -L "${current_link}" ]]; then
  current_target="$(readlink -f "${current_link}" || true)"
fi

mapfile -t releases < <(ls -1dt "${releases_dir}"/* 2>/dev/null || true)
if [[ "${#releases[@]}" -lt 2 ]]; then
  echo "[rollback] 可用 release 不足 2 个，无法回滚"
  exit 1
fi

next="${releases[1]}"
echo "[rollback] 当前：${current_target:-<none>}"
echo "[rollback] 回滚到：${next}"

ln -sfnT "${next}" "${current_link}"
if [[ -d "${next}/click-send-shop-main/click-send-shop-main/dist" ]]; then
  ln -sfnT "${next}/click-send-shop-main/click-send-shop-main/dist" "${dist_link}"
fi
if [[ -d "${next}/click-send-shop-main/click-send-shop-main/admin-dist" ]]; then
  ln -sfnT "${next}/click-send-shop-main/click-send-shop-main/admin-dist" "${admin_dist_link}"
fi

echo "[rollback] 已切换软链，建议重启后端进程并做健康检查"

# 清理旧版本（可选）
if [[ "${KEEP_RELEASES}" =~ ^[0-9]+$ ]] && (( KEEP_RELEASES > 0 )); then
  mapfile -t all_releases < <(ls -1dt "${releases_dir}"/* 2>/dev/null || true)
  if (( ${#all_releases[@]} > KEEP_RELEASES )); then
    to_delete=("${all_releases[@]:KEEP_RELEASES}")
    echo "[rollback] 清理旧 release（保留 ${KEEP_RELEASES} 个）"
    for d in "${to_delete[@]}"; do
      # 避免删到 current
      if [[ -n "${current_link}" && -L "${current_link}" ]] && [[ "$(readlink -f "${current_link}")" == "$(readlink -f "${d}")" ]]; then
        continue
      fi
      rm -rf "${d}"
    done
  fi
fi


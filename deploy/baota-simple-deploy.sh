#!/usr/bin/env bash
# 统一路径：默认仅使用 /var/www/click-send-shop
# 新部署请使用：deploy/production-deploy.sh
set -euo pipefail
if [[ "${ALLOW_LEGACY_DEPLOY_WRAPPERS:-0}" != "1" ]]; then
  echo "[DEPRECATED] deploy/baota-simple-deploy.sh 已废弃，默认禁止执行。"
  echo "请改用: deploy/production-deploy.sh"
  echo "如确需兼容旧计划任务，临时执行: ALLOW_LEGACY_DEPLOY_WRAPPERS=1 bash deploy/baota-simple-deploy.sh"
  exit 2
fi
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export PROJECT_DIR="${PROJECT_DIR:-/var/www/click-send-shop}"
exec "$ROOT/production-deploy.sh" "$@"

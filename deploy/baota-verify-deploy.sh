#!/usr/bin/env bash
# 兼容旧名：未设置 PROJECT_DIR 时使用历史宝塔目录
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export PROJECT_DIR="${PROJECT_DIR:-/www/wwwroot/cursor-zhenyanwang001}"
exec "$ROOT/verify-post-deploy.sh" "$@"

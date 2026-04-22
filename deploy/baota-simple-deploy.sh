#!/usr/bin/env bash
# 兼容旧路径：未设置 PROJECT_DIR 时仍使用历史宝塔目录，避免计划任务断裂。
# 新部署请使用：deploy/production-deploy.sh（默认 /var/www/click-send-shop）
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export PROJECT_DIR="${PROJECT_DIR:-/www/wwwroot/cursor-zhenyanwang001}"
exec "$ROOT/production-deploy.sh" "$@"

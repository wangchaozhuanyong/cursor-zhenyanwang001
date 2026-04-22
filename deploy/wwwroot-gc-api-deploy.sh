#!/usr/bin/env bash
#
# 兼容旧宝塔计划任务路径；未设置 PROJECT_DIR 时仍指向历史目录
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export PROJECT_DIR="${PROJECT_DIR:-/www/wwwroot/cursor-zhenyanwang001}"
exec bash "$ROOT/deploy/production-deploy.sh" "$@"

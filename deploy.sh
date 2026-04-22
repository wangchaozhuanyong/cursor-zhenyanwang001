#!/usr/bin/env bash
# 入口：在仓库根目录执行  bash deploy.sh
# 实际逻辑见 deploy/deploy-wwwroot.sh（含前端构建、迁移、pm2、健康检查）
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec "$ROOT/deploy/deploy-wwwroot.sh" "$@"

#!/usr/bin/env bash
#
# 部署前自检（在 Linux 服务器、项目根目录执行）
#   bash deploy/preflight.sh
#
# 环境变量（与 production-deploy.sh 一致）：
#   PROJECT_DIR     默认 /var/www/click-send-shop
#   FRONTEND_SUB    默认 click-send-shop-main/click-send-shop-main
#
set -euo pipefail

PROJECT_DIR="${PROJECT_DIR:-/var/www/click-send-shop}"
FRONTEND_SUB="${FRONTEND_SUB:-click-send-shop-main/click-send-shop-main}"
FRONTEND_DIR="$PROJECT_DIR/$FRONTEND_SUB"
BACKEND_DIR="$PROJECT_DIR/server"
MIN_NODE_MAJOR="${MIN_NODE_MAJOR:-20}"

fail=0
err() { echo "❌ $1"; fail=1; }

echo "==== deploy preflight ===="
echo "PROJECT_DIR=$PROJECT_DIR"

command -v node >/dev/null 2>&1 || err "未找到 node"
command -v npm >/dev/null 2>&1 || err "未找到 npm"
command -v pm2 >/dev/null 2>&1 || err "未找到 pm2（生产需 npm i -g pm2）"

if command -v node >/dev/null 2>&1; then
  major=$(node -p "parseInt(process.versions.node.split('.')[0],10)")
  echo "ℹ️  Node $(node -v)（要求 major >= $MIN_NODE_MAJOR）"
  if [[ "$major" -lt "$MIN_NODE_MAJOR" ]]; then
    err "Node 主版本过低，请升级到 ${MIN_NODE_MAJOR}+（与文档一致）"
  fi
fi

[[ -d "$BACKEND_DIR" ]] || err "缺少后端目录: $BACKEND_DIR"
[[ -f "$BACKEND_DIR/package.json" ]] || err "缺少 $BACKEND_DIR/package.json"
[[ -d "$FRONTEND_DIR" ]] || err "缺少前端目录: $FRONTEND_DIR"
[[ -f "$FRONTEND_DIR/package.json" ]] || err "缺少 $FRONTEND_DIR/package.json"
[[ -f "$BACKEND_DIR/.env" ]] || err "缺少 $BACKEND_DIR/.env（从 .env.example 复制并填写）"

if [[ -f "$BACKEND_DIR/.env" ]]; then
  if ! grep -qE '^DB_USER=' "$BACKEND_DIR/.env"; then
    err ".env 缺少 DB_USER"
  else
    dbu=$(grep -E '^DB_USER=' "$BACKEND_DIR/.env" | cut -d= -f2-)
    if [[ "$dbu" == "root" ]]; then
      err "生产环境禁止使用 DB_USER=root"
    fi
  fi
fi

if [[ "${SKIP_GIT:-0}" != "1" ]] && [[ ! -d "$PROJECT_DIR/.git" ]]; then
  err "PROJECT_DIR 不是 git 仓库（无 .git）。请使用 git clone 部署，或设置 SKIP_GIT=1 跳过拉代码（需已手动同步文件）。"
fi

if [[ "$fail" -ne 0 ]]; then
  echo
  echo "preflight 未通过，请先修正上述项后再部署。"
  exit 1
fi

echo "✅ preflight 通过"
exit 0

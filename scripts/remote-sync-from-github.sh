#!/usr/bin/env bash
#
# 在 Linux 生产机上执行：从 GitHub 浅克隆指定分支，rsync 合并到现网目录后跑标准部署。
# 适用：/var/www/... 下没有完整 .git、或需与远端 main 强制对齐，同时保留本机 .env / 依赖 / 日志 / 上传目录。
#
# 用法（在服务器上）：
#   bash scripts/remote-sync-from-github.sh
#   TARGET=/var/www/click-send-shop REPO_URL=https://github.com/org/repo.git BRANCH=main bash scripts/remote-sync-from-github.sh
#
# 环境变量：
#   TARGET          现网项目根（默认 /var/www/click-send-shop）
#   REPO_URL        Git 仓库 HTTPS/SSH（默认本仓库公开地址）
#   BRANCH          分支（默认 main）
#   SKIP_DEPLOY     设为 1 时只同步文件，不执行 deploy/production-deploy.sh
#
set -euo pipefail

TARGET="${TARGET:-/var/www/click-send-shop}"
REPO_URL="${REPO_URL:-https://github.com/wangchaozhuanyong/cursor-zhenyanwang001.git}"
BRANCH="${BRANCH:-main}"
SKIP_DEPLOY="${SKIP_DEPLOY:-0}"

TMP="${TMP:-/tmp/shop-github-sync-$$}"
trap 'rm -rf "${TMP:-}"' EXIT

mkdir -p "$TARGET"

echo "=========================================="
echo "remote-sync-from-github"
echo "TARGET=$TARGET"
echo "REPO_URL=$REPO_URL"
echo "BRANCH=$BRANCH"
echo "=========================================="

rm -rf "$TMP"
git clone --depth 1 -b "$BRANCH" "$REPO_URL" "$TMP"

if [[ ! -f "$TMP/deploy/production-deploy.sh" ]]; then
  echo "❌ 克隆内缺少 deploy/production-deploy.sh，请检查 REPO_URL / BRANCH"
  exit 1
fi

rsync -a --delete \
  --exclude 'artifacts/' \
  --exclude 'full-project/' \
  --exclude 'server/.env' \
  --exclude 'server/node_modules/' \
  --exclude 'server/logs/' \
  "$TMP/" "$TARGET/"

chmod 600 "$TARGET/server/.env" 2>/dev/null || true

if [[ "$SKIP_DEPLOY" == "1" ]]; then
  echo "SKIP_DEPLOY=1，已同步到 $TARGET，跳过 production-deploy"
  exit 0
fi

PROJECT_DIR="$TARGET" bash "$TARGET/deploy/production-deploy.sh"

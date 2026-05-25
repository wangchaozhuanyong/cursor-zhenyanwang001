#!/usr/bin/env bash
# 生产机若 origin 仍为 HTTPS，在存在 ~/.ssh 中 github.com deploy key 时自动改为 SSH，避免 git fetch 交互失败。
set -euo pipefail

PROJECT_DIR="${PROJECT_DIR:-/var/www/click-send-shop}"
cd "$PROJECT_DIR"

url="$(git remote get-url origin 2>/dev/null || true)"
if [[ "$url" != https://github.com/* && "$url" != http://github.com/* ]]; then
  exit 0
fi

if [[ ! -f "$HOME/.ssh/id_ed25519_github_deploy" && ! -f "$HOME/.ssh/id_rsa_github_deploy" ]]; then
  echo "⚠️  origin 为 HTTPS 但未找到 GitHub deploy 私钥，请配置 ~/.ssh 或手动 git remote set-url" >&2
  exit 0
fi

repo="${url#https://github.com/}"
repo="${repo#http://github.com/}"
repo="${repo%.git}"
git remote set-url origin "git@github.com:${repo}.git"
echo "✅ 已将 origin 切换为 SSH: git@github.com:${repo}.git"

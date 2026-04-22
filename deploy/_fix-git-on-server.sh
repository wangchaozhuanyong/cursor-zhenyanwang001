#!/usr/bin/env bash
# One-off: replace corrupted .git with fresh shallow clone (same remote URL)
set -euo pipefail
TS=$(date +%s)
PROJECT=/var/www/click-send-shop
cd "$PROJECT"
[[ -f server/.env ]] && echo "OK: server/.env present (gitignored, safe)"

mv .git ".git.broken.${TS}"
git clone --depth 1 https://github.com/wangchaozhuanyong/cursor-zhenyanwang001.git "/tmp/cs-git-${TS}"
mv "/tmp/cs-git-${TS}/.git" .
rm -rf "/tmp/cs-git-${TS}"
git reset --hard origin/main
echo "HEAD=$(git rev-parse --short HEAD) $(git log -1 --oneline)"
echo "GIT_FIX_OK"

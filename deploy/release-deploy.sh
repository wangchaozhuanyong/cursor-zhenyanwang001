#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="${PROJECT_DIR:-/var/www/click-send-shop}"
PM2_APP="${PM2_APP:-gc-api}"
GIT_BRANCH="${GIT_BRANCH:-release/prod}"
AUTO_ROLLBACK="${AUTO_ROLLBACK:-1}"

cd "$PROJECT_DIR"

echo "[release-deploy] project: $PROJECT_DIR"
echo "[release-deploy] branch : $GIT_BRANCH"
echo "[release-deploy] pm2 app: $PM2_APP"

PROJECT_DIR="$PROJECT_DIR" \
PM2_APP="$PM2_APP" \
GIT_BRANCH="$GIT_BRANCH" \
AUTO_ROLLBACK="$AUTO_ROLLBACK" \
bash "$PROJECT_DIR/deploy/ci-deploy.sh"


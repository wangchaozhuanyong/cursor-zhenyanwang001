#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="${PROJECT_DIR:-/var/www/click-send-shop}"
PM2_APP="${PM2_APP:-gc-api}"
GIT_BRANCH="${GIT_BRANCH:-main}"
GIT_COMMIT="${GIT_COMMIT:-${DEPLOY_TARGET_SHA:-}}"
AUTO_ROLLBACK="${AUTO_ROLLBACK:-1}"
BUILD_FRONTEND_ON_SERVER="${BUILD_FRONTEND_ON_SERVER:-0}"
BACKUP_BEFORE_DEPLOY="${BACKUP_BEFORE_DEPLOY:-1}"

cd "$PROJECT_DIR"

echo "[release-deploy] project: $PROJECT_DIR"
echo "[release-deploy] branch : $GIT_BRANCH"
echo "[release-deploy] commit : ${GIT_COMMIT:-branch-tip}"
echo "[release-deploy] pm2 app: $PM2_APP"
echo "[release-deploy] build frontend on server: $BUILD_FRONTEND_ON_SERVER"

PROJECT_DIR="$PROJECT_DIR" \
PM2_APP="$PM2_APP" \
GIT_BRANCH="$GIT_BRANCH" \
GIT_COMMIT="$GIT_COMMIT" \
AUTO_ROLLBACK="$AUTO_ROLLBACK" \
BUILD_FRONTEND_ON_SERVER="$BUILD_FRONTEND_ON_SERVER" \
BACKUP_BEFORE_DEPLOY="$BACKUP_BEFORE_DEPLOY" \
bash "$PROJECT_DIR/deploy/ci-deploy.sh"

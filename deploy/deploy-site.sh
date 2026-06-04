#!/usr/bin/env bash
set -euo pipefail

SITE="${1:-}"
if [[ -z "$SITE" ]]; then
  echo "Usage: $0 <site-code-file-name>"
  echo "Example: $0 site-a"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/sites/$SITE.env"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "Site env not found: $ENV_FILE"
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

: "${SITE_CODE:?SITE_CODE is required}"
: "${PROJECT_DIR:?PROJECT_DIR is required}"
: "${PM2_APP:?PM2_APP is required}"
: "${PORT:?PORT is required}"
: "${HEALTH_PORT:?HEALTH_PORT is required}"
: "${PUBLIC_FRONTEND:?PUBLIC_FRONTEND is required}"
: "${GIT_BRANCH:?GIT_BRANCH is required}"

echo "==> Deploying $SITE_CODE from $GIT_BRANCH"
cd "$PROJECT_DIR"

git fetch origin "$GIT_BRANCH"
TARGET_COMMIT=$(git rev-parse "origin/$GIT_BRANCH^{commit}")
CURRENT_COMMIT=$(git rev-parse HEAD 2>/dev/null || true)
if [[ "${ALLOW_OLD_DEPLOY:-0}" != "1" && -n "$CURRENT_COMMIT" && "$TARGET_COMMIT" != "$CURRENT_COMMIT" ]]; then
  if ! git merge-base --is-ancestor "$CURRENT_COMMIT" "$TARGET_COMMIT"; then
    echo "Refusing old/divergent deploy: origin/$GIT_BRANCH does not contain current HEAD."
    echo "Use ALLOW_OLD_DEPLOY=1 only for a documented rollback/break-glass run."
    exit 1
  fi
fi
git reset --hard "$TARGET_COMMIT"

echo "==> Installing backend dependencies"
cd "$PROJECT_DIR/server"
npm ci

echo "==> Checking database connection"
node -e "require('dotenv').config(); const db=require('./src/config/db'); db.query('SELECT 1').then(()=>{console.log('DB OK'); process.exit(0)}).catch((e)=>{console.error(e); process.exit(1)})"

echo "==> Running migrations and schema verification"
npm run migrate
npm run verify-schema

echo "==> Building frontend"
FRONTEND_DIR="$PROJECT_DIR/click-send-shop-main/click-send-shop-main"
cd "$FRONTEND_DIR"
npm ci
npm run build

echo "==> Syncing frontend dist"
mkdir -p "$PUBLIC_FRONTEND"
if [[ -d "$FRONTEND_DIR/dist/assets" ]]; then
  mkdir -p "$PUBLIC_FRONTEND/assets"
  rsync -a "$FRONTEND_DIR/dist/assets/" "$PUBLIC_FRONTEND/assets/"
fi
for file in "$FRONTEND_DIR"/dist/workbox-*.js; do
  [[ -f "$file" ]] && cp -a "$file" "$PUBLIC_FRONTEND/"
done
rsync -a --delete --exclude='/assets/' --exclude='/workbox-*.js' "$FRONTEND_DIR/dist/" "$PUBLIC_FRONTEND/"
node "$PROJECT_DIR/scripts/verify_frontend_dist_assets.js" "$FRONTEND_DIR/dist"
node "$PROJECT_DIR/scripts/verify_frontend_dist_assets.js" "$PUBLIC_FRONTEND"

echo "==> Reloading PM2 app $PM2_APP"
cd "$PROJECT_DIR/server"
pm2 reload "$PM2_APP" --update-env

echo "==> Health check"
curl -fsS "http://127.0.0.1:${HEALTH_PORT}/api/health/live" >/dev/null

echo "==> Recording deploy state"
mkdir -p "$PROJECT_DIR/.deploy-state"
git -C "$PROJECT_DIR" rev-parse HEAD > "$PROJECT_DIR/.deploy-state/current-version.txt"

echo "Deploy complete: $SITE_CODE $(cat "$PROJECT_DIR/.deploy-state/current-version.txt")"

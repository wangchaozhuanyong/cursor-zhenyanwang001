#!/usr/bin/env bash
# Production update: pull + npm install + migrate + frontend build + pm2 reload
# Does NOT: change nginx, change .env, change deploy path
set -euo pipefail

PROJECT_DIR="${PROJECT_DIR:-/var/www/click-send-shop}"
PM2_APP="${PM2_APP:-gc-api}"
FRONTEND_SUB="${FRONTEND_SUB:-click-send-shop-main/click-send-shop-main}"
LOG="${LOG:-/tmp/prod-update-$(date +%Y%m%d-%H%M%S).log}"

exec > >(tee -a "$LOG") 2>&1

echo "=========================================="
echo "PROD UPDATE  $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "PROJECT_DIR=$PROJECT_DIR"
echo "LOG=$LOG"
echo "=========================================="

cd "$PROJECT_DIR"

echo ""
echo "=== 1) Git: fetch + pull (ff-only) ==="
git fetch origin main
# Preserve local server-only edits (e.g. ecosystem) across pull
STASHED=0
if ! git diff --quiet server/ecosystem.config.cjs 2>/dev/null; then
  echo "Stashing server/ecosystem.config.cjs (local prod tweaks)..."
  git stash push -m "prod-update-ecosystem-$(date +%s)" -- server/ecosystem.config.cjs
  STASHED=1
fi
if git pull --ff-only origin main; then
  echo "git pull --ff-only: OK"
else
  echo "FF-only failed; aborting (needs manual merge)."
  if [[ "$STASHED" == "1" ]]; then git stash pop || true; fi
  exit 1
fi
if [[ "$STASHED" == "1" ]]; then
  echo "Restoring stashed ecosystem.config.cjs..."
  git stash pop || { echo "stash pop conflict - resolve manually"; exit 1; }
fi

COMMIT=$(git rev-parse --short HEAD)
echo "HEAD=$COMMIT"

echo ""
echo "=== 2) Root npm install (skip if no package.json) ==="
if [[ -f package.json ]]; then
  npm install --no-audit --fund=false
else
  echo "No package.json at repo root - skip."
fi

echo ""
echo "=== 3) Frontend: npm install + build + sync to public-frontend ==="
if [[ ! -d "$PROJECT_DIR/$FRONTEND_SUB" ]]; then
  echo "No frontend dir $FRONTEND_SUB - skip."
else
  cd "$PROJECT_DIR/$FRONTEND_SUB"
  npm install --no-audit --fund=false
  npm run build
  cd "$PROJECT_DIR"
  mkdir -p "$PROJECT_DIR/public-frontend"
  if command -v rsync >/dev/null 2>&1; then
    rsync -a --delete "$PROJECT_DIR/$FRONTEND_SUB/dist/" "$PROJECT_DIR/public-frontend/"
  else
    rm -rf "${PROJECT_DIR:?}/public-frontend/"*
    cp -a "$PROJECT_DIR/$FRONTEND_SUB/dist/." "$PROJECT_DIR/public-frontend/"
  fi
  echo "public-frontend synced."
fi

echo ""
echo "=== 4) Backend: npm install + DB migrate ==="
cd "$PROJECT_DIR/server"
npm install --no-audit --fund=false
npm run migrate

echo ""
echo "=== 5) PM2 reload (zero-downtime cluster reload for fork = graceful restart) ==="
pm2 reload "$PM2_APP" --update-env
sleep 2
pm2 status

echo ""
echo "=== 6) Health checks ==="
LIVE=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:3001/api/health/live" --max-time 5 || echo 000)
READY=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:3001/api/health/ready" --max-time 5 || echo 000)
PUB=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1/" -H "Host: 13.214.165.214" --max-time 5 || echo 000)
echo "GET /api/health/live  -> $LIVE"
echo "GET /api/health/ready -> $READY"
echo "GET / (localhost nginx) -> $PUB"
curl -s "http://127.0.0.1:3001/api/health/ready" --max-time 5 | head -c 300
echo

if [[ "$LIVE" == "200" && "$READY" == "200" ]]; then
  echo ""
  echo "=========================================="
  echo "RESULT: SUCCESS"
  echo "HEAD=$COMMIT"
  echo "Log: $LOG"
  echo "=========================================="
  exit 0
fi

echo ""
echo "=========================================="
echo "RESULT: FAILURE (health not 200)"
echo "HEAD=$COMMIT"
echo "Log: $LOG"
echo "=========================================="
exit 1

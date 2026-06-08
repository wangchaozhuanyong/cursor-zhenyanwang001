#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FRONTEND_DIR="$ROOT_DIR/click-send-shop-main/click-send-shop-main"
SERVER_DIR="$ROOT_DIR/server"
PORT="${PORT:-5174}"
API_PORT="${API_PORT:-3000}"
FRONTEND_SESSION="${FRONTEND_SESSION:-zhenyan-frontend-5174}"
SERVER_SESSION="${SERVER_SESSION:-zhenyan-local-server-3000}"
NPM_BIN="${NPM_BIN:-npm}"
NODE_BIN="${NODE_BIN:-node}"
NPM_CI_FLAGS="${NPM_CI_FLAGS:---ignore-scripts}"

usage() {
  cat <<USAGE
Usage:
  bash scripts/use-5174-test.sh [branch ...]

Purpose:
  Keep one local test URL only: http://127.0.0.1:${PORT}
  Merge committed branch work into the current candidate worktree, then restart
  the local frontend/backend used by that URL.

Notes:
  - Branches must already be committed.
  - This script does not push to GitHub and does not deploy production.
  - If merge conflicts happen, resolve them manually before testing.
USAGE
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

cd "$ROOT_DIR"

if ! command -v "$NPM_BIN" >/dev/null 2>&1; then
  echo "Cannot find npm. Set NPM_BIN=/path/to/npm or add npm to PATH."
  exit 1
fi
if ! command -v "$NODE_BIN" >/dev/null 2>&1; then
  echo "Cannot find node. Set NODE_BIN=/path/to/node or add node to PATH."
  exit 1
fi

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Refusing to continue: worktree has uncommitted changes."
  git status --short
  exit 1
fi

current_branch="$(git rev-parse --abbrev-ref HEAD)"
echo "[5174] candidate worktree: $ROOT_DIR"
echo "[5174] current branch: $current_branch"

for branch in "$@"; do
  if ! git rev-parse --verify "$branch" >/dev/null 2>&1; then
    echo "Unknown branch or ref: $branch"
    exit 1
  fi
  echo "[5174] merging $branch into $current_branch"
  git merge --no-ff --no-edit "$branch"
done

if [[ ! -f "$SERVER_DIR/.env" ]]; then
  echo "Missing $SERVER_DIR/.env. Copy local development .env before starting 5174."
  exit 1
fi

if [[ ! -d "$FRONTEND_DIR/node_modules" ]]; then
  echo "[5174] installing frontend dependencies"
  (cd "$FRONTEND_DIR" && "$NPM_BIN" ci $NPM_CI_FLAGS)
fi

if [[ ! -d "$SERVER_DIR/node_modules" ]]; then
  echo "[5174] installing server dependencies"
  (cd "$SERVER_DIR" && "$NPM_BIN" ci $NPM_CI_FLAGS)
fi

screen -S "$FRONTEND_SESSION" -X quit >/dev/null 2>&1 || true
screen -S "$SERVER_SESSION" -X quit >/dev/null 2>&1 || true

existing_frontend_pids="$(lsof -tiTCP:"$PORT" -sTCP:LISTEN 2>/dev/null || true)"
if [[ -n "$existing_frontend_pids" ]]; then
  kill $existing_frontend_pids >/dev/null 2>&1 || true
fi

existing_api_pids="$(lsof -tiTCP:"$API_PORT" -sTCP:LISTEN 2>/dev/null || true)"
if [[ -n "$existing_api_pids" ]]; then
  kill $existing_api_pids >/dev/null 2>&1 || true
fi

screen -dmS "$SERVER_SESSION" bash -lc "cd '$SERVER_DIR' && '$NODE_BIN' -r tsx/cjs src/index.js >> /tmp/${SERVER_SESSION}.log 2>&1"
screen -dmS "$FRONTEND_SESSION" bash -lc "cd '$FRONTEND_DIR' && '$NODE_BIN' node_modules/vite/bin/vite.js --host 127.0.0.1 --port '$PORT' --strictPort >> /tmp/${FRONTEND_SESSION}.log 2>&1"

echo "[5174] waiting for services"
for _ in {1..30}; do
  if curl -fsS "http://127.0.0.1:${API_PORT}/api/health/ready" >/dev/null 2>&1 \
    && curl -fsS "http://127.0.0.1:${PORT}/" >/dev/null 2>&1; then
    echo "[5174] ready: http://127.0.0.1:${PORT}"
    exit 0
  fi
  sleep 1
done

echo "[5174] services did not become ready in time."
echo "[5174] frontend log: /tmp/${FRONTEND_SESSION}.log"
echo "[5174] server log: /tmp/${SERVER_SESSION}.log"
exit 1

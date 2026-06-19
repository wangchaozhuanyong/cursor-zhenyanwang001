#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FRONTEND_DIR="$ROOT_DIR/click-send-shop-main/click-send-shop-main"
SERVER_DIR="$ROOT_DIR/server"
PORT="${PORT:-5174}"
API_PORT="${API_PORT:-3100}"
FRONTEND_SESSION="${FRONTEND_SESSION:-zhenyan-frontend-5174}"
DEFAULT_SERVER_SESSION="zhenyan-local-server-${API_PORT}"
SERVER_SESSION="${SERVER_SESSION:-$DEFAULT_SERVER_SESSION}"
SERVER_ENV_FILE="${SERVER_ENV_FILE:-}"
NPM_BIN="${NPM_BIN:-npm}"
NODE_BIN="${NODE_BIN:-node}"
NPM_CI_FLAGS="${NPM_CI_FLAGS:---ignore-scripts}"
SKIP_FRONTEND_BUILD="${SKIP_FRONTEND_BUILD:-0}"
LOCAL_NODE_DIR="$ROOT_DIR/.codex-tmp/native-node"

usage() {
  cat <<USAGE
Usage:
  bash scripts/use-5174-test.sh [branch ...]

Purpose:
  Keep one local test URL only: http://127.0.0.1:${PORT}
  Merge committed branch work into the current candidate worktree, then restart
  the local frontend/backend used by that URL. The frontend is served from a
  production build preview by default, so 5174 behaves closer to production and
  avoids slow Vite development-module loading.

Notes:
  - Branches must already be committed.
  - This script does not push to GitHub and does not deploy production.
  - If merge conflicts happen, resolve them manually before testing.
  - Set SKIP_FRONTEND_BUILD=1 only when dist is already current.
  - API_PORT defaults to ${API_PORT} to avoid colliding with other local projects.
  - SERVER_ENV_FILE can point to a local env file; if server/.env is absent,
    server/.env.test is used when present.
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

prepare_local_node() {
  local source_node="$1"
  local local_node="$LOCAL_NODE_DIR/node"
  mkdir -p "$LOCAL_NODE_DIR"
  if [[ ! -x "$local_node" ]] || ! cmp -s "$source_node" "$local_node"; then
    cp "$source_node" "$local_node"
    codesign --remove-signature "$local_node" >/dev/null 2>&1 || true
    codesign --force --sign - "$local_node" >/dev/null 2>&1 || true
    chmod +x "$local_node"
  fi
  printf "%s" "$local_node"
}

pid_cwd() {
  local pid="$1"
  lsof -a -p "$pid" -d cwd -Fn 2>/dev/null | sed -n 's/^n//p' | head -n 1
}

kill_project_port_listeners() {
  local port="$1"
  local expected_root="$2"
  local label="$3"
  local pids
  pids="$(lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)"
  if [[ -z "$pids" ]]; then
    return
  fi

  local allowed_pids=()
  local pid
  for pid in $pids; do
    local cwd
    cwd="$(pid_cwd "$pid")"
    if [[ "$cwd" == "$expected_root"* ]]; then
      allowed_pids+=("$pid")
    else
      echo "Refusing to kill $label listener on port $port: pid $pid belongs to ${cwd:-unknown cwd}."
      echo "Set a different PORT/API_PORT or stop that process yourself."
      exit 1
    fi
  done

  if [[ "${#allowed_pids[@]}" -gt 0 ]]; then
    kill "${allowed_pids[@]}" >/dev/null 2>&1 || true
  fi
}

NODE_BIN="$(prepare_local_node "$(command -v "$NODE_BIN")")"

current_branch="$(git rev-parse --abbrev-ref HEAD)"
echo "[5174] candidate worktree: $ROOT_DIR"
echo "[5174] current branch: $current_branch"

if [[ "$#" -gt 0 && -n "$(git status --porcelain)" ]]; then
  echo "Refusing to merge branches: worktree has uncommitted changes."
  git status --short
  exit 1
fi

for branch in "$@"; do
  if ! git rev-parse --verify "$branch" >/dev/null 2>&1; then
    echo "Unknown branch or ref: $branch"
    exit 1
  fi
  echo "[5174] merging $branch into $current_branch"
  git merge --no-ff --no-edit "$branch"
done

if [[ -z "$SERVER_ENV_FILE" && ! -f "$SERVER_DIR/.env" && -f "$SERVER_DIR/.env.test" ]]; then
  SERVER_ENV_FILE="$SERVER_DIR/.env.test"
fi

if [[ ! -f "$SERVER_DIR/.env" && -z "$SERVER_ENV_FILE" ]]; then
  echo "Missing $SERVER_DIR/.env. Set SERVER_ENV_FILE=/path/to/local.env before starting 5174."
  exit 1
fi

if [[ -n "$SERVER_ENV_FILE" && ! -f "$SERVER_ENV_FILE" ]]; then
  echo "SERVER_ENV_FILE not found: $SERVER_ENV_FILE"
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

if [[ "$SKIP_FRONTEND_BUILD" != "1" ]]; then
  echo "[5174] building production frontend for preview"
  (cd "$FRONTEND_DIR" && "$NODE_BIN" node_modules/vite/bin/vite.js build)
fi

screen -S "$FRONTEND_SESSION" -X quit >/dev/null 2>&1 || true
screen -S "$SERVER_SESSION" -X quit >/dev/null 2>&1 || true

kill_project_port_listeners "$PORT" "$FRONTEND_DIR" "frontend"
kill_project_port_listeners "$API_PORT" "$SERVER_DIR" "API"

server_env_source=""
if [[ -n "$SERVER_ENV_FILE" ]]; then
  server_env_source="set -a; source '$SERVER_ENV_FILE'; set +a;"
fi

screen -dmS "$SERVER_SESSION" bash -lc "cd '$SERVER_DIR' && $server_env_source PORT='$API_PORT' PUBLIC_APP_URL='http://127.0.0.1:$PORT' CORS_ORIGINS='http://127.0.0.1:$PORT,http://127.0.0.1:$API_PORT' ADMIN_ALLOWED_ORIGINS='http://127.0.0.1:$PORT,http://127.0.0.1:$API_PORT' '$NODE_BIN' -r tsx/cjs src/index.js >> /tmp/${SERVER_SESSION}.log 2>&1"
screen -dmS "$FRONTEND_SESSION" bash -lc "cd '$FRONTEND_DIR' && VITE_DEV_API_PROXY_TARGET='http://127.0.0.1:$API_PORT' '$NODE_BIN' node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port '$PORT' --strictPort >> /tmp/${FRONTEND_SESSION}.log 2>&1"

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

#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
KEY_PATH="${AWS_SSH_KEY_PATH:-/Users/wangchao/Desktop/yamaxunmishi/aws-key.pem}"
SERVER_HOST="${AWS_SERVER_HOST:-13.212.179.213}"
SERVER_USER="${AWS_SERVER_USER:-ubuntu}"
LOCAL_PORT="${AWS_DB_LOCAL_PORT:-3307}"
REMOTE_HOST="${AWS_DB_REMOTE_HOST:-127.0.0.1}"
REMOTE_PORT="${AWS_DB_REMOTE_PORT:-3306}"

if [ ! -f "$KEY_PATH" ]; then
  echo "SSH key not found: $KEY_PATH" >&2
  exit 1
fi

chmod 600 "$KEY_PATH"

if lsof -nP -iTCP:"$LOCAL_PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "AWS DB tunnel is already listening on 127.0.0.1:$LOCAL_PORT"
  exit 0
fi

screen -S zhenyan-aws-db-tunnel -X quit >/dev/null 2>&1 || true
screen -dmS zhenyan-aws-db-tunnel ssh \
  -i "$KEY_PATH" \
  -N \
  -L "127.0.0.1:$LOCAL_PORT:$REMOTE_HOST:$REMOTE_PORT" \
  -o ExitOnForwardFailure=yes \
  -o ServerAliveInterval=30 \
  -o ServerAliveCountMax=3 \
  -o StrictHostKeyChecking=accept-new \
  "$SERVER_USER@$SERVER_HOST"

for _ in {1..30}; do
  if lsof -nP -iTCP:"$LOCAL_PORT" -sTCP:LISTEN >/dev/null 2>&1; then
    echo "AWS DB tunnel ready: 127.0.0.1:$LOCAL_PORT -> $REMOTE_HOST:$REMOTE_PORT via $SERVER_USER@$SERVER_HOST"
    exit 0
  fi
  sleep 1
done

echo "AWS DB tunnel did not become ready" >&2
exit 1

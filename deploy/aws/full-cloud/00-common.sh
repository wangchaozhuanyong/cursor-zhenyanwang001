#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STATE_DIR="$ROOT_DIR/.state"
mkdir -p "$STATE_DIR"

if [[ ! -f "$ROOT_DIR/.env" ]]; then
  echo "[FATAL] Missing $ROOT_DIR/.env. Copy from .env.example first."
  exit 1
fi

set -a
source "$ROOT_DIR/.env"
set +a

AWS_CMD=(aws --region "$AWS_REGION" --profile "$AWS_PROFILE")

require_cmd() {
  local c
  for c in "$@"; do
    command -v "$c" >/dev/null 2>&1 || {
      echo "[FATAL] Required command not found: $c"
      exit 1
    }
  done
}

json_get() {
  local file="$1"
  local query="$2"
  jq -r "$query" "$file"
}

write_state() {
  local file="$1"
  local data="$2"
  printf '%s\n' "$data" >"$STATE_DIR/$file"
}

log() {
  printf '[%s] %s\n' "$(date '+%F %T')" "$*"
}

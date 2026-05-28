#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="${PROJECT_DIR:-$(cd "$SCRIPT_DIR/.." && pwd)}"
CF_ENV_FILE="${CF_ENV_FILE:-$PROJECT_DIR/server/.env}"

if [[ -f "$CF_ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$CF_ENV_FILE"
  set +a
fi

exec python3 "$SCRIPT_DIR/cloudflare_apply_html_bypass.py" "${@:-apply}"

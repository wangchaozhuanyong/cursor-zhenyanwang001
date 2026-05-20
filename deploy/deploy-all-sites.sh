#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

for env_file in "$SCRIPT_DIR"/sites/*.env; do
  site="$(basename "$env_file" .env)"
  echo "=============================="
  echo "Deploying $site"
  echo "=============================="
  "$SCRIPT_DIR/deploy-site.sh" "$site"
done

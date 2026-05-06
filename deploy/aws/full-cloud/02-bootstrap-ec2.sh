#!/usr/bin/env bash
set -euo pipefail
source "$(cd "$(dirname "$0")" && pwd)/00-common.sh"

require_cmd jq ssh scp

FOUNDATION="$STATE_DIR/foundation.json"
if [[ ! -f "$FOUNDATION" ]]; then
  echo "[FATAL] foundation.json not found. Run 01-create-foundation.sh first."
  exit 1
fi

PUBLIC_IP="$(json_get "$FOUNDATION" '.elasticIp')"
SSH_KEY_PATH="${SSH_KEY_PATH:-}"
if [[ -z "$SSH_KEY_PATH" || ! -f "$SSH_KEY_PATH" ]]; then
  echo "[FATAL] Set SSH_KEY_PATH to your EC2 private key file."
  exit 1
fi

log "Waiting for SSH on $PUBLIC_IP"
for i in {1..30}; do
  if ssh -o StrictHostKeyChecking=no -o ConnectTimeout=5 -i "$SSH_KEY_PATH" "ubuntu@$PUBLIC_IP" "echo ok" >/dev/null 2>&1; then
    break
  fi
  sleep 5
done

log "Bootstrapping packages"
ssh -o StrictHostKeyChecking=no -i "$SSH_KEY_PATH" "ubuntu@$PUBLIC_IP" "sudo apt-get update && sudo apt-get install -y nginx git curl jq certbot python3-certbot-nginx"
ssh -o StrictHostKeyChecking=no -i "$SSH_KEY_PATH" "ubuntu@$PUBLIC_IP" "curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash - && sudo apt-get install -y nodejs build-essential && sudo npm install -g pm2"
ssh -o StrictHostKeyChecking=no -i "$SSH_KEY_PATH" "ubuntu@$PUBLIC_IP" "sudo mkdir -p '$PROJECT_DIR' && sudo chown -R ubuntu:ubuntu '$PROJECT_DIR'"

BOOTSTRAP_JSON="$(jq -n --arg publicIp "$PUBLIC_IP" --arg projectDir "$PROJECT_DIR" '{publicIp:$publicIp,projectDir:$projectDir,status:"ready"}')"
write_state ec2-bootstrap.json "$BOOTSTRAP_JSON"
log "EC2 bootstrap complete"

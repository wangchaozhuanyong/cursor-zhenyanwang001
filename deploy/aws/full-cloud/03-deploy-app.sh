#!/usr/bin/env bash
set -euo pipefail
source "$(cd "$(dirname "$0")" && pwd)/00-common.sh"

require_cmd jq ssh scp rsync

FOUNDATION="$STATE_DIR/foundation.json"
if [[ ! -f "$FOUNDATION" ]]; then
  echo "[FATAL] foundation.json not found. Run 01-create-foundation.sh first."
  exit 1
fi

PUBLIC_IP="$(json_get "$FOUNDATION" '.elasticIp')"
RDS_ENDPOINT="$(json_get "$FOUNDATION" '.rdsEndpoint')"
SSH_KEY_PATH="${SSH_KEY_PATH:-}"
if [[ -z "$SSH_KEY_PATH" || ! -f "$SSH_KEY_PATH" ]]; then
  echo "[FATAL] Set SSH_KEY_PATH to your EC2 private key file."
  exit 1
fi

REPO_DIR_NAME="$(basename "$PROJECT_DIR")"
REMOTE_PARENT="$(dirname "$PROJECT_DIR")"

log "Cloning repository on EC2"
ssh -o StrictHostKeyChecking=no -i "$SSH_KEY_PATH" "ubuntu@$PUBLIC_IP" "\
  mkdir -p '$REMOTE_PARENT' && cd '$REMOTE_PARENT' && \
  if [ ! -d '$PROJECT_DIR/.git' ]; then git clone --branch '$REPO_BRANCH' '$REPO_URL' '$REPO_DIR_NAME'; else cd '$PROJECT_DIR' && git fetch origin '$REPO_BRANCH' && git reset --hard 'origin/$REPO_BRANCH'; fi"

log "Writing server .env on EC2"
ssh -o StrictHostKeyChecking=no -i "$SSH_KEY_PATH" "ubuntu@$PUBLIC_IP" "cat > '$PROJECT_DIR/server/.env' <<'EOF'
PORT=3001
NODE_ENV=$NODE_ENV
DB_HOST=$RDS_ENDPOINT
DB_PORT=3306
DB_USER=$RDS_MASTER_USERNAME
DB_PASSWORD=$RDS_MASTER_PASSWORD
DB_NAME=$RDS_DB_NAME
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=7d
PUBLIC_APP_URL=$PUBLIC_APP_URL
CORS_ORIGINS=$CORS_ORIGINS
STRIPE_SECRET_KEY=$STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET=$STRIPE_WEBHOOK_SECRET
EOF"

log "Running app deployment script"
ssh -o StrictHostKeyChecking=no -i "$SSH_KEY_PATH" "ubuntu@$PUBLIC_IP" "cd '$PROJECT_DIR' && chmod +x deploy/deploy-wwwroot.sh && PROJECT_DIR='$PROJECT_DIR' PM2_APP='gc-api' bash deploy/deploy-wwwroot.sh"

DEPLOY_JSON="$(jq -n --arg publicIp "$PUBLIC_IP" --arg branch "$REPO_BRANCH" --arg projectDir "$PROJECT_DIR" '{publicIp:$publicIp,branch:$branch,projectDir:$projectDir,status:"deployed"}')"
write_state deploy.json "$DEPLOY_JSON"
log "App deployment complete"

#!/usr/bin/env bash
set -euo pipefail
source "$(cd "$(dirname "$0")" && pwd)/00-common.sh"

require_cmd jq curl ssh

FOUNDATION="$STATE_DIR/foundation.json"
DNS_STATE="$STATE_DIR/dns-https.json"
if [[ ! -f "$FOUNDATION" || ! -f "$DNS_STATE" ]]; then
  echo "[FATAL] foundation.json or dns-https.json missing."
  exit 1
fi

PUBLIC_IP="$(json_get "$FOUNDATION" '.elasticIp')"
FULL_DOMAIN="$(json_get "$DNS_STATE" '.domain')"
SSH_KEY_PATH="${SSH_KEY_PATH:-}"
if [[ -z "$SSH_KEY_PATH" || ! -f "$SSH_KEY_PATH" ]]; then
  echo "[FATAL] Set SSH_KEY_PATH to your EC2 private key file."
  exit 1
fi

log "Running remote health checks"
ssh -o StrictHostKeyChecking=no -i "$SSH_KEY_PATH" "ubuntu@$PUBLIC_IP" "curl -fsS http://127.0.0.1:$APP_PORT/api/health/live >/dev/null && curl -fsS http://127.0.0.1:$APP_PORT/api/health/ready >/dev/null"

log "Running public checks"
HTTP_CODE="$(curl -s -o /dev/null -w '%{http_code}' "https://$FULL_DOMAIN/")"
LIVE_CODE="$(curl -s -o /dev/null -w '%{http_code}' "https://$FULL_DOMAIN/api/health/live")"
READY_CODE="$(curl -s -o /dev/null -w '%{http_code}' "https://$FULL_DOMAIN/api/health/ready")"

if [[ "$HTTP_CODE" != "200" || "$LIVE_CODE" != "200" || "$READY_CODE" != "200" ]]; then
  echo "[FATAL] Validation failed: /=$HTTP_CODE live=$LIVE_CODE ready=$READY_CODE"
  exit 1
fi

FINAL_JSON="$(jq -n \
  --arg domain "$FULL_DOMAIN" \
  --arg home "$HTTP_CODE" \
  --arg live "$LIVE_CODE" \
  --arg ready "$READY_CODE" \
  '{domain:$domain,checks:{home:$home,live:$live,ready:$ready},status:"healthy"}')"
write_state final-validation.json "$FINAL_JSON"

log "All checks passed"
log "You can now decommission local server and local database after your chosen observation window."

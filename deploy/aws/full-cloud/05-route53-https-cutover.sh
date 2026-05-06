#!/usr/bin/env bash
set -euo pipefail
source "$(cd "$(dirname "$0")" && pwd)/00-common.sh"

require_cmd aws jq ssh

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

FULL_DOMAIN="$DOMAIN_NAME"
if [[ -n "${SUBDOMAIN:-}" ]]; then
  FULL_DOMAIN="$SUBDOMAIN.$DOMAIN_NAME"
fi

if [[ "$HOSTED_ZONE_CREATE" == "true" ]]; then
  log "Creating/ensuring hosted zone"
  HZ_ID="$("${AWS_CMD[@]}" route53 list-hosted-zones-by-name --dns-name "$DOMAIN_NAME" \
    --query "HostedZones[?Name=='$DOMAIN_NAME.']|[0].Id" --output text)"
  if [[ "$HZ_ID" == "None" || -z "$HZ_ID" ]]; then
    HZ_ID="$("${AWS_CMD[@]}" route53 create-hosted-zone --name "$DOMAIN_NAME" --caller-reference "$PROJECT_TAG-$(date +%s)" --query HostedZone.Id --output text)"
  fi
else
  HZ_ID="$("${AWS_CMD[@]}" route53 list-hosted-zones-by-name --dns-name "$DOMAIN_NAME" \
    --query "HostedZones[?Name=='$DOMAIN_NAME.']|[0].Id" --output text)"
fi

HZ_ID="${HZ_ID#/hostedzone/}"
if [[ -z "$HZ_ID" || "$HZ_ID" == "None" ]]; then
  echo "[FATAL] Hosted zone not found for $DOMAIN_NAME"
  exit 1
fi

log "Upserting A record to Elastic IP"
CHANGE_BATCH="$(jq -n --arg name "$FULL_DOMAIN" --arg ip "$PUBLIC_IP" '{
  Comment:"cutover to ec2",
  Changes:[{Action:"UPSERT",ResourceRecordSet:{Name:$name,Type:"A",TTL:60,ResourceRecords:[{Value:$ip}]}}]
}')"
"${AWS_CMD[@]}" route53 change-resource-record-sets --hosted-zone-id "$HZ_ID" --change-batch "$CHANGE_BATCH" >/dev/null

log "Configuring nginx and issuing certbot certificate on EC2"
ssh -o StrictHostKeyChecking=no -i "$SSH_KEY_PATH" "ubuntu@$PUBLIC_IP" "\
cat > /tmp/${PROJECT_TAG}.conf <<'NGINX'
server {
  listen 80;
  server_name $FULL_DOMAIN;
  root $PROJECT_DIR/public-frontend;
  index index.html;
  location /api/ {
    proxy_pass http://127.0.0.1:$APP_PORT/api/;
    proxy_http_version 1.1;
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
  }
  location / { try_files \$uri \$uri/ /index.html; }
}
NGINX
sudo mv /tmp/${PROJECT_TAG}.conf /etc/nginx/sites-available/${PROJECT_TAG}.conf
sudo ln -sf /etc/nginx/sites-available/${PROJECT_TAG}.conf /etc/nginx/sites-enabled/${PROJECT_TAG}.conf
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d '$FULL_DOMAIN' --non-interactive --agree-tos -m '$CERT_EMAIL' --redirect
sudo nginx -t
sudo systemctl reload nginx"

DNS_JSON="$(jq -n --arg hostedZoneId "$HZ_ID" --arg domain "$FULL_DOMAIN" --arg ip "$PUBLIC_IP" '{hostedZoneId:$hostedZoneId,domain:$domain,ip:$ip,https:"enabled",status:"cutover-complete"}')"
write_state dns-https.json "$DNS_JSON"
log "Route53 + HTTPS cutover complete"

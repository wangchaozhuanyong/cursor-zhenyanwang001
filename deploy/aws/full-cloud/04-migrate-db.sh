#!/usr/bin/env bash
set -euo pipefail
source "$(cd "$(dirname "$0")" && pwd)/00-common.sh"

require_cmd jq mysqldump mysql gzip wc ssh scp

FOUNDATION="$STATE_DIR/foundation.json"
if [[ ! -f "$FOUNDATION" ]]; then
  echo "[FATAL] foundation.json not found. Run 01-create-foundation.sh first."
  exit 1
fi

RDS_ENDPOINT="$(json_get "$FOUNDATION" '.rdsEndpoint')"
PUBLIC_IP="$(json_get "$FOUNDATION" '.elasticIp')"
SSH_KEY_PATH="${SSH_KEY_PATH:-}"
if [[ -z "$SSH_KEY_PATH" || ! -f "$SSH_KEY_PATH" ]]; then
  echo "[FATAL] Set SSH_KEY_PATH to your EC2 private key file."
  exit 1
fi

TS="$(date +%Y%m%d-%H%M%S)"
BACKUP_SQL="$STATE_DIR/source-$SOURCE_DB_NAME-$TS.sql"
BACKUP_GZ="$BACKUP_SQL.gz"

log "Dumping source database"
MYSQL_PWD="$SOURCE_DB_PASSWORD" mysqldump \
  -h "$SOURCE_DB_HOST" -P "$SOURCE_DB_PORT" -u "$SOURCE_DB_USER" \
  --single-transaction --quick --routines --triggers --events \
  --default-character-set=utf8mb4 \
  "$SOURCE_DB_NAME" > "$BACKUP_SQL"

gzip -f "$BACKUP_SQL"
log "Backup created: $BACKUP_GZ"

log "Importing into RDS"
gunzip -c "$BACKUP_GZ" | MYSQL_PWD="$RDS_MASTER_PASSWORD" mysql -h "$RDS_ENDPOINT" -P 3306 -u "$RDS_MASTER_USERNAME" "$RDS_DB_NAME"

log "Running migration scripts on EC2"
ssh -o StrictHostKeyChecking=no -i "$SSH_KEY_PATH" "ubuntu@$PUBLIC_IP" "cd '$PROJECT_DIR/server' && npm run migrate"

log "Validating row counts (sample)"
SRC_USER_COUNT="$(MYSQL_PWD="$SOURCE_DB_PASSWORD" mysql -h "$SOURCE_DB_HOST" -P "$SOURCE_DB_PORT" -u "$SOURCE_DB_USER" -N -e "SELECT COUNT(*) FROM users" "$SOURCE_DB_NAME" 2>/dev/null || echo -1)"
DST_USER_COUNT="$(MYSQL_PWD="$RDS_MASTER_PASSWORD" mysql -h "$RDS_ENDPOINT" -P 3306 -u "$RDS_MASTER_USERNAME" -N -e "SELECT COUNT(*) FROM users" "$RDS_DB_NAME" 2>/dev/null || echo -1)"
SRC_ORDER_COUNT="$(MYSQL_PWD="$SOURCE_DB_PASSWORD" mysql -h "$SOURCE_DB_HOST" -P "$SOURCE_DB_PORT" -u "$SOURCE_DB_USER" -N -e "SELECT COUNT(*) FROM orders" "$SOURCE_DB_NAME" 2>/dev/null || echo -1)"
DST_ORDER_COUNT="$(MYSQL_PWD="$RDS_MASTER_PASSWORD" mysql -h "$RDS_ENDPOINT" -P 3306 -u "$RDS_MASTER_USERNAME" -N -e "SELECT COUNT(*) FROM orders" "$RDS_DB_NAME" 2>/dev/null || echo -1)"

MIGRATION_JSON="$(jq -n \
  --arg backup "$BACKUP_GZ" \
  --arg srcUsers "$SRC_USER_COUNT" \
  --arg dstUsers "$DST_USER_COUNT" \
  --arg srcOrders "$SRC_ORDER_COUNT" \
  --arg dstOrders "$DST_ORDER_COUNT" \
  '{backupFile:$backup,users:{source:$srcUsers,target:$dstUsers},orders:{source:$srcOrders,target:$dstOrders},status:"migrated"}')"
write_state db-migration.json "$MIGRATION_JSON"

log "Database migration complete"

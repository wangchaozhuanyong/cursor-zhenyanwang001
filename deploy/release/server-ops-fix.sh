#!/usr/bin/env bash
# One-off production ops: DB verify, env keys, optional CF purge, MFA key rotation prep.
set -euo pipefail

ENV_FILE="${ENV_FILE:-/var/www/damatong/shared/server.env}"
SERVER_DIR="${SERVER_DIR:-/var/www/damatong/current/server}"
REPO_DIR="${REPO_DIR:-/var/www/click-send-shop}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "[ops] missing $ENV_FILE"
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

echo "[ops] === 1) Database (gc_app) ==="
cd "$SERVER_DIR"
node <<'NODE'
require('dotenv').config({ path: process.env.ENV_FILE || '/var/www/damatong/shared/server.env' });
const mysql = require('mysql2/promise');
(async () => {
  const c = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
  await c.query('SELECT 1');
  await c.end();
  console.log('[ops] DB_OK user=' + process.env.DB_USER + ' host=' + process.env.DB_HOST);
})().catch((e) => {
  console.error('[ops] DB_FAIL', e.message);
  process.exit(1);
});
NODE

echo "[ops] === 2) BACKUP_ENCRYPTION_KEY ==="
if [[ -z "${BACKUP_ENCRYPTION_KEY:-}" ]] || [[ ${#BACKUP_ENCRYPTION_KEY} -lt 32 ]]; then
  new_backup_key="$(openssl rand -hex 48)"
  if grep -q '^BACKUP_ENCRYPTION_KEY=' "$ENV_FILE"; then
    sed -i "s|^BACKUP_ENCRYPTION_KEY=.*|BACKUP_ENCRYPTION_KEY=${new_backup_key}|" "$ENV_FILE"
  else
    echo "BACKUP_ENCRYPTION_KEY=${new_backup_key}" >> "$ENV_FILE"
  fi
  echo "[ops] BACKUP_ENCRYPTION_KEY set (len=96 hex)"
else
  echo "[ops] BACKUP_ENCRYPTION_KEY already configured"
fi

echo "[ops] === 3) ADMIN_MFA_SECRET_KEY (dedicated) ==="
mfa_same_jwt="0"
if [[ -n "${ADMIN_MFA_SECRET_KEY:-}" && -n "${JWT_SECRET:-}" && "$ADMIN_MFA_SECRET_KEY" == "$JWT_SECRET" ]]; then
  mfa_same_jwt="1"
  echo "[ops] ADMIN_MFA_SECRET_KEY currently equals JWT_SECRET — rotating to dedicated key"
fi
if [[ -z "${ADMIN_MFA_SECRET_KEY:-}" ]] || [[ ${#ADMIN_MFA_SECRET_KEY} -lt 64 ]] || [[ "$mfa_same_jwt" == "1" ]]; then
  new_mfa_key="$(openssl rand -hex 48)"
  if grep -q '^ADMIN_MFA_SECRET_KEY=' "$ENV_FILE"; then
    sed -i "s|^ADMIN_MFA_SECRET_KEY=.*|ADMIN_MFA_SECRET_KEY=${new_mfa_key}|" "$ENV_FILE"
  else
    echo "ADMIN_MFA_SECRET_KEY=${new_mfa_key}" >> "$ENV_FILE"
  fi
  echo "[ops] ADMIN_MFA_SECRET_KEY rotated (dedicated, len=96 hex)"
  ROTATED_MFA=1
else
  echo "[ops] ADMIN_MFA_SECRET_KEY already dedicated (len ok)"
  ROTATED_MFA=0
fi

# Reload env after edits
set -a
source "$ENV_FILE"
set +a

if [[ "${ROTATED_MFA:-0}" == "1" ]]; then
  echo "[ops] === 3b) Reset admin MFA bindings (new encryption key) ==="
  mapfile -t phones < <(node <<'NODE'
require('dotenv').config({ path: process.env.ENV_FILE || '/var/www/damatong/shared/server.env' });
const db = require('/var/www/damatong/current/server/src/config/db');
(async () => {
  const [rows] = await db.query(
    `SELECT u.phone FROM users u
     INNER JOIN admin_mfa_settings m ON m.user_id = u.id
     WHERE m.enabled = 1 AND u.phone IS NOT NULL AND TRIM(u.phone) <> ''`,
  );
  for (const row of rows) console.log(String(row.phone).trim());
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
NODE
  )
  if [[ ${#phones[@]} -eq 0 ]]; then
    echo "[ops] no enabled MFA admins to reset"
  else
    for ph in "${phones[@]}"; do
      echo "[ops] reset MFA for ${ph}"
      node "$REPO_DIR/server/scripts/reset-admin-mfa.js" "$ph" || true
    done
  fi
fi

echo "[ops] === 4) Restart API ==="
cd "$SERVER_DIR"
pm2 restart gc-api --update-env
pm2 save
sleep 5
curl -sf "http://127.0.0.1:${PORT:-3001}/api/health/ready" | head -c 200
echo

echo "[ops] === 5) Cloudflare purge ==="
if [[ -n "${CF_API_TOKEN:-}" && -n "${CF_ZONE_ID:-}" ]]; then
  CF_ENV_FILE="$ENV_FILE" bash "$REPO_DIR/deploy/purge-cloudflare-cache.sh"
else
  echo "[ops] CF_SKIP: set CF_API_TOKEN and CF_ZONE_ID in $ENV_FILE then re-run purge"
fi

echo "[ops] done"

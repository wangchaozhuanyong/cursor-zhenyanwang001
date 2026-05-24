#!/usr/bin/env bash
set -euo pipefail
ENV_FILE=/var/www/click-send-shop/server/.env
set -a && source "$ENV_FILE" && set +a

echo "env SITE_CODE=$SITE_CODE bucket=$STORAGE_S3_BUCKET"
echo "static FRONTEND_DIST=$FRONTEND_DIST ADMIN_DIST=$ADMIN_DIST"
test -f "$FRONTEND_DIST/index.html"
test -f "$ADMIN_DIST/admin-index.html"

curl -sf http://127.0.0.1:3001/api/health/ready | head -c 120
echo

LOGO="$(mysql -h"${DB_HOST:-127.0.0.1}" -P"${DB_PORT:-3306}" -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -N -e "SELECT setting_value FROM site_settings WHERE setting_key='logoUrl' LIMIT 1")"
echo "logoUrl=$LOGO"
curl -sS -o /dev/null -w "logo_http:%{http_code}\n" "$LOGO"

OLD_HOST='flashcast-prod-assets-618867225629.s3.ap-southeast-1.amazonaws.com'
LEFT="$(mysql -h"${DB_HOST:-127.0.0.1}" -P"${DB_PORT:-3306}" -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -N -e \
  "SELECT COUNT(*) FROM site_settings WHERE setting_value LIKE '%${OLD_HOST}%';")"
echo "db_rows_with_old_s3_host=$LEFT"

ls -d /var/www/flashcast 2>/dev/null && echo "WARN: /var/www/flashcast still exists" || echo "ok: no /var/www/flashcast"
grep ' root ' /etc/nginx/sites-enabled/damatong.prod.conf
curl -sS -o /dev/null -w "storefront:%{http_code}\n" https://damatong.net/
echo VERIFY_OK

#!/usr/bin/env bash
# 生产一次性迁移：flashcast 路径/前缀/S3 桶名 → damatong
# 用法（在 EC2 上）：
#   cd /var/www/click-send-shop && sudo bash deploy/scripts/migrate-flashcast-to-damatong-prod.sh
set -euo pipefail

OLD_BUCKET='flashcast-prod-assets-618867225629'
NEW_BUCKET='damatong-prod-assets-618867225629'
OLD_S3_HOST="${OLD_BUCKET}.s3.ap-southeast-1.amazonaws.com"
NEW_S3_HOST="${NEW_BUCKET}.s3.ap-southeast-1.amazonaws.com"
OLD_STATIC='/var/www/flashcast'
NEW_STATIC='/var/www/damatong'
REGION='ap-southeast-1'

PROJECT_DIR="${PROJECT_DIR:-/var/www/click-send-shop}"
ENV_FILE="${ENV_FILE:-$PROJECT_DIR/server/.env}"
NGINX_CONF="${NGINX_CONF:-/etc/nginx/sites-available/damatong.prod.conf}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "[FATAL] missing $ENV_FILE"
  exit 1
fi

# shellcheck disable=SC1090
set -a && source "$ENV_FILE" && set +a

echo "==> [1/7] S3: create bucket (if needed) and sync objects"
if ! aws s3api head-bucket --bucket "$NEW_BUCKET" 2>/dev/null; then
  aws s3api create-bucket \
    --bucket "$NEW_BUCKET" \
    --region "$REGION" \
    --create-bucket-configuration "LocationConstraint=$REGION"
  aws s3api put-public-access-block \
    --bucket "$NEW_BUCKET" \
    --public-access-block-configuration \
    BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=false,RestrictPublicBuckets=false
fi

aws s3 sync "s3://${OLD_BUCKET}" "s3://${NEW_BUCKET}" --region "$REGION"

POLICY_FILE="$(mktemp)"
cat >"$POLICY_FILE" <<EOF
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "AllowPublicReadProdPrefix",
    "Effect": "Allow",
    "Principal": "*",
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::${NEW_BUCKET}/prod/*"
  }]
}
EOF
aws s3api put-bucket-policy --bucket "$NEW_BUCKET" --policy "file://${POLICY_FILE}"
rm -f "$POLICY_FILE"

echo "==> [2/7] Static files: $OLD_STATIC -> $NEW_STATIC"
sudo mkdir -p "$NEW_STATIC"
if [[ -d "$OLD_STATIC" ]]; then
  sudo rsync -a "$OLD_STATIC/" "$NEW_STATIC/"
fi
sudo chown -R www-data:www-data "$NEW_STATIC" 2>/dev/null || true

echo "==> [3/7] Patch server/.env"
patch_env() {
  local key="$1" val="$2"
  if grep -q "^${key}=" "$ENV_FILE"; then
    sed -i "s|^${key}=.*|${key}=${val}|" "$ENV_FILE"
  else
    echo "${key}=${val}" >>"$ENV_FILE"
  fi
}
patch_env SITE_CODE damatong
patch_env REDIS_KEY_PREFIX damatong
patch_env BULLMQ_PREFIX 'damatong:bull'
patch_env STORAGE_S3_BUCKET "$NEW_BUCKET"
patch_env STORAGE_PUBLIC_BASE_URL "https://${NEW_S3_HOST}"
patch_env FRONTEND_DIST "${NEW_STATIC}/dist"
patch_env ADMIN_DIST "${NEW_STATIC}/admin-dist"
grep -E '^(SITE_CODE|REDIS_KEY_PREFIX|BULLMQ_PREFIX|STORAGE_S3_BUCKET|STORAGE_PUBLIC_BASE_URL|FRONTEND_DIST|ADMIN_DIST)=' "$ENV_FILE"

echo "==> [4/7] Nginx static roots"
if [[ -f "$NGINX_CONF" ]]; then
  sudo sed -i "s|${OLD_STATIC}|${NEW_STATIC}|g" "$NGINX_CONF"
fi
if [[ -f "$PROJECT_DIR/deploy/nginx/damatong.prod.conf" ]]; then
  sed -i "s|${OLD_STATIC}|${NEW_STATIC}|g" "$PROJECT_DIR/deploy/nginx/damatong.prod.conf"
fi

echo "==> [5/7] MySQL: replace S3 host in text columns"
DB="${DB_NAME:?DB_NAME unset}"
mapfile -t SQL_LINES < <(mysql -h"${DB_HOST:-127.0.0.1}" -P"${DB_PORT:-3306}" -u"$DB_USER" -p"$DB_PASSWORD" "$DB" -N -e \
  "SELECT CONCAT(
     'UPDATE \`', table_name, '\` SET \`', column_name,
     '\` = REPLACE(\`', column_name, '\`, ''${OLD_S3_HOST}'', ''${NEW_S3_HOST}'')',
     ' WHERE \`', column_name, '\` LIKE ''%${OLD_S3_HOST}%'';'
   )
   FROM information_schema.columns
   WHERE table_schema = '${DB}'
     AND data_type IN ('varchar','text','mediumtext','longtext','tinytext');")
applied=0
for sql in "${SQL_LINES[@]}"; do
  [[ -z "$sql" ]] && continue
  mysql -h"${DB_HOST:-127.0.0.1}" -P"${DB_PORT:-3306}" -u"$DB_USER" -p"$DB_PASSWORD" "$DB" -e "$sql"
  applied=$((applied + 1))
done
echo "    applied ${applied} column UPDATE(s)"
mysql -h"${DB_HOST:-127.0.0.1}" -P"${DB_PORT:-3306}" -u"$DB_USER" -p"$DB_PASSWORD" "$DB" -N -e \
  "SELECT COUNT(*) AS remaining FROM site_settings WHERE setting_value LIKE '%${OLD_S3_HOST}%';" || true

echo "==> [6/7] Reload nginx + restart API"
if [[ -f "$PROJECT_DIR/deploy/nginx/damatong.prod.conf" ]]; then
  sudo cp "$PROJECT_DIR/deploy/nginx/damatong.prod.conf" "$NGINX_CONF"
  sudo ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/damatong.prod.conf
fi
sudo nginx -t
sudo systemctl reload nginx
if command -v pm2 >/dev/null 2>&1; then
  if [[ "$(id -u)" -eq 0 ]] && id ubuntu >/dev/null 2>&1; then
    sudo -u ubuntu -H pm2 restart gc-api --update-env
  else
    pm2 restart gc-api --update-env
  fi
fi

echo "==> [7/7] Smoke checks"
test -f "${NEW_STATIC}/dist/index.html"
test -f "${NEW_STATIC}/admin-dist/admin-index.html"
curl -sf -o /dev/null "https://${NEW_S3_HOST}/prod/" || echo "    (S3 root probe skipped)"
curl -sf -o /dev/null http://127.0.0.1:3001/api/health/live

if [[ -d "$OLD_STATIC" && ! -L "$OLD_STATIC" ]]; then
  retired="${OLD_STATIC}.retired.$(date +%Y%m%d%H%M%S)"
  echo "==> Retire old static dir -> $retired"
  sudo mv "$OLD_STATIC" "$retired"
fi

echo "MIGRATION_OK"

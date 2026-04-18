#!/usr/bin/env bash
# 用法：在仓库根目录 source server/.env 或 export DB_* 后执行 ./scripts/backup-mysql.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="${ROOT}/backups"
mkdir -p "$OUT"
FN="${OUT}/click_send_shop_$(date +%Y%m%d_%H%M%S).sql"
: "${DB_HOST:=localhost}"
: "${DB_PORT:=3306}"
: "${DB_USER:=root}"
: "${DB_NAME:=click_send_shop}"
mysqldump -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" \
  --single-transaction --routines "$DB_NAME" > "$FN"
echo "OK -> $FN"

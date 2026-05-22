#!/usr/bin/env bash
set -euo pipefail

echo "=== 1) Stop old binlog timer ==="
sudo systemctl disable --now click-send-binlog-sync.timer 2>/dev/null || true
sudo systemctl stop click-send-binlog-sync.service 2>/dev/null || true

echo "=== 2) Disk ==="
df -h /

echo "=== 3) Pull fix ==="
cd /var/www/click-send-shop
git fetch origin main
git reset --hard origin/main
echo "HEAD=$(git rev-parse --short HEAD)"

echo "=== 4) Syntax check ==="
cd server
node --check scripts/backup/backup-lib.js
node --check scripts/backup/backup-full.js
node --check scripts/backup/backup-config.js
node --check scripts/backup/backup-binlog-sync.js
node --check scripts/backup/restore-to-temp.js

echo "=== 5) Upsert .env backup keys ==="
upsert() {
  local key="$1"
  local val="$2"
  if grep -q "^${key}=" .env 2>/dev/null; then
    sed -i "s|^${key}=.*|${key}=${val}|" .env
  else
    echo "${key}=${val}" >> .env
  fi
}
upsert MYSQL_BINLOG_FILES ""
upsert BACKUP_BINLOG_INCLUDE_ACTIVE "0"
upsert BACKUP_BINLOG_MIN_AGE_SECONDS "120"
upsert BACKUP_KEEP_LOCAL_ENCRYPTED "0"
upsert BACKUP_MIN_FREE_BYTES "1073741824"
upsert BACKUP_KEEP_RESTORE_WORKDIR "0"
upsert BACKUP_KEEP_RESTORE_DRILL_DB "0"
grep -E '^MYSQL_BINLOG_FILES=|^BACKUP_BINLOG_|^BACKUP_KEEP_|^BACKUP_MIN_FREE' .env

echo "=== 6) systemd ==="
sudo cp /var/www/click-send-shop/deploy/systemd/click-send-binlog-sync.timer.example /etc/systemd/system/click-send-binlog-sync.timer
sudo cp /var/www/click-send-shop/deploy/systemd/click-send-binlog-sync.service.example /etc/systemd/system/click-send-binlog-sync.service
sudo systemctl daemon-reload
sudo systemctl enable --now click-send-binlog-sync.timer

echo "=== 7) Test binlog sync once (root, same as systemd) ==="
cd /var/www/click-send-shop/server
sudo npm run backup:binlog 2>&1 | tail -8 || true

echo "=== 8) Verify ==="
systemctl list-timers 'click-send*' --no-pager
df -h /
curl -fsS -m 10 http://127.0.0.1:3001/api/health/live | head -c 80
echo
curl -fsS -m 15 http://127.0.0.1:3001/api/home/bootstrap -o /dev/null -w 'bootstrap:%{http_code}\n'

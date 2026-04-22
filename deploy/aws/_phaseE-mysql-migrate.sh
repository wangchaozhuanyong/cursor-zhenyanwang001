#!/usr/bin/env bash
# Phase E: migrate MySQL from Baota bundled to system mysql-server-8.0
# - Keep /www/server/data intact as rollback source
# - Re-import business DB into system mysql, re-grant click_user
# - set +e everywhere so failures dont kill mid-flow; final summary at end
set +e

NEW=/var/www/click-send-shop
ENV_FILE=$NEW/server/.env
TS=$(date +%Y%m%d-%H%M%S)
BK=/home/ubuntu/backups/preE-$TS
mkdir -p $BK

set -a; . <(grep -E '^(DB_USER|DB_PASSWORD|DB_NAME|DB_HOST|DB_PORT)=' $ENV_FILE); set +a
DB_PORT=${DB_PORT:-3306}
DB_HOST=${DB_HOST:-127.0.0.1}

hr(){ echo; echo "===== $* ====="; }

hr "E.0 ENV CHECK"
echo "  DB_USER=$DB_USER  DB_NAME=$DB_NAME  DB_HOST=$DB_HOST:$DB_PORT"
echo "  current mysqld processes:"
ps -ef | grep -E '[m]ysqld' | head -5
echo "  3306 listeners:"
ss -ltnp 2>/dev/null | grep ':3306' || echo '    (none)'

hr "E.1 LAST-MOMENT BUSINESS DB BACKUP (click_user)"
MYCFG=$(mktemp); chmod 600 $MYCFG
printf '[client]\nuser=%s\npassword=%s\nhost=%s\nport=%s\n' "$DB_USER" "$DB_PASSWORD" "$DB_HOST" "$DB_PORT" > $MYCFG
/www/server/mysql/bin/mysqldump --defaults-extra-file=$MYCFG \
  --single-transaction --routines --triggers --events --hex-blob \
  --databases $DB_NAME > $BK/$DB_NAME.sql 2>$BK/dump.err
SZ=$(du -sh $BK/$DB_NAME.sql 2>/dev/null | awk '{print $1}')
LINES=$(wc -l < $BK/$DB_NAME.sql)
echo "  backup: $BK/$DB_NAME.sql  size=$SZ  lines=$LINES"
if [[ "$LINES" -lt 50 ]]; then
  echo "  [FATAL] backup too short, abort migration"
  cat $BK/dump.err
  rm -f $MYCFG
  exit 1
fi
rm -f $MYCFG
ls -la $BK

hr "E.2 STOP BAOTA mysqld (free 3306)"
sudo /etc/init.d/mysqld stop 2>/dev/null || sudo service mysqld stop 2>/dev/null
sleep 2
ps -ef | grep -E '[m]ysqld' | grep -v grep
if ss -ltnp 2>/dev/null | grep -q ':3306 '; then
  echo "  WARN: 3306 still busy, force kill"
  sudo pkill -9 mysqld 2>/dev/null
  sleep 2
fi
ss -ltnp 2>/dev/null | grep ':3306' && { echo "  FATAL: 3306 still busy, abort"; exit 1; } || echo "  OK 3306 freed"

hr "E.3 BACKUP /etc/my.cnf AND APT INSTALL mysql-server-8.0"
[[ -f /etc/my.cnf ]] && sudo mv /etc/my.cnf /etc/my.cnf.bt-bak.$TS && echo "  /etc/my.cnf -> /etc/my.cnf.bt-bak.$TS"
sudo apt-get update -qq 2>&1 | tail -3
echo "  apt install mysql-server-8.0 (30-60s) ..."
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y \
  -o Dpkg::Options::="--force-confnew" mysql-server-8.0 mysql-client-8.0 2>&1 | tail -15
sudo systemctl enable --now mysql 2>&1 | tail -3
sleep 3
sudo systemctl status mysql --no-pager 2>&1 | head -10
echo "  3306 listeners after install:"
ss -ltnp 2>/dev/null | grep ':3306' || echo "    [FATAL] system mysql not listening"

hr "E.4 CREATE BUSINESS DB + GRANT click_user"
sudo mysql -e "CREATE DATABASE IF NOT EXISTS \`$DB_NAME\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>&1
sudo mysql -e "CREATE USER IF NOT EXISTS '$DB_USER'@'127.0.0.1' IDENTIFIED BY '$DB_PASSWORD';" 2>&1
sudo mysql -e "CREATE USER IF NOT EXISTS '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASSWORD';" 2>&1
sudo mysql -e "ALTER USER '$DB_USER'@'127.0.0.1' IDENTIFIED BY '$DB_PASSWORD';" 2>&1
sudo mysql -e "ALTER USER '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASSWORD';" 2>&1
sudo mysql -e "GRANT ALL PRIVILEGES ON \`$DB_NAME\`.* TO '$DB_USER'@'127.0.0.1';" 2>&1
sudo mysql -e "GRANT ALL PRIVILEGES ON \`$DB_NAME\`.* TO '$DB_USER'@'localhost';" 2>&1
sudo mysql -e "FLUSH PRIVILEGES;" 2>&1
echo "  OK user+db ready"
sudo mysql -e "SELECT User, Host FROM mysql.user WHERE User='$DB_USER';"

hr "E.5 IMPORT BUSINESS DATA"
sudo mysql < $BK/$DB_NAME.sql 2>$BK/import.err
if [[ -s $BK/import.err ]]; then
  echo "  WARN import had messages:"
  head -20 $BK/import.err
fi
TABLES=$(mysql -u $DB_USER -p"$DB_PASSWORD" -h 127.0.0.1 -P 3306 -N -e "SHOW TABLES FROM \`$DB_NAME\`;" 2>/dev/null | wc -l)
echo "  OK imported. $DB_NAME has $TABLES tables"
mysql -u $DB_USER -p"$DB_PASSWORD" -h 127.0.0.1 -P 3306 -e "SHOW TABLES FROM \`$DB_NAME\`;" 2>/dev/null | head -25

hr "E.6 PM2 RELOAD gc-api"
cd $NEW/server
pm2 reload gc-api --update-env
sleep 5
pm2 status

hr "E.7 HEALTH CHECK"
for p in /api/health/live /api/health/ready; do
  c=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3001$p --max-time 3)
  echo "  127.0.0.1:3001$p -> $c"
done
echo "  ready body:"
curl -s http://127.0.0.1:3001/api/health/ready --max-time 3
echo
PUB=$(curl -s -o /dev/null -w '%{http_code}' http://13.214.165.214/ --max-time 5)
echo "  public http://13.214.165.214/ -> $PUB"

hr "E.8 DISABLE BAOTA mysqld AUTOSTART"
sudo update-rc.d -f mysqld remove 2>/dev/null
sudo systemctl disable mysqld 2>/dev/null
echo "  OK baota mysqld disabled (data dir /www/server/data preserved as rollback)"

echo
echo "================================================"
echo "  Phase E DONE"
echo "  backup:  $BK"
echo "  ready:   $(curl -s http://127.0.0.1:3001/api/health/ready --max-time 3)"
echo "================================================"

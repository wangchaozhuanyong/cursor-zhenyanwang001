#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MYSQL_DIR="$ROOT_DIR/.tools/mysql"
DATA_DIR="$ROOT_DIR/.tools/mysql-data"
RUN_DIR="$ROOT_DIR/.tools/mysql-run"
LOG_DIR="$ROOT_DIR/.tools/mysql-logs"

mkdir -p "$DATA_DIR" "$RUN_DIR" "$LOG_DIR"

if ! command -v screen >/dev/null 2>&1; then
  echo "screen is required to keep local MySQL running in the background." >&2
  exit 1
fi

if [ ! -x "$MYSQL_DIR/bin/mysqld" ]; then
  echo "MySQL binary not found at $MYSQL_DIR/bin/mysqld" >&2
  echo "Install MySQL into .tools/mysql first." >&2
  exit 1
fi

if "$MYSQL_DIR/bin/mysqladmin" --protocol=tcp -h127.0.0.1 -P3306 -uroot ping >/dev/null 2>&1; then
  echo "MySQL is already running on 127.0.0.1:3306"
  exit 0
fi

rm -f "$RUN_DIR/mysql.pid" "$RUN_DIR/mysql.sock"
screen -S zhenyan-mysql -X quit >/dev/null 2>&1 || true
screen -dmS zhenyan-mysql /bin/zsh -lc "cd '$ROOT_DIR' && exec .tools/mysql/bin/mysqld --basedir=\"\$PWD/.tools/mysql\" --datadir=\"\$PWD/.tools/mysql-data\" --socket=\"\$PWD/.tools/mysql-run/mysql.sock\" --pid-file=\"\$PWD/.tools/mysql-run/mysql.pid\" --log-error=\"\$PWD/.tools/mysql-logs/mysql.err\" --bind-address=127.0.0.1 --port=3306 --mysqlx=0"

for _ in {1..90}; do
  if "$MYSQL_DIR/bin/mysqladmin" --protocol=tcp -h127.0.0.1 -P3306 -uroot ping >/dev/null 2>&1; then
    "$MYSQL_DIR/bin/mysql" --protocol=tcp -h127.0.0.1 -P3306 -uroot -e "CREATE DATABASE IF NOT EXISTS click_send_shop CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
    echo "MySQL is running on 127.0.0.1:3306"
    exit 0
  fi
  sleep 1
done

echo "MySQL did not become ready. Check $LOG_DIR/mysql.err" >&2
exit 1

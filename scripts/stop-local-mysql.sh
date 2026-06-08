#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MYSQL_DIR="$ROOT_DIR/.tools/mysql"

if [ -x "$MYSQL_DIR/bin/mysqladmin" ]; then
  "$MYSQL_DIR/bin/mysqladmin" --protocol=tcp -h127.0.0.1 -P3306 -uroot shutdown >/dev/null 2>&1 || true
fi

screen -S zhenyan-mysql -X quit >/dev/null 2>&1 || true
echo "Local MySQL stopped"

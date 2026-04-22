#!/usr/bin/env bash
# 阶段 A：深度摸底 + 全量备份（只读 + 备份，不改变任何运行状态）
set -uo pipefail
BACKUP_DIR="/home/ubuntu/backups/$(date +%Y%m%d-%H%M%S)"
sudo mkdir -p "$BACKUP_DIR"
sudo chown -R ubuntu:ubuntu "$BACKUP_DIR"

echo "====================================="
echo " A1) MySQL 服务到底是哪个？"
echo "====================================="
sudo systemctl status mysql --no-pager 2>/dev/null | head -10 || true
sudo systemctl status mariadb --no-pager 2>/dev/null | head -10 || true
echo "--- mysqld pid/cmd:"
pgrep -af mysqld | head -5
echo "--- 监听 3306 的进程:"
sudo ss -ltnp | awk '$4 ~ /:3306$/'
echo "--- my.cnf 候选:"
sudo find /etc /www/server -maxdepth 4 -name 'my.cnf' 2>/dev/null
echo "--- datadir:"
sudo grep -h '^datadir' $(sudo find /etc /www/server -maxdepth 4 -name 'my.cnf' 2>/dev/null) 2>/dev/null

echo
echo "====================================="
echo " A2) 当前 PM2 状态（哪个 app / cwd / script）"
echo "====================================="
pm2 list 2>/dev/null | sed 's/^/  /'
echo "--- 详细：每个 app 的 cwd/script ---"
for n in $(pm2 jlist 2>/dev/null | grep -oE '"name":"[^"]+"' | head -10 | sed 's/.*"name":"\(.*\)"/\1/'); do
  echo "[$n]"
  pm2 show "$n" 2>/dev/null | grep -E '(script path|exec cwd|status|restarts|uptime|pid|args|env)' | head -10 | sed 's/^/    /'
done

echo
echo "====================================="
echo " A3) 项目目录与 .env"
echo "====================================="
PROJ="/www/wwwroot/cursor-zhenyanwang001"
ls -la "$PROJ" 2>/dev/null | head -20
echo "--- server/.env 关键键（值脱敏）:"
sudo awk -F= '/^[A-Z_]+=/{k=$1; v=substr($0, length(k)+2); if (k~/(PASSWORD|SECRET|KEY)/) v=substr(v,1,2)"***"; print "  "k"="v}' "$PROJ/server/.env" 2>/dev/null || echo "(无 server/.env)"
echo "--- 前端目录:"
ls -d "$PROJ"/click-send-shop-main/click-send-shop-main 2>/dev/null
ls "$PROJ"/click-send-shop-main/click-send-shop-main/dist 2>/dev/null | head -5

echo
echo "====================================="
echo " A4) Nginx 配置（哪些站点、root 指向哪、谁来源）"
echo "====================================="
sudo nginx -T 2>/dev/null | grep -E '^[[:space:]]*(server_name|root|listen|proxy_pass|include)' | head -40
echo "--- 配置文件来源:"
sudo find /etc/nginx -maxdepth 4 -name '*.conf' 2>/dev/null
sudo find /www/server/panel/vhost -maxdepth 2 -type f 2>/dev/null | head -20

echo
echo "====================================="
echo " A5) 健康检查（线上当前是否健康，用于后续对比）"
echo "====================================="
for path in /api/health/live /api/health/ready /; do
  code=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:3001$path" 2>/dev/null)
  echo "  127.0.0.1:3001$path -> $code"
done
for path in / /api/health/live; do
  code=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1$path" 2>/dev/null)
  echo "  127.0.0.1$path -> $code"
done

echo
echo "====================================="
echo " A6) MySQL 全量备份 → $BACKUP_DIR"
echo "====================================="
ENV_FILE="$PROJ/server/.env"
if [ -f "$ENV_FILE" ]; then
  set -a; source <(sudo grep -E '^(DB_|MYSQL_)' "$ENV_FILE"); set +a
fi
DB_HOST="${DB_HOST:-127.0.0.1}"; DB_PORT="${DB_PORT:-3306}"
DB_USER="${DB_USER:-root}"; DB_PASSWORD="${DB_PASSWORD:-}"
DB_NAME="${DB_NAME:-}"
echo "  连接：$DB_USER@$DB_HOST:$DB_PORT/${DB_NAME:-<all>}"

# 列所有用户库
DBS=$(MYSQL_PWD="$DB_PASSWORD" mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" \
        -N -e "SHOW DATABASES" 2>/dev/null \
        | grep -Ev '^(information_schema|performance_schema|mysql|sys)$' || true)
echo "  发现用户数据库: $(echo $DBS | tr '\n' ' ')"

# 单库备份（每个库一个文件，方便日后恢复）
if [ -n "$DBS" ]; then
  for d in $DBS; do
    out="$BACKUP_DIR/${d}.sql.gz"
    echo "  → 备份 $d ..."
    if MYSQL_PWD="$DB_PASSWORD" mysqldump -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" \
         --single-transaction --quick --routines --triggers --events \
         --default-character-set=utf8mb4 \
         "$d" 2>/dev/null | gzip > "$out"; then
      sz=$(du -h "$out" | cut -f1)
      echo "    ✅ $out  ($sz)"
    else
      echo "    ❌ 备份 $d 失败"
    fi
  done
else
  echo "  ⚠️  未发现可备份的用户数据库（请确认 .env 中的 DB_USER 是否有权限）"
fi

# 全量备份兜底（包含所有库）
echo "  → 全量 all-databases 兜底..."
if MYSQL_PWD="$DB_PASSWORD" mysqldump -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" \
     --all-databases --single-transaction --quick --routines --triggers --events \
     --default-character-set=utf8mb4 2>/dev/null \
     | gzip > "$BACKUP_DIR/all-databases.sql.gz"; then
  sz=$(du -h "$BACKUP_DIR/all-databases.sql.gz" | cut -f1)
  echo "    ✅ $BACKUP_DIR/all-databases.sql.gz  ($sz)"
else
  echo "    ❌ all-databases 备份失败（可能是密码不对/权限不够）"
fi

# 备份 .env / nginx / pm2
echo "  → 备份 .env / nginx 配置 / pm2 配置..."
[ -f "$ENV_FILE" ] && sudo cp "$ENV_FILE" "$BACKUP_DIR/server.env.bak"
sudo cp -r /etc/nginx "$BACKUP_DIR/etc-nginx"  2>/dev/null || true
sudo cp -r /www/server/panel/vhost "$BACKUP_DIR/baota-nginx-vhost" 2>/dev/null || true
[ -f "$PROJ/server/ecosystem.config.cjs" ] && cp "$PROJ/server/ecosystem.config.cjs" "$BACKUP_DIR/" || true
pm2 save >/dev/null 2>&1 || true
[ -f ~/.pm2/dump.pm2 ] && cp ~/.pm2/dump.pm2 "$BACKUP_DIR/pm2-dump.json" || true

echo
echo "====================================="
echo " A 阶段完成"
echo "====================================="
echo "  备份目录：$BACKUP_DIR"
ls -lh "$BACKUP_DIR"
echo
echo "下一步：阶段 B（把代码搬到 /var/www/click-send-shop，老进程不停）"

#!/usr/bin/env bash
set -euo pipefail
ENV="${ENV_FILE:-/var/www/damatong/shared/server.env}"
echo "========== 生产数据库 / 部署配置只读检查 =========="
echo "时间: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo ""

if [[ ! -f "$ENV" ]]; then
  echo "[错误] 未找到 $ENV"
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV"
set +a

echo "--- 1) 数据库连接目标（不含密码）---"
echo "DB_HOST=${DB_HOST:-<未设置>}"
echo "DB_PORT=${DB_PORT:-3306}"
echo "DB_NAME=${DB_NAME:-<未设置>}"
echo "DB_USER=${DB_USER:-<未设置>}"
if [[ -n "${DB_PASSWORD:-}" ]]; then
  echo "DB_PASSWORD=***已配置(len=${#DB_PASSWORD})***"
else
  echo "DB_PASSWORD=<未设置>"
fi

host="${DB_HOST:-}"
if [[ "$host" == "127.0.0.1" || "$host" == "localhost" ]]; then
  echo "部署形态: EC2 本机 MySQL（非 RDS 端点）"
elif [[ "$host" == *".rds.amazonaws.com"* || "$host" == *".rds."* ]]; then
  echo "部署形态: AWS RDS"
else
  echo "部署形态: 远程/其他主机 ($host)"
fi

echo ""
echo "--- 2) 本机 MySQL 监听 ---"
ss -tlnp 2>/dev/null | grep -E ':3306|:33060' || echo "未发现 3306 监听"

echo ""
echo "--- 3) 应用账号连通性 (SELECT 1) ---"
SERVER_DIR="/var/www/damatong/current/server"
[[ -d "$SERVER_DIR" ]] || SERVER_DIR="/var/www/click-send-shop/server"
cd "$SERVER_DIR"
export ENV_FILE="$ENV"
node <<'NODE'
require('dotenv').config({ path: process.env.ENV_FILE });
const mysql = require('mysql2/promise');
(async () => {
  const t0 = Date.now();
  const c = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectTimeout: 8000,
  });
  const [rows] = await c.query('SELECT 1 AS ok, DATABASE() AS db, VERSION() AS ver');
  await c.end();
  console.log('结果: 成功');
  console.log('耗时_ms:', Date.now() - t0);
  console.log('当前库:', rows[0].db);
  console.log('MySQL版本:', String(rows[0].ver).split('-')[0]);
})().catch((e) => {
  console.log('结果: 失败');
  console.log('错误:', e.code || e.errno || '', e.message);
  process.exit(1);
});
NODE

echo ""
echo "--- 4) 备份 / MFA / Cloudflare 配置（不含密钥内容）---"
for key in BACKUP_ENCRYPTION_KEY BACKUP_ENCRYPTION_KEY_ID ADMIN_MFA_SECRET_KEY JWT_SECRET CF_API_TOKEN CF_ZONE_ID; do
  val="${!key:-}"
  if [[ -z "$val" ]]; then
    echo "$key=<未设置>"
  else
    echo "$key=***已配置(len=${#val})***"
  fi
done
if [[ -n "${ADMIN_MFA_SECRET_KEY:-}" && -n "${JWT_SECRET:-}" && "$ADMIN_MFA_SECRET_KEY" == "$JWT_SECRET" ]]; then
  echo "ADMIN_MFA 与 JWT: 相同（不建议）"
else
  echo "ADMIN_MFA 与 JWT: 已分离"
fi

echo ""
echo "--- 5) 一键部署前置（摘要）---"
node scripts/backup/check-backup-prereqs.js 2>&1 | grep -E '^\[(OK|FAIL)\]|^DB_|prerequisite check' || true

echo ""
echo "--- 6) API 健康 ---"
curl -sf --max-time 5 "http://127.0.0.1:${PORT:-3001}/api/health/ready" || echo "health/ready 失败"
echo ""

echo ""
echo "--- 7) 运行环境 ---"
echo "EC2 区域(元数据): $(curl -sf --max-time 2 http://169.254.169.254/latest/meta-data/placement/region 2>/dev/null || echo 不可用)"
echo "current release: $(readlink -f /var/www/damatong/current 2>/dev/null || echo N/A)"
pm2 show gc-api 2>/dev/null | grep -E 'status|script path' | sed 's/^/  /' || true
df -h / | tail -1 | sed 's/^/  磁盘: /'

echo ""
echo "========== 检查结束 =========="

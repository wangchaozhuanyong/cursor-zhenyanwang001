#!/usr/bin/env bash
# 生成强 JWT_SECRET，重启 gc-api，验证健康
set -e

ENV_FILE=/var/www/click-send-shop/server/.env

echo '--- current JWT_SECRET length ---'
awk -F= '/^JWT_SECRET=/{print "  len=" length($2)}' "$ENV_FILE"

echo
echo '--- generate 96-char strong secret (openssl rand -hex 48) ---'
NEW_SECRET=$(openssl rand -hex 48)
echo "  new len=${#NEW_SECRET}"

echo
echo '--- backup .env then replace ---'
cp -p "$ENV_FILE" "$ENV_FILE.bak.$(date +%s)"
sed -i "s#^JWT_SECRET=.*#JWT_SECRET=$NEW_SECRET#" "$ENV_FILE"
chmod 600 "$ENV_FILE"
echo '  .env updated'
awk -F= '/^JWT_SECRET=/{print "  current len=" length($2)}' "$ENV_FILE"

echo
echo '--- pm2 restart ---'
cd /var/www/click-send-shop/server
pm2 delete gc-api 2>/dev/null || true
pm2 start ecosystem.config.cjs --only gc-api --env production
pm2 save

sleep 4
echo
echo '--- health check ---'
for i in 1 2 3 4 5 6 7 8; do
  c=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:3001/api/health/live" 2>/dev/null)
  echo "  attempt $i -> $c"
  [ "$c" = "200" ] && break
  sleep 2
done

if [ "$c" != "200" ]; then
  echo
  echo '--- last error logs ---'
  pm2 logs gc-api --lines 20 --nostream --err 2>&1 | tail -25
  exit 1
fi

echo
echo '--- /api/health/live response ---'
curl -s "http://127.0.0.1:3001/api/health/live"
echo
echo
echo '--- /api/health/ready response ---'
curl -s "http://127.0.0.1:3001/api/health/ready"
echo

echo
echo '--- public ---'
curl -s -o /dev/null -w "  http://13.214.165.214/                  -> %{http_code}\n" http://13.214.165.214/ --max-time 5
curl -s -o /dev/null -w "  http://13.214.165.214/api/health/live   -> %{http_code}\n" http://13.214.165.214/api/health/live --max-time 5
curl -s -o /dev/null -w "  http://13.214.165.214/api/health/ready  -> %{http_code}\n" http://13.214.165.214/api/health/ready --max-time 5

echo
pm2 list

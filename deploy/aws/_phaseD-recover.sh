#!/usr/bin/env bash
# 紧急恢复：把 NODE_ENV 改回 development（与之前在线状态一致），让业务先跑
# 注：生产模式 (NODE_ENV=production) 需要：
#   1. 一个域名
#   2. 一个 https SSL 证书
#   3. PUBLIC_APP_URL=https://your-domain.com
# 这些都要后续步骤补，现在先恢复业务
set +e

ENV_FILE=/var/www/click-send-shop/server/.env

echo '--- before ---'
grep -E '^(NODE_ENV|PUBLIC_APP_URL|JWT_SECRET)=' "$ENV_FILE" | sed -E 's/(JWT_SECRET=)(.).*/\1\2***/'

echo
echo '--- 改 NODE_ENV=development (临时恢复)，保留新 JWT_SECRET ---'
sed -i 's/^NODE_ENV=.*/NODE_ENV=development/' "$ENV_FILE"

# 把 ecosystem 的 env_production 也改成 development，避免 --env production 又强制覆盖
ECO=/var/www/click-send-shop/server/ecosystem.config.cjs
sed -i "s/NODE_ENV: 'production'/NODE_ENV: 'development'/g" "$ECO"

echo '--- after ---'
grep -E '^(NODE_ENV)=' "$ENV_FILE"
grep "NODE_ENV" "$ECO" | head -3

echo
echo '--- pm2 重启 ---'
cd /var/www/click-send-shop/server
pm2 delete gc-api 2>/dev/null
pm2 start ecosystem.config.cjs --only gc-api
pm2 save

sleep 5

echo
echo '--- 健康检查 ---'
for i in 1 2 3 4 5 6 7 8; do
  c=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/api/health/live --max-time 3 2>/dev/null)
  echo "  attempt $i -> $c"
  [ "$c" = "200" ] && break
  sleep 2
done

echo
echo '--- pm2 list ---'
pm2 list
echo
echo '--- 公网 ---'
curl -s -o /dev/null -w "  http://13.214.165.214/                  -> %{http_code}\n" http://13.214.165.214/ --max-time 5
curl -s -o /dev/null -w "  http://13.214.165.214/api/health/live   -> %{http_code}\n" http://13.214.165.214/api/health/live --max-time 5
curl -s -o /dev/null -w "  http://13.214.165.214/api/health/ready  -> %{http_code}\n" http://13.214.165.214/api/health/ready --max-time 5
echo
echo '--- 端口 3001 ---'
ss -ltnp 2>/dev/null | grep 3001

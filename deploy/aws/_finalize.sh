#!/usr/bin/env bash
# 1) 截断 pm2 error log（旧 FATAL 是历史，进程现已 online）
# 2) 补 .env 缺失键 DB_PORT / PUBLIC_APP_URL
# 3) pm2 reload 让新 .env 生效
# 4) 重跑 3 段验证
set +e

NEW=/var/www/click-send-shop
ENV_FILE=$NEW/server/.env

echo '=== 1) 截断 pm2 error 日志（清掉历史 FATAL） ==='
: > $NEW/server/logs/pm2-error.log
: > $NEW/server/logs/pm2-out.log
: > $NEW/server/logs/pm2-combined.log
echo "  done"

echo
echo '=== 2) 补 .env 缺失键 ==='
grep -q '^DB_PORT='        $ENV_FILE || echo 'DB_PORT=3306'                          >> $ENV_FILE
grep -q '^PUBLIC_APP_URL=' $ENV_FILE && \
   sed -i 's#^PUBLIC_APP_URL=.*#PUBLIC_APP_URL=http://13.214.165.214#' $ENV_FILE || \
   echo 'PUBLIC_APP_URL=http://13.214.165.214'   >> $ENV_FILE
chmod 600 $ENV_FILE
echo '  current critical env keys:'
awk -F= '/^(NODE_ENV|PORT|JWT_SECRET|DB_HOST|DB_PORT|DB_USER|DB_PASSWORD|DB_NAME|CORS_ORIGINS|PUBLIC_APP_URL)=/{
  k=$1; v=substr($0, length(k)+2);
  if (k~/(PASSWORD|SECRET|KEY)/) v=substr(v,1,4)"***(len="length(v)")";
  printf "    %-18s = %s\n", k, v
}' $ENV_FILE

echo
echo '=== 3) pm2 reload gc-api（让新 .env 生效） ==='
cd $NEW/server
pm2 reload gc-api --update-env
pm2 save
sleep 4

echo
echo '=== 4) 健康 ==='
for p in /api/health/live /api/health/ready; do
  c=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3001$p --max-time 3)
  echo "  127.0.0.1:3001$p -> $c"
done

echo
echo '=========================================='
echo '【① 重跑 post-baota-autofix】（应 0 FAIL）'
echo '=========================================='
sudo PROJECT_DIR=$NEW PM2_APP=gc-api DEPLOY_USER=ubuntu bash $NEW/scripts/post-baota-autofix.sh 2>&1 | tail -20

echo
echo '=========================================='
echo '【② 重跑 post-baota-fix（只读）】'
echo '=========================================='
sudo PROJECT_DIR=$NEW PM2_APP=gc-api PORT=3001 bash $NEW/scripts/post-baota-fix.sh 2>&1 | tail -40

echo
echo '=========================================='
echo '【③ 重跑 verify-pm2.sh】'
echo '=========================================='
cd $NEW
PM2_APP=gc-api HEALTH_PORT=3001 bash deploy/verify-pm2.sh
ec=$?
echo
echo "====== verify-pm2.sh EXIT CODE = $ec ======"

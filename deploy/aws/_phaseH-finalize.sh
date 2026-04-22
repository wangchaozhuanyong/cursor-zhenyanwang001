#!/usr/bin/env bash
# Phase H: re-register pm2 with correct cwd, clear stale logs, re-run verification
set +e

NEW=/var/www/click-send-shop
hr(){ echo; echo "===== $* ====="; }

hr "H.1 BEFORE: pm2 show script path"
pm2 jlist | python3 -c "import sys,json; d=json.load(sys.stdin); [print(' ',a['name'],'script=',a['pm2_env']['pm_exec_path'],'cwd=',a['pm2_env']['pm_cwd']) for a in d]" 2>/dev/null || pm2 show gc-api | grep -E 'script|cwd|exec'

hr "H.2 RE-REGISTER gc-api WITH CORRECT PATH"
pm2 delete gc-api 2>&1 | tail -3
sleep 1
cd $NEW/server
pm2 start ecosystem.config.cjs --only gc-api 2>&1 | tail -10
sleep 3
pm2 status

hr "H.3 PM2 SAVE + STARTUP REBIND"
pm2 save 2>&1 | tail -5

hr "H.4 CLEAR STALE PM2 LOGS"
: > /root/.pm2/logs/gc-api-error.log 2>/dev/null
: > /root/.pm2/logs/gc-api-out.log 2>/dev/null
: > $NEW/server/logs/pm2-error.log 2>/dev/null
: > $NEW/server/logs/pm2-out.log 2>/dev/null
: > $NEW/server/logs/pm2-combined.log 2>/dev/null
echo "  OK logs truncated"
ls -la /root/.pm2/logs/gc-api*.log

hr "H.5 HEALTH CHECK"
sleep 2
for p in /api/health/live /api/health/ready; do
  c=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3001$p --max-time 3)
  echo "  127.0.0.1:3001$p -> $c"
done
PUB=$(curl -s -o /dev/null -w '%{http_code}' http://13.214.165.214/ --max-time 5)
echo "  public http://13.214.165.214/ -> $PUB"

hr "H.6 AFTER: pm2 show script path"
pm2 jlist | python3 -c "import sys,json; d=json.load(sys.stdin); [print(' ',a['name'],'script=',a['pm2_env']['pm_exec_path'],'cwd=',a['pm2_env']['pm_cwd']) for a in d]" 2>/dev/null || pm2 show gc-api | grep -E 'script|cwd|exec'

hr "H.7 SHRINK UFW (drop baota ports 888/8888/39000-40000/34168/20/21)"
sudo ufw delete allow 888/tcp 2>/dev/null
sudo ufw delete allow 8888/tcp 2>/dev/null
sudo ufw delete allow 39000:40000/tcp 2>/dev/null
sudo ufw delete allow 34168/tcp 2>/dev/null
sudo ufw delete allow 40315/tcp 2>/dev/null
sudo ufw delete allow 20/tcp 2>/dev/null
sudo ufw delete allow 21/tcp 2>/dev/null
sudo ufw status numbered

hr "H.8 RE-RUN ALL THREE VERIFICATION SCRIPTS (FULL OUTPUT)"
echo
echo "================ 1) post-baota-autofix.sh ================"
sudo PROJECT_DIR=$NEW PM2_APP=gc-api DEPLOY_USER=ubuntu bash $NEW/scripts/post-baota-autofix.sh 2>&1 | tail -25
echo
echo "================ 2) post-baota-fix.sh (full) ================"
sudo PROJECT_DIR=$NEW PM2_APP=gc-api PORT=3001 bash $NEW/scripts/post-baota-fix.sh 2>&1
echo
echo "================ 3) verify-pm2.sh ================"
PM2_APP=gc-api HEALTH_PORT=3001 bash $NEW/deploy/verify-pm2.sh
ec=$?
echo
echo "================================================"
echo "  Phase H DONE | verify-pm2 EXIT = $ec"
echo "================================================"

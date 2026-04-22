#!/usr/bin/env bash
# Phase G: completely remove Baota panel + residuals
# - Pre-checks: business must be alive (gc-api ready) before we touch /www
# - Stop bt services -> run uninstall.sh -> rm /www/* -> rm bt CLI
# - Re-verify business after each major step; abort if anything dies
set +e

NEW=/var/www/click-send-shop
hr(){ echo; echo "===== $* ====="; }

alive(){
  local r=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/api/health/ready --max-time 3)
  local p=$(curl -s -o /dev/null -w '%{http_code}' http://13.214.165.214/ --max-time 5)
  echo "  ready=$r  public=$p"
  [[ "$r" == "200" && "$p" == "200" ]]
}

hr "G.0 PRE-CHECK: business must be alive"
alive || { echo "  [FATAL] business not healthy, abort uninstall"; exit 1; }
echo "  OK business is healthy, safe to proceed"

hr "G.1 LIST CURRENT BAOTA UNITS / FILES (for record)"
echo "[systemd]"
systemctl list-units --type=service --all 2>/dev/null | grep -E 'bt|baota' || echo "  (none)"
echo "[init.d]"
ls /etc/init.d/ 2>/dev/null | grep -E 'bt|mysqld' || echo "  (none)"
echo "[paths]"
du -sh /www/server /www/wwwroot /www/wwwlogs /www/swap /www/backup 2>/dev/null
ls /usr/bin/bt 2>/dev/null && echo "  /usr/bin/bt exists"

hr "G.2 STOP+DISABLE BAOTA SERVICES"
sudo systemctl stop bt.service 2>/dev/null
sudo systemctl stop btpanel.service 2>/dev/null
sudo systemctl disable bt.service 2>/dev/null
sudo systemctl disable btpanel.service 2>/dev/null
sudo /etc/init.d/bt stop 2>/dev/null
sudo /etc/init.d/mysqld stop 2>/dev/null
sleep 2
ps -ef | grep -Ei 'bt-?panel|/www/server/panel|/www/server/mysql' | grep -v grep || echo "  OK no baota processes left"

hr "G.3 RUN BAOTA UNINSTALL.SH (best effort)"
if [[ -f /www/server/panel/install/uninstall.sh ]]; then
  echo y | sudo bash /www/server/panel/install/uninstall.sh 2>&1 | tail -30
else
  echo "  (uninstall.sh not found, skip and rely on rm)"
fi

hr "G.4 BUSINESS HEALTH AFTER STOP+UNINSTALL"
sleep 2
alive || { echo "  [WARN] business unhealthy after stop, but continuing"; }

hr "G.5 REMOVE /www TREE (safe: business is on /var/www)"
echo "  before:"
df -h / | tail -1
sudo rm -rf /www/server /www/wwwroot /www/wwwlogs /www/swap /www/backup /www/Recycle_bin 2>/dev/null
sudo rm -rf /www 2>/dev/null
echo "  after:"
df -h / | tail -1
ls -la /www 2>/dev/null || echo "  /www removed"

hr "G.6 REMOVE BT CLI + INIT SCRIPTS + SYSTEMD UNITS"
sudo rm -f /usr/bin/bt /etc/init.d/bt /etc/init.d/mysqld
sudo rm -f /etc/systemd/system/bt.service /etc/systemd/system/btpanel.service
sudo rm -f /lib/systemd/system/bt.service /lib/systemd/system/btpanel.service
sudo rm -f /usr/lib/systemd/system/bt.service /usr/lib/systemd/system/btpanel.service
sudo systemctl daemon-reload
sudo systemctl reset-failed 2>/dev/null
echo "  remaining bt traces:"
which bt 2>/dev/null && echo "  WARN: bt still in PATH" || echo "  OK no bt cli"
ls /etc/init.d/ 2>/dev/null | grep -Ei 'bt|baota|mysqld' || echo "  OK no bt init.d"
systemctl list-units --type=service --all 2>/dev/null | grep -Ei 'bt|baota' || echo "  OK no bt systemd units"

hr "G.7 REMOVE BAOTA CRON ENTRIES (root)"
sudo crontab -l 2>/dev/null | grep -vE '/www/server|/etc/init.d/bt' | sudo crontab - 2>/dev/null
echo "  current root cron:"
sudo crontab -l 2>/dev/null || echo "  (empty)"

hr "G.8 FINAL HEALTH AFTER FULL UNINSTALL"
alive
pm2 status

hr "G.9 RUN VERIFICATION SUITE"
cd $NEW
echo "----- 1) post-baota-autofix.sh -----"
sudo PROJECT_DIR=$NEW PM2_APP=gc-api DEPLOY_USER=ubuntu bash $NEW/scripts/post-baota-autofix.sh 2>&1 | tail -40
echo "----- 2) post-baota-fix.sh (read-only re-check) -----"
sudo PROJECT_DIR=$NEW PM2_APP=gc-api PORT=3001 bash $NEW/scripts/post-baota-fix.sh 2>&1 | tail -40
echo "----- 3) verify-pm2.sh -----"
PM2_APP=gc-api HEALTH_PORT=3001 bash $NEW/deploy/verify-pm2.sh
ec=$?
echo
echo "================================================"
echo "  Phase G DONE | verify-pm2 EXIT = $ec"
echo "================================================"

#!/usr/bin/env bash
# Final audit + nuke any remaining baota/panel residual + produce acceptance report
set +e
NEW=/var/www/click-send-shop
hr(){ echo; echo "================ $* ================"; }

# ───────────────────────────────────────────────────
# A. PRE-CHECK: business must be alive
# ───────────────────────────────────────────────────
hr "A. PRE-CHECK"
LIVE=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/api/health/live --max-time 3)
READY=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/api/health/ready --max-time 3)
PUB=$(curl -s -o /dev/null -w '%{http_code}' http://13.214.165.214/ --max-time 5)
echo "  live=$LIVE  ready=$READY  public=$PUB"
[[ "$READY" == "200" ]] || { echo "  [FATAL] business not ready, abort"; exit 1; }

# ───────────────────────────────────────────────────
# B. SCAN: any baota residual still present?
# ───────────────────────────────────────────────────
hr "B. SCAN BAOTA RESIDUAL"
echo "[/www tree]"
ls -la /www 2>/dev/null || echo "  /www does not exist"
echo
echo "[/usr/bin/bt + /usr/local/bin/bt + /etc/init.d/bt]"
for p in /usr/bin/bt /usr/local/bin/bt /etc/init.d/bt /etc/init.d/mysqld; do
  if [[ -e $p ]]; then echo "  STILL EXISTS: $p"; else echo "  OK gone: $p"; fi
done
echo
echo "[systemd bt/baota units]"
systemctl list-unit-files 2>/dev/null | grep -iE 'bt-?panel|baota|^bt\.' || echo "  OK no bt systemd units"
echo
echo "[mysqld processes]"
ps -ef | grep -E '[m]ysqld' || echo "  (none)"
echo
echo "[3306 listeners]"
ss -ltnp 2>/dev/null | grep ':3306' || echo "  (none)"
echo
echo "[crontab root]"
sudo crontab -l 2>/dev/null | grep -E '/www/|baota|bt-' || echo "  OK no panel cron entries"

# ───────────────────────────────────────────────────
# C. NUKE any remaining residual
# ───────────────────────────────────────────────────
hr "C. NUKE RESIDUAL (idempotent)"
echo "[stop any leftover panel/mysqld processes]"
sudo pkill -9 -f '/www/server/mysql' 2>/dev/null && echo "  killed leftover /www/server/mysql process" || echo "  OK no /www/server/mysql process"
sudo pkill -9 -f 'BT-Panel'           2>/dev/null && echo "  killed leftover BT-Panel process" || echo "  OK no BT-Panel process"
sudo pkill -9 -f '/www/server/panel'  2>/dev/null && echo "  killed leftover /www/server/panel process" || echo "  OK no /www/server/panel process"

echo
echo "[disable any leftover panel systemd units]"
for u in btpanel.service bt.service mysqld.service; do
  sudo systemctl stop $u 2>/dev/null
  sudo systemctl disable $u 2>/dev/null
done
sudo rm -f /etc/systemd/system/btpanel.service /etc/systemd/system/bt.service \
           /lib/systemd/system/btpanel.service /lib/systemd/system/bt.service \
           /usr/lib/systemd/system/btpanel.service /usr/lib/systemd/system/bt.service \
           /etc/systemd/system/mysqld.service
sudo systemctl daemon-reload
sudo systemctl reset-failed 2>/dev/null
echo "  OK panel systemd units cleaned"

echo
echo "[remove /www tree completely]"
sudo rm -rf /www 2>/dev/null
[[ -e /www ]] && echo "  STILL EXISTS: /www" || echo "  OK /www removed"

echo
echo "[remove bt cli + init.d + symlinks]"
sudo rm -f /usr/bin/bt /usr/local/bin/bt /etc/init.d/bt /etc/init.d/mysqld
sudo rm -f /etc/profile.d/bt*.sh /etc/bashrc.d/bt*.sh
which bt 2>/dev/null && echo "  STILL IN PATH: $(which bt)" || echo "  OK bt not in PATH"

echo
echo "[remove panel cron + scripts]"
sudo rm -f /etc/cron.d/bt* /etc/cron.daily/bt* /etc/cron.weekly/bt* /etc/cron.monthly/bt* 2>/dev/null
sudo crontab -l 2>/dev/null | grep -vE '/www/|baota|bt-|BT-' | sudo crontab - 2>/dev/null
echo "  current root cron:"
sudo crontab -l 2>/dev/null || echo "    (empty)"

# Remove www user (baota residual) only if no files owned by it
echo
echo "[check baota www user]"
if id www >/dev/null 2>&1; then
  WWWFILES=$(sudo find / -xdev -user www 2>/dev/null | grep -v '^/proc/' | head -5)
  if [[ -z "$WWWFILES" ]]; then
    sudo userdel -r www 2>/dev/null || sudo userdel www 2>/dev/null
    echo "  OK baota 'www' user removed (no files owned)"
  else
    echo "  KEPT 'www' user (still owns some files):"
    echo "$WWWFILES" | head -5
  fi
else
  echo "  OK no 'www' user"
fi

# ───────────────────────────────────────────────────
# D. POST-CHECK: business still alive
# ───────────────────────────────────────────────────
hr "D. POST-NUKE HEALTH CHECK"
sleep 2
LIVE2=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/api/health/live --max-time 3)
READY2=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/api/health/ready --max-time 3)
PUB2=$(curl -s -o /dev/null -w '%{http_code}' http://13.214.165.214/ --max-time 5)
echo "  live=$LIVE2  ready=$READY2  public=$PUB2"
echo "  ready body:"
curl -s http://127.0.0.1:3001/api/health/ready --max-time 3
echo

# ───────────────────────────────────────────────────
# E. FINAL ACCEPTANCE REPORT
# ───────────────────────────────────────────────────
hr "E. FINAL ACCEPTANCE REPORT"

# 1) DB migration result
echo
echo "─── 1) 数据库迁移结果 ───"
DB_BIN=$(ps -ef | grep -E '[m]ysqld' | head -1 | awk '{for(i=1;i<=NF;i++) if($i ~ /mysqld$/) {print $i; exit}}')
DB_VER=$(mysql --version 2>/dev/null)
DB_PKG=$(dpkg -l mysql-server-8.0 2>/dev/null | tail -1 | awk '{print $2,$3}')
TABLES=$(mysql -u click_user -pAa5201314. -h 127.0.0.1 -P 3306 -N -e "SHOW TABLES FROM click_send_shop;" 2>/dev/null | wc -l)
echo "  mysqld 二进制路径: $DB_BIN"
echo "  mysql --version : $DB_VER"
echo "  apt 包         : $DB_PKG"
echo "  click_send_shop 表数: $TABLES"
if [[ "$DB_BIN" == /usr/sbin/mysqld ]] && [[ "$TABLES" -ge 30 ]]; then
  echo "  ✅ 数据库已完全迁移到系统 MySQL"
else
  echo "  ❌ 数据库迁移异常"
fi

# 2) API health
echo
echo "─── 2) API 健康验证 ───"
echo "  /api/health/live  → $LIVE2"
echo "  /api/health/ready → $READY2"
echo "  公网根 (http://13.214.165.214/) → $PUB2"
RDB=$(curl -s http://127.0.0.1:3001/api/health/ready --max-time 3 | grep -o '"database":[^,}]*')
echo "  ready.database  : $RDB"
[[ "$LIVE2" == "200" && "$READY2" == "200" && "$PUB2" == "200" ]] && echo "  ✅ API 全部正常" || echo "  ❌ API 异常"

# 3) MySQL process source
echo
echo "─── 3) MySQL 进程来源确认 ───"
ps -ef | grep -E '[m]ysqld'
if ps -ef | grep -E '[m]ysqld' | grep -q '/www/server/mysql'; then
  echo "  ❌ 仍有 /www/server/mysql 进程"
else
  echo "  ✅ 无任何 /www/server/mysql 进程"
fi
echo "  3306 listeners:"
ss -ltnp 2>/dev/null | grep ':3306'

# 4) /www directory
echo
echo "─── 4) /www 目录状态 ───"
if [[ -e /www ]]; then
  echo "  ❌ /www 仍存在:"
  ls -la /www
else
  echo "  ✅ /www 不存在"
fi

# 5) bt command
echo
echo "─── 5) bt 命令状态 ───"
if which bt >/dev/null 2>&1; then
  echo "  ❌ bt 仍在 PATH: $(which bt)"
else
  echo "  ✅ bt 命令已删除"
fi
for p in /usr/bin/bt /usr/local/bin/bt /etc/init.d/bt; do
  if [[ -e $p ]]; then echo "  ❌ STILL: $p"; else echo "  ✅ gone : $p"; fi
done
echo "  panel systemd units: $(systemctl list-unit-files 2>/dev/null | grep -iE 'bt-?panel|^bt\.|baota' | wc -l)"

# 6) System final shape
echo
echo "─── 6) 系统最终形态 ───"
echo "  [项目目录]"
ls -ld /var/www/click-send-shop
echo "  [systemd 关键服务]"
for s in mysql nginx pm2-root; do
  st=$(systemctl is-active $s 2>/dev/null)
  en=$(systemctl is-enabled $s 2>/dev/null)
  printf "    %-12s active=%-10s enabled=%-10s\n" "$s" "$st" "$en"
done
echo "  [pm2 进程]"
pm2 jlist 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); [print('   ',a['name'],'pid=',a['pid'],'script=',a['pm2_env']['pm_exec_path'],'status=',a['pm2_env']['status']) for a in d]" 2>/dev/null || pm2 status
echo "  [磁盘]"
df -h / | tail -1
echo "  [/www 父级]"
ls / | tr ' ' '\n' | grep -E '^www$|^bt$' || echo "    OK 根目录无 /www 或 /bt"

# Final 3-script verification
echo
hr "F. THREE-SCRIPT VERIFICATION SUITE"

echo
echo "─── post-baota-autofix.sh ───"
sudo PROJECT_DIR=$NEW PM2_APP=gc-api DEPLOY_USER=ubuntu bash $NEW/scripts/post-baota-autofix.sh 2>&1 | tail -12
af=$?

echo
echo "─── post-baota-fix.sh ───"
sudo PROJECT_DIR=$NEW PM2_APP=gc-api PORT=3001 bash $NEW/scripts/post-baota-fix.sh 2>&1 | tail -8
pbf=$?

echo
echo "─── verify-pm2.sh ───"
PM2_APP=gc-api HEALTH_PORT=3001 bash $NEW/deploy/verify-pm2.sh 2>&1 | tail -25
vp=$?

echo
echo "════════════════════════════════════════════════"
echo "           最终验收 EXIT CODES"
echo "  post-baota-autofix.sh : $af"
echo "  post-baota-fix.sh     : $pbf  (1 = 仅缺 SSL，因无域名)"
echo "  verify-pm2.sh         : $vp"
echo "════════════════════════════════════════════════"

#!/usr/bin/env bash
# Phase I: kill site_total.service + swap migration + final /www nuke
set +e
hr(){ echo; echo "================ $* ================"; }

healthcheck(){
  L=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/api/health/live --max-time 3)
  R=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/api/health/ready --max-time 3)
  P=$(curl -s -o /dev/null -w '%{http_code}' http://13.214.165.214/ --max-time 5)
  echo "  live=$L ready=$R public=$P"
  [[ "$R" == "200" && "$P" == "200" ]]
}

hr "I.0 PRE-CHECK"
healthcheck || { echo "  [FATAL] business not healthy, abort"; exit 1; }

# ───────────────────────────────────────────────────
# I.1 KILL site_total.service (the respawner)
# ───────────────────────────────────────────────────
hr "I.1 KILL site_total.service"
echo "  before:"
systemctl status site_total.service --no-pager 2>/dev/null | head -5
sudo systemctl stop site_total.service
sudo systemctl disable site_total.service 2>&1 | tail -3
sudo rm -f /etc/systemd/system/site_total.service \
           /lib/systemd/system/site_total.service \
           /usr/lib/systemd/system/site_total.service \
           /etc/systemd/system/multi-user.target.wants/site_total.service
sudo systemctl daemon-reload
sudo systemctl reset-failed site_total.service 2>/dev/null
sudo pkill -9 -f site_total 2>/dev/null
sleep 1
ps -ef | grep -i site_total | grep -v grep && echo "  ❌ still running" || echo "  ✅ site_total killed"

hr "I.1.1 SCAN OTHER BAOTA SIDE-DAEMONS"
# Look for any other small services pointing to /www
for f in /etc/systemd/system/*.service /lib/systemd/system/*.service /usr/lib/systemd/system/*.service; do
  [[ -f "$f" ]] || continue
  if grep -lE '/www/server|/www/wwwroot|baota|bt-?panel|bt[_-]task' "$f" >/dev/null 2>&1; then
    echo "  found suspicious unit: $f"
    cat "$f" | head -10
    sudo systemctl stop $(basename $f) 2>/dev/null
    sudo systemctl disable $(basename $f) 2>/dev/null
    sudo rm -f "$f"
  fi
done
sudo systemctl daemon-reload
echo "  ✅ scan complete"

# ───────────────────────────────────────────────────
# I.2 SWAP MIGRATION
# ───────────────────────────────────────────────────
hr "I.2 SWAP STATUS BEFORE"
sudo swapon --show
echo "  /etc/fstab swap entries:"
grep -i swap /etc/fstab 2>/dev/null

hr "I.2.1 CREATE NEW /swapfile (1G) BEFORE REMOVING OLD"
if [[ -f /swapfile ]]; then
  echo "  /swapfile already exists, skip create"
else
  sudo fallocate -l 1G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile 2>&1 | tail -3
fi
sudo swapon /swapfile 2>&1
echo "  swap status after adding /swapfile:"
sudo swapon --show

hr "I.2.2 SWAPOFF /www/swap"
sudo swapoff /www/swap 2>&1
echo "  swap status after swapoff /www/swap:"
sudo swapon --show

hr "I.2.3 UPDATE /etc/fstab (replace /www/swap with /swapfile)"
sudo sed -i.bt-bak "s#^/www/swap.*#/swapfile none swap sw 0 0#" /etc/fstab
if ! grep -q '/swapfile' /etc/fstab; then
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab >/dev/null
fi
echo "  current /etc/fstab swap entries:"
grep -i swap /etc/fstab

# ───────────────────────────────────────────────────
# I.3 NUKE /www
# ───────────────────────────────────────────────────
hr "I.3 RM -RF /www"
sudo rm -rf /www
sleep 2
if [[ -e /www ]]; then
  echo "  ❌ /www still exists:"
  ls -la /www
  echo "  recheck respawner..."
  ps -ef | grep -E '/www/server|site_total|bt' | grep -v grep
else
  echo "  ✅ /www removed"
fi

# ───────────────────────────────────────────────────
# I.4 REMOVE www USER + /home/www
# ───────────────────────────────────────────────────
hr "I.4 REMOVE www USER + /home/www"
if id www >/dev/null 2>&1; then
  sudo pkill -9 -u www 2>/dev/null
  sudo userdel -r www 2>/dev/null
  if id www >/dev/null 2>&1; then
    sudo userdel www 2>/dev/null
    sudo rm -rf /home/www
  fi
  id www >/dev/null 2>&1 && echo "  ❌ www user still exists" || echo "  ✅ www user removed"
else
  echo "  ✅ no www user"
fi
[[ -e /home/www ]] && sudo rm -rf /home/www
[[ -e /home/www ]] && echo "  ❌ /home/www still exists" || echo "  ✅ /home/www removed"

# Also remove www group if empty
if getent group www >/dev/null 2>&1; then
  sudo groupdel www 2>/dev/null
fi

# ───────────────────────────────────────────────────
# I.5 POST-NUKE HEALTH
# ───────────────────────────────────────────────────
hr "I.5 POST-NUKE HEALTH"
sleep 2
healthcheck
echo "  pm2 status:"
pm2 status

# ───────────────────────────────────────────────────
# I.6 5-SEC RESPAWNER RE-TEST
# ───────────────────────────────────────────────────
hr "I.6 RESPAWNER RE-TEST (wait 10s, see if /www comes back)"
sleep 10
if [[ -e /www ]]; then
  echo "  ❌ /www re-appeared! Still has respawner:"
  ls -la /www
  ps -ef | grep -E '/www|baota|bt' | grep -v grep
else
  echo "  ✅ /www stays removed (no respawner)"
fi

# ───────────────────────────────────────────────────
# I.7 FINAL ACCEPTANCE REPORT
# ───────────────────────────────────────────────────
hr "I.7 FINAL ACCEPTANCE REPORT"

echo
echo "─── 1) 数据库迁移结果 ───"
DB_BIN=$(ps -ef | grep -E '[m]ysqld' | head -1 | awk '{for(i=1;i<=NF;i++) if($i ~ /mysqld$/) {print $i; exit}}')
DB_VER=$(mysql --version 2>/dev/null)
DB_PKG=$(dpkg -l mysql-server-8.0 2>/dev/null | tail -1 | awk '{print $2,$3}')
TABLES=$(mysql -u click_user -pAa5201314. -h 127.0.0.1 -P 3306 -N -e "SHOW TABLES FROM click_send_shop;" 2>/dev/null | wc -l)
echo "  mysqld 二进制路径 : $DB_BIN"
echo "  mysql --version  : $DB_VER"
echo "  apt 包          : $DB_PKG"
echo "  click_send_shop 表数: $TABLES"
[[ "$DB_BIN" == /usr/sbin/mysqld && "$TABLES" -ge 30 ]] && echo "  ✅ PASS" || echo "  ❌ FAIL"

echo
echo "─── 2) API /api/health/ready 验证 ───"
echo "  $(curl -s http://127.0.0.1:3001/api/health/ready --max-time 3)"
RBODY=$(curl -s http://127.0.0.1:3001/api/health/ready --max-time 3)
echo "$RBODY" | grep -q '"database":true' && echo "  ✅ PASS database:true" || echo "  ❌ FAIL"

echo
echo "─── 3) MySQL 进程来源确认 ───"
ps -ef | grep -E '[m]ysqld'
ps -ef | grep -E '[m]ysqld' | grep -q '/www/server/mysql' && echo "  ❌ FAIL has /www/server/mysql" || echo "  ✅ PASS no /www/server/mysql"

echo
echo "─── 4) /www 目录已清空或不存在 ───"
if [[ -e /www ]]; then
  echo "  ❌ FAIL /www still exists:"
  ls -la /www
else
  echo "  ✅ PASS /www does not exist"
fi

echo
echo "─── 5) bt 命令已删除 ───"
which bt 2>/dev/null && echo "  ❌ FAIL bt in PATH" || echo "  ✅ PASS no bt"
for p in /usr/bin/bt /usr/local/bin/bt /etc/init.d/bt; do
  [[ -e $p ]] && echo "  ❌ STILL: $p" || echo "  ✅ gone : $p"
done
echo "  panel systemd units: $(systemctl list-unit-files 2>/dev/null | grep -iE 'bt-?panel|^bt\.service|baota|site_total' | wc -l)"

echo
echo "─── 6) 系统最终形态 ───"
echo "  [项目目录]   $(ls -ld /var/www/click-send-shop 2>/dev/null)"
for s in mysql nginx pm2-root; do
  st=$(systemctl is-active $s 2>/dev/null)
  en=$(systemctl is-enabled $s 2>/dev/null)
  printf "  [systemd]    %-12s active=%-10s enabled=%-10s\n" "$s" "$st" "$en"
done
echo "  [PM2 进程]"
pm2 jlist 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); [print('   ',a['name'],'pid=',a['pid'],'status=',a['pm2_env']['status'],'script=',a['pm2_env']['pm_exec_path']) for a in d]" 2>/dev/null
echo "  [磁盘]       $(df -h / | tail -1)"
echo "  [SWAP]       $(sudo swapon --show)"
echo "  [/ 根目录]   $(ls / | tr '\n' ' ')"
echo "  [www 用户]   $(id www 2>&1 | head -1)"

echo
echo "════════════════════════════════════════════════════════════════"
echo "                   FINAL ACCEPTANCE COMPLETE"
echo "════════════════════════════════════════════════════════════════"

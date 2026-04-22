#!/usr/bin/env bash
# Find who is recreating /www and nuke them
set +e
hr(){ echo; echo "================ $* ================"; }

hr "1. WHAT IS IN /www RIGHT NOW"
ls -la /www 2>/dev/null
find /www -maxdepth 3 2>/dev/null | head -30

hr "2. SWAP STATUS (is /www/swap active?)"
sudo swapon --show 2>/dev/null
cat /proc/swaps 2>/dev/null

hr "3. LSOF: who has /www open"
sudo lsof +D /www 2>/dev/null | head -30 || echo "  (no lsof matches)"

hr "4. PROCESSES with /www in command line"
ps -ef | grep -E '/www|baota|bt-?panel|bt[_-]task' | grep -v grep || echo "  (none)"

hr "5. ALL systemd units that mention /www/baota/bt"
sudo grep -rlEi '/www/server|baota|bt-?panel|bt[_-]task' /etc/systemd/ /lib/systemd/ /usr/lib/systemd/ 2>/dev/null | head -20 || echo "  (none)"

hr "6. ALL cron entries that mention /www/baota/bt"
sudo grep -rlEi '/www/server|baota|bt-?panel|bt[_-]task' /etc/cron.d/ /etc/cron.daily/ /etc/cron.hourly/ /etc/cron.weekly/ /etc/cron.monthly/ /var/spool/cron/ 2>/dev/null | head -20 || echo "  (none)"
echo "  --- root crontab ---"
sudo crontab -l 2>/dev/null
echo "  --- ubuntu crontab ---"
sudo crontab -u ubuntu -l 2>/dev/null

hr "7. /etc/init.d entries"
ls -la /etc/init.d/ 2>/dev/null | grep -vE '^total|README' | head -30

hr "8. systemd timers"
systemctl list-timers --all 2>/dev/null | grep -iE 'bt|baota|/www' || echo "  (none)"

hr "9. ALL active services that look suspicious"
systemctl list-units --type=service --state=active 2>/dev/null | grep -vE 'apt-daily|cloud-|dbus|getty|networkd|polkit|qemu|rsyslog|snap|ssh\.|systemd-|udisks|unattended|user@|console-|grub-|fwupd|multipathd|atd\.|cron\.|nginx|mysql|pm2-' | head -20

hr "10. inotifywait 5s test: who creates /www?"
sudo rm -rf /www 2>/dev/null
sleep 1
echo "  before: $(ls -la /www 2>&1 | head -3)"
sleep 5
echo "  after 5s: $(ls -la /www 2>&1 | head -3)"
echo
echo "  most recent /www create activity (auditd if installed):"
sudo ausearch -f /www -ts recent 2>/dev/null | tail -20 || echo "  (auditd not installed; install with: apt install auditd)"

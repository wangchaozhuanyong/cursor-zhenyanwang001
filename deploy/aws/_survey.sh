#!/usr/bin/env bash
echo '=== INSTALLED ==='
for c in node npm pm2 nginx mysql mariadb git certbot ufw rsync curl unzip; do
  printf '  %-10s ' "$c"
  if command -v "$c" >/dev/null 2>&1; then
    v=$("$c" --version 2>&1 | head -1)
    printf '%s  (%s)\n' "$(command -v "$c")" "$v"
  else
    echo '(missing)'
  fi
done

echo
echo '=== ENABLED SERVICES ==='
systemctl list-unit-files --state=enabled 2>/dev/null \
  | grep -E 'nginx|mysql|mariadb|pm2|bt|panel|certbot' || echo '  (none)'

echo
echo '=== LISTENING PORTS ==='
ss -ltnp 2>/dev/null | head -20

echo
echo '=== /www (BAOTA LEGACY) ==='
ls -la /www 2>/dev/null | head -20
command -v bt >/dev/null && echo 'bt EXISTS' || echo 'no bt cli'
[ -f /etc/init.d/bt ] && echo '/etc/init.d/bt EXISTS' || echo 'no /etc/init.d/bt'
systemctl list-unit-files 2>/dev/null | grep -i -E 'bt|panel|aapanel' || echo '  no bt/panel systemd unit'

echo
echo '=== /var/www / /opt ==='
ls -la /var/www 2>/dev/null
ls -la /opt 2>/dev/null | head -10

echo
echo '=== HOME (~ubuntu) ==='
ls -la ~ubuntu | head -10

echo
echo '=== EXISTING PROJECT? ==='
find /www/wwwroot /var/www /opt /home/ubuntu -maxdepth 3 -name 'package.json' 2>/dev/null | head -10
find / -maxdepth 4 -name 'click-send-shop*' 2>/dev/null | head -10
find / -maxdepth 4 -name 'cursor-zhenyanwang*' 2>/dev/null | head -10

echo
echo '=== DB DUMP ON DISK? ==='
find /www /root /home /var -maxdepth 3 -name '*.sql*' 2>/dev/null | head -20

echo
echo '=== USER ==='
id; sudo -n true 2>/dev/null && echo 'sudo: passwordless OK' || echo 'sudo: needs password'

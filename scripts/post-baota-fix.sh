#!/usr/bin/env bash
#
# 卸载宝塔后影响诊断脚本（只读 + 输出修复命令，不会自动改系统）
#
# 用法（在服务器上执行）：
#   bash scripts/post-baota-fix.sh
#
# 参数（环境变量）：
#   PROJECT_DIR   默认 /var/www/click-send-shop
#   DOMAIN        默认 YOUR_DOMAIN（仅用于打印示例命令）
#   PM2_APP       默认 gc-api
#   PORT          默认 3001
#
# 输出：
#   每一项给出 [OK] / [WARN] / [FIX]，遇到 FIX 会附上**具体修复命令**。
#
set -u
# 注意：不开启 pipefail，否则 `cmd | grep -q ...` 会因为 grep 命中后 SIGPIPE 让 cmd 退出非零，
# 进而把整个管道判为失败，导致明明已配置的项目被误报为 WARN。

PROJECT_DIR="${PROJECT_DIR:-/var/www/click-send-shop}"
DOMAIN="${DOMAIN:-YOUR_DOMAIN}"
PM2_APP="${PM2_APP:-gc-api}"
PORT="${PORT:-3001}"

ok()   { printf "  [OK]   %s\n" "$*"; }
warn() { printf "  [WARN] %s\n" "$*"; }
fix()  { printf "  [FIX]  %s\n" "$*"; }
section() { printf "\n=== %s ===\n" "$*"; }

fail_count=0
inc() { fail_count=$((fail_count+1)); }

# 1) Nginx
section "1) Nginx 是否可用"
if command -v nginx >/dev/null 2>&1; then
  ok "nginx 命令可用：$(command -v nginx)"
  if pgrep -x nginx >/dev/null 2>&1 || systemctl is-active --quiet nginx 2>/dev/null; then
    ok "nginx 进程在运行"
  else
    inc; warn "nginx 未在运行"
    fix "sudo systemctl enable --now nginx && sudo systemctl reload nginx"
  fi
  if ss -ltnp 2>/dev/null | grep -qE ':(80|443)\b'; then
    ok "80/443 已被监听"
  else
    inc; warn "80/443 无监听"
    fix "检查 /etc/nginx/sites-enabled/*.conf 是否启用站点：ls /etc/nginx/sites-enabled/"
  fi
else
  inc; warn "未安装 nginx"
  fix "sudo apt update && sudo apt install -y nginx     # 或 sudo dnf install -y nginx"
  fix "sudo cp $PROJECT_DIR/deploy/nginx/site.prod.example.conf /etc/nginx/sites-available/click-send-shop.conf"
  fix "sudo ln -sf /etc/nginx/sites-available/click-send-shop.conf /etc/nginx/sites-enabled/click-send-shop.conf"
  fix "sudo nginx -t && sudo systemctl enable --now nginx"
fi

# 2) MySQL
section "2) MySQL / 数据库可用性"
if command -v mysql >/dev/null 2>&1 || command -v mariadb >/dev/null 2>&1; then
  ok "mysql 客户端存在"
else
  inc; warn "未找到 mysql 客户端"
  fix "sudo apt install -y mysql-client     # 仅装客户端；服务端按需"
fi
if [[ -f "$PROJECT_DIR/server/.env" ]]; then
  set -a; source "$PROJECT_DIR/server/.env" 2>/dev/null || true; set +a
  HOST="${DB_HOST:-127.0.0.1}"; PRT="${DB_PORT:-3306}"; USR="${DB_USER:-root}"; NAM="${DB_NAME:-}"
  if mysql -h"$HOST" -P"$PRT" -u"$USR" -p"${DB_PASSWORD:-}" -e "USE \`$NAM\`; SELECT 1;" >/dev/null 2>&1; then
    ok ".env 中的 DB 连接成功（$USR@$HOST:$PRT/$NAM）"
  else
    inc; warn "无法用 .env 中的凭据连接 DB"
    fix "若宝塔自带 MySQL 已被卸载："
    fix "  sudo apt install -y mysql-server && sudo systemctl enable --now mysql"
    fix "  sudo mysql_secure_installation"
    fix "  恢复备份：gunzip -c /root/backup-db-*.sql.gz | mysql -u\$USER -p \$DB"
    fix "若数据库在外部（RDS）：核对 $PROJECT_DIR/server/.env 的 DB_HOST/PORT/USER/PASSWORD/NAME"
  fi
else
  warn "未找到 $PROJECT_DIR/server/.env，跳过 DB 实测"
fi

# 3) Node / npm / pm2
section "3) Node / npm / pm2"
for c in node npm pm2; do
  if command -v "$c" >/dev/null 2>&1; then
    ok "$c -v = $($c -v 2>&1 | head -1)"
  else
    inc; warn "未找到 $c"
    case "$c" in
      node|npm) fix "curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt install -y nodejs build-essential" ;;
      pm2)      fix "sudo npm i -g pm2" ;;
    esac
  fi
done

# 4) PM2 进程与端口
section "4) PM2 进程 / 端口监听"
if command -v pm2 >/dev/null 2>&1; then
  if pm2 list --no-color 2>/dev/null | grep -q "$PM2_APP"; then
    if pm2 list --no-color 2>/dev/null | grep "$PM2_APP" | grep -q online; then
      ok "$PM2_APP 在 PM2 中且 online"
    else
      inc; warn "$PM2_APP 在 PM2 中但非 online"
      fix "pm2 logs $PM2_APP --lines 80 --nostream  # 查根因"
    fi
  else
    inc; warn "PM2 中没有 $PM2_APP"
    fix "cd $PROJECT_DIR/server && pm2 start ecosystem.config.cjs --only $PM2_APP --env production && pm2 save"
  fi
fi
if ss -ltnp 2>/dev/null | grep -q ":$PORT"; then
  ok "端口 $PORT 已被监听"
else
  inc; warn "端口 $PORT 无监听"
  fix "确认 $PROJECT_DIR/server/.env 中 PORT=$PORT；并 pm2 reload $PM2_APP --update-env"
fi

# 5) 健康检查
section "5) 健康检查"
LIVE=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:${PORT}/api/health/live" 2>/dev/null || echo 000)
READY=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:${PORT}/api/health/ready" 2>/dev/null || echo 000)
if [[ "$LIVE" == "200" ]]; then ok "/api/health/live = 200"; else inc; warn "/api/health/live = $LIVE"; fi
if [[ "$READY" == "200" ]]; then ok "/api/health/ready = 200"; else inc; warn "/api/health/ready = $READY"; fix "通常是 DB 不通，参见 2)"; fi

# 6) PM2 开机自启
section "6) PM2 开机自启"
if systemctl list-unit-files 2>/dev/null | grep -q "pm2-"; then
  ok "已存在 pm2-*.service systemd 单元"
else
  inc; warn "未配置 pm2 开机自启"
  fix "pm2 startup systemd -u \"\$(whoami)\" --hp \"\$HOME\"   # 然后执行其打印的 sudo env PATH=... 行"
  fix "pm2 save"
fi

# 7) SSL
section "7) SSL 证书 / 续签"
if [[ -d /etc/letsencrypt/live ]] && ls /etc/letsencrypt/live/*/fullchain.pem >/dev/null 2>&1; then
  for c in /etc/letsencrypt/live/*/fullchain.pem; do
    EXP=$(openssl x509 -enddate -noout -in "$c" 2>/dev/null | sed 's/notAfter=//')
    ok "$c 到期: $EXP"
  done
  if systemctl list-timers 2>/dev/null | grep -q certbot; then
    ok "certbot.timer 已启用"
  else
    inc; warn "未启用 certbot.timer"
    fix "sudo systemctl enable --now certbot.timer && sudo certbot renew --dry-run"
  fi
else
  inc; warn "未发现 Let's Encrypt 证书"
  fix "sudo apt install -y certbot python3-certbot-nginx && sudo certbot --nginx -d $DOMAIN"
fi

# 8) 用户 / 权限
section "8) 用户 / 权限"
if id www >/dev/null 2>&1; then
  warn "仍存在 www 用户（宝塔残留）；如不再使用可考虑保留或迁移属主"
else
  ok "无 www 用户"
fi
if [[ -d "$PROJECT_DIR" ]]; then
  OWNER=$(stat -c '%U:%G' "$PROJECT_DIR")
  ok "$PROJECT_DIR 属主: $OWNER"
  if [[ "$OWNER" == "www:www" ]]; then
    inc; warn "属主为 www:www，宝塔卸载后该用户可能不存在"
    fix "sudo chown -R ubuntu:ubuntu $PROJECT_DIR    # 部署用户按实际改"
  fi
  ENVF="$PROJECT_DIR/server/.env"
  if [[ -f "$ENVF" ]]; then
    PERM=$(stat -c '%a' "$ENVF")
    if [[ "$PERM" != "600" ]]; then
      inc; warn ".env 权限 $PERM（建议 600）"
      fix "sudo chmod 600 $ENVF"
    else
      ok ".env 权限 600"
    fi
  fi
else
  inc; warn "项目目录不存在: $PROJECT_DIR"
  fix "请按 docs/de-baota/02-迁移修改清单.md 完成迁移"
fi

# 9) 计划任务 / 备份
section "9) 计划任务 / 备份"
if ls /etc/cron.d/click-send-shop* >/dev/null 2>&1 || crontab -l 2>/dev/null | grep -q click-send-shop; then
  ok "已有 click-send-shop 相关 cron"
else
  inc; warn "未找到数据库备份 cron"
  fix "sudo tee /etc/cron.d/click-send-shop-backup >/dev/null <<'EOF'"
  fix "30 3 * * * root $PROJECT_DIR/scripts/backup-mysql.sh /root/backups"
  fix "EOF"
  fix "sudo chmod 644 /etc/cron.d/click-send-shop-backup"
fi
if systemctl is-active --quiet cron 2>/dev/null || systemctl is-active --quiet crond 2>/dev/null; then
  ok "cron 服务在运行"
else
  inc; warn "cron 服务未运行"
  fix "sudo systemctl enable --now cron     # 或 crond"
fi

# 10) 防火墙
section "10) 防火墙"
if command -v ufw >/dev/null 2>&1 && ufw status 2>/dev/null | grep -q "Status: active"; then
  ok "ufw 启用，规则："
  ufw status numbered 2>/dev/null | sed 's/^/    /'
elif command -v firewall-cmd >/dev/null 2>&1 && firewall-cmd --state 2>/dev/null | grep -q running; then
  ok "firewalld 启用：$(firewall-cmd --list-all 2>/dev/null | head -n 5)"
else
  inc; warn "未检测到活动防火墙（云上请确认安全组）"
  fix "sudo apt install -y ufw && sudo ufw allow 22/tcp && sudo ufw allow 80/tcp && sudo ufw allow 443/tcp && sudo ufw enable"
fi

# 11) 宝塔残留
section "11) 宝塔残留"
LEFT=0
for p in /www/server/panel /www/server/nginx /www/server/mysql /www/wwwlogs /www/backup; do
  [[ -e "$p" ]] && { warn "残留: $p"; LEFT=1; }
done
if command -v bt >/dev/null 2>&1; then warn "bt 命令仍在: $(command -v bt)"; LEFT=1; fi
systemctl list-unit-files 2>/dev/null | grep -i -E '^(bt|aapanel|panel)\.service' && LEFT=1 || true
if [[ "$LEFT" == 0 ]]; then ok "未发现宝塔残留"; fi

# 12) PATH / shell 残留
section "12) PATH / shell 是否仍指向宝塔"
echo "  PATH=$PATH" | sed 's/:/\n         /g' | sed 's/^/  /' | head -n 12
if echo "$PATH" | grep -q "/www/server"; then
  inc; warn "PATH 仍包含 /www/server/...（来自 ~/.bashrc 或 /etc/profile.d/）"
  fix "grep -RIl '/www/server' /etc/profile.d/ ~/.bashrc ~/.bash_profile 2>/dev/null   # 找到后注释或删除"
fi

# 总结
section "总结"
if [[ "$fail_count" -eq 0 ]]; then
  echo "🎉 全部通过：网站已脱离宝塔依赖。建议再跑 bash $PROJECT_DIR/deploy/verify-pm2.sh 二次确认。"
  exit 0
else
  echo "❗ 共 $fail_count 项需修复，按上方 [FIX] 命令逐条执行后再次运行本脚本。"
  exit 1
fi

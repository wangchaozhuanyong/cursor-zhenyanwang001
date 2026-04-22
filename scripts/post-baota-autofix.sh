#!/usr/bin/env bash
#
# 卸载宝塔后「全部修复」自动执行脚本（在服务器上以 sudo 运行）
#
# 设计原则：
#   ✅ 全部操作幂等（可重复执行，不会破坏已正常的项）
#   ✅ DRY_RUN=1 时只打印不执行
#   ✅ 任何一步失败 → 记录原因 → 继续后续步骤 → 末尾汇总
#   ❌ 不会自动碰 MySQL（数据风险，必须人工）
#   ❌ 不会自动启用 ufw 防火墙（可能把你的 SSH 锁掉，必须人工 ENABLE_UFW=1）
#   ❌ 不会自动 chown（必须人工指定 OWNER=user:group 才执行）
#   ❌ 不会自动改 shell PATH（避免破坏交互登录环境）
#
# 用法：
#   sudo DOMAIN=your-domain.com bash scripts/post-baota-autofix.sh
#   # 预演（不执行）：
#   sudo DOMAIN=your-domain.com DRY_RUN=1 bash scripts/post-baota-autofix.sh
#   # 同时修文件属主：
#   sudo DOMAIN=your-domain.com OWNER=ubuntu:ubuntu bash scripts/post-baota-autofix.sh
#   # 同时启用 ufw（请确认 22 端口已放行）：
#   sudo DOMAIN=your-domain.com ENABLE_UFW=1 bash scripts/post-baota-autofix.sh
#
set -uo pipefail

DOMAIN="${DOMAIN:-}"
PROJECT_DIR="${PROJECT_DIR:-/var/www/click-send-shop}"
PM2_APP="${PM2_APP:-gc-api}"
HEALTH_PORT="${HEALTH_PORT:-3001}"
HEALTH_PATH="${HEALTH_PATH:-/api/health/live}"
DEPLOY_USER="${DEPLOY_USER:-${SUDO_USER:-$(whoami)}}"
DEPLOY_HOME="$(getent passwd "$DEPLOY_USER" | cut -d: -f6)"
OWNER="${OWNER:-}"
ENABLE_UFW="${ENABLE_UFW:-0}"
DRY_RUN="${DRY_RUN:-0}"
NODE_VERSION="${NODE_VERSION:-20}"
LE_EMAIL="${LE_EMAIL:-admin@${DOMAIN:-example.com}}"

# ---------- 工具函数 ----------
RUN() {
  if [[ "$DRY_RUN" == "1" ]]; then
    printf "  [DRY] %s\n" "$*"
    return 0
  fi
  bash -c "$*"
}
have() { command -v "$1" >/dev/null 2>&1; }

DONE=()
SKIP=()
FAIL=()
ok()    { printf "  \033[32m[DONE]\033[0m %s\n" "$*"; DONE+=("$*"); }
skip()  { printf "  \033[33m[SKIP]\033[0m %s\n" "$*"; SKIP+=("$*"); }
ng()    { printf "  \033[31m[FAIL]\033[0m %s\n" "$*"; FAIL+=("$*"); }
hr()    { printf "\n\033[1m=== %s ===\033[0m\n" "$*"; }

if [[ "${EUID:-$(id -u)}" -ne 0 ]]; then
  echo "请使用 sudo 运行。"
  exit 2
fi

PKG=""
if   have apt-get; then PKG="apt"
elif have dnf;     then PKG="dnf"
elif have yum;     then PKG="yum"
else echo "不支持的发行版（无 apt/dnf/yum）"; exit 2
fi

apt_install() {
  local pkgs=("$@")
  case "$PKG" in
    apt) RUN "DEBIAN_FRONTEND=noninteractive apt-get update -y && DEBIAN_FRONTEND=noninteractive apt-get install -y ${pkgs[*]}" ;;
    dnf) RUN "dnf install -y ${pkgs[*]}" ;;
    yum) RUN "yum install -y ${pkgs[*]}" ;;
  esac
}

echo "============================================================"
echo " 卸载宝塔后「全部修复」"
echo "  PROJECT_DIR  = $PROJECT_DIR"
echo "  DOMAIN       = ${DOMAIN:-<未设置，将跳过 SSL/站点配置>}"
echo "  PM2_APP      = $PM2_APP"
echo "  DEPLOY_USER  = $DEPLOY_USER ($DEPLOY_HOME)"
echo "  OWNER        = ${OWNER:-<未设置，跳过 chown>}"
echo "  ENABLE_UFW   = $ENABLE_UFW"
echo "  DRY_RUN      = $DRY_RUN"
echo "============================================================"

# ============================================================
hr "1) 项目目录 / 基础工具"
# ============================================================
if [[ ! -d "$PROJECT_DIR" ]]; then
  ng "项目目录不存在: $PROJECT_DIR（请先按 docs/de-baota/02-迁移修改清单.md 迁移）"
  echo "终止后续步骤。"
  exit 1
fi
ok "项目目录存在: $PROJECT_DIR"

for c in curl tar git rsync; do
  if have "$c"; then ok "$c 已存在"; else apt_install "$c" && ok "已安装 $c" || ng "安装 $c 失败"; fi
done

# ============================================================
hr "2) Node.js / npm / pm2"
# ============================================================
if have node; then
  ok "node $(node -v)"
else
  case "$PKG" in
    apt) RUN "curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -" \
         && apt_install nodejs build-essential ;;
    dnf|yum) RUN "curl -fsSL https://rpm.nodesource.com/setup_${NODE_VERSION}.x | bash -" \
         && apt_install nodejs gcc-c++ make ;;
  esac
  if have node; then ok "已安装 node $(node -v)"; else ng "node 安装失败"; fi
fi

if have npm; then ok "npm $(npm -v)"; else ng "npm 不存在（通常随 nodejs 一起装）"; fi

if have pm2; then
  ok "pm2 $(pm2 -v 2>/dev/null)"
else
  RUN "npm i -g pm2" && have pm2 && ok "已安装 pm2 $(pm2 -v 2>/dev/null)" || ng "pm2 安装失败"
fi

# ============================================================
hr "3) PM2 接管 $PM2_APP + 开机自启"
# ============================================================
if have pm2; then
  if [[ -f "$PROJECT_DIR/server/ecosystem.config.cjs" ]]; then
    if pm2 list --no-color 2>/dev/null | grep -q "$PM2_APP"; then
      if pm2 list --no-color 2>/dev/null | grep "$PM2_APP" | grep -q online; then
        ok "$PM2_APP 已在 PM2 中且 online"
      else
        RUN "pm2 reload $PM2_APP --update-env" && ok "已 pm2 reload $PM2_APP" || ng "pm2 reload $PM2_APP 失败"
      fi
    else
      RUN "mkdir -p $PROJECT_DIR/server/logs"
      RUN "cd $PROJECT_DIR/server && pm2 start ecosystem.config.cjs --only $PM2_APP --env production" \
        && ok "已 pm2 start $PM2_APP" || ng "pm2 start $PM2_APP 失败"
    fi
    RUN "pm2 save" >/dev/null 2>&1 || true
  else
    ng "缺少 $PROJECT_DIR/server/ecosystem.config.cjs，跳过 PM2 接管"
  fi

  if systemctl list-unit-files 2>/dev/null | grep -q '^pm2-'; then
    ok "已存在 pm2-*.service systemd 单元（开机自启已配置）"
  else
    if [[ "$DEPLOY_USER" == "root" ]]; then
      RUN "pm2 startup systemd -u root --hp /root" \
        && ok "已配置 pm2 systemd 开机自启 (root)" || ng "pm2 startup 失败"
    else
      CMD=$(env PATH="$PATH:/usr/bin:/usr/local/bin" pm2 startup systemd -u "$DEPLOY_USER" --hp "$DEPLOY_HOME" 2>&1 \
            | grep -E '^sudo env PATH=' | tail -n 1)
      if [[ -n "$CMD" ]]; then
        RUN "$CMD" && ok "已配置 pm2 systemd 开机自启 ($DEPLOY_USER)" || ng "pm2 startup 注入失败"
      else
        skip "pm2 startup 未输出可执行命令（可能已配置）"
      fi
    fi
    RUN "pm2 save" >/dev/null 2>&1 || true
  fi
fi

# ============================================================
hr "4) Nginx 安装 + 站点配置"
# ============================================================
if have nginx; then
  ok "nginx $(nginx -v 2>&1 | sed 's/.*\///')"
else
  apt_install nginx && ok "已安装 nginx" || ng "nginx 安装失败"
fi

if have nginx; then
  SITE_TPL="$PROJECT_DIR/deploy/nginx/site.prod.example.conf"
  SITE_DST=""
  ENABLED_DIR=""
  if   [[ -d /etc/nginx/sites-available ]]; then
    SITE_DST="/etc/nginx/sites-available/click-send-shop.conf"
    ENABLED_DIR="/etc/nginx/sites-enabled"
  elif [[ -d /etc/nginx/conf.d ]]; then
    SITE_DST="/etc/nginx/conf.d/click-send-shop.conf"
  fi

  if [[ -f "$SITE_TPL" && -n "$SITE_DST" ]]; then
    if [[ -f "$SITE_DST" ]]; then
      ok "Nginx 站点已存在: $SITE_DST（不覆盖；如需重置请人工删除）"
    else
      if [[ -z "$DOMAIN" ]]; then
        skip "未传 DOMAIN，跳过站点写入（重跑时加 DOMAIN=your-domain.com）"
      else
        RUN "cp '$SITE_TPL' '$SITE_DST'"
        RUN "sed -i 's/YOUR_DOMAIN/$DOMAIN/g' '$SITE_DST'"
        if [[ -n "$ENABLED_DIR" ]]; then
          RUN "ln -sf '$SITE_DST' '$ENABLED_DIR/click-send-shop.conf'"
          [[ -e "$ENABLED_DIR/default" ]] && RUN "rm -f '$ENABLED_DIR/default'"
        fi
        ok "已写入 Nginx 站点 $SITE_DST"
      fi
    fi
  else
    [[ -f "$SITE_TPL" ]] || ng "缺少模板 $SITE_TPL"
    [[ -n "$SITE_DST" ]] || ng "未识别到 Nginx 配置目录（sites-available/conf.d 都无）"
  fi

  if RUN "nginx -t" >/dev/null 2>&1; then
    ok "nginx -t 通过"
    RUN "systemctl enable --now nginx" && RUN "systemctl reload nginx" \
      && ok "nginx 已 enable+reload" || ng "nginx 启动/重载失败"
  else
    ng "nginx -t 不通过（请人工执行 sudo nginx -t 看行号）"
  fi
fi

# ============================================================
hr "5) SSL 证书 / 自动续签 (certbot)"
# ============================================================
if [[ -z "$DOMAIN" ]]; then
  skip "未传 DOMAIN，跳过 SSL（重跑时加 DOMAIN=your-domain.com）"
else
  if have certbot; then
    ok "certbot 已存在"
  else
    apt_install certbot python3-certbot-nginx && ok "已安装 certbot" || ng "certbot 安装失败"
  fi

  if [[ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]]; then
    EXP=$(openssl x509 -enddate -noout -in "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" 2>/dev/null | sed 's/notAfter=//')
    ok "证书已存在 $DOMAIN（到期: $EXP）"
  else
    RUN "certbot --nginx -d $DOMAIN --non-interactive --agree-tos -m $LE_EMAIL --redirect" \
      && ok "已签发并安装证书 $DOMAIN" \
      || ng "certbot 签发失败（常见原因：DNS 未解析到本机 / 80 端口未对外放行）"
  fi

  if systemctl list-timers 2>/dev/null | grep -q certbot; then
    ok "certbot.timer 已启用"
  else
    RUN "systemctl enable --now certbot.timer" && ok "已启用 certbot.timer" || ng "certbot.timer 启用失败"
  fi
fi

# ============================================================
hr "6) 计划任务 / MySQL 备份 cron"
# ============================================================
CRON_FILE="/etc/cron.d/click-send-shop-backup"
if [[ -f "$CRON_FILE" ]]; then
  ok "已有 $CRON_FILE"
elif [[ -f "$PROJECT_DIR/scripts/backup-mysql.sh" ]]; then
  if [[ "$DRY_RUN" == "1" ]]; then
    printf "  [DRY] write %s\n" "$CRON_FILE"
  else
    cat >"$CRON_FILE" <<EOF
# Click-Send-Shop 数据库备份 by post-baota-autofix.sh
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
30 3 * * * root $PROJECT_DIR/scripts/backup-mysql.sh /root/backups >> /var/log/click-send-shop-backup.log 2>&1
EOF
    chmod 644 "$CRON_FILE"
  fi
  RUN "mkdir -p /root/backups"
  ok "已写入 $CRON_FILE（每日 03:30 备份）"
else
  skip "缺少 scripts/backup-mysql.sh，跳过 cron 写入"
fi

CRON_SVC=$( (have cron && echo cron) || (have crond && echo crond) || true )
if [[ -n "$CRON_SVC" ]] && systemctl is-active --quiet "$CRON_SVC" 2>/dev/null; then
  ok "$CRON_SVC 服务在运行"
else
  RUN "systemctl enable --now ${CRON_SVC:-cron}" && ok "已启动 cron 服务" || ng "cron 服务启动失败"
fi

# ============================================================
hr "7) 文件属主 / .env 权限"
# ============================================================
if [[ -f "$PROJECT_DIR/server/.env" ]]; then
  P=$(stat -c '%a' "$PROJECT_DIR/server/.env")
  if [[ "$P" != "600" ]]; then
    RUN "chmod 600 $PROJECT_DIR/server/.env" && ok "已 chmod 600 .env" || ng "chmod .env 失败"
  else
    ok ".env 权限 600"
  fi
fi

if [[ -n "$OWNER" ]]; then
  RUN "chown -R $OWNER $PROJECT_DIR" && ok "已 chown -R $OWNER $PROJECT_DIR" || ng "chown 失败"
else
  CUR=$(stat -c '%U:%G' "$PROJECT_DIR" 2>/dev/null || echo "?")
  if [[ "$CUR" == "www:www" ]] && ! id www >/dev/null 2>&1; then
    skip "属主仍是 www:www 但 www 用户已不存在；请重跑时加 OWNER=ubuntu:ubuntu（或你的部署用户）"
  else
    ok "属主当前: $CUR（未传 OWNER 跳过 chown）"
  fi
fi

# ============================================================
hr "8) 防火墙 (ufw)"
# ============================================================
if have ufw; then
  if [[ "$ENABLE_UFW" == "1" ]]; then
    if ufw status 2>/dev/null | grep -q "Status: active"; then
      ok "ufw 已启用"
    else
      RUN "ufw allow 22/tcp"
      RUN "ufw allow 80/tcp"
      RUN "ufw allow 443/tcp"
      RUN "ufw --force enable" && ok "ufw 已启用并放行 22/80/443" || ng "ufw 启用失败"
    fi
    for p in 22 80 443; do
      if ufw status 2>/dev/null | grep -E "\b$p/tcp\b" | grep -q ALLOW; then
        ok "ufw 放行 $p/tcp"
      else
        RUN "ufw allow $p/tcp" && ok "已 ufw allow $p/tcp" || ng "ufw allow $p/tcp 失败"
      fi
    done
  else
    skip "未传 ENABLE_UFW=1，跳过 ufw（启用前请务必确认 22 端口已放行，否则可能锁掉 SSH）"
  fi
else
  skip "未安装 ufw（云服务器一般以安全组为准，不强制装）"
fi

# ============================================================
hr "9) 清理宝塔残留 systemd 单元"
# ============================================================
RESIDUE=0
for u in bt aapanel panel; do
  if systemctl list-unit-files 2>/dev/null | grep -qE "^${u}\.service"; then
    RESIDUE=1
    RUN "systemctl disable --now ${u} 2>/dev/null"
    for path in "/etc/systemd/system/${u}.service" "/lib/systemd/system/${u}.service" "/usr/lib/systemd/system/${u}.service"; do
      [[ -f "$path" ]] && RUN "rm -f $path"
    done
    ok "已清理 ${u}.service"
  fi
done
[[ "$RESIDUE" == 1 ]] && RUN "systemctl daemon-reload" || true
[[ "$RESIDUE" == 0 ]] && ok "无宝塔 systemd 残留单元"

# ============================================================
hr "10) MySQL（不自动改，仅检测+提示）"
# ============================================================
if [[ -f "$PROJECT_DIR/server/.env" ]]; then
  set -a
  source "$PROJECT_DIR/server/.env" 2>/dev/null || true
  set +a
  HOST="${DB_HOST:-127.0.0.1}"; PRT="${DB_PORT:-3306}"; USR="${DB_USER:-root}"; NAM="${DB_NAME:-}"
  if have mysql && mysql -h"$HOST" -P"$PRT" -u"$USR" -p"${DB_PASSWORD:-}" -e "USE \`$NAM\`; SELECT 1;" >/dev/null 2>&1; then
    ok "DB 连接成功 ($USR@$HOST:$PRT/$NAM)"
  else
    skip "DB 不可连或 mysql 客户端缺失 → 出于数据安全，本脚本不自动操作 DB"
    cat <<'EOF'
        若宝塔 MySQL 已被卸载：
          sudo apt install -y mysql-server
          sudo systemctl enable --now mysql
          sudo mysql_secure_installation
          gunzip -c /root/backup-db-*.sql.gz | mysql -u<user> -p <db>
        若数据库在外部 (RDS)：核对 server/.env 的 DB_HOST/PORT/USER/PASSWORD/NAME
EOF
  fi
fi

# ============================================================
hr "11) 健康检查（最终验收）"
# ============================================================
LIVE=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:${HEALTH_PORT}${HEALTH_PATH}" 2>/dev/null || echo 000)
READY=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:${HEALTH_PORT}/api/health/ready" 2>/dev/null || echo 000)
HTTP=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1/" 2>/dev/null || echo 000)
[[ "$LIVE"  == "200" ]] && ok "API live  → 200" || ng "API live  → $LIVE"
[[ "$READY" == "200" ]] && ok "API ready → 200" || ng "API ready → $READY (通常 DB 不通)"
[[ "$HTTP"  =~ ^(200|301|302) ]] && ok "Nginx :80 → $HTTP" || ng "Nginx :80 → $HTTP"

if [[ -n "$DOMAIN" ]]; then
  HTTPS=$(curl -sk -o /dev/null -w "%{http_code}" "https://$DOMAIN/" --max-time 8 2>/dev/null || echo 000)
  [[ "$HTTPS" =~ ^(200|301|302) ]] && ok "HTTPS $DOMAIN → $HTTPS" || ng "HTTPS $DOMAIN → $HTTPS"
fi

# ============================================================
hr "汇总"
# ============================================================
echo "DONE: ${#DONE[@]}    SKIP: ${#SKIP[@]}    FAIL: ${#FAIL[@]}"
if (( ${#FAIL[@]} > 0 )); then
  echo
  echo "失败项："
  for f in "${FAIL[@]}"; do echo "  - $f"; done
fi
if (( ${#SKIP[@]} > 0 )); then
  echo
  echo "跳过项（一般需要你提供更多信息后重跑）："
  for s in "${SKIP[@]}"; do echo "  - $s"; done
fi

echo
echo "建议接下来跑一次只读复检："
echo "  sudo DOMAIN=${DOMAIN:-your-domain.com} bash $PROJECT_DIR/scripts/post-baota-fix.sh"
echo "并执行验收脚本："
echo "  bash $PROJECT_DIR/deploy/verify-pm2.sh"

if (( ${#FAIL[@]} > 0 )); then exit 1; fi
exit 0

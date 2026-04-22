#!/usr/bin/env bash
#
# 网站连不上（"网络连接失败"）一键定位脚本 —— 在服务器上执行
#
# 用法：
#   sudo DOMAIN=your-domain.com bash scripts/site-down-triage.sh
#   # 不传 DOMAIN 也可以，只是不会做域名/SSL 检查
#
# 不会做任何修改，只输出每一层的状态，并在最后给出"最可能的根因 + 修复命令"。
#
set -uo pipefail

DOMAIN="${DOMAIN:-}"
PORT_API="${PORT_API:-3001}"
PROJECT_DIR="${PROJECT_DIR:-/var/www/click-send-shop}"
PM2_APP="${PM2_APP:-gc-api}"

PASS=()
FAIL=()
ok()   { printf "  \033[32m[OK]\033[0m   %s\n" "$*"; PASS+=("$*"); }
bad()  { printf "  \033[31m[FAIL]\033[0m %s\n" "$*"; FAIL+=("$*"); }
warn() { printf "  \033[33m[WARN]\033[0m %s\n" "$*"; }
hr()   { printf "\n\033[1m=== %s ===\033[0m\n" "$*"; }

###############################################################################
hr "L1 服务器自身网络/路由"
###############################################################################
PUBIP=$(curl -s --max-time 4 https://api.ipify.org 2>/dev/null \
        || curl -s --max-time 4 https://ifconfig.me 2>/dev/null \
        || echo "")
if [[ -n "$PUBIP" ]]; then ok "服务器公网出口 IP = $PUBIP"; else bad "无法访问外网（curl ipify/ifconfig.me 失败）"; fi
ip -4 addr show 2>/dev/null | awk '/inet /{print "    "$2"  "$NF}'
ip route 2>/dev/null | awk '/^default/{print "    default via "$3" dev "$5}'

###############################################################################
hr "L2 关键端口监听（80 / 443 / $PORT_API）"
###############################################################################
LISTEN80=$(ss -ltnp 2>/dev/null | awk '$4 ~ /:80$/'   | head -n1)
LISTEN443=$(ss -ltnp 2>/dev/null | awk '$4 ~ /:443$/' | head -n1)
LISTENAPI=$(ss -ltnp 2>/dev/null | awk -v p=":$PORT_API$" '$4 ~ p' | head -n1)
[[ -n "$LISTEN80"  ]] && ok "80   监听: $LISTEN80"   || bad "80 端口无监听（nginx 没起或没装）"
[[ -n "$LISTEN443" ]] && ok "443  监听: $LISTEN443"  || bad "443 端口无监听（缺 SSL 配置 / nginx 没起）"
[[ -n "$LISTENAPI" ]] && ok "API  监听: $LISTENAPI"  || bad "$PORT_API 端口无监听（pm2/$PM2_APP 没起）"

###############################################################################
hr "L3 Nginx 服务"
###############################################################################
if command -v nginx >/dev/null 2>&1; then
  ok "nginx 命令存在: $(command -v nginx)"
  if systemctl is-active --quiet nginx 2>/dev/null || pgrep -x nginx >/dev/null 2>&1; then
    ok "nginx 进程在运行"
  else
    bad "nginx 没在跑 → 修复: sudo systemctl enable --now nginx"
  fi
  if nginx -t >/dev/null 2>&1 || sudo nginx -t >/dev/null 2>&1; then
    ok "nginx -t 配置语法正确"
  else
    bad "nginx -t 语法失败 → 跑: sudo nginx -t  看具体行号"
    sudo nginx -t 2>&1 | sed 's/^/    /'
  fi
  echo "  当前已启用站点 server_name:"
  (sudo nginx -T 2>/dev/null || nginx -T 2>/dev/null) | awk '
    /server_name/ && $2 !~ /^_/ {gsub(";","",$0); print "    "$0}
  ' | sort -u | head -n 20
else
  bad "未安装 nginx → 见 docs/de-baota/05-卸载后影响修复.md 影响 1"
fi

###############################################################################
hr "L4 PM2 / 后端进程"
###############################################################################
if command -v pm2 >/dev/null 2>&1; then
  if pm2 list --no-color 2>/dev/null | grep -q "$PM2_APP"; then
    LINE=$(pm2 list --no-color 2>/dev/null | grep "$PM2_APP" | head -n1)
    if echo "$LINE" | grep -q online; then ok "PM2 $PM2_APP online"
    else bad "PM2 $PM2_APP 非 online: $LINE → pm2 logs $PM2_APP --lines 80 --nostream"; fi
  else
    bad "PM2 中没有 $PM2_APP → cd $PROJECT_DIR/server && pm2 start ecosystem.config.cjs --only $PM2_APP --env production && pm2 save"
  fi
else
  bad "pm2 未安装 → sudo npm i -g pm2"
fi

###############################################################################
hr "L5 本机回环健康检查"
###############################################################################
H_LIVE=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:${PORT_API}/api/health/live" 2>/dev/null || echo 000)
H_READY=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:${PORT_API}/api/health/ready" 2>/dev/null || echo 000)
H_HTTP=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1/" 2>/dev/null || echo 000)
[[ "$H_LIVE"  == "200" ]] && ok "API live  127.0.0.1:${PORT_API} → 200" || bad "API live 返回 $H_LIVE（后端没起或崩了）"
[[ "$H_READY" == "200" ]] && ok "API ready 127.0.0.1:${PORT_API} → 200" || bad "API ready 返回 $H_READY（一般是 DB 不通）"
[[ "$H_HTTP" =~ ^(200|301|302)$ ]] && ok "Nginx 127.0.0.1:80 → $H_HTTP" || bad "Nginx 127.0.0.1:80 返回 $H_HTTP"

###############################################################################
hr "L6 防火墙（系统层）"
###############################################################################
if command -v ufw >/dev/null 2>&1 && ufw status 2>/dev/null | grep -q "Status: active"; then
  if ufw status 2>/dev/null | grep -E '\b80/tcp\b' | grep -q ALLOW; then ok "ufw 放行 80"; else bad "ufw 未放行 80 → sudo ufw allow 80/tcp"; fi
  if ufw status 2>/dev/null | grep -E '\b443/tcp\b' | grep -q ALLOW; then ok "ufw 放行 443"; else bad "ufw 未放行 443 → sudo ufw allow 443/tcp"; fi
elif command -v firewall-cmd >/dev/null 2>&1 && firewall-cmd --state 2>/dev/null | grep -q running; then
  RULES=$(firewall-cmd --list-all 2>/dev/null)
  if echo "$RULES" | grep -qE 'http(s)?\b'; then ok "firewalld 放行 http/https"; else bad "firewalld 未放行 http/https → sudo firewall-cmd --permanent --add-service=http --add-service=https && sudo firewall-cmd --reload"; fi
else
  ok "未启用 ufw/firewalld（云上以安全组为准）"
fi
if command -v iptables >/dev/null 2>&1; then
  POL=$(iptables -L INPUT -n 2>/dev/null | head -n1)
  echo "    INPUT 链策略: $POL"
fi

###############################################################################
hr "L7 域名 / DNS / 公网可达性"
###############################################################################
if [[ -n "$DOMAIN" ]]; then
  RESOLVED=$(getent hosts "$DOMAIN" 2>/dev/null | awk '{print $1}' | head -n1)
  [[ -z "$RESOLVED" ]] && RESOLVED=$(dig +short "$DOMAIN" A 2>/dev/null | head -n1)
  if [[ -n "$RESOLVED" ]]; then
    ok "DNS $DOMAIN → $RESOLVED"
    if [[ -n "$PUBIP" && "$RESOLVED" != "$PUBIP" ]]; then
      bad "DNS 解析 IP ($RESOLVED) ≠ 服务器公网 IP ($PUBIP) → 去 DNS 控制台改 A 记录"
    fi
  else
    bad "无法解析 $DOMAIN → 检查域名 DNS / NS"
  fi

  echo "  从服务器自身访问公网域名："
  curl -sI --max-time 6 "http://$DOMAIN/"  -o /dev/null -w "    HTTP  → %{http_code}  连接耗时 %{time_connect}s\n" || true
  curl -sI --max-time 6 "https://$DOMAIN/" -o /dev/null -w "    HTTPS → %{http_code}  连接耗时 %{time_connect}s\n" || true

  echo "  本机带 Host 头打 nginx（绕过 DNS）："
  curl -sI --max-time 4 -H "Host: $DOMAIN" "http://127.0.0.1/"  -o /dev/null -w "    HTTP  → %{http_code}\n" || true

  if [[ -d /etc/letsencrypt/live/$DOMAIN ]]; then
    EXP=$(openssl x509 -enddate -noout -in "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" 2>/dev/null | sed 's/notAfter=//')
    ok "SSL 证书存在，到期: $EXP"
  else
    warn "未找到 /etc/letsencrypt/live/$DOMAIN/，HTTPS 可能失效 → sudo certbot --nginx -d $DOMAIN"
  fi
else
  warn "未传入 DOMAIN，跳过域名/DNS/SSL 检查（重跑：DOMAIN=your-domain.com bash $0）"
fi

###############################################################################
hr "诊断结论"
###############################################################################
if (( ${#FAIL[@]} == 0 )); then
  echo "✅ 服务器侧全部通过。"
  echo "   如果浏览器仍'网络连接失败'，问题在服务器之外（最常见两类）："
  echo "   ① 云厂商【安全组】没放行 80/443  → 去控制台编辑入方向规则"
  echo "   ② DNS 还没生效 / 用户运营商缓存  → 等 TTL 或临时改本机 hosts 验证"
  exit 0
fi

echo "❌ 共 ${#FAIL[@]} 项异常，按【最可能的根因】顺序处理："
echo
i=1
for f in "${FAIL[@]}"; do
  printf "  %d) %s\n" "$i" "$f"
  i=$((i+1))
done

echo
echo "【常用一行修复速查】"
cat <<'EOF'
  # nginx 没起
  sudo systemctl enable --now nginx && sudo nginx -t && sudo systemctl reload nginx

  # 站点配置丢了
  sudo cp /var/www/click-send-shop/deploy/nginx/site.prod.example.conf /etc/nginx/sites-available/click-send-shop.conf
  sudo ln -sf /etc/nginx/sites-available/click-send-shop.conf /etc/nginx/sites-enabled/click-send-shop.conf
  sudo sed -i "s/YOUR_DOMAIN/your-domain.com/g" /etc/nginx/sites-available/click-send-shop.conf
  sudo nginx -t && sudo systemctl reload nginx

  # 后端没起
  cd /var/www/click-send-shop/server
  pm2 start ecosystem.config.cjs --only gc-api --env production
  pm2 save

  # 防火墙没放行
  sudo ufw allow 80/tcp && sudo ufw allow 443/tcp && sudo ufw reload

  # SSL 缺失
  sudo apt install -y certbot python3-certbot-nginx
  sudo certbot --nginx -d your-domain.com

  # 兜底：完整重新部署 + 验收
  cd /var/www/click-send-shop && bash deploy/production-deploy.sh && bash deploy/verify-pm2.sh
EOF

exit 1

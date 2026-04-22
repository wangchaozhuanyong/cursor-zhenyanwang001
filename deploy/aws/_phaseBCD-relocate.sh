#!/usr/bin/env bash
# 阶段 B+C+D：代码 rsync 到新路径 → Nginx 切 root 并去宝塔 include → PM2 重建到新 cwd → 修复 startup
# 不要求 0 中断，但目标 < 5 秒 API 中断（仅 PM2 重启窗口），静态前端持续可用。
set -uo pipefail

OLD="/www/wwwroot/cursor-zhenyanwang001"
NEW="/var/www/click-send-shop"
PM2_APP="gc-api"
TS=$(date +%Y%m%d-%H%M%S)
BACKUP_NEW="/home/ubuntu/backups/$TS-relocate"
sudo mkdir -p "$BACKUP_NEW"

log(){ echo -e "\n\033[1;36m[$(date +%T)] $*\033[0m"; }
fail(){ echo -e "\n\033[1;31m[FAIL] $*\033[0m"; exit 1; }

# ---------- B1) rsync 代码 ----------
log "B1) rsync $OLD/ → $NEW/  (排除 node_modules / .git/objects 大对象 / log)"
sudo mkdir -p "$NEW"
sudo chown -R ubuntu:ubuntu "$NEW"
rsync -aHv --delete \
  --exclude '.git/objects/pack' \
  --exclude 'node_modules' \
  --exclude '*.log' \
  --exclude 'deploy.log' \
  "$OLD/" "$NEW/" 2>&1 | tail -10
chmod 600 "$NEW/server/.env" 2>/dev/null || true

# 验证关键文件
[ -f "$NEW/server/src/index.js" ]                 || fail "缺少 $NEW/server/src/index.js"
[ -f "$NEW/server/ecosystem.config.cjs" ]         || fail "缺少 ecosystem.config.cjs"
[ -f "$NEW/server/.env" ]                         || fail "缺少 .env"
[ -d "$NEW/click-send-shop-main/click-send-shop-main/dist" ] \
  || [ -d "$NEW/public-frontend" ]                || fail "缺少前端构建产物"

# 安装后端依赖到新路径（用旧 node_modules 重装，否则路径绑定会失败）
log "B2) 重装后端依赖（按 lock 精确安装）"
cd "$NEW/server" && npm ci --omit=dev 2>&1 | tail -5

log "B3) 准备日志目录 / 修正属主"
mkdir -p "$NEW/server/logs"
sudo chown -R ubuntu:ubuntu "$NEW"

# ---------- C1) 备份 nginx + 改站点 ----------
log "C1) 备份当前 nginx 全部配置 → $BACKUP_NEW/etc-nginx"
sudo cp -a /etc/nginx "$BACKUP_NEW/etc-nginx"

SITE="/etc/nginx/sites-available/cursor-main-frontend.conf"
log "C2) 把 $SITE 的 root 指向新路径 + 加 access/error_log + 替换/添加 try_files"
sudo cp "$SITE" "$BACKUP_NEW/cursor-main-frontend.conf.bak"

# 用 sed 原地替换 root，并把 access_log / error_log 重定向到 /var/log/nginx
sudo mkdir -p /var/log/nginx
sudo sed -i \
  -e "s|root[[:space:]]\+/www/wwwroot/cursor-zhenyanwang001/public-frontend|root $NEW/public-frontend|g" \
  -e "s|root[[:space:]]\+/www/wwwroot/cursor-zhenyanwang001/click-send-shop-main/click-send-shop-main/dist|root $NEW/click-send-shop-main/click-send-shop-main/dist|g" \
  "$SITE"

# 如果 access_log 还在 /www/wwwlogs/... 就改到 /var/log/nginx
sudo sed -i -e "s|access_log[[:space:]]\+/www/wwwlogs/[^;]*|access_log /var/log/nginx/click-send-shop-access.log|g" \
            -e "s|error_log[[:space:]]\+/www/wwwlogs/[^;]*|error_log /var/log/nginx/click-send-shop-error.log|g" \
  "$SITE"

# 显示当前的 root 行供肉眼复核
echo "--- $SITE 关键行 ---"
sudo grep -nE '^[[:space:]]*(server_name|root|access_log|error_log|proxy_pass|listen)' "$SITE"

# ---------- C3) nginx.conf 摘除宝塔 include ----------
NGX_CONF="/etc/nginx/nginx.conf"
log "C3) 检查 $NGX_CONF 是否包含宝塔 include"
if sudo grep -nE '/www/server/panel/vhost' "$NGX_CONF"; then
  sudo cp "$NGX_CONF" "$BACKUP_NEW/nginx.conf.bak"
  sudo sed -i '/\/www\/server\/panel\/vhost/d' "$NGX_CONF"
  echo "  已删除宝塔 include 行"
else
  echo "  nginx.conf 未直接包含宝塔 include"
fi

# 全局搜其他 conf 里的宝塔引用，仅打印不删除
log "C4) 列出所有还在引用宝塔路径的 conf（仅展示）"
sudo grep -RIn -E '/www/(server|wwwroot|wwwlogs)' /etc/nginx/ 2>/dev/null | head -20 || true

# ---------- C5) nginx -t & reload ----------
log "C5) nginx -t"
if ! sudo nginx -t 2>&1; then
  echo "❌ nginx -t 失败 → 回滚 site 配置"
  sudo cp "$BACKUP_NEW/cursor-main-frontend.conf.bak" "$SITE"
  [ -f "$BACKUP_NEW/nginx.conf.bak" ] && sudo cp "$BACKUP_NEW/nginx.conf.bak" "$NGX_CONF"
  sudo nginx -t 2>&1
  fail "C5 失败，配置已回滚"
fi
sudo systemctl reload nginx
echo "  ✅ nginx reload 成功"

# 立即 curl 静态前端，确保 root 切换无误
sleep 1
HTTP=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1/" 2>/dev/null)
echo "  curl http://127.0.0.1/ → $HTTP"
[ "$HTTP" = "200" ] || echo "  ⚠️ 前端 != 200，请人工核对（API 仍在跑老路径，没坏）"

# ---------- D1) PM2 重新接管到新 cwd ----------
log "D1) PM2 切换到新 cwd（pm2 delete → start）"
pm2 save >/dev/null 2>&1 || true
echo "  当前进程: $(pm2 jlist | grep -oE '"name":"[^"]+"' | head -3 | tr '\n' ' ')"

# 用 fork mode 一次性切换，期望 < 2 秒
pm2 delete "$PM2_APP" 2>/dev/null || true
cd "$NEW/server"
pm2 start ecosystem.config.cjs --only "$PM2_APP" --env production 2>&1 | tail -10
pm2 save >/dev/null 2>&1 || true

sleep 2
log "D2) 健康检查（5 次重试）"
STATUS="000"
for i in 1 2 3 4 5 6 7 8; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:3001/api/health/live" 2>/dev/null)
  echo "  第 $i 次 /api/health/live → $STATUS"
  [ "$STATUS" = "200" ] && break
  sleep 2
done

if [ "$STATUS" != "200" ]; then
  echo "❌ 新 PM2 进程不健康，立即回滚到旧 cwd"
  pm2 delete "$PM2_APP" 2>/dev/null || true
  cd "$OLD/server"
  pm2 start ecosystem.config.cjs --only "$PM2_APP" --env production
  pm2 save
  fail "D 阶段失败，已回滚到旧路径，业务恢复"
fi
echo "  ✅ 新进程健康"

# ---------- D3) 修复 pm2-undefined.service ----------
log "D3) 修复 pm2 startup（原 pm2-undefined.service 是坏的）"
sudo systemctl disable --now pm2-undefined.service 2>/dev/null || true
sudo rm -f /etc/systemd/system/pm2-undefined.service /etc/systemd/system/multi-user.target.wants/pm2-undefined.service
sudo systemctl daemon-reload

CMD=$(pm2 startup systemd -u ubuntu --hp /home/ubuntu 2>&1 | grep -E '^sudo env' | tail -n 1)
if [ -n "$CMD" ]; then
  echo "  执行: $CMD"
  eval "$CMD"
else
  echo "  ⚠️ pm2 startup 未输出 sudo env 命令（可能已存在）"
fi
pm2 save >/dev/null 2>&1 || true

# ---------- 最终验收 ----------
log "FINAL) 全链路验收"
pm2 list | head -20
echo
for path in /api/health/live /api/health/ready; do
  c=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:3001$path")
  echo "  127.0.0.1:3001$path → $c"
done
for path in / /api/health/live; do
  c=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1$path")
  echo "  127.0.0.1$path → $c"
done

# 公网（带 Host 头模拟）
PUB=$(curl -s -o /dev/null -w "%{http_code}" "http://13.214.165.214/" --max-time 5)
echo "  http://13.214.165.214/ → $PUB"

echo
echo "  PM2 当前 cwd:"
pm2 show "$PM2_APP" | grep 'exec cwd' | sed 's/^/    /'

systemctl is-enabled pm2-ubuntu.service 2>/dev/null && echo "  ✅ pm2-ubuntu.service 已 enable" || echo "  ⚠️ pm2-ubuntu.service 未 enable"

log "B+C+D 完成"
echo "  代码新路径：$NEW"
echo "  Nginx root：$NEW/public-frontend"
echo "  PM2 cwd：    $NEW/server"
echo "  备份：      $BACKUP_NEW"
echo
echo "下一步："
echo "  阶段 E：MySQL 从宝塔 /www/server/mysql 迁到系统 mysql-server（约 30-60s DB 中断）"
echo "  阶段 G：停 + 卸宝塔"

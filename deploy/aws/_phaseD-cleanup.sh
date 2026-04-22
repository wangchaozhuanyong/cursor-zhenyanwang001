#!/usr/bin/env bash
# 阶段 D 收尾：修 pm2 startup / 修 ecosystem.config.cjs / 修 NODE_ENV
# 全程 0 中断（pm2 reload 平滑重启）
set -uo pipefail

NEW="/var/www/click-send-shop"
OLD="/www/wwwroot/cursor-zhenyanwang001"
PM2_APP="gc-api"

log(){ echo -e "\n\033[1;36m[$(date +%T)] $*\033[0m"; }

# ---------- D3) 修复 pm2-undefined.service ----------
log "D3) 清理 pm2-undefined.service → 重建 pm2-ubuntu.service"
sudo systemctl disable --now pm2-undefined.service 2>/dev/null || true
sudo rm -f /etc/systemd/system/pm2-undefined.service \
           /etc/systemd/system/multi-user.target.wants/pm2-undefined.service \
           /lib/systemd/system/pm2-undefined.service
sudo systemctl daemon-reload

# 生成新的
CMD=$(env PATH="$PATH:/usr/bin:/usr/local/bin" pm2 startup systemd -u ubuntu --hp /home/ubuntu 2>&1 \
      | grep -E '^sudo env' | tail -n 1)
if [ -n "$CMD" ]; then
  echo "  执行: $CMD"
  eval "$CMD"
else
  echo "  ⚠️ pm2 startup 没输出 sudo env 命令"
fi
pm2 save >/dev/null 2>&1

systemctl is-enabled pm2-ubuntu.service 2>/dev/null \
  && echo "  ✅ pm2-ubuntu.service enabled" \
  || echo "  ⚠️ pm2-ubuntu.service 未 enable"

# ---------- D4) 修 ecosystem.config.cjs（名字改成 gc-api，加完整 PM2 配置）----------
log "D4) 修正 $NEW/server/ecosystem.config.cjs → 名为 \$PM2_APP || 'gc-api'"
ECO="$NEW/server/ecosystem.config.cjs"
cp "$ECO" "$ECO.bak.$(date +%s)"
cat > "$ECO" <<'JS'
/**
 * PM2：生产环境进程守护
 * 用法：cd server && pm2 start ecosystem.config.cjs --only gc-api --env production
 *      自定义名： PM2_APP=my-name pm2 start ecosystem.config.cjs --only my-name
 * 入口必须是 src/index.js（src/app.js 仅导出 Express app，不会 listen）。
 */
const appName = process.env.PM2_APP || 'gc-api';

module.exports = {
  apps: [
    {
      name: appName,
      cwd: __dirname,
      script: 'src/index.js',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      autorestart: true,
      restart_delay: 2000,
      min_uptime: 5000,
      max_restarts: 10,
      max_memory_restart: '512M',
      kill_timeout: 5000,
      listen_timeout: 8000,
      time: true,
      merge_logs: true,
      log_file: './logs/pm2-combined.log',
      out_file:  './logs/pm2-out.log',
      error_file: './logs/pm2-error.log',
      env: {
        NODE_ENV: 'production',
      },
      env_production: {
        NODE_ENV: 'production',
      },
    },
  ],
};
JS
echo "  写入完成，diff：（旧 → 新只看名字行）"
grep -E "name:" "$ECO"

# ---------- D5) 确保 .env 里 NODE_ENV=production ----------
log "D5) 校正 server/.env 的 NODE_ENV=production"
ENV_FILE="$NEW/server/.env"
if grep -qE '^NODE_ENV=' "$ENV_FILE"; then
  sed -i 's/^NODE_ENV=.*/NODE_ENV=production/' "$ENV_FILE"
  echo "  已改 NODE_ENV → production"
else
  echo 'NODE_ENV=production' >> "$ENV_FILE"
  echo "  已追加 NODE_ENV=production"
fi
chmod 600 "$ENV_FILE"
grep '^NODE_ENV=' "$ENV_FILE"

# ---------- D6) 用 ecosystem 平滑接管现有进程（验证未来流程可用）----------
log "D6) 用 ecosystem.config.cjs 平滑接管 gc-api（pm2 reload）"
cd "$NEW/server"
if pm2 describe "$PM2_APP" >/dev/null 2>&1; then
  # 先 reload 让 NODE_ENV 更新；再 delete + start --env production 重新读取 ecosystem
  # 为零中断：用 fork mode 时 reload 等同 restart，所以先做 delete+start
  pm2 delete "$PM2_APP" 2>/dev/null || true
fi
pm2 start ecosystem.config.cjs --only "$PM2_APP" --env production 2>&1 | tail -10
pm2 save >/dev/null 2>&1

sleep 2
log "D7) 健康检查"
for i in 1 2 3 4 5; do
  c=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:3001/api/health/live" 2>/dev/null)
  echo "  attempt $i → $c"
  [ "$c" = "200" ] && break
  sleep 2
done

echo
log "D8) 验证 NODE_ENV"
curl -s "http://127.0.0.1:3001/api/health/live" | head -c 300
echo

echo
log "FINAL"
pm2 list
echo
echo "  pm2 cwd:    $(pm2 show $PM2_APP | grep 'exec cwd' | awk -F'│' '{print $3}')"
echo "  pm2 script: $(pm2 show $PM2_APP | grep 'script path' | awk -F'│' '{print $3}')"
systemctl is-enabled pm2-ubuntu.service 2>/dev/null && echo "  ✅ pm2-ubuntu.service enabled (开机自启)" || echo "  ❌ pm2-ubuntu.service NOT enabled"
ss -ltnp | grep 3001 | head -3 | sed 's/^/  /'

echo
echo "完成 ✅。下一步建议："
echo "  E) MySQL 从宝塔 /www/server/mysql 迁到系统 mysql-server-8.0（约 30-60s DB 中断）"
echo "  G) 停止并卸载宝塔（btpanel.service / /www/server/panel / bt cli / /www/swap）"

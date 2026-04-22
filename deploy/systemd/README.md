# 进程守护：PM2 + systemd（无宝塔）

本仓库生产推荐：**PM2** + `ecosystem.config.cjs` 管理 `gc-api`，并用 **systemd** 保证开机自启。

## 推荐方式（官方）

在服务器 `server` 目录执行一次：

```bash
cd /var/www/click-send-shop/server
pm2 start ecosystem.config.cjs --only gc-api --env production
pm2 save
pm2 startup systemd -u "$(whoami)" --hp "$HOME"
```

将 `pm2 startup` 打印的 `sudo env PATH=...` 整行执行一遍。之后重启机器会由 **systemd 调用 pm2 resurrect**，不依赖宝塔。

## 备选：直接 systemd 跑 Node（不经过 PM2）

若必须纯 systemd，可使用 `gc-api.direct.service.example`（需同步修改 `deploy/verify-pm2.sh` 对 PM2 的假设，或单独验收）。

## 日志

- PM2：`server/logs/pm2-*.log`（见 `server/ecosystem.config.cjs`）
- 应用：可追加 `journalctl -u 服务名`（若用 systemd 包装）

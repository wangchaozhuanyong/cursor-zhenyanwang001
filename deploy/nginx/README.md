# 生产 Nginx（damatong.net）

## 正式配置

| 文件 | 用途 |
|------|------|
| `damatong.prod.conf` | **唯一推荐**：商城 `damatong.net`、管理端 `console.damatong.net` |
| `install-damatong-nginx.sh` | 安装并启用上述配置，禁用旧站 |

## 静态目录（EC2）

- 商城：`/var/www/flashcast/dist`
- 管理端：`/var/www/flashcast/admin-dist`
- API：`127.0.0.1:3001`（PM2 `gc-api`）

## 服务器一次性切换

```bash
cd /var/www/click-send-shop
bash deploy/nginx/install-damatong-nginx.sh
```

## 环境变量（`server/.env`）

见 `deploy/cloudflare-admin-security.md`：`PUBLIC_APP_URL`、`ADMIN_PUBLIC_URL`、`CORS_ORIGINS` 均使用 `damatong.net` / `console.damatong.net`。

旧域名 `flashcast.com.my` 已在 Nginx 301 到 `https://damatong.net`（源站直连生效；若经 Cloudflare 仍看到旧页，请在 CF 控制台 **Purge Cache** 或添加转发规则）。

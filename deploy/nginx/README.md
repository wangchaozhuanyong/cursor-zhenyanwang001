# 生产 Nginx（damatong.net）

## 正式配置

| 文件 | 用途 |
|------|------|
| `damatong.prod.conf` | **唯一推荐**：商城 `damatong.net`、管理端 `console.damatong.net` |
| `install-damatong-nginx.sh` | 安装并启用上述配置，禁用旧站 |

## 已废弃（勿再启用）

| 项 | 说明 |
|----|------|
| `flashcast.com.my` | 已下线，仓库内不再引用 |
| `cursor-main-frontend.conf` | 原单域 + `public-frontend` 方案，见 `legacy/cursor-main-frontend.nginx.conf` |
| `flashcast.prod.conf` | 仅占位说明，内容已迁至 `damatong.prod.conf` |
| `public-frontend` 合并部署 | 非 damatong 生产路径；静态目录为 `/var/www/flashcast/dist` 与 `admin-dist` |

## 静态目录（EC2）

- 商城：`/var/www/flashcast/dist`
- 管理端：`/var/www/flashcast/admin-dist`
- API：`127.0.0.1:3001`（PM2 `gc-api`）

## 服务器一次性清理旧域名配置

```bash
cd /var/www/click-send-shop
bash deploy/nginx/install-damatong-nginx.sh
```

## 环境变量（`server/.env`）

见 `deploy/cloudflare-admin-security.md`：`PUBLIC_APP_URL`、`ADMIN_PUBLIC_URL`、`CORS_ORIGINS` 均使用 `damatong.net` / `console.damatong.net`。

# 生产域名与 Nginx（damatong.net）

## 当前正式域名

| 用途 | 域名 |
|------|------|
| 商城前台 | `https://damatong.net`、`https://www.damatong.net` |
| 管理后台 | `https://console.damatong.net` |

## Nginx

- **唯一推荐配置**：`deploy/nginx/damatong.prod.conf`
- **安装/切换**（在服务器项目根执行一次）：

```bash
bash deploy/nginx/install-damatong-nginx.sh
```

该脚本会启用 `sites-available/damatong.prod.conf`，并移除 `sites-enabled` 下已知的旧站配置。

## 静态文件路径

| 内容 | 服务器路径 |
|------|------------|
| 商城 `dist` | `/var/www/damatong/dist` |
| 管理端 `admin-dist` | `/var/www/damatong/admin-dist` |

## 后端环境变量（`server/.env`）

与 `server/.env.example`、`deploy/cloudflare-admin-security.md` 一致：

```env
SITE_CODE=damatong
REDIS_KEY_PREFIX=damatong
BULLMQ_PREFIX=damatong:bull
PUBLIC_APP_URL=https://damatong.net
ADMIN_PUBLIC_URL=https://console.damatong.net
ADMIN_ALLOWED_ORIGINS=https://console.damatong.net
CORS_ORIGINS=https://damatong.net,https://www.damatong.net,https://console.damatong.net
FRONTEND_DIST=/var/www/damatong/dist
ADMIN_DIST=/var/www/damatong/admin-dist
STORAGE_S3_BUCKET=damatong-prod-assets-<account-id>
STORAGE_PUBLIC_BASE_URL=https://cdn.damatong.net
STORAGE_KEY_PREFIX=damatong/prod
```

从旧 `flashcast` 前缀/路径迁移见 `deploy/scripts/migrate-flashcast-to-damatong-prod.sh`。

## 部署脚本默认行为

- `deploy/production-deploy.sh`、`scripts/upload-frontend-dist-ec2.ps1`：同步到 `/var/www/damatong/dist` 与 `admin-dist`
- `deploy/deploy-wwwroot.sh`：默认 **不** 改写 Nginx（`INSTALL_NGINX=0`）；需要时设 `INSTALL_NGINX=1`
- 上述常用部署入口成功后默认运行 `deploy/cleanup-damatong-static.sh`，保留最近 `KEEP_RELEASES=2` 个 release 和 `KEEP_ROLLBACKS=1` 个 `rollback-*` 目录，并清理超过 `STALE_ASSET_DAYS=14` 天且未被当前页面引用的旧 JS/CSS chunk，避免静态发布备份长期占满系统盘。

## Cloudflare

商城域名上的 `/admin` 会 302 跳转到 `console.damatong.net`，避免误访问时看到死 404；`/api/admin` 仍由 Nginx 返回 404，管理接口只允许在 `console.damatong.net` 使用。详见 `deploy/cloudflare-admin-security.md`。

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
| 商城 `dist` | `/var/www/flashcast/dist` |
| 管理端 `admin-dist` | `/var/www/flashcast/admin-dist` |

## 后端环境变量（`server/.env`）

与 `server/.env.example`、`deploy/cloudflare-admin-security.md` 一致：

```env
PUBLIC_APP_URL=https://damatong.net
ADMIN_PUBLIC_URL=https://console.damatong.net
ADMIN_ALLOWED_ORIGINS=https://console.damatong.net
CORS_ORIGINS=https://damatong.net,https://www.damatong.net,https://console.damatong.net
```

## 部署脚本默认行为

- `deploy/production-deploy.sh`、`scripts/upload-frontend-dist-ec2.ps1`：同步到 `/var/www/flashcast/dist` 与 `admin-dist`
- `deploy/deploy-wwwroot.sh`：默认 **不** 改写 Nginx（`INSTALL_NGINX=0`）；需要时设 `INSTALL_NGINX=1`

## Cloudflare

商城域名上 `/admin`、`/api/admin` 由 Nginx 返回 404；管理端仅通过 `console.damatong.net` 访问。详见 `deploy/cloudflare-admin-security.md`。

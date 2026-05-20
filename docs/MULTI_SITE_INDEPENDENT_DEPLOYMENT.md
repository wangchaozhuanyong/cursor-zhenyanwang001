# 多独立网站部署方案

## 为什么不做多租户

本项目采用同一套 Git 源码维护多个独立网站，但每个网站独立部署、独立数据库、独立后台、独立域名、独立上传资源、独立 Redis 前缀、独立 PM2 进程。这样可以避免在 `products`、`orders`、`users`、`site_settings`、`payment_channels` 等业务表中加入 `tenant_id`，降低业务查询复杂度和数据串站风险。

## 架构图

```text
Git Repository
  ├─ Site A deploy -> PM2 site-a-api -> DB site_a -> Redis prefix site_a -> S3 prefix site_a/prod -> a.com
  └─ Site B deploy -> PM2 site-b-api -> DB site_b -> Redis prefix site_b -> S3 prefix site_b/prod -> b.com
```

每个后台只连接自己的数据库，不提供后台切换站点能力。

## 每站 .env 模板

```env
NODE_ENV=production
SITE_CODE=site_a
SITE_NAME=A网站
INSTANCE_ENV=production
PM2_APP=site-a-api
PROJECT_DIR=/var/www/site-a
PORT=3001
PUBLIC_APP_URL=https://a.com
CORS_ORIGINS=https://a.com
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=site_a_app
DB_PASSWORD=change-me
DB_NAME=site_a
JWT_SECRET=change-to-64-plus-random-chars
REDIS_KEY_PREFIX=site_a
BULLMQ_PREFIX=site_a:bull
STORAGE_DRIVER=s3
STORAGE_KEY_PREFIX=site_a/prod
STORAGE_PUBLIC_BASE_URL=https://cdn.example.com
STORAGE_S3_BUCKET=your-bucket
STORAGE_S3_ACCESS_KEY_ID=change-me
STORAGE_S3_SECRET_ACCESS_KEY=change-me
```

## 数据库创建

```sql
CREATE DATABASE site_a CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'site_a_app'@'%' IDENTIFIED BY 'strong-password';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, DROP ON site_a.* TO 'site_a_app'@'%';
FLUSH PRIVILEGES;
```

每个网站使用独立数据库。不要在业务表中增加 `tenant_id`。

## S3 Prefix 规则

生产建议使用：

```text
STORAGE_KEY_PREFIX=<SITE_CODE>/prod
```

例如：

```text
site_a/prod/uploads/...
site_b/prod/uploads/...
```

## Redis Prefix 规则

每个网站必须设置独立 `REDIS_KEY_PREFIX` 和 `BULLMQ_PREFIX`：

```env
REDIS_KEY_PREFIX=site_a
BULLMQ_PREFIX=site_a:bull
```

## PM2 命名规则

推荐：

```text
<site-code-with-hyphen>-api
```

例如 `site-a-api`、`site-b-api`。

## Nginx 示例

```nginx
server {
    listen 443 ssl http2;
    server_name a.com;

    root /var/www/site-a/public-frontend;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

## 新增网站步骤

1. 创建独立数据库和最小权限账号。
2. 准备独立项目目录，例如 `/var/www/site-c`。
3. 配置 `server/.env`，确保 `SITE_CODE`、`DB_NAME`、`REDIS_KEY_PREFIX`、`BULLMQ_PREFIX`、`STORAGE_KEY_PREFIX` 唯一。
4. 创建 PM2 进程，例如 `site-c-api`。
5. 添加 `deploy/sites/site-c.env`。
6. 执行 `bash deploy/deploy-site.sh site-c`。
7. 在后台配置 `site_settings.siteName`、Logo、CMS 页面和功能开关。

## 升级所有网站

```bash
bash deploy/deploy-all-sites.sh
```

脚本会逐个读取 `deploy/sites/*.env`，分别拉取代码、迁移数据库、构建前端、重载 PM2 并健康检查。

## 回滚步骤

1. 查看上次版本：`cat /var/www/site-a/.deploy-state/current-version.txt`。
2. 在站点目录执行 `git reset --hard <commit>`。
3. 重新安装依赖并构建前端。
4. 如涉及数据库迁移，按迁移脚本回滚或恢复备份。
5. `pm2 reload site-a-api --update-env`。
6. 检查 `/api/health/live` 和 `/api/health/ready`。

## 备份策略

- 数据库：每站独立定时备份，备份文件名包含 `SITE_CODE` 和时间。
- S3：按 `STORAGE_KEY_PREFIX` 做生命周期和版本保留。
- Redis：缓存可不备份，队列类数据按业务要求保留。
- `.env`：通过安全配置仓库或密钥管理系统保存，不提交真实密钥。

## 验收清单

- A/B 网站前台、后台、SEO、PWA 均显示各自 `siteName`。
- A/B 商品、订单、会员不互相出现。
- A/B 上传资源路径分别包含 `site_a/prod`、`site_b/prod`。
- A/B Redis key 前缀分别为 `site_a`、`site_b`。
- A/B PM2 进程分别为 `site-a-api`、`site-b-api`。
- `/about`、`/help`、`/content/:slug` 不写死品牌。
- SEO 预渲染和 PWA manifest 不写死品牌。
- 关闭 `siteCapabilities` 后，前端隐藏入口，后端拒绝关键接口。
- 修改一次源码，可以分别部署到多个独立网站。
- 不新增 `tenant_id`，不做后台切换多个网站。

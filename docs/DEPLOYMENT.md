# 部署与上线清单

本文档汇总仓库内已提供的工程能力与上线前需你在外部完成的事项。

## 推荐发布流程（把「改代码 → Git → 服务器」跑顺）

按下面顺序做，多数「推上去才报错」可以避免：

1. **本机（Windows）推送前**（需 Node 20+，生产服务器使用 Node 22+）：在仓库根执行
   `powershell -ExecutionPolicy Bypass -File scripts/verify-before-push.ps1`  
   通过后再 `git commit` / `push`。若本机已配好 `server/.env` 且 MySQL 可用，可加 `-WithDbTests` 跑 `npm run test:all`。
2. **GitHub**：`push` 到 `main` 会触发 **CI**（`.github/workflows/ci.yml`：前端 build + 服务端 typecheck，无需数据库）。**自动上架**依赖 **Deploy** workflow，须先配好 Secrets（见下表）。
3. **服务器**：代码目录必须是 **`git clone` 的标准路径**（默认 `/var/www/click-send-shop`），且存在 **`server/.env`**（生产 **禁止** `DB_USER=root`，脚本会拦截）。**唯一推荐上架入口**：`bash deploy/ci-deploy.sh`（与 GitHub Actions SSH 里调用的一致）；内部会执行 `production-deploy.sh`（迁移、前端带 `VITE_API_BASE_URL=/api` 构建、PM2、健康检查）。你在服务器上改的 **`server/ecosystem.config.cjs`** 在每次 `git reset` 前会自动 **stash / 恢复**，避免被覆盖。
4. **一条命令发布（推荐）**：在本机 `main` 改完代码后执行 `powershell -ExecutionPolicy Bypass -File scripts/release-once.ps1 -Force`。详见 [RELEASE_ONCE.md](./RELEASE_ONCE.md)。旧入口 `scripts/codex-deploy-main.ps1` 仍可用，等价于部分步骤。
5. **不要用多种脚本混着来**：日常优先使用上面的 Codex 入口。需要「仅快进拉代码、不动硬重置」时可用 `deploy/prod-update-safe.sh`（与 `production-deploy.sh` 略有差异，见脚本注释）。

### GitHub Actions 自动部署 Secrets（Repository secrets）

| Secret | 必填 | 说明 |
|--------|------|------|
| `DEPLOY_HOST` | 是 | 服务器 IP 或域名（SSH） |
| `DEPLOY_USER` | 是 | SSH 登录用户，如 `ubuntu` |
| `DEPLOY_SSH_KEY` | 是 | 私钥全文（含 `BEGIN`/`END` 行） |
| `DEPLOY_PROJECT_DIR` | 是 | 服务器上 **git 仓库根目录**，如 `/var/www/click-send-shop` |
| `DEPLOY_PORT` | 否 | SSH 端口，默认 22 |
| `DEPLOY_PM2_APP` | 否 | PM2 进程名，默认 `gc-api` |

未配置时 Deploy 工作流会在第一步 **明确报错**，而不再是 SSH 步骤里含糊失败。

### 为什么以前经常一出问题就是一串

常见根因：未带 `VITE_API_BASE_URL=/api` 构建前端、数据库迁移未跑、`.env` 或 JWT 不合规、GitHub **未配置 Deploy Secrets**、服务器目录不是 clone / 缺 `.git`、在服务器上改了 `ecosystem` 又被旧版 `reset --hard` 抹掉。上述流程与脚本已尽量在入口拦一层。

## 已内置能力

| 能力 | 说明 |
|------|------|
| 健康检查 | `GET /api/health/live` 存活；`GET /api/health/ready` 含数据库探测 |
| 访问日志 | 生产/开发默认 `morgan` combined（`NODE_ENV=test` 时可自行关闭） |
| 响应压缩 | `compression` 中间件 |
| 环境校验 | 生产环境强校验 `JWT_SECRET` 长度与示例值（见 `server/src/config/validateEnv.js`） |
| 前端同源部署 | `dist` 存在且未设 `SERVE_SPA=0` 时由 Node 托管，API 为 `/api` |
| Stripe Webhook（可选） | `POST /api/payment/stripe/webhook`（raw body）；需 `STRIPE_SECRET_KEY`、`STRIPE_WEBHOOK_SECRET`；PaymentIntent 的 `metadata.order_id` 为订单 id |
| 支付配置查询 | `GET /api/payment/config` |
| PM2 | `server/ecosystem.config.cjs` 或仓库根 `ecosystem.config.cjs`（**唯一启动入口**，进程名默认 `gc-api`，可用环境变量 `PM2_APP` 覆盖） |
| 部署后验收 | `bash deploy/verify-pm2.sh`（强制执行；校验 PM2 入口、3001 监听、健康检查、错误日志） |
| Docker MySQL | 仓库根目录 `docker-compose.yml` |
| 去宝塔化 | `docs/de-baota/README.md`（标准路径 `/var/www/click-send-shop`、系统 Nginx、certbot） |
| 数据库备份脚本 | `scripts/backup-mysql.ps1`（Windows）、`scripts/backup-mysql.sh`（Linux/macOS） |
| 反向代理示例 | `deploy/Caddyfile.example`、`deploy/nginx.example.conf` |
| CI | `.github/workflows/ci.yml`（前端 typecheck + build + 单元测试；服务端 typecheck + `test:unit`） |
| 自动部署门禁 | `deploy.yml` 仅在 **CI 成功** 后触发（`workflow_run`）；手动 `workflow_dispatch` 不受限 |

## 推荐上线步骤（简版）

1. **服务器**：安装 Node 22+、MySQL 8+（或使用 `docker compose up -d` 仅起库）。
2. **环境变量**：复制 `server/.env.example` 为 `server/.env`，设置强随机 `JWT_SECRET`、数据库账号、`CORS_ORIGINS`（须包含用户访问前端的完整 Origin，如 `https://你的域名`）。
3. **数据库**：执行 `npm run db:init`（在 `server` 目录），或导入已有备份。
4. **一键标准部署（推荐）**：在服务器项目根（含 `.git` 的克隆目录）执行：
   - `bash deploy/preflight.sh`（可选，单独排查环境）
   - `bash deploy/production-deploy.sh`
   - 脚本会：**默认导出 `VITE_API_BASE_URL=/api` 再构建前端**（与 Node 同源托管一致），执行迁移、`pm2 reload`、健康检查与 `deploy/verify-pm2.sh`。
6. **仅手动构建前端时**：在 `click-send-shop-main/click-send-shop-main` 执行 `VITE_API_BASE_URL=/api npm run build`（切勿省略，否则易出现页面能打开但接口请求错域/404）。
7. **PM2 进程（生产环境唯一方式）**：`deploy/production-deploy.sh` 已包含 `pm2 reload gc-api`。**首次**部署或机器上尚无进程时再执行：

   ```bash
   cd /var/www/click-send-shop
   pm2 start ecosystem.config.cjs --env production
   pm2 save
   ```

   - **不要**直接 `node src/index.js`、`npm run start:prod` 或 `pm2 start src/index.js --name xxx` 起进程；这些方式不会被监控统一管理。
   - 进程名默认 **`gc-api`**；如需覆盖：`PM2_APP=自定义名 pm2 start ecosystem.config.cjs --env production`。
   - 入口文件 **必须** 为 `server/src/index.js`（`server/src/app.js` 仅导出 Express app，**不会** `listen`）。
   - `server/package.json` 中的 `start` / `start:prod` 仅供测试/排障使用，生产环境一律走 PM2。

7. **HTTPS / Nginx（damatong.net）**：使用 `deploy/nginx/damatong.prod.conf`（商城 + `console.damatong.net` 管理端），在服务器执行 `bash deploy/nginx/install-damatong-nginx.sh`。详见 `docs/PRODUCTION_DOMAINS.md`。
8. **HTTPS（通用）**：亦可使用 Caddy / 其他 Nginx 模板，反代到 `127.0.0.1:3001`（参考 `deploy/nginx.example.conf`）。
9. **部署后验收（强制）**：

   ```bash
   PM2_APP=gc-api HEALTH_PORT=3001 bash deploy/verify-pm2.sh
   ```

   - 校验 4 件事：`pm2 show` 入口路径、`3001` 端口由 node 监听、`/api/health/live` 200、`pm2-error.log` 近 200 行无关键错误。
   - 仓库内所有 `deploy/*.sh`、`scripts/deploy_ec2.sh`、`scripts/remote-deploy-gc-api.sh` 末尾均会自动执行该脚本，**任何方式**部署都必须以此通过为完成标志。

10. **备份**：计划任务定期执行 `scripts/backup-mysql.ps1`，并将 `backups/` 拷到异地。

## 部署总失败？优先核对这几条

| 现象 | 常见原因 | 处理 |
|------|----------|------|
| 管理后台上传图片/Banner/**商品图**报 **413**、响应里是 `nginx/...` HTML | **Nginx 默认 `client_max_body_size` 仅 1m**，请求体在进 Node 前就被网关拒绝（与后端「单张 15MB」无关） | **推荐**：将 `deploy/nginx/conf.d-upload-body-global.conf` 安装为 `/etc/nginx/conf.d/90-upload-body-size.conf`（对**所有**站点生效），再 `sudo nginx -t && sudo systemctl reload nginx`。或在各 **`server { ... }`** 内写 `client_max_body_size 60m;`（需 ≥ 后端视频 50MB），模板见 `deploy/nginx/site.prod.example.conf` |
| 更新后前台能开，登录/数据全挂 | 前端构建未带 `VITE_API_BASE_URL=/api`（或分域 API 未写入正确完整 URL） | 使用 `deploy/production-deploy.sh`（已默认 `/api`），或手动构建前 `export VITE_API_BASE_URL=/api` |
| `production-deploy.sh` 一开始就报 git 错 | 服务器目录不是 `git clone` 出来的、没有 `.git` | 改用 `git clone` 到 `/var/www/click-send-shop`，或 `SKIP_GIT=1 bash deploy/production-deploy.sh` 并确保已用 rsync/手工同步最新代码 |
| `vite build` / `npm run build` 退出 **134**、日志有 **heap out of memory** | 机器内存小，Node 默认堆约 512MB，不够完成前端打包 | 日常用 `scripts/codex-deploy-main.ps1` 在本地构建并上传；服务器端 `production-deploy.sh` 默认 heap 已降为 1024MB，并支持 `SKIP_FRONTEND_BUILD=1` 跳过服务器构建 |
| `npm ci` / 依赖报错 | Node 版本低于 22、或锁文件与 package.json 不一致 | 生产服务器升级 Node 22+；在 `server` 与前端目录分别重新 `npm ci` 或对齐锁文件后提交 |
| 迁移失败 | 数据库账号权限、连接串、或 MySQL 未启动 | 看 `server/logs/pm2-error.log`；本地用 `.env` 连库试 `npm run migrate` |
| `verify-pm2.sh` 不过 | `.env` 占位符未改、`JWT_SECRET` 过短、端口不是 3001、进程入口不是 `src/index.js` | 按脚本输出逐项修改后 `pm2 reload gc-api --update-env` |

**无 git 的发布目录（仅 rsync）示例**：

```bash
SKIP_GIT=1 bash deploy/production-deploy.sh
```

**默认分支不是 `main` 时**：

```bash
GIT_BRANCH=master bash deploy/production-deploy.sh
```

## 真实支付（Stripe）

1. 在 Stripe Dashboard 创建密钥与 Webhook Endpoint，URL 为 `https://你的域名/api/payment/stripe/webhook`，选择 `payment_intent.succeeded` 等事件。
2. 将 `STRIPE_SECRET_KEY`、`STRIPE_WEBHOOK_SECRET` 写入 `server/.env`。
3. 收银台侧需创建 **PaymentIntent**（或 Checkout Session）并在 `metadata` 中写入 `order_id`；当前仓库仍以 **mock 模拟支付** 为主流程，Stripe 为 Webhook 置订单为已付款的补充路径。

## 模拟支付（默认）

无需密钥；下单后走 `mock` 渠道即可，适合内测。

## 监控与告警（需自行接入）

可对接：Uptime、云监控、Prometheus、Sentry 等，本仓库未绑定具体厂商。

## 合规与法务

用户协议、隐私政策、Cookie 提示、当地电商与支付法规需由运营方自行审核与更新页面文案。

## 低内存服务器部署（推荐）

### 推荐流程（默认）
1. 在 GitHub Actions 或本地构建前端：
   - `cd click-send-shop-main/click-send-shop-main`
   - `npm ci`
   - `npm run build`
2. 将构建产物 `dist` 上传到服务器（例如 `$PROJECT_DIR/public-frontend` 或项目前端目录下 `dist`）。
3. 服务器执行后端发布：
   - `cd /var/www/click-send-shop`
   - `bash deploy/production-deploy.sh`

默认情况下，`production-deploy.sh` 不会在服务器构建前端，只会：
- 拉代码
- 后端 `npm ci --omit=dev`
- 数据库迁移
- 同步已有 `dist`
- `pm2 reload`
- 健康检查

### 强制服务器构建（仅临时）
- `BUILD_FRONTEND_ON_SERVER=1 FRONTEND_BUILD_HEAP_MB=768 bash deploy/production-deploy.sh`（默认 `VITE_LEGACY_BUILD=0`，优先现代浏览器包体；若必须兼容旧 Android WebView / Safari 12 / 老 Chromium 壳，可设 `VITE_LEGACY_BUILD=1`）

说明：
- `BUILD_FRONTEND_ON_SERVER=1` 时才会执行前端 `npm ci` 与 `vite build`。
- 会应用低内存参数：`NODE_OPTIONS=--max-old-space-size=${FRONTEND_BUILD_HEAP_MB}`。
- 若可用内存过低会给出警告。

### 若仍 OOM
- 增加 2GB swap
- 改为 CI/本地构建 dist 再上传
- 升级服务器内存

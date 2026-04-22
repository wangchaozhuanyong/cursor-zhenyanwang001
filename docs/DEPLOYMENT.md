# 部署与上线清单

本文档汇总仓库内已提供的工程能力与上线前需你在外部完成的事项。

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
| CI | `.github/workflows/ci.yml`（前端 tsc + vitest + build；服务端加载 app） |

## 推荐上线步骤（简版）

1. **服务器**：安装 Node 20+、MySQL 8+（或使用 `docker compose up -d` 仅起库）。
2. **环境变量**：复制 `server/.env.example` 为 `server/.env`，设置强随机 `JWT_SECRET`、数据库账号、`CORS_ORIGINS`（须包含用户访问前端的完整 Origin，如 `https://你的域名`）。
3. **数据库**：执行 `npm run db:init`（在 `server` 目录），或导入已有备份。
4. **前端构建**：在 `click-send-shop-main/click-send-shop-main` 执行 `VITE_API_BASE_URL=/api npm run build`。
5. **启动（生产环境**唯一**方式）**：

   ```bash
   cd server
   pm2 start ecosystem.config.cjs --env production
   pm2 save
   ```

   - **不要**直接 `node src/index.js`、`npm run start:prod` 或 `pm2 start src/index.js --name xxx` 起进程；这些方式不会被监控统一管理。
   - 进程名默认 **`gc-api`**；如需覆盖：`PM2_APP=自定义名 pm2 start ecosystem.config.cjs --env production`。
   - 入口文件 **必须** 为 `server/src/index.js`（`server/src/app.js` 仅导出 Express app，**不会** `listen`）。
   - `server/package.json` 中的 `start` / `start:prod` 仅供测试/排障使用，生产环境一律走 PM2。

6. **HTTPS**：使用 Caddy / Nginx / 云负载均衡终止 TLS，反代到 `127.0.0.1:3001`（参考 `deploy/` 下示例）。
7. **部署后验收（强制）**：

   ```bash
   PM2_APP=gc-api HEALTH_PORT=3001 bash deploy/verify-pm2.sh
   ```

   - 校验 4 件事：`pm2 show` 入口路径、`3001` 端口由 node 监听、`/api/health/live` 200、`pm2-error.log` 近 200 行无关键错误。
   - 仓库内所有 `deploy/*.sh`、`scripts/deploy_ec2.sh`、`scripts/remote-deploy-gc-api.sh` 末尾均会自动执行该脚本，**任何方式**部署都必须以此通过为完成标志。

8. **备份**：计划任务定期执行 `scripts/backup-mysql.ps1`，并将 `backups/` 拷到异地。

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

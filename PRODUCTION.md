# 生产环境上线前核对

面向本仓库（Node API + Vite 前端）。部署前请逐项确认。

> 更完整的部署与排障文档见 `docs/DEPLOYMENT.md`（包含推荐的脚本入口、PM2、Nginx、CI/CD、验收脚本）。

## 环境与密钥

- `NODE_ENV=production`。
- `JWT_SECRET`：至少 64 字符随机串，且不得为示例/占位符（启动时 `validateEnv` 会校验）。
- `PUBLIC_APP_URL`：`https://` 正式域名，无尾部斜杠，且不得为 `localhost` / `127.0.0.1`。
- `CORS_ORIGINS`：逗号分隔的完整 Origin 列表，**禁止** `*`、占位符，且**不得**包含 `localhost` / `127.0.0.1`（生产校验）。
- `AUTO_PROMOTE_FIRST_USER_TO_ADMIN`：生产必须为 **未设置** 或 `0`（禁止为 `1`）。
- `EXPOSE_OTP_CODE`：生产必须关闭（勿设为 `true` / `1`）。
- 收款：`STRIPE_SECRET_KEY` 与 `STRIPE_WEBHOOK_SECRET` 要么都配置好，要么都留空；Webhook 路径为 `POST /api/payment/stripe/webhook`。
- 静态资源走 S3 时：`STORAGE_DRIVER=s3` 及 `server/.env.example` 中列出的 S3 相关变量需齐全。

## 反向代理与进程

- 位于 Nginx / ALB 之后时，保留默认 **`TRUST_PROXY`** 行为（生产未设为 `0` 时 Express `trust proxy` 为 `1`），以便限流与 IP 识别正确。直连公网 Node 时可设 `TRUST_PROXY=0`。
- 数据库：执行 `npm run migrate`（或按需 `RUN_MIGRATIONS_ON_BOOT=1`，视部署策略而定）。
- 管理员：使用 `npm run admin:create`，勿依赖首个用户自动升权。

## 前端构建

- 使用 `click-send-shop-main/click-send-shop-main/.env.production`：`VITE_API_BASE_URL=/api`（与站点同源反代），**勿**把 `http://localhost:...` 打进生产构建。
- 在 `server` 目录构建前端并产出 `dist`，或与 `FRONTEND_DIST` / `SERVE_SPA` 策略一致。

## 推荐部署入口（选一种记住就行）

- **服务器（Linux）推荐**：在服务器仓库根目录执行 `bash deploy/ci-deploy.sh`（内部跑 `production-deploy.sh` + `verify-pm2.sh`）。
- **Windows 发起 SSH 部署**：`powershell -ExecutionPolicy Bypass -File deploy/deploy-from-windows.ps1`（需设置 `EC2_HOST` / `SSH_KEY_PATH` 或传参）。

## 上线后

- 确认 HTTPS、HSTS（由 `PUBLIC_APP_URL` 为 https 触发 Helmet 行为）、Cookie 安全策略符合预期。
- 观察应用日志与错误率；必要时调高监控告警。

更细的变量说明见 `server/.env.example`。

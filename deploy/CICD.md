# 一键上线（CI/CD 自动化）使用手册

## 1. 触发方式（任选其一，最终都走 `deploy/ci-deploy.sh`）

### A. GitHub Actions（push main 自动触发）

1. 仓库 → Settings → Secrets and variables → Actions，添加：

   | Secret | 说明 |
   |--------|------|
   | `DEPLOY_HOST` | 服务器 IP / 域名 |
   | `DEPLOY_USER` | SSH 用户（如 `ubuntu` / `root`） |
   | `DEPLOY_SSH_KEY` | 该用户**私钥**全文（PEM）|
   | `DEPLOY_PORT` | 可选，默认 22 |
   | `DEPLOY_PROJECT_DIR` | 服务器项目根，例如 `/var/www/click-send-shop` |
   | `DEPLOY_PM2_APP` | 可选，默认 `gc-api` |

2. 推 main 即触发；也可在 Actions 页 **Run workflow** 手动触发，并勾选 `auto_rollback=1`。

### B. cron / 自建 Webhook 在服务器上触发

```bash
cd /var/www/click-send-shop
bash deploy/ci-deploy.sh
```

### C. Webhook（如 Coding/Gitee/自建）

让 webhook 接收方在服务器上执行：

```bash
cd /var/www/click-send-shop && bash deploy/ci-deploy.sh
```

---

## 2. 失败/通过判定（强制）

`deploy/ci-deploy.sh` 内部串行执行：

1. `deploy/production-deploy.sh`：拉代码 → 装依赖 → 迁移 → 构建 → PM2 (re)start。
2. `deploy/verify-pm2.sh`：

   - PM2 入口 = `src/index.js`（禁止 `src/app.js`）
   - PM2 状态 = `online`
   - `:3001` 由 `node` 监听
   - `GET /api/health/live` = 200
   - `GET /api/health/ready` = 200
   - `pm2-error.log` 末 200 行无 `Migration failed/ECONNREFUSED/ER_*/JWT_SECRET/validateEnv/...`
   - `server/.env` 关键变量完整且无占位值

任一不通过 → `verify-pm2.sh` 退出非 0 → `ci-deploy.sh` 退出非 0 → CI 任务失败。

成功时打印 `READY=YES` 并写入 `.deploy-state/last_good_head`。

---

## 3. 自动回滚

- **CI/CD 触发时**：在 GitHub Actions「Run workflow」中把 `auto_rollback` 设为 `1`，或在服务器上：

  ```bash
  AUTO_ROLLBACK=1 bash deploy/ci-deploy.sh
  ```

  失败会自动调用 `deploy/rollback.sh` 回滚到 `.deploy-state/last_good_head`，回滚后再次 verify。

- **人工触发回滚**：

  ```bash
  bash deploy/rollback.sh                 # 回到 last_good_head
  bash deploy/rollback.sh <commit_hash>   # 回到指定 commit
  ```

  脚本会 `git reset --hard` → 重跑 `production-deploy.sh` → 重跑 `verify-pm2.sh`，全部通过才视为「恢复完成」。

---

## 4. 验收标准（自动化上线按钮已完成）

- 在 GitHub Actions 中故意推一个**坏的 commit**（如改坏 `JWT_SECRET` 长度 / 让 migration 报错 / 改坏 `src/index.js`）：
  - Actions 任务必须**红色失败**，且 `pm2 logs / pm2 show / deploy.log / history.log` 自动作为 failure step 输出。
- 推一个**正常 commit**：
  - Actions 通过；服务器 `.deploy-state/history.log` 末尾出现 `OK`；
  - 服务器 `bash deploy/verify-pm2.sh` 独立执行也是 `exit 0`。
- 触发 `workflow_dispatch` 并设 `auto_rollback=1` 推坏代码：
  - Actions 失败但服务器 `.deploy-state/history.log` 末尾出现 `OK`（回滚后再 verify 通过）；线上服务保持可用。

---

## 5. 状态文件

`$PROJECT_DIR/.deploy-state/`：

| 文件 | 含义 |
|------|------|
| `last_good_head` | 最近一次「verify 通过」的 commit hash（回滚目标） |
| `last_failed_head` | 最近一次失败时的 HEAD |
| `history.log` | 每次部署/回滚结果的追加日志 |

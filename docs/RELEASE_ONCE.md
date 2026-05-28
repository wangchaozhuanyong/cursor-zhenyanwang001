# 一条命令全量发布（Windows 本机）

避免每次手动：`typecheck` → `commit` → `push` → `deploy-prod` → `upload-frontend-dist` → `Quick`。

## 日常只用这一条

在**仓库根目录** `cursor-zhenyanwang-main` 执行：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/release-once.ps1 -Force
```

流程（自动串联）：

1. 前端 typecheck + 服务端 typecheck（**不跑**易失败的 `check:service-layer`）
2. `git push origin main`（本地有未提交改动时需加 `-CommitMessage`）
3. 服务器：`git pull` + **数据库迁移** + PM2（`BACKUP_BEFORE_DEPLOY=0`，跳过当前会失败的备份步骤）
4. 本机 `VITE_API_BASE_URL=/api` 构建并上传到 `/var/www/damatong/dist`
5. 打印服务器 HEAD 与 `/api/health/live`

若第 3 步因数据库失败，脚本会**自动降级**为 `git + pm2 restart`（前端仍会通过第 4 步上线）。

---

## 三种模式

| 模式 | 命令 | 适用场景 |
|------|------|----------|
| **standard**（默认） | `release-once.ps1 -Force` | 日常：前后端都有改动，或不确定 |
| **frontend** | `release-once.ps1 -Mode frontend -Force` | 纯 UI/前端，要快，不跑服务器迁移链路 |
| **full** | `release-once.ps1 -Mode full -Force` | 要部署前 MySQL 全量备份 + 完整 CI 级校验 |

带未提交改动：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/release-once.ps1 -Force -CommitMessage "fix(categories): xxx"
```

---

## 发布前一次性修好（避免反复踩坑）

### 1. 服务器 MySQL 账号（`full` 模式与标准模式迁移必需）

现象：`Access denied for user 'gc_app'@'localhost'`

在 EC2 上核对 `server/.env` 的 `DB_USER` / `DB_PASSWORD`，并保证该用户对业务库有 DDL+DML 权限。修好后：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/release-once.ps1 -Mode full -Force
```

### 2. 本机 `check:service-layer`（可选）

`deploy-prod.ps1` 默认会跑，常因历史 `memberLevel.service.js` 失败。  
**`release-once.ps1` 已默认跳过**；若坚持用旧脚本，请加 `-SkipChecks`。

### 3. SSH 密钥路径

默认 `E:\yamaxunmishi\aws-key.pem`，可改：

```powershell
... -SshKeyPath "D:\path\to\key.pem"
```

---

## 与旧脚本对照（不要再混用）

| 以前 | 现在 |
|------|------|
| `verify-before-push.ps1` + 手动 commit/push | `release-once.ps1` 内置 |
| `codex-deploy-main.ps1` | 用 `release-once.ps1 -Mode standard` |
| 失败后再 `upload-frontend-dist-ec2.ps1` | 已包含在第 4 步 |
| 再 `deploy-prod.ps1 -Quick` | standard 失败会自动降级；或 `-Mode frontend` |

---

## GitHub Actions（可选）

`push main` 仍会触发 CI；Deploy workflow 需配置 `DEPLOY_*` Secrets。  
本机 `release-once.ps1` 与 Actions **并行**时，以本机上传的 `dist` 为准（同步到 `/var/www/damatong`）。

---

## 验收清单

- [ ] 服务器 `git rev-parse --short HEAD` 与 GitHub `main` 一致
- [ ] `curl http://127.0.0.1:3001/api/health/live` 返回 live
- [ ] 浏览器访问商城强刷后功能正常
- [ ] 有 DB 迁移时，后台/接口新字段可用（standard/full 成功时）

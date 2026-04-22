# 宝塔部署检查清单（历史文档）

> **新标准**：去宝塔化部署见 `docs/de-baota/README.md`，标准脚本为 `deploy/production-deploy.sh`，默认路径 `/var/www/click-send-shop`。

与本仓库目录一致时的对照说明；脚本见仓库根 `deploy.sh`、`deploy/production-deploy.sh`（或兼容入口 `deploy/baota-simple-deploy.sh`）、`deploy/deploy-wwwroot.sh`。

**部署后自检（二选一）**：

- **`bash deploy/verify.sh`**：健康检查 +（默认）**磁盘 `index.html` 与经本机 Nginx 回环正文**是否一致（需 `SERVER_NAME`）。`SKIP_NGINX_COMPARE=1` 则只测接口。
- **`bash deploy/baota-verify-deploy.sh`**：**Git / dist / PM2 / 健康检查 / Nginx**（`nginx -t`，无权限时仅警告）/ 可选宝塔端口 / `deploy.log` 尾部，适合面板跑完部署后再跑一轮。
- **`bash deploy/verify-pm2.sh`**：专项校验 **PM2 启动入口**（必须 `src/index.js`，禁止 `src/app.js`）+ **3001 端口 node 监听** + **`/api/health/live`** + **`pm2-error.log` 近 200 行**关键错误扫描（迁移 / DB / 环境变量等）。

---

## 第一部分：确认网站入口（Nginx）

### 步骤 1：打开宝塔 → 网站 → 你的网站 → 设置 → 配置文件

你会看到类似：

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    root /www/wwwroot/xxx;   ← 重点
}
```

### 检查点 1（最关键）：`root` 是不是你**实际在更新**的那份静态文件？

你必须搞清楚：**Nginx 的 `root` 指向的目录，是否等于你部署脚本/build 写出的目录。**

**推荐 A：直接指向 Vite 构建目录（简单部署）**

- `root` 指向本仓库前端的 **`dist`**（注意是双层目录）：

  `.../click-send-shop-main/click-send-shop-main/dist`

- 若如此，执行 **`bash deploy/production-deploy.sh`**（会拉代码、在该前端目录 `npm run build`）即可；**无需**再复制到 `public-frontend`。

**推荐 B：`root` 指向 `public-frontend`（与仓库自带同步脚本一致）**

- 本仓库的 `deploy/deploy-wwwroot.sh` / **`bash deploy.sh`** 会在构建后把 `dist/` **同步到** `PUBLIC_FRONTEND`（默认 `$PROJECT_DIR/public-frontend`），与 `deploy/cursor-main-frontend.nginx.conf` 示例一致。
- 若 **`root` 是 `public-frontend`，但 build 只写在 `click-send-shop-main/.../dist`** 且从未同步 → **页面永远不会按预期更新** → 必须用 **`bash deploy.sh`**（带复制/rsync 逻辑），或改 Nginx `root` 指向前端 `dist`。

---

## 第二部分：验证前端是否真的更新

### 步骤 2：查看 `dist` 时间（本仓库路径）

在**项目根**执行：

```bash
ls -l click-send-shop-main/click-send-shop-main/dist
```

看 `index.html`、`assets/` 的修改时间。

- 时间**不是**刚刚部署 → 可能未 build 成功或脚本目录错误 → 查日志与脚本。
- 时间**是**刚刚部署 → build 侧基本正常。

---

## 第三部分：验证 Nginx 是否读的是你改的那份文件

### 步骤 3：测试文件替换

编辑（路径按你实际 `root`）：

`click-send-shop-main/click-send-shop-main/dist/index.html`

加一行注释：

```html
<!-- test-123 -->
```

浏览器 **Ctrl + F5** 强刷。

- **看不到** `test-123` → Nginx `root` 不是这份 `dist`（或 CDN/缓存），或改错目录。
- **能看到** → 前端路径与 Nginx 一致。

### 步骤 3b（推荐）：不修改线上文件的验证

避免在服务器上改 `index.html`，用**摘要一致**判断 Nginx 是否正在服务你刚 build 的那份文件。

**1）磁盘上的首页（按实际路径选一条）**

```bash
# 直接 serve 前端 dist
sha256sum click-send-shop-main/click-send-shop-main/dist/index.html

# 或使用 deploy.sh 同步后的目录
sha256sum public-frontend/index.html
```

**2）经 Nginx 拿到的首页正文**

先对**本机 Nginx**测（不经过 Cloudflare），并带上站点域名（与 `server_name` 一致）：

```bash
curl -fsS http://127.0.0.1/ -H "Host: 你的域名" | sha256sum
```

若 **1）与 2）的 sha256 相同**，说明 Nginx `root` 与当前磁盘上的那份 `index.html` 一致。

再测公网（若开了 Cloudflare，可能与 2）不一致 → 先 **Purge Cache** 再比）：

```bash
curl -fsS https://你的域名/ | sha256sum
```

**辅助**：Vite 构建后的 `index.html` 会引用带 hash 的 `assets/*.js`；若强刷后仍加载**旧文件名**，多为 CDN/浏览器缓存，而非本次 build 未生成。

---

## 第四部分：PM2 后端

### 启动方式（**全项目唯一允许**：`ecosystem.config.cjs`）

```bash
# A. 项目根
cd /var/www/click-send-shop
pm2 start ecosystem.config.cjs --env production

# B. server 子目录
cd /var/www/click-send-shop/server
pm2 start ecosystem.config.cjs --env production
```

两份 ecosystem 等价；**入口必须是 `server/src/index.js`**（`server/src/app.js` 只导出 Express app，**不会** `listen`）。

> **禁止**以下旧方式（仓库已全部清理）：
> - `pm2 start src/index.js --name xxx`
> - `pm2 start ./server/src/app.js`
> - `node src/index.js` / `npm run start:prod` 守护
> - 旧进程名 `click-send-shop-api`（`scripts/deploy_ec2.sh` 默认值已改为 `gc-api`）

### 步骤 4：`pm2 list`

应看到 **`gc-api`** 且 **online**（若你改过进程名，以实际为准）。

### 部署后**强制**验收（唯一标准）

```bash
PM2_APP=gc-api HEALTH_PORT=3001 bash deploy/verify-pm2.sh
```

仓库内所有 `deploy/*.sh`、`scripts/deploy_ec2.sh`、`scripts/remote-deploy-gc-api.sh` 末尾均已自动调用该脚本；该脚本不通过即视为部署失败，需排错后重跑。

- 非 online：`pm2 restart gc-api` 或 `pm2 reload gc-api --update-env`

### 步骤 5：日志

```bash
pm2 logs gc-api
```

关注：报错、数据库连接、环境变量（`.env`）。

### 检查接口是否通（本仓库实际路由）

- **存活探针（部署脚本与健康检查使用）**：`GET /api/health/live`  
  - 经 Nginx 反代：`http://你的域名/api/health/live`
  - 成功时 HTTP 200；响应体为统一包装，例如：`{ "code": 0, "message": "success", "data": { "status": "live", ... }, "traceId": "..." }`（**不是**简单的 `{ "status": "ok" }`，以线上为准）。
- **就绪探针（含 DB）**：`GET /api/health/ready`

---

## 第五部分：前后端联通（`/api` 反代）

在 Nginx 中需要把 **`/api`** 转到 Node（默认本仓库 `PORT` 常为 **3001**，以服务器 `pm2`/`ecosystem`/`.env` 为准）。

本仓库示例见 `deploy/cursor-main-frontend.nginx.conf`，核心为：

```nginx
location /api/ {
    proxy_pass http://127.0.0.1:3001/api/;
    # ... Host / X-Forwarded-* 等头
}
```

**常见坑**：`proxy_pass` 末尾多一个 `/` 且与 `location` 组合不当会导致**路径被改写**、接口 404 或错乱；若你改用无尾斜杠写法，务必整体自测 `/api/health/live`。

---

## 第六部分：Cloudflare 缓存

若使用 Cloudflare：可能出现「代码已更新但浏览器仍见旧页」。

- **推荐**：Cloudflare → Caching → Purge Cache → Purge Everything。
- 或浏览器 **Ctrl + Shift + R**。

---

## 第七部分：部署脚本验证

执行其一：

```bash
bash deploy/production-deploy.sh
# 或（含同步 public-frontend、可选 Nginx）
bash deploy.sh
```

日志中应能看到：拉代码、安装依赖、**构建前端**、`pm2 reload`、健康检查 **200**。

- **没有**前端 build 相关输出 → 检查 `FRONTEND_SUB` 或脚本路径是否与本仓库一致。

---

## 第八部分：终极判断

### 方式 A：在页面里打标（直观）

在服务器：

```bash
git rev-parse --short HEAD
```

在网页 `index.html` 临时写入：

```html
<!-- version: 上面提交的短 hash -->
```

强刷后：

- **页面不变** → 前端未部署到 Nginx 正在服务的那份静态资源（路径/缓存/未 build）。
- **页面变但接口不通** → 后端 / 反代 / 端口 / PM2。
- **页面变但数据旧** → API、缓存或浏览器缓存。

### 方式 B：不写注释，只比对「磁盘 vs Nginx」

```bash
GIT_SHORT=$(git rev-parse --short HEAD)
echo "commit=$GIT_SHORT"

DIST_INDEX="click-send-shop-main/click-send-shop-main/dist/index.html"
# 若 Nginx root 是 public-frontend，把 DIST_INDEX 改成 public-frontend/index.html

LOCAL=$(sha256sum "$DIST_INDEX" | awk '{print $1}')
REMOTE=$(curl -fsS http://127.0.0.1/ -H "Host: 你的域名" | sha256sum | awk '{print $1}')

echo "local  sha256=$LOCAL"
echo "nginx  sha256=$REMOTE"
test "$LOCAL" = "$REMOTE" && echo "OK: Nginx 与当前 dist 一致" || echo "FAIL: 路径/缓存/未同步"
```

`FAIL` 时优先检查：`root` 是否指向正在 build 的目录、`deploy.sh` 是否已同步 `public-frontend`、Cloudflare 是否需 Purge。

---

## 最常见 5 个坑

1. build 成功但 **Nginx `root` 指错目录**。
2. **build 在 A 目录，Nginx 用 B 目录**（例如只 build 了 `dist` 却 serve `public-frontend` 且未同步）。
3. **PM2 未 reload**，仍跑旧进程。
4. **Cloudflare / 浏览器强缓存**。
5. 脚本执行无报错但**实际未进入前端目录 build**（路径与仓库不一致）。

---

## 第九部分：部署失败时的排查与回滚（简要）

### 先看日志（顺序随意）

| 位置 | 说明 |
|------|------|
| `$PROJECT_DIR/deploy.log` | 若使用仓库部署脚本，每次部署会追加记录 |
| `pm2 logs gc-api --lines 200` | Node 启动错误、数据库、环境变量、未捕获异常 |
| Nginx `error_log` | 见站点配置里路径；502/504 多为上游或超时 |
| `curl -sS -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3001/api/health/live` | 绕过 Nginx 直接测后端是否存活 |

健康检查失败时，确认 **端口** 与 `.env` 里 `PORT`、PM2 启动参数一致（常见为 **3001**）。

### 回滚 Git 代码（谨慎）

若仅是**本次发布有问题**，可回到上一已知良好提交：

```bash
cd /var/www/click-send-shop   # 按实际 PROJECT_DIR
git log --oneline -10
git reset --hard <良好提交的完整 hash>
```

然后**再执行一遍**与线上一致的部署流程（至少：**前端 build**、**server 下依赖**、**`npm run migrate`** 若需要、**`pm2 reload`**）。仅 `reset` 不 build / 不重启，线上仍可能是旧产物或半旧状态。

**重要（数据库）**：若失败前 **`migrate` 已成功执行**，数据库结构可能已前进；此时仅把代码 `reset` 到旧版本，可能出现**代码与库结构不匹配**。处理思路：

- 优先：**修代码再发一版**（向前修复），或  
- 若有**部署前全库备份**，在明确后果下再考虑恢复备份（会丢备份后的数据）。

生产环境建议在重大变更前 **备份数据库**，并保留「上一版镜像 / 提交号」便于对照。

### 日志体积（宝塔 / PM2）

长期运行建议：在宝塔或 PM2 里开启**日志分割 / 按大小轮转**，避免单文件占满磁盘；具体以面板与 `pm2` 文档为准。

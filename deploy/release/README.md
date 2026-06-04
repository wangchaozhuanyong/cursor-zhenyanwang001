## 版本化发布（releases + current 软链）

这套发布方式的目标是：**可回滚、可重复执行、失败不影响线上**。

### 目录结构（服务器建议）

- `/var/www/damatong/app`：代码仓库（可选，也可以只放脚本）
- `/var/www/damatong/releases/<release-id>/`：每次发布一个新目录
- `/var/www/damatong/current`：指向当前生效 release 的软链
- `/var/www/damatong/shared`：跨版本共享（如 `.env`、上传目录、缓存目录等）
- `/var/www/damatong/dist`：Nginx storefront 静态目录（指向 current 的 dist）
- `/var/www/damatong/admin-dist`：Nginx console 静态目录（指向 current 的 admin-dist）

> 你仓库里的 Nginx 示例配置（`deploy/nginx/damatong.prod.conf`）默认 root 为：
> - storefront：`/var/www/damatong/dist`
> - admin：`/var/www/damatong/admin-dist`
>
> 所以本方案会在切换时同步更新这两个软链。

### 发布策略（核心原则）

- **构建在新目录完成**：release 目录构建通过后才切换 `current`。
- **切换是原子的**：软链切换是 O(1)，不会出现半更新状态。
- **保留历史版本**：默认保留最近 N 个 release，便于回滚。

### 使用方式（推荐）

在服务器上执行（支持 `push main` 后部署，或按 commit 部署）：

```bash
# 部署 main 最新
bash deploy/release/deploy.sh

# 部署指定提交（可选）
RELEASE_REF=origin/main bash deploy/release/deploy.sh

# 回滚到上一个 release
bash deploy/release/rollback.sh

# 查看 release 列表
ls -1 /var/www/damatong/releases
readlink -f /var/www/damatong/current
```

### 环境变量（可选）

脚本默认值适配你当前项目结构；如服务器目录不同，可用环境变量覆盖：

- `DEPLOY_BASE`：默认 `/var/www/damatong`
- `REPO_DIR`：默认 `$DEPLOY_BASE/app`（如果你把仓库 clone 在别处，就改这个）
- `KEEP_RELEASES`：默认 `2`
- `KEEP_ROLLBACKS`：默认 `1`（常用部署入口清理 `/var/www/damatong/rollback-*` 时使用）
- `STALE_ASSET_DAYS`：默认 `14`（只清理超过该天数且未被当前页面引用的旧 JS/CSS chunk）
- `RELEASE_REF`：默认 `origin/main`
- `NODE_ENV`：默认 `production`
- `PM2_APP_NAME`：可选，指定 PM2 应用名（否则重启 all）
- `SYSTEMD_SERVICE`：可选，指定 systemd 服务名（否则尝试自动发现）

### 发版后检查清单

未配置 `CF_API_TOKEN` / `CF_ZONE_ID` 时，脚本**不会**自动清 Cloudflare 边缘缓存。每次前端发版成功后，请按清单执行 **Purge Everything**：

→ **[POST-RELEASE-CHECKLIST.md](./POST-RELEASE-CHECKLIST.md)**

### 磁盘清理

常用部署入口会在健康检查通过后调用：

```bash
DEPLOY_BASE=/var/www/damatong KEEP_RELEASES=2 KEEP_ROLLBACKS=1 bash deploy/cleanup-damatong-static.sh
```

这个脚本只清理未被 `current` / `dist` / `admin-dist` 使用的旧 `releases/*` 和 `rollback-*` 目录；同时只清理超过 `STALE_ASSET_DAYS` 且未被当前入口、service worker 或当前 JS/CSS 引用的旧 `.js` / `.css` / `.map` chunk。需要先预览时可加 `DRY_RUN=1`。

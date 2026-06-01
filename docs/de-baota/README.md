# 去宝塔化（标准 Linux 生产部署）

本目录包含四份正式文档，与仓库内脚本共同构成「不依赖宝塔面板」的部署闭环：

1. [01-宝塔依赖清单.md](./01-宝塔依赖清单.md)
2. [02-迁移修改清单.md](./02-迁移修改清单.md)
3. [03-删除执行清单.md](./03-删除执行清单.md)
4. [04-最终验收报告.md](./04-最终验收报告.md)
5. [05-卸载后影响修复.md](./05-卸载后影响修复.md)（配套 `scripts/post-baota-fix.sh` 自动诊断）

**标准入口**：

- 部署：`deploy/production-deploy.sh`（`PROJECT_DIR` 默认 `/var/www/click-send-shop`）
- CI 聚合：`deploy/ci-deploy.sh`
- Nginx 示例：`deploy/nginx/site.prod.example.conf`
- 进程守护：`deploy/systemd/README.md`（PM2 + `pm2 startup systemd`）
- 路径迁移：`scripts/migrate-from-baota-path.sh`（在服务器执行）

SEO 关键页（`/product/:id`、`/categories`）需要按 Nginx 示例反代到 Node，由后端读取 Vite `dist/index.html` 并注入公开商品/分类与 `site_settings` SEO 字段；不要让这些路径直接 `try_files` 回静态 `index.html`。

历史兼容入口已删除：

- 不再保留 `deploy/baota-simple-deploy.sh`、`deploy/baota-verify-deploy.sh`、`deploy/wwwroot-gc-api-deploy.sh`。
- 部署统一使用 `deploy/production-deploy.sh` 或 `deploy/ci-deploy.sh`。
- 部署后验证统一使用 `deploy/verify-post-deploy.sh` 或 `deploy/verify-pm2.sh`。

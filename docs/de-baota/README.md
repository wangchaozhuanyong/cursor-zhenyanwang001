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

历史兼容（仍指向旧 `/www/wwwroot/...` 未改环境变量时）：

- `deploy/baota-simple-deploy.sh` → `production-deploy.sh`
- `deploy/baota-verify-deploy.sh` → `verify-post-deploy.sh`

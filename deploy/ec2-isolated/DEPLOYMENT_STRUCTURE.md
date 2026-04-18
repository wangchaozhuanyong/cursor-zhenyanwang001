# 多项目隔离部署结构说明

本文档描述本机 `/srv/projects/` 下的标准隔离架构，适用于在同一台 Ubuntu EC2 上运行多个独立站点（Nginx + Node + PM2）。

## 1. 目录结构

```
/srv/projects/
├── DEPLOYMENT_STRUCTURE.md    # 本说明
├── gift-system/
│   ├── frontend/              # 前端构建产物（如 Vite/React 的 dist）
│   ├── backend/             # Node 后端代码与 package.json
│   ├── logs/                # Nginx 与 PM2 等项目日志（勿与其它项目混用）
│   ├── uploads/             # 本业务上传文件根目录（可选）
│   └── scripts/             # 部署脚本、PM2 ecosystem 等
└── renovation-site/
    ├── frontend/
    ├── backend/
    ├── logs/
    ├── uploads/
    └── scripts/
```

每个项目在磁盘、日志路径、端口、PM2 进程名上完全独立。

## 2. 端口分配

| 项目 | 后端监听端口 | 说明 |
|------|----------------|------|
| gift-system | 3001 | 由 `backend/.env` 中 `PORT` 与 PM2 配置一致 |
| renovation-site | 3002 | 同上 |

前端由 Nginx 静态托管，不占用业务端口（仅 80/443 由 Nginx 统一入口）。

## 3. PM2 进程规划

| 进程名 | 工作目录 | 端口 | 日志（建议） |
|--------|-----------|------|----------------|
| gift-api | /srv/projects/gift-system/backend | 3001 | /srv/projects/gift-system/logs/pm2-*.log |
| renovation-api | /srv/projects/renovation-site/backend | 3002 | /srv/projects/renovation-site/logs/pm2-*.log |

上线后示例：

```bash
cd /srv/projects/gift-system/backend && pm2 start ecosystem.config.cjs --only gift-api
cd /srv/projects/renovation-site/backend && pm2 start ecosystem.config.cjs --only renovation-api
pm2 save
```

（具体以各项目 `ecosystem.config.cjs` 为准。）

## 4. Nginx 配置

配置文件位于 `/etc/nginx/sites-available/`，启用时在 `sites-enabled/` 建立符号链接：

| 文件 | 用途 |
|------|------|
| gift-frontend.conf | gift 前端静态根目录 |
| gift-api.conf | 反代到 127.0.0.1:3001 |
| renovation-frontend.conf | renovation 前端静态根目录 |
| renovation-api.conf | 反代到 127.0.0.1:3002 |

每个 `server` 块使用各自的 `access_log` / `error_log`，路径均在对应项目的 `logs/` 下。

修改域名：编辑各文件中的 `server_name`，然后：

```bash
sudo nginx -t && sudo systemctl reload nginx
```

## 5. 新增第三个项目时如何扩展

1. 在 `/srv/projects/` 下新建目录，例如 `third-app/`，同样包含 `frontend/`、`backend/`、`logs/`、`uploads/`、`scripts/`。
2. 为新后端分配**未占用端口**（如 3003），在 `backend/.env` 与 PM2 中保持一致。
3. 在 `/etc/nginx/sites-available/` 新增 `third-frontend.conf`、`third-api.conf`（或统一命名规范），日志指向 `/srv/projects/third-app/logs/`。
4. `sites-enabled/` 中 `ln -s` 启用新配置，`nginx -t` 后 reload。
5. `pm2` 使用新进程名（如 `third-api`），**不要**复用其它项目的 ecosystem 文件路径。

## 6. 绝对不能混用的地方

- **日志路径**：各项目只写自己的 `logs/`，勿把两个项目的 Nginx/PM2 日志指到同一文件。
- **Nginx root / proxy_pass**：每个站点独立 `server` 块；API 反代端口必须与该项目后端 `PORT` 一致。
- **环境变量**：每个项目仅在各自 `backend/.env` 维护；勿共用一份全局 `.env` 给两个业务。
- **上传目录**：`uploads/` 按项目隔离，避免权限与路径串用。
- **PM2 进程名**：保持唯一，便于 `pm2 logs <name>` 与监控区分。

## 7. 当前阶段说明

本阶段仅完成目录、Nginx 模板、环境变量示例与文档，**未部署业务代码、未配置生产数据库、未申请 SSL**。上线业务时请将代码放入对应 `frontend/` / `backend/`，替换示例域名并配置 HTTPS（如 Certbot 或 ACM + 负载均衡）。

## 8. 与机器上旧部署（如宝塔 / 旧 PM2）共存时注意

- 若本机曾安装宝塔，其自带的 `/www/server/nginx` 会占用 **80** 端口，与系统包 `nginx`（`/usr/sbin/nginx`）冲突。标准架构应使用 **apt 安装的 Nginx**，并停止宝塔内置 Nginx（`nginx -s quit`，路径以实际为准）。
- **端口**：`gift-system` 使用 **3001**、`renovation-site` 使用 **3002**。若 PM2 中已有其它进程占用同端口，需先 `pm2 stop` / 调整端口后再启动新项目，避免「反代串到旧服务」。

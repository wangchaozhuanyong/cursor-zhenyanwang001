# 后端本地启动指南

## 前置条件

- Node.js >= 18
- MySQL >= 8.0
- 复制 `.env.example` 为 `.env`，填入数据库连接信息

## 快速启动

```bash
# 1. 安装依赖
npm install

# 2. 初始化数据库（需要 server/sql/ 目录下有建表脚本）
npm run db:init

# 3. 执行增量迁移
npm run migrate

# 4. 创建管理员账号
npm run admin:create

# 5. 启动开发服务器
npm run dev
```

## 建库方式说明

本项目提供两条建库路径：

| 路径 | 命令 | 说明 |
|------|------|------|
| SQL 脚本初始化 | `npm run db:init` | 执行 `server/sql/` 下的 `init.sql`→`extend.sql`→`extend2.sql`→`extend3.sql`→`seed.sql`，适合全新环境 |
| 增量迁移 | `npm run migrate` | 执行 `server/migrations/` 下的迁移文件，适合已有数据库的增量升级 |

> **新环境推荐**：先 `db:init`，再 `migrate`，确保所有表和迁移都就绪。

## 测试命令

| 命令 | 说明 |
|------|------|
| `npm test` | 健康检查单测 |
| `npm run test:integration` | 认证流程集成测试 |
| `npm run test:flow` | 端到端 Smoke 测试（需要运行中的数据库） |
| `npm run test:all` | 运行全部测试 |

## 其他工具脚本

| 命令 | 说明 |
|------|------|
| `npm run admin:role` | 设置管理员角色 |
| `npm run migrate:status` | 查看迁移状态 |
| `npm run migrate:down` | 回滚最近一次迁移 |

# MySQL 最小权限落地（防删库/防越权）

## 目标
- 运行中的 API 进程只使用 `app_rw`（仅 CRUD）。
- 迁移任务单独使用 `app_migrator`（仅在部署/迁移窗口使用）。
- 杜绝 `DB_USER=root` 作为生产运行账号。

## 执行步骤
1. 用 DBA 账号连接 MySQL，执行 [mysql-least-privilege.sql](./mysql-least-privilege.sql)。
2. 将脚本中的占位符替换为真实值：
   - `__APP_HOST__`：应用服务器来源（例如 `%` 或固定内网 IP）。
   - `__MIGRATOR_HOST__`：仅迁移机来源。
   - `__APP_PASSWORD__`、`__MIGRATOR_PASSWORD__`：强随机密码。
3. 生产环境设置：
   - `DB_USER=app_rw`
   - `DB_PASSWORD=<app_rw_password>`
4. 迁移时使用 `app_migrator`（不要让 Web Runtime 使用它）。

## 与当前代码的关系
- 代码已在生产环境阻止 `DB_USER=root` 启动。
- 若你开启 `RUN_MIGRATIONS_ON_BOOT=1`，请确认该进程使用的是有 DDL 权限的账号；否则建议关闭该选项，改为部署阶段手动迁移。

## 快速校验
执行：
```sql
SHOW GRANTS FOR 'app_rw'@'__APP_HOST__';
SHOW GRANTS FOR 'app_migrator'@'__MIGRATOR_HOST__';
```
确认 `app_rw` 不包含 `CREATE/ALTER/DROP/GRANT OPTION`。

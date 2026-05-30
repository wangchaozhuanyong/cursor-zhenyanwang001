# 恢复演练记录 - 2026-05-30

## 基本信息

- 演练时间：2026-05-30 06:51:27 UTC（北京时间 2026-05-30 14:51:27）
- 操作人：Codex，通过 `ubuntu@13.212.179.213` SSH 执行
- 环境：生产服务器 `/var/www/click-send-shop/server`
- 当前代码版本：`6c8216f`
- 服务状态：`gc-api` 在线，脚本路径为 `/var/www/click-send-shop/server/src/index.js`

## 自动备份确认

- `click-send-backup-full.timer`：`enabled`，`active`
- `click-send-backup-long.timer`：`enabled`，`active`
- `click-send-binlog-sync.timer`：`enabled`，`active`
- `click-send-restore-drill.timer`：`enabled`，`active`
- 最近全量数据库备份：`b0c7116c-6024-47af-8ec7-a629bb7aa640`
- 备份类型：`mysql_full`
- 存储位置：`s3`
- 备份状态：`success`
- 备份校验时间：2026-05-30 05:42:03 UTC
- 备份大小：255833 bytes

## 恢复演练结果

- 执行命令：`cd /var/www/click-send-shop/server && npm run restore:drill`
- 恢复任务 ID：`14a25d48-bbed-437e-b225-38158f484924`
- 临时数据库：`restore_tmp_14a25d48bbed437e`
- 任务状态：`validated`
- 开始时间：2026-05-30 06:51:27 UTC
- 完成时间：2026-05-30 06:51:45 UTC
- 耗时：约 18 秒
- 结果：通过
- 错误信息：无

## 备注

- 本次演练只恢复到临时库并校验，没有切换或覆盖正式数据库。
- 手动执行 `npm run backup:check` 时，`ubuntu` 用户读取 `/var/lib/mysql` 返回 `EACCES`；当前 `click-send-binlog-sync.service` 使用 `root` 运行，最近一次 systemd 运行状态为成功。
- 后续建议：把备份前置检查也改成与 systemd binlog 备份相同的权限运行，或把检查脚本拆成普通用户检查和 root 权限 binlog 检查，避免人工检查时误判。

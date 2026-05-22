# 大马通备份占满磁盘修复 Runbook

与 `damatong-backup-disk-fix.patch` 配套。代码已合入仓库，生产按下列步骤执行。

## 立即止血

```bash
sudo systemctl disable --now click-send-binlog-sync.timer || true
sudo find /var/www/click-send-shop/server/backups/mysql-binlog -type f \( -name '*.enc' -o -name '*.enc.meta.json' \) -delete
df -h /
```

## 部署修复后代码

```bash
cd /var/www/click-send-shop
git fetch origin main && git reset --hard origin/main
cd server
node --check scripts/backup/backup-lib.js
node --check scripts/backup/backup-full.js
node --check scripts/backup/backup-config.js
node --check scripts/backup/backup-binlog-sync.js
node --check scripts/backup/restore-to-temp.js
```

## .env 推荐（勿覆盖整文件，只更新键值）

```bash
MYSQL_BINLOG_FILES=
BACKUP_BINLOG_INCLUDE_ACTIVE=0
BACKUP_BINLOG_MIN_AGE_SECONDS=120
BACKUP_KEEP_LOCAL_ENCRYPTED=0
BACKUP_MIN_FREE_BYTES=1073741824
BACKUP_KEEP_RESTORE_WORKDIR=0
BACKUP_KEEP_RESTORE_DRILL_DB=0
```

## 重新启用 timer（每 5 分钟，仅已关闭 binlog）

```bash
sudo cp deploy/systemd/click-send-binlog-sync.timer.example /etc/systemd/system/click-send-binlog-sync.timer
sudo cp deploy/systemd/click-send-binlog-sync.service.example /etc/systemd/system/click-send-binlog-sync.service
sudo systemctl daemon-reload
sudo systemctl enable --now click-send-binlog-sync.timer
```

## 逻辑说明

1. 默认跳过 **active** binlog，只同步已轮转文件。
2. S3 上传成功后删除本地 `.enc` staging（`BACKUP_KEEP_LOCAL_ENCRYPTED=0`）。
3. 全量/配置备份删除中间 `.sql`、`.gz` 明文。
4. 磁盘低于 `BACKUP_MIN_FREE_BYTES`（默认 1GB）时中止备份。
5. restore drill 成功后删除临时库与 `restore-work` 目录。

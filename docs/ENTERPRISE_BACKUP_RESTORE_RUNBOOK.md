# Enterprise Backup and Restore Runbook

Last updated: 2026-05-22

## Goals

- Full MySQL backup every 4 hours.
- Long-term full MySQL backup daily.
- Pre-deploy, pre-migration, and pre-cleanup backups before destructive operations.
- Point-in-time recovery with full backup plus MySQL binlog, targeting <= 1 minute object-storage RPO.
- Restore to a temporary database first; production switch or merge requires super admin approval and MFA.

## Required Environment

```bash
BACKUP_S3_BUCKET=your-backup-bucket
BACKUP_S3_REGION=ap-southeast-1
BACKUP_S3_PREFIX=shop-backups
BACKUP_ENCRYPTION_KEY=replace-with-secret-from-kms-or-secrets-manager
BACKUP_ENCRYPTION_KEY_ID=prod-backup-key-v1
MYSQL_BINLOG_DIR=/var/lib/mysql
MYSQL_BINLOG_FILES=mysql-bin.000001
BACKUP_BEFORE_DEPLOY=1
BACKUP_BEFORE_MIGRATION=1
```

Local-only development can set `BACKUP_ALLOW_LOCAL_ONLY=1`, but production must upload to object storage.

## MySQL Binlog

Production MySQL must enable:

```ini
server_id=1
log_bin=mysql-bin
binlog_format=ROW
binlog_row_image=FULL
sync_binlog=1
gtid_mode=ON
enforce_gtid_consistency=ON
binlog_expire_logs_seconds=604800
```

The repository `docker-compose.yml` enables the same settings for containerized MySQL.

## Schedules

Example cron:

```cron
0 */4 * * * cd /var/www/click-send-shop/server && npm run backup:full >> /var/log/click-send-shop-backup.log 2>&1
20 2 * * * cd /var/www/click-send-shop/server && BACKUP_KIND=long npm run backup:full >> /var/log/click-send-shop-backup.log 2>&1
* * * * * cd /var/www/click-send-shop/server && npm run backup:binlog >> /var/log/click-send-shop-binlog.log 2>&1
30 4 * * * cd /var/www/click-send-shop/server && npm run restore:drill >> /var/log/click-send-shop-restore-drill.log 2>&1
```

`deploy/production-deploy.sh` and `deploy/safe-update.sh` now run a pre-deploy full backup. `server/scripts/migrate-cli.js` runs a pre-migration backup when `BACKUP_BEFORE_MIGRATION=1`.

## Object Storage Policy

- Enable S3 versioning.
- Enable Object Lock for important backups.
- Upload identity must allow `s3:PutObject`, `s3:AbortMultipartUpload`, and required list calls only.
- Upload identity must not allow `s3:DeleteObject` or object lock bypass.
- Restore identity should be separate and read-only.
- Policy templates:
  - `deploy/aws/backup-upload-policy.example.json`
  - `deploy/aws/backup-restore-read-policy.example.json`

## systemd Timers

Example unit/timer templates are provided under `deploy/systemd`:

- `click-send-backup-full.*`: full backup every 4 hours.
- `click-send-backup-long.*`: long-term full backup daily.
- `click-send-binlog-sync.*`: binlog sync every minute.
- `click-send-restore-drill.*`: restore drill daily.

Install by copying the `.example` files to `/etc/systemd/system/` without the `.example` suffix, then run:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now click-send-backup-full.timer
sudo systemctl enable --now click-send-backup-long.timer
sudo systemctl enable --now click-send-binlog-sync.timer
sudo systemctl enable --now click-send-restore-drill.timer
```

## Restore Flow

1. Create a restore job in `系统设置 -> 数据安全 -> 备份与恢复`.
2. Worker restores full backup into `restore_tmp_*`.
3. Worker applies binlogs until the target timestamp when point-in-time recovery is requested.
4. Worker validates key tables and creates a diff/validation report.
5. Super admin reviews the temporary database result.
6. Super admin confirms with recent MFA.
7. Production switch or merge is performed by the controlled ops procedure.

Deletion of backup files is intentionally not exposed in the admin UI.

`restore-to-temp.js` refuses to operate on database names that do not match `restore_tmp_*`, and drops/recreates only that temporary database.

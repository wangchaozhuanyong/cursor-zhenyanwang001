# Backup and Restore (Production)

Last updated: 2026-05-19

## 1. Backup objects (must-have)

1. Database (MySQL production data).
2. Production environment config (`server/.env`, managed securely outside git).
3. Upload/static assets (`public/uploads` when local mode, or S3 bucket/prefix when `STORAGE_DRIVER=s3`).
4. PM2 process config (`server/ecosystem.config.cjs` and `~/.pm2/dump.pm2`).
5. Current release commit (`git rev-parse HEAD`) and deployment history (`.deploy-state/history.log` when present).

## 2. Existing backup tooling in repo

1. Windows DB backup: `scripts/backup-mysql.ps1`
2. Linux/macOS DB backup: `scripts/backup-mysql.sh`

## 3. Backup execution baseline

1. DB: full backup at least daily, retain >= 7 days.
2. `.env`: backup on every config change (encrypted vault copy).
3. uploads/assets: daily snapshot or object storage versioning.
4. PM2 config and deploy metadata: backup every release.

## 4. Restore procedure (drill baseline)

### 4.1 Restore database

1. Stop write traffic (maintenance mode or ingress freeze).
2. Import latest valid SQL backup into target DB.
3. Run basic consistency checks (orders/users/payments counts, latest transaction records).

### 4.2 Restore environment variables

1. Restore `server/.env` from secure backup.
2. Re-validate required keys (`JWT_SECRET`, `DB_*`, `CORS_ORIGINS`, `PUBLIC_APP_URL`, payment/webhook secrets).

### 4.3 Roll back code version

1. Identify target commit from deployment history.
2. Reset worktree to target commit (server-side release script flow).
3. Re-run deployment script to ensure consistent process state.

### 4.4 Restart PM2

```bash
cd /var/www/click-send-shop/server
pm2 start ecosystem.config.cjs --env production || pm2 reload gc-api --update-env
pm2 save
```

### 4.5 Verify restore success

1. `GET /api/health/live` returns 200.
2. `GET /api/health/ready` returns 200.
3. `pm2 show gc-api` status is `online`.
4. Execute `bash deploy/check-production-health.sh` and confirm pass.
5. Validate one full critical flow (login -> order -> notification read).

## 5. Recovery drill record template

```text
Drill Time:
Operator:
Environment:
Target Restore Version (commit):
Backup Snapshot Time:
RTO (minutes):
RPO (minutes):
Result (Pass/Fail):
Issues Found:
Temporary Mitigation:
Follow-up Actions:
Approval:
```

## 6. Go-live minimum evidence

1. Most recent successful restore drill record.
2. RTO/RPO measured values.
3. Post-restore verification logs and screenshots.
4. Owner sign-off from engineering + ops.


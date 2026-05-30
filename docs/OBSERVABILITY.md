# Observability and Alerting (Production)

Last updated: 2026-05-19  
Applies to: `gc-api` (`server/src/index.js`) on PM2

## 1. Required monitors

1. API liveness: `GET /api/health/live` must return 200.
2. API readiness: `GET /api/health/ready` must return 200.
3. PM2 process status: app `gc-api` must stay `online`.
4. 5xx error rate from Nginx access logs.
5. API response latency (baseline from `/api/health/live`).
6. Disk usage on `/`.
7. Memory usage.
8. CPU usage.

## 2. Alert thresholds (P0 baseline)

1. `ready` endpoint consecutive failures >= 3 times: alert.
2. 5xx rate > 1%: alert.
3. API response latency > 2 seconds: alert.
4. Disk usage > 80%: alert.
5. Memory usage > 85%: alert.
6. CPU usage > 85%: alert.

## 3. Runbook command (single-shot health gate)

```bash
bash deploy/check-production-health.sh
```

Optional runtime overrides:

```bash
API_BASE_URL=http://127.0.0.1:3001 PM2_APP=gc-api NGINX_ACCESS_LOG=/var/log/nginx/access.log bash deploy/check-production-health.sh
```

Optional webhook alert on failure:

```bash
HEALTH_ALERT_WEBHOOK_URL=https://example.com/webhook bash deploy/check-production-health.sh
```

If `server/.env` is available and Telegram is configured in the admin backend, the health check will try Telegram first and use the webhook only as fallback.

## 4. Suggested continuous checks

1. Every 1 minute: run liveness + readiness + PM2 online.
2. Every 5 minutes: run full script including host metrics + 5xx sample.
3. Deployment gate: run once before cutover and once after cutover.

Systemd timer examples are provided in:

1. `deploy/systemd/click-send-health-check.service.example`
2. `deploy/systemd/click-send-health-check.timer.example`

Install shape on the server:

```bash
sudo cp deploy/systemd/click-send-health-check.service.example /etc/systemd/system/click-send-health-check.service
sudo cp deploy/systemd/click-send-health-check.timer.example /etc/systemd/system/click-send-health-check.timer
sudo systemctl daemon-reload
sudo systemctl enable --now click-send-health-check.timer
systemctl list-timers | grep click-send-health-check
```

## 5. Notification chain (on-call)

1. L1 (0-10 min): release engineer / on-call backend.
2. L2 (10-20 min): SRE/ops owner + tech lead.
3. L3 (20-30 min): product owner + incident commander.

Recommended channels:

1. Primary: team IM incident channel (for example, Slack/Feishu/Teams).
2. Secondary: phone call tree (for P0 in non-working hours).
3. Tertiary: status update in release war-room thread every 15 minutes.

Escalation policy:

1. Any P0 threshold breach: freeze rollout immediately.
2. If unresolved in 10 minutes: escalate to L2 and prepare rollback.
3. If unresolved in 20 minutes: execute rollback and notify business stakeholders.

## 6. Evidence checklist

1. Screenshot/log of successful `check-production-health.sh`.
2. Latest `pm2 show gc-api` output.
3. Sample Nginx access log based 5xx computation.
4. Incident contact list with real names/phone numbers (kept in internal ops vault, not in git).

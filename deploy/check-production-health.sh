#!/usr/bin/env bash
set -euo pipefail

# Production health guard for pre-release / post-release checks.
# Usage:
#   bash deploy/check-production-health.sh
# Optional env:
#   API_BASE_URL=http://127.0.0.1:3001
#   PM2_APP=gc-api
#   NGINX_ACCESS_LOG=/var/log/nginx/access.log
#   LOG_SAMPLE_LINES=1000
#   HEALTH_ALERT_WEBHOOK_URL=https://example.com/webhook

API_BASE_URL="${API_BASE_URL:-http://127.0.0.1:3001}"
PM2_APP="${PM2_APP:-gc-api}"
NGINX_ACCESS_LOG="${NGINX_ACCESS_LOG:-/var/log/nginx/access.log}"
LOG_SAMPLE_LINES="${LOG_SAMPLE_LINES:-1000}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

READY_FAIL_THRESHOLD="${READY_FAIL_THRESHOLD:-3}"
MAX_5XX_RATE_PERCENT="${MAX_5XX_RATE_PERCENT:-1}"
MAX_API_LATENCY_SEC="${MAX_API_LATENCY_SEC:-2}"
MAX_DISK_PERCENT="${MAX_DISK_PERCENT:-80}"
MAX_MEM_PERCENT="${MAX_MEM_PERCENT:-85}"
MAX_CPU_PERCENT="${MAX_CPU_PERCENT:-85}"

failed=0

ok() { echo "[OK] $*"; }
warn() { echo "[WARN] $*"; }
alert() { echo "[ALERT] $*"; failed=1; }

json_escape() {
  printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'
}

notify_failure() {
  local host now message payload
  host="$(hostname 2>/dev/null || echo unknown-host)"
  now="$(date -Is 2>/dev/null || date)"
  message="ALERT: production health check failed on ${host} at ${now}. API_BASE_URL=${API_BASE_URL}, PM2_APP=${PM2_APP}"

  if [[ -f "${PROJECT_ROOT}/server/.env" && -f "${PROJECT_ROOT}/deploy/send-telegram-health-alert.js" ]]; then
    if (
      set -a
      # shellcheck disable=SC1090
      . "${PROJECT_ROOT}/server/.env"
      set +a
      ALERT_MESSAGE="${message}" node "${PROJECT_ROOT}/deploy/send-telegram-health-alert.js"
    ); then
      ok "failure alert sent to Telegram"
      return 0
    fi
    warn "failed to send Telegram alert"
  fi

  if [[ -n "${HEALTH_ALERT_WEBHOOK_URL:-}" ]]; then
    payload="{\"text\":\"$(json_escape "${message}")\"}"
    if curl -fsS -m 8 -H 'Content-Type: application/json' -d "${payload}" "${HEALTH_ALERT_WEBHOOK_URL}" >/dev/null; then
      ok "failure alert sent to HEALTH_ALERT_WEBHOOK_URL"
      return 0
    fi
    warn "failed to send HEALTH_ALERT_WEBHOOK_URL alert"
    return 0
  fi

  warn "no Telegram config or webhook configured; skip external alert"
}

echo "== Production Health Check =="
echo "API_BASE_URL=${API_BASE_URL}"
echo "PM2_APP=${PM2_APP}"

if curl -fsS "${API_BASE_URL}/api/health/live" >/dev/null; then
  ok "API liveness is reachable"
else
  alert "API liveness check failed: ${API_BASE_URL}/api/health/live"
fi

ready_fail=0
for i in 1 2 3; do
  code="$(curl -s -o /dev/null -w "%{http_code}" "${API_BASE_URL}/api/health/ready" || true)"
  if [[ "${code}" == "200" ]]; then
    ok "Ready check #${i}: 200"
  else
    warn "Ready check #${i}: ${code}"
    ready_fail=$((ready_fail + 1))
  fi
  sleep 1
done
if [[ "${ready_fail}" -ge "${READY_FAIL_THRESHOLD}" ]]; then
  alert "ready endpoint failed ${ready_fail} consecutive times (threshold=${READY_FAIL_THRESHOLD})"
else
  ok "ready consecutive failure threshold not reached"
fi

if command -v pm2 >/dev/null 2>&1; then
  pm2_line="$(
    PM2_APP="${PM2_APP}" pm2 jlist 2>/dev/null | node -e "
let raw = '';
process.stdin.on('data', (chunk) => raw += chunk);
process.stdin.on('end', () => {
  try {
    const app = JSON.parse(raw).find((item) => item && item.name === process.env.PM2_APP);
    process.stdout.write(app?.pm2_env?.status || '');
  } catch {}
});
" || true
  )"
  if [[ "${pm2_line}" == "online" ]]; then
    ok "PM2 app ${PM2_APP} is online"
  else
    alert "PM2 app ${PM2_APP} status is '${pm2_line:-unknown}'"
  fi
else
  alert "pm2 command not found"
fi

latency="$(curl -s -o /dev/null -w "%{time_total}" "${API_BASE_URL}/api/health/live" || echo "999")"
latency_over="$(awk -v x="${latency}" -v t="${MAX_API_LATENCY_SEC}" 'BEGIN{if(x>t)print 1; else print 0}')"
if [[ "${latency_over}" == "1" ]]; then
  alert "API latency ${latency}s > ${MAX_API_LATENCY_SEC}s"
else
  ok "API latency ${latency}s <= ${MAX_API_LATENCY_SEC}s"
fi

if [[ -f "${NGINX_ACCESS_LOG}" ]]; then
  rate_out="$(tail -n "${LOG_SAMPLE_LINES}" "${NGINX_ACCESS_LOG}" | awk '
    BEGIN { total=0; err=0; }
    {
      code=$9;
      if (code ~ /^[0-9][0-9][0-9]$/) {
        total++;
        if (code ~ /^5/) err++;
      }
    }
    END {
      if (total == 0) print "0 0 0.00";
      else printf "%d %d %.2f", total, err, (err*100/total);
    }')"
  total_req="$(echo "${rate_out}" | awk '{print $1}')"
  err_req="$(echo "${rate_out}" | awk '{print $2}')"
  err_rate="$(echo "${rate_out}" | awk '{print $3}')"
  err_over="$(awk -v x="${err_rate}" -v t="${MAX_5XX_RATE_PERCENT}" 'BEGIN{if(x>t)print 1; else print 0}')"
  if [[ "${err_over}" == "1" ]]; then
    alert "5xx rate ${err_rate}% > ${MAX_5XX_RATE_PERCENT}% (sample=${total_req}, 5xx=${err_req})"
  else
    ok "5xx rate ${err_rate}% <= ${MAX_5XX_RATE_PERCENT}% (sample=${total_req})"
  fi
else
  warn "Nginx access log not found at ${NGINX_ACCESS_LOG}; skip 5xx rate check"
fi

disk_used="$(df -P / | awk 'NR==2{gsub(/%/,"",$5); print $5}')"
if [[ "${disk_used}" -gt "${MAX_DISK_PERCENT}" ]]; then
  alert "disk usage ${disk_used}% > ${MAX_DISK_PERCENT}%"
else
  ok "disk usage ${disk_used}% <= ${MAX_DISK_PERCENT}%"
fi

mem_used="$(free | awk '/Mem:/ {printf "%.0f", ($3/$2)*100}')"
if [[ "${mem_used}" -gt "${MAX_MEM_PERCENT}" ]]; then
  alert "memory usage ${mem_used}% > ${MAX_MEM_PERCENT}%"
else
  ok "memory usage ${mem_used}% <= ${MAX_MEM_PERCENT}%"
fi

cpu_idle="$(top -bn1 | awk -F',' '/Cpu\(s\)/ {for(i=1;i<=NF;i++){if($i ~ / id/){gsub(/[^0-9.]/,"",$i); print $i; exit}}}')"
if [[ -n "${cpu_idle}" ]]; then
  cpu_used="$(awk -v idle="${cpu_idle}" 'BEGIN{printf "%.0f", 100-idle}')"
  if [[ "${cpu_used}" -gt "${MAX_CPU_PERCENT}" ]]; then
    alert "cpu usage ${cpu_used}% > ${MAX_CPU_PERCENT}%"
  else
    ok "cpu usage ${cpu_used}% <= ${MAX_CPU_PERCENT}%"
  fi
else
  warn "unable to parse CPU usage from top output"
fi

echo "== Result =="
if [[ "${failed}" -ne 0 ]]; then
  echo "Production health check FAILED"
  notify_failure
  exit 2
fi
echo "Production health check PASSED"

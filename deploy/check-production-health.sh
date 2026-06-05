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
#   DEPLOY_LOCK_FILE=/var/www/click-send-shop/.deploy.lock
#   LIVE_RETRY_ATTEMPTS=5
#   LIVE_RETRY_DELAY_SEC=1
#   CPU_SAMPLE_ATTEMPTS=3
#   CPU_SAMPLE_INTERVAL_SEC=1
#   HEALTH_ALERT_WEBHOOK_URL=https://example.com/webhook

API_BASE_URL="${API_BASE_URL:-http://127.0.0.1:3001}"
PM2_APP="${PM2_APP:-gc-api}"
NGINX_ACCESS_LOG="${NGINX_ACCESS_LOG:-/var/log/nginx/access.log}"
LOG_SAMPLE_LINES="${LOG_SAMPLE_LINES:-1000}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
DEPLOY_LOCK_FILE="${DEPLOY_LOCK_FILE:-${PROJECT_ROOT}/.deploy.lock}"

LIVE_RETRY_ATTEMPTS="${LIVE_RETRY_ATTEMPTS:-5}"
LIVE_RETRY_DELAY_SEC="${LIVE_RETRY_DELAY_SEC:-1}"
CPU_SAMPLE_ATTEMPTS="${CPU_SAMPLE_ATTEMPTS:-3}"
CPU_SAMPLE_INTERVAL_SEC="${CPU_SAMPLE_INTERVAL_SEC:-1}"
READY_FAIL_THRESHOLD="${READY_FAIL_THRESHOLD:-3}"
MAX_5XX_RATE_PERCENT="${MAX_5XX_RATE_PERCENT:-1}"
MAX_API_LATENCY_SEC="${MAX_API_LATENCY_SEC:-2}"
MAX_DISK_PERCENT="${MAX_DISK_PERCENT:-80}"
MAX_MEM_PERCENT="${MAX_MEM_PERCENT:-85}"
MAX_CPU_PERCENT="${MAX_CPU_PERCENT:-85}"

failed=0
ALERT_ITEMS=()

ok() { echo "[通过] $*"; }
warn() { echo "[警告] $*"; }
alert() {
  echo "[告警] $*"
  failed=1
  ALERT_ITEMS+=("$*")
}

is_deploy_active() {
  [[ -e "${DEPLOY_LOCK_FILE}" ]] || return 1

  if command -v flock >/dev/null 2>&1; then
    exec 8<>"${DEPLOY_LOCK_FILE}" || return 1
    if ! flock -n 8; then
      return 0
    fi
    flock -u 8 || true
    exec 8>&- || true
    return 1
  fi

  local pid
  pid="$(awk -F= '$1=="pid"{print $2; exit}' "${DEPLOY_LOCK_FILE}" 2>/dev/null || true)"
  [[ -n "${pid}" && -d "/proc/${pid}" ]]
}

check_live() {
  local attempt code
  for ((attempt = 1; attempt <= LIVE_RETRY_ATTEMPTS; attempt += 1)); do
    code="$(curl -s -o /dev/null -w "%{http_code}" "${API_BASE_URL}/api/health/live" || true)"
    if [[ "${code}" == "200" ]]; then
      if [[ "${attempt}" -eq 1 ]]; then
        ok "API 存活检查可访问"
      else
        ok "API 存活检查第 ${attempt} 次恢复：200"
      fi
      return 0
    fi

    warn "API 存活检查 #${attempt}：${code:-000}"
    if [[ "${attempt}" -lt "${LIVE_RETRY_ATTEMPTS}" ]]; then
      sleep "${LIVE_RETRY_DELAY_SEC}"
    fi
  done
  return 1
}

read_cpu_used_percent() {
  local interval="${1:-1}"
  if [[ -r /proc/stat ]]; then
    local idle1 total1 idle2 total2
    read -r idle1 total1 < <(awk '/^cpu / { idle=$5+$6; total=0; for(i=2;i<=NF;i++) total+=$i; print idle, total; exit }' /proc/stat)
    sleep "${interval}"
    read -r idle2 total2 < <(awk '/^cpu / { idle=$5+$6; total=0; for(i=2;i<=NF;i++) total+=$i; print idle, total; exit }' /proc/stat)
    awk -v idle1="${idle1}" -v total1="${total1}" -v idle2="${idle2}" -v total2="${total2}" '
      BEGIN {
        total_delta = total2 - total1;
        idle_delta = idle2 - idle1;
        if (total_delta <= 0) exit 1;
        used = (1 - idle_delta / total_delta) * 100;
        if (used < 0) used = 0;
        if (used > 100) used = 100;
        printf "%.0f", used;
      }'
    return
  fi

  top -bn1 | awk -F',' '/Cpu\(s\)/ {
    for(i=1;i<=NF;i++){
      if($i ~ / id/){
        gsub(/[^0-9.]/,"",$i);
        printf "%.0f", 100-$i;
        exit
      }
    }
  }'
}

format_cn_time() {
  TZ=Asia/Shanghai date '+%Y年%m月%d日 %H:%M:%S（北京时间）' 2>/dev/null || date '+%Y年%m月%d日 %H:%M:%S'
}

json_escape() {
  JSON_ESCAPE_VALUE="$1" node -e "process.stdout.write(JSON.stringify(process.env.JSON_ESCAPE_VALUE || '').slice(1, -1))"
}

notify_failure() {
  local host now message payload failure_summary
  host="$(hostname 2>/dev/null || echo 未知服务器)"
  now="$(format_cn_time)"
  if (( ${#ALERT_ITEMS[@]} > 0 )); then
    failure_summary="$(printf ' - %s\n' "${ALERT_ITEMS[@]}")"
  else
    failure_summary=" - 未记录具体失败项，请查看 systemd 日志。"
  fi
  message="【生产健康检查失败】
服务器：${host}
检查时间：${now}
API 地址（API_BASE_URL）：${API_BASE_URL}
PM2 进程（PM2_APP）：${PM2_APP}
失败项：
${failure_summary}
处理建议：请先按失败项检查。服务器现场日志可运行：sudo journalctl -u click-send-health-check.service -n 80 --no-pager；进一步检查 /api/health/live、/api/health/ready、PM2 状态、Nginx 日志和服务器资源。"

  if [[ -f "${PROJECT_ROOT}/server/.env" && -f "${PROJECT_ROOT}/deploy/send-telegram-health-alert.js" ]]; then
    if (
      set -a
      # shellcheck disable=SC1090
      . "${PROJECT_ROOT}/server/.env"
      set +a
      ALERT_MESSAGE="${message}" node "${PROJECT_ROOT}/deploy/send-telegram-health-alert.js"
    ); then
      ok "失败告警已发送到 Telegram"
      return 0
    fi
    warn "Telegram 失败告警发送失败"
  fi

  if [[ -n "${HEALTH_ALERT_WEBHOOK_URL:-}" ]]; then
    payload="{\"text\":\"$(json_escape "${message}")\"}"
    if curl -fsS -m 8 -H 'Content-Type: application/json' -d "${payload}" "${HEALTH_ALERT_WEBHOOK_URL}" >/dev/null; then
      ok "失败告警已发送到 HEALTH_ALERT_WEBHOOK_URL"
      return 0
    fi
    warn "HEALTH_ALERT_WEBHOOK_URL 失败告警发送失败"
    return 0
  fi

  warn "未配置 Telegram 或 Webhook，跳过外部告警"
}

echo "== 生产健康检查 =="
echo "API_BASE_URL=${API_BASE_URL}"
echo "PM2_APP=${PM2_APP}"
echo "DEPLOY_LOCK_FILE=${DEPLOY_LOCK_FILE}"

if is_deploy_active; then
  warn "检测到发布正在进行，本轮健康检查跳过告警：${DEPLOY_LOCK_FILE}"
  if [[ -s "${DEPLOY_LOCK_FILE}" ]]; then
    sed 's/^/[部署锁] /' "${DEPLOY_LOCK_FILE}" || true
  fi
  exit 0
fi

if ! check_live; then
  alert "API 存活检查失败：${API_BASE_URL}/api/health/live"
fi

ready_fail=0
for i in 1 2 3; do
  code="$(curl -s -o /dev/null -w "%{http_code}" "${API_BASE_URL}/api/health/ready" || true)"
  if [[ "${code}" == "200" ]]; then
    ok "就绪检查 #${i}：200"
  else
    warn "就绪检查 #${i}：${code}"
    ready_fail=$((ready_fail + 1))
  fi
  sleep 1
done
if [[ "${ready_fail}" -ge "${READY_FAIL_THRESHOLD}" ]]; then
  alert "就绪接口连续失败 ${ready_fail} 次（阈值=${READY_FAIL_THRESHOLD}）"
else
  ok "就绪接口未达到连续失败阈值"
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
    ok "PM2 进程 ${PM2_APP} 在线"
  else
    alert "PM2 进程 ${PM2_APP} 状态异常：${pm2_line:-unknown}"
  fi
else
  alert "未找到 pm2 命令"
fi

latency="$(curl -s -o /dev/null -w "%{time_total}" "${API_BASE_URL}/api/health/live" || echo "999")"
latency_over="$(awk -v x="${latency}" -v t="${MAX_API_LATENCY_SEC}" 'BEGIN{if(x>t)print 1; else print 0}')"
if [[ "${latency_over}" == "1" ]]; then
  alert "API 响应耗时 ${latency}s > ${MAX_API_LATENCY_SEC}s"
else
  ok "API 响应耗时 ${latency}s <= ${MAX_API_LATENCY_SEC}s"
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
    alert "5xx 错误率 ${err_rate}% > ${MAX_5XX_RATE_PERCENT}%（样本=${total_req}，5xx=${err_req}）"
  else
    ok "5xx 错误率 ${err_rate}% <= ${MAX_5XX_RATE_PERCENT}%（样本=${total_req}）"
  fi
else
  warn "未找到 Nginx 访问日志：${NGINX_ACCESS_LOG}，跳过 5xx 错误率检查"
fi

disk_used="$(df -P / | awk 'NR==2{gsub(/%/,"",$5); print $5}')"
if [[ "${disk_used}" -gt "${MAX_DISK_PERCENT}" ]]; then
  alert "磁盘使用率 ${disk_used}% > ${MAX_DISK_PERCENT}%"
else
  ok "磁盘使用率 ${disk_used}% <= ${MAX_DISK_PERCENT}%"
fi

mem_used="$(free | awk '/Mem:/ {printf "%.0f", ($3/$2)*100}')"
if [[ "${mem_used}" -gt "${MAX_MEM_PERCENT}" ]]; then
  alert "内存使用率 ${mem_used}% > ${MAX_MEM_PERCENT}%"
else
  ok "内存使用率 ${mem_used}% <= ${MAX_MEM_PERCENT}%"
fi

cpu_values=()
for ((i = 1; i <= CPU_SAMPLE_ATTEMPTS; i += 1)); do
  cpu_used="$(read_cpu_used_percent "${CPU_SAMPLE_INTERVAL_SEC}" || true)"
  if [[ -n "${cpu_used}" ]]; then
    cpu_values+=("${cpu_used}")
  fi
done
if (( ${#cpu_values[@]} > 0 )); then
  cpu_avg="$(printf '%s\n' "${cpu_values[@]}" | awk '{sum+=$1} END{printf "%.0f", sum/NR}')"
  cpu_max="$(printf '%s\n' "${cpu_values[@]}" | awk 'BEGIN{max=0} {if($1>max)max=$1} END{printf "%.0f", max}')"
  cpu_samples="$(IFS=,; echo "${cpu_values[*]}")"
  cpu_over="$(awk -v x="${cpu_avg}" -v t="${MAX_CPU_PERCENT}" 'BEGIN{if(x>t)print 1; else print 0}')"
  if [[ "${cpu_over}" == "1" ]]; then
    alert "CPU 平均使用率 ${cpu_avg}% > ${MAX_CPU_PERCENT}%（样本=${cpu_samples}，峰值=${cpu_max}%）"
  else
    ok "CPU 平均使用率 ${cpu_avg}% <= ${MAX_CPU_PERCENT}%（样本=${cpu_samples}，峰值=${cpu_max}%）"
  fi
else
  warn "无法采样 CPU 使用率"
fi

echo "== 检查结果 =="
if [[ "${failed}" -ne 0 ]]; then
  echo "生产健康检查失败"
  notify_failure
  exit 2
fi
echo "生产健康检查通过"

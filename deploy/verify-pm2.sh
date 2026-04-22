#!/usr/bin/env bash
#
# PM2 启动入口与运行态校验（CI/CD 强制验收点）
#   1) pm2 show <PM2_APP>：script 路径必须以 src/index.js 结尾，禁止 app.js
#   2) PM2 状态必须为 online
#   3) HEALTH_PORT 上有 node 在 LISTEN
#   4) /api/health/live 返回 200
#   5) /api/health/ready 返回 200（含 DB 探测）
#   6) pm2-error.log 近 200 行无关键错误
#   7) server/.env 关键变量完整（生产模式更严格）
#
# 用法（在服务器项目根执行）：
#   bash deploy/verify-pm2.sh
#
# 环境变量：
#   PM2_APP        默认 gc-api
#   HEALTH_PORT    默认 3001
#   HEALTH_PATH    默认 /api/health/live
#   READY_PATH     默认 /api/health/ready
#   PM2_ERROR_LOG  显式日志路径；不设则自动从 pm2 jlist 读取
#   PROJECT_DIR    显式项目根；不设则取脚本上一级
#   SKIP_ENV_CHECK 设为 1 时跳过 .env 检查（不推荐）
#
set -uo pipefail

PM2_APP="${PM2_APP:-gc-api}"
HEALTH_PORT="${HEALTH_PORT:-3001}"
HEALTH_PATH="${HEALTH_PATH:-/api/health/live}"
READY_PATH="${READY_PATH:-/api/health/ready}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="${PROJECT_DIR:-$(cd "$SCRIPT_DIR/.." && pwd)}"
ENV_FILE="${ENV_FILE:-$PROJECT_DIR/server/.env}"

fail=0
notes=()

note_fail() {
  fail=1
  notes+=("$1")
  echo "$1"
}

# ---------- 1) PM2 入口 ----------
echo "==== 1) pm2 show $PM2_APP : script 路径检查 ===="
if ! command -v pm2 >/dev/null 2>&1; then
  echo "❌ 未安装 pm2"
  exit 1
fi

SHOW_OUT=$(pm2 show "$PM2_APP" 2>&1 || true)
SCRIPT_PATH=$(printf '%s\n' "$SHOW_OUT" | awk -F'│' '/script path/ { gsub(/^[ \t]+|[ \t]+$/, "", $3); print $3; exit }')

if [[ -z "$SCRIPT_PATH" ]]; then
  note_fail "❌ pm2 show 没有取到 script 路径（进程可能不存在），原始输出："
  printf '%s\n' "$SHOW_OUT" | head -n 40
else
  echo "ℹ️  script path = $SCRIPT_PATH"
  if [[ "$SCRIPT_PATH" == *"src/app.js" || "$SCRIPT_PATH" == *"src\\app.js" ]]; then
    note_fail "❌ 入口指向 src/app.js（仅导出 Express app，不会 listen），请改为 src/index.js"
  elif [[ "$SCRIPT_PATH" != *"src/index.js" && "$SCRIPT_PATH" != *"src\\index.js" ]]; then
    echo "⚠️  入口不是 .../src/index.js，请确认是否预期（不会自动判失败）"
  else
    echo "✅ 入口为 src/index.js"
  fi
fi

# ---------- 2) PM2 online ----------
echo
echo "==== 2) PM2 状态必须为 online ===="
PM2_STATUS=""
if command -v node >/dev/null 2>&1; then
  PM2_STATUS=$(pm2 jlist 2>/dev/null | node -e "
    let d=''; process.stdin.on('data',c=>d+=c).on('end',()=>{
      try{
        const arr=JSON.parse(d||'[]');
        const a=arr.find(x=>x && x.name===process.argv[1]);
        if(a && a.pm2_env && a.pm2_env.status) process.stdout.write(a.pm2_env.status);
      }catch(e){}
    });" "$PM2_APP" 2>/dev/null || true)
fi
if [[ "$PM2_STATUS" == "online" ]]; then
  echo "✅ status=online"
else
  note_fail "❌ status=${PM2_STATUS:-unknown}（期望 online；查看 pm2 logs $PM2_APP --lines 80）"
fi

# ---------- 3) 端口 ----------
echo
echo "==== 3) ${HEALTH_PORT} 端口 LISTEN 检查 ===="
LISTEN_LINE=""
if command -v ss >/dev/null 2>&1; then
  LISTEN_LINE=$(ss -lntp 2>/dev/null | awk -v p=":${HEALTH_PORT}" '$4 ~ p { print; exit }')
elif command -v netstat >/dev/null 2>&1; then
  LISTEN_LINE=$(netstat -lntp 2>/dev/null | awk -v p=":${HEALTH_PORT}" '$4 ~ p { print; exit }')
else
  echo "⚠️ 无 ss/netstat，跳过端口检查（注意：CI 环境可能缺少这两个工具）"
fi

if [[ -n "$LISTEN_LINE" ]]; then
  echo "ℹ️  $LISTEN_LINE"
  if echo "$LISTEN_LINE" | grep -q "node"; then
    echo "✅ ${HEALTH_PORT} 由 node 监听"
  else
    note_fail "❌ ${HEALTH_PORT} 已被监听，但进程不是 node：$LISTEN_LINE"
  fi
elif command -v ss >/dev/null 2>&1 || command -v netstat >/dev/null 2>&1; then
  note_fail "❌ ${HEALTH_PORT} 没有进程在 LISTEN"
fi

# ---------- 4) /live ----------
echo
echo "==== 4) GET http://127.0.0.1:${HEALTH_PORT}${HEALTH_PATH} ===="
LIVE_BODY=$(mktemp)
LIVE_CODE=$(curl -sS -o "$LIVE_BODY" -w "%{http_code}" "http://127.0.0.1:${HEALTH_PORT}${HEALTH_PATH}" || echo "000")
if [[ "$LIVE_CODE" == "200" ]]; then
  echo "✅ HTTP $LIVE_CODE"
  head -c 300 "$LIVE_BODY" 2>/dev/null
  echo
else
  note_fail "❌ /live HTTP $LIVE_CODE"
  head -c 300 "$LIVE_BODY" 2>/dev/null
  echo
fi
rm -f "$LIVE_BODY" 2>/dev/null || true

# ---------- 5) /ready ----------
echo
echo "==== 5) GET http://127.0.0.1:${HEALTH_PORT}${READY_PATH} ===="
READY_BODY=$(mktemp)
READY_CODE=$(curl -sS -o "$READY_BODY" -w "%{http_code}" "http://127.0.0.1:${HEALTH_PORT}${READY_PATH}" || echo "000")
if [[ "$READY_CODE" == "200" ]]; then
  echo "✅ HTTP $READY_CODE"
  head -c 300 "$READY_BODY" 2>/dev/null
  echo
else
  note_fail "❌ /ready HTTP $READY_CODE（DB/依赖未就绪？）"
  head -c 300 "$READY_BODY" 2>/dev/null
  echo
fi
rm -f "$READY_BODY" 2>/dev/null || true

# ---------- 6) pm2-error.log ----------
echo
echo "==== 6) pm2-error.log 关键错误扫描 ===="
ERROR_LOG="${PM2_ERROR_LOG:-}"
if [[ -z "$ERROR_LOG" ]]; then
  if command -v node >/dev/null 2>&1; then
    ERROR_LOG=$(pm2 jlist 2>/dev/null | node -e "
      let d=''; process.stdin.on('data',c=>d+=c).on('end',()=>{
        try{
          const arr=JSON.parse(d||'[]');
          const a=arr.find(x=>x && x.name===process.argv[1]);
          if(a && a.pm2_env && a.pm2_env.pm_err_log_path) process.stdout.write(a.pm2_env.pm_err_log_path);
        }catch(e){}
      });" "$PM2_APP" 2>/dev/null || true)
  fi
fi

if [[ -z "$ERROR_LOG" || ! -f "$ERROR_LOG" ]]; then
  echo "⚠️ 未找到 $PM2_APP 的 pm2-error.log（可显式 export PM2_ERROR_LOG=/path/to/log）"
else
  echo "ℹ️  $ERROR_LOG"
  HITS=$(tail -n 200 "$ERROR_LOG" 2>/dev/null \
    | grep -E -i "Migration failed|ECONNREFUSED|ER_ACCESS_DENIED|ER_BAD_DB_ERROR|PROTOCOL_CONNECTION_LOST|ETIMEDOUT|UnhandledPromiseRejection|Error: connect|getaddrinfo|validateEnv|JWT_SECRET" || true)
  if [[ -n "$HITS" ]]; then
    note_fail "❌ pm2-error.log 近 200 行命中关键错误："
    echo "$HITS"
  else
    echo "✅ 近 200 行未发现迁移 / DB / 启动关键错误"
  fi
fi

# ---------- 7) .env 完整性 ----------
echo
echo "==== 7) server/.env 关键变量完整性检查 ===="
if [[ "${SKIP_ENV_CHECK:-0}" == "1" ]]; then
  echo "⏭ 跳过（SKIP_ENV_CHECK=1）"
elif [[ ! -f "$ENV_FILE" ]]; then
  note_fail "❌ 未找到 .env: $ENV_FILE"
else
  REQUIRED=(NODE_ENV PORT JWT_SECRET DB_HOST DB_PORT DB_USER DB_PASSWORD DB_NAME CORS_ORIGINS PUBLIC_APP_URL)
  PLACEHOLDERS_RE='REPLACE_ME|REPLACE_WITH_LONG_RANDOM|change_me|your_jwt_secret_change_me|__SET_PRODUCTION_ORIGIN__'
  ENV_FAIL=0
  for key in "${REQUIRED[@]}"; do
    line=$(grep -E "^${key}=" "$ENV_FILE" || true)
    val=${line#*=}
    if [[ -z "$line" ]]; then
      echo "  ❌ 缺失: $key"
      ENV_FAIL=1
    elif [[ -z "$val" ]]; then
      # DB_PASSWORD 允许空（部分 RDS/IAM 场景）；其余必须非空
      if [[ "$key" == "DB_PASSWORD" ]]; then
        echo "  ⚠️  $key 为空（如线上确实免密则忽略）"
      else
        echo "  ❌ 空值: $key"
        ENV_FAIL=1
      fi
    elif [[ "$val" =~ $PLACEHOLDERS_RE ]]; then
      echo "  ❌ 占位值未替换: $key=$val"
      ENV_FAIL=1
    else
      echo "  ✅ $key 已设置"
    fi
  done
  # 强校验：生产环境
  NODE_ENV_VAL=$(grep -E '^NODE_ENV=' "$ENV_FILE" | cut -d= -f2- || true)
  if [[ "$NODE_ENV_VAL" == "production" ]]; then
    JWT_VAL=$(grep -E '^JWT_SECRET=' "$ENV_FILE" | cut -d= -f2- || true)
    if [[ ${#JWT_VAL} -lt 64 ]]; then
      echo "  ❌ JWT_SECRET 长度 ${#JWT_VAL} < 64，生产环境禁止"
      ENV_FAIL=1
    fi
    PUB_VAL=$(grep -E '^PUBLIC_APP_URL=' "$ENV_FILE" | cut -d= -f2- || true)
    if [[ "$PUB_VAL" != https://* ]]; then
      echo "  ❌ 生产环境 PUBLIC_APP_URL 必须以 https:// 开头"
      ENV_FAIL=1
    fi
    CORS_VAL=$(grep -E '^CORS_ORIGINS=' "$ENV_FILE" | cut -d= -f2- || true)
    if [[ "$CORS_VAL" == *"*"* ]]; then
      echo "  ❌ 生产环境 CORS_ORIGINS 不允许 *"
      ENV_FAIL=1
    fi
  fi
  if [[ "$ENV_FAIL" -ne 0 ]]; then
    note_fail "❌ .env 完整性检查未通过"
  else
    echo "✅ .env 关键变量完整"
  fi
fi

# ---------- 汇总 ----------
echo
if [[ "$fail" -eq 0 ]]; then
  echo "🎉 verify-pm2 全部通过"
else
  echo "❗ verify-pm2 未通过，原因："
  for n in "${notes[@]}"; do echo "  - $n"; done
fi

exit "$fail"

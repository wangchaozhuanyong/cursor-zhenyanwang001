#!/usr/bin/env bash
#
# 部署后一键校验：后端健康检查 +（可选）磁盘 index.html 与经 Nginx 回环是否一致
#
# 用法（在项目根或任意目录，建议先 export）：
#   export PROJECT_DIR=/var/www/click-send-shop
#   export SERVER_NAME=你的域名          # 与 Nginx server_name 一致，用于本机 curl 带 Host
#   bash deploy/verify.sh
#
# 可选：
#   PORT=3001                    # 后端监听端口（默认 3001）
#   SKIP_NGINX_COMPARE=1       # 只测健康检查，不比 Nginx 与磁盘
#   DIST_INDEX=/绝对路径/index.html  # 显式指定要比对的本地 index.html
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="${PROJECT_DIR:-$(cd "$SCRIPT_DIR/.." && pwd)}"
PORT="${PORT:-3001}"
SERVER_NAME="${SERVER_NAME:-localhost}"
FRONTEND_SUB="${FRONTEND_SUB:-click-send-shop-main/click-send-shop-main}"

echo "==> verify: PROJECT_DIR=$PROJECT_DIR"
echo "==> verify: PORT=$PORT  SERVER_NAME=$SERVER_NAME (Nginx Host 头)"

fail=0

echo ""
echo "==> [1/3] GET http://127.0.0.1:${PORT}/api/health/live"
code=$(curl -sS -o /tmp/verify-health.json -w "%{http_code}" "http://127.0.0.1:${PORT}/api/health/live" || echo "000")
if [[ "$code" == "200" ]]; then
  echo "    OK HTTP $code"
  head -c 200 /tmp/verify-health.json 2>/dev/null | tr '\n' ' '
  echo ""
else
  echo "    FAIL HTTP $code (后端未监听或端口不对？)"
  fail=1
fi

if [[ "${SKIP_NGINX_COMPARE:-}" == "1" ]]; then
  echo ""
  echo "==> SKIP_NGINX_COMPARE=1，跳过 [2/3][3/3]"
  exit "$fail"
fi

resolve_local_index() {
  if [[ -n "${DIST_INDEX:-}" ]] && [[ -f "$DIST_INDEX" ]]; then
    echo "$DIST_INDEX"
    return 0
  fi
  local a="$PROJECT_DIR/$FRONTEND_SUB/dist/index.html"
  local b="$PROJECT_DIR/public-frontend/index.html"
  if [[ -f "$a" ]]; then
    echo "$a"
    return 0
  fi
  if [[ -f "$b" ]]; then
    echo "$b"
    return 0
  fi
  echo ""
}

LOCAL_INDEX=$(resolve_local_index)
if [[ -z "$LOCAL_INDEX" ]]; then
  echo ""
  echo "==> [2/3] 跳过：未找到本地 index.html（$FRONTEND_SUB/dist 或 public-frontend）"
  echo "==> [3/3] 跳过 Nginx 正文对比"
  exit "$fail"
fi

echo ""
echo "==> [2/3] 本地文件: $LOCAL_INDEX"
LOCAL_SUM=$(sha256sum "$LOCAL_INDEX" | awk '{print $1}')
echo "    sha256=$LOCAL_SUM"

echo ""
echo "==> [3/3] 经本机 Nginx: curl http://127.0.0.1/ -H \"Host: $SERVER_NAME\""
if ! REMOTE_BODY=$(curl -fsS "http://127.0.0.1/" -H "Host: ${SERVER_NAME}" 2>/dev/null); then
  echo "    FAIL：无法从 127.0.0.1:80 取首页（Nginx 未监听 80 或 server_name 不匹配？）"
  fail=1
else
  REMOTE_SUM=$(printf '%s' "$REMOTE_BODY" | sha256sum | awk '{print $1}')
  echo "    sha256=$REMOTE_SUM"
  if [[ "$LOCAL_SUM" == "$REMOTE_SUM" ]]; then
    echo "    OK：磁盘 index 与 Nginx 回环正文一致"
  else
    echo "    FAIL：不一致 → 检查 Nginx root 是否指向该 dist/public-frontend，或是否需 bash deploy.sh 同步"
    fail=1
  fi
fi

exit "$fail"

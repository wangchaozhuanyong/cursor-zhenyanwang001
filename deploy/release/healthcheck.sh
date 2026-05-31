#!/usr/bin/env bash
set -euo pipefail

# 简单健康检查：尽量不依赖内部端口，只验证对外域名/路径可访问。
# 可通过环境变量覆盖：
# - HEALTHCHECK_URLS：以空格分隔的一组 URL

HEALTHCHECK_URLS=${HEALTHCHECK_URLS:-"https://damatong.net/ https://damatong.net/zh https://damatong.net/en https://console.damatong.net/admin/login"}

echo "[healthcheck] 开始检查..."
for url in ${HEALTHCHECK_URLS}; do
  echo "[healthcheck] GET ${url}"
  code=$(curl -k -sS -o /dev/null -w "%{http_code}" --max-time 10 "${url}" || true)
  if [[ "${code}" != "200" && "${code}" != "301" && "${code}" != "302" ]]; then
    echo "[healthcheck] 失败：${url} 返回 ${code}"
    exit 1
  fi
done
echo "[healthcheck] 通过"

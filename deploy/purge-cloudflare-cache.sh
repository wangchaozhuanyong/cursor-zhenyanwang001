#!/usr/bin/env bash
set -euo pipefail

# Cloudflare cache purge helper.
# Required env:
#   CF_API_TOKEN  - token with Zone.Cache Purge permission
#   CF_ZONE_ID    - target zone id
# Optional:
#   CF_PURGE_MODE - everything|urls (default everything)
#   CF_PURGE_URLS - newline/comma separated URLs when mode=urls

CF_PURGE_MODE="${CF_PURGE_MODE:-everything}"

if [[ -z "${CF_API_TOKEN:-}" || -z "${CF_ZONE_ID:-}" ]]; then
  echo "[cf-purge] skip: missing CF_API_TOKEN or CF_ZONE_ID"
  exit 0
fi

if ! command -v curl >/dev/null 2>&1; then
  echo "[cf-purge] skip: curl not found"
  exit 0
fi

payload='{"purge_everything":true}'
if [[ "$CF_PURGE_MODE" == "urls" ]]; then
  raw="${CF_PURGE_URLS:-}"
  if [[ -z "$raw" ]]; then
    echo "[cf-purge] skip: CF_PURGE_MODE=urls but CF_PURGE_URLS empty"
    exit 0
  fi
  mapfile -t lines < <(printf '%s\n' "$raw" | tr ',' '\n' | sed '/^\s*$/d')
  if [[ ${#lines[@]} -eq 0 ]]; then
    echo "[cf-purge] skip: CF_PURGE_URLS has no valid entries"
    exit 0
  fi
  json_urls=$(printf '%s\n' "${lines[@]}" | sed 's/"/\\"/g' | awk 'BEGIN{printf "["} {printf "%s\"%s\"", (NR==1?"":","), $0} END{printf "]"}')
  payload="{\"files\":${json_urls}}"
fi

resp="$(curl -sS -X POST "https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/purge_cache" \
  -H "Authorization: Bearer ${CF_API_TOKEN}" \
  -H "Content-Type: application/json" \
  --data "$payload")"

if printf '%s' "$resp" | grep -q '"success":true'; then
  echo "[cf-purge] success"
  exit 0
fi

echo "[cf-purge] failed response: $resp"
exit 1


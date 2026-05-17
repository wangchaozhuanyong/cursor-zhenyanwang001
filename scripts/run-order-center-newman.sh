#!/usr/bin/env bash
set -euo pipefail

COLLECTION="docs/postman-order-center-collection.json"
ENV_FILE="docs/postman-order-center-environment.json"

if ! command -v newman >/dev/null 2>&1; then
  echo "newman not found. install: npm i -g newman"
  exit 1
fi

: "${BASE_URL:=http://localhost:3000}"
: "${TOKEN:=}"
: "${ORDER_ID:=}"
: "${ORDER_ITEM_ID:=}"
: "${PRODUCT_ID:=}"

newman run "$COLLECTION" \
  -e "$ENV_FILE" \
  --env-var "base_url=$BASE_URL" \
  --env-var "token=$TOKEN" \
  --env-var "order_id=$ORDER_ID" \
  --env-var "order_item_id=$ORDER_ITEM_ID" \
  --env-var "product_id=$PRODUCT_ID" \
  --reporters cli

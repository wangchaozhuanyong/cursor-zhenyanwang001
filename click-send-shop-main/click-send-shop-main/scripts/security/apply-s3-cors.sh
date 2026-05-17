#!/usr/bin/env bash
# Apply presigned-upload CORS rules to an S3 or S3-compatible bucket.
# Usage:
#   bash scripts/security/apply-s3-cors.sh my-bucket
#   AWS_ENDPOINT_URL=https://xxx.r2.cloudflarestorage.com bash scripts/security/apply-s3-cors.sh my-bucket
set -euo pipefail

BUCKET="${1:-}"
if [[ -z "$BUCKET" ]]; then
  echo "Usage: $0 <bucket-name>" >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CORS_FILE="$SCRIPT_DIR/../../docs/security/s3-cors-presigned-upload.json"

if [[ ! -f "$CORS_FILE" ]]; then
  echo "[FATAL] CORS template not found: $CORS_FILE" >&2
  exit 1
fi

if grep -q 'YOUR_PRODUCTION_DOMAIN' "$CORS_FILE"; then
  echo "[WARN] Edit $CORS_FILE and replace YOUR_PRODUCTION_DOMAIN before applying to production." >&2
fi

ARGS=(s3api put-bucket-cors --bucket "$BUCKET" --cors-configuration "file://$CORS_FILE")
if [[ -n "${AWS_ENDPOINT_URL:-}" ]]; then
  ARGS+=(--endpoint-url "$AWS_ENDPOINT_URL")
fi

echo "Applying CORS to bucket: $BUCKET"
aws "${ARGS[@]}"
echo "OK. Verify with: aws s3api get-bucket-cors --bucket $BUCKET"

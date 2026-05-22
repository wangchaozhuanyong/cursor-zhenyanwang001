#!/usr/bin/env bash
set -euo pipefail

BUCKET="${BACKUP_S3_BUCKET:?Set BACKUP_S3_BUCKET}"
REGION="${BACKUP_S3_REGION:-ap-southeast-1}"
CREATE_BUCKET="${CREATE_BACKUP_BUCKET:-0}"
LOCK_MODE="${BACKUP_OBJECT_LOCK_MODE:-GOVERNANCE}"
LOCK_DAYS="${BACKUP_OBJECT_LOCK_DAYS:-30}"

command -v aws >/dev/null 2>&1 || {
  echo "aws CLI is required" >&2
  exit 1
}

if [[ "$CREATE_BUCKET" == "1" ]]; then
  if [[ "$REGION" == "us-east-1" ]]; then
    aws s3api create-bucket \
      --bucket "$BUCKET" \
      --object-lock-enabled-for-bucket
  else
    aws s3api create-bucket \
      --bucket "$BUCKET" \
      --region "$REGION" \
      --create-bucket-configuration LocationConstraint="$REGION" \
      --object-lock-enabled-for-bucket
  fi
fi

aws s3api put-bucket-versioning \
  --bucket "$BUCKET" \
  --versioning-configuration Status=Enabled

aws s3api put-object-lock-configuration \
  --bucket "$BUCKET" \
  --object-lock-configuration "ObjectLockEnabled=Enabled,Rule={DefaultRetention={Mode=${LOCK_MODE},Days=${LOCK_DAYS}}}"

aws s3api put-public-access-block \
  --bucket "$BUCKET" \
  --public-access-block-configuration \
  BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true

echo "Backup bucket configured: $BUCKET (versioning enabled, object lock ${LOCK_MODE}/${LOCK_DAYS}d)"

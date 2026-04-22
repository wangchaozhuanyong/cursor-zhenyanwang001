#!/usr/bin/env bash
# Run all three verification scripts in sequence and print exit codes
set +e
NEW=/var/www/click-send-shop

echo "=========== 1) post-baota-autofix.sh ==========="
sudo PROJECT_DIR=$NEW PM2_APP=gc-api DEPLOY_USER=ubuntu bash $NEW/scripts/post-baota-autofix.sh 2>&1 | tail -20
af=${PIPESTATUS[0]}

echo
echo "=========== 2) post-baota-fix.sh ==========="
sudo PROJECT_DIR=$NEW PM2_APP=gc-api PORT=3001 bash $NEW/scripts/post-baota-fix.sh
pbf=$?

echo
echo "=========== 3) verify-pm2.sh ==========="
PM2_APP=gc-api HEALTH_PORT=3001 bash $NEW/deploy/verify-pm2.sh
vp=$?

echo
echo "============================================"
echo "  FINAL EXIT CODES"
echo "  post-baota-autofix.sh = $af"
echo "  post-baota-fix.sh     = $pbf"
echo "  verify-pm2.sh         = $vp"
echo "============================================"

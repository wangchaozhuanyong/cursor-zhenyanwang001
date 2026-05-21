#!/usr/bin/env bash
cd /var/www/click-send-shop
for f in \
  server/src/utils/orderRevenueSql.js \
  server/migrations/096_orders_refunded_amount.up.js \
  server/src/modules/order/service/orderRefundCompensation.service.js \
  click-send-shop-main/click-send-shop-main/src/modules/public/pages/About.tsx \
  click-send-shop-main/click-send-shop-main/src/modules/public/pages/GuestHome.tsx
do
  if [[ -f "$f" ]]; then sha256sum "$f" | awk -v p="$f" '{print substr($1,1,16), p}'; else echo "MISSING $f"; fi
done
cd server && node -e "
const {pool}=require('./src/db/pool');
(async()=>{
  const [rows]=await pool.query(\"SELECT name FROM schema_migrations WHERE name LIKE '%098%' OR name LIKE '%099%' OR name LIKE '%096%' ORDER BY name\");
  console.log('MIGRATIONS:', rows.map(r=>r.name).join(', ') || 'none');
  process.exit(0);
})().catch(e=>{console.error('DB_ERR',e.message);process.exit(1);});
" 2>&1 | tail -5

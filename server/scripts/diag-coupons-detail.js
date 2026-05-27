#!/usr/bin/env node
require('dotenv').config({ quiet: true });
const db = require('../src/config/db');

async function main() {
  const [coupons] = await db.query(`
    SELECT id, code, status, publish_status, new_user_only, member_only, auto_issue,
           claim_start_at, claim_end_at, start_date, end_date, total_quantity, claimed_count
    FROM coupons WHERE deleted_at IS NULL
  `);
  const [[ucCount]] = await db.query('SELECT COUNT(*) AS n FROM user_coupons');
  let siteCap = 'default_true';
  try {
    const [cols] = await db.query("SHOW COLUMNS FROM site_settings LIKE '%capab%'");
    if (cols.length) {
      const [[row]] = await db.query(
        'SELECT site_capabilities FROM site_settings ORDER BY updated_at DESC LIMIT 1',
      );
      siteCap = row?.site_capabilities;
    } else {
      const [[row]] = await db.query(
        'SELECT settings_json FROM site_settings ORDER BY updated_at DESC LIMIT 1',
      );
      const j = row?.settings_json;
      const parsed = typeof j === 'string' ? JSON.parse(j) : j;
      siteCap = parsed?.site_capabilities?.couponEnabled ?? parsed?.couponEnabled ?? 'not_in_json';
    }
  } catch (e) {
    siteCap = `err:${e.message}`;
  }
  console.log(
    JSON.stringify(
      { coupons, user_coupons: Number(ucCount?.n || 0), couponEnabled: siteCap },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

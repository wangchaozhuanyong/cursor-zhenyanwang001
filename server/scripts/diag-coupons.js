#!/usr/bin/env node
/**
 * 生产诊断：优惠券与领券中心（只读）
 * 用法：cd server && node scripts/diag-coupons.js
 */
require('dotenv').config();
const db = require('../src/config/db');

async function main() {
  const out = { couponEnabled: null, coupons: {}, marketing: {}, errors: [] };

  try {
    const [[row]] = await db.query(
      'SELECT site_capabilities FROM site_settings ORDER BY updated_at DESC LIMIT 1',
    );
    const sc = row?.site_capabilities;
    const parsed = typeof sc === 'string' ? JSON.parse(sc) : sc;
    out.couponEnabled = parsed?.couponEnabled;
  } catch (e) {
    out.errors.push(`site_settings: ${e.message}`);
  }

  try {
    const [[t]] = await db.query('SELECT COUNT(*) AS n FROM coupons WHERE deleted_at IS NULL');
    const [[claimable]] = await db.query(`
      SELECT COUNT(*) AS n FROM coupons c
      WHERE c.deleted_at IS NULL
        AND COALESCE(c.publish_status, CASE WHEN c.status = 'available' THEN 'active' ELSE c.status END) = 'active'
        AND c.status IN ('available', 'active')
        AND (c.claim_start_at IS NULL OR c.claim_start_at <= NOW())
        AND (c.claim_end_at IS NULL OR c.claim_end_at >= NOW())
        AND c.stop_claim_at IS NULL AND c.archived_at IS NULL AND c.invalidated_at IS NULL
        AND (c.total_quantity <= 0 OR COALESCE(c.claimed_count, 0) < c.total_quantity)
    `);
    out.coupons.total = Number(t?.n || 0);
    out.coupons.claimable_api = Number(claimable?.n || 0);
  } catch (e) {
    out.errors.push(`coupons: ${e.message}`);
  }

  try {
    const [acts] = await db.query(`
      SELECT id, title, type, status, disabled, start_at, end_at, display_positions,
             JSON_EXTRACT(activity_config, '$.coupon_ids') AS coupon_ids
      FROM marketing_activities
      WHERE deleted_at IS NULL AND type = 'coupon_activity'
      ORDER BY updated_at DESC LIMIT 15
    `);
    out.marketing.all_coupon_activity = acts;

    const [home] = await db.query(`
      SELECT id, title, status, disabled, start_at, end_at, display_positions,
             JSON_EXTRACT(activity_config, '$.coupon_ids') AS coupon_ids
      FROM marketing_activities a
      WHERE a.deleted_at IS NULL AND a.disabled = 0 AND a.status != 'draft'
        AND NOW() BETWEEN a.start_at AND a.end_at
        AND JSON_CONTAINS(COALESCE(a.display_positions, '[]'), JSON_QUOTE('home_coupon_center'), '$')
    `);
    out.marketing.home_coupon_center_active = home;
  } catch (e) {
    out.errors.push(`marketing: ${e.message}`);
  }

  console.log(JSON.stringify(out, null, 2));
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

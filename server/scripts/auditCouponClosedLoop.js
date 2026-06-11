#!/usr/bin/env node

const db = require('../src/config/db');

async function runCheck(name, sql, params = []) {
  const [rows] = await db.query(sql, params);
  return { name, count: rows.length, rows };
}

async function tableColumns(tableName) {
  const [rows] = await db.query(
    `SELECT COLUMN_NAME
       FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?`,
    [tableName],
  );
  return new Set(rows.map((row) => row.COLUMN_NAME));
}

function skippedCheck(name, reason) {
  return Promise.resolve({ name, count: 0, rows: [], skipped: true, reason });
}

async function runRepairs() {
  if (process.env.CONFIRM_COUPON_REPAIR !== '1') {
    throw new Error('Refusing to repair data without CONFIRM_COUPON_REPAIR=1');
  }

  const repairs = [];

  const [invalidatedUserCoupons] = await db.query(
    `UPDATE user_coupons uc
       JOIN coupons c ON BINARY c.id = BINARY uc.coupon_id
        SET uc.status = 'invalidated',
            uc.invalid_reason = COALESCE(uc.invalid_reason, '优惠券模板已失效'),
            uc.returned_at = COALESCE(uc.returned_at, UTC_TIMESTAMP())
      WHERE uc.status IN ('available','pending')
        AND (
          c.deleted_at IS NOT NULL
          OR c.archived_at IS NOT NULL
          OR c.invalidated_at IS NOT NULL
          OR c.stop_use_at IS NOT NULL
          OR COALESCE(c.publish_status, CASE WHEN c.status = 'available' THEN 'active' ELSE c.status END) <> 'active'
          OR c.status NOT IN ('available','active')
        )`,
  );
  repairs.push({ name: 'invalidate_closed_template_user_coupons', affectedRows: invalidatedUserCoupons.affectedRows || 0 });

  const [syncedCouponStats] = await db.query(
    `UPDATE coupons c
        SET c.claimed_count = (
              SELECT COUNT(*)
                FROM user_coupons uc
               WHERE BINARY uc.coupon_id = BINARY c.id
            ),
            c.used_count = (
              SELECT COUNT(*)
                FROM user_coupons uc
               WHERE BINARY uc.coupon_id = BINARY c.id
                 AND uc.status = 'used'
            )
      WHERE COALESCE(c.claimed_count, 0) <> (
              SELECT COUNT(*)
                FROM user_coupons uc
               WHERE BINARY uc.coupon_id = BINARY c.id
            )
         OR COALESCE(c.used_count, 0) <> (
              SELECT COUNT(*)
                FROM user_coupons uc
               WHERE BINARY uc.coupon_id = BINARY c.id
                 AND uc.status = 'used'
            )`,
  );
  repairs.push({ name: 'sync_coupon_claim_used_counts', affectedRows: syncedCouponStats.affectedRows || 0 });

  const [removedCampaignItems] = await db.query(
    `DELETE cci
       FROM coupon_campaign_items cci
       JOIN coupons c ON BINARY c.id = BINARY cci.coupon_id
      WHERE c.deleted_at IS NOT NULL
         OR c.archived_at IS NOT NULL
         OR c.invalidated_at IS NOT NULL
         OR c.stop_claim_at IS NOT NULL
         OR c.stop_use_at IS NOT NULL
         OR COALESCE(c.publish_status, CASE WHEN c.status = 'available' THEN 'active' ELSE c.status END) <> 'active'
         OR c.status NOT IN ('available','active')`,
  );
  repairs.push({ name: 'remove_closed_coupon_campaign_items', affectedRows: removedCampaignItems.affectedRows || 0 });

  for (const repair of repairs) {
    console.log(`[REPAIR] ${repair.name}: ${repair.affectedRows}`);
  }
}

async function main() {
  if (process.argv.includes('--repair')) {
    await runRepairs();
  }

  const campaignColumns = await tableColumns('coupon_campaigns');

  const checks = [
    runCheck(
      'closed_templates_with_active_user_coupons',
      `SELECT uc.id AS user_coupon_id, uc.user_id, uc.coupon_id, uc.status,
              c.title, c.deleted_at, c.archived_at, c.invalidated_at, c.stop_use_at
         FROM user_coupons uc
         JOIN coupons c ON BINARY c.id = BINARY uc.coupon_id
        WHERE uc.status IN ('available','pending')
          AND (c.deleted_at IS NOT NULL OR c.archived_at IS NOT NULL OR c.invalidated_at IS NOT NULL OR c.stop_use_at IS NOT NULL)
        LIMIT 100`,
    ),
    runCheck(
      'checkout_candidates_with_closed_templates',
      `SELECT uc.id AS user_coupon_id, uc.user_id, uc.coupon_id, uc.status,
              c.title, c.deleted_at, c.archived_at, c.invalidated_at, c.stop_use_at, c.publish_status, c.status AS coupon_status
         FROM user_coupons uc
         JOIN coupons c ON BINARY c.id = BINARY uc.coupon_id
        WHERE uc.status IN ('available','pending')
          AND (uc.valid_from IS NULL OR uc.valid_from <= UTC_TIMESTAMP())
          AND (uc.valid_until IS NULL OR uc.valid_until >= UTC_TIMESTAMP())
          AND (
            c.deleted_at IS NOT NULL OR c.archived_at IS NOT NULL OR c.invalidated_at IS NOT NULL OR c.stop_use_at IS NOT NULL
            OR COALESCE(c.publish_status, CASE WHEN c.status = 'available' THEN 'active' ELSE c.status END) <> 'active'
            OR c.status NOT IN ('available','active')
          )
        LIMIT 100`,
    ),
    runCheck(
      'claimed_count_mismatch',
      `SELECT c.id, c.title, COALESCE(c.claimed_count, 0) AS stored_claimed_count, COUNT(uc.id) AS actual_claimed_count
         FROM coupons c
         LEFT JOIN user_coupons uc ON BINARY uc.coupon_id = BINARY c.id
        GROUP BY c.id, c.title, c.claimed_count
       HAVING stored_claimed_count <> actual_claimed_count
        LIMIT 100`,
    ),
    runCheck(
      'used_count_mismatch',
      `SELECT c.id, c.title, COALESCE(c.used_count, 0) AS stored_used_count,
              SUM(CASE WHEN uc.status = 'used' THEN 1 ELSE 0 END) AS actual_used_count
         FROM coupons c
         LEFT JOIN user_coupons uc ON BINARY uc.coupon_id = BINARY c.id
        GROUP BY c.id, c.title, c.used_count
       HAVING stored_used_count <> actual_used_count
        LIMIT 100`,
    ),
    campaignColumns.has('claimed_count') && campaignColumns.has('used_count')
      ? runCheck(
          'campaign_count_mismatch',
          `SELECT cc.id, cc.title,
                  COALESCE(cc.claimed_count, 0) AS stored_claimed_count,
                  COUNT(uc.id) AS actual_claimed_count,
                  COALESCE(cc.used_count, 0) AS stored_used_count,
                  SUM(CASE WHEN uc.status = 'used' THEN 1 ELSE 0 END) AS actual_used_count
             FROM coupon_campaigns cc
             LEFT JOIN user_coupons uc ON BINARY uc.issue_activity_id = BINARY cc.id
            WHERE cc.deleted_at IS NULL
            GROUP BY cc.id, cc.title, cc.claimed_count, cc.used_count
           HAVING stored_claimed_count <> actual_claimed_count OR stored_used_count <> actual_used_count
            LIMIT 100`,
        )
      : skippedCheck('campaign_count_mismatch', 'coupon_campaigns has no claimed_count/used_count columns'),
    runCheck(
      'order_coupon_link_mismatch',
      `SELECT o.id AS order_id, o.order_no, o.coupon_uc_id, uc.order_id AS user_coupon_order_id, uc.status
         FROM orders o
         JOIN user_coupons uc ON BINARY uc.id = BINARY o.coupon_uc_id
        WHERE o.coupon_uc_id IS NOT NULL
          AND (uc.order_id IS NULL OR BINARY uc.order_id <> BINARY o.id)
          AND NOT (
            o.status IN ('cancelled','closed')
            AND uc.status IN ('available','invalidated')
            AND uc.returned_at IS NOT NULL
          )
        LIMIT 100`,
    ),
    runCheck(
      'cancelled_orders_still_occupy_coupons',
      `SELECT o.id AS order_id, o.order_no, o.status AS order_status, o.payment_status, uc.id AS user_coupon_id, uc.status AS coupon_status
         FROM orders o
         JOIN user_coupons uc ON BINARY uc.order_id = BINARY o.id
        WHERE o.status IN ('cancelled','closed')
          AND uc.status IN ('used','locked')
        LIMIT 100`,
    ),
    runCheck(
      'campaign_items_bind_closed_coupons',
      `SELECT cci.campaign_id, cci.coupon_id, c.title,
              c.deleted_at, c.archived_at, c.invalidated_at, c.stop_claim_at, c.stop_use_at
         FROM coupon_campaign_items cci
         JOIN coupons c ON BINARY c.id = BINARY cci.coupon_id
        WHERE c.deleted_at IS NOT NULL
           OR c.archived_at IS NOT NULL
           OR c.invalidated_at IS NOT NULL
           OR c.stop_claim_at IS NOT NULL
           OR c.stop_use_at IS NOT NULL
        LIMIT 100`,
    ),
  ];

  const results = await Promise.all(checks);
  let failed = false;
  for (const result of results) {
    if (result.skipped) {
      console.log(`[SKIP] ${result.name}: ${result.reason}`);
      continue;
    }
    const level = result.count > 0 ? 'WARN' : 'OK';
    if (result.count > 0) failed = true;
    console.log(`[${level}] ${result.name}: ${result.count}`);
    if (result.count > 0) console.log(JSON.stringify(result.rows.slice(0, 5), null, 2));
  }
  await db.end?.();
  process.exit(failed ? 2 : 0);
}

main().catch(async (error) => {
  console.error('[coupon-closed-loop-audit] failed:', error?.message || error);
  await db.end?.().catch(() => {});
  process.exit(1);
});

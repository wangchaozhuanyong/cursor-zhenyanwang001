#!/usr/bin/env node

const db = require('../src/config/db');

const LIMIT = Math.max(1, Math.trunc(Number(process.env.AUDIT_LIMIT || 50)));
const strict = process.argv.includes('--strict');

async function runCheck(name, sql, params = []) {
  const [rows] = await db.query(`${sql} LIMIT ${LIMIT}`, params);
  return {
    name,
    count: rows.length,
    rows,
  };
}

async function main() {
  const checks = [
    runCheck(
      'coupons_claimed_count_mismatch',
      `SELECT c.id, c.code, c.claimed_count,
              COUNT(uc.id) AS actual_claimed
         FROM coupons c
         LEFT JOIN user_coupons uc ON BINARY uc.coupon_id = BINARY c.id
        GROUP BY c.id, c.code, c.claimed_count
       HAVING COALESCE(c.claimed_count, 0) <> actual_claimed`,
    ),
    runCheck(
      'coupons_used_count_mismatch',
      `SELECT c.id, c.code, c.used_count,
              SUM(CASE WHEN uc.status = 'used' THEN 1 ELSE 0 END) AS actual_used
         FROM coupons c
         LEFT JOIN user_coupons uc ON BINARY uc.coupon_id = BINARY c.id
        GROUP BY c.id, c.code, c.used_count
       HAVING COALESCE(c.used_count, 0) <> COALESCE(actual_used, 0)`,
    ),
    runCheck(
      'campaign_coupon_stats_by_issue_activity',
      `SELECT cc.id, cc.title,
              COUNT(uc.id) AS claimed_count,
              SUM(CASE WHEN uc.status = 'used' THEN 1 ELSE 0 END) AS used_count,
              SUM(CASE WHEN uc.status = 'used' THEN COALESCE(uc.discount_amount, 0) ELSE 0 END) AS discount_total
         FROM coupon_campaigns cc
         LEFT JOIN user_coupons uc ON BINARY uc.issue_activity_id = BINARY cc.id
        WHERE cc.deleted_at IS NULL
        GROUP BY cc.id, cc.title
        ORDER BY cc.created_at DESC`,
    ),
    runCheck(
      'order_coupon_link_mismatch',
      `SELECT o.id AS order_id, o.order_no, o.coupon_uc_id,
              uc.id AS user_coupon_id, uc.order_id AS user_coupon_order_id, uc.status
         FROM orders o
         JOIN user_coupons uc ON BINARY uc.id = BINARY o.coupon_uc_id
        WHERE o.coupon_uc_id IS NOT NULL
          AND o.coupon_uc_id <> ''
          AND o.status <> 'cancelled'
          AND (uc.order_id IS NULL OR BINARY uc.order_id <> BINARY o.id)`,
    ),
    runCheck(
      'cancelled_order_still_holds_coupon',
      `SELECT o.id AS order_id, o.order_no, o.status AS order_status,
              uc.id AS user_coupon_id, uc.status AS coupon_status, uc.order_id
         FROM orders o
         JOIN user_coupons uc ON BINARY uc.order_id = BINARY o.id
        WHERE o.status = 'cancelled'
          AND uc.status = 'used'`,
    ),
    runCheck(
      'marketing_activity_sold_count_mismatch',
      `SELECT map.activity_id, ma.title, map.product_id, map.sold_count,
              COALESCE(SUM(CASE WHEN o.status <> 'cancelled' THEN oi.qty ELSE 0 END), 0) AS actual_sold
         FROM marketing_activity_products map
         JOIN marketing_activities ma ON BINARY ma.id = BINARY map.activity_id
         LEFT JOIN order_items oi
           ON BINARY oi.activity_id = BINARY map.activity_id
          AND BINARY oi.product_id = BINARY map.product_id
         LEFT JOIN orders o ON BINARY o.id = BINARY oi.order_id
        GROUP BY map.activity_id, ma.title, map.product_id, map.sold_count
       HAVING COALESCE(map.sold_count, 0) <> COALESCE(actual_sold, 0)`,
    ),
    runCheck(
      'marketing_activity_total_sold_count_mismatch',
      `SELECT ma.id, ma.title,
              COALESCE(SUM(map.sold_count), 0) AS sold_count_total,
              COALESCE(actual.actual_sold, 0) AS actual_sold
         FROM marketing_activities ma
         LEFT JOIN marketing_activity_products map ON BINARY map.activity_id = BINARY ma.id
         LEFT JOIN (
           SELECT oi.activity_id, SUM(oi.qty) AS actual_sold
             FROM order_items oi
             JOIN orders o ON BINARY o.id = BINARY oi.order_id
            WHERE o.status <> 'cancelled'
            GROUP BY oi.activity_id
         ) actual ON BINARY actual.activity_id = BINARY ma.id
        GROUP BY ma.id, ma.title, actual.actual_sold
       HAVING sold_count_total <> COALESCE(actual_sold, 0)`,
    ),
    runCheck(
      'expired_but_available_user_coupons',
      `SELECT id, coupon_id, user_id, status, valid_until
         FROM user_coupons
        WHERE status IN ('available', 'pending')
          AND valid_until IS NOT NULL
          AND valid_until < UTC_TIMESTAMP()`,
    ),
    runCheck(
      'used_at_with_non_used_status',
      `SELECT id, coupon_id, user_id, status, used_at
         FROM user_coupons
        WHERE used_at IS NOT NULL
          AND status <> 'used'`,
    ),
    runCheck(
      'used_status_without_order',
      `SELECT id, coupon_id, user_id, status, order_id, order_no
         FROM user_coupons
        WHERE status = 'used'
          AND (order_id IS NULL OR order_id = '')`,
    ),
  ];

  const results = await Promise.all(checks);
  const issueCount = results
    .filter((item) => item.name !== 'campaign_coupon_stats_by_issue_activity')
    .reduce((sum, item) => sum + item.count, 0);

  console.log(JSON.stringify({
    ok: issueCount === 0,
    strict,
    limit: LIMIT,
    issue_count: issueCount,
    results,
  }, null, 2));

  if (strict && issueCount > 0) process.exitCode = 1;
}

main()
  .catch((err) => {
    console.error(JSON.stringify({ ok: false, error: err?.message || String(err) }, null, 2));
    process.exitCode = 1;
  })
  .finally(async () => {
    if (db.end) await db.end().catch(() => {});
  });

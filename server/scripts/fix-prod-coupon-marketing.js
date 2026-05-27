#!/usr/bin/env node
/**
 * 生产修复：创建领券中心营销活动 + 取消券「仅新用户」限制
 */
require('dotenv').config({ quiet: true });
const crypto = require('crypto');
const db = require('../src/config/db');

const COUPON_ID = '238d92a4-611a-4e23-b745-9a028de967ba';

async function main() {
  const [[coupon]] = await db.query(
    'SELECT id, code, new_user_only FROM coupons WHERE id = ? AND deleted_at IS NULL',
    [COUPON_ID],
  );
  if (!coupon) {
    throw new Error(`优惠券不存在: ${COUPON_ID}`);
  }

  const [upd] = await db.query(
    'UPDATE coupons SET new_user_only = 0 WHERE id = ? AND deleted_at IS NULL',
    [COUPON_ID],
  );
  console.log('coupon new_user_only -> 0, affected:', upd.affectedRows);

  const [existing] = await db.query(
    `SELECT id FROM marketing_activities
     WHERE deleted_at IS NULL AND type = 'coupon_activity'
       AND JSON_CONTAINS(COALESCE(display_positions, '[]'), JSON_QUOTE('home_coupon_center'), '$')
     LIMIT 1`,
  );

  let activityId = existing[0]?.id;
  if (activityId) {
    await db.query(
      `UPDATE marketing_activities SET
         title = ?, status = 'active', disabled = 0,
         start_at = ?, end_at = ?,
         display_positions = ?,
         activity_config = ?
       WHERE id = ? AND deleted_at IS NULL`,
      [
        '首页领券中心',
        '2026-05-26 00:00:00',
        '2026-06-07 23:59:59',
        JSON.stringify(['home_coupon_center']),
        JSON.stringify({ coupon_ids: [COUPON_ID] }),
        activityId,
      ],
    );
    console.log('updated marketing activity:', activityId);
  } else {
    activityId = crypto.randomUUID();
    await db.query(
      `INSERT INTO marketing_activities
        (id, type, title, subtitle, cover_image, display_positions, description,
         start_at, end_at, status, disabled, scope_type,
         allow_coupon_stack, allow_points_stack, allow_reward,
         activity_config, threshold_amount, discount_amount, sort_order)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        activityId,
        'coupon_activity',
        '首页领券中心',
        '',
        '',
        JSON.stringify(['home_coupon_center']),
        '生产环境自动修复：关联可领取优惠券',
        '2026-05-26 00:00:00',
        '2026-06-07 23:59:59',
        'active',
        0,
        'product',
        1,
        1,
        0,
        JSON.stringify({ coupon_ids: [COUPON_ID] }),
        null,
        null,
        0,
      ],
    );
    console.log('inserted marketing activity:', activityId);
  }

  const res = await fetch(
    'http://127.0.0.1:3000/api/marketing/coupon-center?position=home_coupon_center',
  ).catch(() => null);
  if (res?.ok) {
    const body = await res.json();
    const n = body?.data?.coupons?.length ?? 0;
    console.log('verify coupon-center coupons count:', n);
  }

  const res2 = await fetch('http://127.0.0.1:3000/api/coupons/available').catch(() => null);
  if (res2?.ok) {
    const body = await res2.json();
    console.log('verify /coupons/available count:', Array.isArray(body?.data) ? body.data.length : body);
  }

  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

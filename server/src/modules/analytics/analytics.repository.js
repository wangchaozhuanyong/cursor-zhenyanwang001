const db = require('../../config/db');

async function insertEvent(row) {
  await db.query(
    `INSERT INTO analytics_events
      (user_id, anonymous_id, session_id, event_type, module, page, product_id, variant_id, category_id, activity_id, coupon_id, keyword, order_id, amount, quantity, device, referrer, ip_hash, user_agent)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      row.user_id || null,
      row.anonymous_id || '',
      row.session_id || '',
      row.event_type,
      row.module || '',
      row.page || '',
      row.product_id || null,
      row.variant_id || null,
      row.category_id || null,
      row.activity_id || null,
      row.coupon_id || null,
      row.keyword || '',
      row.order_id || null,
      row.amount ?? null,
      row.quantity ?? null,
      row.device || '',
      row.referrer || '',
      row.ip_hash || '',
      row.user_agent || '',
    ],
  );
}

module.exports = {
  insertEvent,
};


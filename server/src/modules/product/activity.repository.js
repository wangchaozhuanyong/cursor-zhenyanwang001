const db = require('../../config/db');

function mapActiveRows(rows) {
  const out = new Map();
  for (const row of rows) {
    if (out.has(row.product_id)) continue;
    out.set(row.product_id, {
      id: row.activity_id,
      type: row.type,
      title: row.title,
      description: row.description || '',
      start_at: row.start_at,
      end_at: row.end_at,
      activity_price: Number(row.activity_price),
      limit_per_user: Number(row.limit_per_user || 0),
      activity_stock: Number(row.activity_stock || 0),
      sold_count: Number(row.sold_count || 0),
      remaining_stock: Math.max(0, Number(row.activity_stock || 0) - Number(row.sold_count || 0)),
      threshold_amount: row.threshold_amount != null ? Number(row.threshold_amount) : null,
      discount_amount: row.discount_amount != null ? Number(row.discount_amount) : null,
      status: 'active',
      status_label: '进行中',
    });
  }
  return out;
}

async function selectActiveActivitiesByProductIds(productIds) {
  if (!productIds.length) return new Map();
  const ids = [...new Set(productIds.filter(Boolean))];
  if (!ids.length) return new Map();
  const [rows] = await db.query(
    `SELECT
       ap.product_id,
       ap.activity_price,
       ap.limit_per_user,
       ap.activity_stock,
       ap.sold_count,
       a.id AS activity_id,
       a.type,
       a.title,
       a.description,
       a.start_at,
       a.end_at,
       a.threshold_amount,
       a.discount_amount
     FROM marketing_activity_products ap
     JOIN marketing_activities a ON a.id = ap.activity_id
     WHERE ap.product_id IN (${ids.map(() => '?').join(',')})
       AND a.deleted_at IS NULL
       AND a.disabled = 0
       AND NOW() BETWEEN a.start_at AND a.end_at
       AND ap.activity_price > 0
       AND ap.activity_stock > ap.sold_count
     ORDER BY ap.product_id ASC, ap.activity_price ASC, a.sort_order ASC, a.start_at DESC`,
    ids,
  );
  return mapActiveRows(rows);
}

module.exports = {
  selectActiveActivitiesByProductIds,
};

const db = require('../../config/db');

function parseJson(value, fallback) {
  if (value == null || value === '') return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function positionJsonContains(position) {
  return `JSON_CONTAINS(COALESCE(a.display_positions, '[]'), JSON_QUOTE(?), '$')`;
}

async function selectFlashSaleActivityByPosition(position) {
  const pos = String(position || 'home_flash_sale').trim();
  const [activities] = await db.query(
    `SELECT a.*
     FROM marketing_activities a
     WHERE a.deleted_at IS NULL
       AND a.disabled = 0
       AND a.type = 'flash_sale'
       AND a.status != 'draft'
       AND NOW() BETWEEN a.start_at AND a.end_at
       AND ${positionJsonContains(pos)}
     ORDER BY a.sort_order ASC, a.start_at DESC
     LIMIT 1`,
    [pos],
  );
  if (!activities.length) return null;
  const activity = activities[0];
  const [items] = await db.query(
    `SELECT ap.*, p.name AS product_name, p.cover_image, p.price AS product_price, p.stock AS product_stock
     FROM marketing_activity_products ap
     JOIN products p ON p.id = ap.product_id
     WHERE ap.activity_id = ?
       AND p.lifecycle_status = 1
       AND ap.activity_price > 0
       AND ap.activity_stock > ap.sold_count
     ORDER BY ap.sort_order ASC, ap.id ASC`,
    [activity.id],
  );
  const [scopes] = await db.query(
    'SELECT scope_type, scope_id FROM marketing_activity_scopes WHERE activity_id = ?',
    [activity.id],
  );
  return {
    activity: {
      ...activity,
      display_positions: parseJson(activity.display_positions, []),
      activity_config: parseJson(activity.activity_config, null),
      allow_coupon_stack: !!activity.allow_coupon_stack,
      allow_points_stack: !!activity.allow_points_stack,
      allow_reward: !!activity.allow_reward,
    },
    items: items.map((it) => ({
      ...it,
      activity_price: Number(it.activity_price),
      activity_stock: Number(it.activity_stock),
      sold_count: Number(it.sold_count),
      limit_per_user: Number(it.limit_per_user),
      product_price: Number(it.product_price),
      product_stock: Number(it.product_stock),
      remaining_stock: Math.max(0, Number(it.activity_stock) - Number(it.sold_count)),
    })),
    scopes,
  };
}

async function selectActivitiesByPosition(position, types = []) {
  const pos = String(position || '').trim();
  if (!pos) return [];
  const typeFilter = types.length
    ? `AND a.type IN (${types.map(() => '?').join(',')})`
    : '';
  const params = types.length ? [pos, ...types] : [pos];
  const [rows] = await db.query(
    `SELECT a.id, a.type, a.title, a.subtitle, a.cover_image, a.display_positions,
            a.start_at, a.end_at, a.activity_config, a.threshold_amount, a.discount_amount
     FROM marketing_activities a
     WHERE a.deleted_at IS NULL
       AND a.disabled = 0
       AND a.status != 'draft'
       AND NOW() BETWEEN a.start_at AND a.end_at
       AND ${positionJsonContains(pos)}
       ${typeFilter}
     ORDER BY a.sort_order ASC, a.start_at DESC`,
    params,
  );
  return rows.map((r) => ({
    ...r,
    display_positions: parseJson(r.display_positions, []),
    activity_config: parseJson(r.activity_config, null),
  }));
}

async function selectCouponsByIds(couponIds) {
  const ids = [...new Set((couponIds || []).map((x) => String(x || '').trim()).filter(Boolean))];
  if (!ids.length) return [];
  const [rows] = await db.query(
    `SELECT c.*,
            (
              SELECT GROUP_CONCAT(cc.category_id ORDER BY cc.category_id SEPARATOR ',')
              FROM coupon_categories cc WHERE BINARY cc.coupon_id = BINARY c.id
            ) AS category_ids
     FROM coupons c
     WHERE c.deleted_at IS NULL
       AND c.status = 'available'
       AND c.end_date >= CURDATE()
       AND c.start_date <= CURDATE()
       AND c.id IN (${ids.map(() => '?').join(',')})
     ORDER BY FIELD(c.id, ${ids.map(() => '?').join(',')})`,
    [...ids, ...ids],
  );
  return rows;
}

function mapPublicCoupon(row) {
  return {
    id: row.id,
    code: row.code,
    title: row.title,
    type: row.type,
    value: parseFloat(row.value),
    min_amount: parseFloat(row.min_amount),
    start_date: row.start_date,
    end_date: row.end_date,
    description: row.description || '',
    scope_type: row.scope_type || 'all',
    display_badge: row.display_badge || '',
    category_ids: typeof row.category_ids === 'string' && row.category_ids
      ? row.category_ids.split(',').filter(Boolean)
      : [],
  };
}

module.exports = {
  selectFlashSaleActivityByPosition,
  selectActivitiesByPosition,
  selectCouponsByIds,
  mapPublicCoupon,
};

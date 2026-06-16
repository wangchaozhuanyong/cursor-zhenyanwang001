const db = require('../../../config/db');
const { activeProductWhere } = require('../../product/productLifecycle');

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

function couponPositionJsonContains(position) {
  return `JSON_CONTAINS(COALESCE(c.display_positions, '[]'), JSON_QUOTE(?), '$')`;
}

async function selectFlashSaleActivityByPosition(position) {
  const pos = String(position || 'home_flash_sale').trim();
  const [activities] = await db.query(
    `SELECT a.*
     FROM marketing_activities a
     WHERE a.deleted_at IS NULL
       AND a.disabled = 0
       AND a.type IN ('flash_sale', 'limited_time_discount')
       AND a.status NOT IN ('draft', 'disabled', 'paused', 'ended', 'archived')
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
       AND ${activeProductWhere('p')}
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
    `SELECT a.id, a.slug, a.type, a.title, a.subtitle, a.cover_image, a.display_positions,
            a.start_at, a.end_at, a.activity_config, a.threshold_amount, a.discount_amount
     FROM marketing_activities a
     WHERE a.deleted_at IS NULL
       AND a.disabled = 0
       AND a.status NOT IN ('draft', 'disabled', 'paused', 'ended', 'archived')
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

/**
 * @param {{ page?: number|string, pageSize?: number|string, type?: string|string[] }} [input]
 */
async function selectActivePromotions({ page = 1, pageSize = 40, type = '' } = {}) {
  const normalizedPage = Math.max(1, Number(page) || 1);
  const normalizedPageSize = Math.max(1, Math.min(80, Number(pageSize) || 40));
  const offset = (normalizedPage - 1) * normalizedPageSize;
  const params = [];
  let typeSql = '';
  const types = Array.isArray(type)
    ? [...new Set(type.map((item) => String(item || '').trim()).filter(Boolean))]
    : String(type || '').trim()
      ? [String(type).trim()]
      : [];
  if (types.length) {
    typeSql = `AND a.type IN (${types.map(() => '?').join(',')})`;
    params.push(...types);
  }
  const runtimeWhere = `
    a.deleted_at IS NULL
    AND a.disabled = 0
    AND a.status NOT IN ('draft', 'disabled', 'paused', 'ended', 'archived')
    AND NOW() BETWEEN a.start_at AND a.end_at
    ${typeSql}
  `;
  const [[countRow]] = await db.query(
    `SELECT COUNT(*) AS total
       FROM marketing_activities a
      WHERE ${runtimeWhere}`,
    params,
  );
  const [rows] = await db.query(
    `SELECT a.id, a.slug, a.type, a.title, a.subtitle, a.description, a.cover_image,
            a.display_positions, a.start_at, a.end_at, a.sort_order, a.priority,
            a.scope_type, a.activity_config, a.rule_config, a.allow_coupon_stack,
            a.allow_points_stack, a.allow_reward, a.stackable, a.exclusive_with,
            a.usage_limit_total, a.usage_limit_per_user, a.version
       FROM marketing_activities a
      WHERE ${runtimeWhere}
      ORDER BY COALESCE(a.priority, 0) DESC, a.sort_order ASC, a.start_at DESC
      LIMIT ? OFFSET ?`,
    [...params, normalizedPageSize, offset],
  );
  return {
    list: rows.map((r) => ({
      ...r,
      display_positions: parseJson(r.display_positions, []),
      activity_config: parseJson(r.activity_config, null),
      rule_config: parseJson(r.rule_config, parseJson(r.activity_config, null)),
      exclusive_with: parseJson(r.exclusive_with, []),
    })),
    total: Number(countRow?.total || 0),
    page: normalizedPage,
    pageSize: normalizedPageSize,
  };
}

async function selectActiveCheckinRewardActivities() {
  const [rows] = await db.query(
    `SELECT a.id, a.id AS activity_id, a.slug, a.type, a.title, a.subtitle, a.description,
            a.activity_config, a.rule_config, a.priority, a.sort_order,
            a.usage_limit_total, a.usage_limit_per_user, a.version,
            a.start_at, a.end_at
       FROM marketing_activities a
      WHERE a.deleted_at IS NULL
        AND a.disabled = 0
        AND a.type = 'checkin_reward'
        AND a.status NOT IN ('draft', 'disabled', 'paused', 'ended', 'archived')
        AND NOW() BETWEEN a.start_at AND a.end_at
      ORDER BY COALESCE(a.priority, 0) DESC, a.sort_order ASC, a.start_at DESC`,
  );
  return rows.map((r) => ({
    ...r,
    activity_config: parseJson(r.activity_config, null),
    rule_config: parseJson(r.rule_config, parseJson(r.activity_config, null)),
  }));
}

async function selectActivePromotionBySlug(slug) {
  const key = String(slug || '').trim();
  if (!key) return null;
  const [rows] = await db.query(
    `SELECT a.id, a.slug, a.type, a.title, a.subtitle, a.description, a.cover_image,
            a.display_positions, a.start_at, a.end_at, a.sort_order, a.priority,
            a.scope_type, a.activity_config, a.rule_config, a.allow_coupon_stack,
            a.allow_points_stack, a.allow_reward, a.stackable, a.exclusive_with,
            a.usage_limit_total, a.usage_limit_per_user, a.version
       FROM marketing_activities a
      WHERE a.deleted_at IS NULL
        AND a.disabled = 0
        AND a.status NOT IN ('draft', 'disabled', 'paused', 'ended', 'archived')
        AND NOW() BETWEEN a.start_at AND a.end_at
        AND (a.slug = ? OR a.id = ?)
      LIMIT 1`,
    [key, key],
  );
  const row = rows[0];
  if (!row) return null;
  const [items] = await db.query(
    `SELECT ap.product_id, ap.activity_price, ap.activity_stock, ap.sold_count,
            ap.limit_per_user, p.name AS product_name, p.cover_image,
            p.price AS product_price, p.stock AS product_stock
       FROM marketing_activity_products ap
       JOIN products p ON p.id = ap.product_id
      WHERE ap.activity_id = ?
        AND ${activeProductWhere('p')}
      ORDER BY ap.sort_order ASC, ap.created_at ASC
      LIMIT 80`,
    [row.id],
  );
  const [scopes] = await db.query(
    'SELECT scope_type, scope_id FROM marketing_activity_scopes WHERE activity_id = ? ORDER BY created_at ASC',
    [row.id],
  );
  return {
    ...row,
    display_positions: parseJson(row.display_positions, []),
    activity_config: parseJson(row.activity_config, null),
    rule_config: parseJson(row.rule_config, parseJson(row.activity_config, null)),
    exclusive_with: parseJson(row.exclusive_with, []),
    items: items.map((item) => ({
      ...item,
      activity_price: Number(item.activity_price || 0),
      activity_stock: Number(item.activity_stock || 0),
      sold_count: Number(item.sold_count || 0),
      remaining_stock: Math.max(0, Number(item.activity_stock || 0) - Number(item.sold_count || 0)),
      limit_per_user: Number(item.limit_per_user || 0),
      product_price: Number(item.product_price || 0),
      product_stock: Number(item.product_stock || 0),
    })),
    scopes,
  };
}

async function selectCouponsByIds(couponIds) {
  const ids = [...new Set((couponIds || []).map((x) => String(x || '').trim()).filter(Boolean))];
  if (!ids.length) return [];
  const idPlaceholders = ids.map(() => '?').join(',');
  const modernSql = `
     SELECT c.*,
            (
              SELECT GROUP_CONCAT(cc.category_id ORDER BY cc.category_id SEPARATOR ',')
              FROM coupon_categories cc WHERE BINARY cc.coupon_id = BINARY c.id
            ) AS category_ids,
            (
              SELECT GROUP_CONCAT(cat.name ORDER BY cat.sort_order SEPARATOR ',')
              FROM coupon_categories cc
              JOIN categories cat ON BINARY cat.id = BINARY cc.category_id
              WHERE BINARY cc.coupon_id = BINARY c.id
            ) AS category_names
     FROM coupons c
     WHERE c.deleted_at IS NULL
       AND COALESCE(c.publish_status, CASE WHEN c.status = 'available' THEN 'active' ELSE c.status END) = 'active'
       AND c.status IN ('available', 'active')
       AND (c.claim_start_at IS NULL OR c.claim_start_at <= NOW())
       AND (c.claim_end_at IS NULL OR c.claim_end_at >= NOW())
       AND c.stop_claim_at IS NULL
       AND c.stop_use_at IS NULL
       AND c.archived_at IS NULL
       AND c.invalidated_at IS NULL
       AND COALESCE(c.auto_issue, 0) = 0
       AND (
         c.total_quantity <= 0
         OR COALESCE(c.claimed_count, 0) < c.total_quantity
       )
       AND c.id IN (${idPlaceholders})
     ORDER BY FIELD(c.id, ${idPlaceholders})`;
  try {
    const [rows] = await db.query(modernSql, [...ids, ...ids]);
    return rows;
  } catch (err) {
    const { isSchemaDriftError } = require('../../../db/schemaErrors');
    if (!isSchemaDriftError(err)) throw err;
    const [rows] = await db.query(
      `SELECT c.*,
              (
                SELECT GROUP_CONCAT(cc.category_id ORDER BY cc.category_id SEPARATOR ',')
                FROM coupon_categories cc WHERE BINARY cc.coupon_id = BINARY c.id
              ) AS category_ids,
              (
                SELECT GROUP_CONCAT(cat.name ORDER BY cat.sort_order SEPARATOR ',')
                FROM coupon_categories cc
                JOIN categories cat ON BINARY cat.id = BINARY cc.category_id
                WHERE BINARY cc.coupon_id = BINARY c.id
              ) AS category_names
       FROM coupons c
       WHERE c.status = 'available'
         AND c.end_date >= CURDATE()
         AND c.start_date <= CURDATE()
         AND c.id IN (${idPlaceholders})
       ORDER BY FIELD(c.id, ${idPlaceholders})`,
      [...ids, ...ids],
    );
    return rows;
  }
}

async function selectCouponsByPosition(position, limit = 12) {
  const pos = String(position || 'home_coupon_zone').trim();
  if (!pos) return [];
  const pageSize = Math.max(1, Math.min(50, Number(limit) || 12));
  const [rows] = await db.query(
    `SELECT c.*,
            (
              SELECT GROUP_CONCAT(cc.category_id ORDER BY cc.category_id SEPARATOR ',')
              FROM coupon_categories cc WHERE BINARY cc.coupon_id = BINARY c.id
            ) AS category_ids,
            (
              SELECT GROUP_CONCAT(cat.name ORDER BY cat.sort_order SEPARATOR ',')
              FROM coupon_categories cc
              JOIN categories cat ON BINARY cat.id = BINARY cc.category_id
              WHERE BINARY cc.coupon_id = BINARY c.id
            ) AS category_names
     FROM coupons c
     WHERE c.deleted_at IS NULL
       AND COALESCE(c.publish_status, CASE WHEN c.status = 'available' THEN 'active' ELSE c.status END) = 'active'
       AND c.status IN ('available', 'active')
       AND (c.claim_start_at IS NULL OR c.claim_start_at <= NOW())
       AND (c.claim_end_at IS NULL OR c.claim_end_at >= NOW())
       AND c.stop_claim_at IS NULL
       AND c.stop_use_at IS NULL
       AND c.archived_at IS NULL
       AND c.invalidated_at IS NULL
       AND COALESCE(c.auto_issue, 0) = 0
       AND (
         c.total_quantity <= 0
         OR COALESCE(c.claimed_count, 0) < c.total_quantity
       )
       AND ${couponPositionJsonContains(pos)}
     ORDER BY c.created_at DESC
     LIMIT ?`,
    [pos, pageSize],
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
    category_names: typeof row.category_names === 'string' && row.category_names
      ? row.category_names.split(',').filter(Boolean)
      : [],
    member_only: !!row.member_only,
    new_user_only: !!row.new_user_only,
    auto_issue: !!row.auto_issue,
    per_user_limit: row.per_user_limit == null ? undefined : Number(row.per_user_limit),
    total_quantity: row.total_quantity == null ? undefined : Number(row.total_quantity),
    claimed_count: row.claimed_count == null ? undefined : Number(row.claimed_count),
    source_campaign_id: row.source_campaign_id || '',
  };
}

module.exports = {
  selectFlashSaleActivityByPosition,
  selectActivitiesByPosition,
  selectActivePromotions,
  selectActiveCheckinRewardActivities,
  selectActivePromotionBySlug,
  selectCouponsByIds,
  selectCouponsByPosition,
  mapPublicCoupon,
};

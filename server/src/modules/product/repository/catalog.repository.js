const db = require('../../../config/db');
const { ACTIVE_PRODUCT_WHERE, activeProductWhere } = require('../productLifecycle');

const PUBLIC_QUERY_TIMEOUT_MS = 3000;

function isTimeoutError(err) {
  return err?.code === 'PROTOCOL_SEQUENCE_TIMEOUT' || /timeout/i.test(String(err?.message || ''));
}

async function publicRows(label, sql, params = []) {
  try {
    const [rows] = await db.query({ sql, timeout: PUBLIC_QUERY_TIMEOUT_MS }, params);
    return rows;
  } catch (err) {
    if (!isTimeoutError(err)) throw err;
    console.warn(`[catalog] ${label} query timeout; returning fallback []`);
    return [];
  }
}

async function selectActiveBanners() {
  return publicRows(
    'banners',
    'SELECT * FROM banners WHERE enabled = 1 AND deleted_at IS NULL ORDER BY sort_order ASC',
  );
}

async function selectActiveCategories() {
  return publicRows(
    'categories',
    `SELECT id, parent_id, name, icon, icon_url, sort_order, is_visible, is_active
     FROM categories
     WHERE is_active = 1 AND is_visible = 1 AND deleted_at IS NULL
     ORDER BY parent_id IS NOT NULL, parent_id ASC, sort_order ASC, id ASC`,
  );
}

async function selectCategoryById(id) {
  const [[row]] = await db.query(
    `SELECT id, parent_id, name, icon, icon_url, sort_order, is_visible, is_active
     FROM categories
     WHERE id = ? AND deleted_at IS NULL`,
    [id],
  );
  return row || null;
}

async function selectVisibleCategoryIds() {
  const [rows] = await db.query(
    'SELECT id, parent_id FROM categories WHERE is_active = 1 AND is_visible = 1 AND deleted_at IS NULL',
  );
  return rows;
}

async function countActiveProducts(where, params) {
  const [[{ total }]] = await db.query(`SELECT COUNT(*) as total FROM products ${where}`, params);
  return total;
}

async function selectActiveProductsPage(where, params, orderBy, pageSize, offset) {
  const [rows] = await db.query(
    `SELECT * FROM products ${where} ${orderBy} LIMIT ? OFFSET ?`,
    [...params, pageSize, offset],
  );
  return rows;
}

async function selectDefaultVariantsByProductIds(productIds) {
  const ids = [...new Set((productIds || []).filter(Boolean))];
  if (!ids.length) return [];
  const [rows] = await db.query(
    `SELECT id, product_id, sku_code, title, price, original_price, stock, sort_order, is_default,
            cost_price, barcode, image_url, weight, enabled
     FROM product_variants
     WHERE product_id IN (${ids.map(() => '?').join(',')})
       AND deleted_at IS NULL
       AND enabled = 1
     ORDER BY is_default DESC, sort_order ASC, id ASC`,
    ids,
  );
  const seen = new Set();
  return rows.filter((row) => {
    if (seen.has(row.product_id)) return false;
    seen.add(row.product_id);
    return true;
  });
}

async function selectVariantPriceRangesByProductIds(productIds) {
  const ids = [...new Set((productIds || []).filter(Boolean))];
  if (!ids.length) return [];
  const [rows] = await db.query(
    `SELECT
       product_id,
       MIN(price) AS min_price,
       MAX(price) AS max_price,
       MIN(NULLIF(original_price, 0)) AS min_original_price,
       MAX(NULLIF(original_price, 0)) AS max_original_price,
       COUNT(*) AS variant_count
     FROM product_variants
     WHERE product_id IN (${ids.map(() => '?').join(',')})
       AND deleted_at IS NULL
       AND enabled = 1
     GROUP BY product_id`,
    ids,
  );
  return rows;
}

async function selectProductById(id) {
  const [[row]] = await db.query(
    `SELECT * FROM products WHERE id = ? AND ${ACTIVE_PRODUCT_WHERE}`,
    [id],
  );
  return row || null;
}

async function selectProductVariants(productId) {
  const [rows] = await db.query(
    `SELECT id, product_id, sku_code, title, price, original_price, stock, sort_order, is_default,
            cost_price, barcode, image_url, weight, enabled
     FROM product_variants
     WHERE product_id = ?
       AND deleted_at IS NULL
       AND enabled = 1
     ORDER BY is_default DESC, sort_order ASC, id ASC`,
    [productId],
  );
  return rows;
}

async function selectProductSpecGroups(productId) {
  const [groups] = await db.query(
    `SELECT id, product_id, name, sort_order
     FROM product_spec_groups
     WHERE product_id = ? AND deleted_at IS NULL
     ORDER BY sort_order ASC, created_at ASC`,
    [productId],
  );
  if (!groups.length) return [];
  const [values] = await db.query(
    `SELECT id, product_id, group_id, value, image_url, sort_order
     FROM product_spec_values
     WHERE product_id = ? AND deleted_at IS NULL
     ORDER BY sort_order ASC, created_at ASC`,
    [productId],
  );
  const byGroup = new Map();
  for (const row of values) {
    const list = byGroup.get(row.group_id) || [];
    list.push(row);
    byGroup.set(row.group_id, list);
  }
  return groups.map((group) => ({ ...group, values: byGroup.get(group.id) || [] }));
}

async function selectVariantSpecValues(productId) {
  const [rows] = await db.query(
    `SELECT rel.variant_id, rel.group_id, rel.value_id, g.name AS group_name, v.value
     FROM product_variant_spec_values rel
     JOIN product_spec_groups g ON g.id = rel.group_id
     JOIN product_spec_values v ON v.id = rel.value_id
     WHERE rel.product_id = ?
       AND g.deleted_at IS NULL
       AND v.deleted_at IS NULL
     ORDER BY g.sort_order ASC, v.sort_order ASC, g.created_at ASC, v.created_at ASC`,
    [productId],
  );
  const map = new Map();
  for (const row of rows) {
    const list = map.get(row.variant_id) || [];
    list.push({
      group_id: row.group_id,
      group_name: row.group_name,
      value_id: row.value_id,
      value: row.value,
    });
    map.set(row.variant_id, list);
  }
  return map;
}

async function selectHomeProductBlocks(limit) {
  const [hot] = await db.query(
    `SELECT * FROM products WHERE ${ACTIVE_PRODUCT_WHERE} AND is_hot=1 ORDER BY sort_order LIMIT ?`,
    [limit],
  );
  const [nw] = await db.query(
    `SELECT * FROM products WHERE ${ACTIVE_PRODUCT_WHERE} AND is_new=1 ORDER BY sort_order LIMIT ?`,
    [limit],
  );
  const [rec] = await db.query(
    `SELECT * FROM products WHERE ${ACTIVE_PRODUCT_WHERE} AND is_recommended=1 ORDER BY sort_order LIMIT ?`,
    [limit],
  );
  return { hot, new_arrivals: nw, recommended: rec };
}

async function selectActiveProductsByFlag(flagField, limit) {
  return publicRows(
    `products:${flagField}`,
    `SELECT * FROM products
     WHERE ${ACTIVE_PRODUCT_WHERE} AND ${flagField}=1
     ORDER BY sort_order ASC, created_at DESC
     LIMIT ?`,
    [limit],
  );
}

async function selectActiveProductsFallback(orderBySql, limit) {
  return publicRows(
    `products:fallback:${orderBySql}`,
    `SELECT * FROM products
     WHERE ${ACTIVE_PRODUCT_WHERE}
     ORDER BY ${orderBySql}
     LIMIT ?`,
    [limit],
  );
}

async function selectActiveProductsRecent(days, limit, onlyInStock = false) {
  const recentDays = Math.max(1, Number(days) || 14);
  const stockWhere = onlyInStock ? ' AND stock > 0' : '';
  return publicRows(
    `products:recent:${recentDays}:${onlyInStock ? 'instock' : 'all'}`,
    `SELECT * FROM products
     WHERE ${ACTIVE_PRODUCT_WHERE}
       AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
       ${stockWhere}
     ORDER BY created_at DESC, sort_order ASC, id DESC
     LIMIT ?`,
    [recentDays, limit],
  );
}

async function selectSiteSettingValues(keys) {
  const validKeys = Array.isArray(keys) ? keys.filter(Boolean) : [];
  if (validKeys.length === 0) return {};
  const [rows] = await db.query(
    `SELECT setting_key, setting_value FROM site_settings WHERE setting_key IN (${validKeys.map(() => '?').join(',')})`,
    validKeys,
  );
  const out = {};
  for (const row of rows) out[row.setting_key] = row.setting_value;
  return out;
}

async function selectPublicProductTags(limit = 12) {
  const lim = Math.min(50, Math.max(1, Number(limit) || 12));
  const [rows] = await db.query(
    `SELECT pt.id, pt.name, pt.color, pt.bg_color, pt.text_color, pt.sort_order,
      COUNT(p.id) AS count
     FROM product_tags pt
     LEFT JOIN product_tag_assignments pta ON pta.tag_id = pt.id
     LEFT JOIN products p ON p.id = pta.product_id
       AND ${activeProductWhere('p')}
     WHERE pt.enabled = 1
       AND pt.deleted_at IS NULL
     GROUP BY pt.id, pt.name, pt.color, pt.bg_color, pt.text_color, pt.sort_order
     ORDER BY pt.sort_order DESC, count DESC, pt.name ASC
     LIMIT ?`,
    [lim],
  );
  return rows;
}

async function selectProductCategoryId(productId) {
  const [[row]] = await db.query(
    'SELECT category_id FROM products WHERE id = ? AND deleted_at IS NULL',
    [productId],
  );
  return row || null;
}

async function selectRelatedByCategory(categoryId, excludeProductId, limit) {
  const [rows] = await db.query(
    `SELECT * FROM products WHERE ${ACTIVE_PRODUCT_WHERE} AND category_id=? AND id!=? ORDER BY sort_order LIMIT ?`,
    [categoryId, excludeProductId, limit],
  );
  return rows;
}

async function insertHomeEngagementEvent({ module, eventKey, productId, sessionId, meta }) {
  await db.query(
    `INSERT INTO home_engagement_events (module, event_key, product_id, session_id, meta_json)
     VALUES (?, ?, ?, ?, ?)`,
    [
      module,
      eventKey,
      productId || null,
      sessionId || null,
      meta ? JSON.stringify(meta) : null,
    ],
  );
}

module.exports = {
  selectActiveBanners,
  selectActiveCategories,
  selectCategoryById,
  selectVisibleCategoryIds,
  countActiveProducts,
  selectActiveProductsPage,
  selectDefaultVariantsByProductIds,
  selectVariantPriceRangesByProductIds,
  selectProductById,
  selectProductVariants,
  selectProductSpecGroups,
  selectVariantSpecValues,
  selectHomeProductBlocks,
  selectActiveProductsByFlag,
  selectActiveProductsFallback,
  selectActiveProductsRecent,
  selectSiteSettingValues,
  selectPublicProductTags,
  selectProductCategoryId,
  selectRelatedByCategory,
  insertHomeEngagementEvent,
};



const db = require('../../config/db');

const PUBLIC_QUERY_TIMEOUT_MS = 3000;
const ACTIVE_PRODUCT_WHERE = "(lifecycle_status = 1 OR (lifecycle_status IS NULL AND status = 'active')) AND deleted_at IS NULL";

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

async function selectProductById(id) {
  const [[row]] = await db.query(
    'SELECT * FROM products WHERE id = ? AND lifecycle_status = 1 AND deleted_at IS NULL',
    [id],
  );
  return row || null;
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

async function selectPublicProductTags(limit = 12) {
  const lim = Math.min(50, Math.max(1, Number(limit) || 12));
  const [rows] = await db.query(
    `SELECT pt.id, pt.name, pt.color, pt.bg_color, pt.text_color, pt.sort_order,
      COUNT(p.id) AS count
     FROM product_tags pt
     LEFT JOIN product_tag_assignments pta ON pta.tag_id = pt.id
     LEFT JOIN products p ON p.id = pta.product_id
       AND (p.lifecycle_status = 1 OR (p.lifecycle_status IS NULL AND p.status = 'active'))
       AND p.deleted_at IS NULL
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
    'SELECT * FROM products WHERE lifecycle_status=1 AND deleted_at IS NULL AND category_id=? AND id!=? ORDER BY sort_order LIMIT ?',
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
  selectProductById,
  selectHomeProductBlocks,
  selectActiveProductsByFlag,
  selectActiveProductsFallback,
  selectPublicProductTags,
  selectProductCategoryId,
  selectRelatedByCategory,
  insertHomeEngagementEvent,
};

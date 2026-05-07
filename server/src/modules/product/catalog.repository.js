const db = require('../../config/db');

async function selectActiveBanners() {
  const [rows] = await db.query(
    'SELECT * FROM banners WHERE enabled = 1 AND deleted_at IS NULL ORDER BY sort_order ASC',
  );
  return rows;
}

async function selectActiveCategories() {
  const [rows] = await db.query(
    'SELECT id, name, icon, sort_order FROM categories WHERE is_active = 1 ORDER BY sort_order',
  );
  return rows;
}

async function selectCategoryById(id) {
  const [[row]] = await db.query(
    'SELECT id, name, icon, sort_order FROM categories WHERE id = ?',
    [id],
  );
  return row || null;
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
  const [[row]] = await db.query('SELECT * FROM products WHERE id = ?', [id]);
  return row || null;
}

async function selectHomeProductBlocks(limit) {
  const [hot] = await db.query(
    'SELECT * FROM products WHERE status="active" AND is_hot=1  ORDER BY sort_order LIMIT ?',
    [limit],
  );
  const [nw] = await db.query(
    'SELECT * FROM products WHERE status="active" AND is_new=1  ORDER BY sort_order LIMIT ?',
    [limit],
  );
  const [rec] = await db.query(
    'SELECT * FROM products WHERE status="active" AND is_recommended=1 ORDER BY sort_order LIMIT ?',
    [limit],
  );
  return { hot, new_arrivals: nw, recommended: rec };
}

async function selectActiveProductsByFlag(flagField, limit) {
  const [rows] = await db.query(
    `SELECT * FROM products
     WHERE status="active" AND ${flagField}=1
     ORDER BY sort_order ASC, created_at DESC
     LIMIT ?`,
    [limit],
  );
  return rows;
}

async function selectActiveProductsFallback(orderBySql, limit) {
  const [rows] = await db.query(
    `SELECT * FROM products
     WHERE status="active"
     ORDER BY ${orderBySql}
     LIMIT ?`,
    [limit],
  );
  return rows;
}

async function selectProductCategoryId(productId) {
  const [[row]] = await db.query('SELECT category_id FROM products WHERE id = ?', [productId]);
  return row || null;
}

async function selectRelatedByCategory(categoryId, excludeProductId, limit) {
  const [rows] = await db.query(
    'SELECT * FROM products WHERE status="active" AND category_id=? AND id!=? ORDER BY sort_order LIMIT ?',
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
  countActiveProducts,
  selectActiveProductsPage,
  selectProductById,
  selectHomeProductBlocks,
  selectActiveProductsByFlag,
  selectActiveProductsFallback,
  selectProductCategoryId,
  selectRelatedByCategory,
  insertHomeEngagementEvent,
};

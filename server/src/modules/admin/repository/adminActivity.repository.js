const db = require('../../../config/db');
const { generateId } = require('../../../utils/helpers');

function listWhere(query = {}) {
  let where = 'WHERE a.deleted_at IS NULL';
  const params = [];
  if (query.type) {
    where += ' AND a.type = ?';
    params.push(query.type);
  }
  if (query.keyword) {
    where += ' AND a.title LIKE ?';
    params.push(`%${query.keyword}%`);
  }
  if (query.status === 'disabled') {
    where += " AND (a.status = 'disabled' OR a.disabled = 1)";
  } else if (query.status === 'scheduled' || query.status === 'not_started') {
    where += " AND a.disabled = 0 AND a.status NOT IN ('disabled', 'draft') AND a.start_at > NOW()";
  } else if (query.status === 'active') {
    where += " AND a.disabled = 0 AND a.status NOT IN ('disabled', 'draft') AND a.start_at <= NOW() AND a.end_at >= NOW()";
  } else if (query.status === 'ended') {
    where += " AND a.end_at < NOW()";
  } else if (query.status === 'draft') {
    where += " AND a.status = 'draft'";
  }
  return { where, params };
}

async function countActivities(where, params) {
  const [[row]] = await db.query(`SELECT COUNT(*) AS total FROM marketing_activities a ${where}`, params);
  return Number(row?.total) || 0;
}

async function selectActivitiesPage(where, params, pageSize, offset) {
  const [rows] = await db.query(
    `SELECT
       a.*,
       COUNT(ap.id) AS product_count,
       COALESCE(SUM(ap.activity_stock), 0) AS activity_stock_total,
       COALESCE(SUM(ap.sold_count), 0) AS sold_count_total
     FROM marketing_activities a
     LEFT JOIN marketing_activity_products ap ON ap.activity_id = a.id
     ${where}
     GROUP BY a.id
     ORDER BY a.sort_order ASC, a.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, pageSize, offset],
  );
  return rows;
}

async function selectActivityById(id) {
  const [[row]] = await db.query('SELECT * FROM marketing_activities WHERE id = ? AND deleted_at IS NULL', [id]);
  return row || null;
}

async function selectActivityItems(activityId) {
  const [rows] = await db.query(
    `SELECT ap.*, p.name AS product_name, p.cover_image, p.price AS product_price, p.stock AS product_stock
     FROM marketing_activity_products ap
     JOIN products p ON p.id = ap.product_id
     WHERE ap.activity_id = ?
     ORDER BY ap.sort_order ASC, ap.created_at ASC`,
    [activityId],
  );
  return rows;
}

async function selectActivityScopes(activityId) {
  const [rows] = await db.query(
    `SELECT id, activity_id, scope_type, scope_id
     FROM marketing_activity_scopes
     WHERE activity_id = ?
     ORDER BY created_at ASC`,
    [activityId],
  );
  return rows;
}

async function insertActivity(params) {
  await db.query(
    `INSERT INTO marketing_activities
      (id, type, title, subtitle, cover_image, display_positions, description, start_at, end_at, status, disabled,
       scope_type, allow_coupon_stack, allow_points_stack, allow_reward, publish_at, internal_note, activity_config,
       threshold_amount, discount_amount, sort_order, created_by, updated_by)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      params.id,
      params.type,
      params.title,
      params.subtitle || '',
      params.cover_image || '',
      params.display_positions ? JSON.stringify(params.display_positions) : null,
      params.description || '',
      params.start_at,
      params.end_at,
      params.status,
      params.disabled ? 1 : 0,
      params.scope_type || 'product',
      params.allow_coupon_stack ? 1 : 0,
      params.allow_points_stack ? 1 : 0,
      params.allow_reward ? 1 : 0,
      params.publish_at || null,
      params.internal_note || '',
      params.activity_config ? JSON.stringify(params.activity_config) : null,
      params.threshold_amount,
      params.discount_amount,
      params.sort_order || 0,
      params.adminUserId || null,
      params.adminUserId || null,
    ],
  );
}

async function updateActivityDynamic(id, fragments, values, adminUserId) {
  await db.query(
    `UPDATE marketing_activities SET ${fragments.join(', ')}, updated_by = ? WHERE id = ? AND deleted_at IS NULL`,
    [...values, adminUserId || null, id],
  );
}

async function replaceActivityItems(activityId, items) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query('DELETE FROM marketing_activity_products WHERE activity_id = ?', [activityId]);
    for (const item of items) {
      await conn.query(
        `INSERT INTO marketing_activity_products
          (id, activity_id, product_id, activity_price, limit_per_user, activity_stock, sold_count, sort_order)
         VALUES (?,?,?,?,?,?,?,?)`,
        [
          item.id,
          activityId,
          item.product_id,
          item.activity_price,
          item.limit_per_user,
          item.activity_stock,
          item.sold_count || 0,
          item.sort_order || 0,
        ],
      );
    }
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

async function replaceActivityScopes(activityId, scopes) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query('DELETE FROM marketing_activity_scopes WHERE activity_id = ?', [activityId]);
    for (const sc of scopes || []) {
      await conn.query(
        `INSERT INTO marketing_activity_scopes (id, activity_id, scope_type, scope_id) VALUES (?,?,?,?)`,
        [sc.id || generateId(), activityId, sc.scope_type, sc.scope_id],
      );
    }
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

async function setActivityDisabled(id, disabled, adminUserId) {
  await db.query(
    "UPDATE marketing_activities SET disabled = ?, status = ?, updated_by = ? WHERE id = ? AND deleted_at IS NULL",
    [disabled ? 1 : 0, disabled ? 'disabled' : 'scheduled', adminUserId || null, id],
  );
}

async function softDeleteActivity(id, adminUserId) {
  await db.query(
    "UPDATE marketing_activities SET deleted_at = NOW(), deleted_by = ?, disabled = 1, status = 'disabled' WHERE id = ?",
    [adminUserId || null, id],
  );
}

async function selectProductStocksByIds(productIds = []) {
  const ids = [...new Set((productIds || []).filter(Boolean))];
  if (!ids.length) return [];
  const [rows] = await db.query(
    `SELECT id, name, stock, price, lifecycle_status, category_id, cover_image
     FROM products
     WHERE deleted_at IS NULL AND id IN (${ids.map(() => '?').join(',')})`,
    ids,
  );
  return rows;
}

async function selectConflictingActivities({ productIds = [], startAt, endAt, excludeActivityId = null }) {
  const ids = [...new Set((productIds || []).filter(Boolean))];
  if (!ids.length) return [];
  const params = [startAt, endAt, ...ids];
  let excludeSql = '';
  if (excludeActivityId) {
    excludeSql = 'AND a.id <> ?';
    params.push(excludeActivityId);
  }
  const [rows] = await db.query(
    `SELECT a.id AS activity_id, a.title, a.start_at, a.end_at, ap.product_id
     FROM marketing_activities a
     JOIN marketing_activity_products ap ON ap.activity_id = a.id
     WHERE a.deleted_at IS NULL
       AND a.disabled = 0
       AND a.status IN ('scheduled', 'active')
       AND NOT (a.end_at <= ? OR a.start_at >= ?)
       AND ap.product_id IN (${ids.map(() => '?').join(',')})
       ${excludeSql}`,
    params,
  );
  return rows;
}

async function searchActivityProducts(query = {}) {
  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));
  const offset = (page - 1) * pageSize;
  let where = 'WHERE p.deleted_at IS NULL';
  const params = [];
  if (query.keyword) {
    where += ' AND (p.name LIKE ? OR p.id LIKE ?)';
    params.push(`%${query.keyword}%`, `%${query.keyword}%`);
  }
  if (query.category_id) {
    where += ' AND p.category_id = ?';
    params.push(query.category_id);
  }
  if (query.lifecycle_status !== undefined && query.lifecycle_status !== '') {
    where += ' AND p.lifecycle_status = ?';
    params.push(Number(query.lifecycle_status));
  }
  const [[countRow]] = await db.query(`SELECT COUNT(*) AS total FROM products p ${where}`, params);
  const total = Number(countRow?.total || 0);
  const [rows] = await db.query(
    `SELECT p.id, p.name, p.cover_image, p.price, p.stock, p.category_id, p.lifecycle_status,
            COALESCE(pc.cnt, 0) AS sku_count, c.name AS category_name
     FROM products p
     LEFT JOIN categories c ON c.id = p.category_id
     LEFT JOIN (
       SELECT product_id, COUNT(*) AS cnt FROM product_variants
       WHERE deleted_at IS NULL
       GROUP BY product_id
     ) pc ON pc.product_id = p.id
     ${where}
     ORDER BY p.updated_at DESC
     LIMIT ? OFFSET ?`,
    [...params, pageSize, offset],
  );
  return { list: rows, total, page, pageSize };
}

module.exports = {
  listWhere,
  countActivities,
  selectActivitiesPage,
  selectActivityById,
  selectActivityItems,
  selectActivityScopes,
  insertActivity,
  updateActivityDynamic,
  replaceActivityItems,
  replaceActivityScopes,
  setActivityDisabled,
  softDeleteActivity,
  selectProductStocksByIds,
  selectConflictingActivities,
  searchActivityProducts,
};




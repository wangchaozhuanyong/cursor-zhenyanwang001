const db = require('../../config/db');

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
    where += ' AND a.disabled = 1';
  } else if (query.status === 'not_started') {
    where += ' AND a.disabled = 0 AND NOW() < a.start_at';
  } else if (query.status === 'active') {
    where += ' AND a.disabled = 0 AND NOW() BETWEEN a.start_at AND a.end_at';
  } else if (query.status === 'ended') {
    where += ' AND a.disabled = 0 AND NOW() > a.end_at';
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

async function insertActivity(params) {
  await db.query(
    `INSERT INTO marketing_activities
      (id, type, title, description, start_at, end_at, disabled,
       threshold_amount, discount_amount, sort_order, created_by, updated_by)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      params.id,
      params.type,
      params.title,
      params.description,
      params.start_at,
      params.end_at,
      params.disabled ? 1 : 0,
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

async function setActivityDisabled(id, disabled, adminUserId) {
  await db.query(
    'UPDATE marketing_activities SET disabled = ?, updated_by = ? WHERE id = ? AND deleted_at IS NULL',
    [disabled ? 1 : 0, adminUserId || null, id],
  );
}

async function softDeleteActivity(id, adminUserId) {
  await db.query(
    'UPDATE marketing_activities SET deleted_at = NOW(), deleted_by = ?, disabled = 1 WHERE id = ?',
    [adminUserId || null, id],
  );
}

module.exports = {
  listWhere,
  countActivities,
  selectActivitiesPage,
  selectActivityById,
  selectActivityItems,
  insertActivity,
  updateActivityDynamic,
  replaceActivityItems,
  setActivityDisabled,
  softDeleteActivity,
};

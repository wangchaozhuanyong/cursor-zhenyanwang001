const db = require('../../../config/db');

const navFields =
  'id, icon_url, title, link_url, target_type, target_category_id, target_support_channel_id, sort_order, enabled, created_at, updated_at';

async function selectNavItems({ publicOnly = false } = {}) {
  const where = publicOnly ? 'WHERE enabled = 1' : '';
  const [rows] = await db.query(
    `SELECT ${navFields} FROM home_nav_items ${where} ORDER BY sort_order ASC, created_at ASC`,
  );
  return rows;
}

async function insertNavItem(item) {
  await db.query(
    `INSERT INTO home_nav_items (id, icon_url, title, link_url, target_type, target_category_id, target_support_channel_id, sort_order, enabled)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      item.id,
      item.iconUrl,
      item.title,
      item.linkUrl,
      item.targetType || 'url',
      item.targetCategoryId || null,
      item.targetSupportChannelId || null,
      item.sortOrder,
      item.enabled ? 1 : 0,
    ],
  );
}

async function updateNavItem(id, fields, values) {
  if (!fields.length) return;
  await db.query(`UPDATE home_nav_items SET ${fields.join(', ')} WHERE id = ?`, [...values, id]);
}

async function selectNavTargetById(id) {
  const [[row]] = await db.query(
    'SELECT target_type, target_category_id, target_support_channel_id, link_url FROM home_nav_items WHERE id = ? LIMIT 1',
    [id],
  );
  return row || null;
}

async function selectPublicCategoryIds(ids) {
  const normalizedIds = [...new Set(
    (Array.isArray(ids) ? ids : [])
      .map((id) => String(id || '').trim())
      .filter(Boolean),
  )];
  if (!normalizedIds.length) return [];

  const placeholders = normalizedIds.map(() => '?').join(', ');
  const [rows] = await db.query(
    `SELECT id
     FROM categories
     WHERE id IN (${placeholders})
       AND deleted_at IS NULL
       AND is_active = 1
       AND is_visible = 1`,
    normalizedIds,
  );
  return rows.map((row) => row.id);
}

async function deleteNavItem(id) {
  await db.query('DELETE FROM home_nav_items WHERE id = ?', [id]);
}

async function batchUpdateNavSort(items) {
  if (!items.length) return;
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    for (const item of items) {
      await conn.query('UPDATE home_nav_items SET sort_order = ? WHERE id = ?', [item.sort_order, item.id]);
    }
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

module.exports = {
  selectNavItems,
  selectNavTargetById,
  selectPublicCategoryIds,
  insertNavItem,
  updateNavItem,
  deleteNavItem,
  batchUpdateNavSort,
};

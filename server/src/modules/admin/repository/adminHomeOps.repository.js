const db = require('../../../config/db');

const navFields = 'id, icon_url, title, link_url, target_type, target_category_id, sort_order, enabled, created_at, updated_at';

async function selectNavItems({ publicOnly = false } = {}) {
  const where = publicOnly ? 'WHERE enabled = 1' : '';
  const [rows] = await db.query(
    `SELECT ${navFields} FROM home_nav_items ${where} ORDER BY sort_order ASC, created_at ASC`,
  );
  return rows;
}

async function insertNavItem(item) {
  await db.query(
    `INSERT INTO home_nav_items (id, icon_url, title, link_url, target_type, target_category_id, sort_order, enabled)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      item.id,
      item.iconUrl,
      item.title,
      item.linkUrl,
      item.targetType || 'url',
      item.targetCategoryId || null,
      item.sortOrder,
      item.enabled ? 1 : 0,
    ],
  );
}

async function updateNavItem(id, fields, values) {
  if (!fields.length) return;
  await db.query(`UPDATE home_nav_items SET ${fields.join(', ')} WHERE id = ?`, [...values, id]);
}

async function deleteNavItem(id) {
  await db.query('DELETE FROM home_nav_items WHERE id = ?', [id]);
}

module.exports = {
  selectNavItems,
  insertNavItem,
  updateNavItem,
  deleteNavItem,
};




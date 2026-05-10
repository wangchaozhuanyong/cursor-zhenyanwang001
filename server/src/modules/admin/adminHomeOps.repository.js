const db = require('../../config/db');

const navFields = 'id, icon_url, title, link_url, sort_order, enabled, created_at, updated_at';
const announcementFields = 'id, title, content, link_url, sort_order, enabled, start_at, end_at, created_at, updated_at';

async function selectNavItems({ publicOnly = false } = {}) {
  const where = publicOnly ? 'WHERE enabled = 1' : '';
  const [rows] = await db.query(
    `SELECT ${navFields} FROM home_nav_items ${where} ORDER BY sort_order ASC, created_at ASC`,
  );
  return rows;
}

async function insertNavItem(item) {
  await db.query(
    `INSERT INTO home_nav_items (id, icon_url, title, link_url, sort_order, enabled)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [item.id, item.iconUrl, item.title, item.linkUrl, item.sortOrder, item.enabled ? 1 : 0],
  );
}

async function updateNavItem(id, fields, values) {
  if (!fields.length) return;
  await db.query(`UPDATE home_nav_items SET ${fields.join(', ')} WHERE id = ?`, [...values, id]);
}

async function deleteNavItem(id) {
  await db.query('DELETE FROM home_nav_items WHERE id = ?', [id]);
}

async function selectAnnouncements({ publicOnly = false } = {}) {
  const nowWhere = publicOnly
    ? 'WHERE enabled = 1 AND (start_at IS NULL OR start_at <= NOW()) AND (end_at IS NULL OR end_at >= NOW())'
    : '';
  const [rows] = await db.query(
    `SELECT ${announcementFields} FROM home_announcements ${nowWhere} ORDER BY sort_order ASC, created_at DESC`,
  );
  return rows;
}

async function insertAnnouncement(item) {
  await db.query(
    `INSERT INTO home_announcements (id, title, content, link_url, sort_order, enabled, start_at, end_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      item.id,
      item.title,
      item.content,
      item.linkUrl,
      item.sortOrder,
      item.enabled ? 1 : 0,
      item.startAt || null,
      item.endAt || null,
    ],
  );
}

async function updateAnnouncement(id, fields, values) {
  if (!fields.length) return;
  await db.query(`UPDATE home_announcements SET ${fields.join(', ')} WHERE id = ?`, [...values, id]);
}

async function deleteAnnouncement(id) {
  await db.query('DELETE FROM home_announcements WHERE id = ?', [id]);
}

module.exports = {
  selectNavItems,
  insertNavItem,
  updateNavItem,
  deleteNavItem,
  selectAnnouncements,
  insertAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
};

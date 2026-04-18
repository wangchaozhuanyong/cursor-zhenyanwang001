const db = require('../../config/db');

async function countNotifications() {
  const [[{ total }]] = await db.query('SELECT COUNT(*) AS total FROM notifications');
  return total;
}

async function selectNotificationsPage(pageSize, offset) {
  const [rows] = await db.query(
    'SELECT * FROM notifications ORDER BY created_at DESC LIMIT ? OFFSET ?',
    [pageSize, offset],
  );
  return rows;
}

async function insertNotification({ id, userId, type, title, content }) {
  await db.query(
    'INSERT INTO notifications (id, user_id, type, title, content) VALUES (?,?,?,?,?)',
    [id, userId, type, title, content],
  );
}

async function selectAllUserIds() {
  const [users] = await db.query('SELECT id FROM users');
  return users.map((u) => u.id);
}

async function deleteNotificationById(id) {
  await db.query('DELETE FROM notifications WHERE id = ?', [id]);
}

module.exports = {
  countNotifications,
  selectNotificationsPage,
  insertNotification,
  selectAllUserIds,
  deleteNotificationById,
};

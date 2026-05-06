const db = require('../../config/db');

async function countNotifications(userId, type, isRead) {
  let where = 'WHERE user_id = ?';
  const params = [userId];
  if (type) {
    where += ' AND type = ?';
    params.push(type);
  }
  if (isRead !== undefined && isRead !== '') {
    where += ' AND is_read = ?';
    params.push(isRead === 'true' || isRead === '1' ? 1 : 0);
  }
  const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM notifications ${where}`, params);
  return total;
}

async function selectNotificationsPage(userId, type, isRead, pageSize, offset) {
  let where = 'WHERE user_id = ?';
  const params = [userId];
  if (type) {
    where += ' AND type = ?';
    params.push(type);
  }
  if (isRead !== undefined && isRead !== '') {
    where += ' AND is_read = ?';
    params.push(isRead === 'true' || isRead === '1' ? 1 : 0);
  }
  const [rows] = await db.query(
    `SELECT * FROM notifications ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, offset],
  );
  return rows;
}

async function markRead(userId, id) {
  await db.query(
    'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?',
    [id, userId],
  );
}

async function markAllRead(userId) {
  await db.query(
    'UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0',
    [userId],
  );
}

async function countUnread(userId) {
  const [[{ count }]] = await db.query(
    'SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND is_read = 0',
    [userId],
  );
  return count;
}

async function insertNotification({ id, user_id, type, title, content }) {
  await db.query(
    'INSERT INTO notifications (id, user_id, type, title, content) VALUES (?,?,?,?,?)',
    [id, user_id, type, title, content],
  );
}

module.exports = {
  countNotifications,
  selectNotificationsPage,
  markRead,
  markAllRead,
  countUnread,
  insertNotification,
};

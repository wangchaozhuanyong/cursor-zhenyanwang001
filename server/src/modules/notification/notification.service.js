const repo = require('./notification.repository');

async function getNotifications(userId, query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(query.pageSize, 10) || 20));
  const { type, is_read } = query;
  const total = await repo.countNotifications(userId, type, is_read);
  const offset = (page - 1) * pageSize;
  const rows = await repo.selectNotificationsPage(userId, type, is_read, pageSize, offset);
  return { list: rows, total, page, pageSize };
}

async function markAsRead(userId, id) {
  await repo.markRead(userId, id);
  return { message: '已标记已读' };
}

async function markAllAsRead(userId) {
  await repo.markAllRead(userId);
  return { message: '全部已读' };
}

async function getUnreadCount(userId) {
  const count = await repo.countUnread(userId);
  return { count };
}

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
};

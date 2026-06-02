const repo = require('../repository/notification.repository');
const { normalizeLegacyNotificationDisplay } = require('../../../utils/notificationDisplayNormalize');

function formatNotificationRow(row) {
  const normalized = normalizeLegacyNotificationDisplay(row.title, row.content);
  return {
    ...row,
    title: normalized.title,
    content: normalized.content,
  };
}

async function getNotifications(userId, query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(query.pageSize, 10) || 20));
  const { type, is_read } = query;
  const total = await repo.countNotifications(userId, type, is_read);
  const offset = (page - 1) * pageSize;
  const rows = await repo.selectNotificationsPage(userId, type, is_read, pageSize, offset);
  return { list: rows.map(formatNotificationRow), total, page, pageSize };
}

async function markAsRead(userId, id) {
  await repo.markRead(userId, id);
  return { message: '已标记为已读' };
}

async function markAllAsRead(userId) {
  await repo.markAllRead(userId);
  return { message: '全部消息已标记为已读' };
}

async function getUnreadCount(userId) {
  const count = await repo.countUnread(userId);
  return { count };
}

/** 订单/支付等业务模块复用的用户通知写入入口 */
async function insertUserNotification({ id, userId, type, title, content }) {
  await repo.insertNotification({
    id,
    user_id: userId,
    type,
    title,
    content,
  });
}

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  insertUserNotification,
};

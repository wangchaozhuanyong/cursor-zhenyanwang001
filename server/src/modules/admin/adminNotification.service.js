const { generateId } = require('../../utils/helpers');
const { BusinessError } = require('../../errors/BusinessError');
const repo = require('./adminNotification.repository');
const { writeAuditLog } = require('../../utils/auditLog');

async function listNotifications(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(query.pageSize, 10) || 20));
  const total = await repo.countNotifications();
  const offset = (page - 1) * pageSize;
  const list = await repo.selectNotificationsPage(pageSize, offset);
  return { kind: 'paginate', list, total, page, pageSize };
}

async function sendNotification(body, adminUserId, req) {
  const { user_id, type, title, content } = body;
  if (!title || !content) throw new BusinessError(400, '标题和内容必填');

  if (user_id) {
    const id = generateId();
    await repo.insertNotification({ id, userId: user_id, type: type || 'system', title, content });
  } else {
    const userIds = await repo.selectAllUserIds();
    const t = type || 'system';
    for (const uid of userIds) {
      const id = generateId();
      await repo.insertNotification({ id, userId: uid, type: t, title, content });
    }
  }
  await writeAuditLog({ req, operatorId: adminUserId, actionType: 'notification.send', objectType: 'notification', objectId: user_id || 'broadcast', summary: user_id ? `发送通知给 ${user_id}` : '广播通知', after: { title, user_id: user_id || 'all' }, result: 'success' });
  return { data: null, message: '发送成功' };
}

async function deleteNotification(id, adminUserId, req) {
  await repo.deleteNotificationById(id);
  await writeAuditLog({ req, operatorId: adminUserId, actionType: 'notification.delete', objectType: 'notification', objectId: id, summary: `删除通知 ${id}`, result: 'success' });
  return { data: null, message: '已删除' };
}

module.exports = {
  listNotifications,
  sendNotification,
  deleteNotification,
};

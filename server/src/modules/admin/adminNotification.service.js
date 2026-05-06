const { generateId } = require('../../utils/helpers');
const { BusinessError } = require('../../errors/BusinessError');
const repo = require('./adminNotification.repository');
const { writeAuditLog } = require('../../utils/auditLog');
const triggerSettings = require('../notification/triggerSettings.service');

const NOTIFICATION_TEMPLATES = [
  { code: 'order_created', name: '下单成功', type: 'order', title: '订单已创建', content: '您的订单已创建成功，请留意后续发货通知。' },
  { code: 'order_shipped', name: '订单发货', type: 'shipping', title: '订单已发货', content: '您的订单已发货，可在订单详情查看物流信息。' },
  { code: 'order_refunded', name: '订单退款', type: 'refund', title: '退款已处理', content: '您的退款申请已处理完成，请留意账户变动。' },
  { code: 'promotion', name: '活动促销', type: 'promotion', title: '限时活动上线', content: '活动已开启，点击查看详情并参与。' },
];

let schedulerTimer = null;

async function listNotifications(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(query.pageSize, 10) || 20));
  const { where, params } = repo.buildBatchWhere(query);
  const total = await repo.countNotificationBatches(where, params);
  const offset = (page - 1) * pageSize;
  const list = await repo.selectNotificationBatchesPage(where, params, pageSize, offset);
  return { kind: 'paginate', list, total, page, pageSize };
}

async function sendNotification(body, adminUserId, req) {
  const {
    user_id,
    user_ids,
    type,
    title,
    content,
    audience_type,
    scheduled_at,
    link_url,
    template_code,
  } = body;
  if (!title || !content) throw new BusinessError(400, '标题和内容必填');
  const notificationType = type || 'system';
  const audienceType = audience_type || (user_id ? 'single' : 'all');

  const now = new Date();
  const scheduledAt = scheduled_at ? new Date(scheduled_at) : null;
  if (scheduledAt && Number.isNaN(scheduledAt.getTime())) {
    throw new BusinessError(400, '定时发送时间格式不正确');
  }
  const sendStatus = scheduledAt && scheduledAt > now ? 'scheduled' : 'sent';
  const sentAt = sendStatus === 'sent' ? now : null;
  const batchId = generateId();

  let targetUserIds = [];
  let audienceValue = null;

  if (audienceType === 'single' && user_id) {
    targetUserIds = [user_id];
    audienceValue = user_id;
  } else if (audienceType === 'specific' && Array.isArray(user_ids) && user_ids.length) {
    targetUserIds = [...new Set(user_ids.filter(Boolean))];
    audienceValue = String(targetUserIds.length);
  } else if (audienceType === 'all') {
    targetUserIds = await repo.selectAllUserIds();
    audienceValue = 'all';
  } else {
    throw new BusinessError(400, '请选择有效的通知受众');
  }

  if (!targetUserIds.length) {
    throw new BusinessError(400, '目标用户为空，未发送');
  }

  for (const uid of targetUserIds) {
    const id = generateId();
    await repo.insertNotification({
      id,
      batchId,
      userId: uid,
      type: notificationType,
      title,
      content,
      audienceType,
      audienceValue,
      sendStatus,
      scheduledAt,
      sentAt,
      workflowStatus: 'published',
      templateCode: template_code || null,
      linkUrl: link_url || null,
      publishStatus: 'published',
    });
  }

  await writeAuditLog({
    req,
    operatorId: adminUserId,
    actionType: 'notification.send',
    objectType: 'notification_batch',
    objectId: batchId,
    summary: `发送通知(${audienceType})`,
    after: { title, audienceType, recipientCount: targetUserIds.length, sendStatus, scheduledAt },
    result: 'success',
  });
  return {
    data: {
      id: batchId,
      title,
      content,
      type: notificationType,
      audience_type: audienceType,
      send_status: sendStatus,
      workflow_status: 'published',
      link_url: link_url || null,
      template_code: template_code || null,
      scheduled_at: scheduledAt,
      sent_at: sentAt,
      created_at: now,
      recipient_count: targetUserIds.length,
      read_count: 0,
    },
    message: sendStatus === 'scheduled' ? '已创建定时通知' : '发送成功',
  };
}

async function createDraft(body, adminUserId, req) {
  const payload = { ...body };
  const now = new Date();
  const scheduledAt = payload.scheduled_at ? new Date(payload.scheduled_at) : null;
  if (scheduledAt && Number.isNaN(scheduledAt.getTime())) throw new BusinessError(400, '定时发送时间格式不正确');
  const batchId = generateId();
  const audienceType = payload.audience_type || (payload.user_id ? 'single' : 'all');
  let recipients = [];
  let audienceValue = null;
  if (audienceType === 'single') {
    if (!payload.user_id) throw new BusinessError(400, '单用户草稿必须填写用户ID');
    recipients = [payload.user_id];
    audienceValue = payload.user_id;
  } else if (audienceType === 'specific') {
    recipients = Array.isArray(payload.user_ids) ? [...new Set(payload.user_ids.filter(Boolean))] : [];
    if (!recipients.length) throw new BusinessError(400, '指定用户草稿必须至少包含一个用户ID');
    audienceValue = String(recipients.length);
  } else {
    recipients = await repo.selectAllUserIds();
    audienceValue = 'all';
  }
  if (!recipients.length) throw new BusinessError(400, '目标用户为空，无法保存草稿');
  for (const uid of recipients) {
    await repo.insertNotification({
      id: generateId(),
      batchId,
      userId: uid,
      type: payload.type || 'system',
      title: payload.title || '未命名通知',
      content: payload.content || '',
      audienceType,
      audienceValue,
      sendStatus: 'draft',
      scheduledAt,
      sentAt: null,
      workflowStatus: 'draft',
      templateCode: payload.template_code || null,
      linkUrl: payload.link_url || null,
      publishStatus: 'draft',
    });
  }
  await writeAuditLog({
    req,
    operatorId: adminUserId,
    actionType: 'notification.draft.create',
    objectType: 'notification_batch',
    objectId: batchId,
    summary: '保存通知草稿',
    after: { title: payload.title, recipientCount: recipients.length },
    result: 'success',
  });
  return { data: { id: batchId, created_at: now }, message: '草稿已保存' };
}

async function publishDraft(batchId, body, adminUserId, req) {
  const now = new Date();
  const scheduledAt = body?.scheduled_at ? new Date(body.scheduled_at) : null;
  if (scheduledAt && Number.isNaN(scheduledAt.getTime())) throw new BusinessError(400, '定时发送时间格式不正确');
  const sendStatus = scheduledAt && scheduledAt > now ? 'scheduled' : 'sent';
  const sentAt = sendStatus === 'sent' ? now : null;
  await repo.publishBatch(batchId, sendStatus, scheduledAt, sentAt);
  await writeAuditLog({
    req,
    operatorId: adminUserId,
    actionType: 'notification.publish',
    objectType: 'notification_batch',
    objectId: batchId,
    summary: '发布通知批次',
    after: { sendStatus, scheduledAt },
    result: 'success',
  });
  return { data: { id: batchId, send_status: sendStatus, scheduled_at: scheduledAt, sent_at: sentAt }, message: sendStatus === 'scheduled' ? '已发布，等待定时发送' : '发布成功' };
}

function listTemplates() {
  return { data: NOTIFICATION_TEMPLATES, message: 'ok' };
}

async function listTriggerSettings() {
  const data = await triggerSettings.getNotificationTriggerSettings();
  return { data, message: 'ok' };
}

async function updateTriggerSettings(body, adminUserId, req) {
  const data = await triggerSettings.updateNotificationTriggerSettings(body?.rules || []);
  await writeAuditLog({
    req,
    operatorId: adminUserId,
    actionType: 'notification.trigger_settings.update',
    objectType: 'site_settings',
    objectId: 'notificationTriggerRules',
    summary: '更新通知自动触发规则',
    after: data,
    result: 'success',
  });
  return { data, message: '自动触发规则已保存' };
}

async function deleteNotification(id, adminUserId, req) {
  await repo.markBatchDeleted(id);
  await writeAuditLog({
    req,
    operatorId: adminUserId,
    actionType: 'notification.delete',
    objectType: 'notification_batch',
    objectId: id,
    summary: `撤回通知批次 ${id}`,
    result: 'success',
  });
  return { data: null, message: '已删除' };
}

function startNotificationScheduler() {
  if (schedulerTimer) return;
  schedulerTimer = setInterval(async () => {
    try {
      await repo.dispatchDueScheduledNotifications();
    } catch (err) {
      console.error('[notification.scheduler] dispatch failed:', err?.message || err);
    }
  }, 30 * 1000);
}

module.exports = {
  listNotifications,
  sendNotification,
  createDraft,
  publishDraft,
  listTemplates,
  listTriggerSettings,
  updateTriggerSettings,
  deleteNotification,
  startNotificationScheduler,
};

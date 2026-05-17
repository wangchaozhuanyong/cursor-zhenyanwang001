const { generateId } = require('../../utils/helpers');
const { BusinessError } = require('../../errors/BusinessError');
const repo = require('./adminNotification.repository');
const { writeAuditLog } = require('../../utils/auditLog');
const triggerSettings = require('./notificationTriggerSettings.service');

const NOTIFICATION_TYPES = new Set([
  'system', 'order', 'shipping', 'payment', 'refund', 'after_sale', 'promotion', 'coupon', 'points', 'reward',
]);

const NOTIFICATION_TEMPLATES = [
  { code: 'order_created', name: '下单成功', type: 'order', title: '订单已创建', content: '您的订单已创建成功，请留意后续发货通知。' },
  { code: 'order_shipped', name: '订单发货', type: 'shipping', title: '订单已发货', content: '您的订单已发货，可在订单详情查看物流信息。' },
  { code: 'order_refunded', name: '订单退款', type: 'refund', title: '退款已处理', content: '您的退款申请已处理完成，请留意账户变动。' },
  { code: 'promotion', name: '活动促销', type: 'promotion', title: '限时活动上线', content: '活动已开启，点击查看详情并参与。' },
];

let schedulerTimer = null;

function parseSchedule(scheduled_at) {
  const now = new Date();
  const scheduledAt = scheduled_at ? new Date(scheduled_at) : null;
  if (scheduledAt && Number.isNaN(scheduledAt.getTime())) {
    throw new BusinessError(400, '定时发送时间格式不正确');
  }
  const sendStatus = scheduledAt && scheduledAt > now ? 'scheduled' : 'sent';
  const sentAt = sendStatus === 'sent' ? now : null;
  return { now, scheduledAt, sendStatus, sentAt };
}

async function resolveAudience(body) {
  const audienceType = body.audience_type || (body.user_id ? 'single' : 'all');
  let targetUserIds = [];
  let audienceValue = null;

  if (audienceType === 'single') {
    if (!body.user_id) throw new BusinessError(400, '单用户发送必须选择用户');
    const user = await repo.findValidUserById(body.user_id);
    if (!user) throw new BusinessError(400, '目标用户不存在或状态无效');
    targetUserIds = [user.id];
    audienceValue = user.id;
  } else if (audienceType === 'specific') {
    targetUserIds = [...new Set((Array.isArray(body.user_ids) ? body.user_ids : []).filter(Boolean))];
    if (!targetUserIds.length) throw new BusinessError(400, '请至少选择一个指定用户');
    audienceValue = String(targetUserIds.length);
  } else if (audienceType === 'all') {
    targetUserIds = await repo.selectAllUserIds();
    audienceValue = 'all';
  } else {
    // advanced audience types暂以 audience_value 为条件标识，先允许存草稿与批次，发送时回落到全量可扩展
    targetUserIds = await repo.selectAllUserIds();
    audienceValue = body.audience_value || null;
  }

  if (!targetUserIds.length) {
    throw new BusinessError(400, '目标用户为空，未发送');
  }

  return { audienceType, audienceValue, targetUserIds };
}

async function listNotifications(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(query.pageSize, 10) || 20));
  const { where, params } = repo.buildBatchWhere(query);
  const total = await repo.countNotificationBatches(where, params);
  const offset = (page - 1) * pageSize;
  const list = await repo.selectNotificationBatchesPage(where, params, pageSize, offset);
  return { kind: 'paginate', list, total, page, pageSize };
}

async function getSummary() {
  return { data: await repo.selectSummary(), message: 'ok' };
}

async function searchUsers(query) {
  const keyword = String(query.keyword || '').trim();
  if (!keyword) return { data: [], message: 'ok' };
  const data = await repo.searchUserCandidates(keyword, Math.min(50, Number(query.limit) || 20));
  return { data, message: 'ok' };
}

async function estimateAudience(body) {
  const { audienceType, audienceValue, targetUserIds } = await resolveAudience(body);
  return {
    data: {
      audience_type: audienceType,
      audience_value: audienceValue,
      estimated_count: targetUserIds.length,
    },
    message: 'ok',
  };
}

async function getNotificationDetail(batchId, _query = {}) {
  const batch = await repo.selectBatchById(batchId);
  if (!batch) throw new BusinessError(404, '通知批次不存在');
  const stats = await repo.selectBatchRecipientStats(batchId);
  return {
    data: { batch, stats },
    message: 'ok',
  };
}

async function sendNotification(body, adminUserId, req) {
  const { type, title, content, link_url, template_code } = body;
  if (!title || !content) throw new BusinessError(400, '标题和内容必填');
  const notificationType = type || 'system';
  if (!NOTIFICATION_TYPES.has(notificationType)) throw new BusinessError(400, '通知类型不支持');

  const { now, scheduledAt, sendStatus, sentAt } = parseSchedule(body.scheduled_at);
  const { audienceType, audienceValue, targetUserIds } = await resolveAudience(body);

  const batch = {
    id: generateId(),
    type: notificationType,
    title,
    content,
    audience_type: audienceType,
    audience_value: audienceValue,
    link_url: link_url || null,
    template_code: template_code || null,
    send_status: sendStatus,
    workflow_status: 'published',
    scheduled_at: scheduledAt,
    sent_at: sentAt,
  };

  await repo.insertBatch({
    id: batch.id,
    title,
    content,
    type: notificationType,
    audienceType,
    audienceValue,
    linkUrl: batch.link_url,
    templateCode: batch.template_code,
    sendStatus,
    workflowStatus: 'published',
    scheduledAt,
    sentAt,
    createdBy: adminUserId,
  });

  await repo.insertNotificationsForBatch(batch, targetUserIds);

  await writeAuditLog({
    req,
    operatorId: adminUserId,
    actionType: 'notification.send',
    objectType: 'notification_batch',
    objectId: batch.id,
    summary: `发送通知(${audienceType})`,
    after: { title, audienceType, recipientCount: targetUserIds.length, sendStatus, scheduledAt },
    result: 'success',
  });

  return {
    data: {
      id: batch.id,
      title,
      content,
      type: notificationType,
      audience_type: audienceType,
      send_status: sendStatus,
      workflow_status: 'published',
      link_url: batch.link_url,
      template_code: batch.template_code,
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
  if (!body.title) throw new BusinessError(400, '草稿至少需要标题');
  const notificationType = body.type || 'system';
  if (!NOTIFICATION_TYPES.has(notificationType)) throw new BusinessError(400, '通知类型不支持');
  const { scheduledAt } = parseSchedule(body.scheduled_at);
  const audienceType = body.audience_type || (body.user_id ? 'single' : 'all');
  let audienceValue = body.audience_value || null;
  if (audienceType === 'single') {
    if (!body.user_id) throw new BusinessError(400, '单用户草稿必须选择用户');
    const user = await repo.findValidUserById(body.user_id);
    if (!user) throw new BusinessError(400, '目标用户不存在或状态无效');
    audienceValue = user.id;
  }

  const batchId = generateId();
  await repo.insertBatch({
    id: batchId,
    title: body.title,
    content: body.content || '',
    type: notificationType,
    audienceType,
    audienceValue,
    linkUrl: body.link_url || null,
    templateCode: body.template_code || null,
    sendStatus: 'draft',
    workflowStatus: 'draft',
    scheduledAt,
    sentAt: null,
    createdBy: adminUserId,
  });

  await writeAuditLog({
    req,
    operatorId: adminUserId,
    actionType: 'notification.draft.create',
    objectType: 'notification_batch',
    objectId: batchId,
    summary: '保存通知草稿',
    after: { title: body.title, audienceType },
    result: 'success',
  });
  return { data: { id: batchId, created_at: new Date() }, message: '草稿已保存' };
}

async function publishDraft(batchId, body, adminUserId, req) {
  const batch = await repo.selectBatchById(batchId);
  if (!batch) throw new BusinessError(404, '草稿不存在');
  if (batch.workflow_status !== 'draft') throw new BusinessError(400, '仅草稿可发布');

  const finalScheduledAt = body?.scheduled_at ? new Date(body.scheduled_at) : (batch.scheduled_at ? new Date(batch.scheduled_at) : null);
  if (finalScheduledAt && Number.isNaN(finalScheduledAt.getTime())) throw new BusinessError(400, '定时发送时间格式不正确');
  const now = new Date();
  const sendStatus = finalScheduledAt && finalScheduledAt > now ? 'scheduled' : 'sent';
  const sentAt = sendStatus === 'sent' ? now : null;

  await repo.updateBatch(batchId, {
    send_status: sendStatus,
    workflow_status: 'published',
    scheduled_at: finalScheduledAt,
    sent_at: sentAt,
  });

  const fakeBody = {
    audience_type: batch.audience_type,
    audience_value: batch.audience_value,
    user_id: batch.audience_type === 'single' ? batch.audience_value : undefined,
    user_ids: batch.audience_type === 'specific' ? String(batch.audience_value || '').split(',').filter(Boolean) : undefined,
  };
  const { targetUserIds } = await resolveAudience(fakeBody);

  await repo.insertNotificationsForBatch({
    id: batch.id,
    type: batch.type,
    title: batch.title,
    content: batch.content,
    audience_type: batch.audience_type,
    audience_value: batch.audience_value,
    link_url: batch.link_url,
    template_code: batch.template_code,
    send_status: sendStatus,
    workflow_status: 'published',
    scheduled_at: finalScheduledAt,
    sent_at: sentAt,
  }, targetUserIds);

  await writeAuditLog({
    req,
    operatorId: adminUserId,
    actionType: 'notification.publish',
    objectType: 'notification_batch',
    objectId: batchId,
    summary: '发布通知批次',
    after: { sendStatus, scheduledAt: finalScheduledAt, recipientCount: targetUserIds.length },
    result: 'success',
  });
  return { data: { id: batchId, send_status: sendStatus, scheduled_at: finalScheduledAt, sent_at: sentAt }, message: sendStatus === 'scheduled' ? '已发布，等待定时发送' : '发布成功' };
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

async function deleteDraft(batchId, adminUserId, req) {
  const batch = await repo.selectBatchById(batchId);
  if (!batch) throw new BusinessError(404, '通知不存在');
  if (batch.workflow_status !== 'draft') throw new BusinessError(400, '仅草稿可删除');
  await repo.markBatchDeleted(batchId);
  await writeAuditLog({ req, operatorId: adminUserId, actionType: 'notification.delete', objectType: 'notification_batch', objectId: batchId, summary: '删除草稿', result: 'success' });
  return { data: null, message: '草稿已删除' };
}

async function cancelScheduled(batchId, adminUserId, req) {
  const batch = await repo.selectBatchById(batchId);
  if (!batch) throw new BusinessError(404, '通知不存在');
  if (batch.send_status !== 'scheduled') throw new BusinessError(400, '仅定时通知可取消');
  await repo.cancelScheduledBatch(batchId);
  await writeAuditLog({ req, operatorId: adminUserId, actionType: 'notification.cancel', objectType: 'notification_batch', objectId: batchId, summary: '取消定时通知', result: 'success' });
  return { data: null, message: '已取消定时' };
}

async function revokeSent(batchId, adminUserId, req) {
  const batch = await repo.selectBatchById(batchId);
  if (!batch) throw new BusinessError(404, '通知不存在');
  if (batch.send_status !== 'sent') throw new BusinessError(400, '仅已发送通知可撤回');
  await repo.revokeSentBatch(batchId);
  await writeAuditLog({ req, operatorId: adminUserId, actionType: 'notification.revoke', objectType: 'notification_batch', objectId: batchId, summary: '撤回已发送通知', result: 'success' });
  return { data: null, message: '已撤回通知' };
}

async function deleteNotification(id, adminUserId, req) {
  // backward compatibility: keep as draft-delete behavior
  return deleteDraft(id, adminUserId, req);
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
  getSummary,
  searchUsers,
  estimateAudience,
  getNotificationDetail,
  sendNotification,
  createDraft,
  publishDraft,
  listTemplates,
  listTriggerSettings,
  updateTriggerSettings,
  deleteDraft,
  cancelScheduled,
  revokeSent,
  deleteNotification,
  startNotificationScheduler,
};

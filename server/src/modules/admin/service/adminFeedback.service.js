const repo = require('../repository/adminFeedback.repository');
const { writeAuditLog } = require('../../../utils/auditLog');

const VALID_STATUSES = new Set(['pending', 'in_progress', 'resolved', 'dismissed']);

function normalizeRow(row) {
  return {
    ...row,
    handler_note: row.handler_note || '',
    contact: row.contact || '',
    order_no: row.order_no || '',
    page_url: row.page_url || '',
    user_nickname: row.user_nickname || '',
    user_phone: row.user_phone || '',
    handler_name: row.handler_name || '',
  };
}

async function listFeedback(query = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize, 10) || 20));
  const filters = {
    keyword: query.keyword || '',
    status: query.status || 'all',
    type: query.type || 'all',
    userId: query.userId || '',
    dateFrom: query.dateFrom || '',
    dateTo: query.dateTo || '',
  };
  const total = await repo.countFeedback(filters);
  const offset = (page - 1) * pageSize;
  const rows = await repo.selectFeedbackPage(filters, pageSize, offset);
  return { list: rows.map(normalizeRow), total, page, pageSize };
}

async function updateFeedback(id, body, adminUserId, req) {
  const feedback = await repo.selectFeedbackById(id);
  if (!feedback) return { error: { code: 404, message: '反馈不存在' } };

  const nextStatus = body.status || feedback.status;
  if (!VALID_STATUSES.has(nextStatus)) {
    return { error: { code: 400, message: '反馈状态不正确' } };
  }

  const nextNote = body.handler_note !== undefined ? String(body.handler_note || '').trim() : feedback.handler_note;
  await repo.updateFeedback(id, {
    status: nextStatus,
    handler_note: nextNote,
    handled_by: adminUserId,
  });

  await writeAuditLog({
    req,
    operatorId: adminUserId,
    actionType: 'feedback.update',
    objectType: 'user_feedback',
    objectId: id,
    summary: `处理用户反馈 ${id}`,
    before: { status: feedback.status, handler_note: feedback.handler_note || '' },
    after: { status: nextStatus, handler_note: nextNote || '' },
    result: 'success',
  });

  const updated = await repo.selectFeedbackById(id);
  return {
    data: updated ? normalizeRow(updated) : null,
    message: '反馈处理状态已更新',
  };
}

module.exports = {
  listFeedback,
  updateFeedback,
};

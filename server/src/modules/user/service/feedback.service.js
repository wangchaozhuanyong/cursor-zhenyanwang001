const { generateId } = require('../../../utils/helpers');
const repo = require('../repository/feedback.repository');

function normalizeFeedback(row) {
  return {
    ...row,
    title: row.title || '',
    contact: row.contact || '',
    order_no: row.order_no || '',
    page_url: row.page_url || '',
    handler_note: row.handler_note || '',
  };
}

async function submitFeedback(userId, body, context = {}) {
  const id = generateId();
  await repo.insertFeedback({
    id,
    user_id: userId || null,
    type: body.type || 'other',
    title: body.title || '',
    content: body.content,
    contact: body.contact || '',
    order_no: body.order_no || '',
    page_url: body.page_url || '',
    source_ip: context.ip || '',
    user_agent: context.userAgent || '',
  });
  return {
    data: { id, status: 'pending' },
    message: '反馈已提交，我们会尽快处理',
  };
}

async function listMyFeedback(userId, query = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(query.pageSize, 10) || 5));
  const total = await repo.countFeedbackByUserId(userId);
  const offset = (page - 1) * pageSize;
  const rows = await repo.selectFeedbackByUserId(userId, pageSize, offset);
  return {
    list: rows.map(normalizeFeedback),
    total,
    page,
    pageSize,
  };
}

module.exports = {
  listMyFeedback,
  submitFeedback,
};

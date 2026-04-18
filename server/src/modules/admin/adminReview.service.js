const repo = require('./adminReview.repository');
const { writeAuditLog } = require('../../utils/auditLog');

function buildReviewWhere(query) {
  let where = 'WHERE 1=1';
  const params = [];

  const includeDeleted = query.includeDeleted === 'true' || query.includeDeleted === '1';
  if (!includeDeleted) {
    where += " AND r.status != 'deleted'";
  }

  if (query.status && query.status !== 'all') {
    where += ' AND r.status = ?';
    params.push(query.status);
  }
  if (query.rating) {
    where += ' AND r.rating = ?';
    params.push(Number(query.rating));
  }
  if (query.productId) {
    where += ' AND r.product_id = ?';
    params.push(query.productId);
  }
  if (query.userId) {
    where += ' AND r.user_id = ?';
    params.push(query.userId);
  }
  if (query.keyword) {
    where += ' AND (r.content LIKE ? OR r.nickname LIKE ? OR p.name LIKE ?)';
    const kw = `%${query.keyword}%`;
    params.push(kw, kw, kw);
  }
  if (query.dateFrom) {
    where += ' AND r.created_at >= ?';
    params.push(query.dateFrom);
  }
  if (query.dateTo) {
    where += ' AND r.created_at <= ?';
    params.push(`${query.dateTo} 23:59:59`);
  }
  return { where, params };
}

async function listReviews(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(query.pageSize, 10) || 20));
  const { where, params } = buildReviewWhere(query);
  const total = await repo.countReviews(where, params);
  const offset = (page - 1) * pageSize;
  const rows = await repo.selectReviewsPage(where, params, pageSize, offset, query.sortBy, query.sortOrder);
  const list = rows.map((r) => ({
    ...r,
    images: typeof r.images === 'string' ? JSON.parse(r.images || '[]') : (r.images || []),
  }));
  return { list, total, page, pageSize };
}

async function toggleVisibility(id, adminUserId, req) {
  const review = await repo.selectReviewById(id);
  if (!review) return { error: { code: 404, message: '评论不存在' } };
  if (review.status === 'deleted') return { error: { code: 400, message: '已删除的评论不能操作' } };

  const newStatus = review.status === 'hidden' ? 'normal' : 'hidden';
  await repo.updateReviewStatus(id, newStatus);
  await writeAuditLog({
    req, operatorId: adminUserId,
    actionType: `review.${newStatus === 'hidden' ? 'hide' : 'show'}`,
    objectType: 'product_review', objectId: id,
    summary: `评论${newStatus === 'hidden' ? '隐藏' : '显示'} ${id}`,
    before: { status: review.status }, after: { status: newStatus },
    result: 'success',
  });
  return { message: newStatus === 'hidden' ? '已隐藏' : '已显示' };
}

async function replyReview(id, body, adminUserId, req) {
  const { reply } = body;
  if (!reply || !reply.trim()) return { error: { code: 400, message: '回复内容不能为空' } };

  const review = await repo.selectReviewById(id);
  if (!review) return { error: { code: 404, message: '评论不存在' } };

  await repo.updateAdminReply(id, reply.trim());
  await writeAuditLog({
    req, operatorId: adminUserId,
    actionType: 'review.reply',
    objectType: 'product_review', objectId: id,
    summary: `官方回复评论 ${id}`,
    before: { admin_reply: review.admin_reply || null },
    after: { admin_reply: reply.trim() },
    result: 'success',
  });
  return { message: '回复成功' };
}

async function deleteReview(id, adminUserId, req) {
  const review = await repo.selectReviewById(id);
  if (!review) return { error: { code: 404, message: '评论不存在' } };

  await repo.softDeleteReview(id, adminUserId);
  await writeAuditLog({
    req, operatorId: adminUserId,
    actionType: 'review.delete',
    objectType: 'product_review', objectId: id,
    summary: `软删除评论 ${id}`,
    before: { status: review.status },
    after: { status: 'deleted' },
    result: 'success',
  });
  return { message: '已删除' };
}

async function restoreReview(id, adminUserId, req) {
  const review = await repo.selectReviewById(id);
  if (!review) return { error: { code: 404, message: '评论不存在' } };
  if (review.status !== 'deleted') return { error: { code: 400, message: '该评论未被删除' } };

  await repo.restoreReview(id);
  await writeAuditLog({
    req, operatorId: adminUserId,
    actionType: 'review.restore',
    objectType: 'product_review', objectId: id,
    summary: `恢复评论 ${id}`,
    before: { status: 'deleted' }, after: { status: 'normal' },
    result: 'success',
  });
  return { message: '已恢复' };
}

async function permanentDelete(id, adminUserId, req) {
  const review = await repo.selectReviewById(id);
  if (!review) return { error: { code: 404, message: '评论不存在' } };

  await repo.permanentDeleteReview(id);
  await writeAuditLog({
    req, operatorId: adminUserId,
    actionType: 'review.permanent_delete',
    objectType: 'product_review', objectId: id,
    summary: `彻底删除评论 ${id}`,
    before: { content: (review.content || '').slice(0, 200), rating: review.rating },
    result: 'success',
  });
  return { message: '已彻底删除' };
}

async function batchHide(ids, adminUserId, req) {
  await repo.batchUpdateStatus(ids, 'hidden');
  await writeAuditLog({
    req, operatorId: adminUserId,
    actionType: 'review.batch_hide',
    objectType: 'product_review', objectId: ids.join(','),
    summary: `批量隐藏 ${ids.length} 条评论`,
    result: 'success',
  });
  return { message: `已隐藏 ${ids.length} 条评论` };
}

async function batchDelete(ids, adminUserId, req) {
  await repo.batchSoftDelete(ids, adminUserId);
  await writeAuditLog({
    req, operatorId: adminUserId,
    actionType: 'review.batch_delete',
    objectType: 'product_review', objectId: ids.join(','),
    summary: `批量删除 ${ids.length} 条评论`,
    result: 'success',
  });
  return { message: `已删除 ${ids.length} 条评论` };
}

async function toggleFeatured(id, adminUserId, req) {
  const review = await repo.selectReviewById(id);
  if (!review) return { error: { code: 404, message: '评论不存在' } };
  if (review.status === 'deleted') return { error: { code: 400, message: '已删除的评论不能精选' } };

  const wasFeatured = !!review.is_featured;
  await repo.updateReviewFeatured(id, !wasFeatured);
  await writeAuditLog({
    req, operatorId: adminUserId,
    actionType: `review.${wasFeatured ? 'unfeature' : 'feature'}`,
    objectType: 'product_review', objectId: id,
    summary: `${wasFeatured ? '取消精选' : '设为精选'} 评论 ${id}`,
    before: { is_featured: wasFeatured }, after: { is_featured: !wasFeatured },
    result: 'success',
  });
  return { message: wasFeatured ? '已取消精选' : '已设为精选', data: { is_featured: !wasFeatured } };
}

module.exports = {
  listReviews,
  toggleVisibility,
  replyReview,
  deleteReview,
  restoreReview,
  permanentDelete,
  batchHide,
  batchDelete,
  toggleFeatured,
};

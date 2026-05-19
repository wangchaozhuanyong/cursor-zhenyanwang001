const { parseProductImages } = require('../../../utils/helpers');
const repo = require('../repository/adminReview.repository');
const { writeAuditLog } = require('../../../utils/auditLog');

const COMPLAINT_STATUSES = new Set(['none', 'pending', 'in_progress', 'contacted', 'resolved', 'dismissed']);

function buildReviewWhere(query) {
  let where = 'WHERE 1=1';
  const params = [];

  const includeDeleted = query.includeDeleted === 'true' || query.includeDeleted === '1';
  if (!includeDeleted && (!query.status || query.status === 'all')) {
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
  if (query.complaintStatus && query.complaintStatus !== 'all') {
    where += ' AND r.complaint_status = ?';
    params.push(query.complaintStatus);
  }
  if (query.verifiedOnly === 'true' || query.verifiedOnly === '1') {
    where += ' AND r.is_verified_purchase = 1';
  }
  if (query.keyword) {
    where += ' AND (r.content LIKE ? OR r.nickname LIKE ? OR p.name LIKE ? OR IFNULL(r.sku_text,"") LIKE ?)';
    const kw = `%${query.keyword}%`;
    params.push(kw, kw, kw, kw);
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

function mapReviewRow(r) {
  return {
    ...r,
    images: parseProductImages(r.images),
    is_featured: !!r.is_featured,
    is_verified_purchase: !!r.is_verified_purchase,
  };
}

async function listReviews(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(query.pageSize, 10) || 20));
  const { where, params } = buildReviewWhere(query);
  const total = await repo.countReviews(where, params);
  const offset = (page - 1) * pageSize;
  const rows = await repo.selectReviewsPage(where, params, pageSize, offset, query.sortBy, query.sortOrder);
  const list = rows.map(mapReviewRow);
  return { list, total, page, pageSize };
}

async function getReviewDetail(id) {
  const review = await repo.selectReviewDetail(id);
  if (!review) return { error: { code: 404, message: 'Review not found' } };
  const audit_logs = await repo.selectAuditLogsForReview(id);
  return {
    data: {
      review: mapReviewRow(review),
      audit_logs: audit_logs.map((log) => {
        const parse = (v) => {
          if (v == null) return null;
          if (typeof v === 'object') return v;
          try { return JSON.parse(v); } catch { return v; }
        };
        return {
          ...log,
          before_json: parse(log.before_json),
          after_json: parse(log.after_json),
        };
      }),
    },
  };
}

async function toggleVisibility(id, adminUserId, req) {
  const review = await repo.selectReviewById(id);
  if (!review) return { error: { code: 404, message: 'Review not found' } };
  if (review.status === 'deleted') return { error: { code: 400, message: 'Deleted review cannot be modified' } };
  if (review.status === 'pending' || review.status === 'rejected') {
    return { error: { code: 400, message: 'Pending or rejected review cannot toggle visibility' } };
  }

  const newStatus = review.status === 'hidden' ? 'normal' : 'hidden';
  await repo.updateReviewStatus(id, newStatus);
  await writeAuditLog({
    req, operatorId: adminUserId,
    actionType: `review.${newStatus === 'hidden' ? 'hide' : 'show'}`,
    objectType: 'product_review', objectId: id,
    summary: `Toggle review visibility ${id} -> ${newStatus}`,
    before: { status: review.status }, after: { status: newStatus },
    result: 'success',
  });
  return { message: newStatus === 'hidden' ? 'Hidden' : 'Visible' };
}

async function approveReview(id, adminUserId, req) {
  const review = await repo.selectReviewById(id);
  if (!review) return { error: { code: 404, message: 'Review not found' } };
  if (review.status !== 'pending') {
    return { error: { code: 400, message: 'Only pending reviews can be approved' } };
  }
  await repo.updateReviewStatus(id, 'normal');
  await writeAuditLog({
    req, operatorId: adminUserId,
    actionType: 'review.approve',
    objectType: 'product_review', objectId: id,
    summary: `Approve review ${id}`,
    before: { status: 'pending' }, after: { status: 'normal' },
    result: 'success',
  });
  return { message: 'Approved' };
}

async function rejectReview(id, adminUserId, req) {
  const review = await repo.selectReviewById(id);
  if (!review) return { error: { code: 404, message: 'Review not found' } };
  if (review.status !== 'pending') {
    return { error: { code: 400, message: 'Only pending reviews can be rejected' } };
  }
  await repo.updateReviewStatus(id, 'rejected');
  await writeAuditLog({
    req, operatorId: adminUserId,
    actionType: 'review.reject',
    objectType: 'product_review', objectId: id,
    summary: `Reject review ${id}`,
    before: { status: 'pending' }, after: { status: 'rejected' },
    result: 'success',
  });
  return { message: 'Rejected' };
}

async function replyReview(id, body, adminUserId, req) {
  const { reply } = body;
  if (!reply || !reply.trim()) return { error: { code: 400, message: 'Reply content is required' } };

  const review = await repo.selectReviewById(id);
  if (!review) return { error: { code: 404, message: 'Review not found' } };
  if (review.status === 'deleted') return { error: { code: 400, message: 'Deleted review cannot be replied' } };

  await repo.updateAdminReply(id, reply.trim());
  await writeAuditLog({
    req, operatorId: adminUserId,
    actionType: 'review.reply',
    objectType: 'product_review', objectId: id,
    summary: `Reply to review ${id}`,
    before: { admin_reply: review.admin_reply || null },
    after: { admin_reply: reply.trim() },
    result: 'success',
  });
  return { message: 'Reply saved' };
}

async function deleteReview(id, adminUserId, req) {
  const review = await repo.selectReviewById(id);
  if (!review) return { error: { code: 404, message: 'Review not found' } };
  if (review.status === 'deleted') {
    return { error: { code: 400, message: 'Review already deleted' } };
  }
  if (!['normal', 'hidden', 'pending', 'rejected'].includes(review.status)) {
    return { error: { code: 400, message: 'Current status cannot be deleted' } };
  }

  await repo.softDeleteReview(id, adminUserId);
  await writeAuditLog({
    req, operatorId: adminUserId,
    actionType: 'review.delete',
    objectType: 'product_review', objectId: id,
    summary: `Soft delete review ${id}`,
    before: { status: review.status },
    after: { status: 'deleted' },
    result: 'success',
  });
  return { message: 'Deleted' };
}

async function restoreReview(id, adminUserId, req) {
  const review = await repo.selectReviewById(id);
  if (!review) return { error: { code: 404, message: 'Review not found' } };
  if (review.status !== 'deleted') return { error: { code: 400, message: 'Review is not deleted' } };

  await repo.restoreReview(id);
  await writeAuditLog({
    req, operatorId: adminUserId,
    actionType: 'review.restore',
    objectType: 'product_review', objectId: id,
    summary: `Restore review ${id}`,
    before: { status: 'deleted' }, after: { status: 'normal' },
    result: 'success',
  });
  return { message: 'Restored' };
}

async function permanentDelete(id, adminUserId, req) {
  const review = await repo.selectReviewById(id);
  if (!review) return { error: { code: 404, message: 'Review not found' } };
  if (review.status !== 'deleted') {
    return { error: { code: 400, message: 'Only deleted review can be permanently removed' } };
  }

  await repo.permanentDeleteReview(id);
  await writeAuditLog({
    req, operatorId: adminUserId,
    actionType: 'review.permanent_delete',
    objectType: 'product_review', objectId: id,
    summary: `Permanently delete review ${id}`,
    before: { content: (review.content || '').slice(0, 200), rating: review.rating },
    result: 'success',
  });
  return { message: 'Permanently deleted' };
}

async function batchHide(ids, adminUserId, req) {
  const affected = await repo.batchUpdateStatus(ids, 'hidden', ['normal']);
  await writeAuditLog({
    req, operatorId: adminUserId,
    actionType: 'review.batch_hide',
    objectType: 'product_review', objectId: ids.join(','),
    summary: `Batch hide ${affected} reviews`,
    result: 'success',
  });
  return { message: `Hidden ${affected} reviews`, data: { affected } };
}

async function batchDelete(ids, adminUserId, req) {
  const affected = await repo.batchSoftDelete(ids, adminUserId);
  await writeAuditLog({
    req, operatorId: adminUserId,
    actionType: 'review.batch_delete',
    objectType: 'product_review', objectId: ids.join(','),
    summary: `Batch delete ${affected} reviews`,
    result: 'success',
  });
  return { message: `Deleted ${affected} reviews`, data: { affected } };
}

async function toggleFeatured(id, adminUserId, req) {
  const review = await repo.selectReviewById(id);
  if (!review) return { error: { code: 404, message: 'Review not found' } };
  if (review.status === 'deleted' || review.status === 'pending' || review.status === 'rejected') {
    return { error: { code: 400, message: 'Current status cannot be featured' } };
  }

  const wasFeatured = !!review.is_featured;
  await repo.updateReviewFeatured(id, !wasFeatured);
  await writeAuditLog({
    req, operatorId: adminUserId,
    actionType: `review.${wasFeatured ? 'unfeature' : 'feature'}`,
    objectType: 'product_review', objectId: id,
    summary: `${wasFeatured ? 'Unfeature' : 'Feature'} review ${id}`,
    before: { is_featured: wasFeatured }, after: { is_featured: !wasFeatured },
    result: 'success',
  });
  return { message: wasFeatured ? 'Unfeatured' : 'Featured', data: { is_featured: !wasFeatured } };
}

async function updateComplaint(id, body, adminUserId, req) {
  const { complaint_status, complaint_note } = body;
  if (!COMPLAINT_STATUSES.has(complaint_status)) {
    return { error: { code: 400, message: 'Invalid complaint status' } };
  }
  const review = await repo.selectReviewById(id);
  if (!review) return { error: { code: 404, message: 'Review not found' } };

  await repo.updateComplaint(id, complaint_status, complaint_note);
  await writeAuditLog({
    req, operatorId: adminUserId,
    actionType: 'review.complaint_update',
    objectType: 'product_review', objectId: id,
    summary: `Update complaint status ${id}`,
    before: {
      complaint_status: review.complaint_status,
      complaint_note: review.complaint_note,
    },
    after: { complaint_status, complaint_note: complaint_note || null },
    result: 'success',
  });
  return { message: 'Complaint status updated' };
}

module.exports = {
  listReviews,
  getReviewDetail,
  toggleVisibility,
  approveReview,
  rejectReview,
  replyReview,
  deleteReview,
  restoreReview,
  permanentDelete,
  batchHide,
  batchDelete,
  toggleFeatured,
  updateComplaint,
};








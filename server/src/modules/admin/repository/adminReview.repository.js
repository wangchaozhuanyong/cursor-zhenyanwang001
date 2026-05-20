const db = require('../../../config/db');

async function countReviews(where, params) {
  const [[{ total }]] = await db.query(
    `SELECT COUNT(*) AS total FROM product_reviews r
     LEFT JOIN products p ON p.id = r.product_id
     ${where}`,
    params,
  );
  return total;
}

async function selectReviewsPage(where, params, pageSize, offset, sortBy, sortOrder) {
  const allowedSort = ['created_at', 'rating', 'likes_count'];
  const col = allowedSort.includes(sortBy) ? `r.${sortBy}` : 'r.created_at';
  const dir = sortOrder === 'ASC' ? 'ASC' : 'DESC';
  const [rows] = await db.query(
    `SELECT r.*, p.name AS product_name, p.cover_image AS product_cover
     FROM product_reviews r
     LEFT JOIN products p ON p.id = r.product_id
     ${where}
     ORDER BY ${col} ${dir}
     LIMIT ? OFFSET ?`,
    [...params, pageSize, offset],
  );
  return rows;
}

async function selectReviewById(id) {
  const [[row]] = await db.query(
    `SELECT r.*, p.name AS product_name, p.cover_image AS product_cover
     FROM product_reviews r
     LEFT JOIN products p ON p.id = r.product_id
     WHERE r.id = ?`,
    [id],
  );
  return row || null;
}

async function selectReviewDetail(id) {
  const [[row]] = await db.query(
    `SELECT r.*, p.name AS product_name, p.cover_image AS product_cover,
            o.order_no
     FROM product_reviews r
     LEFT JOIN products p ON p.id = r.product_id
     LEFT JOIN orders o ON o.id = r.order_id
     WHERE r.id = ?`,
    [id],
  );
  return row || null;
}

async function selectAuditLogsForReview(reviewId, limit = 50) {
  const [rows] = await db.query(
    `SELECT id, operator_id, operator_name, action_type, summary,
            before_json, after_json, result, created_at
     FROM audit_logs
     WHERE object_type = 'product_review' AND object_id = ?
     ORDER BY created_at DESC
     LIMIT ?`,
    [reviewId, limit],
  );
  return rows;
}

async function updateReviewStatus(id, status) {
  await db.query('UPDATE product_reviews SET status = ? WHERE id = ?', [status, id]);
}

async function updateAdminReply(id, reply) {
  await db.query(
    'UPDATE product_reviews SET admin_reply = ?, admin_reply_at = NOW() WHERE id = ?',
    [reply, id],
  );
}

async function softDeleteReview(id, deletedBy) {
  await db.query(
    "UPDATE product_reviews SET status = 'deleted', deleted_at = NOW(), deleted_by = ? WHERE id = ?",
    [deletedBy, id],
  );
}

async function restoreReview(id) {
  await db.query(
    "UPDATE product_reviews SET status = 'normal', deleted_at = NULL, deleted_by = NULL WHERE id = ?",
    [id],
  );
}

async function permanentDeleteReview(id) {
  await db.query('DELETE FROM product_reviews WHERE id = ?', [id]);
  await db.query('DELETE FROM review_likes WHERE review_id = ?', [id]);
}

async function batchUpdateStatus(ids, status, fromStatuses) {
  if (!ids.length) return 0;
  const placeholders = ids.map(() => '?').join(',');
  const statusPh = fromStatuses.map(() => '?').join(',');
  const [result] = await db.query(
    `UPDATE product_reviews SET status = ?
     WHERE id IN (${placeholders}) AND status IN (${statusPh})`,
    [status, ...ids, ...fromStatuses],
  );
  return result.affectedRows || 0;
}

async function updateReviewFeatured(id, isFeatured) {
  await db.query(
    'UPDATE product_reviews SET is_featured = ? WHERE id = ?',
    [isFeatured ? 1 : 0, id],
  );
}

async function batchSoftDelete(ids, deletedBy) {
  if (!ids.length) return 0;
  const placeholders = ids.map(() => '?').join(',');
  const [result] = await db.query(
    `UPDATE product_reviews SET status = 'deleted', deleted_at = NOW(), deleted_by = ?
     WHERE id IN (${placeholders}) AND status IN ('normal', 'hidden')`,
    [deletedBy, ...ids],
  );
  return result.affectedRows || 0;
}

async function updateComplaint(id, complaintStatus, complaintNote) {
  await db.query(
    'UPDATE product_reviews SET complaint_status = ?, complaint_note = ? WHERE id = ?',
    [complaintStatus, complaintNote ?? null, id],
  );
}

module.exports = {
  countReviews,
  selectReviewsPage,
  selectReviewById,
  selectReviewDetail,
  selectAuditLogsForReview,
  updateReviewStatus,
  updateAdminReply,
  softDeleteReview,
  restoreReview,
  permanentDeleteReview,
  batchUpdateStatus,
  batchSoftDelete,
  updateReviewFeatured,
  updateComplaint,
};




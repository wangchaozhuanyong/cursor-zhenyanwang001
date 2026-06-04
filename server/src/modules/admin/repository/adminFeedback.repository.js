const db = require('../../../config/db');

function buildFeedbackWhere(filters = {}) {
  let where = 'WHERE 1=1';
  const params = [];

  if (filters.status && filters.status !== 'all') {
    where += ' AND f.status = ?';
    params.push(filters.status);
  }
  if (filters.type && filters.type !== 'all') {
    where += ' AND f.type = ?';
    params.push(filters.type);
  }
  if (filters.userId) {
    where += ' AND f.user_id = ?';
    params.push(filters.userId);
  }
  if (filters.keyword) {
    where += ` AND (
      f.title LIKE ? OR f.content LIKE ? OR f.contact LIKE ? OR f.order_no LIKE ?
      OR u.nickname LIKE ? OR u.phone LIKE ?
    )`;
    const keyword = `%${filters.keyword}%`;
    params.push(keyword, keyword, keyword, keyword, keyword, keyword);
  }
  if (filters.dateFrom) {
    where += ' AND f.created_at >= ?';
    params.push(filters.dateFrom);
  }
  if (filters.dateTo) {
    where += ' AND f.created_at < DATE_ADD(?, INTERVAL 1 DAY)';
    params.push(filters.dateTo);
  }

  return { where, params };
}

async function countFeedback(filters) {
  const { where, params } = buildFeedbackWhere(filters);
  const [[{ total }]] = await db.query(
    `SELECT COUNT(*) AS total
       FROM user_feedback f
       LEFT JOIN users u ON u.id = f.user_id
      ${where}`,
    params,
  );
  return total;
}

async function selectFeedbackPage(filters, pageSize, offset) {
  const { where, params } = buildFeedbackWhere(filters);
  const [rows] = await db.query(
    `SELECT f.*,
            u.nickname AS user_nickname,
            u.phone AS user_phone,
            h.nickname AS handler_name
       FROM user_feedback f
       LEFT JOIN users u ON u.id = f.user_id
       LEFT JOIN users h ON h.id = f.handled_by
      ${where}
      ORDER BY f.created_at DESC
      LIMIT ? OFFSET ?`,
    [...params, pageSize, offset],
  );
  return rows;
}

async function selectFeedbackById(id) {
  const [[row]] = await db.query(
    `SELECT f.*,
            u.nickname AS user_nickname,
            u.phone AS user_phone,
            h.nickname AS handler_name
       FROM user_feedback f
       LEFT JOIN users u ON u.id = f.user_id
       LEFT JOIN users h ON h.id = f.handled_by
      WHERE f.id = ?
      LIMIT 1`,
    [id],
  );
  return row || null;
}

async function updateFeedback(id, patch) {
  const sets = [];
  const params = [];

  if (patch.status !== undefined) {
    sets.push('status = ?');
    params.push(patch.status);
  }
  if (patch.handler_note !== undefined) {
    sets.push('handler_note = ?');
    params.push(patch.handler_note || null);
  }
  sets.push('handled_by = ?');
  params.push(patch.handled_by || null);
  sets.push('handled_at = NOW()');

  await db.query(
    `UPDATE user_feedback
        SET ${sets.join(', ')}
      WHERE id = ?`,
    [...params, id],
  );
}

module.exports = {
  countFeedback,
  selectFeedbackPage,
  selectFeedbackById,
  updateFeedback,
};

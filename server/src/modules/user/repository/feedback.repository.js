const db = require('../../../config/db');

async function insertFeedback(record) {
  await db.query(
    `INSERT INTO user_feedback (
       id, user_id, type, title, content, contact, order_no, page_url,
       source_ip, user_agent
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      record.id,
      record.user_id || null,
      record.type,
      record.title || '',
      record.content,
      record.contact || '',
      record.order_no || '',
      record.page_url || '',
      record.source_ip || '',
      record.user_agent || '',
    ],
  );
}

async function countFeedbackByUserId(userId) {
  const [[{ total }]] = await db.query(
    'SELECT COUNT(*) AS total FROM user_feedback WHERE user_id = ?',
    [userId],
  );
  return total;
}

async function selectFeedbackByUserId(userId, pageSize, offset) {
  const [rows] = await db.query(
    `SELECT id, user_id, type, title, content, contact, order_no, page_url,
            status, handler_note, handled_at, created_at, updated_at
       FROM user_feedback
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?`,
    [userId, pageSize, offset],
  );
  return rows;
}

module.exports = {
  countFeedbackByUserId,
  insertFeedback,
  selectFeedbackByUserId,
};

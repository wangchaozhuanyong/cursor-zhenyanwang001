const db = require('../../config/db');

function buildBatchWhere(query) {
  let where = 'WHERE deleted_at IS NULL';
  const params = [];
  if (query.type) {
    where += ' AND type = ?';
    params.push(query.type);
  }
  if (query.send_status) {
    where += ' AND send_status = ?';
    params.push(query.send_status);
  }
  if (query.workflow_status) {
    where += ' AND workflow_status = ?';
    params.push(query.workflow_status);
  }
  if (query.audience_type) {
    where += ' AND audience_type = ?';
    params.push(query.audience_type);
  }
  if (query.keyword) {
    where += ' AND (title LIKE ? OR content LIKE ?)';
    const kw = `%${query.keyword}%`;
    params.push(kw, kw);
  }
  return { where, params };
}

async function countNotificationBatches(where, params) {
  const [[{ total }]] = await db.query(
    `SELECT COUNT(*) AS total
       FROM (
         SELECT COALESCE(batch_id, id) AS batch_key
           FROM notifications
           ${where}
          GROUP BY batch_key
       ) t`,
    params,
  );
  return total;
}

async function selectNotificationBatchesPage(where, params, pageSize, offset) {
  const [rows] = await db.query(
    `SELECT
      COALESCE(batch_id, id) AS batch_id,
      COALESCE(batch_id, id) AS id,
      MAX(type) AS type,
      MAX(title) AS title,
      MAX(content) AS content,
      MAX(audience_type) AS audience_type,
      MAX(audience_value) AS audience_value,
      MAX(send_status) AS send_status,
      MAX(workflow_status) AS workflow_status,
      MAX(template_code) AS template_code,
      MAX(link_url) AS link_url,
      MAX(publish_status) AS publish_status,
      MAX(scheduled_at) AS scheduled_at,
      MAX(sent_at) AS sent_at,
      MAX(created_at) AS created_at,
      COUNT(*) AS recipient_count,
      SUM(CASE WHEN is_read = 1 THEN 1 ELSE 0 END) AS read_count
     FROM notifications
     ${where}
     GROUP BY COALESCE(batch_id, id)
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, pageSize, offset],
  );
  return rows;
}

async function insertNotification({
  id, batchId, userId, type, title, content, audienceType, audienceValue, sendStatus, scheduledAt, sentAt, workflowStatus, templateCode, linkUrl, publishStatus,
}) {
  await db.query(
    `INSERT INTO notifications
      (id, batch_id, user_id, type, title, content, audience_type, audience_value, publish_status, send_status, workflow_status, template_code, link_url, scheduled_at, sent_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [id, batchId || null, userId, type, title, content, audienceType, audienceValue || null, publishStatus || 'published', sendStatus, workflowStatus || 'published', templateCode || null, linkUrl || null, scheduledAt || null, sentAt || null],
  );
}

async function selectAllUserIds() {
  const [users] = await db.query('SELECT id FROM users');
  return users.map((u) => u.id);
}

async function markBatchDeleted(batchId) {
  await db.query(
    `UPDATE notifications
        SET deleted_at = NOW(),
            send_status = 'cancelled',
            publish_status = 'archived',
            workflow_status = 'cancelled',
            last_modified_at = NOW()
      WHERE COALESCE(batch_id, id) = ? AND deleted_at IS NULL`,
    [batchId],
  );
}

async function publishBatch(batchId, sendStatus, scheduledAt, sentAt) {
  await db.query(
    `UPDATE notifications
        SET publish_status = 'published',
            workflow_status = 'published',
            send_status = ?,
            scheduled_at = ?,
            sent_at = ?
      WHERE COALESCE(batch_id, id) = ? AND deleted_at IS NULL`,
    [sendStatus, scheduledAt || null, sentAt || null, batchId],
  );
}

async function dispatchDueScheduledNotifications() {
  const [result] = await db.query(
    `UPDATE notifications
        SET send_status = 'sent',
            sent_at = NOW(),
            workflow_status = 'published'
      WHERE deleted_at IS NULL
        AND publish_status = 'published'
        AND send_status = 'scheduled'
        AND scheduled_at IS NOT NULL
        AND scheduled_at <= NOW()`,
  );
  return result.affectedRows || 0;
}

module.exports = {
  buildBatchWhere,
  countNotificationBatches,
  selectNotificationBatchesPage,
  insertNotification,
  selectAllUserIds,
  markBatchDeleted,
  publishBatch,
  dispatchDueScheduledNotifications,
};

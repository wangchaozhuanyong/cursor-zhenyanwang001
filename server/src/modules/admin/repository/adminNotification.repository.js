const db = require('../../../config/db');

function buildBatchWhere(query) {
  let where = 'WHERE b.deleted_at IS NULL';
  const params = [];
  if (query.type) {
    where += ' AND b.type = ?';
    params.push(query.type);
  }
  if (query.send_status) {
    where += ' AND b.send_status = ?';
    params.push(query.send_status);
  }
  if (query.workflow_status) {
    where += ' AND b.workflow_status = ?';
    params.push(query.workflow_status);
  }
  if (query.audience_type) {
    where += ' AND b.audience_type = ?';
    params.push(query.audience_type);
  }
  if (query.keyword) {
    where += ' AND (b.title LIKE ? OR b.content LIKE ?)';
    const kw = `%${query.keyword}%`;
    params.push(kw, kw);
  }
  return { where, params };
}

async function countNotificationBatches(where, params) {
  const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM notification_batches b ${where}`, params);
  return Number(total || 0);
}

async function selectNotificationBatchesPage(where, params, pageSize, offset) {
  const [rows] = await db.query(
    `SELECT
      b.id AS batch_id,
      b.id,
      b.type,
      b.title,
      b.content,
      b.audience_type,
      b.audience_value,
      b.send_status,
      b.workflow_status,
      b.template_code,
      b.link_url,
      b.scheduled_at,
      b.sent_at,
      b.created_at,
      b.updated_at,
      b.created_by,
      COALESCE(ns.recipient_count, 0) AS recipient_count,
      COALESCE(ns.read_count, 0) AS read_count
     FROM notification_batches b
     LEFT JOIN (
       SELECT batch_id, COUNT(*) AS recipient_count, SUM(CASE WHEN is_read = 1 THEN 1 ELSE 0 END) AS read_count
       FROM notifications
       WHERE deleted_at IS NULL
       GROUP BY batch_id
     ) ns ON ns.batch_id = b.id
     ${where}
     ORDER BY b.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, pageSize, offset],
  );
  return rows;
}

async function selectSummary() {
  const [[row]] = await db.query(
    `SELECT
      COUNT(*) AS totalBatches,
      SUM(CASE WHEN workflow_status = 'draft' THEN 1 ELSE 0 END) AS draftCount,
      SUM(CASE WHEN send_status = 'scheduled' THEN 1 ELSE 0 END) AS scheduledCount,
      SUM(CASE WHEN send_status = 'sent' THEN 1 ELSE 0 END) AS sentCount,
      SUM(CASE WHEN send_status = 'cancelled' OR workflow_status = 'cancelled' THEN 1 ELSE 0 END) AS cancelledCount
     FROM notification_batches
     WHERE deleted_at IS NULL`,
  );

  const [[agg]] = await db.query(
    `SELECT COUNT(*) AS totalRecipients, SUM(CASE WHEN is_read = 1 THEN 1 ELSE 0 END) AS totalRead
     FROM notifications
     WHERE deleted_at IS NULL`,
  );

  const totalRecipients = Number(agg?.totalRecipients || 0);
  const totalRead = Number(agg?.totalRead || 0);
  return {
    totalBatches: Number(row?.totalBatches || 0),
    draftCount: Number(row?.draftCount || 0),
    scheduledCount: Number(row?.scheduledCount || 0),
    sentCount: Number(row?.sentCount || 0),
    cancelledCount: Number(row?.cancelledCount || 0),
    totalRecipients,
    totalRead,
    readRate: totalRecipients > 0 ? Number((totalRead / totalRecipients).toFixed(4)) : 0,
  };
}

async function insertBatch(payload) {
  await db.query(
    `INSERT INTO notification_batches
      (id, title, content, type, audience_type, audience_value, link_url, template_code, send_status, workflow_status, scheduled_at, sent_at, created_by)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      payload.id,
      payload.title,
      payload.content,
      payload.type,
      payload.audienceType,
      payload.audienceValue || null,
      payload.linkUrl || null,
      payload.templateCode || null,
      payload.sendStatus,
      payload.workflowStatus,
      payload.scheduledAt || null,
      payload.sentAt || null,
      payload.createdBy || null,
    ],
  );
}

async function updateBatch(batchId, fields) {
  const sets = [];
  const params = [];
  for (const [k, v] of Object.entries(fields || {})) {
    sets.push(`${k} = ?`);
    params.push(v);
  }
  if (!sets.length) return;
  sets.push('updated_at = NOW()');
  params.push(batchId);
  await db.query(`UPDATE notification_batches SET ${sets.join(', ')} WHERE id = ? AND deleted_at IS NULL`, params);
}

async function insertNotificationsForBatch(batch, userIds) {
  if (!userIds.length) return;
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    for (const uid of userIds) {
      await conn.query(
        `INSERT INTO notifications
          (id, batch_id, user_id, type, title, content, audience_type, audience_value, publish_status, send_status, workflow_status, template_code, link_url, scheduled_at, sent_at)
         VALUES (UUID(),?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          batch.id,
          uid,
          batch.type,
          batch.title,
          batch.content,
          batch.audience_type,
          batch.audience_value || null,
          'published',
          batch.send_status,
          batch.workflow_status,
          batch.template_code || null,
          batch.link_url || null,
          batch.scheduled_at || null,
          batch.sent_at || null,
        ],
      );
    }
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

async function findValidUserById(userId) {
  const [[row]] = await db.query(
    `SELECT id, nickname, phone, whatsapp
     FROM users
     WHERE id = ?
       AND deleted_at IS NULL
       AND (account_status IS NULL OR account_status = 'normal')
     LIMIT 1`,
    [userId],
  );
  return row || null;
}

async function searchUserCandidates(keyword, limit = 20) {
  const kw = `%${String(keyword || '').trim()}%`;
  const [rows] = await db.query(
    `SELECT id, nickname, phone, whatsapp
     FROM users
     WHERE deleted_at IS NULL
       AND (account_status IS NULL OR account_status = 'normal')
       AND (
         id LIKE ? OR nickname LIKE ? OR phone LIKE ? OR whatsapp LIKE ?
       )
     ORDER BY created_at DESC
     LIMIT ?`,
    [kw, kw, kw, kw, Number(limit) || 20],
  );
  return rows;
}

async function selectAllUserIds() {
  const [users] = await db.query(
    `SELECT id
     FROM users
     WHERE deleted_at IS NULL
       AND (account_status IS NULL OR account_status = 'normal')`,
  );
  return users.map((u) => u.id);
}

async function selectBatchById(batchId) {
  const [[row]] = await db.query('SELECT * FROM notification_batches WHERE id = ? AND deleted_at IS NULL LIMIT 1', [batchId]);
  return row || null;
}

async function selectBatchStats(batchId) {
  const [[row]] = await db.query(
    `SELECT COUNT(*) AS recipient_count, SUM(CASE WHEN is_read = 1 THEN 1 ELSE 0 END) AS read_count
     FROM notifications
     WHERE batch_id = ? AND deleted_at IS NULL`,
    [batchId],
  );
  return {
    recipient_count: Number(row?.recipient_count || 0),
    read_count: Number(row?.read_count || 0),
  };
}

/** @param {string} batchId @param {{ readStatus?: string; page?: number; pageSize?: number }} [query] */
async function selectBatchRecipients(batchId, { readStatus, page = 1, pageSize = 20 } = {}) {
  let where = 'WHERE n.batch_id = ? AND n.deleted_at IS NULL';
  const params = [batchId];
  if (readStatus === 'read') where += ' AND n.is_read = 1';
  if (readStatus === 'unread') where += ' AND n.is_read = 0';
  const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM notifications n ${where}`, params);
  const offset = (Math.max(1, Number(page) || 1) - 1) * Math.max(1, Number(pageSize) || 20);
  const [list] = await db.query(
    `SELECT n.id, n.user_id, n.is_read, n.created_at, n.sent_at, n.scheduled_at, u.nickname, u.phone, u.whatsapp
       FROM notifications n
       LEFT JOIN users u ON u.id = n.user_id
      ${where}
      ORDER BY n.created_at DESC
      LIMIT ? OFFSET ?`,
    [...params, Math.max(1, Number(pageSize) || 20), offset],
  );
  return { list, total: Number(total || 0), page: Math.max(1, Number(page) || 1), pageSize: Math.max(1, Number(pageSize) || 20) };
}

async function selectBatchAuditLogs(batchId, limit = 100) {
  const [rows] = await db.query(
    `SELECT id, operator_id, operator_name, action_type, summary, result, created_at
       FROM audit_logs
      WHERE object_type = 'notification_batch' AND object_id = ?
      ORDER BY created_at DESC
      LIMIT ?`,
    [batchId, Math.max(1, Number(limit) || 100)],
  );
  return rows;
}

async function selectBatchRecipientsForExport(batchId, readStatus) {
  let where = 'WHERE n.batch_id = ? AND n.deleted_at IS NULL';
  const params = [batchId];
  if (readStatus === 'read') where += ' AND n.is_read = 1';
  if (readStatus === 'unread') where += ' AND n.is_read = 0';
  const [rows] = await db.query(
    `SELECT n.user_id, n.is_read, n.created_at, n.sent_at, u.nickname, u.phone, u.whatsapp
       FROM notifications n
       LEFT JOIN users u ON u.id = n.user_id
      ${where}
      ORDER BY n.created_at DESC`,
    params,
  );
  return rows;
}

/** @param {{ audienceType: string; audienceValue?: string|null; userId?: string|null; userIds?: string[] }} params */
async function selectUsersByAudience({ audienceType, audienceValue, userId, userIds }) {
  if (audienceType === 'single') {
    const id = userId || audienceValue;
    if (!id) return [];
    return (await selectUsersByAudience({ audienceType: 'specific', userIds: [id] }));
  }
  if (audienceType === 'specific') {
    const ids = Array.isArray(userIds) ? userIds.filter(Boolean) : [];
    if (!ids.length) return [];
    const placeholders = ids.map(() => '?').join(',');
    const [rows] = await db.query(
      `SELECT id
         FROM users
        WHERE id IN (${placeholders})
          AND deleted_at IS NULL
          AND (account_status IS NULL OR account_status = 'normal')`,
      ids,
    );
    return rows.map((r) => r.id);
  }
  if (audienceType === 'user_tag') {
    if (!audienceValue) return [];
    const [rows] = await db.query(
      `SELECT u.id
         FROM users u
         JOIN user_tag_assignments uta ON uta.user_id = u.id
        WHERE uta.tag_id = ?
          AND u.deleted_at IS NULL
          AND (u.account_status IS NULL OR u.account_status = 'normal')`,
      [audienceValue],
    );
    return rows.map((r) => r.id);
  }
  if (audienceType === 'member_level') {
    if (!audienceValue) return [];
    const [rows] = await db.query(
      `SELECT id
         FROM users
        WHERE member_level_id = ?
          AND deleted_at IS NULL
          AND (account_status IS NULL OR account_status = 'normal')`,
      [audienceValue],
    );
    return rows.map((r) => r.id);
  }
  if (audienceType === 'has_order') {
    const [rows] = await db.query(
      `SELECT DISTINCT u.id
         FROM users u
         JOIN orders o ON o.user_id = u.id
        WHERE u.deleted_at IS NULL
          AND (u.account_status IS NULL OR u.account_status = 'normal')`,
    );
    return rows.map((r) => r.id);
  }
  if (audienceType === 'no_order') {
    const [rows] = await db.query(
      `SELECT u.id
         FROM users u
        WHERE u.deleted_at IS NULL
          AND (u.account_status IS NULL OR u.account_status = 'normal')
          AND NOT EXISTS (SELECT 1 FROM orders o WHERE o.user_id = u.id)`,
    );
    return rows.map((r) => r.id);
  }
  return selectAllUserIds();
}

async function resolveUsersByIdentifiers(identifiers) {
  const values = Array.isArray(identifiers) ? identifiers.map((x) => String(x || '').trim()).filter(Boolean) : [];
  if (!values.length) return [];
  const placeholders = values.map(() => '?').join(',');
  const [rows] = await db.query(
    `SELECT id, nickname, phone, whatsapp
       FROM users
      WHERE deleted_at IS NULL
        AND (account_status IS NULL OR account_status = 'normal')
        AND (id IN (${placeholders}) OR phone IN (${placeholders}))`,
    [...values, ...values],
  );
  return rows;
}

async function markBatchDeleted(batchId) {
  await db.query('UPDATE notification_batches SET deleted_at = NOW(), updated_at = NOW() WHERE id = ? AND deleted_at IS NULL', [batchId]);
  await db.query('UPDATE notifications SET deleted_at = NOW() WHERE batch_id = ? AND deleted_at IS NULL', [batchId]);
}

async function cancelScheduledBatch(batchId) {
  await updateBatch(batchId, { send_status: 'cancelled', workflow_status: 'cancelled' });
  await db.query(
    `UPDATE notifications
       SET send_status = 'cancelled', workflow_status = 'cancelled', deleted_at = NOW()
     WHERE batch_id = ? AND deleted_at IS NULL`,
    [batchId],
  );
}

async function revokeSentBatch(batchId) {
  await updateBatch(batchId, { send_status: 'cancelled', workflow_status: 'cancelled' });
  await db.query(
    `UPDATE notifications
       SET send_status = 'cancelled', workflow_status = 'cancelled', deleted_at = NOW()
     WHERE batch_id = ? AND deleted_at IS NULL`,
    [batchId],
  );
}

async function dispatchDueScheduledNotifications() {
  const [batches] = await db.query(
    `SELECT * FROM notification_batches
     WHERE deleted_at IS NULL
       AND send_status = 'scheduled'
       AND workflow_status = 'published'
       AND scheduled_at IS NOT NULL
       AND scheduled_at <= NOW()`,
  );

  for (const b of batches) {
    const [rows] = await db.query('SELECT COUNT(*) AS total FROM notifications WHERE batch_id = ? AND deleted_at IS NULL', [b.id]);
    const existing = Number(rows?.[0]?.total || 0);
    if (existing <= 0) {
      // If no recipient records were generated yet (new model), skip here and let explicit publish/create handle recipients.
      continue;
    }
    await db.query(
      `UPDATE notifications
          SET send_status = 'sent', sent_at = NOW(), workflow_status = 'published'
        WHERE batch_id = ? AND deleted_at IS NULL AND send_status = 'scheduled'`,
      [b.id],
    );
    await updateBatch(b.id, { send_status: 'sent', sent_at: new Date(), workflow_status: 'published' });
  }

  return batches.length;
}

async function insertNotification(payload) {
  await db.query(
    `INSERT IGNORE INTO notification_batches
      (id, title, content, type, audience_type, audience_value, link_url, template_code, send_status, workflow_status, scheduled_at, sent_at, created_by)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      payload.batchId,
      payload.title || '',
      payload.content || '',
      payload.type || 'system',
      payload.audienceType || 'all',
      payload.audienceValue || null,
      payload.linkUrl || null,
      payload.templateCode || null,
      payload.sendStatus || 'draft',
      payload.workflowStatus || 'draft',
      payload.scheduledAt || null,
      payload.sentAt || null,
      null,
    ],
  );
  await db.query(
    `INSERT INTO notifications
      (id, batch_id, user_id, type, title, content, audience_type, audience_value, publish_status, send_status, workflow_status, template_code, link_url, scheduled_at, sent_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      payload.id,
      payload.batchId,
      payload.userId,
      payload.type || 'system',
      payload.title || '',
      payload.content || '',
      payload.audienceType || 'all',
      payload.audienceValue || null,
      payload.publishStatus || 'published',
      payload.sendStatus || 'sent',
      payload.workflowStatus || 'published',
      payload.templateCode || null,
      payload.linkUrl || null,
      payload.scheduledAt || null,
      payload.sentAt || null,
    ],
  );
}

async function publishBatch(batchId, sendStatus, scheduledAt, sentAt) {
  await updateBatch(batchId, {
    send_status: sendStatus,
    workflow_status: 'published',
    scheduled_at: scheduledAt || null,
    sent_at: sentAt || null,
  });
  await db.query(
    `UPDATE notifications
       SET send_status = ?, workflow_status = 'published', scheduled_at = ?, sent_at = ?, publish_status = 'published'
     WHERE batch_id = ? AND deleted_at IS NULL`,
    [sendStatus, scheduledAt || null, sentAt || null, batchId],
  );
}

module.exports = {
  buildBatchWhere,
  countNotificationBatches,
  selectNotificationBatchesPage,
  selectSummary,
  insertBatch,
  updateBatch,
  insertNotificationsForBatch,
  findValidUserById,
  searchUserCandidates,
  selectAllUserIds,
  selectUsersByAudience,
  resolveUsersByIdentifiers,
  selectBatchById,
  selectBatchStats,
  selectBatchRecipients,
  selectBatchAuditLogs,
  selectBatchRecipientsForExport,
  markBatchDeleted,
  cancelScheduledBatch,
  revokeSentBatch,
  dispatchDueScheduledNotifications,
  insertNotification,
  publishBatch,
};




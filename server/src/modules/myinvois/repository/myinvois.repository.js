const db = require('../../../config/db');

function getPool() {
  return db;
}

async function getConnection() {
  return db.getConnection();
}

async function selectActiveProfile(q) {
  const [[row]] = await q.query(
    `SELECT * FROM myinvois_profiles
     WHERE enabled = 1
     ORDER BY updated_at DESC
     LIMIT 1`,
  );
  return row || null;
}

async function selectProfile(q) {
  const [[row]] = await q.query(
    `SELECT * FROM myinvois_profiles
     ORDER BY enabled DESC, updated_at DESC
     LIMIT 1`,
  );
  return row || null;
}

async function upsertProfile(q, id, body) {
  await q.query(
    `INSERT INTO myinvois_profiles
       (id, enabled, environment, supplier_tin, supplier_name, supplier_id_type,
        supplier_id_value, supplier_sst, supplier_email, supplier_phone,
        supplier_address_json, client_id, client_secret_ref, certificate_ref,
        certificate_fingerprint, certificate_expires_at, signing_key_ref, config_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       enabled = VALUES(enabled),
       environment = VALUES(environment),
       supplier_tin = VALUES(supplier_tin),
       supplier_name = VALUES(supplier_name),
       supplier_id_type = VALUES(supplier_id_type),
       supplier_id_value = VALUES(supplier_id_value),
       supplier_sst = VALUES(supplier_sst),
       supplier_email = VALUES(supplier_email),
       supplier_phone = VALUES(supplier_phone),
       supplier_address_json = VALUES(supplier_address_json),
       client_id = VALUES(client_id),
       client_secret_ref = VALUES(client_secret_ref),
       certificate_ref = VALUES(certificate_ref),
       certificate_fingerprint = VALUES(certificate_fingerprint),
       certificate_expires_at = VALUES(certificate_expires_at),
       signing_key_ref = VALUES(signing_key_ref),
       config_json = VALUES(config_json)`,
    [
      id,
      body.enabled ? 1 : 0,
      body.environment || 'sandbox',
      body.supplier_tin || '',
      body.supplier_name || '',
      body.supplier_id_type || '',
      body.supplier_id_value || '',
      body.supplier_sst || '',
      body.supplier_email || '',
      body.supplier_phone || '',
      JSON.stringify(body.supplier_address || {}),
      body.client_id || '',
      body.client_secret_ref || '',
      body.certificate_ref || '',
      body.certificate_fingerprint || '',
      body.certificate_expires_at || null,
      body.signing_key_ref || '',
      JSON.stringify(body.config_json || {}),
    ],
  );
}

async function selectOrderSnapshot(q, orderId) {
  const [[order]] = await q.query(
    `SELECT o.*, u.email AS user_email, u.phone AS user_phone, u.name AS user_name
     FROM orders o
     LEFT JOIN users u ON u.id = o.user_id
     WHERE o.id = ?`,
    [orderId],
  );
  if (!order) return null;
  const [items] = await q.query(
    `SELECT id, product_id, product_name, price, qty
     FROM order_items
     WHERE order_id = ?
     ORDER BY id`,
    [orderId],
  );
  return { order, items };
}

async function selectReturnSnapshot(q, returnId) {
  const [[ret]] = await q.query('SELECT * FROM return_requests WHERE id = ?', [returnId]);
  if (!ret) return null;
  const orderSnapshot = await selectOrderSnapshot(q, ret.order_id);
  if (!orderSnapshot) return null;
  return { returnRequest: ret, ...orderSnapshot };
}

async function insertDocumentIfAbsent(q, params) {
  const [result] = await q.query(
    `INSERT IGNORE INTO myinvois_documents
       (id, profile_id, document_type, source_type, source_id, order_id, order_no,
        user_id, currency, amount, status, next_attempt_at, payload_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'queued', NOW(), ?)`,
    [
      params.id,
      params.profileId,
      params.documentType,
      params.sourceType,
      params.sourceId,
      params.orderId,
      params.orderNo || '',
      params.userId || null,
      params.currency || 'MYR',
      params.amount || 0,
      JSON.stringify(params.payload || {}),
    ],
  );
  return result.affectedRows > 0;
}

async function countDocuments(q, filters) {
  const { where, params } = buildDocumentWhere(filters);
  const [[row]] = await q.query(`SELECT COUNT(*) AS total FROM myinvois_documents ${where}`, params);
  return Number(row?.total || 0);
}

async function listDocuments(q, filters) {
  const { where, params } = buildDocumentWhere(filters);
  const [rows] = await q.query(
    `SELECT id, document_type, source_type, source_id, order_id, order_no, user_id,
            currency, amount, status, retry_count, next_attempt_at,
            lhdn_submission_uid, lhdn_uuid, validation_link, last_error,
            submitted_at, accepted_at, created_at, updated_at
     FROM myinvois_documents
     ${where}
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, filters.pageSize, filters.offset],
  );
  return rows;
}

function buildDocumentWhere(filters) {
  let where = 'WHERE 1=1';
  const params = [];
  if (filters.status) {
    where += ' AND status = ?';
    params.push(filters.status);
  }
  if (filters.documentType) {
    where += ' AND document_type = ?';
    params.push(filters.documentType);
  }
  if (filters.orderId) {
    where += ' AND order_id = ?';
    params.push(filters.orderId);
  }
  return { where, params };
}

async function selectDocumentById(q, id) {
  const [[row]] = await q.query('SELECT * FROM myinvois_documents WHERE id = ?', [id]);
  return row || null;
}

async function selectDueDocuments(q, limit) {
  const [rows] = await q.query(
    `SELECT * FROM myinvois_documents
     WHERE status IN ('queued', 'failed')
       AND (next_attempt_at IS NULL OR next_attempt_at <= NOW())
     ORDER BY created_at ASC
     LIMIT ?`,
    [limit],
  );
  return rows;
}

async function markDocumentReady(q, id, message) {
  await q.query(
    `UPDATE myinvois_documents
     SET status = 'ready', last_error = ?, next_attempt_at = NULL
     WHERE id = ?`,
    [message || '', id],
  );
}

async function markDocumentSubmitted(q, id, result) {
  await q.query(
    `UPDATE myinvois_documents
     SET status = ?,
         lhdn_submission_uid = ?,
         lhdn_uuid = ?,
         validation_link = ?,
         response_json = ?,
         last_error = '',
         submitted_at = COALESCE(submitted_at, NOW()),
         accepted_at = ?,
         next_attempt_at = NULL
     WHERE id = ?`,
    [
      result.status || 'submitted',
      result.submissionUid || '',
      result.uuid || '',
      result.validationLink || '',
      JSON.stringify(result.raw || {}),
      result.status === 'accepted' ? new Date() : null,
      id,
    ],
  );
}

async function markDocumentFailed(q, id, errorMessage, retryDelayMinutes) {
  await q.query(
    `UPDATE myinvois_documents
     SET status = 'failed',
         retry_count = retry_count + 1,
         last_error = ?,
         next_attempt_at = DATE_ADD(NOW(), INTERVAL ? MINUTE)
     WHERE id = ?`,
    [String(errorMessage || '').slice(0, 1024), retryDelayMinutes, id],
  );
}

async function resetDocumentForRetry(q, id) {
  await q.query(
    `UPDATE myinvois_documents
     SET status = 'queued', next_attempt_at = NOW(), last_error = ''
     WHERE id = ?`,
    [id],
  );
}

async function insertEvent(q, params) {
  await q.query(
    `INSERT INTO myinvois_events
       (id, document_id, event_type, status, payload_json, error_message)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      params.id,
      params.documentId || null,
      params.eventType,
      params.status || '',
      JSON.stringify(params.payload || {}),
      String(params.errorMessage || '').slice(0, 1024),
    ],
  );
}

async function aggregateDocumentsByDate(q, reconcileDate, documentType) {
  const params = [reconcileDate];
  let typeClause = '';
  if (documentType) {
    typeClause = 'AND document_type = ?';
    params.push(documentType);
  }
  const [[row]] = await q.query(
    `SELECT
       SUM(status IN ('queued', 'ready')) AS queued_count,
       SUM(status = 'submitted') AS submitted_count,
       SUM(status = 'accepted') AS accepted_count,
       SUM(status = 'failed') AS failed_count,
       COALESCE(SUM(amount), 0) AS total_amount
     FROM myinvois_documents
     WHERE DATE(created_at) = ? ${typeClause}`,
    params,
  );
  return row || {};
}

async function insertReconciliation(q, params) {
  await q.query(
    `INSERT INTO myinvois_reconciliations
       (id, reconcile_date, document_type, queued_count, submitted_count,
        accepted_count, failed_count, total_amount, notes, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      params.id,
      params.reconcileDate,
      params.documentType || '',
      params.queuedCount || 0,
      params.submittedCount || 0,
      params.acceptedCount || 0,
      params.failedCount || 0,
      params.totalAmount || 0,
      params.notes || '',
      params.createdBy || null,
    ],
  );
}

module.exports = {
  getPool,
  getConnection,
  selectActiveProfile,
  selectProfile,
  upsertProfile,
  selectOrderSnapshot,
  selectReturnSnapshot,
  insertDocumentIfAbsent,
  countDocuments,
  listDocuments,
  selectDocumentById,
  selectDueDocuments,
  markDocumentReady,
  markDocumentSubmitted,
  markDocumentFailed,
  resetDocumentForRetry,
  insertEvent,
  aggregateDocumentsByDate,
  insertReconciliation,
};

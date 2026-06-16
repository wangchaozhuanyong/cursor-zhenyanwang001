/**
 * 支付域数据访问层：集中处理支付渠道、支付单、事件和对账 SQL。
 */
const db = require('../../../config/db');

function getPool() {
  return db;
}

async function getConnection() {
  return db.getConnection();
}

async function selectChannelsByCountryCurrency(q, countryCode, currency) {
  const [rows] = await q.query(
    `SELECT * FROM payment_channels
     WHERE enabled = 1 AND country_code = ? AND currency = ?
     ORDER BY sort_order ASC, name ASC`,
    [countryCode, currency],
  );
  return rows;
}

async function selectChannelByCode(q, code) {
  const [[row]] = await q.query(
    'SELECT * FROM payment_channels WHERE code = ? AND enabled = 1 LIMIT 1',
    [code],
  );
  return row || null;
}

async function selectAllChannelsAdmin(q) {
  const [rows] = await q.query('SELECT * FROM payment_channels ORDER BY sort_order ASC, name ASC');
  return rows;
}

async function updateChannelAdmin(q, id, fields) {
  const setFragments = [];
  const values = [];
  if (fields.name !== undefined) { setFragments.push('name = ?'); values.push(fields.name); }
  if (fields.enabled !== undefined) { setFragments.push('enabled = ?'); values.push(fields.enabled ? 1 : 0); }
  if (fields.sort_order !== undefined) { setFragments.push('sort_order = ?'); values.push(fields.sort_order); }
  if (fields.environment !== undefined) { setFragments.push('environment = ?'); values.push(fields.environment); }
  if (fields.config_json !== undefined) { setFragments.push('config_json = ?'); values.push(JSON.stringify(fields.config_json)); }
  if (!setFragments.length) return 0;
  values.push(id);
  const [r] = await q.query(`UPDATE payment_channels SET ${setFragments.join(', ')} WHERE id = ?`, values);
  return r.affectedRows;
}

async function insertPaymentOrder(q, row) {
  await q.query(
    `INSERT INTO payment_orders
      (id, user_id, order_id, order_no, channel_id, channel_code, provider, amount, currency, status,
       idempotency_key, payment_transaction_no, payment_time, metadata)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      row.id,
      row.user_id,
      row.order_id,
      row.order_no,
      row.channel_id || null,
      row.channel_code,
      row.provider,
      row.amount,
      row.currency,
      row.status,
      row.idempotency_key || null,
      row.payment_transaction_no || '',
      row.payment_time || null,
      row.metadata ? JSON.stringify(row.metadata) : null,
    ],
  );
}

async function selectPaymentOrderByIdempotency(q, userId, key) {
  if (!key) return null;
  const [[row]] = await q.query(
    'SELECT * FROM payment_orders WHERE user_id = ? AND idempotency_key = ? LIMIT 1',
    [userId, key],
  );
  return row || null;
}

async function selectPaymentOrderByIdAndUser(q, id, userId) {
  const [[row]] = await q.query(
    'SELECT * FROM payment_orders WHERE id = ? AND user_id = ? LIMIT 1',
    [id, userId],
  );
  return row || null;
}

async function selectPaymentOrderByIdForAdmin(q, id) {
  const [[row]] = await q.query('SELECT * FROM payment_orders WHERE id = ? LIMIT 1', [id]);
  return row || null;
}

async function selectPaymentOrderByIdForUpdate(q, id) {
  const [[row]] = await q.query('SELECT * FROM payment_orders WHERE id = ? FOR UPDATE', [id]);
  return row || null;
}

async function updatePaymentOrderPaid(q, id, params) {
  const { payment_transaction_no, payment_time, metadata } = params;
  await q.query(
    `UPDATE payment_orders SET status = 'paid', payment_transaction_no = ?, payment_time = ?,
     metadata = COALESCE(?, metadata), updated_at = NOW() WHERE id = ?`,
    [
      payment_transaction_no || '',
      payment_time || new Date(),
      metadata ? JSON.stringify(metadata) : null,
      id,
    ],
  );
}

async function updatePaymentOrderFailed(q, id, params = {}) {
  const { payment_transaction_no, metadata } = params;
  await q.query(
    `UPDATE payment_orders
     SET status = 'failed',
         payment_transaction_no = COALESCE(NULLIF(?, ''), payment_transaction_no),
         metadata = COALESCE(?, metadata),
         updated_at = NOW()
     WHERE id = ?`,
    [
      payment_transaction_no || '',
      metadata ? JSON.stringify(metadata) : null,
      id,
    ],
  );
}

async function updatePaymentOrderMetadata(q, id, metadata) {
  await q.query(
    'UPDATE payment_orders SET metadata = ?, updated_at = NOW() WHERE id = ?',
    [JSON.stringify(metadata || {}), id],
  );
}

async function insertPaymentEvent(q, row) {
  await q.query(
    `INSERT INTO payment_events
      (id, payment_order_id, order_id, provider, provider_event_id, event_type, verify_status, processing_result,
       payload_json, error_message, failure_reason_code, expected_amount, actual_amount, expected_currency,
       actual_currency, risk_level, review_status, review_note, reviewed_by, reviewed_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      row.id,
      row.payment_order_id || null,
      row.order_id || null,
      row.provider,
      row.provider_event_id || null,
      row.event_type,
      row.verify_status || 'success',
      row.processing_result || 'success',
      row.payload_json ? JSON.stringify(row.payload_json) : null,
      row.error_message || '',
      row.failure_reason_code || '',
      row.expected_amount ?? null,
      row.actual_amount ?? null,
      row.expected_currency || '',
      row.actual_currency || '',
      row.risk_level || '',
      row.review_status || 'pending',
      row.review_note || '',
      row.reviewed_by || null,
      row.reviewed_at || null,
    ],
  );
}

async function insertPaymentFee(q, row) {
  await q.query(
    `INSERT INTO payment_fees (id, payment_order_id, fee_rate_percent, fee_fixed, fee_amount, net_amount)
     VALUES (?,?,?,?,?,?)`,
    [
      row.id,
      row.payment_order_id,
      row.fee_rate_percent ?? 0,
      row.fee_fixed ?? 0,
      row.fee_amount ?? 0,
      row.net_amount ?? 0,
    ],
  );
}

async function insertReconciliation(q, row) {
  await q.query(
    `INSERT INTO payment_reconciliations
      (id, reconcile_date, provider, channel_code, order_count, success_amount, provider_report_amount,
       provider_fee_amount, expected_settlement_amount, diff_amount, provider_reference, difference_reason,
       status, review_status, review_notes, notes, created_by)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      row.id,
      row.reconcile_date,
      row.provider,
      row.channel_code || '',
      row.order_count ?? 0,
      row.success_amount ?? 0,
      row.provider_report_amount ?? null,
      row.provider_fee_amount ?? 0,
      row.expected_settlement_amount ?? 0,
      row.diff_amount ?? 0,
      row.provider_reference || '',
      row.difference_reason || '',
      row.status || 'draft',
      row.review_status || 'pending',
      row.review_notes || '',
      row.notes || '',
      row.created_by || null,
    ],
  );
}

async function listReconciliations(q, {
  page, pageSize, provider = '', status = '', reviewStatus = '',
}) {
  const offset = (page - 1) * pageSize;
  let where = 'WHERE 1=1';
  const params = [];
  if (provider) {
    where += ' AND provider = ?';
    params.push(provider);
  }
  if (status) {
    where += ' AND status = ?';
    params.push(status);
  }
  if (reviewStatus) {
    where += ' AND review_status = ?';
    params.push(reviewStatus);
  }
  const [[{ total }]] = await q.query(`SELECT COUNT(*) AS total FROM payment_reconciliations ${where}`, params);
  const [rows] = await q.query(
    `SELECT * FROM payment_reconciliations ${where}
     ORDER BY reconcile_date DESC, created_at DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, offset],
  );
  return { list: rows, total };
}

async function listPaymentOrdersAdmin(q, filters) {
  const {
    page, pageSize, status, channelCode, keyword, orderId, provider,
  } = filters;
  const offset = (page - 1) * pageSize;
  let where = 'WHERE 1=1';
  const params = [];
  if (status) {
    where += ' AND po.status = ?';
    params.push(status);
  }
  if (channelCode) {
    where += ' AND po.channel_code = ?';
    params.push(channelCode);
  }
  if (provider) {
    where += ' AND po.provider = ?';
    params.push(provider);
  }
  if (orderId) {
    where += ' AND po.order_id = ?';
    params.push(orderId);
  }
  if (keyword) {
    where += ' AND (po.order_no LIKE ? OR po.payment_transaction_no LIKE ?)';
    const k = `%${keyword}%`;
    params.push(k, k);
  }
  const [[{ total }]] = await q.query(
    `SELECT COUNT(*) AS total FROM payment_orders po ${where}`,
    params,
  );
  const [rows] = await q.query(
    `SELECT po.*, o.contact_phone AS buyer_phone,
            (
              SELECT pe.error_message FROM payment_events pe
              WHERE BINARY pe.payment_order_id = BINARY po.id
              ORDER BY pe.created_at DESC LIMIT 1
            ) AS latest_error_message,
            (
              SELECT pe.failure_reason_code FROM payment_events pe
              WHERE BINARY pe.payment_order_id = BINARY po.id
              ORDER BY pe.created_at DESC LIMIT 1
            ) AS latest_failure_reason_code,
            (
              SELECT pe.processing_result FROM payment_events pe
              WHERE BINARY pe.payment_order_id = BINARY po.id
              ORDER BY pe.created_at DESC LIMIT 1
            ) AS latest_processing_result,
            (
              SELECT pe.review_status FROM payment_events pe
              WHERE BINARY pe.payment_order_id = BINARY po.id
              ORDER BY pe.created_at DESC LIMIT 1
            ) AS latest_review_status,
            (
              SELECT pe.created_at FROM payment_events pe
              WHERE BINARY pe.payment_order_id = BINARY po.id
              ORDER BY pe.created_at DESC LIMIT 1
            ) AS latest_event_at
     FROM payment_orders po
     LEFT JOIN orders o ON BINARY o.id = BINARY po.order_id
     ${where}
     ORDER BY po.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, pageSize, offset],
  );
  return { list: rows, total };
}

async function listPaymentEventsAdmin(q, filters) {
  const {
    page, pageSize, provider, orderId, eventType, verifyStatus, processingResult, reviewStatus, keyword,
  } = filters;
  const offset = (page - 1) * pageSize;
  let where = 'WHERE 1=1';
  const params = [];
  if (provider) {
    where += ' AND pe.provider = ?';
    params.push(provider);
  }
  if (orderId) {
    where += ' AND pe.order_id = ?';
    params.push(orderId);
  }
  if (eventType) {
    where += ' AND pe.event_type = ?';
    params.push(eventType);
  }
  if (verifyStatus) {
    where += ' AND pe.verify_status = ?';
    params.push(verifyStatus);
  }
  if (processingResult) {
    where += ' AND pe.processing_result = ?';
    params.push(processingResult);
  }
  if (reviewStatus) {
    where += ' AND pe.review_status = ?';
    params.push(reviewStatus);
  }
  if (keyword) {
    where += ' AND (pe.provider_event_id LIKE ? OR pe.error_message LIKE ? OR pe.failure_reason_code LIKE ?)';
    const k = `%${keyword}%`;
    params.push(k, k, k);
  }
  const [[{ total }]] = await q.query(`SELECT COUNT(*) AS total FROM payment_events pe ${where}`, params);
  const [rows] = await q.query(
    `SELECT pe.* FROM payment_events pe ${where} ORDER BY pe.created_at DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, offset],
  );
  return { list: rows, total };
}

async function selectRefundEventsForReturn(q, orderId, returnId) {
  const refundRefPattern = `return_${returnId}_%`;
  const [rows] = await q.query(
    `SELECT id, payment_order_id, order_id, provider, provider_event_id, event_type,
            verify_status, processing_result, payload_json, error_message, created_at
       FROM payment_events
      WHERE order_id = ?
        AND event_type LIKE 'refund.%'
        AND (
          provider_event_id LIKE ?
          OR JSON_UNQUOTE(JSON_EXTRACT(payload_json, '$.refund_reference')) LIKE ?
        )
      ORDER BY created_at DESC`,
    [orderId, refundRefPattern, refundRefPattern],
  );
  return rows;
}

async function aggregatePaidByDay(q, reconcileDate, provider) {
  return aggregatePaidByDayAndChannel(q, reconcileDate, provider, '');
}

async function aggregatePaidByDayAndChannel(q, reconcileDate, provider, channelCode = '') {
  const params = [provider, reconcileDate];
  let channelWhere = '';
  if (channelCode) {
    channelWhere = ' AND po.channel_code = ?';
    params.push(channelCode);
  }
  const [[row]] = await q.query(
    `SELECT COUNT(DISTINCT po.id) AS order_count,
            COALESCE(SUM(po.amount),0) AS success_amount,
            COALESCE(SUM(pf.fee_amount),0) AS provider_fee_amount,
            COALESCE(SUM(pf.net_amount),0) AS net_amount
     FROM payment_orders po
     LEFT JOIN payment_fees pf ON BINARY pf.payment_order_id = BINARY po.id
     WHERE po.status = 'paid' AND po.provider = ?
     AND DATE(COALESCE(po.payment_time, po.created_at)) = ?${channelWhere}`,
    params,
  );
  return row;
}

async function selectLatestPendingStripePaymentOrderIdByOrderId(q, orderId) {
  const [[row]] = await q.query(
    `SELECT id FROM payment_orders
     WHERE order_id = ? AND provider = 'stripe' AND status = 'pending'
     ORDER BY created_at DESC LIMIT 1`,
    [orderId],
  );
  return row?.id || null;
}

async function selectLatestPendingPaymentOrderId(q, { orderId, provider, channelCode }) {
  const params = [orderId];
  let where = "WHERE order_id = ? AND status = 'pending'";
  if (provider) {
    where += ' AND provider = ?';
    params.push(provider);
  }
  if (channelCode) {
    where += ' AND channel_code = ?';
    params.push(channelCode);
  }
  const [[row]] = await q.query(
    `SELECT id FROM payment_orders ${where} ORDER BY created_at DESC LIMIT 1`,
    params,
  );
  return row?.id || null;
}

async function insertAnalyticsEvent(q, row) {
  const dedupeKey = String(row.dedupe_key || '').trim();
  let keyword = String(row.keyword || '').trim();
  if (!keyword && row.event_type === 'payment_success' && row.order_id) {
    const [[submitEvent]] = await q.query(
      `SELECT keyword FROM analytics_events
       WHERE order_id = ? AND event_type = 'order_submit' AND keyword <> ''
       ORDER BY created_at DESC LIMIT 1`,
      [row.order_id],
    );
    keyword = String(submitEvent?.keyword || '').trim();
  }
  await q.query(
    `INSERT INTO analytics_events
      (user_id, anonymous_id, session_id, dedupe_key, event_type, module, page, product_id, variant_id, category_id, activity_id, coupon_id, keyword, order_id, amount, quantity, device, referrer, ip_hash, user_agent)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
     ON DUPLICATE KEY UPDATE id=id`,
    [
      row.user_id || null,
      row.anonymous_id || '',
      row.session_id || '',
      dedupeKey || null,
      row.event_type,
      row.module || '',
      row.page || '',
      row.product_id || null,
      row.variant_id || null,
      row.category_id || null,
      row.activity_id || null,
      row.coupon_id || null,
      keyword,
      row.order_id || null,
      row.amount ?? null,
      row.quantity ?? null,
      row.device || 'server',
      row.referrer || '',
      row.ip_hash || '',
      row.user_agent || 'server',
    ],
  );
}

async function selectPaymentEventById(q, eventId) {
  const [[row]] = await q.query('SELECT * FROM payment_events WHERE id = ? LIMIT 1', [eventId]);
  return row || null;
}

async function selectPaymentEventByIdForUpdate(q, eventId) {
  const [[row]] = await q.query('SELECT * FROM payment_events WHERE id = ? FOR UPDATE', [eventId]);
  return row || null;
}

async function updatePaymentEventReview(q, eventId, row) {
  const [result] = await q.query(
    `UPDATE payment_events
        SET review_status = ?, review_note = ?, reviewed_by = ?, reviewed_at = NOW()
      WHERE id = ?`,
    [
      row.review_status,
      row.review_note || '',
      row.reviewed_by || null,
      eventId,
    ],
  );
  return result.affectedRows;
}

async function selectPaymentEventByProviderEventId(q, provider, providerEventId) {
  const [[row]] = await q.query(
    'SELECT * FROM payment_events WHERE provider = ? AND provider_event_id = ? LIMIT 1',
    [provider, providerEventId],
  );
  return row || null;
}

async function selectReconciliationByIdForUpdate(q, id) {
  const [[row]] = await q.query('SELECT * FROM payment_reconciliations WHERE id = ? FOR UPDATE', [id]);
  return row || null;
}

async function updateReconciliationReview(q, id, row) {
  const [result] = await q.query(
    `UPDATE payment_reconciliations
        SET status = ?,
            review_status = ?,
            review_notes = ?,
            difference_reason = ?,
            reviewed_by = ?,
            reviewed_at = NOW()
      WHERE id = ?`,
    [
      row.status,
      row.review_status,
      row.review_notes || '',
      row.difference_reason || '',
      row.reviewed_by || null,
      id,
    ],
  );
  return result.affectedRows;
}

module.exports = {
  getPool,
  getConnection,
  selectChannelsByCountryCurrency,
  selectChannelByCode,
  selectAllChannelsAdmin,
  updateChannelAdmin,
  insertPaymentOrder,
  selectPaymentOrderByIdempotency,
  selectPaymentOrderByIdAndUser,
  selectPaymentOrderByIdForAdmin,
  selectPaymentOrderByIdForUpdate,
  updatePaymentOrderPaid,
  updatePaymentOrderFailed,
  updatePaymentOrderMetadata,
  insertPaymentEvent,
  insertPaymentFee,
  insertReconciliation,
  listReconciliations,
  listPaymentOrdersAdmin,
  listPaymentEventsAdmin,
  selectRefundEventsForReturn,
  aggregatePaidByDay,
  aggregatePaidByDayAndChannel,
  selectLatestPendingStripePaymentOrderIdByOrderId,
  selectLatestPendingPaymentOrderId,
  insertAnalyticsEvent,
  selectPaymentEventById,
  selectPaymentEventByIdForUpdate,
  updatePaymentEventReview,
  selectPaymentEventByProviderEventId,
  selectReconciliationByIdForUpdate,
  updateReconciliationReview,
};

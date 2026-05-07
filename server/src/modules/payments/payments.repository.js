/**
 * 支付域数据访问
 * @param {import('mysql2/promise').Pool|import('mysql2/promise').PoolConnection} q
 */

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

async function updatePaymentOrderMetadata(q, id, metadata) {
  await q.query(
    'UPDATE payment_orders SET metadata = ?, updated_at = NOW() WHERE id = ?',
    [JSON.stringify(metadata || {}), id],
  );
}

async function insertPaymentEvent(q, row) {
  await q.query(
    `INSERT INTO payment_events
      (id, payment_order_id, order_id, provider, provider_event_id, event_type, verify_status, processing_result, payload_json, error_message)
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
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
      (id, reconcile_date, provider, channel_code, order_count, success_amount, diff_amount, status, notes, created_by)
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
    [
      row.id,
      row.reconcile_date,
      row.provider,
      row.channel_code || '',
      row.order_count ?? 0,
      row.success_amount ?? 0,
      row.diff_amount ?? 0,
      row.status || 'draft',
      row.notes || '',
      row.created_by || null,
    ],
  );
}

async function listReconciliations(q, { page, pageSize }) {
  const offset = (page - 1) * pageSize;
  const [[{ total }]] = await q.query('SELECT COUNT(*) AS total FROM payment_reconciliations');
  const [rows] = await q.query(
    'SELECT * FROM payment_reconciliations ORDER BY reconcile_date DESC, created_at DESC LIMIT ? OFFSET ?',
    [pageSize, offset],
  );
  return { list: rows, total };
}

async function listPaymentOrdersAdmin(q, filters) {
  const {
    page, pageSize, status, channelCode, keyword, orderId,
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
    `SELECT po.*, o.contact_phone AS buyer_phone
     FROM payment_orders po
     LEFT JOIN orders o ON o.id = po.order_id
     ${where}
     ORDER BY po.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, pageSize, offset],
  );
  return { list: rows, total };
}

async function listPaymentEventsAdmin(q, filters) {
  const { page, pageSize, provider, orderId } = filters;
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
  const [[{ total }]] = await q.query(`SELECT COUNT(*) AS total FROM payment_events pe ${where}`, params);
  const [rows] = await q.query(
    `SELECT pe.* FROM payment_events pe ${where} ORDER BY pe.created_at DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, offset],
  );
  return { list: rows, total };
}

async function aggregatePaidByDay(q, reconcileDate, provider) {
  const [[row]] = await q.query(
    `SELECT COUNT(*) AS order_count,
            COALESCE(SUM(amount),0) AS success_amount
     FROM payment_orders
     WHERE status = 'paid' AND provider = ?
     AND DATE(COALESCE(payment_time, created_at)) = ?`,
    [provider, reconcileDate],
  );
  return row;
}

module.exports = {
  selectChannelsByCountryCurrency,
  selectChannelByCode,
  selectAllChannelsAdmin,
  updateChannelAdmin,
  insertPaymentOrder,
  selectPaymentOrderByIdempotency,
  selectPaymentOrderByIdAndUser,
  selectPaymentOrderByIdForAdmin,
  updatePaymentOrderPaid,
  updatePaymentOrderMetadata,
  insertPaymentEvent,
  insertPaymentFee,
  insertReconciliation,
  listReconciliations,
  listPaymentOrdersAdmin,
  listPaymentEventsAdmin,
  aggregatePaidByDay,
};

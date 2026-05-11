const { generateId } = require('../../utils/helpers');
const { NotFoundError, ValidationError } = require('../../errors');
const { PAYMENT_STATUS } = require('../../constants/status');
const repo = require('./myinvois.repository');
const client = require('./myinvois.client');

const PROFILE_ID = 'default';
const pool = repo.getPool();

function isEnvEnabled() {
  return process.env.MYINVOIS_ENABLED === '1';
}

function parseJson(value, fallback = {}) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function toMoney(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function formatProfile(row) {
  if (!row) return null;
  return {
    id: row.id,
    enabled: !!row.enabled,
    environment: row.environment,
    supplier_tin: row.supplier_tin,
    supplier_name: row.supplier_name,
    supplier_id_type: row.supplier_id_type,
    supplier_id_value: row.supplier_id_value,
    supplier_sst: row.supplier_sst,
    supplier_email: row.supplier_email,
    supplier_phone: row.supplier_phone,
    supplier_address: parseJson(row.supplier_address_json, {}),
    client_id: row.client_id,
    client_secret_ref: row.client_secret_ref,
    certificate_ref: row.certificate_ref,
    certificate_fingerprint: row.certificate_fingerprint,
    certificate_expires_at: row.certificate_expires_at,
    signing_key_ref: row.signing_key_ref,
    config_json: parseJson(row.config_json, {}),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function getStatusAdmin() {
  const profile = await repo.selectProfile(pool);
  const formatted = formatProfile(profile);
  return {
    data: {
      env_enabled: isEnvEnabled(),
      submit_enabled: process.env.MYINVOIS_SUBMIT_ENABLED === '1',
      configured: !!formatted,
      active: isEnvEnabled() && !!formatted?.enabled,
      profile: formatted,
    },
  };
}

async function updateProfileAdmin(req, body) {
  await repo.upsertProfile(pool, PROFILE_ID, body);
  await repo.insertEvent(pool, {
    id: generateId(),
    eventType: 'profile.updated',
    status: body.enabled ? 'enabled' : 'disabled',
    payload: {
      operator_id: req.user?.id || null,
      environment: body.environment || 'sandbox',
      supplier_tin: body.supplier_tin || '',
      certificate_ref: body.certificate_ref || '',
      certificate_fingerprint: body.certificate_fingerprint || '',
    },
  });
  return { message: 'MyInvois 配置已保存' };
}

async function getActiveProfileOrNull(q) {
  if (!isEnvEnabled()) return null;
  return repo.selectActiveProfile(q);
}

function buildInvoicePayload(profile, snapshot) {
  const { order, items } = snapshot;
  const total = toMoney(order.total_amount);
  return {
    schema: 'myinvois-internal-v1',
    document_type: 'invoice',
    source: { type: 'order', id: order.id, order_no: order.order_no },
    issue_date: new Date().toISOString(),
    currency: 'MYR',
    supplier: {
      tin: profile.supplier_tin,
      name: profile.supplier_name,
      id_type: profile.supplier_id_type,
      id_value: profile.supplier_id_value,
      sst: profile.supplier_sst,
      email: profile.supplier_email,
      phone: profile.supplier_phone,
      address: parseJson(profile.supplier_address_json, {}),
    },
    buyer: {
      name: order.contact_name || order.user_name || '',
      phone: order.contact_phone || order.user_phone || '',
      email: order.user_email || '',
      address: order.address || '',
    },
    lines: items.map((item, index) => ({
      line_no: index + 1,
      product_id: item.product_id,
      description: item.product_name,
      quantity: Number(item.qty || 0),
      unit_price: toMoney(item.price),
      line_amount: toMoney(item.price) * Number(item.qty || 0),
      tax: null,
    })),
    totals: {
      raw_amount: toMoney(order.raw_amount),
      discount_amount: toMoney(order.discount_amount),
      shipping_fee: toMoney(order.shipping_fee),
      payable_amount: total,
    },
    tax_summary: {
      ready: false,
      dependency: 'W3',
      note: 'MyInvois 正式提交前需由 W3 提供逐行税率、税额、税种与免税原因等税务明细。',
    },
  };
}

function buildCreditNotePayload(profile, snapshot, refundAmount) {
  const base = buildInvoicePayload(profile, snapshot);
  const ret = snapshot.returnRequest || {};
  return {
    ...base,
    document_type: 'credit_note',
    source: {
      type: ret.id ? 'return' : 'order',
      id: ret.id || snapshot.order.id,
      order_no: snapshot.order.order_no,
    },
    refund: {
      return_id: ret.id || null,
      reason: ret.reason || '',
      approved_amount: toMoney(refundAmount ?? ret.refund_amount ?? snapshot.order.total_amount),
    },
    totals: {
      ...base.totals,
      payable_amount: toMoney(refundAmount ?? ret.refund_amount ?? snapshot.order.total_amount),
    },
  };
}

async function enqueueOrderInvoiceIfEnabled(orderId, trigger = 'order_paid') {
  const profile = await getActiveProfileOrNull(pool);
  if (!profile) return { skipped: true, reason: 'myinvois_disabled' };

  const snapshot = await repo.selectOrderSnapshot(pool, orderId);
  if (!snapshot) return { skipped: true, reason: 'order_not_found' };
  const paymentStatus = snapshot.order.payment_status || PAYMENT_STATUS.PENDING;
  if (paymentStatus !== PAYMENT_STATUS.PAID && paymentStatus !== PAYMENT_STATUS.PARTIALLY_REFUNDED) {
    return { skipped: true, reason: 'order_not_paid' };
  }

  const payload = buildInvoicePayload(profile, snapshot);
  const inserted = await repo.insertDocumentIfAbsent(pool, {
    id: generateId(),
    profileId: profile.id,
    documentType: 'invoice',
    sourceType: 'order',
    sourceId: snapshot.order.id,
    orderId: snapshot.order.id,
    orderNo: snapshot.order.order_no,
    userId: snapshot.order.user_id,
    currency: 'MYR',
    amount: toMoney(snapshot.order.total_amount),
    payload,
  });
  await repo.insertEvent(pool, {
    id: generateId(),
    eventType: inserted ? 'document.queued' : 'document.duplicate',
    status: inserted ? 'queued' : 'skipped',
    payload: { trigger, document_type: 'invoice', order_id: orderId },
  });
  return { queued: inserted };
}

async function enqueueRefundCreditNoteIfEnabled(input, trigger = 'refund_approved') {
  const profile = await getActiveProfileOrNull(pool);
  if (!profile) return { skipped: true, reason: 'myinvois_disabled' };

  let snapshot;
  let sourceType = 'order';
  let sourceId = input.orderId;
  if (input.returnId) {
    snapshot = await repo.selectReturnSnapshot(pool, input.returnId);
    sourceType = 'return';
    sourceId = input.returnId;
  } else if (input.orderId) {
    snapshot = await repo.selectOrderSnapshot(pool, input.orderId);
  }
  if (!snapshot) return { skipped: true, reason: 'source_not_found' };

  const refundAmount = toMoney(input.refundAmount ?? snapshot.returnRequest?.refund_amount ?? snapshot.order.total_amount);
  const payload = buildCreditNotePayload(profile, snapshot, refundAmount);
  const inserted = await repo.insertDocumentIfAbsent(pool, {
    id: generateId(),
    profileId: profile.id,
    documentType: 'credit_note',
    sourceType,
    sourceId,
    orderId: snapshot.order.id,
    orderNo: snapshot.order.order_no,
    userId: snapshot.order.user_id,
    currency: 'MYR',
    amount: refundAmount,
    payload,
  });
  await repo.insertEvent(pool, {
    id: generateId(),
    eventType: inserted ? 'document.queued' : 'document.duplicate',
    status: inserted ? 'queued' : 'skipped',
    payload: { trigger, document_type: 'credit_note', source_type: sourceType, source_id: sourceId },
  });
  return { queued: inserted };
}

async function listDocumentsAdmin(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize, 10) || 20));
  const filters = {
    pageSize,
    offset: (page - 1) * pageSize,
    status: query.status || '',
    documentType: query.documentType || '',
    orderId: query.orderId || '',
  };
  const [total, list] = await Promise.all([
    repo.countDocuments(pool, filters),
    repo.listDocuments(pool, filters),
  ]);
  return { list, total, page, pageSize };
}

async function getDocumentAdmin(id) {
  const row = await repo.selectDocumentById(pool, id);
  if (!row) throw new NotFoundError('MyInvois 文档不存在');
  return {
    data: {
      ...row,
      amount: toMoney(row.amount),
      payload_json: parseJson(row.payload_json, {}),
      response_json: parseJson(row.response_json, {}),
    },
  };
}

async function retryDocumentAdmin(id) {
  const row = await repo.selectDocumentById(pool, id);
  if (!row) throw new NotFoundError('MyInvois 文档不存在');
  await repo.resetDocumentForRetry(pool, id);
  await repo.insertEvent(pool, {
    id: generateId(),
    documentId: id,
    eventType: 'document.retry_requested',
    status: 'queued',
  });
  return { message: '已加入重试队列' };
}

async function submitDocumentAdmin(id) {
  const row = await repo.selectDocumentById(pool, id);
  if (!row) throw new NotFoundError('MyInvois 文档不存在');
  await processDocument(row);
  return { message: '已处理 MyInvois 文档' };
}

async function processPendingBatch(limit = 20) {
  if (!isEnvEnabled()) return { processed: 0, skipped: true };
  const rows = await repo.selectDueDocuments(pool, Math.min(100, Math.max(1, Number(limit) || 20)));
  let processed = 0;
  for (const row of rows) {
    await processDocument(row);
    processed += 1;
  }
  return { processed };
}

async function processDocument(row) {
  const profile = await repo.selectActiveProfile(pool);
  if (!profile) throw new ValidationError('MyInvois 未启用或未配置 profile');
  const payload = parseJson(row.payload_json, {});
  try {
    if (process.env.MYINVOIS_SUBMIT_ENABLED !== '1') {
      await repo.markDocumentReady(pool, row.id, '等待法务/会计完成 sandbox 验收后开启 MYINVOIS_SUBMIT_ENABLED');
      await repo.insertEvent(pool, {
        id: generateId(),
        documentId: row.id,
        eventType: 'document.ready',
        status: 'ready',
      });
      return;
    }
    const result = await client.submitDocument(profile, payload);
    await repo.markDocumentSubmitted(pool, row.id, result);
    await repo.insertEvent(pool, {
      id: generateId(),
      documentId: row.id,
      eventType: 'document.submitted',
      status: result.status,
      payload: result,
    });
  } catch (err) {
    const retryDelay = Math.min(24 * 60, 2 ** Math.min(Number(row.retry_count || 0), 8));
    await repo.markDocumentFailed(pool, row.id, err.message || String(err), retryDelay);
    await repo.insertEvent(pool, {
      id: generateId(),
      documentId: row.id,
      eventType: 'document.submit_failed',
      status: 'failed',
      errorMessage: err.message || String(err),
    });
  }
}

async function createReconciliationAdmin(req, body) {
  const reconcileDate = body.reconcile_date;
  if (!reconcileDate) throw new ValidationError('reconcile_date 必填');
  const agg = await repo.aggregateDocumentsByDate(pool, reconcileDate, body.document_type || '');
  const id = generateId();
  await repo.insertReconciliation(pool, {
    id,
    reconcileDate,
    documentType: body.document_type || '',
    queuedCount: Number(agg.queued_count || 0),
    submittedCount: Number(agg.submitted_count || 0),
    acceptedCount: Number(agg.accepted_count || 0),
    failedCount: Number(agg.failed_count || 0),
    totalAmount: toMoney(agg.total_amount),
    notes: body.notes || '',
    createdBy: req.user?.id || null,
  });
  return { data: { id }, message: 'MyInvois 对账快照已创建' };
}

let schedulerTimer = null;

function startMyInvoisRetryScheduler() {
  if (schedulerTimer || !isEnvEnabled()) return;
  const intervalMs = Math.max(60_000, Number(process.env.MYINVOIS_RETRY_INTERVAL_MS || 300_000));
  schedulerTimer = setInterval(() => {
    processPendingBatch(20).catch((err) => {
      console.error('[MyInvois] retry scheduler failed:', err?.message || err);
    });
  }, intervalMs);
}

module.exports = {
  getStatusAdmin,
  updateProfileAdmin,
  enqueueOrderInvoiceIfEnabled,
  enqueueRefundCreditNoteIfEnabled,
  listDocumentsAdmin,
  getDocumentAdmin,
  retryDocumentAdmin,
  submitDocumentAdmin,
  processPendingBatch,
  createReconciliationAdmin,
  startMyInvoisRetryScheduler,
};

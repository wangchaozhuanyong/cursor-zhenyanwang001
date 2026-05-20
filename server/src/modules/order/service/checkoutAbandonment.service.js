const repo = require('../repository/checkoutAbandonment.repository');
const { generateId } = require('../../../utils/helpers');
const { maskPhone } = require('../../../utils/formatUserResponse');

const OPEN_STATUSES = ['open', 'ordered'];

function money(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Number(n.toFixed(2)) : 0;
}

function normalizeItems(items) {
  return (Array.isArray(items) ? items : [])
    .slice(0, 10)
    .map((item) => ({
      product_id: String(item.product_id || '').slice(0, 64),
      variant_id: String(item.variant_id || '').slice(0, 64),
      sku_code: String(item.sku_code || '').slice(0, 64),
      variant_name: String(item.variant_name || '').slice(0, 120),
      name: String(item.name || '').slice(0, 120),
      image: String(item.image || '').slice(0, 512),
      qty: Math.max(1, Number.parseInt(item.qty, 10) || 1),
      price: money(item.price),
    }))
    .filter((item) => item.product_id);
}

function buildSnapshotParams(userId, body) {
  const itemsSummary = normalizeItems(body.items);
  return {
    userId,
    itemsSummary,
    itemsCount: itemsSummary.reduce((sum, item) => sum + item.qty, 0),
    rawAmount: money(body.raw_amount),
    discountAmount: money(body.discount_amount),
    shippingFee: money(body.shipping_fee),
    totalAmount: money(body.total_amount),
    paymentMethod: String(body.payment_method || '').slice(0, 32),
    contactName: String(body.contact_name || '').trim().slice(0, 64),
    contactPhoneMasked: maskPhone(body.contact_phone || ''),
  };
}

async function recordCheckoutSnapshot(userId, body) {
  const params = buildSnapshotParams(userId, body);
  if (params.itemsCount <= 0) {
    return { data: null, message: '结算车为空，已跳过快照' };
  }

  const pool = repo.getPool();
  const requestedId = String(body.checkout_abandonment_id || '').trim();
  if (requestedId) {
    const affected = await repo.updateOpenSnapshot(pool, requestedId, userId, params);
    const existing = await repo.selectSnapshotForUser(pool, requestedId, userId);
    if (affected > 0 || existing) {
      return { data: { id: requestedId, status: existing?.status || 'open' } };
    }
  }

  const latestOpenId = await repo.selectLatestOpenIdForUser(pool, userId);
  if (latestOpenId) {
    const affected = await repo.updateOpenSnapshot(pool, latestOpenId, userId, params);
    if (affected > 0) {
      const existing = await repo.selectSnapshotForUser(pool, latestOpenId, userId);
      return { data: { id: latestOpenId, status: existing?.status || 'open' } };
    }
  }

  const id = generateId();
  await repo.insertSnapshot(pool, { ...params, id });
  return { data: { id, status: 'open' } };
}

function buildAdminWhere(query) {
  const params = [];
  let where = 'WHERE 1=1';
  const status = String(query.status || '').trim();
  if (status) {
    where += ' AND ca.status = ?';
    params.push(status);
  } else {
    where += ` AND ca.status IN (${OPEN_STATUSES.map(() => '?').join(',')})`;
    params.push(...OPEN_STATUSES);
  }
  const keyword = String(query.keyword || '').trim();
  if (keyword) {
    where += ' AND (ca.order_no LIKE ? OR ca.contact_name LIKE ? OR ca.user_id LIKE ?)';
    params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
  }
  return { where, params };
}

function parseItemsSummary(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function listAdminCheckoutAbandonments(query) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const pageSize = Math.min(50, Math.max(1, Number.parseInt(query.pageSize, 10) || 20));
  const { where, params } = buildAdminWhere(query);
  const total = await repo.countAdmin(where, params);
  const rows = await repo.selectAdminPage(where, params, pageSize, (page - 1) * pageSize);
  const list = rows.map((row) => ({
    ...row,
    items_summary: parseItemsSummary(row.items_summary),
    raw_amount: money(row.raw_amount),
    discount_amount: money(row.discount_amount),
    shipping_fee: money(row.shipping_fee),
    total_amount: money(row.total_amount),
  }));
  return { kind: 'paginate', list, total, page, pageSize };
}

async function listDueCheckoutReminders(limit = 100) {
  const rows = await repo.selectDueReminders(Math.min(200, Math.max(1, Number(limit) || 100)));
  return rows.map((row) => ({
    ...row,
    items_summary: parseItemsSummary(row.items_summary),
    raw_amount: money(row.raw_amount),
    discount_amount: money(row.discount_amount),
    shipping_fee: money(row.shipping_fee),
    total_amount: money(row.total_amount),
  }));
}

async function markCheckoutReminderSent(id, channel = 'manual') {
  await repo.markReminderSent(id, channel);
  return { data: null };
}

module.exports = {
  recordCheckoutSnapshot,
  listAdminCheckoutAbandonments,
  listDueCheckoutReminders,
  markCheckoutReminderSent,
};




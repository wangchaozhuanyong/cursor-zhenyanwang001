const repo = require('../repository/adminOrderEvent.repository');

const DEFAULT_LOOKBACK_MS = 5 * 60 * 1000;
const MAX_LOOKBACK_MS = 10 * 60 * 1000;
const MAX_EVENTS = 20;

function parseSince(value) {
  const fallback = new Date(Date.now() - DEFAULT_LOOKBACK_MS);
  if (!value) return fallback;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return fallback;

  const now = Date.now();
  const oldestAllowed = now - MAX_LOOKBACK_MS;
  if (parsed.getTime() < oldestAllowed) {
    return new Date(oldestAllowed);
  }
  if (parsed.getTime() > now) {
    return new Date(now);
  }
  return parsed;
}

function toIso(value) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function normalizeAmount(value) {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount.toFixed(2) : String(value || '0.00');
}

function mapCreated(row) {
  const createdAt = toIso(row.created_at);
  return {
    id: `order_created:${row.id}:${createdAt}`,
    type: 'order_created',
    orderId: row.id,
    orderNo: row.order_no,
    amount: normalizeAmount(row.total_amount),
    createdAt,
  };
}

function mapPaid(row) {
  const createdAt = toIso(row.paid_event_at);
  return {
    id: `payment_success:${row.id}:${createdAt}`,
    type: 'payment_success',
    orderId: row.id,
    orderNo: row.order_no,
    amount: normalizeAmount(row.total_amount),
    createdAt,
  };
}

async function listRecentOrderEvents(query = {}) {
  const checkedAt = new Date();
  const since = parseSince(query.since);
  const [createdRows, paidRows] = await Promise.all([
    repo.selectCreatedOrderEvents(since, MAX_EVENTS),
    repo.selectPaidOrderEvents(since, MAX_EVENTS),
  ]);

  const events = [
    ...createdRows.map(mapCreated),
    ...paidRows.map(mapPaid),
  ]
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .slice(0, MAX_EVENTS);

  return { events, checkedAt: checkedAt.toISOString() };
}

module.exports = {
  listRecentOrderEvents,
};

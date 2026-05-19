/**
 * 鏈敮浠樿鍗曚粯娆炬埅姝㈡椂闂达細涓?orderPaymentTimeout.service 鍏辩敤閰嶇疆銆? */
const { ORDER_STATUS, PAYMENT_STATUS } = require('../../constants/status');
const { loadPaymentTimeoutSettings } = require('./service/orderPaymentTimeout.service');

let cachedSettings = null;
let cachedAt = 0;
const SETTINGS_CACHE_MS = 30_000;

async function getPaymentTimeoutSettingsCached() {
  if (cachedSettings && Date.now() - cachedAt < SETTINGS_CACHE_MS) {
    return cachedSettings;
  }
  cachedSettings = await loadPaymentTimeoutSettings();
  cachedAt = Date.now();
  return cachedSettings;
}

function invalidatePaymentTimeoutSettingsCache() {
  cachedSettings = null;
  cachedAt = 0;
}

function isPendingOnlineUnpaid(order) {
  if (!order) return false;
  if (order.status !== ORDER_STATUS.PENDING) return false;
  const ps = order.payment_status || PAYMENT_STATUS.PENDING;
  if (ps !== PAYMENT_STATUS.PENDING) return false;
  return true;
}

function computeDeadlineIso(createdAt, minutes) {
  const createdMs = new Date(createdAt).getTime();
  if (!Number.isFinite(createdMs)) return null;
  return new Date(createdMs + minutes * 60 * 1000).toISOString();
}

function attachPaymentDeadlineFields(order, settings) {
  const enabled = !!settings?.enabled;
  const minutes = settings?.minutes ?? 30;
  const base = {
    ...order,
    payment_timeout_enabled: enabled,
    payment_timeout_minutes: enabled ? minutes : null,
  };
  if (!enabled || !isPendingOnlineUnpaid(order)) {
    return {
      ...base,
      payment_deadline_at: null,
      payment_ttl_seconds: null,
    };
  }
  const deadlineIso = computeDeadlineIso(order.created_at, minutes);
  if (!deadlineIso) {
    return { ...base, payment_deadline_at: null, payment_ttl_seconds: null };
  }
  const ttl = Math.max(
    0,
    Math.floor((new Date(deadlineIso).getTime() - Date.now()) / 1000),
  );
  return {
    ...base,
    payment_deadline_at: deadlineIso,
    payment_ttl_seconds: ttl,
  };
}

async function enrichOrderWithPaymentDeadline(order) {
  const settings = await getPaymentTimeoutSettingsCached();
  return attachPaymentDeadlineFields(order, settings);
}

async function enrichOrdersWithPaymentDeadline(orders) {
  if (!orders?.length) return orders;
  const settings = await getPaymentTimeoutSettingsCached();
  return orders.map((o) => attachPaymentDeadlineFields(o, settings));
}

module.exports = {
  attachPaymentDeadlineFields,
  enrichOrderWithPaymentDeadline,
  enrichOrdersWithPaymentDeadline,
  getPaymentTimeoutSettingsCached,
  invalidatePaymentTimeoutSettingsCache,
  isPendingOnlineUnpaid,
};



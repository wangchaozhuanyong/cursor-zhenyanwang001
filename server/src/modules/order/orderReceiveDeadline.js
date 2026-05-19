const { ORDER_STATUS } = require('../../constants/status');
const { loadAutoConfirmSettings } = require('./service/orderAutoConfirmSettings.service');

let cachedSettings = null;
let cachedAt = 0;
const SETTINGS_CACHE_MS = 30_000;

async function getAutoConfirmSettingsCached() {
  if (cachedSettings && Date.now() - cachedAt < SETTINGS_CACHE_MS) {
    return cachedSettings;
  }
  cachedSettings = await loadAutoConfirmSettings();
  cachedAt = Date.now();
  return cachedSettings;
}

function computeDeadlineIso(shippedAt, days) {
  const shippedMs = new Date(shippedAt).getTime();
  if (!Number.isFinite(shippedMs)) return null;
  return new Date(shippedMs + days * 24 * 60 * 60 * 1000).toISOString();
}

function attachAutoConfirmReceiveFields(order, settings) {
  const enabled = !!settings?.enabled;
  const days = settings?.days ?? 7;
  const base = {
    ...order,
    auto_confirm_receive_enabled: enabled,
    auto_confirm_receive_days: enabled ? days : null,
  };
  if (!enabled || order?.status !== ORDER_STATUS.SHIPPED) {
    return {
      ...base,
      auto_confirm_receive_deadline_at: null,
      auto_confirm_receive_ttl_seconds: null,
    };
  }
  const deadlineIso = computeDeadlineIso(order.shipped_at, days);
  if (!deadlineIso) {
    return {
      ...base,
      auto_confirm_receive_deadline_at: null,
      auto_confirm_receive_ttl_seconds: null,
    };
  }
  const ttl = Math.max(
    0,
    Math.floor((new Date(deadlineIso).getTime() - Date.now()) / 1000),
  );
  return {
    ...base,
    auto_confirm_receive_deadline_at: deadlineIso,
    auto_confirm_receive_ttl_seconds: ttl,
  };
}

async function enrichOrderWithAutoConfirmReceiveDeadline(order) {
  const settings = await getAutoConfirmSettingsCached();
  return attachAutoConfirmReceiveFields(order, settings);
}

async function enrichOrdersWithAutoConfirmReceiveDeadline(orders) {
  if (!orders?.length) return orders;
  const settings = await getAutoConfirmSettingsCached();
  return orders.map((o) => attachAutoConfirmReceiveFields(o, settings));
}

module.exports = {
  attachAutoConfirmReceiveFields,
  enrichOrderWithAutoConfirmReceiveDeadline,
  enrichOrdersWithAutoConfirmReceiveDeadline,
};

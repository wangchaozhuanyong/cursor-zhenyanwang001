const DEFAULT_SITE_CAPABILITIES = Object.freeze({
  mallEnabled: true,
  serviceEnabled: true,
  onlinePaymentEnabled: true,
  pointsEnabled: true,
  couponEnabled: true,
  reviewEnabled: true,
  inventoryEnabled: true,
  shippingEnabled: true,
  memberLevelEnabled: true,
  customerServiceDownloadEnabled: true,
  telegramOrderNotifyEnabled: true,
  languageGateEnabled: false,
  restrictedProductComplianceEnabled: true,
  trafficAnalyticsEnabled: true,
});

function parseBoolean(value, fallback) {
  if (typeof value === 'boolean') return value;
  if (value === 1 || value === '1') return true;
  if (value === 0 || value === '0') return false;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', 'yes', 'on'].includes(normalized)) return true;
    if (['false', 'no', 'off'].includes(normalized)) return false;
  }
  return fallback;
}

function normalizeSiteCapabilities(value) {
  let parsed = value;
  if (typeof value === 'string' && value.trim()) {
    try {
      parsed = JSON.parse(value);
    } catch {
      parsed = {};
    }
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) parsed = {};

  const next = {};
  for (const [key, fallback] of Object.entries(DEFAULT_SITE_CAPABILITIES)) {
    next[key] = parseBoolean(parsed[key], fallback);
  }
  return next;
}

module.exports = {
  DEFAULT_SITE_CAPABILITIES,
  normalizeSiteCapabilities,
};

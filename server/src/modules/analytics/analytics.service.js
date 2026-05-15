const crypto = require('crypto');
const repo = require('./analytics.repository');

const ALLOWED_EVENT_TYPES = new Set([
  'page_view',
  'product_impression',
  'product_click',
  'product_view',
  'add_to_cart',
  'favorite',
  'coupon_claim',
  'checkout_start',
  'order_submit',
  'payment_success',
  'search',
  'category_click',
  'banner_click',
  'activity_click',
]);

function safeText(value, max = 255) {
  const text = String(value || '').trim();
  return text.slice(0, max);
}

function normalizeEvent(payload) {
  const eventType = safeText(payload?.event_type, 64).toLowerCase();
  if (!ALLOWED_EVENT_TYPES.has(eventType)) return null;
  const amount = Number(payload?.amount);
  const quantity = Number(payload?.quantity);
  return {
    event_type: eventType,
    module: safeText(payload?.module, 64),
    page: safeText(payload?.page, 128),
    product_id: safeText(payload?.product_id, 36) || null,
    variant_id: safeText(payload?.variant_id, 36) || null,
    category_id: safeText(payload?.category_id, 36) || null,
    activity_id: safeText(payload?.activity_id, 36) || null,
    coupon_id: safeText(payload?.coupon_id, 36) || null,
    keyword: safeText(payload?.keyword, 100),
    order_id: safeText(payload?.order_id, 36) || null,
    amount: Number.isFinite(amount) ? amount : null,
    quantity: Number.isFinite(quantity) ? Math.max(0, Math.trunc(quantity)) : null,
    anonymous_id: safeText(payload?.anonymous_id, 64),
    session_id: safeText(payload?.session_id, 64),
  };
}

function hashIp(ip) {
  const raw = safeText(ip, 100);
  if (!raw) return '';
  return crypto.createHash('sha256').update(raw).digest('hex');
}

function inferDevice(ua = '') {
  const s = String(ua || '').toLowerCase();
  if (!s) return '';
  if (s.includes('mobile') || s.includes('android') || s.includes('iphone')) return 'mobile';
  if (s.includes('ipad') || s.includes('tablet')) return 'tablet';
  return 'desktop';
}

async function trackEvent(payload, req) {
  const normalized = normalizeEvent(payload);
  if (!normalized) return { data: null, message: 'ignored' };
  await repo.insertEvent({
    ...normalized,
    user_id: req?.user?.id || null,
    device: inferDevice(req?.headers?.['user-agent']),
    referrer: safeText(req?.headers?.referer || '', 255),
    ip_hash: hashIp(req?.ip || ''),
    user_agent: safeText(req?.headers?.['user-agent'] || '', 255),
  });
  return { data: null, message: 'ok' };
}

module.exports = {
  trackEvent,
};


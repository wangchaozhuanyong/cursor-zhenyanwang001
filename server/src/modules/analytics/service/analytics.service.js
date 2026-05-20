const crypto = require('crypto');
const repo = require('../repository/analytics.repository');

const ALLOWED_EVENT_TYPES = new Set([
  'session_start',
  'page_view',
  'page_leave',
  'product_impression',
  'product_click',
  'product_view',
  'add_to_cart',
  'favorite',
  'coupon_claim',
  'search',
  'category_click',
  'banner_click',
  'activity_click',
  'checkout_start',
  'order_submit',
  'payment_success',
  'contact_whatsapp_click',
  'pwa_download_page_view',
  'pwa_install_button_shown',
  'pwa_install_button_clicked',
  'pwa_installed',
  'pwa_ios_guide_shown',
  'pwa_open_standalone',
  'pwa_update_available',
  'pwa_update_accepted',
  'language_check',
  'non_chinese_blocked',
  'error_404',
]);

const NON_REPEATABLE_EVENT_TYPES = new Set(['order_submit', 'payment_success']);

function safeText(value, max = 255) {
  const text = String(value || '').trim();
  return text.slice(0, max);
}

function safeNumber(value, min = 0, max = Number.MAX_SAFE_INTEGER) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.min(max, Math.max(min, Math.trunc(n)));
}

function safeDecimal(value, min = 0, max = 100) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.min(max, Math.max(min, Number(n.toFixed(2))));
}

function getHostname(value) {
  const raw = safeText(value, 1024);
  if (!raw) return '';
  try {
    return new URL(raw).hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    return '';
  }
}

function inferTrafficSource(row) {
  const source = safeText(row.traffic_source, 64).toLowerCase();
  if (source) return source;
  if (row.utm_source || row.utm_medium || row.utm_campaign) return 'campaign';
  if (!row.referrer_domain) return 'direct';
  return 'referral';
}

function inferBrowser(ua = '') {
  const s = String(ua || '');
  if (/Edg\//i.test(s)) return 'Edge';
  if (/Chrome\//i.test(s) && !/Chromium/i.test(s)) return 'Chrome';
  if (/Firefox\//i.test(s)) return 'Firefox';
  if (/Safari\//i.test(s) && !/Chrome\//i.test(s)) return 'Safari';
  if (/MicroMessenger/i.test(s)) return 'WeChat';
  return '';
}

function inferOs(ua = '') {
  const s = String(ua || '').toLowerCase();
  if (s.includes('windows')) return 'Windows';
  if (s.includes('iphone') || s.includes('ipad') || s.includes('ios')) return 'iOS';
  if (s.includes('android')) return 'Android';
  if (s.includes('mac os')) return 'macOS';
  if (s.includes('linux')) return 'Linux';
  return '';
}

function normalizeEvent(payload) {
  const eventType = safeText(payload?.event_type, 64).toLowerCase();
  if (!ALLOWED_EVENT_TYPES.has(eventType)) return null;
  const amount = Number(payload?.amount);
  const quantity = Number(payload?.quantity);
  const referrer = safeText(payload?.referrer, 1024);
  const referrerDomain = safeText(payload?.referrer_domain, 255) || getHostname(referrer);
  return {
    event_type: eventType,
    module: safeText(payload?.module, 64),
    page: safeText(payload?.page, 128),
    path: safeText(payload?.path || payload?.page, 255),
    url: safeText(payload?.url, 1024),
    title: safeText(payload?.title, 255),
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
    dedupe_key: safeText(payload?.dedupe_key, 128) || null,
    referrer,
    referrer_domain: referrerDomain,
    traffic_source: safeText(payload?.traffic_source, 64),
    utm_source: safeText(payload?.utm_source, 100),
    utm_medium: safeText(payload?.utm_medium, 100),
    utm_campaign: safeText(payload?.utm_campaign, 150),
    utm_content: safeText(payload?.utm_content, 150),
    browser: safeText(payload?.browser, 64),
    os: safeText(payload?.os, 64),
    browser_language: safeText(payload?.browser_language, 32),
    screen_width: safeNumber(payload?.screen_width, 0, 100000),
    screen_height: safeNumber(payload?.screen_height, 0, 100000),
    viewport_width: safeNumber(payload?.viewport_width, 0, 100000),
    viewport_height: safeNumber(payload?.viewport_height, 0, 100000),
    duration_ms: safeNumber(payload?.duration_ms, 0, 24 * 60 * 60 * 1000),
    scroll_depth: safeDecimal(payload?.scroll_depth, 0, 100),
  };
}

function buildDedupeKey(row) {
  if (!NON_REPEATABLE_EVENT_TYPES.has(row.event_type)) return null;
  if (row.dedupe_key) return row.dedupe_key;
  if (row.order_id && (row.event_type === 'order_submit' || row.event_type === 'payment_success')) {
    return `${row.event_type}:${row.order_id}`.slice(0, 128);
  }
  return null;
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
  const path = normalized.path || normalized.page || '';
  if (path.startsWith('/admin')) return { data: null, message: 'ignored_admin_path' };
  const userRole = safeText(req?.user?.role || req?.user?.role_code || '', 64).toLowerCase();
  if (userRole.includes('admin') || req?.user?.is_admin) return { data: null, message: 'ignored_admin_user' };
  const userAgent = safeText(req?.headers?.['user-agent'] || '', 255);
  const referrer = normalized.referrer || safeText(req?.headers?.referer || '', 1024);
  const referrerDomain = normalized.referrer_domain || getHostname(referrer);
  const enriched = {
    ...normalized,
    referrer,
    referrer_domain: referrerDomain,
    traffic_source: inferTrafficSource({ ...normalized, referrer_domain: referrerDomain }),
    browser: normalized.browser || inferBrowser(userAgent),
    os: normalized.os || inferOs(userAgent),
  };
  await repo.insertEvent({
    ...enriched,
    dedupe_key: buildDedupeKey(enriched),
    user_id: req?.user?.id || null,
    device: normalized.device || inferDevice(userAgent),
    ip_hash: hashIp(req?.ip || ''),
    user_agent: userAgent,
  });
  return { data: null, message: 'ok' };
}

module.exports = {
  trackEvent,
};

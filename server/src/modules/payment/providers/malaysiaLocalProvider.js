const crypto = require('crypto');

function parseJson(value, fallback = {}) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function buildRedirectUrl(template, params) {
  if (!template) return null;
  return String(template).replace(/\{(\w+)\}/g, (_, key) => encodeURIComponent(params[key] ?? ''));
}

function createSignature(payload, secret) {
  return crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
}

function verifySignature({
  rawBody = '',
  body,
  headerSignature,
  secret,
}) {
  if (!secret) return { ok: false, reason: 'missing_secret' };
  const provided = String(headerSignature || body?.signature || '').trim();
  if (!provided) return { ok: false, reason: 'missing_signature' };
  const payload = rawBody || JSON.stringify(body || {});
  const expected = createSignature(payload, secret);
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return { ok: false, reason: 'signature_mismatch' };
  return { ok: crypto.timingSafeEqual(a, b), reason: 'signature_mismatch' };
}

async function createIntent({ channel, order, paymentOrderId, returnUrl }) {
  const config = parseJson(channel?.config_json);
  const gatewayUrlTemplate = config.gateway_url_template || process.env.MALAYSIA_PAYMENT_GATEWAY_URL_TEMPLATE || '';
  const redirectUrl = buildRedirectUrl(gatewayUrlTemplate, {
    payment_order_id: paymentOrderId,
    order_id: order.id,
    order_no: order.order_no,
    amount: order.total_amount,
    currency: channel.currency || 'MYR',
    channel_code: channel.code,
    return_url: returnUrl || '',
  });

  return {
    redirectUrl,
    raw: {
      provider: 'malaysia_local',
      gateway_mode: redirectUrl ? 'redirect' : 'pending_webhook',
      channel_code: channel.code,
    },
  };
}

function normalizeWebhookStatus(status) {
  const s = String(status || '').toLowerCase();
  if (['success', 'succeeded', 'paid', 'captured', 'completed'].includes(s)) return 'paid';
  if (['fail', 'failed', 'cancelled', 'canceled', 'expired'].includes(s)) return 'failed';
  return 'pending';
}

function normalizeWebhookPayload(body = {}) {
  const status = normalizeWebhookStatus(body.status || body.payment_status);
  return {
    eventId: String(body.event_id || body.transaction_id || body.reference || '').trim(),
    paymentOrderId: String(body.payment_order_id || '').trim(),
    orderId: String(body.order_id || '').trim(),
    transactionNo: String(body.transaction_id || body.payment_transaction_no || body.reference || '').trim(),
    status,
    rawStatus: String(body.status || body.payment_status || '').trim(),
    amount: body.amount === undefined ? null : Number(body.amount),
    currency: String(body.currency || 'MYR').toUpperCase(),
    billId: '',
  };
}

module.exports = {
  createIntent,
  normalizeWebhookPayload,
  normalizeWebhookStatus,
  parseJson,
  verifySignature,
};

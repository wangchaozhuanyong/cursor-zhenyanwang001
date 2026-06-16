const crypto = require('crypto');
const { BusinessError } = require('../../../errors');
const { parseJson } = require('./malaysiaLocalProvider');

const DEFAULT_BILLPLZ_API_BASE_URL = 'https://www.billplz.com/api/v3';

function firstNonEmpty(...values) {
  for (const value of values) {
    const str = String(value || '').trim();
    if (str) return str;
  }
  return '';
}

function buildRedirectUrl(template, params) {
  if (!template) return null;
  return String(template).replace(/\{(\w+)\}/g, (_, key) => encodeURIComponent(params[key] ?? ''));
}

function normalizeProvider(provider) {
  return String(provider || '').toLowerCase() === 'fpx' ? 'fpx' : 'billplz';
}

function timingSafeEquals(a, b) {
  const left = Buffer.from(String(a || '').trim());
  const right = Buffer.from(String(b || '').trim());
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function buildCanonicalBody(body) {
  if (!body || typeof body !== 'object') return '';
  return Object.keys(body)
    .filter((key) => !['signature', 'x_signature', 'x-signature'].includes(String(key).toLowerCase()))
    .sort()
    .map((key) => `${key}=${body[key] ?? ''}`)
    .join('&');
}

function flattenBillplzSignaturePairs(value, prefix = '') {
  if (!value || typeof value !== 'object') return [];
  const pairs = [];
  for (const key of Object.keys(value)) {
    const lower = String(key).toLowerCase();
    if (['signature', 'x_signature', 'x-signature', 'checksum'].includes(lower)) continue;
    const currentPrefix = prefix ? `${prefix}${key}` : key;
    const item = value[key];
    if (item && typeof item === 'object' && !Array.isArray(item)) {
      pairs.push(...flattenBillplzSignaturePairs(item, currentPrefix));
      continue;
    }
    pairs.push(`${currentPrefix}${item ?? ''}`);
  }
  return pairs;
}

function buildBillplzXSignaturePayload(body) {
  return flattenBillplzSignaturePairs(body)
    .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
    .join('|');
}

function hmacSha256(payload, secret) {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

function hmacSha512(payload, secret) {
  return crypto.createHmac('sha512', secret).update(payload).digest('hex');
}

function getNestedBillplzBody(body) {
  return body?.billplz && typeof body.billplz === 'object' ? body.billplz : null;
}

function providedBillplzSignature(body, headerSignature) {
  const nested = getNestedBillplzBody(body);
  return String(
    headerSignature ||
      body?.signature ||
      body?.x_signature ||
      body?.['x-signature'] ||
      nested?.x_signature ||
      nested?.['x-signature'] ||
      '',
  ).trim();
}

function verifySignature({
  rawBody = '',
  body,
  headerSignature,
  secret,
}) {
  if (!secret) return { ok: false, reason: 'missing_secret' };
  const provided = providedBillplzSignature(body, headerSignature);
  if (!provided) return { ok: false, reason: 'missing_signature' };

  const candidates = [
    buildBillplzXSignaturePayload(body),
    rawBody || JSON.stringify(body || {}),
    buildCanonicalBody(body),
  ].filter(Boolean);

  const ok = candidates.some((payload) => timingSafeEquals(provided, hmacSha256(payload, secret)));
  if (ok) return { ok: true, reason: '' };

  const checksum = String(body?.checksum || '').trim();
  if (checksum && verifyPaymentOrderChecksum(body, checksum, secret)) return { ok: true, reason: '' };
  return { ok: false, reason: 'signature_mismatch' };
}

function verifyPaymentOrderChecksum(body, checksum, secret) {
  const raw = [
    body?.title,
    body?.bank_account_number,
    body?.status,
    body?.total,
    body?.reference_id,
    body?.epoch,
  ]
    .filter((value) => value !== undefined && value !== null)
    .join('');
  return raw ? timingSafeEquals(checksum, hmacSha512(raw, secret)) : false;
}

function resolveBillplzConfig(channel) {
  const config = parseJson(channel?.config_json);
  const publicBase = firstNonEmpty(process.env.PUBLIC_APP_URL).replace(/\/$/, '');
  const callbackFromBase = publicBase ? `${publicBase}/api/payments/webhooks/billplz` : '';
  const resultUrlFromBase = publicBase ? `${publicBase}/payment/result` : '';
  return {
    config,
    apiBaseUrl: firstNonEmpty(
      config.api_base_url,
      config.billplz_api_base_url,
      process.env.BILLPLZ_API_BASE_URL,
      process.env.PAYMENT_BILLPLZ_API_BASE_URL,
      DEFAULT_BILLPLZ_API_BASE_URL,
    ).replace(/\/$/, ''),
    apiKey: firstNonEmpty(
      config.api_key,
      config.billplz_api_key,
      process.env.BILLPLZ_API_KEY,
      process.env.PAYMENT_BILLPLZ_API_KEY,
    ),
    collectionId: firstNonEmpty(
      config.collection_id,
      config.billplz_collection_id,
      process.env.BILLPLZ_COLLECTION_ID,
      process.env.PAYMENT_BILLPLZ_COLLECTION_ID,
    ),
    callbackUrl: firstNonEmpty(
      config.callback_url,
      config.billplz_callback_url,
      process.env.BILLPLZ_CALLBACK_URL,
      process.env.PAYMENT_BILLPLZ_CALLBACK_URL,
      callbackFromBase,
    ),
    defaultEmail: firstNonEmpty(
      config.default_email,
      config.billplz_default_email,
      process.env.BILLPLZ_DEFAULT_EMAIL,
      process.env.PAYMENT_BILLPLZ_DEFAULT_EMAIL,
    ),
    defaultName: firstNonEmpty(config.default_name, process.env.BILLPLZ_DEFAULT_NAME, 'Customer'),
    resultUrlFromBase,
  };
}

function getOrderEmail(order, config) {
  return firstNonEmpty(
    order?.contact_email,
    order?.email,
    order?.user_email,
    order?.buyer_email,
    config.defaultEmail,
  );
}

function getOrderMobile(order) {
  return firstNonEmpty(order?.contact_phone, order?.shipping_phone, order?.phone, order?.mobile);
}

function getOrderName(order, config) {
  return firstNonEmpty(order?.contact_name, order?.shipping_name, order?.user_name, config.defaultName, 'Customer').slice(0, 255);
}

function buildDefaultResultUrl(base, orderId, provider) {
  if (!base) return '';
  const url = new URL(base);
  url.searchParams.set('order_id', orderId);
  url.searchParams.set('provider', provider);
  return url.toString();
}

function normalizeBillplzErrorBody(text) {
  if (!text) return '';
  try {
    const parsed = JSON.parse(text);
    if (parsed?.error?.message) return parsed.error.message;
    if (parsed?.message) return typeof parsed.message === 'string' ? parsed.message : JSON.stringify(parsed.message);
    return JSON.stringify(parsed);
  } catch {
    return text;
  }
}

async function createBill({ apiBaseUrl, apiKey, payload }) {
  const endpoint = `${apiBaseUrl}/bills`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: new URLSearchParams(payload),
  });
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = {};
  }
  if (!response.ok) {
    const detail = normalizeBillplzErrorBody(text);
    throw new BusinessError(502, `Billplz 创建账单失败：${response.status}${detail ? ` ${detail}` : ''}`);
  }
  if (!data?.id || !data?.url) {
    throw new BusinessError(502, 'Billplz 创建账单失败：网关未返回 bill id 或支付链接');
  }
  return data;
}

function buildBillplzPayload({ channel, order, paymentOrderId, returnUrl, provider, config }) {
  const amount = Math.round(Number(order.total_amount || 0) * 100);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new BusinessError(400, '订单金额无效，无法创建 Billplz 账单');
  }
  const email = getOrderEmail(order, config);
  const mobile = getOrderMobile(order);
  if (!email && !mobile) {
    throw new BusinessError(503, 'Billplz 未配置收款邮箱兜底：请设置 BILLPLZ_DEFAULT_EMAIL 或确保订单有 +60 手机号');
  }
  const redirectUrl = firstNonEmpty(
    returnUrl,
    config.config.redirect_url,
    config.config.billplz_redirect_url,
    process.env.BILLPLZ_REDIRECT_URL,
    buildDefaultResultUrl(config.resultUrlFromBase, order.id, provider),
  );
  const payload = {
    collection_id: config.collectionId,
    description: String(config.config.description_prefix || '订单').trim()
      ? `${String(config.config.description_prefix || '订单').trim()} ${order.order_no}`
      : `订单 ${order.order_no}`,
    name: getOrderName(order, config),
    amount: String(amount),
    callback_url: config.callbackUrl,
    reference_1_label: 'Payment Order',
    reference_1: paymentOrderId,
    reference_2_label: 'Order No',
    reference_2: String(order.order_no || order.id).slice(0, 120),
    deliver: String(config.config.deliver ?? false),
  };
  if (email) payload.email = email;
  if (mobile) payload.mobile = mobile;
  if (redirectUrl) payload.redirect_url = redirectUrl;
  return payload;
}

async function createIntent({ channel, order, paymentOrderId, returnUrl, provider }) {
  const config = resolveBillplzConfig(channel);
  const normalizedProvider = normalizeProvider(provider || channel?.provider);
  const gatewayUrlTemplate =
    config.config.bill_url_template ||
    config.config.gateway_url_template ||
    process.env.BILLPLZ_GATEWAY_URL_TEMPLATE ||
    '';
  if (!config.apiKey || !config.collectionId) {
    if (!gatewayUrlTemplate) {
      throw new BusinessError(503, 'Billplz 未配置：请设置 BILLPLZ_API_KEY 与 BILLPLZ_COLLECTION_ID');
    }
    const fallbackUrl = buildRedirectUrl(gatewayUrlTemplate, {
      payment_order_id: paymentOrderId,
      order_id: order.id,
      order_no: order.order_no,
      amount: order.total_amount,
      currency: channel.currency || 'MYR',
      channel_code: channel.code,
      return_url: returnUrl || '',
    });
    return {
      redirectUrl: fallbackUrl,
      raw: {
        provider: normalizedProvider,
        gateway_mode: fallbackUrl ? 'redirect_template' : 'pending_webhook',
        environment: channel.environment || 'sandbox',
        channel_code: channel.code,
      },
    };
  }
  if (!config.callbackUrl) {
    throw new BusinessError(503, 'Billplz 未配置 callback_url：请设置 BILLPLZ_CALLBACK_URL 或 PUBLIC_APP_URL');
  }
  const payload = buildBillplzPayload({
    channel,
    order,
    paymentOrderId,
    returnUrl,
    provider: normalizedProvider,
    config,
  });
  const bill = await createBill({
    apiBaseUrl: config.apiBaseUrl,
    apiKey: config.apiKey,
    payload,
  });
  const redirectUrl = buildRedirectUrl(gatewayUrlTemplate, {
    payment_order_id: paymentOrderId,
    order_id: order.id,
    order_no: order.order_no,
    amount: order.total_amount,
    currency: channel.currency || 'MYR',
    channel_code: channel.code,
    return_url: returnUrl || '',
  }) || bill.url;

  return {
    redirectUrl,
    raw: {
      provider: normalizedProvider,
      gateway_mode: 'billplz_api',
      bill_id: bill.id,
      bill_url: bill.url,
      collection_id: bill.collection_id || config.collectionId,
      paid: bill.paid,
      state: bill.state,
      amount: bill.amount,
      environment: channel.environment || 'sandbox',
      channel_code: channel.code,
    },
  };
}

function normalizeWebhookStatus(status) {
  const s = String(status || '').toLowerCase();
  if (['success', 'succeeded', 'paid', 'captured', 'completed', 'true'].includes(s)) return 'paid';
  if (['fail', 'failed', 'cancelled', 'canceled', 'expired', 'false'].includes(s)) return 'failed';
  return 'pending';
}

function normalizeWebhookPayload(body = {}) {
  const nested = getNestedBillplzBody(body) || {};
  const paid = body.paid ?? nested.paid;
  const status = normalizeWebhookStatus(
    body.status ||
      body.payment_status ||
      body.state ||
      body.transaction_status ||
      nested.transaction_status ||
      paid,
  );
  const billId = firstNonEmpty(body.id, nested.id);
  const amountCents = firstNonEmpty(
    body.amount,
    nested.amount,
    status === 'paid' ? body.paid_amount : '',
  );
  const amountNumber = amountCents === '' ? null : Number(amountCents) / 100;
  return {
    eventId: firstNonEmpty(body.event_id, body.transaction_id, nested.transaction_id, body.reference, billId),
    paymentOrderId: firstNonEmpty(body.payment_order_id, body.reference_1),
    orderId: firstNonEmpty(body.order_id),
    orderNo: firstNonEmpty(body.order_no, body.reference_2),
    transactionNo: firstNonEmpty(body.transaction_id, nested.transaction_id, body.payment_transaction_no, body.reference, billId),
    status,
    rawStatus: firstNonEmpty(body.status, body.payment_status, body.state, body.transaction_status, nested.transaction_status, paid),
    amount: amountNumber === null || Number.isNaN(amountNumber) ? null : amountNumber,
    currency: firstNonEmpty(body.currency, 'MYR').toUpperCase(),
    billId,
  };
}

module.exports = {
  buildBillplzXSignaturePayload,
  createIntent,
  normalizeWebhookPayload,
  normalizeWebhookStatus,
  verifySignature,
};

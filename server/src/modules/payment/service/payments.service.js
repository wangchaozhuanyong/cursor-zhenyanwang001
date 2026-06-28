const { generateId } = require('../../../utils/helpers');
const {
  BusinessError,
  NotFoundError,
  ValidationError,
} = require('../../../errors');
const payRepo = require('../repository/payments.repository');
const manualProvider = require('../providers/manualProvider');
const malaysiaLocalProvider = require('../providers/malaysiaLocalProvider');
const billplzProvider = require('../providers/billplzProvider');
const { ORDER_STATUS, PAYMENT_STATUS } = require('../../../constants/status');
const { writeAuditLog } = require('../../../utils/auditLog');
const crypto = require('crypto');
const payDb = payRepo.getPool();

const MALAYSIA_REDIRECT_PROVIDERS = new Set(['malaysia_local', 'billplz', 'fpx']);

function normalizePaymentProvider(provider) {
  const value = String(provider || '').trim().toLowerCase();
  if (value === 'malaysia-local') return 'malaysia_local';
  return value;
}

function getMalaysiaProviderAdapter(provider) {
  return provider === 'billplz' || provider === 'fpx'
    ? billplzProvider
    : malaysiaLocalProvider;
}

function isBillplzProvider(provider) {
  return provider === 'billplz' || provider === 'fpx';
}

async function isBillplzCapabilityEnabled() {
  try {
    return await getSiteCapabilitiesApi().isCapabilityEnabled('billplzEnabled');
  } catch {
    return false;
  }
}

function getMalaysiaWebhookSecret(provider) {
  if (provider === 'billplz' || provider === 'fpx') {
    return (
      process.env.PAYMENT_BILLPLZ_X_SIGNATURE_KEY ||
      process.env.BILLPLZ_X_SIGNATURE_KEY ||
      process.env.PAYMENT_BILLPLZ_WEBHOOK_SECRET ||
      process.env.BILLPLZ_WEBHOOK_SECRET ||
      process.env.PAYMENT_MALAYSIA_WEBHOOK_SECRET ||
      ''
    ).trim();
  }
  return (process.env.PAYMENT_MALAYSIA_WEBHOOK_SECRET || '').trim();
}

function publishAdminEvent(event) {
  try {
    const result = getAdminApi().publishAdminEvent(event);
    if (result && typeof result.catch === 'function') result.catch(() => {});
  } catch {
    // Best-effort realtime signal; payment processing must not depend on SSE.
  }
}

function emitAdminEvent(event, options = {}) {
  try {
    const result = getAdminApi().emitEvent(event, {
      operatorId: options.operatorId || null,
      operatorType: options.operatorType || 'system',
      source: options.source || event.source || 'payment',
    });
    if (result && typeof result.catch === 'function') result.catch(() => {});
  } catch {
    // Event center is best-effort; payment state changes must not depend on it.
  }
}

function getLoyaltyApi() {
  return /** @type {any} */ (require('../../loyalty/publicApi'));
}

function getTelegramApi() {
  return /** @type {any} */ (require('../../telegram/publicApi'));
}

function getOrderApi() {
  return /** @type {any} */ (require('../../order/publicApi'));
}

function getAdminApi() {
  return /** @type {any} */ (require('../../admin/publicApi'));
}

function getSiteCapabilitiesApi() {
  return /** @type {any} */ (require('../../siteCapabilities/publicApi'));
}

function getUserApi() {
  return /** @type {any} */ (require('../../user/publicApi'));
}

function getMyinvoisApi() {
  return /** @type {any} */ (require('../../myinvois/publicApi'));
}

function requireOrderApi(name) {
  const fn = getOrderApi()[name];
  if (typeof fn !== 'function') {
    throw new Error(`Order 模块 API 未暴露方法：? ${name}`);
  }
  return fn;
}

function requireAdminApi(name) {
  const fn = getAdminApi()[name];
  if (typeof fn !== 'function') {
    throw new Error(`Admin 模块 API 未暴露方法：? ${name}`);
  }
  return fn;
}

const orderRepo = {
  selectOrderByIdAndUserForUpdate: (...args) => requireOrderApi('selectOrderByIdAndUserForUpdate')(...args),
  updateOrderPaid: (...args) => requireOrderApi('updateOrderPaid')(...args),
  selectOrderItemQtyRows: (...args) => requireOrderApi('selectOrderItemQtyRows')(...args),
  incrementProductSales: (...args) => requireOrderApi('incrementProductSales')(...args),
  selectOrderByIdAndUser: (...args) => requireOrderApi('selectOrderByIdAndUser')(...args),
  selectOrderById: (...args) => requireOrderApi('selectOrderById')(...args),
  selectOrderByIdForUpdate: (...args) => requireOrderApi('selectOrderByIdForUpdate')(...args),
  updateOrderRefundState: (...args) => requireOrderApi('updateOrderRefundState')(...args),
  applyOrderRefundCompensation: (...args) => requireOrderApi('applyOrderRefundCompensation')(...args),
  insertNotification: (...args) => requireOrderApi('insertOrderNotification')(...args),
};

const checkoutAbandonmentRepo = {
  markPaidByOrderId: (...args) => requireOrderApi('markCheckoutAbandonmentPaidByOrderId')(...args),
};


async function grantPaymentSuccessPoints(conn, order, trigger) {
  try {
    await getOrderApi().maybeGrantOrderEarnOnPaymentSuccess(conn, order, { trigger });
  } catch (err) {
    console.error(`[payments] grant points on ${trigger} failed:`, err?.message || err);
  }
}

async function grantReferralRewardsOnPayment(conn, order, trigger) {
  try {
    await requireUserApi('maybeSettleOrderRewardsOnPayment')(conn, order, { trigger });
  } catch (err) {
    console.error(`[payments] referral rewards on ${trigger} failed:`, err?.message || err);
  }
}

async function confirmOrderInventoryOnPayment(conn, order, trigger) {
  const confirm = getOrderApi().confirmOrderInventoryIfLocked;
  if (typeof confirm !== 'function') return;
  const result = await confirm(conn, {
    orderId: order.id,
    orderNo: order.order_no,
    trigger,
  });
  if (!result?.ok) {
    throw new ValidationError(`订单 ${order.order_no || order.id} 库存确认扣减失败，请人工复核`);
  }
}

function requireUserApi(name) {
  const fn = getUserApi()[name];
  if (typeof fn !== 'function') {
    throw new Error(`User 模块 API 未暴露方法：? ${name}`);
  }
  return fn;
}

function requireMyinvoisApi(name) {
  const fn = getMyinvoisApi()[name];
  if (typeof fn !== 'function') {
    throw new Error(`MyInvois 模块 API 未暴露方法：? ${name}`);
  }
  return fn;
}

async function notifyTelegramOrderPaid(orderId, source) {
  try {
    await getTelegramApi().notifyOrderPaid(orderId, source);
  } catch (e) {
    console.error('[Telegram] notify order paid failed:', e?.message || e);
  }
}

function toMoney(v) {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}

function roundMoney(value) {
  return Math.round(toMoney(value) * 100) / 100;
}

function optionalMoney(value) {
  if (value === undefined || value === null || value === '') return null;
  return roundMoney(value);
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

function redactWebhookBody(body = {}) {
  if (!body || typeof body !== 'object') return {};
  const clone = { ...body };
  for (const key of ['secret', 'signature', 'x_signature', 'x-signature']) {
    if (Object.prototype.hasOwnProperty.call(clone, key)) clone[key] = '[redacted]';
  }
  return clone;
}

function normalizeReviewStatus(value, fallback = 'pending') {
  const status = String(value || fallback).trim().toLowerCase();
  const allowed = new Set(['pending', 'needs_review', 'confirmed', 'needs_followup', 'rejected', 'ignored']);
  return allowed.has(status) ? status : fallback;
}

function statusForReconciliation(diffAmount, hasProviderReport) {
  if (!hasProviderReport) return Math.abs(roundMoney(diffAmount)) >= 0.01 ? 'needs_review' : 'draft';
  return Math.abs(roundMoney(diffAmount)) >= 0.01 ? 'needs_review' : 'matched';
}

function failureReasonFromWebhook(body = {}, fallback = '') {
  return String(
    body.failure_reason_code ||
      body.failure_code ||
      body.error_code ||
      body.reason ||
      body.error ||
      fallback ||
      '',
  ).trim().slice(0, 64);
}

async function recordWebhookFailureEvent(provider, body, reason, message) {
  try {
    await payRepo.insertPaymentEvent(payDb, {
      id: generateId(),
      payment_order_id: body?.payment_order_id || null,
      order_id: body?.order_id || null,
      provider,
      provider_event_id: null,
      event_type: `${provider}.webhook_rejected`,
      verify_status: 'failed',
      processing_result: 'rejected',
      payload_json: {
        provider,
        reason,
        body: redactWebhookBody(body),
      },
      error_message: message || reason,
      failure_reason_code: reason,
      risk_level: 'P1',
      review_status: 'needs_review',
    });
  } catch (err) {
    if (err?.code !== 'ER_DUP_ENTRY') {
      console.error('[payments] record webhook failure event failed:', err?.message || err);
    }
  }
}

function formatRefundEventForUser(row) {
  const payload = parseJson(row.payload_json, {});
  return {
    id: row.id,
    payment_order_id: row.payment_order_id || null,
    order_id: row.order_id || null,
    provider: row.provider || '',
    provider_event_id: row.provider_event_id || '',
    event_type: row.event_type || '',
    verify_status: row.verify_status || '',
    processing_result: row.processing_result || '',
    amount: toMoney(payload.amount),
    currency: payload.currency || 'MYR',
    mode: payload.mode || '',
    reason: payload.reason || '',
    refund_reference: payload.refund_reference || row.provider_event_id || '',
    error_message: row.error_message || '',
    created_at: row.created_at,
  };
}

function stableStringify(value) {
  if (value === null || value === undefined) return 'null';
  if (typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(',')}}`;
}

function buildManualWebhookSigningPayload(body, timestamp, nonce) {
  const clone = { ...(body || {}) };
  delete clone.secret;
  delete clone.signature;
  return `${timestamp}.${nonce}.${stableStringify(clone)}`;
}

function timingSafeHexEquals(provided, expected) {
  const a = Buffer.from(String(provided || ''), 'utf8');
  const b = Buffer.from(String(expected || ''), 'utf8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

async function listChannelsForUser(countryCode, currency) {
  const cc = (countryCode || 'MY').toUpperCase();
  const cur = (currency || 'MYR').toUpperCase();
  const rows = await payRepo.selectChannelsByCountryCurrency(payDb, cc, cur);
  const stripeReady = !!(process.env.STRIPE_SECRET_KEY || '').trim();
  const billplzEnabled = await isBillplzCapabilityEnabled();
  const filtered = rows.filter((r) => {
    if (r.code === 'stripe_checkout' && r.provider === 'stripe' && !stripeReady) return false;
    if (isBillplzProvider(r.provider) && !billplzEnabled) return false;
    return true;
  });
  return filtered.map((r) => ({
    id: r.id,
    code: r.code,
    name: r.name,
    provider: r.provider,
    country_code: r.country_code,
    currency: r.currency,
    sort_order: r.sort_order,
    environment: r.environment,
  }));
}

async function listChannelsAdmin() {
  return payRepo.selectAllChannelsAdmin(payDb);
}

async function updateChannelAdmin(req, id, body) {
  const affected = await payRepo.updateChannelAdmin(payDb, id, body);
  if (!affected) throw new NotFoundError('Channel not found');
  await writeAuditLog({
    req,
    operatorId: req.user?.id,
    actionType: 'payment.channel_update',
    objectType: 'payment_channel',
    objectId: id,
    summary: '更新支付渠道',
    after: body,
    result: 'success',
  });
  return { message: '已保存' };
}

/**
 * 返现钱包支付（从订单域迁入，统一走支付单记录）。
 */
async function payWithRewardWallet(userId, orderId) {
  const conn = await payRepo.getConnection();
  try {
    await conn.beginTransaction();
    const lockedOrder = await orderRepo.selectOrderByIdAndUserForUpdate(conn, orderId, userId);
    if (!lockedOrder) throw new NotFoundError('订单不存在');
    if (
      lockedOrder.status !== ORDER_STATUS.PENDING
      || (lockedOrder.payment_status || PAYMENT_STATUS.PENDING) !== PAYMENT_STATUS.PENDING
    ) {
      throw new ValidationError('当前订单状态不可使用返现钱包支付');
    }
    const payableAmount = toMoney(lockedOrder.total_amount);
    if (payableAmount <= 0) {
      throw new ValidationError('订单金额无效，无法使用返现钱包支付');
    }
    const balance = await requireUserApi('sumRewardTransactionsBalance')(conn, userId);
    if (balance < payableAmount) {
      throw new ValidationError(`返现钱包余额不足，当前可用 RM ${balance.toFixed(2)}`);
    }

    const channel = await payRepo.selectChannelByCode(conn, 'reward_wallet');
    const paymentOrderId = generateId();
    await payRepo.insertPaymentOrder(conn, {
      id: paymentOrderId,
      user_id: userId,
      order_id: lockedOrder.id,
      order_no: lockedOrder.order_no,
      channel_id: channel?.id || null,
      channel_code: 'reward_wallet',
      provider: 'internal',
      amount: payableAmount,
      currency: 'MYR',
      status: 'pending',
      idempotency_key: `reward_wallet:${lockedOrder.id}`,
      payment_transaction_no: '',
      payment_time: null,
      metadata: { step: 'before_deduct' },
    });

    await requireUserApi('insertRewardTransaction')(conn, {
      id: generateId(),
      userId,
      orderId: lockedOrder.id,
      orderNo: lockedOrder.order_no,
      type: 'wallet_redeem_order',
      amount: -payableAmount,
      status: 'success',
      reason: `返现钱包支付订单 ${lockedOrder.order_no}`,
      metadata: { channel: 'reward_wallet', payment_order_id: paymentOrderId },
    });

    const txNo = `RW-${Date.now()}`;
    const paidUpdated = await orderRepo.updateOrderPaid(conn, lockedOrder.id, {
      paymentTime: new Date(),
      paymentChannel: 'reward_wallet',
      paymentTransactionNo: txNo,
      paymentMethod: 'reward_wallet',
      paidAmount: payableAmount,
    });
    if (!paidUpdated) {
      throw new ValidationError('订单状态已变更，请刷新后重试');
    }
    await confirmOrderInventoryOnPayment(conn, lockedOrder, 'reward_wallet_payment_success');
    await requireUserApi('syncStatsAfterOrderPaid')(userId, payableAmount, lockedOrder.id, conn);
    await grantPaymentSuccessPoints(conn, lockedOrder, 'reward_wallet_payment_success');
    await grantReferralRewardsOnPayment(conn, lockedOrder, 'reward_wallet_payment_success');
    await payRepo.insertAnalyticsEvent(conn, {
      user_id: userId,
      dedupe_key: `payment_success:${lockedOrder.id}`,
      event_type: 'payment_success',
      module: 'reward_wallet',
      page: '/checkout',
      order_id: lockedOrder.id,
      amount: payableAmount,
      quantity: 1,
    });
    await checkoutAbandonmentRepo.markPaidByOrderId(conn, lockedOrder.id);
    try {
      await requireUserApi('refreshUserMemberLevel')(conn, userId);
    } catch (e) {
      console.error('[payWithRewardWallet] refreshUserMemberLevel failed (payment still committed if later steps ok):', e?.message || e);
    }

    const itemRows = await orderRepo.selectOrderItemQtyRows(conn, lockedOrder.id);
    for (const it of itemRows) {
      if (it?.product_id && Number(it.qty) > 0) {
        await orderRepo.incrementProductSales(conn, it.product_id, Number(it.qty));
      }
    }

    await payRepo.updatePaymentOrderPaid(conn, paymentOrderId, {
      payment_transaction_no: txNo,
      payment_time: new Date(),
      metadata: { reward_wallet: true },
    });

    const feeId = generateId();
    await payRepo.insertPaymentFee(conn, {
      id: feeId,
      payment_order_id: paymentOrderId,
      fee_rate_percent: 0,
      fee_fixed: 0,
      fee_amount: 0,
      net_amount: payableAmount,
    });
    try {
      await requireOrderApi('recomputeOrderProfitAmounts')(conn, lockedOrder.id, {});
    } catch (e) {
      console.error('[payWithRewardWallet] recomputeOrderProfitAmounts failed:', e?.message || e);
    }

    await payRepo.insertPaymentEvent(conn, {
      id: generateId(),
      payment_order_id: paymentOrderId,
      order_id: lockedOrder.id,
      provider: 'internal',
      provider_event_id: txNo,
      event_type: 'reward_wallet_paid',
      verify_status: 'success',
      processing_result: 'success',
      payload_json: { amount: payableAmount },
      error_message: '',
    });

    await conn.commit();
    emitAdminEvent({
      eventType: 'order.paid',
      category: 'order',
      severity: 'P2',
      title: '订单已付款',
      message: `订单 ${lockedOrder.order_no} 已通过返现钱包付款`,
      entityType: 'order',
      entityId: lockedOrder.id,
      fingerprint: { eventType: 'order.paid', entityType: 'order', entityId: lockedOrder.id },
      payload: { orderNo: lockedOrder.order_no, paymentOrderId, channel: 'reward_wallet', amount: payableAmount },
      impactAmount: payableAmount,
      source: 'reward_wallet',
    });
    await notifyTelegramOrderPaid(lockedOrder.id, 'reward_wallet');
    try {
      await requireMyinvoisApi('enqueueOrderInvoiceIfEnabled')(lockedOrder.id, 'reward_wallet_paid');
    } catch (e) {
      console.error('[MyInvois] enqueue invoice after reward wallet payment failed:', e?.message || e);
    }
    return { data: { payment_order_id: paymentOrderId }, message: '返现钱包支付成功' };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function createStripeCheckoutForOrder(userId, orderId, returnUrlHint, idempotencyKey) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new BusinessError(503, 'Stripe 未配置：请设置 STRIPE_SECRET_KEY');

  const base = (process.env.PUBLIC_APP_URL || '').trim().replace(/\/$/, '');
  if (!base) {
    throw new BusinessError(
      503,
      'Please configure PUBLIC_APP_URL for checkout return URL, for example https://your-domain or http://localhost:5173',
    );
  }

  const order = await orderRepo.selectOrderByIdAndUser(payDb, orderId, userId);
  if (!order) throw new NotFoundError('订单不存在');
  if (order.status !== ORDER_STATUS.PENDING || (order.payment_status || PAYMENT_STATUS.PENDING) !== PAYMENT_STATUS.PENDING) {
    throw new ValidationError('当前订单状态不可支付');
  }
  const payMethod = String(order.payment_method || '');
  const isGiftCashOrder = String(order.order_type || '') === 'points_gift' && payMethod === 'points_plus_cash';
  if (payMethod !== 'online' && !isGiftCashOrder) {
    throw new ValidationError('该订单非在线支付');
  }

  const total = toMoney(order.total_amount);
  const amountCents = Math.round(total * 100);
  if (!Number.isFinite(amountCents) || amountCents < 200) {
    throw new ValidationError('订单金额未达到 Stripe 最低支付要求（约 RM 2.00）');
  }

  const channel = await payRepo.selectChannelByCode(payDb, 'stripe_checkout');
  const paymentOrderId = generateId();
  await payRepo.insertPaymentOrder(payDb, {
    id: paymentOrderId,
    user_id: userId,
    order_id: order.id,
    order_no: order.order_no,
    channel_id: channel?.id || null,
    channel_code: 'stripe_checkout',
    provider: 'stripe',
    amount: total,
    currency: 'MYR',
    status: 'pending',
    idempotency_key: idempotencyKey || `stripe:${order.id}:${paymentOrderId}`,
    payment_transaction_no: '',
    payment_time: null,
    metadata: { phase: 'session_creating' },
  });

  const createStripe = /** @type {(k: string) => import('stripe').Stripe} */ (
    /** @type {unknown} */ (require('stripe'))
  );
  const stripe = createStripe(secretKey);
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'myr',
          product_data: {
            name: `订单 ${order.order_no}`,
          },
          unit_amount: amountCents,
        },
        quantity: 1,
      },
    ],
    success_url: `${base}/payment/result?order_id=${encodeURIComponent(orderId)}&provider=stripe&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/payment/result?order_id=${encodeURIComponent(orderId)}&provider=stripe&status=cancel`,
    metadata: { order_id: order.id, payment_order_id: paymentOrderId },
    payment_intent_data: {
      metadata: { order_id: order.id, payment_order_id: paymentOrderId },
    },
  });

  if (!session.url) throw new BusinessError(500, 'Stripe 未返回支付链接');

  await payRepo.updatePaymentOrderMetadata(payDb, paymentOrderId, {
    stripe_checkout_session_id: session.id,
    url: session.url,
    return_url_hint: returnUrlHint || '',
  });

  return { data: { url: session.url, payment_order_id: paymentOrderId } };
}

async function createIntent(userId, body) {
  const {
    order_id: orderId,
    channel_code: channelCode,
    idempotency_key: idempotencyKey,
    return_url: returnUrl,
  } = body;

  if (!orderId || !channelCode) {
    throw new ValidationError('order_id 和 channel_code 必填');
  }

  if (idempotencyKey) {
    const existing = await payRepo.selectPaymentOrderByIdempotency(payDb, userId, idempotencyKey);
    if (existing) {
      return {
        data: {
          payment_order_id: existing.id,
          status: existing.status,
          channel_code: existing.channel_code,
          redirect_url: existing.metadata?.url || null,
          reused: true,
        },
        message: '幂等命中，已复用现有支付单',
      };
    }
  }

  const channel = await payRepo.selectChannelByCode(payDb, channelCode);
  if (!channel) throw new ValidationError('支付渠道不可用');
  const channelProvider = normalizePaymentProvider(channel.provider);

  if (channelProvider === 'internal' && channel.code === 'reward_wallet') {
    throw new ValidationError('返现钱包请使用 POST /orders/:id/pay，channel=reward_wallet');
  }

  if (isBillplzProvider(channelProvider) && !(await isBillplzCapabilityEnabled())) {
    throw new ValidationError('本站未启用 Billplz / FPX');
  }

  if (channelProvider === 'stripe') {
    const r = await createStripeCheckoutForOrder(userId, orderId, returnUrl, idempotencyKey);
    return { data: { payment_order_id: r.data.payment_order_id, status: 'pending', redirect_url: r.data.url }, message: '正在跳转支付' };
  }

  if (channelProvider === 'manual') {
    const order = await orderRepo.selectOrderByIdAndUser(payDb, orderId, userId);
    if (!order) throw new NotFoundError('订单不存在');
    if (order.status !== ORDER_STATUS.PENDING || (order.payment_status || PAYMENT_STATUS.PENDING) !== PAYMENT_STATUS.PENDING) {
      throw new ValidationError('当前订单状态无法创建支付单');
    }
    const amount = toMoney(order.total_amount);
    const paymentOrderId = generateId();
    await manualProvider.createIntent({ paymentOrderId });
    await payRepo.insertPaymentOrder(payDb, {
      id: paymentOrderId,
      user_id: userId,
      order_id: order.id,
      order_no: order.order_no,
      channel_id: channel.id,
      channel_code: channel.code,
      provider: 'manual',
      amount,
      currency: channel.currency || 'MYR',
      status: 'pending',
      idempotency_key: idempotencyKey || null,
      payment_transaction_no: '',
      payment_time: null,
      metadata: { note: '等待后台确认收款' },
    });
    return {
      data: {
        payment_order_id: paymentOrderId,
        status: 'pending',
        redirect_url: null,
        client_instructions: '请按订单应付金额转账，或联系客服确认收款。',
      },
      message: '已创建待处理的人工支付单',
    };
  }

  if (MALAYSIA_REDIRECT_PROVIDERS.has(channelProvider)) {
    const order = await orderRepo.selectOrderByIdAndUser(payDb, orderId, userId);
    if (!order) throw new NotFoundError('订单不存在');
    if (order.status !== ORDER_STATUS.PENDING || (order.payment_status || PAYMENT_STATUS.PENDING) !== PAYMENT_STATUS.PENDING) {
      throw new ValidationError('当前订单状态无法创建支付单');
    }
    const payMethod = String(order.payment_method || '');
    const isGiftCashOrder = String(order.order_type || '') === 'points_gift' && payMethod === 'points_plus_cash';
    if (payMethod !== 'online' && !isGiftCashOrder) {
      throw new ValidationError('该订单非在线支付');
    }
    const amount = toMoney(order.total_amount);
    if (amount <= 0) throw new ValidationError('订单金额无效');
    const paymentOrderId = generateId();
    const providerAdapter = getMalaysiaProviderAdapter(channelProvider);
    await payRepo.insertPaymentOrder(payDb, {
      id: paymentOrderId,
      user_id: userId,
      order_id: order.id,
      order_no: order.order_no,
      channel_id: channel.id,
      channel_code: channel.code,
      provider: channelProvider,
      amount,
      currency: channel.currency || 'MYR',
      status: 'pending',
      idempotency_key: idempotencyKey || `${channelProvider}:${channel.code}:${order.id}:${paymentOrderId}`,
      payment_transaction_no: '',
      payment_time: null,
      metadata: {
        channel_config: { environment: channel.environment },
        gateway: { provider: channelProvider, gateway_mode: 'creating' },
        url: null,
        return_url: returnUrl || '',
      },
    });
    let intent = null;
    try {
      intent = await providerAdapter.createIntent({
        channel,
        order,
        paymentOrderId,
        returnUrl,
        provider: channelProvider,
      });
    } catch (err) {
      await payRepo.updatePaymentOrderFailed(payDb, paymentOrderId, {
        metadata: {
          channel_config: { environment: channel.environment },
          gateway: { provider: channelProvider, gateway_mode: 'failed' },
          url: null,
          return_url: returnUrl || '',
          error_message: err?.message || '支付网关创建失败',
        },
      });
      throw err;
    }
    await payRepo.updatePaymentOrderMetadata(payDb, paymentOrderId, {
      channel_config: { environment: channel.environment },
      gateway: intent.raw,
      url: intent.redirectUrl,
      return_url: returnUrl || '',
    });
    return {
      data: {
        payment_order_id: paymentOrderId,
        status: 'pending',
        redirect_url: intent.redirectUrl,
        client_instructions: intent.redirectUrl
          ? '请跳转至马来西亚本地支付网关完成付款'
          : '支付单已创建，等待马来西亚本地网关回调确认',
      },
      message: intent.redirectUrl ? '正在跳转支付' : '本地支付单已创建',
    };
  }

  throw new ValidationError('不支持的支付渠道');
}

async function markOrderPaidFromProvider(conn, order, paymentOrder, transactionNo, payloadSummary) {
  if (order.status !== ORDER_STATUS.PENDING || (order.payment_status || PAYMENT_STATUS.PENDING) !== PAYMENT_STATUS.PENDING) {
    return { skipped: true, reason: 'order_not_pending' };
  }
  const isGiftCashOrder = String(order.order_type || '') === 'points_gift';
  const paidUpdated = await orderRepo.updateOrderPaid(conn, order.id, {
    paymentTime: new Date(),
    paymentChannel: paymentOrder.channel_code,
    paymentTransactionNo: transactionNo,
    paymentMethod: isGiftCashOrder ? 'points_plus_cash' : 'online',
    paymentProvider: paymentOrder.provider,
    providerPaymentId: transactionNo,
    paidAmount: Number(paymentOrder.amount || order.total_amount || 0),
  });
  if (!paidUpdated) {
    return { skipped: true, reason: 'already_paid' };
  }
  await confirmOrderInventoryOnPayment(conn, order, 'provider_payment_success');
  if (isGiftCashOrder) {
    await getLoyaltyApi().finalizeGiftOrderFulfillment(conn, order);
  } else {
    const lineItems = await orderRepo.selectOrderItemQtyRows(conn, order.id);
    for (const it of lineItems) {
      await orderRepo.incrementProductSales(conn, it.product_id, Number(it.qty));
    }
  }
  await requireUserApi('syncStatsAfterOrderPaid')(order.user_id, toMoney(order.total_amount), order.id, conn);
  await grantPaymentSuccessPoints(conn, order, 'provider_payment_success');
  await grantReferralRewardsOnPayment(conn, order, 'provider_payment_success');
  await payRepo.insertAnalyticsEvent(conn, {
    user_id: order.user_id,
    dedupe_key: `payment_success:${order.id}`,
    event_type: 'payment_success',
    module: paymentOrder.channel_code || paymentOrder.provider || 'payment',
    page: '/checkout',
    order_id: order.id,
    amount: toMoney(order.total_amount),
    quantity: 1,
  });
  await checkoutAbandonmentRepo.markPaidByOrderId(conn, order.id);
  try {
    await requireUserApi('refreshUserMemberLevel')(conn, order.user_id);
    await payRepo.insertAnalyticsEvent(conn, {
      user_id: order.user_id,
      dedupe_key: `payment_success:${order.id}`,
      event_type: 'payment_success',
      module: 'admin_mark_paid',
      page: '/admin/orders',
      order_id: order.id,
      amount: toMoney(order.total_amount),
      quantity: 1,
    });
  } catch (e) {
    console.error('[markOrderPaidFromProvider] refreshUserMemberLevel failed:', e?.message || e);
  }
  await payRepo.updatePaymentOrderPaid(conn, paymentOrder.id, {
    payment_transaction_no: transactionNo,
    payment_time: new Date(),
    metadata: payloadSummary,
  });

  const channel = await payRepo.selectChannelByCode(conn, paymentOrder.channel_code);
  const cfg = parseJson(channel?.config_json);
  const gross = toMoney(paymentOrder.amount);
  const rate = toMoney(cfg.fee_rate_percent);
  const fixed = toMoney(cfg.fee_fixed);
  const feeAmount = Math.max(0, (gross * rate) / 100 + fixed);
  const net = Math.max(0, gross - feeAmount);
  try {
    await payRepo.insertPaymentFee(conn, {
      id: generateId(),
      payment_order_id: paymentOrder.id,
      fee_rate_percent: rate,
      fee_fixed: fixed,
      fee_amount: feeAmount,
      net_amount: net,
    });
  } catch (e) {
    if (e?.code !== 'ER_DUP_ENTRY') throw e;
  }
  try {
    await requireOrderApi('recomputeOrderProfitAmounts')(conn, order.id, {});
  } catch (e) {
    console.error('[markOrderPaidFromProvider] recomputeOrderProfitAmounts failed:', e?.message || e);
  }
  return { ok: true };
}

async function getIntent(userId, paymentOrderId) {
  const row = await payRepo.selectPaymentOrderByIdAndUser(payDb, paymentOrderId, userId);
  if (!row) throw new NotFoundError('支付单不存在');
  let meta = row.metadata;
  if (typeof meta === 'string') {
    try { meta = JSON.parse(meta); } catch { meta = {}; }
  }
  return {
    data: {
      id: row.id,
      order_id: row.order_id,
      channel_code: row.channel_code,
      provider: row.provider,
      amount: toMoney(row.amount),
      currency: row.currency,
      status: row.status,
      payment_transaction_no: row.payment_transaction_no,
      payment_time: row.payment_time,
      metadata: meta,
    },
  };
}

/**
 * Stripe Webhook 成功后写入支付单、事件和手续费快照（订单已由订单支付服务更新）。
 */
async function recordStripeCapture(orderId, paymentIntentId, stripeEventId, payloadSummary) {
  const order = await orderRepo.selectOrderById(payDb, orderId);
  if (!order) return { skipped: true };

  let paymentOrderId = payloadSummary?.payment_order_id;
  if (!paymentOrderId) {
    paymentOrderId = await payRepo.selectLatestPendingStripePaymentOrderIdByOrderId(payDb, orderId);
  }
  if (paymentOrderId) {
    await payRepo.updatePaymentOrderPaid(payDb, paymentOrderId, {
      payment_transaction_no: paymentIntentId || '',
      payment_time: new Date(),
      metadata: { ...(payloadSummary || {}), stripe_event_id: stripeEventId },
    });
  } else {
    paymentOrderId = generateId();
    const channel = await payRepo.selectChannelByCode(payDb, 'stripe_checkout');
    await payRepo.insertPaymentOrder(payDb, {
      id: paymentOrderId,
      user_id: order.user_id,
      order_id: order.id,
      order_no: order.order_no,
      channel_id: channel?.id || null,
      channel_code: 'stripe_checkout',
      provider: 'stripe',
      amount: toMoney(order.total_amount),
      currency: 'MYR',
      status: 'paid',
      idempotency_key: null,
      payment_transaction_no: paymentIntentId || '',
      payment_time: new Date(),
      metadata: { backfilled: true, stripe_event_id: stripeEventId },
    });
  }

  try {
    await payRepo.insertPaymentEvent(payDb, {
      id: generateId(),
      payment_order_id: paymentOrderId,
      order_id: orderId,
      provider: 'stripe',
      provider_event_id: stripeEventId,
      event_type: 'payment_intent.succeeded',
      verify_status: 'success',
      processing_result: 'success',
      payload_json: payloadSummary || {},
      error_message: '',
    });
  } catch (e) {
    if (e?.code !== 'ER_DUP_ENTRY') throw e;
  }

  const feeCfg = await payRepo.selectChannelByCode(payDb, 'stripe_checkout');
  let rate = 0;
  let fixed = 0;
  if (feeCfg?.config_json) {
    const cj = typeof feeCfg.config_json === 'string' ? JSON.parse(feeCfg.config_json) : feeCfg.config_json;
    rate = toMoney(cj.fee_rate_percent);
    fixed = toMoney(cj.fee_fixed);
  }
  const gross = toMoney(order.total_amount);
  const feeAmount = Math.max(0, (gross * rate) / 100 + fixed);
  const net = Math.max(0, gross - feeAmount);
  try {
    await payRepo.insertPaymentFee(payDb, {
      id: generateId(),
      payment_order_id: paymentOrderId,
      fee_rate_percent: rate,
      fee_fixed: fixed,
      fee_amount: feeAmount,
      net_amount: net,
    });
  } catch (e) {
    if (e?.code !== 'ER_DUP_ENTRY') throw e;
  }
  try {
    await requireOrderApi('recomputeOrderProfitAmounts')(payDb, order.id, {});
  } catch (e) {
    console.error('[recordStripeCapture] recomputeOrderProfitAmounts failed:', e?.message || e);
  }

  try {
    await payRepo.insertAnalyticsEvent(payDb, {
      user_id: order.user_id || null,
      dedupe_key: `payment_success:${order.id}`,
      event_type: 'payment_success',
      module: 'stripe_webhook',
      page: '/checkout',
      order_id: order.id,
      amount: toMoney(order.total_amount),
      quantity: 1,
      device: 'server',
      user_agent: 'server',
    });
  } catch {
    // best effort analytics
  }

  return { ok: true, payment_order_id: paymentOrderId };
}

async function listPaymentOrdersAdmin(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize, 10) || 20));
  return payRepo.listPaymentOrdersAdmin(payDb, {
    page,
    pageSize,
    status: query.status || '',
    channelCode: query.channelCode || '',
    provider: query.provider || '',
    keyword: query.keyword || '',
    orderId: query.orderId || '',
  });
}

async function listPaymentEventsAdmin(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize, 10) || 20));
  return payRepo.listPaymentEventsAdmin(payDb, {
    page,
    pageSize,
    provider: query.provider || '',
    orderId: query.orderId || '',
    eventType: query.eventType || '',
    verifyStatus: query.verifyStatus || '',
    processingResult: query.processingResult || '',
    reviewStatus: query.reviewStatus || '',
    keyword: query.keyword || '',
  });
}

async function listRefundEventsForReturn(orderId, returnId) {
  if (!orderId || !returnId) return [];
  const rows = await payRepo.selectRefundEventsForReturn(payDb, orderId, returnId);
  return rows.map(formatRefundEventForUser);
}

async function markOrderPaidByAdmin(req, orderId, body) {
  const {
    reason,
    channel_code: channelCode,
    payment_channel: paymentChannel,
    payment_reference: paymentReference,
    admin_remark: adminRemark,
  } = body || {};
  const adminUserId = req.user?.id;
  const conn = await payRepo.getConnection();
  try {
    await conn.beginTransaction();
    const order = await orderRepo.selectOrderByIdOrOrderNoForUpdate(conn, orderId);
    if (!order) throw new NotFoundError('订单不存在');
    if (order.status !== ORDER_STATUS.PENDING || (order.payment_status || PAYMENT_STATUS.PENDING) !== PAYMENT_STATUS.PENDING) {
      throw new ValidationError('订单状态不允许补记为已支付');
    }

    const chCode = paymentChannel || channelCode || 'manual_bank';
    const channel = await payRepo.selectChannelByCode(conn, chCode);
    const paymentOrderId = generateId();
    const total = toMoney(order.total_amount);
    await payRepo.insertPaymentOrder(conn, {
      id: paymentOrderId,
      user_id: order.user_id,
      order_id: order.id,
      order_no: order.order_no,
      channel_id: channel?.id || null,
      channel_code: chCode,
      provider: 'manual',
      amount: total,
      currency: 'MYR',
      status: 'pending',
      idempotency_key: `admin_mark:${orderId}:${Date.now()}`,
      payment_transaction_no: '',
      payment_time: null,
      metadata: { admin_mark: true },
    });

    const txNo = paymentReference || `ADM-${Date.now()}`;
    const paidUpdated = await orderRepo.updateOrderPaid(conn, order.id, {
      paymentTime: new Date(),
      paymentChannel: 'manual',
      paymentTransactionNo: txNo,
    paymentMethod: 'manual',
    paymentProvider: 'manual',
    providerPaymentId: txNo,
    paidAmount: total,
  });
    if (!paidUpdated) {
      throw new ValidationError('订单状态已变更，请刷新后重试');
    }
    await confirmOrderInventoryOnPayment(conn, order, 'admin_mark_payment_success');
    await requireUserApi('syncStatsAfterOrderPaid')(order.user_id, total, order.id, conn);
    await grantPaymentSuccessPoints(conn, order, 'admin_mark_payment_success');
    await grantReferralRewardsOnPayment(conn, order, 'admin_mark_payment_success');
    await requireUserApi('refreshUserMemberLevel')(conn, order.user_id);

    const isGiftOrder = String(order.order_type || '') === 'points_gift';
    if (isGiftOrder) {
      await getLoyaltyApi().finalizeGiftOrderFulfillment(conn, order);
    } else {
      const itemRows = await orderRepo.selectOrderItemQtyRows(conn, order.id);
      for (const it of itemRows) {
        if (it?.product_id && Number(it.qty) > 0) {
          await orderRepo.incrementProductSales(conn, it.product_id, Number(it.qty));
        }
      }
    }

    await payRepo.updatePaymentOrderPaid(conn, paymentOrderId, {
      payment_transaction_no: txNo,
      payment_time: new Date(),
      metadata: {
        admin_mark: true,
        reason: reason || '',
        admin_remark: adminRemark || '',
        payment_reference: txNo,
      },
    });

    await payRepo.insertPaymentFee(conn, {
      id: generateId(),
      payment_order_id: paymentOrderId,
      fee_rate_percent: 0,
      fee_fixed: 0,
      fee_amount: 0,
      net_amount: total,
    });
    try {
      await requireOrderApi('recomputeOrderProfitAmounts')(conn, order.id, {});
    } catch (e) {
      console.error('[markOrderPaidByAdmin] recomputeOrderProfitAmounts failed:', e?.message || e);
    }

    await payRepo.insertPaymentEvent(conn, {
      id: generateId(),
      payment_order_id: paymentOrderId,
      order_id: order.id,
      provider: 'manual',
      provider_event_id: txNo,
      event_type: 'admin_mark_paid',
      verify_status: 'success',
      processing_result: 'success',
      payload_json: {
        reason: reason || '',
        operator_id: adminUserId,
        admin_remark: adminRemark || '',
        payment_reference: txNo,
      },
      error_message: '',
    });

    await conn.commit();
    publishAdminEvent({
      type: 'order.payment_success',
      objectId: order.id,
      summary: order.order_no,
    });
    publishAdminEvent({
      type: 'payment.event',
      objectId: paymentOrderId,
      summary: order.order_no,
    });
    emitAdminEvent({
      eventType: 'payment.manual_mark_paid',
      category: 'payment',
      severity: 'P2',
      status: 'resolved',
      title: '手动标记已支付',
      message: `管理员手动将订单 ${order.order_no} 标记为已支付`,
      entityType: 'order',
      entityId: order.id,
      fingerprint: {
        eventType: 'payment.manual_mark_paid',
        entityType: 'order',
        entityId: order.id,
        paymentReference: txNo,
      },
      payload: {
        orderNo: order.order_no,
        paymentOrderId,
        paymentReference: txNo,
        reason: reason || '',
        adminRemark: adminRemark || '',
      },
      impactAmount: total,
      source: 'admin_mark_paid',
    }, { operatorId: adminUserId, operatorType: 'admin' });
    emitAdminEvent({
      eventType: 'order.paid',
      category: 'order',
      severity: 'P2',
      title: '订单已付款',
      message: `订单 ${order.order_no} 已付款`,
      entityType: 'order',
      entityId: order.id,
      fingerprint: { eventType: 'order.paid', entityType: 'order', entityId: order.id },
      payload: { orderNo: order.order_no, paymentOrderId, channel: chCode, source: 'manual_admin' },
      impactAmount: total,
      source: 'admin_mark_paid',
    }, { operatorId: adminUserId, operatorType: 'admin' });
    await notifyTelegramOrderPaid(order.id, 'manual_admin');
    try {
        await requireMyinvoisApi('enqueueOrderInvoiceIfEnabled')(order.id, 'admin_mark_paid');
    } catch (e) {
      console.error('[MyInvois] enqueue invoice after admin mark-paid failed:', e?.message || e);
    }

    await writeAuditLog({
      req,
      operatorId: adminUserId,
      actionType: 'payment.order_mark_paid',
      objectType: 'order',
      objectId: orderId,
      summary: '管理员标记订单已支付',
      after: {
        payment_order_id: paymentOrderId,
        channel_code: chCode,
        payment_reference: txNo,
        admin_remark: adminRemark || '',
      },
      result: 'success',
    });

    const manualPayCopy = await requireAdminApi('getResolvedTriggerCopy')('manual_order_mark_paid', { order_no: order.order_no });
    if (manualPayCopy) {
      await orderRepo.insertNotification(payDb, {
        id: generateId(),
        userId: order.user_id,
        type: 'order',
        title: manualPayCopy.title,
        content: manualPayCopy.content,
      });
    }

    return { message: '订单已标记为已支付' };
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

async function recordRefundByAdmin(req, orderId, body, externalConn = null) {
  const amount = toMoney(body.amount);
  if (amount <= 0) throw new ValidationError('退款金额必须大于 0');
  const conn = externalConn || await payRepo.getConnection();
  const ownConn = !externalConn;
  let order = null;
  let result = null;
  try {
    if (ownConn) await conn.beginTransaction();
    order = await orderRepo.selectOrderByIdForUpdate(conn, orderId);
    if (!order) throw new NotFoundError('订单不存在');
    if (!['paid', 'partially_refunded'].includes(order.payment_status || '')) {
      throw new ValidationError('仅已支付订单可记录退款');
    }

    const eventId = body.refund_reference || `refund_${order.id}_${Date.now()}`;
    result = await orderRepo.applyOrderRefundCompensation(conn, {
      order,
      refundAmount: amount,
      refundReference: eventId,
      reason: body.reason || '',
      mode: body.mode || 'manual',
      operatorId: req.user?.id || null,
      insertPaymentEvent: async (q, ctx) => {
        const { order: o, amount: amt, isFullRefund, refundReference, reason, mode } = ctx;
        await payRepo.insertPaymentEvent(q, {
          id: generateId(),
          payment_order_id: null,
          order_id: o.id,
          provider: o.payment_provider || o.payment_channel || 'manual',
          provider_event_id: refundReference,
          event_type: mode === 'provider' ? 'refund.provider_recorded' : 'refund.manual_recorded',
          verify_status: mode === 'provider' ? 'success' : 'manual',
          processing_result: isFullRefund ? 'refunded' : 'partially_refunded',
          payload_json: {
            amount: amt,
            currency: 'MYR',
            reason: reason || '',
            refund_reference: refundReference,
            mode: mode || 'manual',
          },
          error_message: '',
        });
      },
      options: {
        restoreStock: body.restore_stock === true,
        restoreCoupon: body.restore_coupon === true,
        reversePoints: body.reverse_points !== false,
        reverseRewards: body.reverse_rewards === true,
        decrementSales: body.decrement_sales !== false,
        reverseWallet: body.reverse_wallet !== false,
        trigger: 'payment_refund_record',
      },
    });

    if (ownConn) await conn.commit();

    if (ownConn) {
      emitAdminEvent({
        eventType: 'refund.requested',
        category: 'refund',
        severity: 'P2',
        status: 'resolved',
        title: '退款处理完成',
        message: `订单 ${order.order_no} 已记录退款 RM ${amount.toFixed(2)}`,
        entityType: 'order',
        entityId: order.id,
        fingerprint: {
          eventType: 'refund.requested',
          entityType: 'order',
          entityId: order.id,
          refundReference: eventId,
        },
        payload: {
          orderNo: order.order_no,
          refundAmount: amount,
          refundReference: eventId,
          refundStatus: result.refundStatus,
          refundedAmount: result.refundedAmount,
        },
        impactAmount: amount,
        source: 'payment_refund_record',
      }, { operatorId: req.user?.id || null, operatorType: 'admin' });
      if (Number(result.refundedAmount || 0) > Number(order.total_amount || 0)) {
        emitAdminEvent({
          eventType: 'refund.exceeds_paid',
          category: 'refund',
          severity: 'P0',
          title: '退款金额超过实付金额',
          message: `订单 ${order.order_no} 累计退款超过订单金额`,
          entityType: 'order',
          entityId: order.id,
          fingerprint: { eventType: 'refund.exceeds_paid', entityType: 'order', entityId: order.id },
          payload: { orderNo: order.order_no, refundedAmount: result.refundedAmount, paidAmount: order.total_amount },
          impactAmount: Number(result.refundedAmount || 0) - Number(order.total_amount || 0),
          source: 'payment_refund_record',
        }, { operatorId: req.user?.id || null, operatorType: 'admin' });
      }
      await writeAuditLog({
        req,
        operatorId: req.user?.id,
        actionType: 'payment.refund_record',
        objectType: 'order',
        objectId: order.id,
        summary: `记录退款 RM ${amount.toFixed(2)} (${result.isFullRefund ? '全额' : '部分'})`,
        after: {
          amount,
          paymentStatus: result.paymentStatus,
          refundStatus: result.refundStatus,
          refundedAmount: result.refundedAmount,
          reason: body.reason || '',
        },
        result: 'success',
      });
      try {
        await requireMyinvoisApi('enqueueRefundCreditNoteIfEnabled')({ orderId: order.id }, 'payment_refund_recorded');
      } catch (e) {
        console.error('[MyInvois] enqueue credit note after refund record failed:', e?.message || e);
      }
    }
    return {
      data: {
        order_id: order.id,
        payment_status: result.paymentStatus,
        refund_status: result.refundStatus,
        refunded_amount: result.refundedAmount,
      },
      message: '退款记录已保存',
      result,
    };
  } catch (err) {
    if (ownConn) await conn.rollback();
    await writeAuditLog({
      req,
      operatorId: req.user?.id,
      actionType: 'payment.refund_record',
      objectType: 'order',
      objectId: orderId,
      summary: '记录退款失败',
      result: 'failure',
      errorMessage: err.message || String(err),
    }).catch(() => {});
    throw err;
  } finally {
    if (ownConn) conn.release();
  }
}

async function replayEvent(req, eventId) {
  const ev = await payRepo.selectPaymentEventById(payDb, eventId);
  if (!ev) throw new NotFoundError('Event not found');
  await writeAuditLog({
    req,
    operatorId: req.user?.id,
    actionType: 'payment.event_replay',
    objectType: 'payment_event',
    objectId: eventId,
    summary: '管理员触发支付事件重放（仅审计）',
    after: { event_type: ev.event_type, provider: ev.provider },
    result: 'success',
  });
  return { data: { event: ev }, message: '重放操作已记录（实际重放请使用支付网关接口）' };
}

async function listReconciliations(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize, 10) || 20));
  return payRepo.listReconciliations(payDb, {
    page,
    pageSize,
    provider: query.provider || '',
    status: query.status || '',
    reviewStatus: query.reviewStatus || '',
  });
}

async function createReconciliation(req, body) {
  const {
    reconcile_date: reconcileDate,
    provider,
    channel_code: channelCode,
    diff_amount: diffAmount,
    provider_report_amount: providerReportAmount,
    provider_fee_amount: providerFeeAmount,
    provider_reference: providerReference,
    difference_reason: differenceReason,
    notes,
  } = body;
  if (!reconcileDate || !provider) throw new ValidationError('reconcile_date 和 provider 必填');
  const agg = await payRepo.aggregatePaidByDayAndChannel(payDb, reconcileDate, provider, channelCode || '');
  const id = generateId();
  const successAmount = roundMoney(agg.success_amount);
  const feeAmount = providerFeeAmount === undefined ? roundMoney(agg.provider_fee_amount) : roundMoney(providerFeeAmount);
  const expectedSettlementAmount = roundMoney(successAmount - feeAmount);
  const providerReport = optionalMoney(providerReportAmount);
  const hasProviderReport = providerReport !== null;
  const calculatedDiff = hasProviderReport
    ? roundMoney(providerReport - expectedSettlementAmount)
    : roundMoney(diffAmount);
  const status = statusForReconciliation(calculatedDiff, hasProviderReport);
  await payRepo.insertReconciliation(payDb, {
    id,
    reconcile_date: reconcileDate,
    provider,
    channel_code: channelCode || '',
    order_count: agg.order_count || 0,
    success_amount: successAmount,
    provider_report_amount: providerReport,
    provider_fee_amount: feeAmount,
    expected_settlement_amount: expectedSettlementAmount,
    diff_amount: calculatedDiff,
    provider_reference: providerReference || '',
    difference_reason: differenceReason || '',
    status,
    review_status: Math.abs(calculatedDiff) >= 0.01 ? 'needs_review' : 'pending',
    review_notes: '',
    notes: notes || '',
    created_by: req.user?.id || null,
  });
  await writeAuditLog({
    req,
    operatorId: req.user?.id,
    actionType: 'payment.reconciliation_create',
    objectType: 'payment_reconciliation',
    objectId: id,
    summary: `创建对账草稿 ${reconcileDate} ${provider}`,
    after: {
      ...body,
      order_count: agg.order_count || 0,
      success_amount: successAmount,
      provider_fee_amount: feeAmount,
      expected_settlement_amount: expectedSettlementAmount,
      calculated_diff_amount: calculatedDiff,
      status,
    },
    result: 'success',
  });
  return { data: { id }, message: '对账记录已创建' };
}

async function reviewPaymentEvent(req, eventId, body = {}) {
  const reviewStatus = normalizeReviewStatus(body.review_status, 'confirmed');
  const conn = await payRepo.getConnection();
  try {
    await conn.beginTransaction();
    const ev = await payRepo.selectPaymentEventByIdForUpdate(conn, eventId);
    if (!ev) throw new NotFoundError('Event not found');
    await payRepo.updatePaymentEventReview(conn, eventId, {
      review_status: reviewStatus,
      review_note: body.review_note || body.notes || '',
      reviewed_by: req.user?.id || null,
    });
    await conn.commit();
    await writeAuditLog({
      req,
      operatorId: req.user?.id,
      actionType: 'payment.event_review',
      objectType: 'payment_event',
      objectId: eventId,
      summary: '支付事件人工复核',
      before: {
        review_status: ev.review_status || 'pending',
        review_note: ev.review_note || '',
      },
      after: {
        review_status: reviewStatus,
        review_note: body.review_note || body.notes || '',
      },
      result: 'success',
    });
    return { data: { id: eventId, review_status: reviewStatus }, message: '支付事件复核已保存' };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function reviewReconciliation(req, id, body = {}) {
  const reviewStatus = normalizeReviewStatus(body.review_status, 'confirmed');
  const status = reviewStatus === 'confirmed' ? 'confirmed' : 'needs_review';
  const conn = await payRepo.getConnection();
  try {
    await conn.beginTransaction();
    const row = await payRepo.selectReconciliationByIdForUpdate(conn, id);
    if (!row) throw new NotFoundError('Reconciliation not found');
    await payRepo.updateReconciliationReview(conn, id, {
      status,
      review_status: reviewStatus,
      review_notes: body.review_notes || body.review_note || body.notes || '',
      difference_reason: body.difference_reason ?? row.difference_reason ?? '',
      reviewed_by: req.user?.id || null,
    });
    await conn.commit();
    await writeAuditLog({
      req,
      operatorId: req.user?.id,
      actionType: 'payment.reconciliation_review',
      objectType: 'payment_reconciliation',
      objectId: id,
      summary: '支付对账人工复核',
      before: {
        status: row.status,
        review_status: row.review_status || 'pending',
        difference_reason: row.difference_reason || '',
      },
      after: {
        status,
        review_status: reviewStatus,
        difference_reason: body.difference_reason ?? row.difference_reason ?? '',
        review_notes: body.review_notes || body.review_note || body.notes || '',
      },
      result: 'success',
    });
    return { data: { id, status, review_status: reviewStatus }, message: '对账复核已保存' };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function handleManualWebhook(provider, body, headerSecret) {
  if (provider !== 'manual') {
    throw new NotFoundError('未知支付渠道');
  }
  const expected = (process.env.PAYMENT_MANUAL_WEBHOOK_SECRET || '').trim();
  if (!expected) {
    throw new BusinessError(503, '未配置 PAYMENT_MANUAL_WEBHOOK_SECRET');
  }
  const timestamp = String(body?.timestamp || body?.ts || '').trim();
  const nonce = String(body?.nonce || '').trim();
  const signature = String(body?.signature || headerSecret || '').trim().toLowerCase();
  if (!timestamp || !nonce || !signature) {
    emitAdminEvent({
      eventType: 'payment.webhook_signature_failed',
      category: 'payment',
      severity: 'P1',
      title: '支付回调签名失败',
      message: 'manual 支付回调缺少 timestamp / nonce / signature',
      entityType: 'payment_webhook',
      entityId: String(body?.event_id || body?.order_id || 'manual'),
      fingerprint: { eventType: 'payment.webhook_signature_failed', provider: 'manual', eventId: body?.event_id || null, nonce, reason: 'missing_signature', at: Date.now() },
      payload: { provider: 'manual', reason: 'missing_signature', orderId: body?.order_id || null },
      source: 'payment_webhook',
    });
    throw new ValidationError('Webhook 缺少 timestamp / nonce / signature');
  }
  if (!/^\d{10,13}$/.test(timestamp)) throw new ValidationError('Webhook timestamp 格式无效');
  if (nonce.length < 8) throw new ValidationError('Webhook nonce 长度不足');

  const timestampMs = timestamp.length === 13 ? Number(timestamp) : Number(timestamp) * 1000;
  const maxSkewSec = Math.max(30, Number(process.env.PAYMENT_MANUAL_WEBHOOK_MAX_SKEW_SECONDS || 300));
  if (Math.abs(Date.now() - timestampMs) > maxSkewSec * 1000) {
    throw new ValidationError('Webhook timestamp 超出允许时间窗口');
  }

  const payload = buildManualWebhookSigningPayload(body, timestamp, nonce);
  const expectedSignature = crypto.createHmac('sha256', expected).update(payload).digest('hex');
  if (!timingSafeHexEquals(signature, expectedSignature)) {
    emitAdminEvent({
      eventType: 'payment.webhook_signature_failed',
      category: 'payment',
      severity: 'P1',
      title: '支付回调签名失败',
      message: 'manual 支付回调签名校验失败',
      entityType: 'payment_webhook',
      entityId: String(body?.event_id || body?.order_id || 'manual'),
      fingerprint: { eventType: 'payment.webhook_signature_failed', provider: 'manual', eventId: body?.event_id || null, nonce, reason: 'invalid_signature' },
      payload: { provider: 'manual', reason: 'invalid_signature', orderId: body?.order_id || null },
      source: 'payment_webhook',
    });
    throw new ValidationError('Webhook 签名校验失败');
  }

  const eventId = String(body?.event_id || '').trim();
  if (!eventId) throw new ValidationError('event_id 必填');
  const exists = await payRepo.selectPaymentEventByProviderEventId(payDb, 'manual', eventId);
  if (exists) {
    return { data: { received: true, duplicate: true }, message: '重复事件已忽略' };
  }

  const orderId = body?.order_id;
  if (!orderId) throw new ValidationError('order_id 必填');

  await payRepo.insertPaymentEvent(payDb, {
    id: generateId(),
    payment_order_id: null,
    order_id: orderId,
    provider: 'manual',
    provider_event_id: eventId,
    event_type: 'manual_webhook_received',
    verify_status: 'success',
    processing_result: 'logged',
    payload_json: {
      body: { ...body, signature: '[redacted]' },
      verify: { timestamp, nonce, max_skew_seconds: maxSkewSec },
    },
    error_message: '',
  });
  return { data: { received: true }, message: '手动支付回调已记录' };
}

async function handleMalaysiaLocalWebhook(provider, body, headers = {}) {
  const normalizedProvider = normalizePaymentProvider(provider);
  if (!MALAYSIA_REDIRECT_PROVIDERS.has(normalizedProvider)) {
    throw new NotFoundError('未知 provider');
  }
  const expectedSecret = getMalaysiaWebhookSecret(normalizedProvider);
  const providerAdapter = getMalaysiaProviderAdapter(normalizedProvider);
  const headerSecret = headers['x-webhook-secret'];
  const headerSignature = headers['x-payment-signature'] || headers['x-signature'];
  if (!expectedSecret) {
    throw new BusinessError(503, `未配置 ${normalizedProvider} Webhook Secret`);
  }
  if (headerSecret) {
    if (String(headerSecret) !== expectedSecret) {
      await recordWebhookFailureEvent(normalizedProvider, body, 'invalid_secret', 'Webhook 密钥无效');
      emitAdminEvent({
        eventType: 'payment.webhook_signature_failed',
        category: 'payment',
        severity: 'P1',
        title: '支付回调签名失败',
        message: `${normalizedProvider} 支付回调密钥无效`,
        entityType: 'payment_webhook',
        entityId: String(body?.event_id || body?.order_id || normalizedProvider),
        fingerprint: { eventType: 'payment.webhook_signature_failed', provider: normalizedProvider, eventId: body?.event_id || null, reason: 'invalid_secret' },
        payload: { provider: normalizedProvider, reason: 'invalid_secret', orderId: body?.order_id || null },
        source: 'payment_webhook',
      });
      throw new ValidationError('Webhook 密钥无效');
    }
  } else {
    const verified = providerAdapter.verifySignature({
      body,
      headerSignature,
      secret: expectedSecret,
    });
    if (!verified.ok) {
      await recordWebhookFailureEvent(
        normalizedProvider,
        body,
        verified.reason || 'invalid_signature',
        `Webhook 签名无效: ${verified.reason}`,
      );
      emitAdminEvent({
        eventType: 'payment.webhook_signature_failed',
        category: 'payment',
        severity: 'P1',
        title: '支付回调签名失败',
        message: `${normalizedProvider} 支付回调签名无效: ${verified.reason}`,
        entityType: 'payment_webhook',
        entityId: String(body?.event_id || body?.order_id || normalizedProvider),
        fingerprint: { eventType: 'payment.webhook_signature_failed', provider: normalizedProvider, eventId: body?.event_id || null, reason: verified.reason || 'invalid_signature' },
        payload: { provider: normalizedProvider, reason: verified.reason || 'invalid_signature', orderId: body?.order_id || null },
        source: 'payment_webhook',
      });
      throw new ValidationError(`Webhook 签名无效: ${verified.reason}`);
    }
  }

  const normalizedPayload = typeof providerAdapter.normalizeWebhookPayload === 'function'
    ? providerAdapter.normalizeWebhookPayload(body)
    : null;
  const providerEventId = String(normalizedPayload?.eventId || body.event_id || body.transaction_id || body.reference || '').trim();
  if ((normalizedProvider === 'billplz' || normalizedProvider === 'fpx') && !providerEventId) {
    await recordWebhookFailureEvent(
      normalizedProvider,
      body,
      'missing_provider_event_id',
      'Webhook provider event id 必填',
    );
    emitAdminEvent({
      eventType: 'payment.webhook_missing_event_id',
      category: 'payment',
      severity: 'P1',
      title: '支付回调缺少事件编号',
      message: `${normalizedProvider} 支付回调缺少 provider event id，已拒绝处理`,
      entityType: 'payment_webhook',
      entityId: String(body?.payment_order_id || body?.reference_1 || normalizedProvider),
      fingerprint: { eventType: 'payment.webhook_missing_event_id', provider: normalizedProvider, paymentOrderId: body?.payment_order_id || body?.reference_1 || null },
      payload: { provider: normalizedProvider, reason: 'missing_provider_event_id', paymentOrderId: body?.payment_order_id || body?.reference_1 || null },
      source: 'payment_webhook',
    });
    throw new ValidationError('Webhook provider event id 必填');
  }
  const eventId = providerEventId || `${normalizedProvider}_${Date.now()}`;
  const normalizedStatus = normalizedPayload?.status || providerAdapter.normalizeWebhookStatus(body.status || body.payment_status);
  const txNo = String(normalizedPayload?.transactionNo || body.transaction_id || body.payment_transaction_no || body.reference || eventId);
  const existingEvent = await payRepo.selectPaymentEventByProviderEventId(payDb, normalizedProvider, eventId);
  if (existingEvent) {
    return { data: { received: true, duplicate: true }, message: '重复事件已忽略' };
  }
  const conn = await payRepo.getConnection();
  let transactionClosed = false;
  try {
    await conn.beginTransaction();
    let paymentOrderId = normalizedPayload?.paymentOrderId || body.payment_order_id || '';
    const orderIdFromWebhook = normalizedPayload?.orderId || body.order_id || '';
    if (!paymentOrderId && orderIdFromWebhook) {
      paymentOrderId = await payRepo.selectLatestPendingPaymentOrderId(conn, {
        orderId: orderIdFromWebhook,
        provider: normalizedProvider,
        channelCode: body.channel_code || '',
      });
    }
    if (!paymentOrderId) throw new ValidationError('payment_order_id 或可匹配的?order_id 必填');

    const paymentOrder = await payRepo.selectPaymentOrderByIdForUpdate(conn, paymentOrderId);
    if (!paymentOrder) throw new NotFoundError('支付单不存在');
    if (paymentOrder.provider !== normalizedProvider) throw new ValidationError('支付单渠道不匹配');
    const order = await orderRepo.selectOrderByIdForUpdate(conn, paymentOrder.order_id);
    if (!order) throw new NotFoundError('订单不存在');

    const webhookOrderNo = String(normalizedPayload?.orderNo || body.order_no || body.reference_2 || '').trim();
    const expectedOrderNo = String(paymentOrder.order_no || order.order_no || '').trim();
    const webhookAmount = normalizedPayload?.amount ?? (body.amount === undefined ? null : toMoney(body.amount));
    const webhookCurrency = String(normalizedPayload?.currency || body.currency || paymentOrder.currency || 'MYR').toUpperCase();
    const expectedAmount = toMoney(paymentOrder.amount);
    const orderNoOk = !webhookOrderNo || !expectedOrderNo || webhookOrderNo === expectedOrderNo;
    const amountOk = webhookAmount === null || Math.abs(webhookAmount - expectedAmount) < 0.01;
    const currencyOk = webhookCurrency === String(paymentOrder.currency || 'MYR').toUpperCase();

    const payloadSummary = {
      provider: normalizedProvider,
      event_id: eventId,
      status: normalizedStatus,
      raw_status: normalizedPayload?.rawStatus || body.status || body.payment_status || '',
      channel_code: paymentOrder.channel_code,
      amount: webhookAmount,
      currency: webhookCurrency,
      provider_payment_id: normalizedPayload?.billId || txNo,
      order_no: webhookOrderNo || '',
      expected_order_no: expectedOrderNo || '',
    };

    if (!orderNoOk) {
      await payRepo.insertPaymentEvent(conn, {
        id: generateId(),
        payment_order_id: paymentOrder.id,
        order_id: order.id,
        provider: normalizedProvider,
        provider_event_id: eventId,
        event_type: `${normalizedProvider}.${normalizedStatus}`,
        verify_status: 'failed',
        processing_result: 'rejected',
        payload_json: payloadSummary,
        error_message: '订单号不匹配',
        failure_reason_code: 'order_no_mismatch',
        expected_amount: expectedAmount,
        actual_amount: webhookAmount,
        expected_currency: paymentOrder.currency || 'MYR',
        actual_currency: webhookCurrency,
        risk_level: 'P0',
        review_status: 'needs_review',
      });
      await conn.commit();
      transactionClosed = true;
      emitAdminEvent({
        eventType: 'payment.order_no_mismatch',
        category: 'payment',
        severity: 'P0',
        title: '支付订单号不一致',
        message: `订单 ${order.order_no} 的 ${normalizedProvider} 回调订单号不匹配`,
        entityType: 'order',
        entityId: order.id,
        fingerprint: {
          eventType: 'payment.order_no_mismatch',
          entityType: 'order',
          entityId: order.id,
          paymentOrderId: paymentOrder.id,
          eventId,
        },
        payload: {
          orderNo: order.order_no,
          paymentOrderId: paymentOrder.id,
          expectedOrderNo,
          webhookOrderNo,
        },
        impactAmount: expectedAmount,
        source: 'payment_webhook',
      });
      throw new ValidationError('Webhook 订单号不匹配');
    }

    if (!amountOk || !currencyOk) {
      await payRepo.insertPaymentEvent(conn, {
        id: generateId(),
        payment_order_id: paymentOrder.id,
        order_id: order.id,
        provider: normalizedProvider,
        provider_event_id: eventId,
        event_type: `${normalizedProvider}.${normalizedStatus}`,
        verify_status: 'failed',
        processing_result: 'rejected',
        payload_json: payloadSummary,
        error_message: '金额或币种不匹配',
        failure_reason_code: amountOk ? 'currency_mismatch' : 'amount_mismatch',
        expected_amount: expectedAmount,
        actual_amount: webhookAmount,
        expected_currency: paymentOrder.currency || 'MYR',
        actual_currency: webhookCurrency,
        risk_level: 'P0',
        review_status: 'needs_review',
      });
      await conn.commit();
      transactionClosed = true;
      emitAdminEvent({
        eventType: amountOk ? 'payment.currency_mismatch' : 'payment.amount_mismatch',
        category: 'payment',
        severity: 'P0',
        title: amountOk ? '支付币种不一致' : '支付金额不一致',
        message: `订单 ${order.order_no} 的 ${normalizedProvider} 回调金额或币种不匹配`,
        entityType: 'order',
        entityId: order.id,
        fingerprint: {
          eventType: amountOk ? 'payment.currency_mismatch' : 'payment.amount_mismatch',
          entityType: 'order',
          entityId: order.id,
          paymentOrderId: paymentOrder.id,
          eventId,
        },
        payload: {
          orderNo: order.order_no,
          paymentOrderId: paymentOrder.id,
          expectedAmount,
          webhookAmount,
          expectedCurrency: paymentOrder.currency || 'MYR',
          webhookCurrency,
        },
        impactAmount: expectedAmount,
        source: 'payment_webhook',
      });
      throw new ValidationError('Webhook 金额或币种不匹配');
    }

    let processingResult = 'logged';
    let shouldQueueMyInvoisInvoice = false;
    if (normalizedStatus === 'paid') {
      if (paymentOrder.status !== 'paid') {
        await markOrderPaidFromProvider(conn, order, paymentOrder, txNo, payloadSummary);
        shouldQueueMyInvoisInvoice = true;
      }
      processingResult = 'success';
    } else if (normalizedStatus === 'failed') {
      await payRepo.updatePaymentOrderFailed(conn, paymentOrder.id, {
        payment_transaction_no: txNo,
        metadata: payloadSummary,
      });
      processingResult = 'failed';
    }

    try {
      await payRepo.insertPaymentEvent(conn, {
        id: generateId(),
        payment_order_id: paymentOrder.id,
        order_id: order.id,
        provider: normalizedProvider,
        provider_event_id: eventId,
        event_type: `${normalizedProvider}.${normalizedStatus}`,
        verify_status: 'success',
        processing_result: processingResult,
        payload_json: payloadSummary,
        error_message: normalizedStatus === 'failed' ? (body.reason || body.error || '支付网关返回失败') : '',
        failure_reason_code: normalizedStatus === 'failed' ? failureReasonFromWebhook(body, 'provider_failed') : '',
        expected_amount: expectedAmount,
        actual_amount: webhookAmount,
        expected_currency: paymentOrder.currency || 'MYR',
        actual_currency: webhookCurrency,
        risk_level: normalizedStatus === 'failed' ? 'P2' : '',
        review_status: normalizedStatus === 'failed' ? 'needs_review' : 'pending',
      });
    } catch (e) {
      if (e?.code !== 'ER_DUP_ENTRY') throw e;
    }

    await conn.commit();
    transactionClosed = true;
    if (shouldQueueMyInvoisInvoice) {
      emitAdminEvent({
        eventType: 'order.paid',
        category: 'order',
        severity: 'P2',
        title: '订单已付款',
        message: `订单 ${order.order_no} 已通过 ${normalizedProvider} 付款`,
        entityType: 'order',
        entityId: order.id,
        fingerprint: { eventType: 'order.paid', entityType: 'order', entityId: order.id },
        payload: { orderNo: order.order_no, paymentOrderId: paymentOrder.id, channel: paymentOrder.channel_code, eventId },
        impactAmount: expectedAmount,
        source: `${normalizedProvider}_webhook`,
      });
      await notifyTelegramOrderPaid(order.id, normalizedProvider);
      try {
        await requireMyinvoisApi('enqueueOrderInvoiceIfEnabled')(order.id, `${normalizedProvider}_paid`);
      } catch (e) {
        console.error('[MyInvois] enqueue invoice after local payment failed:', e?.message || e);
      }
    }
    return {
      data: {
        received: true,
        payment_order_id: paymentOrder.id,
        order_id: order.id,
        status: normalizedStatus,
      },
      message: '马来西亚本地支付事件已处理',
    };
  } catch (e) {
    if (!transactionClosed) await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

module.exports = {
  listChannelsForUser,
  listChannelsAdmin,
  updateChannelAdmin,
  payWithRewardWallet,
  createStripeCheckoutForOrder,
  createIntent,
  getIntent,
  recordStripeCapture,
  listPaymentOrdersAdmin,
  listPaymentEventsAdmin,
  listRefundEventsForReturn,
  markOrderPaidByAdmin,
  recordRefundByAdmin,
  replayEvent,
  listReconciliations,
  createReconciliation,
  reviewPaymentEvent,
  reviewReconciliation,
  handleManualWebhook,
  handleMalaysiaLocalWebhook,
};

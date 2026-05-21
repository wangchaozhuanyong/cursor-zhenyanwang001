const { generateId } = require('../../../utils/helpers');
const {
  BusinessError,
  NotFoundError,
  ValidationError,
} = require('../../../errors');
const payRepo = require('../repository/payments.repository');
const manualProvider = require('../providers/manualProvider');
const malaysiaLocalProvider = require('../providers/malaysiaLocalProvider');
const { ORDER_STATUS, PAYMENT_STATUS } = require('../../../constants/status');
const { writeAuditLog } = require('../../../utils/auditLog');
const crypto = require('crypto');
const payDb = payRepo.getPool();

function publishAdminEvent(event) {
  try {
    require('../../admin/service/adminEventBus.service').publishAdminEvent(event);
  } catch {
    // Best-effort realtime signal; payment processing must not depend on SSE.
  }
}

function emitAdminEvent(event, options = {}) {
  try {
    void require('../../admin/service/adminEvent.service').emitEvent(event, {
      operatorId: options.operatorId || null,
      operatorType: options.operatorType || 'system',
      source: options.source || event.source || 'payment',
    });
  } catch {
    // Event center is best-effort; payment state changes must not depend on it.
  }
}

function getTelegramApi() {
  return /** @type {any} */ (require('../../telegram')).api || {};
}

function getOrderApi() {
  return /** @type {any} */ (require('../../order')).api || {};
}

function getAdminApi() {
  return /** @type {any} */ (require('../../admin')).api || {};
}

function getUserApi() {
  return /** @type {any} */ (require('../../user')).api || {};
}

function getMyinvoisApi() {
  return /** @type {any} */ (require('../../myinvois')).api || {};
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

function parseJson(value, fallback = {}) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
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
  const filtered = rows.filter((r) => {
    if (r.code === 'stripe_checkout' && r.provider === 'stripe' && !stripeReady) return false;
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
 * 返现钱包支付（从订单域迁入，统一走支付单记录�? */
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
      throw new ValidationError(`返现钱包余额不足，当前可用 ?RM ${balance.toFixed(2)}`);
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
      type: 'consume_order',
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
    });
    if (!paidUpdated) {
      throw new ValidationError('订单状态已变更，请刷新后重试');
    }
    await requireUserApi('syncStatsAfterOrderPaid')(userId, payableAmount, lockedOrder.id, conn);
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
  if (order.payment_method !== 'online') {
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
    success_url: `${base}/orders/${orderId}?stripe=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/orders/${orderId}?stripe=cancel`,
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

  if (channel.provider === 'internal' && channel.code === 'reward_wallet') {
    throw new ValidationError('返现钱包请使用 POST /orders/:id/pay，channel=reward_wallet');
  }

  if (channel.provider === 'stripe') {
    const r = await createStripeCheckoutForOrder(userId, orderId, returnUrl, idempotencyKey);
    return { data: { payment_order_id: r.data.payment_order_id, status: 'pending', redirect_url: r.data.url }, message: '正在跳转支付' };
  }

  if (channel.provider === 'manual') {
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

  if (channel.provider === 'malaysia_local') {
    const order = await orderRepo.selectOrderByIdAndUser(payDb, orderId, userId);
    if (!order) throw new NotFoundError('订单不存在');
    if (order.status !== ORDER_STATUS.PENDING || (order.payment_status || PAYMENT_STATUS.PENDING) !== PAYMENT_STATUS.PENDING) {
      throw new ValidationError('当前订单状态无法创建支付单');
    }
    if (order.payment_method !== 'online') {
      throw new ValidationError('该订单非在线支付');
    }
    const amount = toMoney(order.total_amount);
    if (amount <= 0) throw new ValidationError('订单金额无效');
    const paymentOrderId = generateId();
    const intent = await malaysiaLocalProvider.createIntent({
      channel,
      order,
      paymentOrderId,
      returnUrl,
    });
    await payRepo.insertPaymentOrder(payDb, {
      id: paymentOrderId,
      user_id: userId,
      order_id: order.id,
      order_no: order.order_no,
      channel_id: channel.id,
      channel_code: channel.code,
      provider: 'malaysia_local',
      amount,
      currency: channel.currency || 'MYR',
      status: 'pending',
      idempotency_key: idempotencyKey || `malaysia_local:${channel.code}:${order.id}:${paymentOrderId}`,
      payment_transaction_no: '',
      payment_time: null,
      metadata: {
        channel_config: { environment: channel.environment },
        gateway: intent.raw,
        url: intent.redirectUrl,
        return_url: returnUrl || '',
      },
    });
    return {
      data: {
        payment_order_id: paymentOrderId,
        status: 'pending',
        redirect_url: intent.redirectUrl,
        client_instructions: intent.redirectUrl
          ? '请跳转至本地支付网关完成付款'
          : '支付单已创建，等待本地网关回调确认',
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
  const paidUpdated = await orderRepo.updateOrderPaid(conn, order.id, {
    paymentTime: new Date(),
    paymentChannel: paymentOrder.channel_code,
    paymentTransactionNo: transactionNo,
    paymentMethod: 'online',
    paymentProvider: paymentOrder.provider,
    providerPaymentId: transactionNo,
  });
  if (!paidUpdated) {
    return { skipped: true, reason: 'already_paid' };
  }
  await requireUserApi('syncStatsAfterOrderPaid')(order.user_id, toMoney(order.total_amount), order.id, conn);
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
  const itemRows = await orderRepo.selectOrderItemQtyRows(conn, order.id);
  for (const it of itemRows) {
    if (it?.product_id && Number(it.qty) > 0) {
      await orderRepo.incrementProductSales(conn, it.product_id, Number(it.qty));
    }
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
 * Stripe Webhook 成功后写入支付单 / 事件 / 手续费快照（订单已由 order/payment.service 更新�? */
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
  });
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
  });
    if (!paidUpdated) {
      throw new ValidationError('订单状态已变更，请刷新后重试');
    }
    await requireUserApi('syncStatsAfterOrderPaid')(order.user_id, total, order.id, conn);
    await requireUserApi('refreshUserMemberLevel')(conn, order.user_id);

    const itemRows = await orderRepo.selectOrderItemQtyRows(conn, order.id);
    for (const it of itemRows) {
      if (it?.product_id && Number(it.qty) > 0) {
        await orderRepo.incrementProductSales(conn, it.product_id, Number(it.qty));
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
  return payRepo.listReconciliations(payDb, { page, pageSize });
}

async function createReconciliation(req, body) {
  const {
    reconcile_date: reconcileDate,
    provider,
    channel_code: channelCode,
    diff_amount: diffAmount,
    notes,
  } = body;
  if (!reconcileDate || !provider) throw new ValidationError('reconcile_date 和 provider 必填');
  const agg = await payRepo.aggregatePaidByDay(payDb, reconcileDate, provider);
  const id = generateId();
  await payRepo.insertReconciliation(payDb, {
    id,
    reconcile_date: reconcileDate,
    provider,
    channel_code: channelCode || '',
    order_count: agg.order_count || 0,
    success_amount: toMoney(agg.success_amount),
    diff_amount: toMoney(diffAmount),
    status: 'draft',
    notes: notes || '',
    created_by: req.user?.id || null,
  });
  await writeAuditLog({
    req,
    operatorId: req.adminUser?.id,
    actionType: 'payment.reconciliation_create',
    objectType: 'payment_reconciliation',
    objectId: id,
    summary: `创建对账草稿 ${reconcileDate} ${provider}`,
    after: body,
    result: 'success',
  });
  return { data: { id }, message: '对账记录已创建' };
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
  return { data: { received: true }, message: '????????????????????????' };
}

async function handleMalaysiaLocalWebhook(provider, body, headers = {}) {
  if (!['malaysia-local', 'malaysia_local'].includes(provider)) {
    throw new NotFoundError('未知 provider');
  }
  const expectedSecret = (process.env.PAYMENT_MALAYSIA_WEBHOOK_SECRET || '').trim();
  const headerSecret = headers['x-webhook-secret'];
  const headerSignature = headers['x-payment-signature'] || headers['x-signature'];
  if (!expectedSecret) {
    throw new BusinessError(503, '未配置 ?PAYMENT_MALAYSIA_WEBHOOK_SECRET');
  }
  if (headerSecret) {
    if (String(headerSecret) !== expectedSecret) {
      emitAdminEvent({
        eventType: 'payment.webhook_signature_failed',
        category: 'payment',
        severity: 'P1',
        title: '支付回调签名失败',
        message: 'malaysia_local 支付回调密钥无效',
        entityType: 'payment_webhook',
        entityId: String(body?.event_id || body?.order_id || 'malaysia_local'),
        fingerprint: { eventType: 'payment.webhook_signature_failed', provider: 'malaysia_local', eventId: body?.event_id || null, reason: 'invalid_secret' },
        payload: { provider: 'malaysia_local', reason: 'invalid_secret', orderId: body?.order_id || null },
        source: 'payment_webhook',
      });
      throw new ValidationError('Webhook 密钥无效');
    }
  } else {
    const verified = malaysiaLocalProvider.verifySignature({
      body,
      headerSignature,
      secret: expectedSecret,
    });
    if (!verified.ok) {
      emitAdminEvent({
        eventType: 'payment.webhook_signature_failed',
        category: 'payment',
        severity: 'P1',
        title: '支付回调签名失败',
        message: `malaysia_local 支付回调签名无效: ${verified.reason}`,
        entityType: 'payment_webhook',
        entityId: String(body?.event_id || body?.order_id || 'malaysia_local'),
        fingerprint: { eventType: 'payment.webhook_signature_failed', provider: 'malaysia_local', eventId: body?.event_id || null, reason: verified.reason || 'invalid_signature' },
        payload: { provider: 'malaysia_local', reason: verified.reason || 'invalid_signature', orderId: body?.order_id || null },
        source: 'payment_webhook',
      });
      throw new ValidationError(`Webhook 签名无效: ${verified.reason}`);
    }
  }

  const eventId = String(body.event_id || body.transaction_id || body.reference || `my_${Date.now()}`);
  const normalizedStatus = malaysiaLocalProvider.normalizeWebhookStatus(body.status || body.payment_status);
  const txNo = String(body.transaction_id || body.payment_transaction_no || body.reference || eventId);
  const conn = await payRepo.getConnection();
  try {
    await conn.beginTransaction();
    let paymentOrderId = body.payment_order_id || '';
    if (!paymentOrderId && body.order_id) {
      paymentOrderId = await payRepo.selectLatestPendingPaymentOrderId(conn, {
        orderId: body.order_id,
        provider: 'malaysia_local',
        channelCode: body.channel_code || '',
      });
    }
    if (!paymentOrderId) throw new ValidationError('payment_order_id 或可匹配的?order_id 必填');

    const paymentOrder = await payRepo.selectPaymentOrderByIdForUpdate(conn, paymentOrderId);
    if (!paymentOrder) throw new NotFoundError('支付单不存在');
    if (paymentOrder.provider !== 'malaysia_local') throw new ValidationError('支付单渠道不匹配');
    const order = await orderRepo.selectOrderByIdForUpdate(conn, paymentOrder.order_id);
    if (!order) throw new NotFoundError('订单不存在');

    const webhookAmount = body.amount === undefined ? null : toMoney(body.amount);
    const webhookCurrency = String(body.currency || paymentOrder.currency || 'MYR').toUpperCase();
    const expectedAmount = toMoney(paymentOrder.amount);
    const amountOk = webhookAmount === null || Math.abs(webhookAmount - expectedAmount) < 0.01;
    const currencyOk = webhookCurrency === String(paymentOrder.currency || 'MYR').toUpperCase();

    const payloadSummary = {
      provider: 'malaysia_local',
      event_id: eventId,
      status: normalizedStatus,
      raw_status: body.status || body.payment_status || '',
      channel_code: paymentOrder.channel_code,
      amount: webhookAmount,
      currency: webhookCurrency,
    };

    if (!amountOk || !currencyOk) {
      await payRepo.insertPaymentEvent(conn, {
        id: generateId(),
        payment_order_id: paymentOrder.id,
        order_id: order.id,
        provider: 'malaysia_local',
        provider_event_id: eventId,
        event_type: `malaysia_local.${normalizedStatus}`,
        verify_status: 'failed',
        processing_result: 'rejected',
        payload_json: payloadSummary,
        error_message: '金额或币种不匹配',
      });
      await conn.commit();
      emitAdminEvent({
        eventType: amountOk ? 'payment.currency_mismatch' : 'payment.amount_mismatch',
        category: 'payment',
        severity: 'P0',
        title: amountOk ? '支付币种不一致' : '支付金额不一致',
        message: `订单 ${order.order_no} 的 malaysia_local 回调金额或币种不匹配`,
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
        provider: 'malaysia_local',
        provider_event_id: eventId,
        event_type: `malaysia_local.${normalizedStatus}`,
        verify_status: 'success',
        processing_result: processingResult,
        payload_json: payloadSummary,
        error_message: '',
      });
    } catch (e) {
      if (e?.code !== 'ER_DUP_ENTRY') throw e;
    }

    await conn.commit();
    if (shouldQueueMyInvoisInvoice) {
      emitAdminEvent({
        eventType: 'order.paid',
        category: 'order',
        severity: 'P2',
        title: '订单已付款',
        message: `订单 ${order.order_no} 已通过 malaysia_local 付款`,
        entityType: 'order',
        entityId: order.id,
        fingerprint: { eventType: 'order.paid', entityType: 'order', entityId: order.id },
        payload: { orderNo: order.order_no, paymentOrderId: paymentOrder.id, channel: paymentOrder.channel_code, eventId },
        impactAmount: expectedAmount,
        source: 'malaysia_local_webhook',
      });
      await notifyTelegramOrderPaid(order.id, 'malaysia_local');
      try {
        await requireMyinvoisApi('enqueueOrderInvoiceIfEnabled')(order.id, 'malaysia_local_paid');
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
    await conn.rollback();
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
  markOrderPaidByAdmin,
  recordRefundByAdmin,
  replayEvent,
  listReconciliations,
  createReconciliation,
  handleManualWebhook,
  handleMalaysiaLocalWebhook,
};

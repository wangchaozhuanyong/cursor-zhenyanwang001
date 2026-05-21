const { generateId } = require('../../../utils/helpers');
const { ORDER_STATUS, PAYMENT_STATUS } = require('../../../constants/status');
const paymentsService = require('./payments.service');

function getOrderApi() {
  return /** @type {any} */ (require('../../order')).api || {};
}

function getTelegramApi() {
  return /** @type {any} */ (require('../../telegram')).api || {};
}

function getOrderDb() {
  const api = getOrderApi();
  return typeof api.getOrderPool === 'function' ? api.getOrderPool() : null;
}

function getUserApi() {
  return /** @type {any} */ (require('../../user')).api || {};
}

function getAdminApi() {
  return /** @type {any} */ (require('../../admin')).api || {};
}

function getMyinvoisApi() {
  return /** @type {any} */ (require('../../myinvois')).api || {};
}

function emitAdminEvent(event) {
  try {
    void require('../../admin/service/adminEvent.service').emitEvent(event, {
      operatorType: 'system',
      source: event.source || 'stripe_webhook',
    });
  } catch {
    // Event center is best-effort; webhook processing must not depend on it.
  }
}

function requireAdminApi(name) {
  const fn = getAdminApi()[name];
  if (typeof fn !== 'function') {
    throw new Error(`Admin 模块 API 未暴露方法：${name}`);
  }
  return fn;
}

function requireMyinvoisApi(name) {
  const fn = getMyinvoisApi()[name];
  if (typeof fn !== 'function') {
    throw new Error(`MyInvois 模块 API 未暴露方法：${name}`);
  }
  return fn;
}

function requireOrderApi(name) {
  const fn = getOrderApi()[name];
  if (typeof fn !== 'function') {
    throw new Error(`Order 模块 API 未暴露方法：${name}`);
  }
  return fn;
}

function requireUserApi(name) {
  const fn = getUserApi()[name];
  if (typeof fn !== 'function') {
    throw new Error(`User 模块 API 未暴露方法：${name}`);
  }
  return fn;
}

async function refreshMemberLevel(q, userId) {
  const userApi = getUserApi();
  if (typeof userApi.refreshUserMemberLevel !== 'function') return;
  await userApi.refreshUserMemberLevel(q, userId);
}

async function notifyTelegramOrderPaid(orderId, source) {
  try {
    await getTelegramApi().notifyOrderPaid(orderId, source);
  } catch (err) {
    console.error('[Telegram] notify order paid failed:', err?.message || err);
  }
}

function validatePaymentIntentAmount(order, pi) {
  const currency = (pi.currency || '').toLowerCase();
  if (currency !== 'myr') {
    return { ok: false, reason: 'currency_mismatch', details: { currency: pi.currency } };
  }
  const expectedCents = Math.round(parseFloat(String(order.total_amount)) * 100);
  if (!Number.isFinite(expectedCents)) {
    return { ok: false, reason: 'invalid_order_total', details: { total_amount: order.total_amount } };
  }
  if (pi.amount !== expectedCents) {
    return {
      ok: false,
      reason: 'amount_mismatch',
      details: { expectedCents, actualCents: pi.amount, total_amount: order.total_amount },
    };
  }
  return { ok: true };
}

async function handleStripeEvent(event) {
  if (event.type !== 'payment_intent.succeeded') return { handled: false };

  const pi = event.data.object;
  const orderId = pi.metadata?.order_id;
  const eventId = event.id || '';
  if (!orderId || !eventId) return { handled: true };

  const orderDb = getOrderDb();
  const accepted = await requireOrderApi('insertWebhookEventIfAbsent')(orderDb, {
    eventId,
    eventType: event.type,
    orderId,
  });
  if (!accepted) {
    return { handled: true, duplicate: true };
  }

  const order = await requireOrderApi('selectOrderById')(orderDb, orderId);
  if (!order) {
    console.error('[stripe webhook] order not found:', orderId);
    return { handled: true };
  }

  if (
    order.status !== ORDER_STATUS.PENDING
    || (order.payment_status && order.payment_status !== PAYMENT_STATUS.PENDING)
    || order.payment_method !== 'online'
  ) {
    return { handled: true };
  }

  const check = validatePaymentIntentAmount(order, pi);
  if (check.ok === false) {
    console.error('[stripe webhook] payment validation failed:', check.reason, check.details || '');
    emitAdminEvent({
      eventType: check.reason === 'currency_mismatch' ? 'payment.currency_mismatch' : 'payment.amount_mismatch',
      category: 'payment',
      severity: 'P0',
      title: check.reason === 'currency_mismatch' ? '支付币种不一致' : '支付金额不一致',
      message: `订单 ${order.order_no} 的 Stripe 支付回调校验失败`,
      entityType: 'order',
      entityId: orderId,
      fingerprint: {
        eventType: check.reason === 'currency_mismatch' ? 'payment.currency_mismatch' : 'payment.amount_mismatch',
        entityType: 'order',
        entityId: orderId,
        eventId,
      },
      payload: {
        orderNo: order.order_no,
        reason: check.reason,
        details: check.details || {},
      },
      impactAmount: Number(order.total_amount || 0),
      source: 'stripe_webhook',
    });
    return { handled: true };
  }

  const paidAt = Number.isFinite(Number(pi.created))
    ? new Date(Number(pi.created) * 1000)
    : new Date();
  const paidUpdated = await requireOrderApi('updateOrderPaid')(orderDb, orderId, {
    paymentTime: paidAt,
    paymentChannel: 'stripe',
    paymentTransactionNo: pi.id || '',
  });
  if (!paidUpdated) {
    return { handled: true, duplicate: true };
  }
  await requireOrderApi('markCheckoutAbandonmentPaidByOrderId')(orderDb, orderId);
  try {
    await requireUserApi('syncStatsAfterOrderPaid')(
      order.user_id,
      Number(order.total_amount || 0),
      orderId,
      null,
    );
  } catch (e) {
    console.error('[stripe webhook] syncStatsAfterOrderPaid failed:', e?.message || e);
  }
  try {
  } catch (e) {
    console.error('[stripe webhook] grant payment-success points failed:', e?.message || e);
  }
  await refreshMemberLevel(orderDb, order.user_id);

  try {
    await paymentsService.recordStripeCapture(orderId, pi.id || '', eventId, {
      payment_order_id: pi.metadata?.payment_order_id,
      currency: pi.currency,
      amount: pi.amount,
    });
  } catch (e) {
      console.error('[stripe webhook] payment_orders 记录失败:', e?.message || e);
  }

  try {
    const itemRows = await requireOrderApi('selectOrderItemQtyRows')(orderDb, orderId);
    for (const it of itemRows) {
      if (it?.product_id && Number(it.qty) > 0) {
        await requireOrderApi('incrementProductSales')(orderDb, it.product_id, Number(it.qty));
      }
    }
  } catch (err) {
    console.error('[stripe webhook] increment sales_count failed:', err?.message || err);
  }

  const payCopy = await requireAdminApi('getResolvedTriggerCopy')('stripe_payment_success', { order_no: order.order_no });
  if (payCopy) {
    await requireOrderApi('insertOrderNotification')(orderDb, {
      id: generateId(),
      userId: order.user_id,
      type: 'order',
      title: payCopy.title,
      content: payCopy.content,
    });
  }
  try {
    await requireMyinvoisApi('enqueueOrderInvoiceIfEnabled')(orderId, 'stripe_payment_success');
  } catch (err) {
    console.error('[MyInvois] enqueue invoice after Stripe payment failed:', err?.message || err);
  }
  await notifyTelegramOrderPaid(orderId, 'stripe');
  emitAdminEvent({
    eventType: 'order.paid',
    category: 'order',
    severity: 'P2',
    title: '订单已付款',
    message: `订单 ${order.order_no} 已通过 Stripe 付款`,
    entityType: 'order',
    entityId: orderId,
    fingerprint: { eventType: 'order.paid', entityType: 'order', entityId: orderId },
    payload: { orderNo: order.order_no, paymentTransactionNo: pi.id || '', eventId, channel: 'stripe' },
    impactAmount: Number(order.total_amount || 0),
    source: 'stripe_webhook',
  });
  return { handled: true };
}

module.exports = {
  handleStripeEvent,
  validatePaymentIntentAmount,
};


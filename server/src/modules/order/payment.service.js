const db = require('../../config/db');
const { generateId } = require('../../utils/helpers');
const repo = require('./order.repository');
const { ORDER_STATUS, PAYMENT_STATUS } = require('../../constants/status');

/**
 * 校验 Stripe PaymentIntent 与订单金额、币种一致（与 createStripeCheckoutSession 中 unit_amount 逻辑对齐）
 * @param {{ total_amount: string|number }} order
 * @param {{ amount: number; currency?: string }} pi
 * @returns {{ ok: true } | { ok: false; reason: string; details?: Record<string, unknown> }}
 */
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

/**
 * Stripe Webhook：payment_intent.succeeded 后置订单已付款（签名校验在 controller）
 * 金额不一致时不改单，仅打日志（仍返回 200 避免 Stripe 无限重试；需人工对账）
 * @param {import('stripe').Stripe.Event} event
 */
async function handleStripeEvent(event) {
  if (event.type !== 'payment_intent.succeeded') return { handled: false };

  const pi = event.data.object;
  const orderId = pi.metadata?.order_id;
  const eventId = event.id || '';
  if (!orderId || !eventId) return { handled: true };

  const accepted = await repo.insertWebhookEventIfAbsent(db, {
    eventId,
    eventType: event.type,
    orderId,
  });
  if (!accepted) {
    return { handled: true, duplicate: true };
  }

  const order = await repo.selectOrderById(db, orderId);
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
  if (!check.ok) {
    console.error('[stripe webhook] payment validation failed:', check.reason, check.details || '');
    return { handled: true };
  }

  const paidAt = Number.isFinite(Number(pi.created))
    ? new Date(Number(pi.created) * 1000)
    : new Date();
  await repo.updateOrderPaid(db, orderId, {
    paymentTime: paidAt,
    paymentChannel: 'stripe',
    paymentTransactionNo: pi.id || '',
  });
  await repo.insertNotification(db, {
    id: generateId(),
    userId: order.user_id,
    type: 'order',
    title: '支付成功',
    content: `订单 ${order.order_no} 已通过 Stripe 支付成功`,
  });
  return { handled: true };
}

module.exports = {
  handleStripeEvent,
  validatePaymentIntentAmount,
};

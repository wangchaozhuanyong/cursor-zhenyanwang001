const { generateId } = require('../../utils/helpers');
const repo = require('./order.repository');
const { ORDER_STATUS, PAYMENT_STATUS } = require('../../constants/status');
const paymentsService = require('./payments/payments.service');
const { getResolvedTriggerCopy } = require('../admin/notificationTriggerApi');

const orderDb = repo.getPool();

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

  const accepted = await repo.insertWebhookEventIfAbsent(orderDb, {
    eventId,
    eventType: event.type,
    orderId,
  });
  if (!accepted) {
    return { handled: true, duplicate: true };
  }

  const order = await repo.selectOrderById(orderDb, orderId);
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
    return { handled: true };
  }

  const paidAt = Number.isFinite(Number(pi.created))
    ? new Date(Number(pi.created) * 1000)
    : new Date();
  await repo.updateOrderPaid(orderDb, orderId, {
    paymentTime: paidAt,
    paymentChannel: 'stripe',
    paymentTransactionNo: pi.id || '',
  });

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
    const itemRows = await repo.selectOrderItemQtyRows(orderDb, orderId);
    for (const it of itemRows) {
      if (it?.product_id && Number(it.qty) > 0) {
        await repo.incrementProductSales(orderDb, it.product_id, Number(it.qty));
      }
    }
  } catch (err) {
    console.error('[stripe webhook] increment sales_count failed:', err?.message || err);
  }

  const payCopy = await getResolvedTriggerCopy('stripe_payment_success', { order_no: order.order_no });
  if (payCopy) {
    await repo.insertNotification(orderDb, {
      id: generateId(),
      userId: order.user_id,
      type: 'order',
      title: payCopy.title,
      content: payCopy.content,
    });
  }
  return { handled: true };
}

module.exports = {
  handleStripeEvent,
  validatePaymentIntentAmount,
};

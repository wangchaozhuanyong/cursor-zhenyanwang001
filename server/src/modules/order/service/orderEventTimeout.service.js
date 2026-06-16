const { ORDER_STATUS, PAYMENT_STATUS } = require('../../../constants/status');
const timeoutRepo = require('../repository/orderEventTimeout.repository');

function getAdminApi() {
  return /** @type {any} */ (require('../../admin/publicApi')) || {};
}

let schedulerTimer = null;

function parseMinutes(raw, fallback) {
  const n = Number.parseInt(String(raw ?? ''), 10);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(n, 60 * 24 * 30);
}

function getSettings() {
  return {
    enabled: process.env.ADMIN_EVENT_ORDER_TIMEOUT_DISABLED !== '1',
    paidUnhandledMinutes: parseMinutes(process.env.ADMIN_EVENT_PAID_UNHANDLED_MINUTES, 15),
    shipTimeoutMinutes: parseMinutes(process.env.ADMIN_EVENT_SHIP_TIMEOUT_MINUTES, 24 * 60),
    intervalMs: Math.max(30_000, Number(process.env.ADMIN_EVENT_ORDER_TIMEOUT_INTERVAL_MS || 5 * 60 * 1000)),
  };
}

function eventFingerprint(eventType, orderId) {
  return { eventType, entityType: 'order', entityId: orderId };
}

async function emitOrderTimeoutEvents(orders, eventType, options = {}) {
  const eventService = getAdminApi();
  let emitted = 0;
  for (const order of orders) {
    const title = eventType === 'order.ship_timeout' ? '订单发货超时' : '已付款订单待处理超时';
    await eventService.emitEvent({
      eventType,
      category: 'order',
      severity: 'P1',
      title,
      message: `订单 ${order.order_no || order.id} 已付款后超过 ${options.minutes} 分钟仍未完成后续处理`,
      entityType: 'order',
      entityId: order.id,
      fingerprint: eventFingerprint(eventType, order.id),
      payload: {
        orderNo: order.order_no,
        status: order.status,
        paymentStatus: order.payment_status,
        paidAt: order.paid_at || order.payment_time || null,
        thresholdMinutes: options.minutes,
      },
      impactAmount: order.total_amount,
      source: 'order_timeout_scan',
    }, { operatorType: 'system' });
    emitted += 1;
  }
  return emitted;
}

async function autoResolveRecoveredOrderEvents(activeEvents) {
  if (!activeEvents.length) return 0;
  const eventService = getAdminApi();
  const ids = [...new Set(activeEvents.map((event) => event.entity_id).filter(Boolean))];
  const orderById = await timeoutRepo.selectOrderStates(ids);
  let resolved = 0;

  for (const event of activeEvents) {
    const order = orderById.get(event.entity_id);
    const recovered = !order
      || order.status !== ORDER_STATUS.PAID
      || ![PAYMENT_STATUS.PAID, PAYMENT_STATUS.PARTIALLY_REFUNDED].includes(order.payment_status || PAYMENT_STATUS.PENDING);
    if (!recovered) continue;
    const result = await eventService.autoResolveByFingerprint(eventFingerprint(event.event_type, event.entity_id), {
      remark: '订单状态已恢复，自动关闭超时事件',
      metadata: { orderStatus: order?.status || null, paymentStatus: order?.payment_status || null },
    });
    if (result.resolved) resolved += 1;
  }
  return resolved;
}

async function runOrderTimeoutEventScan() {
  const settings = getSettings();
  if (!settings.enabled) return { skipped: true, reason: 'disabled' };

  const [paidUnhandled, shipTimeout, activeEvents] = await Promise.all([
    timeoutRepo.selectPaidUnhandledOrders(settings.paidUnhandledMinutes),
    timeoutRepo.selectShipTimeoutOrders(settings.shipTimeoutMinutes),
    getAdminApi().listActiveEventRecordsByTypes(['order.paid_unhandled_timeout', 'order.ship_timeout']),
  ]);

  const paidUnhandledEmitted = await emitOrderTimeoutEvents(paidUnhandled, 'order.paid_unhandled_timeout', {
    minutes: settings.paidUnhandledMinutes,
  });
  const shipTimeoutEmitted = await emitOrderTimeoutEvents(shipTimeout, 'order.ship_timeout', {
    minutes: settings.shipTimeoutMinutes,
  });
  const autoResolved = await autoResolveRecoveredOrderEvents(activeEvents);

  return {
    paidUnhandled: paidUnhandled.length,
    shipTimeout: shipTimeout.length,
    paidUnhandledEmitted,
    shipTimeoutEmitted,
    autoResolved,
  };
}

function startOrderTimeoutEventScheduler() {
  const settings = getSettings();
  if (!settings.enabled || schedulerTimer) return;
  schedulerTimer = setInterval(() => {
    runOrderTimeoutEventScan().catch((error) => {
      console.warn('[orderEventTimeout] scan failed:', error?.message || error);
    });
  }, settings.intervalMs);
  if (typeof schedulerTimer.unref === 'function') schedulerTimer.unref();
  setTimeout(() => {
    runOrderTimeoutEventScan().catch((error) => {
      console.warn('[orderEventTimeout] initial scan failed:', error?.message || error);
    });
  }, 25_000);
}

async function autoResolveOrderTimeoutEvents(orderId, metadata = {}) {
  const eventService = getAdminApi();
  const eventTypes = ['order.paid_unhandled_timeout', 'order.ship_timeout'];
  const results = [];
  for (const eventType of eventTypes) {
    results.push(await eventService.autoResolveByFingerprint(eventFingerprint(eventType, orderId), {
      remark: '订单已发货，自动关闭订单超时事件',
      metadata,
    }));
  }
  return results;
}

module.exports = {
  getSettings,
  runOrderTimeoutEventScan,
  startOrderTimeoutEventScheduler,
  autoResolveOrderTimeoutEvents,
};

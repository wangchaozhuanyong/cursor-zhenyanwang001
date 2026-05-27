const {
  NotFoundError,
  ValidationError,
} = require('../../../errors');
const { formatOrderItem, formatOrder } = require('../order.mapper');
const {
  enrichOrderWithPaymentDeadline,
  enrichOrdersWithPaymentDeadline,
} = require('../orderPaymentDeadline');
const {
  enrichOrderWithAutoConfirmReceiveDeadline,
  enrichOrdersWithAutoConfirmReceiveDeadline,
} = require('../orderReceiveDeadline');
const repo = require('../repository/order.repository');
const returnRepo = require('../repository/return.repository');
const userModule = require('../../user');
const paymentsModule = require('../../payment');
const { ORDER_STATUS, PAYMENT_STATUS } = require('../../../constants/status');
const logisticsModule = require('../../logistics');
const orderDb = repo.getPool();
const orderPoints = require('./orderPoints.service');
const orderCheckout = require('./orderCheckout.service');
const orderCreate = require('./orderCreate.service');
const orderCancel = require('./orderCancel.service');

function getUserApi() {
  return /** @type {any} */ (userModule).api || {};
}

function getPaymentsApi() {
  return /** @type {any} */ (paymentsModule).api || {};
}

function getLogisticsApi() {
  return /** @type {any} */ (logisticsModule).api || {};
}

function attachOrderItemReviewFlags(order, items) {
  const isCompleted = order?.status === ORDER_STATUS.COMPLETED;
  return items.map((item) => ({
    ...item,
    can_review: Boolean(isCompleted && !item.review_id),
  }));
}

function requireApiMethod(api, name) {
  if (!api || typeof api[name] !== 'function') {
    throw new Error(`模块 API 未暴露方法: ${name}`);
  }
  return api[name];
}

function requireLogisticsApi(name) {
  const fn = getLogisticsApi()[name];
  if (typeof fn !== 'function') {
    throw new Error(`Logistics 模块 API 未暴露方法: ${name}`);
  }
  return fn;
}

function canBuyerDeleteOrder(order, returnSummary = null) {
  if (!order) return false;
  if (Number(returnSummary?.active_return_count || order.active_return_count || 0) > 0) return false;
  return [
    ORDER_STATUS.CANCELLED,
    ORDER_STATUS.COMPLETED,
    ORDER_STATUS.REFUNDED,
  ].includes(order.status);
}

async function getOrders(userId, query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(query.pageSize, 10) || 10));
  const { status, tab } = query;

  const filters = { userId, status, tab };
  const total = await repo.countOrdersForUser(orderDb, filters);
  const offset = (page - 1) * pageSize;
  const orders = await repo.selectOrdersPage(orderDb, filters, pageSize, offset);

  if (!orders.length) {
    return { kind: 'paginate', list: [], total, page, pageSize };
  }

  const orderIds = orders.map((o) => o.id);
  const allItems = await repo.selectOrderItemsByOrderIds(orderDb, orderIds);

  const itemMap = {};
  for (const oi of allItems) {
    if (!itemMap[oi.order_id]) itemMap[oi.order_id] = [];
    itemMap[oi.order_id].push(oi);
  }

  const returnSummaries = await returnRepo.selectReturnSummaryByOrderIds(userId, orderIds);
  const returnMap = Object.fromEntries(
    returnSummaries.map((r) => [r.order_id, r]),
  );

  const withPaymentDeadlines = await enrichOrdersWithPaymentDeadline(
    orders.map((o) => formatOrder(
      o,
      attachOrderItemReviewFlags(o, (itemMap[o.id] || []).map(formatOrderItem)),
      returnMap[o.id],
    )),
  );
  const list = await enrichOrdersWithAutoConfirmReceiveDeadline(withPaymentDeadlines);
  return { kind: 'paginate', list, total, page, pageSize };
}

async function getOrderSummary(userId) {
  return repo.selectOrderSummary(orderDb, userId);
}

async function getOrderById(userId, orderId) {
  const order = await repo.selectOrderByIdAndUser(orderDb, orderId, userId);
  if (!order) throw new NotFoundError('订单不存在');
  const items = await repo.selectOrderItems(orderDb, order.id);
  const [returnSummary] = await returnRepo.selectReturnSummaryByOrderIds(userId, [order.id]);
  const shortageAdjustmentCount = await repo.countOrderShortageAdjustments(orderDb, order.id);
  let data = formatOrder(
    order,
    attachOrderItemReviewFlags(order, items.map(formatOrderItem)),
    returnSummary,
  );
  data.has_shortage_adjustment = shortageAdjustmentCount > 0;
  data.shortage_notice = shortageAdjustmentCount > 0 ? '部分商品因缺货已移除' : '';
  await requireLogisticsApi('attachTracking')(data);
  data = await enrichOrderWithPaymentDeadline(data);
  data = await enrichOrderWithAutoConfirmReceiveDeadline(data);
  return { data };
}

async function deleteOrderForBuyer(userId, orderId) {
  const order = await repo.selectOrderByIdAndUser(orderDb, orderId, userId);
  if (!order) throw new NotFoundError('订单不存在');
  const [returnSummary] = await returnRepo.selectReturnSummaryByOrderIds(userId, [order.id]);
  if (!canBuyerDeleteOrder(order, returnSummary)) {
    throw new ValidationError('当前订单状态不支持删除');
  }
  await repo.markOrderBuyerDeleted(orderDb, orderId, userId);
  return { data: null, message: '订单已删除' };
}

async function payOrder(userId, orderId, body) {
  const channel = body?.channel || '';
  const order = await repo.selectOrderByIdAndUser(orderDb, orderId, userId);
  if (!order) throw new NotFoundError('订单不存在');
  if (order.status !== ORDER_STATUS.PENDING || (order.payment_status || PAYMENT_STATUS.PENDING) !== PAYMENT_STATUS.PENDING) {
    throw new ValidationError('当前订单状态无法支付');
  }
  if (channel === 'reward_wallet') {
    return requireApiMethod(getPaymentsApi(), 'payWithRewardWallet')(userId, orderId);
  }
  if (channel === 'mock') {
    throw new ValidationError('生产环境已禁用 mock 支付，请使用 Stripe Checkout 完成支付');
  }
  throw new ValidationError('请使用 Stripe Checkout 发起支付，支付结果以服务端 Webhook 回写为准');
}

async function createStripeCheckoutSession(userId, orderId) {
  const r = await requireApiMethod(getPaymentsApi(), 'createStripeCheckoutForOrder')(userId, orderId, '', undefined);
  return { data: { url: r.data.url } };
}

/**
 * 将已发货订单标记完成并结算积分、返现（调用方需保证当前为 SHIPPED 且在事务内已加锁，如需）
 * @param {import('mysql2/promise').PoolConnection} conn
 * @param {Record<string, unknown>} order
 * @param {Record<string, unknown>} [options]
 */
async function completeShippedOrder(conn, order, options = {}) {
  await repo.updateOrderStatus(conn, order.id, ORDER_STATUS.COMPLETED);
  const bestEffort = options.bestEffortRewards === true;
  try {
    await orderPoints.maybeGrantOrderEarnPoints(conn, order, {
      ...options,
      timing: 'order_completed',
    });
  } catch (err) {
    if (!bestEffort) throw err;
    console.error('[order] grant earn points on completion failed:', err?.message || err);
  }
  try {
    await requireApiMethod(getUserApi(), 'settleOrderRewards')(conn, order, options);
  } catch (err) {
    if (!bestEffort) throw err;
    console.error('[order] settle rewards on completion failed:', err?.message || err);
  }
}

async function confirmReceive(userId, orderId) {
  const conn = await repo.getConnection();
  try {
    const order = await repo.selectOrderByIdAndUser(conn, orderId, userId);
    if (!order) throw new NotFoundError('订单不存在');
    if (order.status !== ORDER_STATUS.SHIPPED) throw new ValidationError('当前状态无法确认收货');

    await conn.beginTransaction();

    await completeShippedOrder(conn, order, { trigger: 'user_confirm_receive', bestEffortRewards: true });

    await conn.commit();
    return { data: null, message: '已确认收货' };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = {
  createOrder: (...args) => orderCreate.createOrder(...args),
  previewOrder: (...args) => orderCheckout.previewOrder(...args),
  getOrders,
  getOrderSummary,
  getOrderById,
  deleteOrderForBuyer,
  cancelOrder: (...args) => orderCancel.cancelOrder(...args),
  getCheckoutCoupons: (...args) => orderCheckout.getCheckoutCoupons(...args),
  payOrder,
  createStripeCheckoutSession,
  confirmReceive,
  completeShippedOrder,
  cancelPendingOrderInTransaction: (...args) => orderCancel.cancelPendingOrderInTransaction(...args),
};

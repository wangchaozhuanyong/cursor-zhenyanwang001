const loyaltyRepo = require('../../loyalty/repository/loyalty.repository');

function getUserApi() {
  return /** @type {any} */ (require('../../user')).api || {};
}

function requireUserApi(name) {
  const fn = getUserApi()[name];
  if (typeof fn !== 'function') {
    throw new Error(`User module API missing method: ${name}`);
  }
  return fn;
}

function toInt(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}

async function applyOrderRedeem(conn, order, options = {}) {
  const pointsUsed = toInt(options.pointsUsed ?? order?.points_used);
  if (!order?.id || !order.user_id || pointsUsed <= 0) return { skipped: true };
  return requireUserApi('changeUserPoints')(conn, {
    userId: order.user_id,
    amount: -pointsUsed,
    action: 'order_redeem',
    description: options.description || `订单积分抵扣 ${order.order_no}`,
    orderId: order.id,
    orderNo: order.order_no,
    sourceType: 'order_checkout',
    relatedRecordId: `order_redeem:${order.id}`,
    allowNegative: false,
    metadata: { trigger: options.trigger || 'create_order' },
  });
}

async function reverseOrderRedeem(conn, order, options = {}) {
  const pointsUsed = toInt(order?.points_used);
  if (!order?.id || !order.user_id || pointsUsed <= 0) return { skipped: true };
  return requireUserApi('changeUserPoints')(conn, {
    userId: order.user_id,
    amount: pointsUsed,
    action: 'order_redeem_reverse',
    description: options.description || `订单取消退回积分 ${order.order_no}`,
    orderId: order.id,
    orderNo: order.order_no,
    sourceType: options.sourceType || 'order_cancel',
    relatedRecordId: `order_redeem_reverse:${order.id}`,
    allowNegative: false,
    metadata: { trigger: options.trigger || 'order_cancel' },
  });
}

async function grantOrderEarnPoints(conn, order, options = {}) {
  const amount = toInt(order?.total_points);
  if (!order?.id || !order.user_id || amount <= 0) return { skipped: true };

  const settings = await loyaltyRepo.selectPointsSettings();
  const settleTiming = settings?.settle_timing || 'order_completed';
  const timing = options.timing || 'order_completed';
  if (settleTiming !== timing) {
    return { skipped: true, reason: `settle_timing:${settleTiming}` };
  }

  return requireUserApi('changeUserPoints')(conn, {
    userId: order.user_id,
    amount,
    action: 'order_earn',
    description: options.description || '订单积分发放',
    orderId: order.id,
    orderNo: order.order_no,
    sourceType: 'order_completion',
    relatedRecordId: `order_earn:${order.id}`,
    operatorId: options.operatorId,
    metadata: { trigger: options.trigger || timing },
  });
}

async function reverseOrderEarnPoints(conn, order, options = {}) {
  const amount = toInt(order?.total_points);
  if (!order?.id || !order.user_id || amount <= 0) return { skipped: true };
  return requireUserApi('changeUserPoints')(conn, {
    userId: order.user_id,
    amount: -amount,
    action: 'order_reverse',
    description: options.description || `订单积分回滚 ${order.order_no}`,
    orderId: order.id,
    orderNo: order.order_no,
    sourceType: options.sourceType || 'order_reversal',
    relatedRecordId: `order_reverse:${order.id}`,
    operatorId: options.operatorId,
    metadata: { trigger: options.trigger || 'order_reversal' },
    allowNegative: false,
    pendingOnInsufficient: true,
  });
}

module.exports = {
  applyOrderRedeem,
  reverseOrderRedeem,
  grantOrderEarnPoints,
  reverseOrderEarnPoints,
};

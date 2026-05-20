const loyaltyRepo = require('../../loyalty/repository/loyalty.repository');
const pointsRepo = require('../../user/repository/points.repository');
const { POINTS_ACTION } = require('../../../constants/pointsActions');

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
    action: POINTS_ACTION.ORDER_REDEEM,
    description: options.description || `订单积分抵扣 ${order.order_no}`,
    orderId: order.id,
    orderNo: order.order_no,
    sourceType: 'order_checkout',
    relatedRecordId: `order_redeem:${order.id}`,
    operatorId: options.operatorId,
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
    action: POINTS_ACTION.ORDER_REDEEM_REVERSE,
    description: options.description || `订单取消退回积分 ${order.order_no}`,
    orderId: order.id,
    orderNo: order.order_no,
    sourceType: options.sourceType || 'order_cancel',
    relatedRecordId: `order_redeem_reverse:${order.id}`,
    operatorId: options.operatorId,
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
    action: POINTS_ACTION.ORDER_EARN,
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
  const earned = await pointsRepo.selectRecordByRelatedForUpdate(conn, `order_earn:${order.id}`, POINTS_ACTION.ORDER_EARN);
  if (!earned) return { skipped: true, reason: 'order_points_not_granted' };
  return requireUserApi('changeUserPoints')(conn, {
    userId: order.user_id,
    amount: -amount,
    action: POINTS_ACTION.ORDER_EARN_REVERSE,
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

async function maybeGrantOrderEarnPoints(conn, order, options = {}) {
  const timing = options.timing || 'order_completed';
  return grantOrderEarnPoints(conn, order, { ...options, timing });
}

async function rollbackOrderPoints(conn, order, options = {}) {
  const earnResult = await reverseOrderEarnPoints(conn, order, {
    operatorId: options.operatorId,
    trigger: options.trigger,
    description: options.description || `订单积分回滚 ${order.order_no}`,
    sourceType: options.sourceType || 'order_reversal',
  });
  let redeemResult = { skipped: true };
  if (Number(order?.points_used || 0) > 0) {
    redeemResult = await reverseOrderRedeem(conn, order, {
      operatorId: options.operatorId,
      trigger: options.trigger,
      description: options.redeemDescription || `订单积分抵扣退回 ${order.order_no}`,
      sourceType: options.sourceType || 'order_reversal',
    });
  }
  return { earn: earnResult, redeem: redeemResult };
}

async function rollbackOrderPointsForPartialRefund(conn, order, refundAmount, options = {}) {
  const orderAmount = Number(order?.total_amount || 0);
  const amount = Number(refundAmount || 0);
  if (!order?.id || !order.user_id || orderAmount <= 0 || amount <= 0 || amount >= orderAmount) {
    return { skipped: true };
  }

  const suffix = options.returnId || options.refundId || options.refundReference || order.id;
  const ratio = amount / orderAmount;
  const earnedRollback = Math.floor(Number(order.total_points || 0) * ratio);
  const redeemRefund = Math.floor(Number(order.points_used || 0) * ratio);
  const results = {};

  const earned = await pointsRepo.selectRecordByRelatedForUpdate(conn, `order_earn:${order.id}`, POINTS_ACTION.ORDER_EARN);
  if (earned && earnedRollback > 0) {
    results.earn = await requireUserApi('changeUserPoints')(conn, {
      userId: order.user_id,
      amount: -earnedRollback,
      action: POINTS_ACTION.ORDER_EARN_REVERSE,
      description: options.description || `部分退款扣回积分 ${order.order_no}`,
      orderId: order.id,
      orderNo: order.order_no,
      sourceType: 'partial_refund',
      relatedRecordId: `order_reverse_partial:${suffix}`,
      operatorId: options.operatorId,
      allowNegative: false,
      pendingOnInsufficient: true,
      metadata: {
        trigger: options.trigger || 'partial_refund',
        refund_amount: amount,
        refund_ratio: ratio,
      },
    });
  } else {
    results.earn = { skipped: true, reason: earned ? 'zero_partial_earned_rollback' : 'order_points_not_granted' };
  }

  if (redeemRefund > 0) {
    results.redeem = await requireUserApi('changeUserPoints')(conn, {
      userId: order.user_id,
      amount: redeemRefund,
      action: POINTS_ACTION.ORDER_REDEEM_REVERSE,
      description: options.redeemDescription || `部分退款退回抵扣积分 ${order.order_no}`,
      orderId: order.id,
      orderNo: order.order_no,
      sourceType: 'partial_refund',
      relatedRecordId: `order_redeem_reverse_partial:${suffix}`,
      operatorId: options.operatorId,
      allowNegative: false,
      metadata: {
        trigger: options.trigger || 'partial_refund',
        refund_amount: amount,
        refund_ratio: ratio,
      },
    });
  } else {
    results.redeem = { skipped: true, reason: 'zero_partial_redeem_refund' };
  }

  return results;
}

module.exports = {
  applyOrderRedeem,
  reverseOrderRedeem,
  grantOrderEarnPoints,
  reverseOrderEarnPoints,
  maybeGrantOrderEarnPoints,
  rollbackOrderPoints,
  rollbackOrderPointsForPartialRefund,
};

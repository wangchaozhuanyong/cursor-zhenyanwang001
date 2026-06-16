const { POINTS_ACTION } = require('../../../constants/pointsActions');
const orderRepo = require('../repository/order.repository');

const SETTLE_TIMINGS = new Set(['payment_success', 'order_shipped', 'order_completed']);

function getUserApi() {
  return /** @type {any} */ (require('../../user/publicApi')) || {};
}

function getLoyaltyApi() {
  return /** @type {any} */ (require('../../loyalty/publicApi')) || {};
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

async function resolveConfiguredSettleTiming(options = {}) {
  if (options.settleTiming && SETTLE_TIMINGS.has(options.settleTiming)) return options.settleTiming;
  const settings = options.pointsSettings || await getLoyaltyApi().selectPointsSettings();
  const timing = settings?.settle_timing || 'order_completed';
  return SETTLE_TIMINGS.has(timing) ? timing : 'order_completed';
}

function parseOrderLoyaltyMeta(order) {
  const raw = order?.loyalty_meta;
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function grantOrderEarnPoints(conn, order, options = {}) {
  const amount = toInt(order?.total_points);
  if (!order?.id || !order.user_id || amount <= 0) return { skipped: true };

  const loyaltyMeta = parseOrderLoyaltyMeta(order);
  const pointsBonusSnapshots = loyaltyMeta.points_bonus_snapshots || options.pointsBonusSnapshots || [];

  const earn = await requireUserApi('changeUserPoints')(conn, {
    userId: order.user_id,
    amount,
    action: POINTS_ACTION.ORDER_EARN,
    description: options.description || '订单积分发放',
    orderId: order.id,
    orderNo: order.order_no,
    sourceType: 'order_completion',
    relatedRecordId: `order_earn:${order.id}`,
    operatorId: options.operatorId,
    metadata: {
      trigger: options.trigger || options.timing || 'order_completed',
      points_bonus_snapshots: pointsBonusSnapshots,
    },
  });
  const priorSuccessfulOrders = await orderRepo.countPriorSuccessfulNormalOrders(conn, order.user_id, order.id);
  const firstOrder = priorSuccessfulOrders > 0
    ? { skipped: true, reason: 'prior_successful_order_exists' }
    : await requireUserApi('awardConfiguredPointsBonus')(conn, {
      userId: order.user_id,
      action: POINTS_ACTION.FIRST_ORDER,
      description: '首单奖励',
      sourceType: 'first_order',
      relatedRecordId: `first_order:${order.user_id}`,
      orderId: order.id,
      orderNo: order.order_no,
      metadata: {
        trigger: options.trigger || options.timing || 'order_completed',
        order_id: order.id,
      },
    });
  return { ...earn, firstOrder };
}

async function reverseOrderEarnPoints(conn, order, options = {}) {
  const amount = toInt(order?.total_points);
  if (!order?.id || !order.user_id || amount <= 0) return { skipped: true };
  const earned = await getUserApi().selectPointsRecordByRelatedForUpdate(conn, `order_earn:${order.id}`, POINTS_ACTION.ORDER_EARN);
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
  if (String(order?.order_type || '') === 'points_gift') {
    return { skipped: true, reason: 'points_gift_order_no_earn' };
  }
  const configuredTiming = await resolveConfiguredSettleTiming(options);
  const eventTiming = options.timing || configuredTiming;
  if (eventTiming !== configuredTiming) {
    return {
      skipped: true,
      reason: 'settle_timing_mismatch',
      configured_timing: configuredTiming,
      event_timing: eventTiming,
    };
  }
  return grantOrderEarnPoints(conn, order, { ...options, timing: eventTiming });
}

async function maybeGrantOrderEarnOnPaymentSuccess(conn, order, options = {}) {
  return maybeGrantOrderEarnPoints(conn, order, {
    ...options,
    timing: 'payment_success',
    trigger: options.trigger || 'payment_success',
  });
}

async function applyGiftRedeem(conn, order, options = {}) {
  const pointsUsed = toInt(options.pointsUsed ?? order?.points_used);
  if (!order?.id || !order.user_id || pointsUsed <= 0) return { skipped: true };
  return requireUserApi('changeUserPoints')(conn, {
    userId: order.user_id,
    amount: -pointsUsed,
    action: POINTS_ACTION.GIFT_REDEEM,
    description: options.description || `积分礼品兑换 ${order.order_no}`,
    orderId: order.id,
    orderNo: order.order_no,
    sourceType: 'points_gift_redeem',
    relatedRecordId: `gift_redeem:${order.id}`,
    operatorId: options.operatorId,
    allowNegative: false,
    metadata: {
      trigger: options.trigger || 'gift_redeem',
      gift_item_id: options.giftItemId || null,
      redemption_id: options.redemptionId || null,
    },
  });
}

async function reverseGiftRedeem(conn, order, options = {}) {
  const pointsUsed = toInt(order?.points_used);
  if (!order?.id || !order.user_id || pointsUsed <= 0) return { skipped: true };
  const existing = await getUserApi().selectPointsRecordByRelatedForUpdate(
    conn,
    `gift_redeem_reverse:${order.id}`,
    POINTS_ACTION.GIFT_REDEEM_REVERSE,
  );
  if (existing) return { skipped: true, record: existing };
  return requireUserApi('changeUserPoints')(conn, {
    userId: order.user_id,
    amount: pointsUsed,
    action: POINTS_ACTION.GIFT_REDEEM_REVERSE,
    description: options.description || `礼品兑换取消退回积分 ${order.order_no}`,
    orderId: order.id,
    orderNo: order.order_no,
    sourceType: options.sourceType || 'gift_redeem_cancel',
    relatedRecordId: `gift_redeem_reverse:${order.id}`,
    operatorId: options.operatorId,
    allowNegative: false,
    metadata: { trigger: options.trigger || 'gift_redeem_cancel' },
  });
}

async function refundOrderRedeemOnly(conn, order, options = {}) {
  if (String(order.order_type || '') === 'points_gift' || String(order.payment_method || '') === 'points_gift') {
    return reverseGiftRedeem(conn, order, options);
  }
  return reverseOrderRedeem(conn, order, {
    operatorId: options.operatorId,
    trigger: options.trigger,
    description: options.redeemDescription || options.description || `Order refund returns redeemed points ${order?.order_no || ''}`,
    sourceType: options.sourceType || 'order_refund',
  });
}

async function reverseOrderEarnOnly(conn, order, options = {}) {
  return reverseOrderEarnPoints(conn, order, {
    operatorId: options.operatorId,
    trigger: options.trigger,
    description: options.description || `Order refund reverses earned points ${order?.order_no || ''}`,
    sourceType: options.sourceType || 'order_refund',
  });
}

async function rollbackOrderPoints(conn, order, options = {}) {
  const redeemResult = await refundOrderRedeemOnly(conn, order, options);
  const earnResult = options.reverseEarn
    ? await reverseOrderEarnOnly(conn, order, options)
    : { skipped: true, reason: 'use_reverseOrderEarnOnly_explicitly' };
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

  const earned = await getUserApi().selectPointsRecordByRelatedForUpdate(conn, `order_earn:${order.id}`, POINTS_ACTION.ORDER_EARN);
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
  SETTLE_TIMINGS,
  resolveConfiguredSettleTiming,
  applyOrderRedeem,
  applyGiftRedeem,
  reverseOrderRedeem,
  reverseGiftRedeem,
  grantOrderEarnPoints,
  reverseOrderEarnPoints,
  maybeGrantOrderEarnPoints,
  maybeGrantOrderEarnOnPaymentSuccess,
  refundOrderRedeemOnly,
  reverseOrderEarnOnly,
  rollbackOrderPoints,
  rollbackOrderPointsForPartialRefund,
};

const { generateId } = require('../../../utils/helpers');
const { ValidationError } = require('../../../errors');
const { ORDER_STATUS, PAYMENT_STATUS } = require('../../../constants/status');
const repo = require('../repository/order.repository');
const orderPoints = require('./orderPoints.service');

function getUserApi() {
  return /** @type {any} */ (require('../../user')).api || {};
}

function requireUserApi(name) {
  const fn = getUserApi()[name];
  if (typeof fn !== 'function') throw new Error(`User 模块 API 未暴露方法：${name}`);
  return fn;
}

function toMoney(v) {
  const n = parseFloat(v);
  return Number.isFinite(n) ? Number(n.toFixed(2)) : 0;
}

/**
 * 统一退款补偿：更新订单退款状态 + 可选库存/销量/积分/钱包/券/用户统计
 * @param {import('mysql2/promise').PoolConnection} conn
 * @param {object} params
 */
async function applyOrderRefundCompensation(conn, params) {
  const {
    order,
    refundAmount,
    refundReference = '',
    reason = '',
    mode = 'manual',
    operatorId = null,
    insertPaymentEvent,
    options = {},
  } = params;

  if (!order?.id) throw new ValidationError('订单无效');
  const amount = toMoney(refundAmount);
  if (amount <= 0) throw new ValidationError('退款金额必须大于 0');

  const total = toMoney(order.total_amount);
  const prevRefunded = toMoney(order.refunded_amount);
  const newRefunded = toMoney(prevRefunded + amount);
  if (newRefunded > total + 0.01) {
    throw new ValidationError('退款金额不能超过订单实付金额');
  }

  const isFullRefund = newRefunded >= total - 0.01;
  const paymentStatus = isFullRefund ? PAYMENT_STATUS.REFUNDED : PAYMENT_STATUS.PARTIALLY_REFUNDED;
  const orderStatus = isFullRefund ? ORDER_STATUS.REFUNDED : ORDER_STATUS.REFUNDING;
  const refundStatus = isFullRefund ? 'refunded' : 'partially_refunded';

  const restoreStock = options.restoreStock === true;
  const restoreCoupon = options.restoreCoupon !== undefined ? Boolean(options.restoreCoupon) : isFullRefund;
  const reversePoints = options.reversePoints !== false;
  const reverseRewards = options.reverseRewards === true;
  const decrementSales = options.decrementSales !== false && isFullRefund;
  const reverseWallet = options.reverseWallet !== false && isFullRefund;

  await repo.updateOrderRefundState(conn, order.id, {
    paymentStatus,
    orderStatus,
    refundStatus,
    refundedAmount: newRefunded,
  });

  if (typeof insertPaymentEvent === 'function') {
    await insertPaymentEvent(conn, {
      order,
      amount,
      isFullRefund,
      refundReference,
      reason,
      mode,
      paymentStatus,
      refundStatus,
    });
  }

  const lineItems = await repo.selectOrderItemQtyRows(conn, order.id);

  if (restoreStock) {
    for (const item of lineItems) {
      if (!item.variant_id) {
        throw new ValidationError(`订单 ${order.order_no} 存在缺失 SKU 的明细，无法恢复库存`);
      }
      await repo.restoreVariantStock(conn, item.variant_id, item.qty, {
        refType: 'order',
        refId: order.id,
        orderNo: order.order_no,
        operatorId,
        reason: reason || `订单退款恢复库存 ${order.order_no}`,
      });
      if (item.activity_id) {
        await repo.decrementActivitySold(conn, item.activity_id, item.product_id, item.qty);
      }
    }
  }

  if (decrementSales) {
    for (const item of lineItems) {
      const qty = Number(item.qty || 0);
      if (item.product_id && qty > 0) {
        await repo.decrementProductSales(conn, item.product_id, qty);
      }
    }
  }

  if (reversePoints) {
    if (isFullRefund) {
      await orderPoints.rollbackOrderPoints(conn, order, {
        operatorId,
        trigger: options.trigger || 'order_refund',
        description: reason || `订单退款回滚积分 ${order.order_no}`,
        redeemDescription: `订单退款退回抵扣积分 ${order.order_no}`,
        sourceType: 'order_refund',
      });
    } else {
      await orderPoints.rollbackOrderPointsForPartialRefund(conn, order, amount, {
        operatorId,
        trigger: options.trigger || 'partial_refund',
        refundReference,
        description: reason || `部分退款扣回积分 ${order.order_no}`,
        redeemDescription: `部分退款退回抵扣积分 ${order.order_no}`,
      });
    }
  }

  if (reverseRewards) {
    await requireUserApi('reverseOrderRewards')(conn, order, reason || `订单退款 ${order.order_no}`, {
      operatorId,
      trigger: options.trigger || 'order_refund',
    });
  }

  if (reverseWallet && isFullRefund) {
    if (Number(order.reward_cash_used || 0) > 0) {
      await requireUserApi('insertRewardTransaction')(conn, {
        id: generateId(),
        rewardRecordId: null,
        userId: order.user_id,
        orderId: order.id,
        orderNo: order.order_no,
        type: 'wallet_redeem_refund',
        amount: Number(order.reward_cash_used || 0),
        status: 'success',
        reason: `订单退款退回返现抵扣 ${order.order_no}`,
        metadata: { trigger: options.trigger || 'order_refund' },
      });
    }
    const paidByRewardWallet = order.payment_method === 'reward_wallet'
      || order.payment_channel === 'reward_wallet';
    if (paidByRewardWallet) {
      await requireUserApi('insertRewardTransaction')(conn, {
        id: generateId(),
        rewardRecordId: null,
        userId: order.user_id,
        orderId: order.id,
        orderNo: order.order_no,
        type: 'refund_order',
        amount: total,
        status: 'success',
        reason: `返现钱包支付订单退款 ${order.order_no}`,
        metadata: { trigger: options.trigger || 'order_refund', refund_reference: refundReference },
      });
    }
  }

  if (restoreCoupon && order.coupon_uc_id) {
    await repo.restoreUserCouponById(conn, order.coupon_uc_id);
  }

  const statsEventKey = isFullRefund
    ? 'refunded'
    : `refund_partial:${refundReference || `${order.id}_${Date.now()}`}`;

  await requireUserApi('syncStatsAfterRefund')(
    order.user_id,
    order.id,
    amount,
    conn,
    { isFullRefund, eventType: statsEventKey },
  );

  if (isFullRefund) {
    try {
      await requireUserApi('refreshUserMemberLevel')(conn, order.user_id, { force: false });
    } catch (e) {
      console.error('[orderRefundCompensation] refreshUserMemberLevel failed:', e?.message || e);
    }
  }

  return {
    isFullRefund,
    paymentStatus,
    orderStatus,
    refundStatus,
    refundedAmount: newRefunded,
    refundDelta: amount,
  };
}

module.exports = {
  applyOrderRefundCompensation,
  toMoney,
};

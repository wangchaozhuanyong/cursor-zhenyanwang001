const { generateId } = require('../../../utils/helpers');
const { NotFoundError, ValidationError } = require('../../../errors');
const { canUserCancel } = require('../orderStateMachine');
const repo = require('../repository/order.repository');
const checkoutAbandonmentRepo = require('../repository/checkoutAbandonment.repository');
const orderPoints = require('./orderPoints.service');

function getLoyaltyApi() {
  return /** @type {any} */ (require('../../loyalty')).api || {};
}

function getUserApi() {
  return /** @type {any} */ (require('../../user')).api || {};
}

function requireApiMethod(api, name) {
  if (!api || typeof api[name] !== 'function') {
    throw new Error(`模块 API 未暴露方法: ${name}`);
  }
  return api[name];
}

/**
 * 在已有事务内取消待付款订单：释放库存、回滚积分/返现、恢复优惠券。
 * @param {import('mysql2/promise').PoolConnection} conn
 * @param {Record<string, unknown>} order
 * @param {Record<string, unknown>} [options]
 */
async function cancelPendingOrderInTransaction(conn, order, options = {}) {
  const orderId = String(order.id);
  const orderNo = String(order.order_no || '');
  const trigger = String(options.trigger || 'order_cancel');
  const cancelReason = String(options.cancelReason || `订单 ${orderNo} 取消`);
  const stockReason = String(options.stockReason || `订单 ${orderNo} 取消释放库存`);
  const pointReason = String(options.pointReason || `订单取消回滚积分 ${orderNo}`);

  await repo.updateOrderCancelled(conn, orderId, cancelReason);
  await checkoutAbandonmentRepo.markClosedByOrderId(conn, orderId);

  const lineItems = await repo.selectOrderItemQtyRows(conn, orderId);
  for (const item of lineItems) {
    if (!item.variant_id) {
      throw new ValidationError(`订单 ${orderNo} 存在缺失 SKU 的明细，无法执行库存释放`);
    }
    await repo.restoreVariantStock(conn, item.variant_id, item.qty, {
      refType: 'order',
      refId: orderId,
      orderNo,
      reason: stockReason,
    });
    if (item.activity_id) {
      await repo.decrementActivitySold(conn, item.activity_id, item.product_id, item.qty);
    }
  }

  if (String(order.order_type || '') === 'points_gift') {
    await getLoyaltyApi().reverseGiftRedemptionForCancelledOrder(conn, order);
  } else {
    await orderPoints.refundOrderRedeemOnly(conn, order, {
      trigger,
      description: pointReason,
      redeemDescription: `Order cancellation refunds redeemed points ${orderNo}`,
      sourceType: 'order_cancel',
    });
  }
  if (Number(order.reward_cash_used || 0) > 0) {
    await requireApiMethod(getUserApi(), 'insertRewardTransaction')(conn, {
      id: generateId(),
      rewardRecordId: null,
      userId: order.user_id,
      orderId,
      orderNo,
      type: 'wallet_redeem_refund',
      amount: Number(order.reward_cash_used || 0),
      status: 'success',
      reason: `订单取消退回返现余额 ${orderNo}`,
      metadata: { trigger: trigger || 'order_cancel' },
    });
  }

  if (order.coupon_uc_id) {
    await repo.restoreUserCouponById(conn, order.coupon_uc_id, {
      orderId,
      orderNo,
      userId: order.user_id,
      source: 'order_cancel',
    });
  } else if (order.coupon_title) {
    await repo.restoreUserCouponHeuristic(conn, order.user_id, order.created_at, {
      orderId,
      orderNo,
      userId: order.user_id,
      source: 'order_cancel_heuristic',
    });
  }
}

async function cancelOrder(userId, orderId) {
  const conn = await repo.getConnection();
  try {
    await conn.beginTransaction();

    const order = await repo.selectOrderByIdAndUserForUpdate(conn, orderId, userId);
    if (!order) throw new NotFoundError('订单不存在');
    if (!canUserCancel(order)) {
      throw new ValidationError('当前订单状态无法取消（仅未付款待处理订单可取消）');
    }

    await cancelPendingOrderInTransaction(conn, order, {
      trigger: 'user_cancel_order',
      cancelReason: `用户取消订单 ${order.order_no}`,
      stockReason: `订单 ${order.order_no} 取消释放库存`,
      pointReason: `订单取消回滚积分 ${order.order_no}`,
    });
    await requireApiMethod(getUserApi(), 'syncStatsAfterOrderCancelled')(order.user_id, order.id, conn);

    await conn.commit();
    return { data: null, message: '订单已取消' };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = {
  cancelOrder,
  cancelPendingOrderInTransaction,
};

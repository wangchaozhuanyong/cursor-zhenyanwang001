const db = require('../../config/db');
const { generateId, generateOrderNo } = require('../../utils/helpers');
const { computeShippingFee, estimateWeightFromItems } = require('../../utils/shippingFee');
const {
  NotFoundError,
  ValidationError,
} = require('../../errors');
const { formatOrderItem, formatOrder } = require('./order.mapper');
const { canUserCancel } = require('./orderStateMachine');
const repo = require('./order.repository');
const rewardService = require('../user/reward.service');
const paymentsService = require('../payments/payments.service');
const pointsService = require('../user/points.service');
const { ORDER_STATUS, PAYMENT_STATUS } = require('../../constants/status');

function calculateCouponDiscount(coupon, rawAmount, shippingFee) {
  const type = coupon.type;
  const value = parseFloat(coupon.value) || 0;
  if (type === 'fixed') {
    return Math.min(value, rawAmount);
  }
  if (type === 'percentage') {
    return Math.min(rawAmount, Math.floor(rawAmount * value / 100));
  }
  if (type === 'shipping') {
    return Math.min(shippingFee, value > 0 ? value : shippingFee);
  }
  return 0;
}

/**
 * 创建订单。形状校验已由 routes 层 zod schema 完成；
 * 这里仅做业务规则（库存、优惠券资格、积分扣减、邀请奖励）与事务编排。
 * @param {string} userId
 * @param {object} body
 */
async function createOrder(userId, body) {
  const {
    items, contact_name, contact_phone, address, note,
    coupon_id, coupon_title, shipping_template_id, shipping_name, payment_method,
    estimated_weight_kg,
  } = body;

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const productIds = items.map((i) => i.product_id);
    const products = await repo.selectProductsForUpdate(conn, productIds);
    const productMap = Object.fromEntries(products.map((p) => [p.id, p]));

    for (const item of items) {
      const p = productMap[item.product_id];
      if (!p) {
        await conn.rollback();
        throw new NotFoundError(`商品 ${item.product_id} 不存在或已下架`);
      }
      if (p.stock < item.qty) {
        await conn.rollback();
        throw new ValidationError(`商品「${p.name}」库存不足，剩余 ${p.stock} 件`);
      }
    }

    let rawAmount = 0;
    let totalPoints = 0;
    const orderItems = items.map((item) => {
      const p = productMap[item.product_id];
      const price = parseFloat(p.price);
      rawAmount += price * item.qty;
      totalPoints += p.points * item.qty;
      return {
        productId: p.id,
        name: p.name,
        image: p.cover_image,
        price,
        points: p.points,
        qty: item.qty,
      };
    });

    let shippingFee = 0;
    if (shipping_template_id) {
      const tpl = await repo.selectShippingTemplate(conn, shipping_template_id);
      if (tpl) {
        const w = estimated_weight_kg != null && Number.isFinite(Number(estimated_weight_kg))
          ? Number(estimated_weight_kg)
          : estimateWeightFromItems(items);
        shippingFee = computeShippingFee(tpl, rawAmount, w);
      }
    }

    let discountAmount = 0;
    let usedCouponUcId = null;
    let usedCouponTitle = coupon_title;
    if (coupon_id) {
      const uc = await repo.selectUserCouponForUpdate(conn, coupon_id, userId);
      if (!uc) {
        await conn.rollback();
        throw new ValidationError('优惠券不存在、已使用或不可用');
      }
      const minAmount = parseFloat(uc.min_amount);
      if (rawAmount < minAmount) {
        await conn.rollback();
        throw new ValidationError(`订单金额未满 RM ${minAmount}，无法使用该优惠券`);
      }
      if (uc.scope_type === 'category') {
        const allowedCategoryIds = await repo.selectCouponCategoryIds(conn, uc.id);
        if (allowedCategoryIds.length > 0) {
          const orderCategoryIds = [...new Set(orderItems.map((oi) => productMap[oi.productId]?.category_id).filter(Boolean))];
          const matched = orderCategoryIds.some((cid) => allowedCategoryIds.includes(cid));
          if (!matched) {
            await conn.rollback();
            throw new ValidationError('该优惠券不适用于当前商品分类');
          }
        }
      }
      discountAmount = calculateCouponDiscount(uc, rawAmount, shippingFee);
      if (discountAmount <= 0) {
        await conn.rollback();
        throw new ValidationError(uc.type === 'shipping' ? '当前订单无可抵扣运费，无法使用该运费券' : '该优惠券当前不可抵扣');
      }
      await repo.updateUserCouponUsed(conn, uc.uc_id);
      usedCouponUcId = uc.uc_id;
      usedCouponTitle = uc.title || coupon_title;
    }

    const totalAmount = Math.max(0, rawAmount - discountAmount + shippingFee);
    const orderId = generateId();
    const orderNo = generateOrderNo();

    await repo.insertOrder(conn, {
      id: orderId,
      userId,
      orderNo,
      rawAmount,
      discountAmount,
      couponTitle: usedCouponTitle,
      shippingFee,
      shippingName: shipping_name,
      totalAmount,
      totalPoints,
      note,
      contactName: contact_name,
      contactPhone: contact_phone,
      address,
      paymentMethod: payment_method,
    });

    if (usedCouponUcId) {
      await repo.updateOrderCouponUcId(conn, orderId, usedCouponUcId);
    }

    for (const oi of orderItems) {
      await repo.insertOrderItem(conn, {
        id: generateId(),
        orderId,
        productId: oi.productId,
        productName: oi.name,
        productImage: oi.image,
        price: oi.price,
        points: oi.points,
        qty: oi.qty,
      });
    }

    for (const oi of orderItems) {
      const affected = await repo.deductProductStock(conn, oi.productId, oi.qty);
      if (affected === 0) {
        await conn.rollback();
        throw new ValidationError(`商品「${oi.name}」库存不足`);
      }
    }

    const orderedIds = items.map((i) => i.product_id);
    await repo.deleteCartItemsForProducts(conn, userId, orderedIds);

    await conn.commit();

    const formattedItems = orderItems.map((oi) => formatOrderItem({
      product_id: oi.productId,
      product_name: oi.name,
      product_image: oi.image,
      price: oi.price,
      points: oi.points,
      qty: oi.qty,
    }));
    const orderRow = await repo.selectOrderById(db, orderId);
    return { data: formatOrder(orderRow, formattedItems), message: '下单成功' };
  } catch (err) {
    try {
      await conn.rollback();
    } catch { /* ignore */ }
    throw err;
  } finally {
    conn.release();
  }
}

async function getOrders(userId, query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(query.pageSize, 10) || 10));
  const { status } = query;

  const total = await repo.countOrdersForUser(db, userId, status);
  const offset = (page - 1) * pageSize;
  const orders = await repo.selectOrdersPage(db, userId, status, pageSize, offset);

  if (!orders.length) {
    return { kind: 'paginate', list: [], total, page, pageSize };
  }

  const orderIds = orders.map((o) => o.id);
  const allItems = await repo.selectOrderItemsByOrderIds(db, orderIds);

  const itemMap = {};
  for (const oi of allItems) {
    if (!itemMap[oi.order_id]) itemMap[oi.order_id] = [];
    itemMap[oi.order_id].push(formatOrderItem(oi));
  }

  const list = orders.map((o) => formatOrder(o, itemMap[o.id] || []));
  return { kind: 'paginate', list, total, page, pageSize };
}

async function getOrderById(userId, orderId) {
  const order = await repo.selectOrderByIdAndUser(db, orderId, userId);
  if (!order) throw new NotFoundError('订单不存在');
  const items = await repo.selectOrderItems(db, order.id);
  return { data: formatOrder(order, items.map(formatOrderItem)) };
}

async function cancelOrder(userId, orderId) {
  const conn = await db.getConnection();
  try {
    const order = await repo.selectOrderByIdAndUser(conn, orderId, userId);
    if (!order) throw new NotFoundError('订单不存在');
    if (!canUserCancel(order)) throw new ValidationError('当前订单状态无法取消（仅未付款的待处理订单可取消）');

    await conn.beginTransaction();

    await repo.updateOrderStatus(conn, order.id, ORDER_STATUS.CANCELLED);

    const lineItems = await repo.selectOrderItemQtyRows(conn, order.id);
    for (const item of lineItems) {
      await repo.restoreProductStock(conn, item.product_id, item.qty);
    }

    await pointsService.reverseOrderPoints(conn, order, `订单取消回滚积分 ${order.order_no}`, {
      trigger: 'user_cancel_order',
    });

    if (order.coupon_uc_id) {
      await repo.restoreUserCouponById(conn, order.coupon_uc_id);
    } else if (order.coupon_title) {
      await repo.restoreUserCouponHeuristic(conn, userId, order.created_at);
    }

    await conn.commit();
    return { data: null, message: '订单已取消' };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function payOrder(userId, orderId, body) {
  const channel = body?.channel || '';
  const order = await repo.selectOrderByIdAndUser(db, orderId, userId);
  if (!order) throw new NotFoundError('订单不存在');
  if (order.status !== ORDER_STATUS.PENDING || (order.payment_status || PAYMENT_STATUS.PENDING) !== PAYMENT_STATUS.PENDING) {
    throw new ValidationError('当前订单状态无法支付');
  }
  if (channel === 'reward_wallet') {
    return paymentsService.payWithRewardWallet(userId, orderId);
  }
  if (channel === 'mock') {
    throw new ValidationError('生产环境已禁用 mock 支付，请使用 Stripe Checkout 完成支付');
  }
  throw new ValidationError('请使用 Stripe Checkout 发起支付，支付结果以服务端 Webhook 回写为准');
}

async function createStripeCheckoutSession(userId, orderId) {
  const r = await paymentsService.createStripeCheckoutForOrder(userId, orderId, '', undefined);
  return { data: { url: r.data.url } };
}

async function confirmReceive(userId, orderId) {
  const conn = await db.getConnection();
  try {
    const order = await repo.selectOrderByIdAndUser(conn, orderId, userId);
    if (!order) throw new NotFoundError('订单不存在');
    if (order.status !== ORDER_STATUS.SHIPPED) throw new ValidationError('当前状态无法确认收货');

    await conn.beginTransaction();

    await repo.updateOrderStatus(conn, order.id, ORDER_STATUS.COMPLETED);

    await pointsService.settleOrderPoints(conn, order, { trigger: 'user_confirm_receive' });
    await rewardService.settleOrderRewards(conn, order, { trigger: 'user_confirm_receive' });

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
  createOrder,
  getOrders,
  getOrderById,
  cancelOrder,
  payOrder,
  createStripeCheckoutSession,
  confirmReceive,
};

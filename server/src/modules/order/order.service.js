const db = require('../../config/db');
const { generateId, generateOrderNo } = require('../../utils/helpers');
const { computeShippingFee, estimateWeightFromItems } = require('../../utils/shippingFee');
const { BusinessError } = require('../../errors/BusinessError');
const { formatOrderItem, formatOrder } = require('./order.mapper');
const { canUserCancel } = require('./orderStateMachine');
const repo = require('./order.repository');
const { ORDER_STATUS, PAYMENT_STATUS, REWARD_STATUS } = require('../../constants/status');

/**
 * @param {string} userId
 * @param {object} body
 */
async function createOrder(userId, body) {
  const {
    items, contact_name, contact_phone, address, note,
    coupon_id, coupon_title, shipping_template_id, shipping_name, payment_method,
    estimated_weight_kg,
  } = body;

  if (!items || !items.length) throw new BusinessError(400, '订单商品不能为空');
  if (!contact_name) throw new BusinessError(400, '联系人姓名不能为空');
  if (!contact_phone) throw new BusinessError(400, '联系人电话不能为空');
  for (const it of items) {
    if (!it.product_id || !Number.isInteger(it.qty) || it.qty <= 0) {
      throw new BusinessError(400, '商品数量无效');
    }
  }

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
        throw new BusinessError(400, `商品 ${item.product_id} 不存在或已下架`);
      }
      if (p.stock < item.qty) {
        await conn.rollback();
        throw new BusinessError(400, `商品「${p.name}」库存不足，剩余 ${p.stock} 件`);
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
    if (coupon_id) {
      const uc = await repo.selectUserCouponForUpdate(conn, coupon_id, userId);
      if (!uc) {
        await conn.rollback();
        throw new BusinessError(400, '优惠券不存在、已使用或不可用');
      }
      const minAmount = parseFloat(uc.min_amount);
      if (rawAmount < minAmount) {
        await conn.rollback();
        throw new BusinessError(400, `订单金额未满 RM ${minAmount}，无法使用该优惠券`);
      }
      discountAmount = uc.type === 'fixed'
        ? parseFloat(uc.value)
        : Math.floor(rawAmount * parseFloat(uc.value) / 100);
      discountAmount = Math.min(discountAmount, rawAmount);
      await repo.updateUserCouponUsed(conn, uc.uc_id);
      usedCouponUcId = uc.uc_id;
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
      couponTitle: coupon_title,
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
        throw new BusinessError(400, `商品「${oi.name}」库存不足`);
      }
    }

    await repo.incrementUserPoints(conn, userId, totalPoints);
    if (totalPoints > 0) {
      await repo.insertPointsRecord(conn, {
        id: generateId(),
        userId,
        action: 'order',
        amount: totalPoints,
        description: `下单奖励 ${orderNo}`,
      });
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
  if (!order) throw new BusinessError(404, '订单不存在');
  const items = await repo.selectOrderItems(db, order.id);
  return { data: formatOrder(order, items.map(formatOrderItem)) };
}

async function cancelOrder(userId, orderId) {
  const conn = await db.getConnection();
  try {
    const order = await repo.selectOrderByIdAndUser(conn, orderId, userId);
    if (!order) throw new BusinessError(404, '订单不存在');
    if (!canUserCancel(order)) throw new BusinessError(400, '当前订单状态无法取消（仅未付款的待处理订单可取消）');

    await conn.beginTransaction();

    await repo.updateOrderStatus(conn, order.id, ORDER_STATUS.CANCELLED);

    const lineItems = await repo.selectOrderItemQtyRows(conn, order.id);
    for (const item of lineItems) {
      await repo.restoreProductStock(conn, item.product_id, item.qty);
    }

    if (order.total_points > 0) {
      await repo.decrementUserPoints(conn, userId, order.total_points);
    }

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
  if (!order) throw new BusinessError(404, '订单不存在');
  if (order.status !== ORDER_STATUS.PENDING || (order.payment_status || PAYMENT_STATUS.PENDING) !== PAYMENT_STATUS.PENDING) {
    throw new BusinessError(400, '当前订单状态无法支付');
  }
  if (order.payment_method !== 'online') {
    throw new BusinessError(400, '该订单非在线支付，请按提示联系客服完成付款');
  }
  if (channel === 'mock') {
    throw new BusinessError(400, '生产环境已禁用 mock 支付，请使用 Stripe Checkout 完成支付');
  }
  throw new BusinessError(400, '请使用 Stripe Checkout 发起支付，支付结果以服务端 Webhook 回写为准');
}

async function createStripeCheckoutSession(userId, orderId) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new BusinessError(503, 'Stripe 未配置 STRIPE_SECRET_KEY');

  const base = (process.env.PUBLIC_APP_URL || '').trim().replace(/\/$/, '');
  if (!base) {
    throw new BusinessError(
      503,
      '请配置 PUBLIC_APP_URL（支付完成回跳地址，如 https://你的域名 或 http://localhost:5173）',
    );
  }

  const order = await repo.selectOrderByIdAndUser(db, orderId, userId);
  if (!order) throw new BusinessError(404, '订单不存在');
  if (order.status !== ORDER_STATUS.PENDING || (order.payment_status || PAYMENT_STATUS.PENDING) !== PAYMENT_STATUS.PENDING) {
    throw new BusinessError(400, '当前订单状态无法发起支付');
  }
  if (order.payment_method !== 'online') {
    throw new BusinessError(400, '该订单非在线支付');
  }

  const total = parseFloat(order.total_amount);
  const amountCents = Math.round(total * 100);
  if (!Number.isFinite(amountCents) || amountCents < 200) {
    throw new BusinessError(400, '订单金额不满足 Stripe 最低支付要求（一般 ≥ RM 2.00）');
  }

  const stripe = require('stripe')(secretKey);
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'myr',
          product_data: {
            name: `订单 ${order.order_no}`,
          },
          unit_amount: amountCents,
        },
        quantity: 1,
      },
    ],
    success_url: `${base}/orders/${orderId}?stripe=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/orders/${orderId}?stripe=cancel`,
    metadata: { order_id: order.id },
    payment_intent_data: {
      metadata: { order_id: order.id },
    },
  });

  if (!session.url) throw new BusinessError(500, 'Stripe 未返回支付链接');
  return { data: { url: session.url } };
}

async function confirmReceive(userId, orderId) {
  const conn = await db.getConnection();
  try {
    const order = await repo.selectOrderByIdAndUser(conn, orderId, userId);
    if (!order) throw new BusinessError(404, '订单不存在');
    if (order.status !== ORDER_STATUS.SHIPPED) throw new BusinessError(400, '当前状态无法确认收货');

    await conn.beginTransaction();

    await repo.updateOrderStatus(conn, order.id, ORDER_STATUS.COMPLETED);

    const buyer = await repo.selectUserInviteCode(conn, userId);
    if (buyer && buyer.parent_invite_code) {
      const inviter = await repo.selectUserIdByInviteCode(conn, buyer.parent_invite_code);
      if (inviter) {
        const rules = await repo.selectReferralRulesEnabled(conn);
        const l1Rule = rules.find((r) => r.level === 1);
        if (l1Rule) {
          const rewardAmount = Math.floor(
            parseFloat(order.total_amount) * parseFloat(l1Rule.reward_percent) / 100,
          );
          if (rewardAmount > 0) {
            await repo.insertRewardRecord(conn, {
              id: generateId(),
              userId: inviter.id,
              orderId: order.id,
              orderNo: order.order_no,
              amount: rewardAmount,
              rate: l1Rule.reward_percent,
              status: REWARD_STATUS.APPROVED,
            });
            await repo.incrementUserPoints(conn, inviter.id, rewardAmount);
            await repo.insertPointsRecord(conn, {
              id: generateId(),
              userId: inviter.id,
              action: 'invite_reward',
              amount: rewardAmount,
              description: `邀请奖励 订单${order.order_no}`,
            });
          }
        }
      }
    }

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

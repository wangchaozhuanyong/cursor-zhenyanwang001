const db = require('../../config/db');
const { generateId } = require('../../utils/helpers');
const { BusinessError } = require('../../errors/BusinessError');
const { logAdminAction } = require('../../utils/adminAudit');
const { rowsToCsv } = require('../../utils/csv');
const notificationRepo = require('../notification/notification.repository');
const {
  assertFulfillmentTransition,
  assertPaymentTransition,
  paymentStatusAfterFulfillmentChange,
  canShip,
} = require('../order/orderStateMachine');
const repo = require('./adminOrder.repository');
const { writeAuditLog } = require('../../utils/auditLog');
const { ORDER_STATUS, PAYMENT_STATUS, ORDER_STATUS_LIST, REWARD_STATUS } = require('../../constants/status');

function buildAdminOrderListWhere(query) {
  let where = 'WHERE 1=1';
  const params = [];
  const { status, paymentStatus, keyword } = query;
  if (status) {
    where += ' AND o.status = ?';
    params.push(status);
  }
  if (paymentStatus) {
    where += ' AND o.payment_status = ?';
    params.push(paymentStatus);
  }
  if (keyword) {
    where += ' AND (o.order_no LIKE ? OR o.contact_name LIKE ?)';
    params.push(`%${keyword}%`, `%${keyword}%`);
  }
  return { where, params };
}

function attachItemsAndAmounts(order, items) {
  const mapped = items.map((it) => ({
    product_id: it.product_id,
    qty: it.qty,
    price: parseFloat(it.unit_price),
    product: {
      id: it.product_id,
      name: it.name,
      cover_image: it.cover_image,
      price: parseFloat(it.unit_price),
    },
  }));
  order.items = mapped;
  order.total_amount = parseFloat(order.total_amount);
  order.raw_amount = parseFloat(order.raw_amount);
  order.shipping_fee = parseFloat(order.shipping_fee);
  order.discount_amount = parseFloat(order.discount_amount);
  return order;
}

async function listOrders(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(query.pageSize, 10) || 20));
  const { where, params } = buildAdminOrderListWhere(query);
  const total = await repo.countOrdersAdmin(where, params);
  const offset = (page - 1) * pageSize;
  const orders = await repo.selectOrdersAdminPage(where, params, pageSize, offset);

  if (orders.length > 0) {
    const orderIds = orders.map((o) => o.id);
    const allItems = await repo.selectOrderItemsBatch(orderIds);
    const itemsByOrderId = {};
    for (const it of allItems) {
      if (!itemsByOrderId[it.order_id]) itemsByOrderId[it.order_id] = [];
      itemsByOrderId[it.order_id].push(it);
    }
    for (const order of orders) {
      attachItemsAndAmounts(order, itemsByOrderId[order.id] || []);
    }
  }

  return { kind: 'paginate', list: orders, total, page, pageSize };
}

async function getOrderById(orderId) {
  const order = await repo.selectOrderById(db, orderId);
  if (!order) throw new BusinessError(404, '订单不存在');
  const items = await repo.selectOrderItemsWithProduct(db, order.id);
  attachItemsAndAmounts(order, items);
  return { data: order };
}

async function updateOrderStatus(orderId, body, adminUserId, req) {
  const { status, remark } = body;
  const validStatuses = ORDER_STATUS_LIST;
  if (!validStatuses.includes(status)) throw new BusinessError(400, `无效状态: ${status}`);

  const orderRow = await repo.selectOrderStateById(orderId);
  if (!orderRow) throw new BusinessError(404, '订单不存在');

  const beforeSnap = { status: orderRow.status, payment_status: orderRow.payment_status || PAYMENT_STATUS.PENDING };

  try {
    assertFulfillmentTransition(orderRow.status, status);

    const prevPay = orderRow.payment_status || PAYMENT_STATUS.PENDING;
    const newPayment = paymentStatusAfterFulfillmentChange(orderRow.status, status, prevPay);
    if (newPayment !== prevPay) {
      assertPaymentTransition(prevPay, newPayment);
    }

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query('UPDATE orders SET status = ?, payment_status = ? WHERE id = ?', [
        status,
        newPayment,
        orderId,
      ]);

      if (remark) {
        await conn.query(
          'UPDATE orders SET note = CONCAT(IFNULL(note, ""), ?) WHERE id = ?',
          [`\n[管理备注] ${remark}`, orderId],
        );
      }

      const [[fullOrder]] = await conn.query('SELECT * FROM orders WHERE id = ?', [orderId]);

      // 销量计数：当管理员手动确认付款（PENDING -> PAID 等）时累加 sales_count
      if (
        newPayment === PAYMENT_STATUS.PAID
        && prevPay !== PAYMENT_STATUS.PAID
        && fullOrder
      ) {
        try {
          const [salesItems] = await conn.query(
            'SELECT product_id, qty FROM order_items WHERE order_id = ?',
            [fullOrder.id],
          );
          for (const it of salesItems) {
            if (it?.product_id && Number(it.qty) > 0) {
              await conn.query(
                'UPDATE products SET sales_count = sales_count + ? WHERE id = ?',
                [Number(it.qty), it.product_id],
              );
            }
          }
        } catch { /* sales_count is non-critical */ }
      }

      if (status === ORDER_STATUS.CANCELLED && fullOrder) {
        const [items] = await conn.query('SELECT product_id, qty FROM order_items WHERE order_id = ?', [fullOrder.id]);
        for (const item of items) {
          await conn.query('UPDATE products SET stock = stock + ? WHERE id = ?', [item.qty, item.product_id]);
        }
        if (fullOrder.total_points > 0) {
          await conn.query(
            'UPDATE users SET points_balance = GREATEST(0, points_balance - ?) WHERE id = ?',
            [fullOrder.total_points, fullOrder.user_id],
          );
        }
        if (fullOrder.coupon_uc_id) {
          await conn.query(
            "UPDATE user_coupons SET status = 'available', used_at = NULL WHERE id = ?",
            [fullOrder.coupon_uc_id],
          );
        }
      }

      if (status === ORDER_STATUS.COMPLETED && fullOrder) {
        try {
          const [[buyer]] = await conn.query('SELECT parent_invite_code FROM users WHERE id = ?', [fullOrder.user_id]);
          if (buyer && buyer.parent_invite_code) {
            const [[inviter]] = await conn.query('SELECT id FROM users WHERE invite_code = ?', [buyer.parent_invite_code]);
            if (inviter) {
              const [rules] = await conn.query('SELECT * FROM referral_rules WHERE enabled = 1 ORDER BY level ASC');
              const l1Rule = rules.find((r) => r.level === 1);
              if (l1Rule) {
                const rewardAmount = Math.floor(
                  parseFloat(fullOrder.total_amount) * parseFloat(l1Rule.reward_percent) / 100,
                );
                if (rewardAmount > 0) {
                  await conn.query(
                    `INSERT INTO reward_records (id, user_id, order_id, order_no, amount, rate, status) VALUES (?,?,?,?,?,?,?)`,
                    [
                      generateId(),
                      inviter.id,
                      fullOrder.id,
                      fullOrder.order_no,
                      rewardAmount,
                      l1Rule.reward_percent,
                      REWARD_STATUS.APPROVED,
                    ],
                  );
                  await conn.query('UPDATE users SET points_balance = points_balance + ? WHERE id = ?', [
                    rewardAmount,
                    inviter.id,
                  ]);
                  await conn.query(
                    `INSERT INTO points_records (id, user_id, action, amount, description) VALUES (?,?,?,?,?)`,
                    [
                      generateId(),
                      inviter.id,
                      'invite_reward',
                      rewardAmount,
                      `邀请奖励 订单${fullOrder.order_no}`,
                    ],
                  );
                }
              }
            }
          }
        } catch { /* non-critical referral */ }
      }

      if (fullOrder) {
        const notifMessages = {
          [ORDER_STATUS.PAID]: '您的订单已确认付款',
          [ORDER_STATUS.SHIPPED]: '您的订单已发货，请注意查收',
          [ORDER_STATUS.COMPLETED]: '订单已完成，感谢您的购买',
          [ORDER_STATUS.CANCELLED]: '您的订单已取消',
          [ORDER_STATUS.REFUNDING]: '您的退款申请正在处理中',
          [ORDER_STATUS.REFUNDED]: '退款已到账',
        };
        const msg = notifMessages[status];
        if (msg) {
          await conn.query(
            `INSERT INTO notifications (id, user_id, type, title, content) VALUES (?,?,?,?,?)`,
            [generateId(), fullOrder.user_id, 'order', `订单${fullOrder.order_no}`, msg],
          );
        }
      }

      await conn.commit();
      await logAdminAction(adminUserId, '更新订单状态', `${orderId} → ${status}`);
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }

    await writeAuditLog({
      req,
      operatorId: adminUserId,
      actionType: 'order.status_update',
      objectType: 'order',
      objectId: orderId,
      summary: `订单状态 ${beforeSnap.status} → ${status}`,
      before: beforeSnap,
      after: { status, payment_status: newPayment },
      result: 'success',
    });
    return { data: null, message: '状态已更新' };
  } catch (err) {
    await writeAuditLog({
      req,
      operatorId: adminUserId,
      actionType: 'order.status_update',
      objectType: 'order',
      objectId: orderId,
      summary: '订单状态更新失败',
      before: beforeSnap,
      result: 'failure',
      errorMessage: err.message || String(err),
    });
    throw err;
  }
}

async function shipOrder(orderId, body, adminUserId, req) {
  const order = await repo.selectOrderById(db, orderId);
  const beforeSnap = order
    ? {
        status: order.status,
        payment_status: order.payment_status || PAYMENT_STATUS.PENDING,
        tracking_no: order.tracking_no || '',
        carrier: order.carrier || '',
      }
    : null;

  try {
    if (!order) throw new BusinessError(404, '订单不存在');
    if (!canShip(order)) {
      throw new BusinessError(
        400,
        `当前履约/支付状态无法发货（需履约「已付款」且支付「已支付」），当前：履约=${order.status} 支付=${order.payment_status || PAYMENT_STATUS.PENDING}`,
      );
    }

    const trackingNo = body.trackingNo || body.tracking_no || '';
    const carrier = body.carrier || '';
    await repo.updateOrderShipped(orderId, trackingNo, carrier);

    await notificationRepo.insertNotification({
      id: generateId(),
      user_id: order.user_id,
      type: 'order',
      title: '订单已发货',
      content: `您的订单 ${order.order_no} 已发货，物流：${carrier || '暂无'} ${trackingNo || ''}`,
    });

    await logAdminAction(adminUserId, '订单发货', `${orderId} ${carrier} ${trackingNo}`);

    await writeAuditLog({
      req,
      operatorId: adminUserId,
      actionType: 'order.ship',
      objectType: 'order',
      objectId: orderId,
      summary: `订单发货 ${order.order_no}`,
      before: beforeSnap,
      after: { status: ORDER_STATUS.SHIPPED, tracking_no: trackingNo, carrier },
      result: 'success',
    });
    return { data: null, message: '已发货' };
  } catch (err) {
    await writeAuditLog({
      req,
      operatorId: adminUserId,
      actionType: 'order.ship',
      objectType: 'order',
      objectId: orderId,
      summary: '订单发货失败',
      before: beforeSnap || undefined,
      result: 'failure',
      errorMessage: err.message || String(err),
    });
    throw err;
  }
}

const ORDER_EXPORT_HEADERS = [
  'id', 'order_no', 'user_id', 'status', 'payment_status', 'total_amount', 'raw_amount', 'discount_amount', 'shipping_fee',
  'total_points', 'contact_name', 'contact_phone', 'address', 'payment_method', 'coupon_title',
  'shipping_name', 'tracking_no', 'carrier', 'note', 'created_at',
];

async function exportOrdersCsv(query) {
  const { where, params } = buildAdminOrderListWhere(query);
  const rows = await repo.selectOrdersForExport(where, params);
  const data = rows.map((o) => ({
    id: o.id,
    order_no: o.order_no,
    user_id: o.user_id,
    status: o.status,
    payment_status: o.payment_status || PAYMENT_STATUS.PENDING,
    total_amount: o.total_amount,
    raw_amount: o.raw_amount,
    discount_amount: o.discount_amount,
    shipping_fee: o.shipping_fee,
    total_points: o.total_points,
    contact_name: o.contact_name || '',
    contact_phone: o.contact_phone || '',
    address: (o.address || '').replace(/\r\n/g, ' ').replace(/,/g, '，'),
    payment_method: o.payment_method || '',
    coupon_title: o.coupon_title || '',
    shipping_name: o.shipping_name || '',
    tracking_no: o.tracking_no || '',
    carrier: o.carrier || '',
    note: (o.note || '').replace(/\r\n/g, ' '),
    created_at: o.created_at ? new Date(o.created_at).toISOString() : '',
  }));
  const csv = rowsToCsv(ORDER_EXPORT_HEADERS, data);
  return { csv, filename: `orders_${Date.now()}.csv` };
}

module.exports = {
  listOrders,
  getOrderById,
  updateOrderStatus,
  shipOrder,
  exportOrdersCsv,
};

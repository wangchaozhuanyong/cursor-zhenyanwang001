/**
 * Admin Order Service
 *
 * 职责：管理员对订单的列表/详情/状态变�?发货等业务编排�? * 分层约定�? * - 不直接拼 SQL，所有数据访问通过 `./adminOrder.repository`
 * - 事务由本层控制：`repo.getConnection()` + `beginTransaction()`，并�?`conn` 传给 repository 事务方法
 */
const { generateId } = require('../../../utils/helpers');
const { BusinessError, NotFoundError, ValidationError } = require('../../../errors');
const { rowsToCsvLocalized } = require('../../../utils/adminCsvLabels');
const { maskPhone } = require('../../../utils/privacyMask');
const { getResolvedTriggerCopy } = require('./notificationTriggerSettings.service');
const repo = require('../repository/adminOrder.repository');
const adminEventBus = require('./adminEventBus.service');
const { writeAuditLog } = require('../../../utils/auditLog');
const { ORDER_STATUS, PAYMENT_STATUS, ORDER_STATUS_LIST } = require('../../../constants/status');
function getUserApi() {
  return /** @type {any} */ (require('../../user')).api || {};
}
function getOrderApi() {
  return /** @type {any} */ (require('../../order')).api || {};
}
function getLogisticsApi() {
  return /** @type {any} */ (require('../../logistics')).api || {};
}
function getMyinvoisApi() {
  return /** @type {any} */ (require('../../myinvois')).api || {};
}

function requireUserApi(name) {
  const fn = getUserApi()[name];
  if (typeof fn !== 'function') {
    throw new Error(`User 模块 API 未暴露方法：${name}`);
  }
  return fn;
}

function requireLogisticsApi(name) {
  const fn = getLogisticsApi()[name];
  if (typeof fn !== 'function') {
    throw new Error(`Logistics 模块 API 未暴露方法：${name}`);
  }
  return fn;
}

function requireMyinvoisApi(name) {
  const fn = getMyinvoisApi()[name];
  if (typeof fn !== 'function') {
    throw new Error(`MyInvois 模块 API 未暴露方法：${name}`);
  }
  return fn;
}

function requireOrderApi(name) {
  const fn = getOrderApi()[name];
  if (typeof fn !== 'function') {
    throw new Error(`Order 模块 API 未暴露方法：${name}`);
  }
  return fn;
}

function normalizeOrderIdsInput(value) {
  const rawItems = Array.isArray(value) ? value : String(value || '').split(',');
  const orderIds = rawItems
    .flatMap((item) => String(item || '').split(','))
    .map((item) => item.trim())
    .filter(Boolean);
  return Array.from(new Set(orderIds));
}

function buildAdminOrderListWhere(query) {
  let where = 'WHERE 1=1';
  const params = [];
  const {
    ids,
    order_ids: orderIds,
    orderIds: camelOrderIds,
    status,
    paymentStatus,
    payment_method: paymentMethod,
    payment_channel: paymentChannel,
    shipping_name: shippingName,
    keyword,
    dateFrom,
    dateTo,
    amountMin,
    amountMax,
    returnStatus,
    refundStatus,
    hasNote,
    costStatus,
    overduePayment,
    overdueShipment,
    buyerType,
  } = query;
  const selectedOrderIds = normalizeOrderIdsInput(ids || orderIds || camelOrderIds);
  if (selectedOrderIds.length > 1000) {
    throw new ValidationError('单次最多导出 1000 个勾选订单');
  }
  if (selectedOrderIds.length) {
    where += ` AND o.id IN (${selectedOrderIds.map(() => '?').join(',')})`;
    params.push(...selectedOrderIds);
  }
  if (status) {
    where += ' AND o.status = ?';
    params.push(status);
  }
  if (paymentStatus) {
    where += ' AND o.payment_status = ?';
    params.push(paymentStatus);
  }
  if (paymentMethod) {
    where += ' AND o.payment_method = ?';
    params.push(paymentMethod);
  }
  if (paymentChannel) {
    where += ' AND o.payment_channel = ?';
    params.push(paymentChannel);
  }
  if (shippingName) {
    where += ' AND o.shipping_name = ?';
    params.push(shippingName);
  }
  if (keyword) {
    where += ` AND (
      o.order_no LIKE ?
      OR o.contact_name LIKE ?
      OR o.contact_phone LIKE ?
      OR COALESCE(o.shipping_phone, '') LIKE ?
      OR o.user_id LIKE ?
      OR COALESCE(u.nickname, '') LIKE ?
      OR COALESCE(u.phone, '') LIKE ?
      OR COALESCE(u.email, '') LIKE ?
      OR COALESCE(o.tracking_no, '') LIKE ?
      OR COALESCE(o.payment_transaction_no, '') LIKE ?
    )`;
    params.push(
      `%${keyword}%`, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`,
      `%${keyword}%`, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`,
    );
  }
  if (dateFrom) {
    where += ' AND o.created_at >= ?';
    params.push(dateFrom);
  }
  if (dateTo) {
    where += ' AND o.created_at < DATE_ADD(?, INTERVAL 1 DAY)';
    params.push(dateTo);
  }
  const min = Number(amountMin);
  if (Number.isFinite(min)) {
    where += ' AND o.total_amount >= ?';
    params.push(min);
  }
  const max = Number(amountMax);
  if (Number.isFinite(max)) {
    where += ' AND o.total_amount <= ?';
    params.push(max);
  }
  if (returnStatus === 'active') {
    where += " AND EXISTS (SELECT 1 FROM return_requests rr WHERE rr.order_id = o.id AND rr.status IN ('pending', 'approved', 'processing'))";
  } else if (returnStatus === 'none') {
    where += ' AND NOT EXISTS (SELECT 1 FROM return_requests rr WHERE rr.order_id = o.id)';
  } else if (returnStatus === 'any') {
    where += ' AND EXISTS (SELECT 1 FROM return_requests rr WHERE rr.order_id = o.id)';
  }
  if (refundStatus) {
    where += ' AND o.refund_status = ?';
    params.push(refundStatus);
  }
  if (hasNote === '1' || hasNote === true) {
    where += " AND COALESCE(o.note, '') <> ''";
  } else if (hasNote === '0') {
    where += " AND COALESCE(o.note, '') = ''";
  }
  if (costStatus === 'missing') {
    where += " AND EXISTS (SELECT 1 FROM order_items oi_cost WHERE oi_cost.order_id = o.id AND oi_cost.cost_snapshot_source = 'missing')";
  } else if (costStatus === 'normal') {
    where += " AND NOT EXISTS (SELECT 1 FROM order_items oi_cost WHERE oi_cost.order_id = o.id AND oi_cost.cost_snapshot_source = 'missing')";
  }
  if (overduePayment === '1' || overduePayment === true) {
    where += " AND COALESCE(o.payment_status, 'pending') = 'pending' AND o.created_at < DATE_SUB(NOW(), INTERVAL 2 HOUR)";
  }
  if (overdueShipment === '1' || overdueShipment === true) {
    where += " AND o.status = 'paid' AND o.payment_status IN ('paid', 'partially_refunded') AND COALESCE(o.paid_at, o.payment_time, o.created_at) < DATE_SUB(NOW(), INTERVAL 24 HOUR)";
  }
  if (buyerType === 'new') {
    where += ' AND (SELECT COUNT(*) FROM orders ou WHERE ou.user_id = o.user_id) <= 1';
  } else if (buyerType === 'repeat') {
    where += ' AND (SELECT COUNT(*) FROM orders ou WHERE ou.user_id = o.user_id) > 1';
  }
  return { where, params };
}

function normalizeOrderSummary(summaryRows = []) {
  const base = {
    pending: 0,
    paid: 0,
    shipped: 0,
    completed: 0,
    cancelled: 0,
    refunding: 0,
    refunded: 0,
  };
  for (const row of summaryRows) {
    const key = String(row.status || '');
    if (Object.prototype.hasOwnProperty.call(base, key)) {
      base[key] = Number(row.count) || 0;
    }
  }
  return base;
}

function normalizeOperationalSummary(row = {}) {
  const numericKeys = [
    'today_order_count',
    'today_paid_order_count',
    'today_paid_amount',
    'today_refund_amount',
    'today_gross_profit_amount',
    'today_net_profit_amount',
    'pending_payment_amount',
    'pending_shipment_count',
    'pending_shipment_amount',
    'active_return_count',
    'overdue_unpaid_count',
    'overdue_shipment_count',
  ];
  return Object.fromEntries(numericKeys.map((key) => [key, Number(row[key] || 0)]));
}

function buildOrderBadges(order) {
  const badges = [];
  if (order.note) badges.push('买家备注');
  if (Number(order.active_return_count || 0) > 0) badges.push('售后中');
  if (Number(order.refund_amount || order.refunded_amount || 0) > 0) badges.push('有退款');
  if (order.cost_snapshot_source === 'missing' || Number(order.missing_cost_item_count || 0) > 0) badges.push('缺成本');
  if (Number(order.total_amount || 0) >= 500) badges.push('高金额');
  if ((order.payment_status || PAYMENT_STATUS.PENDING) === PAYMENT_STATUS.PENDING) {
    const created = order.created_at ? new Date(order.created_at).getTime() : 0;
    if (created && Date.now() - created > 2 * 60 * 60 * 1000) badges.push('超时未支付');
  }
  if (order.status === ORDER_STATUS.PAID && ['paid', 'partially_refunded'].includes(order.payment_status || '')) {
    const paidAt = order.paid_at || order.payment_time || order.created_at;
    const paidTime = paidAt ? new Date(paidAt).getTime() : 0;
    if (paidTime && Date.now() - paidTime > 24 * 60 * 60 * 1000) badges.push('待发货超24h');
  }
  return badges;
}

function escapeRegExp(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function maskSensitiveText(text, phones = []) {
  let output = String(text || '');
  for (const phone of phones) {
    const raw = String(phone || '').trim();
    const compact = raw.replace(/\s+/g, '');
    const masked = maskPhone(raw);
    if (!raw || !masked) continue;
    output = output.replace(new RegExp(escapeRegExp(raw), 'g'), masked);
    if (compact && compact !== raw) {
      output = output.replace(new RegExp(escapeRegExp(compact), 'g'), masked);
    }
  }
  return output;
}

function sanitizeAdminOrderListRow(order) {
  const shippingPhone = order.shipping_phone || order.contact_phone || '';
  order.contact_phone_masked = maskPhone(order.contact_phone);
  order.shipping_phone_masked = maskPhone(shippingPhone);
  order.user_phone_masked = maskPhone(order.user_phone);
  order.after_sale_status = Number(order.active_return_count || 0) > 0
    ? 'active'
    : Number(order.refund_amount || order.refunded_amount || 0) > 0
      ? ((order.payment_status || '') === 'partially_refunded' || (order.refund_status || '') === 'partially_refunded' ? 'partial_refunded' : 'refunded')
      : 'none';
  order.risk_badges = buildOrderBadges(order);
  order.contact_phone = undefined;
  order.shipping_phone = undefined;
  order.user_phone = undefined;
  order.address = undefined;
  return order;
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
  order.goods_cost_amount = parseFloat(order.goods_cost_amount || 0);
  order.gross_profit_amount = parseFloat(order.gross_profit_amount || 0);
  order.shipping_cost_amount = parseFloat(order.shipping_cost_amount || 0);
  order.payment_fee_amount = parseFloat(order.payment_fee_amount || 0);
  order.net_profit_amount = parseFloat(order.net_profit_amount || 0);
  order.refund_amount = parseFloat(order.refund_amount || order.refunded_amount || 0);
  return order;
}

async function listOrders(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(query.pageSize, 10) || 20));
  const { where, params } = buildAdminOrderListWhere(query);
  const total = await repo.countOrdersAdmin(where, params);
  const offset = (page - 1) * pageSize;
  const [orders, summaryRows, operationalSummary, globalToday] = await Promise.all([
    repo.selectOrdersAdminPage(where, params, pageSize, offset),
    repo.selectOrderStatusSummary(where, params),
    repo.selectOrderOperationalSummary(where, params),
    repo.selectOrderGlobalTodaySummary(),
  ]);

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
  for (const order of orders) {
    sanitizeAdminOrderListRow(order);
  }

  return {
    kind: 'paginate',
    list: orders,
    total,
    page,
    pageSize,
    summary: {
      ...normalizeOrderSummary(summaryRows),
      ...normalizeOperationalSummary(operationalSummary),
      ...Object.fromEntries(
        [
          'today_order_count',
          'today_paid_order_count',
          'today_paid_amount',
          'today_refund_amount',
          'today_gross_profit_amount',
          'today_net_profit_amount',
        ].map((key) => [key, Number(normalizeOperationalSummary(globalToday)[key] || 0)]),
      ),
    },
  };
}

async function getOrderById(orderId) {
  const { formatOrder, formatOrderItem } = require('../../order/order.mapper');
  const order = await repo.selectOrderById(null, orderId);
  if (!order) throw new NotFoundError('订单不存在');
  const rawItems = await repo.selectOrderItemsWithProduct(repo.getPool(), order.id);
  const items = rawItems.map((it) =>
    formatOrderItem({
      ...it,
      product_name: it.name,
      product_image: it.cover_image,
      price: it.unit_price,
    }),
  );
  const data = formatOrder(order, items);
  await requireLogisticsApi('attachTracking')(data);
  return { data };
}

/**
 * ����Ա�ֶ���������״̬��ͳһ����״̬У�顢��桢���֡��Ż�ȯ�����뽱����֪ͨ��
 */
async function updateOrderStatus(orderId, body, adminUserId, req) {
  const { status, remark } = body;
  if (!ORDER_STATUS_LIST.includes(status)) {
      throw new ValidationError(`无效状态: ${status}`);
  }

  const orderRow = await repo.selectOrderStateById(orderId);
  if (!orderRow) throw new NotFoundError('订单不存在');

  const beforeSnap = {
    status: orderRow.status,
    payment_status: orderRow.payment_status || PAYMENT_STATUS.PENDING,
  };

  try {
    requireOrderApi('assertFulfillmentTransition')(orderRow.status, status);

    const prevPay = orderRow.payment_status || PAYMENT_STATUS.PENDING;
    const newPayment = requireOrderApi('paymentStatusAfterFulfillmentChange')(orderRow.status, status, prevPay);
    if (newPayment !== prevPay) {
      requireOrderApi('assertPaymentTransition')(prevPay, newPayment);
    }

    const conn = await repo.getConnection();
    try {
      await conn.beginTransaction();
      const isNewPaidPayment = newPayment === PAYMENT_STATUS.PAID && prevPay !== PAYMENT_STATUS.PAID;
      if (isNewPaidPayment) {
        await repo.updateOrderStatusPaymentAndPaidTime(conn, orderId, status, newPayment);
      } else {
        await repo.updateOrderStatusAndPayment(conn, orderId, status, newPayment);
      }
      if (newPayment === PAYMENT_STATUS.PAID) {
        await requireOrderApi('markCheckoutAbandonmentPaidByOrderId')(conn, orderId);
      } else if (status === ORDER_STATUS.CANCELLED) {
        await requireOrderApi('markCheckoutAbandonmentClosedByOrderId')(conn, orderId);
      }
      if (status === ORDER_STATUS.SHIPPED) {
        await repo.touchOrderShippedAtIfNull(conn, orderId);
      }

      if (remark) {
        await repo.appendAdminRemark(conn, orderId, remark);
      }

      const fullOrder = await repo.selectFullOrder(conn, orderId);

      /** 销量计数：管理员手动确认付款时累加 sales_count；失败不阻断主流�?*/
      if (
        newPayment === PAYMENT_STATUS.PAID
        && prevPay !== PAYMENT_STATUS.PAID
        && fullOrder
      ) {
        await requireUserApi('syncStatsAfterOrderPaid')(fullOrder.user_id, fullOrder.total_amount, fullOrder.id, conn);
        await requireOrderApi('maybeGrantOrderEarnOnPaymentSuccess')(conn, fullOrder, {
          operatorId: adminUserId,
          trigger: 'admin_order_status_paid',
        });
        await requireUserApi('refreshUserMemberLevel')(conn, fullOrder.user_id);
        try {
          const salesItems = await repo.selectOrderItemPairs(conn, fullOrder.id);
          for (const it of salesItems) {
            const qty = Number(it?.qty);
            if (it?.product_id && qty > 0) {
              await repo.bumpProductSalesCount(conn, it.product_id, qty);
            }
          }
        } catch { /* sales_count is non-critical */ }
      }

      if (status === ORDER_STATUS.CANCELLED && fullOrder) {
        if (beforeSnap.status !== ORDER_STATUS.CANCELLED) {
          await requireUserApi('syncStatsAfterOrderCancelled')(fullOrder.user_id, fullOrder.id, conn);
        }
        const items = await repo.selectOrderItemPairs(conn, fullOrder.id);
        const cancelItems = await requireOrderApi('selectOrderItemQtyRows')(conn, fullOrder.id);
        for (const item of cancelItems) {
          if (!item.variant_id) {
        throw new BusinessError(400, `订单 ${fullOrder.order_no} 缺失 SKU 明细，无法执行库存释放`);
          }
          await repo.restoreVariantStock(conn, item.variant_id, item.qty, {
            refType: 'order',
            refId: fullOrder.id,
            orderNo: fullOrder.order_no,
            operatorId: adminUserId,
            reason: `管理员取消订单 #${fullOrder.order_no} 释放 SKU 库存`,
          });
          if (item.activity_id) {
            await requireOrderApi('decrementActivitySold')(conn, item.activity_id, item.product_id, item.qty);
          }
        }
        if (Number(fullOrder.reward_cash_used || 0) > 0) {
          await requireUserApi('insertRewardTransaction')(conn, {
            id: generateId(),
            rewardRecordId: null,
            userId: fullOrder.user_id,
            orderId: fullOrder.id,
            orderNo: fullOrder.order_no,
            type: 'wallet_redeem_refund',
            amount: Number(fullOrder.reward_cash_used || 0),
            status: 'success',
            reason: `管理员取消订单退回返现抵扣 ${fullOrder.order_no}`,
            metadata: { trigger: 'admin_order_cancelled' },
          });
        }
        if (fullOrder.coupon_uc_id) {
          await repo.restoreUserCouponById(conn, fullOrder.coupon_uc_id);
        }
      }

      if (status === ORDER_STATUS.SHIPPED && fullOrder) {
        await requireOrderApi('maybeGrantOrderEarnPoints')(conn, fullOrder, {
          operatorId: adminUserId,
          trigger: 'order_shipped',
          timing: 'order_shipped',
        });
      }

      if (status === ORDER_STATUS.COMPLETED && fullOrder) {
        await requireOrderApi('maybeGrantOrderEarnPoints')(conn, fullOrder, {
          operatorId: adminUserId,
          trigger: 'admin_order_completed',
          timing: 'order_completed',
        });
        await requireUserApi('settleOrderRewards')(conn, fullOrder, {
          operatorId: adminUserId,
          trigger: 'admin_order_completed',
        });
      }

      if ((status === ORDER_STATUS.CANCELLED || status === ORDER_STATUS.REFUNDED) && fullOrder) {
        await requireOrderApi('rollbackOrderPoints')(conn, fullOrder, {
          operatorId: adminUserId,
          trigger: `admin_order_${status}`,
          description: `Order status changed to ${status}; rollback earned points`,
          redeemDescription: `Order status changed to ${status}; refund redeemed points`,
          sourceType: `admin_order_${status}`,
        });
        await requireUserApi('reverseOrderRewards')(conn, fullOrder, `订单状态变更为 ${status}，奖励已回滚`, {
          operatorId: adminUserId,
          trigger: `admin_order_${status}`,
        });
        if (status === ORDER_STATUS.REFUNDED) {
          const refundAmt = Math.max(
            0,
            Number(fullOrder.total_amount || 0) - Number(fullOrder.refunded_amount || 0),
          );
          await requireUserApi('syncStatsAfterRefund')(
            fullOrder.user_id,
            fullOrder.id,
            refundAmt > 0 ? refundAmt : Number(fullOrder.total_amount || 0),
            conn,
            { isFullRefund: true, eventType: 'refunded' },
          );
          await requireUserApi('refreshUserMemberLevel')(conn, fullOrder.user_id, { force: false });
        }
      }

      if (fullOrder) {
        const copy = await getResolvedTriggerCopy(`order_status_${status}`, {
          order_no: fullOrder.order_no,
        });
        if (copy) {
          await repo.insertOrderNotification(conn, {
            id: generateId(),
            userId: fullOrder.user_id,
            title: copy.title,
            content: copy.content,
          });
        }
      }

      await conn.commit();
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
      summary: `订单状态 ${beforeSnap.status} -> ${status}`,
      before: beforeSnap,
      after: { status, payment_status: newPayment },
      result: 'success',
    });
    adminEventBus.publishAdminEvent({
      type: 'order.updated',
      objectId: orderId,
      summary: `订单状态 ${beforeSnap.status} -> ${status}`,
    });
    if (newPayment === PAYMENT_STATUS.PAID && prevPay !== PAYMENT_STATUS.PAID) {
      try {
        await requireMyinvoisApi('enqueueOrderInvoiceIfEnabled')(orderId, 'admin_order_status_paid');
      } catch (e) {
        console.error('[MyInvois] enqueue invoice after order status update failed:', e?.message || e);
      }
    }
    if (status === ORDER_STATUS.REFUNDED) {
      try {
        await requireMyinvoisApi('enqueueRefundCreditNoteIfEnabled')({ orderId }, 'admin_order_refunded');
      } catch (e) {
        console.error('[MyInvois] enqueue credit note after order refund failed:', e?.message || e);
      }
    }
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
  const order = await repo.selectOrderById(null, orderId);
  const beforeSnap = order
    ? {
        status: order.status,
        payment_status: order.payment_status || PAYMENT_STATUS.PENDING,
        tracking_no: order.tracking_no || '',
        carrier: order.carrier || '',
      }
    : null;

  try {
    if (!order) throw new NotFoundError('订单不存在');
    if (!requireOrderApi('canShip')(order)) {
        throw new BusinessError(
          400,
          `当前履约/支付状态无法发货（需履约“已付款”且支付“已支付”），当前：履约=${order.status} 支付=${order.payment_status || PAYMENT_STATUS.PENDING}`,
        );
    }

    const trackingNo = body.trackingNo || body.tracking_no || '';
    const carrier = body.carrier || '';
    const shippingCostAmountInput = body.shipping_cost_amount;
    await repo.updateOrderShipped(orderId, trackingNo, carrier);
    const pointsConn = await repo.getConnection();
    try {
      await pointsConn.beginTransaction();
      if (shippingCostAmountInput !== undefined) {
        await requireOrderApi('recomputeOrderProfitAmounts')(pointsConn, order.id, {
          shippingCostAmount: Number(shippingCostAmountInput || 0),
        });
      }
      await requireOrderApi('maybeGrantOrderEarnPoints')(pointsConn, order, {
        operatorId: adminUserId,
        trigger: 'order_shipped',
        timing: 'order_shipped',
      });
      await pointsConn.commit();
    } catch (err) {
      await pointsConn.rollback();
      throw err;
    } finally {
      pointsConn.release();
    }
    await requireLogisticsApi('refreshOrderTrackingQuietly')(orderId);

    const shipCopy = await getResolvedTriggerCopy('order_ship', {
      order_no: order.order_no,
      carrier: carrier || '暂无',
      tracking_no: trackingNo || '',
    });
    if (shipCopy) {
      await requireUserApi('insertUserNotification')({
        id: generateId(),
        userId: order.user_id,
        type: 'order',
        title: shipCopy.title,
        content: shipCopy.content,
      });
    }

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
    adminEventBus.publishAdminEvent({
      type: 'order.shipped',
      objectId: orderId,
      summary: `订单发货 ${order.order_no}`,
    });
    await requireOrderApi('autoResolveOrderTimeoutEvents')(orderId, {
      trigger: 'admin_ship_order',
      orderNo: order.order_no,
      carrier,
      trackingNo,
    }).catch(() => {});
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
  'tax_mode', 'tax_rate', 'tax_label', 'taxable_amount', 'tax_amount', 'tax_exclusive_amount',
  'total_points', 'user_nickname', 'user_phone_masked', 'contact_name', 'contact_phone_masked', 'shipping_phone_masked',
  'items_summary', 'items_count', 'sku_count', 'address', 'payment_method', 'payment_channel', 'payment_transaction_no',
  'paid_at', 'coupon_title', 'shipping_name', 'tracking_no', 'carrier', 'shipped_at', 'return_request_count',
  'active_return_count', 'refund_amount', 'goods_cost_amount', 'gross_profit_amount', 'shipping_cost_amount', 'payment_fee_amount', 'net_profit_amount', 'note', 'created_at',
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
    tax_mode: o.tax_mode ?? '',
    tax_rate: o.tax_rate ?? '',
    tax_label: o.tax_label ?? '',
    taxable_amount: o.taxable_amount ?? '',
    tax_amount: o.tax_amount ?? '',
    tax_exclusive_amount: o.tax_exclusive_amount ?? '',
    total_points: o.total_points,
    user_nickname: o.user_nickname || '',
    user_phone_masked: maskPhone(o.user_phone),
    contact_name: o.contact_name || '',
    contact_phone_masked: maskPhone(o.contact_phone),
    shipping_phone_masked: maskPhone(o.shipping_phone || o.contact_phone),
    items_summary: o.items_summary || '',
    items_count: o.items_count || 0,
    sku_count: o.sku_count || 0,
    address: maskSensitiveText(o.address || '', [o.contact_phone, o.shipping_phone, o.user_phone]).replace(/\r\n/g, ' ').replace(/,/g, ' '),
    payment_method: o.payment_method || '',
    payment_channel: o.payment_channel || '',
    payment_transaction_no: o.payment_transaction_no || '',
    paid_at: o.paid_at || o.payment_time ? new Date(o.paid_at || o.payment_time).toISOString() : '',
    coupon_title: o.coupon_title || '',
    shipping_name: o.shipping_name || '',
    tracking_no: o.tracking_no || '',
    carrier: o.carrier || '',
    shipped_at: o.shipped_at ? new Date(o.shipped_at).toISOString() : '',
    return_request_count: o.return_request_count || 0,
    active_return_count: o.active_return_count || 0,
    refund_amount: o.refund_amount || o.refunded_amount || 0,
    goods_cost_amount: o.goods_cost_amount || 0,
    gross_profit_amount: o.gross_profit_amount || 0,
    shipping_cost_amount: o.shipping_cost_amount || 0,
    payment_fee_amount: o.payment_fee_amount || 0,
    net_profit_amount: o.net_profit_amount || 0,
    note: (o.note || '').replace(/\r\n/g, ' '),
    created_at: o.created_at ? new Date(o.created_at).toISOString() : '',
  }));
  const csv = rowsToCsvLocalized(ORDER_EXPORT_HEADERS, data);
  return { csv, filename: `orders_${Date.now()}.csv` };
}

async function listPendingShipmentOrders(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize, 10) || 20));
  const total = await repo.countPendingShipmentOrders();
  const offset = (page - 1) * pageSize;
  const list = await repo.selectPendingShipmentOrdersPage(pageSize, offset);
  return { kind: 'paginate', list, total, page, pageSize };
}

async function batchShipOrders(payload = {}, adminUserId, req) {
  const orderIds = Array.isArray(payload.order_ids) ? payload.order_ids.filter(Boolean) : [];
  const carrier = String(payload.carrier || '').trim();
  const trackingMap = payload.tracking_map && typeof payload.tracking_map === 'object' ? payload.tracking_map : {};
  if (!orderIds.length) throw new ValidationError('order_ids 不能为空');
  if (!carrier) throw new ValidationError('carrier 不能为空');

  const orders = await repo.selectOrdersByIds(orderIds);
  const orderById = new Map(orders.map((o) => [o.id, o]));
  let shipped = 0;
  const failed = [];
  for (const orderId of orderIds) {
    const row = orderById.get(orderId);
    if (!row) {
      failed.push({ order_id: orderId, reason: '订单不存在' });
      continue;
    }
    if (!requireOrderApi('canShip')(row)) {
        failed.push({ order_id: orderId, reason: `状态不允许发货: ${row.status}/${row.payment_status || PAYMENT_STATUS.PENDING}` });
      continue;
    }
    const trackingNo = String(trackingMap[orderId] || '').trim();
    if (!trackingNo) {
      failed.push({ order_id: orderId, reason: '缺少 tracking_no' });
      continue;
    }
    await repo.updateOrderShipped(orderId, trackingNo, carrier);
    const pointsConn = await repo.getConnection();
    try {
      await pointsConn.beginTransaction();
      await requireOrderApi('maybeGrantOrderEarnPoints')(pointsConn, row, {
        operatorId: adminUserId,
        trigger: 'order_shipped',
        timing: 'order_shipped',
      });
      await pointsConn.commit();
    } catch (err) {
      await pointsConn.rollback();
      failed.push({ order_id: orderId, reason: err.message || 'points_grant_failed' });
      continue;
    } finally {
      pointsConn.release();
    }
    shipped += 1;
    await requireOrderApi('autoResolveOrderTimeoutEvents')(orderId, {
      trigger: 'admin_batch_ship_order',
      orderNo: row.order_no,
      carrier,
      trackingNo,
    }).catch(() => {});
    try {
      const copy = await getResolvedTriggerCopy('order_ship', {
        order_no: row.order_no,
        carrier: carrier || '',
        tracking_no: trackingNo || '',
      });
      if (copy) {
        await requireUserApi('insertUserNotification')({
          id: generateId(),
          userId: row.user_id,
          type: 'order',
          title: copy.title,
          content: copy.content,
        });
      }
    } catch {
      // noop
    }
  }

  await writeAuditLog({
    req,
    operatorId: adminUserId,
    actionType: 'order.batch_ship',
    objectType: 'order',
    objectId: '',
    summary: `批量发货 ${shipped}/${orderIds.length}`,
    after: { carrier, shipped, failed_count: failed.length },
    result: 'success',
  });
  return { data: { shipped, failed }, message: `批量发货完成，成功 ${shipped}，失败 ${failed.length}` };
}

module.exports = {
  listOrders,
  getOrderById,
  updateOrderStatus,
  shipOrder,
  exportOrdersCsv,
  listPendingShipmentOrders,
  batchShipOrders,
};

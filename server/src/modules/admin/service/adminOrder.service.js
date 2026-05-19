/**
 * Admin Order Service
 *
 * 鑱岃矗锛氱鐞嗗憳瀵硅鍗曠殑鍒楄〃/璇︽儏/鐘舵€佸彉鏇?鍙戣揣绛変笟鍔＄紪鎺掋€? * 鍒嗗眰绾﹀畾锛? * - 涓嶇洿鎺ユ嫾 SQL锛屾墍鏈夋暟鎹闂€氳繃 `./adminOrder.repository`
 * - 浜嬪姟鐢辨湰灞傛帶鍒讹細`repo.getConnection()` + `beginTransaction()`锛屽苟灏?`conn` 浼犵粰 repository 浜嬪姟鏂规硶
 */
const { generateId } = require('../../../utils/helpers');
const { BusinessError, NotFoundError, ValidationError } = require('../../../errors');
const { logAdminAction } = require('../../../utils/adminAudit');
const { rowsToCsvLocalized } = require('../../../utils/adminCsvLabels');
const { getResolvedTriggerCopy } = require('./notificationTriggerSettings.service');
const repo = require('../repository/adminOrder.repository');
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
    throw new Error(`User 妯″潡 API 鏈毚闇叉柟娉? ${name}`);
  }
  return fn;
}

function requireLogisticsApi(name) {
  const fn = getLogisticsApi()[name];
  if (typeof fn !== 'function') {
    throw new Error(`Logistics 妯″潡 API 鏈毚闇叉柟娉? ${name}`);
  }
  return fn;
}

function requireMyinvoisApi(name) {
  const fn = getMyinvoisApi()[name];
  if (typeof fn !== 'function') {
    throw new Error(`MyInvois 妯″潡 API 鏈毚闇叉柟娉? ${name}`);
  }
  return fn;
}

function requireOrderApi(name) {
  const fn = getOrderApi()[name];
  if (typeof fn !== 'function') {
    throw new Error(`Order 妯″潡 API 鏈毚闇叉柟娉? ${name}`);
  }
  return fn;
}

function buildAdminOrderListWhere(query) {
  let where = 'WHERE 1=1';
  const params = [];
  const {
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
  } = query;
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
    where += ' AND (o.order_no LIKE ? OR o.contact_name LIKE ? OR o.contact_phone LIKE ? OR COALESCE(o.shipping_phone, "") LIKE ?)';
    params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
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
  const [orders, summaryRows] = await Promise.all([
    repo.selectOrdersAdminPage(where, params, pageSize, offset),
    repo.selectOrderStatusSummary(where, params),
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

  return {
    kind: 'paginate',
    list: orders,
    total,
    page,
    pageSize,
    summary: normalizeOrderSummary(summaryRows),
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
 * 绠＄悊鍛樻墜鍔ㄨ皟鏁磋鍗曠姸鎬侊細鍖呭惈鐘舵€佹満鏍￠獙銆佸簱瀛?绉垎/浼樻儬鍒稿洖婊氥€侀個璇峰鍔便€佹秷鎭€氱煡绛夌紪鎺掋€?*/
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
      await repo.updateOrderStatusAndPayment(conn, orderId, status, newPayment);
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

      /** 閿€閲忚鏁帮細绠＄悊鍛樻墜鍔ㄧ‘璁や粯娆炬椂绱姞 sales_count锛涘け璐ヤ笉闃绘柇涓绘祦绋?*/
      if (
        newPayment === PAYMENT_STATUS.PAID
        && prevPay !== PAYMENT_STATUS.PAID
        && fullOrder
      ) {
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
        for (const item of items) {
          if (!item.variant_id) {
            throw new BusinessError(400, `订单 ${fullOrder.order_no} 存在缺失 SKU 的明细，无法执行库存释放`);
          }
          await repo.restoreVariantStock(conn, item.variant_id, item.qty, {
            refType: 'order',
            refId: fullOrder.id,
            orderNo: fullOrder.order_no,
            operatorId: adminUserId,
            reason: `管理员取消订单 #${fullOrder.order_no} 释放 SKU 库存`,
          });
        }
        await requireUserApi('reverseOrderPoints')(conn, fullOrder, `订单取消回滚积分 ${fullOrder.order_no}`, {
          operatorId: adminUserId,
          trigger: 'admin_order_cancelled',
        });
        if (fullOrder.coupon_uc_id) {
          await repo.restoreUserCouponById(conn, fullOrder.coupon_uc_id);
        }
      }

      if (status === ORDER_STATUS.COMPLETED && fullOrder) {
        await requireUserApi('settleOrderPoints')(conn, fullOrder, {
          operatorId: adminUserId,
          trigger: 'admin_order_completed',
        });
        await requireUserApi('settleOrderRewards')(conn, fullOrder, {
          operatorId: adminUserId,
          trigger: 'admin_order_completed',
        });
      }

      if ((status === ORDER_STATUS.CANCELLED || status === ORDER_STATUS.REFUNDED) && fullOrder) {
        await requireUserApi('reverseOrderPoints')(conn, fullOrder, `Order status changed to ${status}, points reversed`, {
          operatorId: adminUserId,
          trigger: `admin_order_${status}`,
        });
        await requireUserApi('reverseOrderRewards')(conn, fullOrder, `Order status changed to ${status}, rewards reversed`, {
          operatorId: adminUserId,
          trigger: `admin_order_${status}`,
        });
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
      await logAdminAction(adminUserId, 'update order status', `${orderId} -> ${status}`);
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
      summary: 'Order status update failed',
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
          `褰撳墠灞ョ害/鏀粯鐘舵€佹棤娉曞彂璐э紙闇€灞ョ害鈥滃凡浠樻鈥濅笖鏀粯鈥滃凡鏀粯鈥濓級锛屽綋鍓嶏細灞ョ害=${order.status} 鏀粯=${order.payment_status || PAYMENT_STATUS.PENDING}`,
        );
    }

    const trackingNo = body.trackingNo || body.tracking_no || '';
    const carrier = body.carrier || '';
    await repo.updateOrderShipped(orderId, trackingNo, carrier);
    await requireLogisticsApi('refreshOrderTrackingQuietly')(orderId);

    const shipCopy = await getResolvedTriggerCopy('order_ship', {
      order_no: order.order_no,
      carrier: carrier || '鏆傛棤',
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
  'tax_mode', 'tax_rate', 'tax_label', 'taxable_amount', 'tax_amount', 'tax_exclusive_amount',
  'total_points', 'contact_name', 'contact_phone', 'shipping_phone', 'address', 'payment_method', 'coupon_title',
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
    tax_mode: o.tax_mode ?? '',
    tax_rate: o.tax_rate ?? '',
    tax_label: o.tax_label ?? '',
    taxable_amount: o.taxable_amount ?? '',
    tax_amount: o.tax_amount ?? '',
    tax_exclusive_amount: o.tax_exclusive_amount ?? '',
    total_points: o.total_points,
    contact_name: o.contact_name || '',
    contact_phone: o.contact_phone || '',
    shipping_phone: o.shipping_phone || o.contact_phone || '',
    address: (o.address || '').replace(/\r\n/g, ' ').replace(/,/g, ' '),
    payment_method: o.payment_method || '',
    coupon_title: o.coupon_title || '',
    shipping_name: o.shipping_name || '',
    tracking_no: o.tracking_no || '',
    carrier: o.carrier || '',
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
  if (!orderIds.length) throw new ValidationError('order_ids 涓嶈兘涓虹┖');
  if (!carrier) throw new ValidationError('carrier 涓嶈兘涓虹┖');

  const orders = await repo.selectOrdersByIds(orderIds);
  const orderById = new Map(orders.map((o) => [o.id, o]));
  let shipped = 0;
  const failed = [];
  for (const orderId of orderIds) {
    const row = orderById.get(orderId);
    if (!row) {
      failed.push({ order_id: orderId, reason: 'Order not found' });
      continue;
    }
    if (!requireOrderApi('canShip')(row)) {
      failed.push({ order_id: orderId, reason: `状态不允许发货: ${row.status}/${row.payment_status || PAYMENT_STATUS.PENDING}` });
      continue;
    }
    const trackingNo = String(trackingMap[orderId] || '').trim();
    if (!trackingNo) {
      failed.push({ order_id: orderId, reason: '缂哄皯 tracking_no' });
      continue;
    }
    await repo.updateOrderShipped(orderId, trackingNo, carrier);
    shipped += 1;
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
  return { data: { shipped, failed }, message: `批量发货完成：成功 ${shipped}，失败 ${failed.length}` };
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








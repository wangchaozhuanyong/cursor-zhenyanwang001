/**
 * Admin Order Service
 *
 * 鑱岃矗锛氱鐞嗗憳瀵硅鍗曠殑鍒楄〃/璇︽儏/鐘舵€佸彉鏇?鍙戣揣 绛変笟鍔＄紪鎺掋€? *
 * 鍒嗗眰绾﹀畾锛? * - 涓嶇洿鎺ユ嫾 SQL锛屾墍鏈夋暟鎹闂€氳繃 `./adminOrder.repository`
 * - 浜嬪姟鐢辨湰灞傛帶鍒讹細`repo.getConnection()` + `beginTransaction()`锛? *   鎶?`conn` 浼犵粰 repository 鐨勪簨鍔℃柟娉? */
const { generateId } = require('../../utils/helpers');
const { BusinessError, NotFoundError, ValidationError } = require('../../errors');
const { logAdminAction } = require('../../utils/adminAudit');
const { rowsToCsv } = require('../../utils/csv');
const userModule = require('../user');
const { getResolvedTriggerCopy } = require('./notificationTriggerSettings.service');
const {
  assertFulfillmentTransition,
  assertPaymentTransition,
  paymentStatusAfterFulfillmentChange,
  canShip,
} = require('../order/orderStateMachine');
const logisticsService = require('../logistics/logistics.service');
const repo = require('./adminOrder.repository');
const checkoutAbandonmentRepo = require('../order/checkoutAbandonment.repository');
const { writeAuditLog } = require('../../utils/auditLog');
const { ORDER_STATUS, PAYMENT_STATUS, ORDER_STATUS_LIST } = require('../../constants/status');
const myinvoisService = require('../myinvois/myinvois.service');
const { UserStatsService } = require('../user/userStats.service');

const userApi = /** @type {any} */ (userModule).api || {};

function requireUserApi(name) {
  const fn = userApi[name];
  if (typeof fn !== 'function') {
    throw new Error(`User 妯″潡 API 鏈毚闇叉柟娉? ${name}`);
  }
  return fn;
}

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
  const order = await repo.selectOrderById(null, orderId);
  if (!order) throw new NotFoundError('订单不存在');
  const items = await repo.selectOrderItemsWithProduct(repo.getPool(), order.id);
  attachItemsAndAmounts(order, items);
  await logisticsService.attachTracking(order);
  return { data: order };
}

/**
 * 绠＄悊鍛樻墜鍔ㄨ皟鏁磋鍗曠姸鎬侊細鍖呭惈鐘舵€佹満鏍￠獙銆佸簱瀛?绉垎/浼樻儬鍒稿洖婊氥€侀個璇峰鍔便€佹秷鎭€氱煡绛夌紪鎺掋€? */
async function updateOrderStatus(orderId, body, adminUserId, req) {
  const { status, remark } = body;
  if (!ORDER_STATUS_LIST.includes(status)) {
    throw new ValidationError(`鏃犳晥鐘舵€? ${status}`);
  }

  const orderRow = await repo.selectOrderStateById(orderId);
  if (!orderRow) throw new NotFoundError('订单不存在');

  const beforeSnap = {
    status: orderRow.status,
    payment_status: orderRow.payment_status || PAYMENT_STATUS.PENDING,
  };

  try {
    assertFulfillmentTransition(orderRow.status, status);

    const prevPay = orderRow.payment_status || PAYMENT_STATUS.PENDING;
    const newPayment = paymentStatusAfterFulfillmentChange(orderRow.status, status, prevPay);
    if (newPayment !== prevPay) {
      assertPaymentTransition(prevPay, newPayment);
    }

    const conn = await repo.getConnection();
    try {
      await conn.beginTransaction();
      await repo.updateOrderStatusAndPayment(conn, orderId, status, newPayment);
      if (newPayment === PAYMENT_STATUS.PAID) {
        await checkoutAbandonmentRepo.markPaidByOrderId(conn, orderId);
      } else if (status === ORDER_STATUS.CANCELLED) {
        await checkoutAbandonmentRepo.markClosedByOrderId(conn, orderId);
      }
      if (status === ORDER_STATUS.SHIPPED) {
        await repo.touchOrderShippedAtIfNull(conn, orderId);
      }

      if (remark) {
        await repo.appendAdminRemark(conn, orderId, remark);
      }

      const fullOrder = await repo.selectFullOrder(conn, orderId);

      /** 閿€閲忚鏁帮細绠＄悊鍛樻墜鍔ㄧ‘璁や粯娆炬椂绱姞 sales_count锛涙晠闅滃蹇?*/
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
          await UserStatsService.syncStatsAfterOrderCancelled(fullOrder.user_id, fullOrder.id, conn);
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
            reason: `管理员取消订单 ${fullOrder.order_no} 释放 SKU 库存`,
          });
        }
        await requireUserApi('reverseOrderPoints')(conn, fullOrder, `璁㈠崟鍙栨秷鍥炴粴绉垎 ${fullOrder.order_no}`, {
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
        await requireUserApi('reverseOrderPoints')(conn, fullOrder, `订单状态变更为 ${status}，积分回滚`, {
          operatorId: adminUserId,
          trigger: `admin_order_${status}`,
        });
        await requireUserApi('reverseOrderRewards')(conn, fullOrder, `订单状态变更为 ${status}，返现冲正`, {
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
      await logAdminAction(adminUserId, '更新订单状态', `${orderId} -> ${status}`);
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
        await myinvoisService.enqueueOrderInvoiceIfEnabled(orderId, 'admin_order_status_paid');
      } catch (e) {
        console.error('[MyInvois] enqueue invoice after order status update failed:', e?.message || e);
      }
    }
    if (status === ORDER_STATUS.REFUNDED) {
      try {
        await myinvoisService.enqueueRefundCreditNoteIfEnabled({ orderId }, 'admin_order_refunded');
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
    if (!canShip(order)) {
      throw new BusinessError(
        400,
        `褰撳墠灞ョ害/鏀粯鐘舵€佹棤娉曞彂璐э紙闇€灞ョ害銆屽凡浠樻銆嶄笖鏀粯銆屽凡鏀粯銆嶏級锛屽綋鍓嶏細灞ョ害=${order.status} 鏀粯=${order.payment_status || PAYMENT_STATUS.PENDING}`,
      );
    }

    const trackingNo = body.trackingNo || body.tracking_no || '';
    const carrier = body.carrier || '';
    await repo.updateOrderShipped(orderId, trackingNo, carrier);
    await logisticsService.refreshOrderTrackingQuietly(orderId);

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

    await logAdminAction(adminUserId, '璁㈠崟鍙戣揣', `${orderId} ${carrier} ${trackingNo}`);

    await writeAuditLog({
      req,
      operatorId: adminUserId,
      actionType: 'order.ship',
      objectType: 'order',
      objectId: orderId,
      summary: `璁㈠崟鍙戣揣 ${order.order_no}`,
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
      summary: '璁㈠崟鍙戣揣澶辫触',
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



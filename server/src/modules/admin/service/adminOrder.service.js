/**
 * Admin Order Service
 *
 * 职责：管理员对订单列表、详情、状态变更、发货等业务做流程编排。
 * 分层约定：
 * - 不直接拼 SQL，所有数据访问通过 `./adminOrder.repository`。
 * - 事务由本层控制：`repo.getConnection()` + `beginTransaction()`，并将 `conn` 传给 repository 事务方法。
 */
const { generateId, parseBool } = require('../../../utils/helpers');
const { BusinessError, NotFoundError, ValidationError } = require('../../../errors');
const { rowsToCsvLocalized } = require('../../../utils/adminCsvLabels');
const { maskPhone } = require('../../../utils/privacyMask');
const { getResolvedTriggerCopy } = require('./notificationTriggerSettings.service');
const repo = require('../repository/adminOrder.repository');
const adminEventBus = require('./adminEventBus.service');
const adminEventService = require('./adminEvent.service');
const { writeAuditLog } = require('../../../utils/auditLog');
const { ORDER_STATUS, PAYMENT_STATUS, ORDER_STATUS_LIST } = require('../../../constants/status');
const { resolveOrderPayableAmount, resolveOrderPaidAmount } = require('../../../utils/orderAmountResolve');

function getUserApi() {
  return /** @type {any} */ (require('../../user/publicApi')) || {};
}
function getOrderApi() {
  return /** @type {any} */ (require('../../order/publicApi')) || {};
}
function getLogisticsApi() {
  return /** @type {any} */ (require('../../logistics/publicApi')) || {};
}
function getMyinvoisApi() {
  return /** @type {any} */ (require('../../myinvois/publicApi')) || {};
}

function getTelegramApi() {
  return /** @type {any} */ (require('../../telegram/publicApi')) || {};
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

function money(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

function parseJson(value, fallback = null) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function normalizeOrderIdsInput(value) {
  const rawItems = Array.isArray(value) ? value : String(value || '').split(',');
  const orderIds = rawItems
    .flatMap((item) => String(item || '').split(','))
    .map((item) => item.trim())
    .filter(Boolean);
  return Array.from(new Set(orderIds));
}

function resolveOrderRealtimeType(status, prevPayment, nextPayment) {
  if (nextPayment === PAYMENT_STATUS.PAID && prevPayment !== PAYMENT_STATUS.PAID) return 'order.paid';
  if (status === ORDER_STATUS.CANCELLED) return 'order.cancelled';
  if (status === ORDER_STATUS.COMPLETED) return 'order.completed';
  if (status === ORDER_STATUS.REFUNDED) return 'order.refunded';
  return 'order.adjusted';
}

async function buildAdminOrderListWhere(query) {
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
    const { enabled, minutes } = await requireOrderApi('loadPaymentTimeoutSettings')()
      .catch(() => ({ enabled: false, minutes: 120 }));
    const thresholdMinutes = enabled ? Math.max(1, Number(minutes || 30)) : 120;
    where += ` AND o.status = 'pending'
      AND (o.payment_status = 'pending' OR o.payment_status IS NULL)
      AND o.created_at < DATE_SUB(NOW(), INTERVAL ? MINUTE)`;
    params.push(thresholdMinutes);
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

function normalizeFinancialSummary(row = {}) {
  const numericKeys = [
    'order_count',
    'payable_amount',
    'paid_amount',
    'net_received_amount',
    'outstanding_amount',
    'refund_amount',
    'activity_discount_amount',
    'coupon_discount_amount',
    'points_discount_amount',
    'reward_cash_discount_amount',
    'shipping_discount_amount',
    'shipping_income_amount',
    'shipping_cost_amount',
    'gross_profit_amount',
    'net_profit_amount',
    'total_discount_amount',
    'discount_amount',
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
  if (order.logistics_exception_type) badges.push('物流异常');
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
  order.goods_original_amount = parseFloat(order.goods_original_amount ?? order.raw_amount ?? 0);
  order.goods_sale_amount = parseFloat(order.goods_sale_amount ?? order.raw_amount ?? 0);
  order.activity_discount_amount = parseFloat(order.activity_discount_amount || 0);
  order.coupon_discount_amount = parseFloat(order.coupon_discount_amount || 0);
  order.shipping_original_fee = parseFloat(order.shipping_original_fee ?? order.shipping_fee ?? 0);
  order.shipping_discount_amount = parseFloat(order.shipping_discount_amount || 0);
  order.total_discount_amount = parseFloat(order.total_discount_amount || 0);
  order.payable_amount = resolveOrderPayableAmount(order);
  order.paid_amount = resolveOrderPaidAmount(order);
  order.refund_amount = parseFloat(order.refund_amount || order.refunded_amount || 0);
  const netStored = parseFloat(order.net_received_amount || 0);
  const outstandingStored = parseFloat(order.outstanding_amount || 0);
  order.net_received_amount = netStored > 0
    ? netStored
    : Math.max(0, order.paid_amount - order.refund_amount);
  order.outstanding_amount = outstandingStored > 0
    ? outstandingStored
    : Math.max(0, order.payable_amount - order.paid_amount);
  order.goods_cost_amount = parseFloat(order.goods_cost_amount || 0);
  order.gross_profit_amount = parseFloat(order.gross_profit_amount || 0);
  order.shipping_cost_amount = parseFloat(order.shipping_cost_amount || 0);
  order.payment_fee_amount = parseFloat(order.payment_fee_amount || 0);
  order.net_profit_amount = parseFloat(order.net_profit_amount || 0);
  return order;
}

async function listOrders(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(query.pageSize, 10) || 20));
  const includeItems = parseBool(query.includeItems ?? query.include_items) !== false;
  const includeSummary = parseBool(query.includeSummary ?? query.include_summary) !== false;
  const { where, params } = await buildAdminOrderListWhere(query);
  const offset = (page - 1) * pageSize;
  const [total, orders, summary] = await Promise.all([
    repo.countOrdersAdmin(where, params),
    repo.selectOrdersAdminPage(where, params, pageSize, offset),
    includeSummary ? getOrdersSummary(query, { where, params }) : Promise.resolve({}),
  ]);

  if (orders.length > 0 && includeItems) {
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
  } else if (orders.length > 0) {
    for (const order of orders) {
      attachItemsAndAmounts(order, []);
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
    summary,
  };
}

async function getOrdersSummary(query, prebuilt = null) {
  const { where, params } = prebuilt || await buildAdminOrderListWhere(query);
  const [summaryRows, operationalSummary, financialSummary, globalToday] = await Promise.all([
    repo.selectOrderStatusSummary(where, params),
    repo.selectOrderOperationalSummary(where, params),
    repo.selectOrderFinancialSummary(where, params),
    repo.selectOrderGlobalTodaySummary(),
  ]);
  const globalTodayNormalized = normalizeOperationalSummary(globalToday);
  return {
    ...normalizeOrderSummary(summaryRows),
    ...normalizeOperationalSummary(operationalSummary),
    ...normalizeFinancialSummary(financialSummary),
    ...Object.fromEntries(
      [
        'today_order_count',
        'today_paid_order_count',
        'today_paid_amount',
        'today_refund_amount',
        'today_gross_profit_amount',
        'today_net_profit_amount',
      ].map((key) => [key, Number(globalTodayNormalized[key] || 0)]),
    ),
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
  const adjustments = await repo.selectOrderAdjustments(repo.getPool(), order.id);
  const adjustmentItems = await repo.selectOrderAdjustmentItemsByOrder(repo.getPool(), order.id);
  const itemsByAdjustmentId = {};
  for (const item of adjustmentItems) {
    if (!itemsByAdjustmentId[item.adjustment_id]) itemsByAdjustmentId[item.adjustment_id] = [];
    itemsByAdjustmentId[item.adjustment_id].push({
      ...item,
      before_qty: Number(item.before_qty || 0),
      after_qty: Number(item.after_qty || 0),
      removed_qty: Number(item.removed_qty || 0),
      unit_price: Number(item.unit_price || 0),
      line_refund_amount: Number(item.line_refund_amount || 0),
    });
  }
  data.adjustments = adjustments.map((row) => ({
    ...row,
    customer_confirmed: !!row.customer_confirmed,
    before_amount: parseJson(row.before_amount, {}),
    after_amount: parseJson(row.after_amount, {}),
    refund_amount: Number(row.refund_amount || 0),
    items: itemsByAdjustmentId[row.id] || [],
  }));
  data.has_shortage_adjustment = data.adjustments.some((row) => row.adjustment_type === 'stock_shortage');
  data.shortage_notice = data.has_shortage_adjustment ? '部分商品因缺货已移除' : '';
  await requireLogisticsApi('attachTracking')(data);
  return { data };
}

function buildAmountSnapshot(order) {
  return {
    raw_amount: money(order.raw_amount),
    goods_sale_amount: money(order.goods_sale_amount ?? order.raw_amount),
    goods_net_sales_amount: money(order.goods_net_sales_amount),
    goods_cost_amount: money(order.goods_cost_amount),
    gross_profit_amount: money(order.gross_profit_amount),
    shipping_fee: money(order.shipping_fee),
    total_amount: money(order.total_amount),
    payable_amount: money(order.payable_amount ?? order.total_amount),
    paid_amount: money(order.paid_amount),
    refunded_amount: money(order.refunded_amount),
    net_received_amount: money(order.net_received_amount),
    outstanding_amount: money(order.outstanding_amount),
    net_profit_amount: money(order.net_profit_amount),
    payment_status: order.payment_status || PAYMENT_STATUS.PENDING,
    refund_status: order.refund_status || '',
  };
}

function assertShortageOrderAdjustable(order) {
  if (!order) throw new NotFoundError('订单不存在');
  if ([ORDER_STATUS.SHIPPED, ORDER_STATUS.COMPLETED, ORDER_STATUS.CANCELLED, ORDER_STATUS.REFUNDED].includes(order.status)) {
    throw new ValidationError('当前订单状态不允许修改商品');
  }
  if (order.shipped_at) throw new ValidationError('订单已发货，不允许修改商品');
  const paymentStatus = order.payment_status || PAYMENT_STATUS.PENDING;
  const pendingAllowed = order.status === ORDER_STATUS.PENDING && paymentStatus === PAYMENT_STATUS.PENDING;
  const paidAllowed = order.status === ORDER_STATUS.PAID
    && [PAYMENT_STATUS.PAID, PAYMENT_STATUS.PARTIALLY_REFUNDED].includes(paymentStatus);
  if (!pendingAllowed && !paidAllowed) {
    throw new ValidationError('仅允许未付款订单、已付款未发货订单或部分退款未发货订单进行缺货处理');
  }
}

function normalizeAdjustmentPayload(body = {}, requireConfirmed = false) {
  const items = Array.isArray(body.items) ? body.items : [];
  if (!items.length) throw new ValidationError('请至少选择一个缺货商品');
  const seen = new Set();
  const normalizedItems = items.map((item) => {
    const orderItemId = String(item.order_item_id || '').trim();
    if (!orderItemId) throw new ValidationError('order_item_id 不能为空');
    if (seen.has(orderItemId)) throw new ValidationError('同一个订单商品不能重复调整');
    seen.add(orderItemId);
    const afterQty = Number(item.after_qty);
    if (!Number.isInteger(afterQty) || afterQty < 0) throw new ValidationError('处理后数量必须是非负整数');
    return {
      order_item_id: orderItemId,
      after_qty: afterQty,
      shortage_reason: String(item.shortage_reason || '').trim().slice(0, 255),
      correct_stock_zero: item.correct_stock_zero === true,
    };
  });
  const reason = String(body.reason || '').trim();
  if (!reason) throw new ValidationError('调整原因不能为空');
  const customerConfirmed = body.customer_confirmed === true;
  if (requireConfirmed && !customerConfirmed) throw new ValidationError('正式调整前必须确认已与客户沟通');
  const stockHandling = String(body.stock_handling || 'no_restore').trim() || 'no_restore';
  if (!['no_restore', 'correct_zero'].includes(stockHandling)) {
    throw new ValidationError('stock_handling 仅支持 no_restore 或 correct_zero');
  }
  return {
    reason,
    customer_confirmed: customerConfirmed,
    customer_confirm_method: String(body.customer_confirm_method || '').trim().slice(0, 64),
    customer_confirm_note: String(body.customer_confirm_note || '').trim().slice(0, 500),
    stock_handling: stockHandling,
    items: normalizedItems,
  };
}

function buildShortageAdjustmentPreview(order, orderItems, payload) {
  assertShortageOrderAdjustable(order);
  const activeItems = orderItems.filter((item) =>
    (item.line_status || 'active') === 'active' && Number(item.qty || 0) > 0);
  const itemById = new Map(activeItems.map((item) => [String(item.id), item]));
  const requestById = new Map(payload.items.map((item) => [item.order_item_id, item]));
  let afterTotalQty = 0;
  let refundDelta = 0;
  let rawAmount = 0;
  let goodsNetSalesAmount = 0;
  let goodsCostAmount = 0;
  let grossProfitAmount = 0;
  let goodsDiscountAmount = 0;
  const previewItems = [];
  const afterLines = [];

  for (const requestItem of payload.items) {
    const item = itemById.get(requestItem.order_item_id);
    if (!item) throw new ValidationError(`订单商品不存在或已被调整：${requestItem.order_item_id}`);
    const beforeQty = Number(item.qty || 0);
    if (requestItem.after_qty >= beforeQty) throw new ValidationError('缺货处理只允许删除或减少商品数量');
  }

  for (const item of activeItems) {
    const requestItem = requestById.get(String(item.id));
    const beforeQty = Number(item.qty || 0);
    const afterQty = requestItem ? requestItem.after_qty : beforeQty;
    const ratio = beforeQty > 0 ? afterQty / beforeQty : 0;
    const unitPrice = money(item.price ?? item.unit_price);
    const beforeSubtotal = money(item.subtotal != null ? item.subtotal : unitPrice * beforeQty);
    const beforeCost = money(item.cost_amount);
    const beforeNetSales = money(item.net_sales_amount || beforeSubtotal);
    const beforeDiscount = money(item.discount_allocated || Math.max(0, beforeSubtotal - beforeNetSales));
    const beforeGrossProfit = money(item.gross_profit_amount || (beforeNetSales - beforeCost));
    const afterSubtotal = money(unitPrice * afterQty);
    const afterDiscount = money(beforeDiscount * ratio);
    const afterCost = money(beforeCost * ratio);
    const afterNetSales = money(Math.max(0, afterSubtotal - afterDiscount));
    const afterGrossProfit = money(beforeGrossProfit * ratio);
    const lineRefundAmount = money(Math.max(0, beforeNetSales - afterNetSales));
    afterTotalQty += afterQty;
    refundDelta = money(refundDelta + lineRefundAmount);
    rawAmount = money(rawAmount + afterSubtotal);
    goodsNetSalesAmount = money(goodsNetSalesAmount + afterNetSales);
    goodsCostAmount = money(goodsCostAmount + afterCost);
    grossProfitAmount = money(grossProfitAmount + afterGrossProfit);
    goodsDiscountAmount = money(goodsDiscountAmount + afterDiscount);
    afterLines.push({
      id: item.id,
      qty: afterQty,
      line_status: afterQty === 0 ? 'shortage_removed' : 'active',
      original_qty: item.original_qty || beforeQty,
      subtotal: afterSubtotal,
      discount_allocated: afterDiscount,
      cost_amount: afterCost,
      net_sales_amount: afterNetSales,
      gross_profit_amount: afterGrossProfit,
    });
    if (requestItem) {
      previewItems.push({
        order_item_id: item.id,
        product_id: item.product_id,
        variant_id: item.variant_id || '',
        sku_code: item.sku_code || '',
        product_name_snapshot: item.name || item.product_name_snapshot || item.product_name || '',
        variant_name_snapshot: item.variant_name || '',
        before_qty: beforeQty,
        after_qty: afterQty,
        removed_qty: beforeQty - afterQty,
        unit_price: unitPrice,
        before_subtotal: beforeSubtotal,
        after_subtotal: afterSubtotal,
        line_refund_amount: lineRefundAmount,
        shortage_reason: requestItem.shortage_reason,
        current_stock: Number(item.current_stock || 0),
        correct_stock_zero: requestItem.correct_stock_zero || payload.stock_handling === 'correct_zero',
      });
    }
  }

  if (afterTotalQty <= 0) {
    throw new ValidationError('不允许把订单所有商品都删除，请走整单取消或全额退款流程');
  }

  const beforeAmount = buildAmountSnapshot(order);
  const payableBefore = money(order.payable_amount ?? order.total_amount);
  const totalBefore = money(order.total_amount);
  const totalAmount = money(Math.max(0, totalBefore - refundDelta));
  const payableAmount = money(Math.max(0, payableBefore - refundDelta));
  const paidAmount = money(order.paid_amount || 0);
  const prevRefunded = money(order.refunded_amount || 0);
  const paymentStatus = order.payment_status || PAYMENT_STATUS.PENDING;
  let refundAmount = 0;
  let refundedAmount = prevRefunded;
  let netReceivedAmount = money(order.net_received_amount || 0);
  let outstandingAmount = money(Math.max(0, payableAmount - paidAmount));
  let nextPaymentStatus = paymentStatus;
  let refundStatus = order.refund_status || '';

  if (paymentStatus === PAYMENT_STATUS.PENDING) {
    outstandingAmount = payableAmount;
    netReceivedAmount = 0;
  } else {
    refundAmount = refundDelta;
    const refundable = money(Math.max(0, paidAmount - prevRefunded));
    if (refundAmount > refundable + 0.01) {
      throw new ValidationError('退款金额不能超过可退金额');
    }
    refundedAmount = money(prevRefunded + refundAmount);
    netReceivedAmount = money(Math.max(0, paidAmount - refundedAmount));
    outstandingAmount = 0;
    nextPaymentStatus = refundAmount > 0 ? PAYMENT_STATUS.PARTIALLY_REFUNDED : paymentStatus;
    refundStatus = refundAmount > 0 ? 'partially_refunded' : refundStatus;
  }

  const shippingFee = money(order.shipping_fee);
  const shippingDiscountAmount = money(order.shipping_discount_amount);
  const totalDiscountAmount = money(goodsDiscountAmount + shippingDiscountAmount);
  const shippingCostAmount = money(order.shipping_cost_amount);
  const paymentFeeAmount = money(order.payment_fee_amount);
  const netProfitAmount = money(grossProfitAmount + shippingFee - shippingCostAmount - paymentFeeAmount);
  const afterAmount = {
    ...beforeAmount,
    raw_amount: rawAmount,
    goods_sale_amount: rawAmount,
    goods_net_sales_amount: goodsNetSalesAmount,
    goods_cost_amount: goodsCostAmount,
    gross_profit_amount: grossProfitAmount,
    discount_amount: goodsDiscountAmount,
    total_discount_amount: totalDiscountAmount,
    total_amount: totalAmount,
    payable_amount: payableAmount,
    refunded_amount: refundedAmount,
    net_received_amount: netReceivedAmount,
    outstanding_amount: outstandingAmount,
    net_profit_amount: netProfitAmount,
    payment_status: nextPaymentStatus,
    refund_status: refundStatus,
    calculation_version: 'order_shortage_adjustment_v1',
  };

  return {
    order_id: order.id,
    order_no: order.order_no,
    before_amount: beforeAmount,
    after_amount: afterAmount,
    refund_amount: refundAmount,
    refundable_amount: money(Math.max(0, paidAmount - prevRefunded)),
    stock_handling: payload.stock_handling,
    items: previewItems,
    after_lines: afterLines,
    notice: refundAmount > 0
      ? `订单已调整，缺货商品退款金额为 RM ${refundAmount.toFixed(2)}，剩余商品继续发货。`
      : '订单已调整，请按最新金额付款。',
  };
}

async function previewShortageAdjustment(orderId, body) {
  const payload = normalizeAdjustmentPayload(body, false);
  const [order, items] = await Promise.all([
    repo.selectOrderById(null, orderId),
    repo.selectOrderItemsForAdjustment(repo.getPool(), orderId),
  ]);
  const preview = buildShortageAdjustmentPreview(order, items, payload);
  return { data: preview };
}

async function applyShortageAdjustment(orderId, body, adminUserId, req) {
  const payload = normalizeAdjustmentPayload(body, true);
  let beforeSnap = null;
  let afterSnap = null;
  let adjustmentId = null;
  let orderNo = '';
  let refundAmount = 0;
  let userId = '';
  const conn = await repo.getConnection();
  try {
    await conn.beginTransaction();
    const order = await repo.selectAdminOrderForUpdate(conn, orderId);
    const items = await repo.selectOrderItemsForAdjustment(conn, orderId);
    const preview = buildShortageAdjustmentPreview(order, items, payload);
    beforeSnap = preview.before_amount;
    afterSnap = preview.after_amount;
    refundAmount = preview.refund_amount;
    orderNo = order.order_no;
    userId = order.user_id;
    adjustmentId = generateId();
    const adjustmentNo = `ADJ${Date.now()}${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;

    await repo.insertOrderAdjustment(conn, {
      id: adjustmentId,
      order_id: order.id,
      order_no: order.order_no,
      adjustment_no: adjustmentNo,
      reason: payload.reason,
      customer_confirmed: payload.customer_confirmed,
      customer_confirm_method: payload.customer_confirm_method,
      customer_confirm_note: payload.customer_confirm_note,
      before_amount: preview.before_amount,
      after_amount: preview.after_amount,
      refund_amount: refundAmount,
      stock_handling: payload.stock_handling,
      status: 'applied',
      operator_id: adminUserId,
    });

    for (const item of preview.items) {
      await repo.insertOrderAdjustmentItem(conn, {
        id: generateId(),
        adjustment_id: adjustmentId,
        order_id: order.id,
        order_item_id: item.order_item_id,
        product_id: item.product_id,
        variant_id: item.variant_id,
        sku_code: item.sku_code,
        product_name_snapshot: item.product_name_snapshot,
        variant_name_snapshot: item.variant_name_snapshot,
        before_qty: item.before_qty,
        after_qty: item.after_qty,
        removed_qty: item.removed_qty,
        unit_price: item.unit_price,
        line_refund_amount: item.line_refund_amount,
        shortage_reason: item.shortage_reason,
      });
    }

    const lineById = new Map(preview.after_lines.map((line) => [String(line.id), line]));
    for (const [lineId, line] of lineById) {
      await repo.updateOrderItemAfterShortage(conn, lineId, {
        ...line,
        adjusted_by: adminUserId,
        adjusted_reason: payload.reason,
      });
    }

    await repo.updateOrderAmountsAfterShortage(conn, order.id, {
      raw_amount: preview.after_amount.raw_amount,
      goods_sale_amount: preview.after_amount.goods_sale_amount,
      goods_net_sales_amount: preview.after_amount.goods_net_sales_amount,
      goods_cost_amount: preview.after_amount.goods_cost_amount,
      gross_profit_amount: preview.after_amount.gross_profit_amount,
      discount_amount: preview.after_amount.discount_amount,
      total_discount_amount: preview.after_amount.total_discount_amount,
      total_amount: preview.after_amount.total_amount,
      payable_amount: preview.after_amount.payable_amount,
      refunded_amount: preview.after_amount.refunded_amount,
      net_received_amount: preview.after_amount.net_received_amount,
      outstanding_amount: preview.after_amount.outstanding_amount,
      net_profit_amount: preview.after_amount.net_profit_amount,
      payment_status: preview.after_amount.payment_status,
      refund_status: preview.after_amount.refund_status,
      amount_snapshot: preview.after_amount,
    });

    if (refundAmount > 0) {
      await repo.insertPaymentEvent(conn, {
        id: generateId(),
        order_id: order.id,
        provider: 'manual',
        provider_event_id: `shortage:${adjustmentId}`,
        event_type: 'manual_refund_shortage',
        payload_json: {
          adjustment_id: adjustmentId,
          adjustment_no: adjustmentNo,
          order_no: order.order_no,
          refund_amount: refundAmount,
          reason: payload.reason,
        },
      });
    }

    await repo.insertOrderNotification(conn, {
      id: generateId(),
      userId: order.user_id,
      title: refundAmount > 0 ? '订单已调整并安排部分退款' : '订单已调整',
      content: refundAmount > 0
        ? `订单 ${order.order_no} 已调整，缺货商品退款金额为 RM ${refundAmount.toFixed(2)}，剩余商品继续发货。`
        : `订单 ${order.order_no} 已调整，请按最新金额付款。`,
    });

    for (const item of preview.items) {
      if ((item.correct_stock_zero || payload.stock_handling === 'correct_zero') && item.variant_id) {
        await repo.correctVariantStockToZero(conn, item.variant_id, {
          refId: order.id,
          orderNo: order.order_no,
          operatorId: adminUserId,
          reason: `订单 ${order.order_no} 缺货处理校正 SKU 库存为 0`,
          remark: item.shortage_reason,
        });
      }
    }

    await conn.commit();

    await writeAuditLog({
      req,
      operatorId: adminUserId,
      actionType: 'order.shortage_adjustment',
      objectType: 'order',
      objectId: order.id,
      summary: `订单缺货调整 ${order.order_no}`,
      before: beforeSnap,
      after: { ...afterSnap, adjustment_id: adjustmentId, refund_amount: refundAmount },
      result: 'success',
    });
    adminEventBus.publishAdminEvent({
      type: 'order.shortage_adjusted',
      objectId: order.id,
      summary: `订单 ${order.order_no} 已完成缺货调整`,
      eventType: 'order.shortage_adjusted',
      category: 'order',
      severity: 'P2',
      status: 'open',
    });
    try {
      await adminEventService.emitEvent({
        eventType: 'order.stock_shortage',
        category: 'stock',
        severity: 'P1',
        status: 'open',
        title: '库存异常 / 订单缺货',
        message: `订单 ${order.order_no} 发生缺货，系统库存与仓库实际库存不一致，请盘点相关 SKU。`,
        entityType: 'order',
        entityId: order.id,
        fingerprint: { eventType: 'order.stock_shortage', entityType: 'order', entityId: order.id, adjustmentId },
        payload: {
          orderNo: order.order_no,
          adjustmentId,
          items: preview.items.map((item) => ({
            skuCode: item.sku_code,
            productName: item.product_name_snapshot,
            beforeQty: item.before_qty,
            afterQty: item.after_qty,
            removedQty: item.removed_qty,
          })),
        },
        impactAmount: refundAmount,
        source: 'order_shortage_adjustment',
      }, { operatorId: adminUserId, operatorType: 'admin', source: 'order_shortage_adjustment' });
    } catch (e) {
      console.error('[adminOrder] emit shortage event failed:', e?.message || e);
    }

    if (refundAmount > 0) {
      try {
        await requireMyinvoisApi('enqueueRefundCreditNoteIfEnabled')(
          { orderId: order.id, refundAmount },
          'order_shortage_adjustment',
        );
      } catch (e) {
        console.error('[MyInvois] enqueue credit note after shortage adjustment failed:', e?.message || e);
      }
    }
    return { data: { adjustment_id: adjustmentId, order_id: orderId, refund_amount: refundAmount, user_id: userId }, message: '订单缺货调整已生成' };
  } catch (err) {
    try {
      await conn.rollback();
    } catch { /* ignore */ }
    await writeAuditLog({
      req,
      operatorId: adminUserId,
      actionType: 'order.shortage_adjustment',
      objectType: 'order',
      objectId: orderId,
      summary: orderNo ? `订单缺货调整失败 ${orderNo}` : '订单缺货调整失败',
      before: beforeSnap || undefined,
      after: afterSnap || undefined,
      result: 'failure',
      errorMessage: err.message || String(err),
    });
    throw err;
  } finally {
    conn.release();
  }
}

/**
 * 管理员手动调整订单状态：统一处理状态校验、审计、积分、优惠券、邀请码奖励和通知。
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

  let telegramNotifyOrderId = null;

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

      /** 销量计数：管理员手动确认付款时累加 sales_count；失败不阻断主流程。 */
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
        await requireUserApi('maybeSettleOrderRewardsOnPayment')(conn, fullOrder, {
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
        telegramNotifyOrderId = fullOrder.id;
      }

      if (status === ORDER_STATUS.CANCELLED && fullOrder) {
        if (beforeSnap.status !== ORDER_STATUS.CANCELLED) {
          await requireUserApi('syncStatsAfterOrderCancelled')(fullOrder.user_id, fullOrder.id, conn);
        }
        const cancelItems = await requireOrderApi('selectOrderItemQtyRows')(conn, fullOrder.id);
        const releaseResult = await requireOrderApi('releaseOrderInventory')(conn, {
          orderId: fullOrder.id,
          orderNo: fullOrder.order_no,
          items: cancelItems,
          operatorId: adminUserId,
          reason: `管理员取消订单 #${fullOrder.order_no} 释放 SKU 库存`,
        });
        if (!releaseResult.ok) {
          if (releaseResult.reason === 'missing_variant') {
            throw new BusinessError(400, `订单 ${fullOrder.order_no} 缺失 SKU 明细，无法执行库存释放`);
          }
          throw new BusinessError(400, `订单 ${fullOrder.order_no} 库存释放失败，请人工复核`);
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
        await requireUserApi('settleOrderRewards')(conn, fullOrder, {
          operatorId: adminUserId,
          trigger: 'order_shipped',
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

    if (telegramNotifyOrderId) {
      try {
        const notify = getTelegramApi().notifyOrderPaid;
        if (typeof notify === 'function') {
          await notify(telegramNotifyOrderId, 'admin_order_status_paid');
        }
      } catch (e) {
        console.error('[adminOrder] Telegram notify after status paid failed:', e?.message || e);
      }
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
      type: resolveOrderRealtimeType(status, prevPay, newPayment),
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
          `当前履约/支付状态无法发货（需履约“已付款”且支付“已支付/部分退款”），当前：履约=${order.status} 支付=${order.payment_status || PAYMENT_STATUS.PENDING}`,
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
    await requireLogisticsApi('recordOrderShipmentQuietly')(orderId, { trackingNo, carrier });
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
  'id', 'order_no', 'user_id', 'status', 'payment_status',
  'payable_amount', 'paid_amount', 'net_received_amount', 'outstanding_amount',
  'total_amount', 'raw_amount', 'goods_original_amount', 'goods_sale_amount', 'goods_net_sales_amount',
  'activity_discount_amount', 'coupon_discount_amount', 'points_discount_amount', 'reward_cash_discount_amount',
  'shipping_original_fee', 'shipping_discount_amount', 'total_discount_amount', 'shipping_fee',
  'tax_mode', 'tax_rate', 'tax_label', 'taxable_amount', 'tax_amount', 'tax_exclusive_amount',
  'total_points', 'user_nickname', 'user_phone_masked', 'contact_name', 'contact_phone_masked', 'shipping_phone_masked',
  'items_summary', 'items_count', 'sku_count', 'address', 'payment_method', 'payment_channel', 'payment_transaction_no',
  'paid_at', 'coupon_title', 'shipping_name', 'tracking_no', 'carrier', 'shipped_at', 'return_request_count',
  'active_return_count', 'refund_amount', 'goods_cost_amount', 'gross_profit_amount', 'shipping_cost_amount', 'payment_fee_amount', 'net_profit_amount', 'note', 'created_at',
];

async function exportOrdersCsv(query) {
  const { where, params } = await buildAdminOrderListWhere(query);
  const rows = await repo.selectOrdersForExport(where, params);
  const data = rows.map((o) => ({
    id: o.id,
    order_no: o.order_no,
    user_id: o.user_id,
    status: o.status,
    payment_status: o.payment_status || PAYMENT_STATUS.PENDING,
    payable_amount: o.payable_amount || o.total_amount || 0,
    paid_amount: o.paid_amount || (['paid', 'partially_refunded', 'refunded'].includes(o.payment_status || '') ? o.total_amount : 0),
    net_received_amount: o.net_received_amount || Math.max(0, Number(o.paid_amount || 0) - Number(o.refund_amount || o.refunded_amount || 0)),
    outstanding_amount: o.outstanding_amount || 0,
    total_amount: o.total_amount,
    raw_amount: o.raw_amount,
    goods_original_amount: o.goods_original_amount || o.raw_amount || 0,
    goods_sale_amount: o.goods_sale_amount || o.raw_amount || 0,
    goods_net_sales_amount: o.goods_net_sales_amount || 0,
    activity_discount_amount: o.activity_discount_amount || 0,
    coupon_discount_amount: o.coupon_discount_amount || 0,
    points_discount_amount: o.points_discount_amount || 0,
    reward_cash_discount_amount: o.reward_cash_discount_amount || 0,
    shipping_original_fee: o.shipping_original_fee || o.shipping_fee || 0,
    shipping_discount_amount: o.shipping_discount_amount || 0,
    total_discount_amount: o.total_discount_amount || 0,
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
    await requireLogisticsApi('recordOrderShipmentQuietly')(orderId, { trackingNo, carrier });
    await requireLogisticsApi('refreshOrderTrackingQuietly')(orderId);
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
  getOrdersSummary,
  getOrderById,
  previewShortageAdjustment,
  applyShortageAdjustment,
  updateOrderStatus,
  shipOrder,
  exportOrdersCsv,
  listPendingShipmentOrders,
  batchShipOrders,
};

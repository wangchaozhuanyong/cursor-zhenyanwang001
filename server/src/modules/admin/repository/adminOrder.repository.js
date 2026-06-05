/**
 * Admin Order Repository
 *
 * 浠呭仛鏁版嵁搴撹闂€傚嚱鏁板懡鍚嶄互銆屽姩浣?+ 琛ㄣ€嶄负涓伙細
 *   selectXxx / updateXxx / insertXxx / countXxx
 *
 * 鍑℃秹鍙婂璇彞浜嬪姟鐨勬柟娉曪紝绗竴鍙傛暟閮芥帴鏀?`q`锛坧ool 鎴?connection锛変互渚挎湇鍔″眰
 * 鍦ㄥ悓涓€涓簨鍔″唴涓茶仈澶氭鍐欏叆銆係ervice 涓嶅簲鍐嶅嚭鐜?db.query / conn.query銆? */
const db = require('../../../config/db');
const { ORDER_STATUS } = require('../../../constants/status');
const { generateId } = require('../../../utils/helpers');
const {
  getOrderRevenueExprs,
  orderEffectivePayableSql,
  orderEffectivePaidSql,
  orderEffectiveActivityDiscountSql,
} = require('../../../db/schemaContract');

function getPool() {
  return db;
}

async function getConnection() {
  return db.getConnection();
}

/**
 * @typedef {import('mysql2/promise').Pool|import('mysql2/promise').PoolConnection} Queryable
 */

/**
 * @param {Queryable} q
 * @param {string} orderId
 */
async function selectOrderItemsWithProduct(q, orderId) {
  const [items] = await q.query(
    `SELECT
       oi.*,
       COALESCE(NULLIF(oi.product_name, ''), p.name) AS name,
       COALESCE(NULLIF(oi.product_image, ''), p.cover_image) AS cover_image,
       oi.price AS unit_price,
       COALESCE(v.stock, 0) AS current_stock
     FROM order_items oi
     LEFT JOIN products p ON oi.product_id = p.id
     LEFT JOIN product_variants v ON v.id = oi.variant_id
     WHERE oi.order_id = ?
       AND COALESCE(oi.line_status, 'active') = 'active'
       AND COALESCE(oi.qty, 0) > 0`,
    [orderId],
  );
  return items;
}

async function countOrdersAdmin(where, params) {
  const [[{ total }]] = await db.query(
    `SELECT COUNT(*) AS total
     FROM orders o
     LEFT JOIN users u ON u.id = o.user_id
     ${where}`,
    params,
  );
  return total;
}

async function selectOrderStatusSummary(where, params) {
  const [rows] = await db.query(
    `SELECT o.status, COUNT(*) AS count
     FROM orders o
     LEFT JOIN users u ON u.id = o.user_id
     ${where}
     GROUP BY o.status`,
    params,
  );
  return rows;
}

function indexRows(rows, key) {
  const indexed = new Map();
  for (const row of rows) {
    if (row?.[key] != null) indexed.set(String(row[key]), row);
  }
  return indexed;
}

async function selectOrderUserStatsForPage(userIds) {
  if (!userIds.length) return new Map();
  const [rows] = await db.query(
    `SELECT
       user_id,
       COUNT(*) AS order_count,
       SUM(CASE WHEN payment_status IN ('paid', 'partially_refunded') THEN total_amount ELSE 0 END) AS total_paid_amount
     FROM orders
     WHERE user_id IN (?)
     GROUP BY user_id`,
    [userIds],
  );
  return indexRows(rows, 'user_id');
}

async function selectOrderItemStatsForPage(orderIds) {
  if (!orderIds.length) return new Map();
  const [rows] = await db.query(
    `SELECT
       order_id,
       SUM(qty) AS items_count,
       COUNT(DISTINCT COALESCE(NULLIF(variant_id, ''), product_id)) AS sku_count,
       GROUP_CONCAT(
        CONCAT(COALESCE(NULLIF(product_name, ''), NULLIF(product_name_snapshot, ''), '商品'), ' ×', qty)
         ORDER BY id
         SEPARATOR '；'
       ) AS items_summary,
       SUM(CASE WHEN cost_snapshot_source = 'missing' THEN 1 ELSE 0 END) AS missing_cost_item_count,
       CASE WHEN SUM(CASE WHEN cost_snapshot_source = 'missing' THEN 1 ELSE 0 END) > 0 THEN 'missing' ELSE 'normal' END AS cost_snapshot_source
     FROM order_items
     WHERE order_id IN (?)
       AND COALESCE(line_status, 'active') = 'active'
       AND COALESCE(qty, 0) > 0
     GROUP BY order_id`,
    [orderIds],
  );
  return indexRows(rows, 'order_id');
}

async function selectOrderReturnStatsForPage(orderIds) {
  if (!orderIds.length) return new Map();
  const [rows] = await db.query(
    `SELECT
       order_id,
       COUNT(*) AS return_request_count,
       SUM(CASE WHEN status IN ('pending', 'approved', 'processing') THEN 1 ELSE 0 END) AS active_return_count
     FROM return_requests
     WHERE order_id IN (?)
     GROUP BY order_id`,
    [orderIds],
  );
  return indexRows(rows, 'order_id');
}

function attachAdminOrderListStats(order, { userStats, itemStats, returnStats }) {
  const user = order.user_id != null ? userStats.get(String(order.user_id)) : null;
  const items = itemStats.get(String(order.id));
  const returns = returnStats.get(String(order.id));

  order.user_order_count = Number(user?.order_count || 0);
  order.user_total_paid_amount = Number(user?.total_paid_amount || 0);
  order.items_count = Number(items?.items_count || 0);
  order.sku_count = Number(items?.sku_count || 0);
  order.items_summary = items?.items_summary || null;
  order.missing_cost_item_count = Number(items?.missing_cost_item_count || 0);
  order.cost_snapshot_source = items?.cost_snapshot_source || null;
  order.return_request_count = Number(returns?.return_request_count || 0);
  order.active_return_count = Number(returns?.active_return_count || 0);
}

function buildPlaceholders(values) {
  return values.map(() => '?').join(', ');
}

function requiresUserJoinForOrderPage(where) {
  return /\bu\./.test(String(where || ''));
}

const OVERDUE_SHIPMENT_PAYMENT_STATUS_FILTER = "o.payment_status IN ('paid', 'partially_refunded')";

function isOverdueShipmentPageWhere(where) {
  const text = String(where || '');
  return /\bo\.status\s*=\s*'paid'/.test(text)
    && text.includes(OVERDUE_SHIPMENT_PAYMENT_STATUS_FILTER)
    && /\bCOALESCE\(o\.paid_at,\s*o\.payment_time,\s*o\.created_at\)\s*<\s*DATE_SUB\(NOW\(\),\s*INTERVAL\s+24\s+HOUR\)/.test(text);
}

function overdueShipmentWhereForPaymentStatus(where, paymentStatus) {
  return String(where || '').replace(
    OVERDUE_SHIPMENT_PAYMENT_STATUS_FILTER,
    `o.payment_status = '${paymentStatus}'`,
  );
}

function selectOrderPageIndexHint(where) {
  const text = String(where || '');
  if (/\bo\.status\s*=\s*\?/.test(text) && /\bo\.payment_status\s*=\s*\?/.test(text)) {
    return '/*+ INDEX(o idx_orders_admin_status_payment_created) */ ';
  }
  if (
    /\bo\.status\s*=\s*'pending'/.test(text)
    && /\bo\.payment_status\s*=\s*'pending'/.test(text)
    && /\bo\.payment_status\s+IS\s+NULL/.test(text)
    && /\bo\.created_at\s*</.test(text)
  ) {
    return '/*+ INDEX(o idx_orders_unpaid_timeout) */ ';
  }
  return '';
}

async function selectOverdueShipmentOrderPageRows(where, params, pageSize, offset, pageJoinSql) {
  const candidateLimit = pageSize + offset;
  const paidWhere = overdueShipmentWhereForPaymentStatus(where, 'paid');
  const partialRefundWhere = overdueShipmentWhereForPaymentStatus(where, 'partially_refunded');

  const [pageRows] = await db.query(
    `SELECT id
     FROM (
       (SELECT /*+ INDEX(o idx_orders_admin_status_payment_created) */ o.id, o.created_at
        FROM orders o${pageJoinSql}
        ${paidWhere}
        ORDER BY o.created_at DESC LIMIT ?)
       UNION ALL
       (SELECT /*+ INDEX(o idx_orders_admin_status_payment_created) */ o.id, o.created_at
        FROM orders o${pageJoinSql}
        ${partialRefundWhere}
        ORDER BY o.created_at DESC LIMIT ?)
     ) overdue_order_candidates
     ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [
      ...params,
      candidateLimit,
      ...params,
      candidateLimit,
      pageSize,
      offset,
    ],
  );
  return pageRows;
}

async function selectOrderPageRows(where, params, pageSize, offset, pageJoinSql) {
  if (isOverdueShipmentPageWhere(where)) {
    return selectOverdueShipmentOrderPageRows(where, params, pageSize, offset, pageJoinSql);
  }

  const pageIndexHint = selectOrderPageIndexHint(where);
  const [pageRows] = await db.query(
    `SELECT ${pageIndexHint}o.id
      FROM orders o${pageJoinSql}
      ${where}
      ORDER BY o.created_at DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, offset],
  );
  return pageRows;
}

async function selectOrdersAdminPage(where, params, pageSize, offset) {
  const { schema } = await getOrderRevenueExprs();
  const amountFields = [
    schema.ordersGoodsOriginalAmount ? 'o.goods_original_amount' : 'COALESCE(o.raw_amount, 0) AS goods_original_amount',
    schema.ordersGoodsSaleAmount ? 'o.goods_sale_amount' : 'COALESCE(o.raw_amount, 0) AS goods_sale_amount',
    schema.ordersActivityDiscount ? 'o.activity_discount_amount' : '0 AS activity_discount_amount',
    schema.ordersCouponDiscount ? 'o.coupon_discount_amount' : '0 AS coupon_discount_amount',
    schema.ordersShippingOriginalFee ? 'o.shipping_original_fee' : 'COALESCE(o.shipping_fee, 0) AS shipping_original_fee',
    schema.ordersShippingDiscount ? 'o.shipping_discount_amount' : '0 AS shipping_discount_amount',
    schema.ordersTotalDiscount ? 'o.total_discount_amount' : '(COALESCE(o.discount_amount, 0) + COALESCE(o.points_discount_amount, 0) + COALESCE(o.reward_cash_discount_amount, 0)) AS total_discount_amount',
    `${orderEffectivePayableSql('o', schema)} AS payable_amount`,
    `${orderEffectivePaidSql('o', schema)} AS paid_amount`,
    schema.ordersNetReceivedAmount ? 'o.net_received_amount' : "CASE WHEN o.payment_status IN ('paid','partially_refunded','refunded') THEN GREATEST(0, COALESCE(o.total_amount, 0) - COALESCE(o.refunded_amount, 0)) ELSE 0 END AS net_received_amount",
    schema.ordersOutstandingAmount ? 'o.outstanding_amount' : "CASE WHEN o.payment_status IN ('paid','partially_refunded','refunded') THEN 0 ELSE COALESCE(o.total_amount, 0) END AS outstanding_amount",
    schema.ordersAmountSnapshot ? 'o.amount_snapshot' : 'NULL AS amount_snapshot',
  ].join(',\n       ');

  const pageJoinSql = requiresUserJoinForOrderPage(where)
    ? '\n      LEFT JOIN users u ON u.id = o.user_id'
    : '';
  const pageRows = await selectOrderPageRows(where, params, pageSize, offset, pageJoinSql);
  const orderIds = pageRows.map((order) => order.id).filter((id) => id != null && id !== '');
  if (!orderIds.length) return [];

  const orderPlaceholders = buildPlaceholders(orderIds);
  const [orders] = await db.query(
    `SELECT
       o.id, o.user_id, o.order_no, o.raw_amount, o.discount_amount, o.coupon_title,
       o.shipping_fee, o.shipping_name, o.tracking_no, o.carrier, o.total_amount,
       ${amountFields},
       o.goods_cost_amount, o.gross_profit_amount, o.shipping_cost_amount, o.payment_fee_amount, o.net_profit_amount,
       o.total_points, o.status, o.payment_status, o.refund_status, o.refunded_amount,
       o.note, o.contact_name, o.contact_phone, o.shipping_phone, o.address,
       o.payment_method, o.payment_channel, o.payment_transaction_no, o.payment_time,
       o.paid_at, o.shipped_at, o.cancelled_at, o.completed_at, o.created_at,
       o.points_discount_amount, o.reward_cash_discount_amount, o.reward_cash_used,
       u.nickname AS user_nickname,
       u.phone AS user_phone,
       u.email AS user_email,
       u.member_level_id,
       ml.name AS member_level_name,
       COALESCE(o.refunded_amount, 0) AS refund_amount
      FROM orders o
      LEFT JOIN users u ON u.id = o.user_id
      LEFT JOIN member_levels ml ON ml.id = u.member_level_id
      WHERE o.id IN (${orderPlaceholders})
      ORDER BY FIELD(o.id, ${orderPlaceholders})`,
    [...orderIds, ...orderIds],
  );
  const userIds = Array.from(new Set(
    orders
      .map((order) => order.user_id)
      .filter((id) => id != null && id !== ''),
  ));
  const [userStats, itemStats, returnStats] = await Promise.all([
    selectOrderUserStatsForPage(userIds),
    selectOrderItemStatsForPage(orderIds),
    selectOrderReturnStatsForPage(orderIds),
  ]);
  for (const order of orders) {
    attachAdminOrderListStats(order, { userStats, itemStats, returnStats });
  }
  return orders;
}

async function selectOrdersForExport(where, params) {
  const [orders] = await db.query(
    `SELECT
       o.*,
       u.nickname AS user_nickname,
       u.phone AS user_phone,
       u.email AS user_email,
       COALESCE(item_stats.items_count, 0) AS items_count,
       COALESCE(item_stats.sku_count, 0) AS sku_count,
       item_stats.items_summary,
       COALESCE(item_stats.missing_cost_item_count, 0) AS missing_cost_item_count,
       COALESCE(return_stats.return_request_count, 0) AS return_request_count,
       COALESCE(return_stats.active_return_count, 0) AS active_return_count,
       COALESCE(o.refunded_amount, 0) AS refund_amount
     FROM orders o
     LEFT JOIN users u ON u.id = o.user_id
     LEFT JOIN (
       SELECT
         order_id,
         SUM(qty) AS items_count,
         COUNT(DISTINCT COALESCE(NULLIF(variant_id, ''), product_id)) AS sku_count,
         GROUP_CONCAT(
           CONCAT(COALESCE(NULLIF(product_name, ''), NULLIF(product_name_snapshot, ''), '商品'), ' ×', qty)
           ORDER BY id
           SEPARATOR '；'
         ) AS items_summary,
         SUM(CASE WHEN cost_snapshot_source = 'missing' THEN 1 ELSE 0 END) AS missing_cost_item_count
      FROM order_items
      WHERE COALESCE(line_status, 'active') = 'active' AND COALESCE(qty, 0) > 0
       GROUP BY order_id
     ) item_stats ON item_stats.order_id = o.id
     LEFT JOIN (
       SELECT
         order_id,
         COUNT(*) AS return_request_count,
         SUM(CASE WHEN status IN ('pending', 'approved', 'processing') THEN 1 ELSE 0 END) AS active_return_count
       FROM return_requests
       GROUP BY order_id
     ) return_stats ON return_stats.order_id = o.id
     ${where}
     ORDER BY o.created_at DESC`,
    params,
  );
  return orders;
}

async function selectOrderOperationalSummary(where, params) {
  const { schema } = await getOrderRevenueExprs();
  const paidNet = schema.ordersRefundedAmount
    ? 'GREATEST(0, o.total_amount - COALESCE(o.refunded_amount, 0))'
    : 'o.total_amount';
  const refundCol = schema.ordersRefundedAmount ? 'COALESCE(o.refunded_amount, 0)' : '0';
  const grossCol = schema.ordersGrossProfit ? 'COALESCE(o.gross_profit_amount, 0)' : '0';
  const netCol = schema.ordersNetProfit ? 'COALESCE(o.net_profit_amount, 0)' : '0';
  const [[row]] = await db.query(
    `SELECT
       COALESCE(SUM(CASE WHEN DATE(o.created_at) = CURDATE() THEN 1 ELSE 0 END), 0) AS today_order_count,
       COALESCE(SUM(CASE WHEN DATE(COALESCE(o.paid_at, o.payment_time)) = CURDATE()
         AND o.payment_status IN ('paid', 'partially_refunded') THEN 1 ELSE 0 END), 0) AS today_paid_order_count,
       COALESCE(SUM(CASE WHEN DATE(COALESCE(o.paid_at, o.payment_time)) = CURDATE()
         AND o.payment_status IN ('paid', 'partially_refunded')
         THEN ${paidNet} ELSE 0 END), 0) AS today_paid_amount,
       COALESCE(SUM(CASE WHEN DATE(COALESCE(o.paid_at, o.payment_time)) = CURDATE()
         THEN ${refundCol} ELSE 0 END), 0) AS today_refund_amount,
       COALESCE(SUM(CASE WHEN DATE(COALESCE(o.paid_at, o.payment_time)) = CURDATE()
         AND o.payment_status IN ('paid', 'partially_refunded') THEN ${grossCol} ELSE 0 END), 0) AS today_gross_profit_amount,
       COALESCE(SUM(CASE WHEN DATE(COALESCE(o.paid_at, o.payment_time)) = CURDATE()
         AND o.payment_status IN ('paid', 'partially_refunded') THEN ${netCol} ELSE 0 END), 0) AS today_net_profit_amount,
       COALESCE(SUM(CASE WHEN o.status = 'pending' AND COALESCE(o.payment_status, 'pending') = 'pending' THEN o.total_amount ELSE 0 END), 0) AS pending_payment_amount,
       COALESCE(SUM(CASE WHEN o.status = 'paid' AND o.payment_status IN ('paid', 'partially_refunded') THEN 1 ELSE 0 END), 0) AS pending_shipment_count,
       COALESCE(SUM(CASE WHEN o.status = 'paid' AND o.payment_status IN ('paid', 'partially_refunded') THEN o.total_amount ELSE 0 END), 0) AS pending_shipment_amount,
       COALESCE(SUM(CASE WHEN return_stats.active_return_count > 0 THEN return_stats.active_return_count ELSE 0 END), 0) AS active_return_count,
       COALESCE(SUM(CASE WHEN o.status = 'pending' AND COALESCE(o.payment_status, 'pending') = 'pending'
         AND o.created_at < DATE_SUB(NOW(), INTERVAL 2 HOUR) THEN 1 ELSE 0 END), 0) AS overdue_unpaid_count,
       COALESCE(SUM(CASE WHEN o.status = 'paid' AND o.payment_status IN ('paid', 'partially_refunded')
         AND COALESCE(o.paid_at, o.payment_time, o.created_at) < DATE_SUB(NOW(), INTERVAL 24 HOUR) THEN 1 ELSE 0 END), 0) AS overdue_shipment_count
     FROM orders o
     LEFT JOIN users u ON u.id = o.user_id
     LEFT JOIN (
       SELECT
         order_id,
         SUM(CASE WHEN status IN ('pending', 'approved', 'processing') THEN 1 ELSE 0 END) AS active_return_count
       FROM return_requests
       GROUP BY order_id
     ) return_stats ON return_stats.order_id = o.id
     ${where}`,
    params,
  );
  return row || {};
}

async function selectOrderFinancialSummary(where, params) {
  const { schema } = await getOrderRevenueExprs();
  const refundCol = schema.ordersRefundedAmount ? 'COALESCE(o.refunded_amount, 0)' : '0';
  const payableCol = orderEffectivePayableSql('o', schema);
  const paidCol = orderEffectivePaidSql('o', schema);
  const netReceivedCol = `GREATEST(0, (${paidCol}) - ${refundCol})`;
  const outstandingCol = `GREATEST(0, (${payableCol}) - (${paidCol}))`;
  const activityDiscountCol = orderEffectiveActivityDiscountSql('o', schema);
  const couponDiscountCol = schema.ordersCouponDiscount ? 'COALESCE(o.coupon_discount_amount, 0)' : '0';
  const pointsDiscountCol = schema.ordersPointsDiscount ? 'COALESCE(o.points_discount_amount, 0)' : '0';
  const rewardCashDiscountCol = schema.ordersRewardCashDiscount ? 'COALESCE(o.reward_cash_discount_amount, 0)' : '0';
  const shippingDiscountCol = schema.ordersShippingDiscount ? 'COALESCE(o.shipping_discount_amount, 0)' : '0';
  const shippingCostCol = schema.ordersShippingCost ? 'COALESCE(o.shipping_cost_amount, 0)' : '0';
  const grossProfitCol = schema.ordersGrossProfit ? 'COALESCE(o.gross_profit_amount, 0)' : '0';
  const netProfitCol = schema.ordersNetProfit ? 'COALESCE(o.net_profit_amount, 0)' : '0';
  const [[row]] = await db.query(
    `SELECT
       COUNT(*) AS order_count,
       COALESCE(SUM(${payableCol}), 0) AS payable_amount,
       COALESCE(SUM(${paidCol}), 0) AS paid_amount,
       COALESCE(SUM(${netReceivedCol}), 0) AS net_received_amount,
       COALESCE(SUM(${outstandingCol}), 0) AS outstanding_amount,
       COALESCE(SUM(${refundCol}), 0) AS refund_amount,
       COALESCE(SUM(${activityDiscountCol}), 0) AS activity_discount_amount,
       COALESCE(SUM(${couponDiscountCol}), 0) AS coupon_discount_amount,
       COALESCE(SUM(${pointsDiscountCol}), 0) AS points_discount_amount,
       COALESCE(SUM(${rewardCashDiscountCol}), 0) AS reward_cash_discount_amount,
       COALESCE(SUM(${shippingDiscountCol}), 0) AS shipping_discount_amount,
       COALESCE(SUM(COALESCE(o.shipping_fee, 0)), 0) AS shipping_income_amount,
       COALESCE(SUM(${shippingCostCol}), 0) AS shipping_cost_amount,
       COALESCE(SUM(${grossProfitCol}), 0) AS gross_profit_amount,
       COALESCE(SUM(${netProfitCol}), 0) AS net_profit_amount,
       COALESCE(SUM(${activityDiscountCol} + ${couponDiscountCol} + ${pointsDiscountCol} + ${rewardCashDiscountCol} + ${shippingDiscountCol}), 0) AS total_discount_amount,
       COALESCE(SUM(COALESCE(o.discount_amount, 0)), 0) AS discount_amount
     FROM orders o
     LEFT JOIN users u ON u.id = o.user_id
     ${where}`,
    params,
  );
  return row || {};
}

/** 全站今日指标（不受列表筛选条件影响） */
async function selectOrderGlobalTodaySummary() {
  const { schema } = await getOrderRevenueExprs();
  const paidNet = schema.ordersRefundedAmount
    ? 'GREATEST(0, o.total_amount - COALESCE(o.refunded_amount, 0))'
    : 'o.total_amount';
  const refundCol = schema.ordersRefundedAmount ? 'COALESCE(o.refunded_amount, 0)' : '0';
  const grossCol = schema.ordersGrossProfit ? 'COALESCE(o.gross_profit_amount, 0)' : '0';
  const netCol = schema.ordersNetProfit ? 'COALESCE(o.net_profit_amount, 0)' : '0';
  const [[row]] = await db.query(
    `SELECT
       COALESCE(SUM(CASE WHEN DATE(o.created_at) = CURDATE() THEN 1 ELSE 0 END), 0) AS today_order_count,
       COALESCE(SUM(CASE WHEN DATE(COALESCE(o.paid_at, o.payment_time)) = CURDATE()
         AND o.payment_status IN ('paid', 'partially_refunded') THEN 1 ELSE 0 END), 0) AS today_paid_order_count,
       COALESCE(SUM(CASE WHEN DATE(COALESCE(o.paid_at, o.payment_time)) = CURDATE()
         AND o.payment_status IN ('paid', 'partially_refunded')
         THEN ${paidNet} ELSE 0 END), 0) AS today_paid_amount,
       COALESCE(SUM(CASE WHEN DATE(COALESCE(o.paid_at, o.payment_time)) = CURDATE()
         THEN ${refundCol} ELSE 0 END), 0) AS today_refund_amount,
       COALESCE(SUM(CASE WHEN DATE(COALESCE(o.paid_at, o.payment_time)) = CURDATE()
         AND o.payment_status IN ('paid', 'partially_refunded') THEN ${grossCol} ELSE 0 END), 0) AS today_gross_profit_amount,
       COALESCE(SUM(CASE WHEN DATE(COALESCE(o.paid_at, o.payment_time)) = CURDATE()
         AND o.payment_status IN ('paid', 'partially_refunded') THEN ${netCol} ELSE 0 END), 0) AS today_net_profit_amount
     FROM orders o`,
  );
  return row || {};
}

/**
 * @param {Queryable|null} q
 * @param {string} orderId
 */
async function selectOrderById(q, orderId) {
  const pool = q || db;
  const [[order]] = await pool.query('SELECT * FROM orders WHERE id = ?', [orderId]);
  return order || null;
}

async function selectOrderStateById(orderId) {
  const [[row]] = await db.query(
    'SELECT status, payment_status FROM orders WHERE id = ?',
    [orderId],
  );
  return row || null;
}

async function selectAdminOrderForUpdate(q, orderId) {
  const [[row]] = await q.query(
    'SELECT * FROM orders WHERE id = ? FOR UPDATE',
    [orderId],
  );
  return row || null;
}

async function selectOrderItemsForAdjustment(q, orderId) {
  const [rows] = await q.query(
    `SELECT
       oi.*,
       COALESCE(NULLIF(oi.product_name, ''), NULLIF(oi.product_name_snapshot, ''), p.name, '') AS name,
       COALESCE(NULLIF(oi.product_image, ''), NULLIF(oi.product_image_snapshot, ''), p.cover_image, '') AS cover_image,
       oi.price AS unit_price,
       COALESCE(v.stock, 0) AS current_stock,
       v.enabled AS variant_enabled
     FROM order_items oi
     LEFT JOIN products p ON p.id = oi.product_id
     LEFT JOIN product_variants v ON v.id = oi.variant_id
     WHERE oi.order_id = ?
     ORDER BY oi.id
     FOR UPDATE`,
    [orderId],
  );
  return rows || [];
}

async function selectOrderAdjustments(q, orderId) {
  const [rows] = await q.query(
    `SELECT *
     FROM order_adjustments
     WHERE order_id = ?
     ORDER BY created_at DESC, id DESC`,
    [orderId],
  );
  return rows || [];
}

async function selectOrderAdjustmentItemsByOrder(q, orderId) {
  const [rows] = await q.query(
    `SELECT ai.*
     FROM order_adjustment_items ai
     JOIN order_adjustments a ON a.id = ai.adjustment_id
     WHERE ai.order_id = ?
     ORDER BY a.created_at DESC, ai.id ASC`,
    [orderId],
  );
  return rows || [];
}

async function insertOrderAdjustment(q, row) {
  await q.query(
    `INSERT INTO order_adjustments
       (id, order_id, order_no, adjustment_no, adjustment_type, reason,
        customer_confirmed, customer_confirm_method, customer_confirm_note,
        before_amount, after_amount, refund_amount, stock_handling, status, operator_id)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      row.id,
      row.order_id,
      row.order_no || '',
      row.adjustment_no,
      row.adjustment_type || 'stock_shortage',
      row.reason || '',
      row.customer_confirmed ? 1 : 0,
      row.customer_confirm_method || '',
      row.customer_confirm_note || '',
      row.before_amount ? JSON.stringify(row.before_amount) : null,
      row.after_amount ? JSON.stringify(row.after_amount) : null,
      row.refund_amount || 0,
      row.stock_handling || 'no_restore',
      row.status || 'applied',
      row.operator_id || null,
    ],
  );
}

async function insertOrderAdjustmentItem(q, row) {
  await q.query(
    `INSERT INTO order_adjustment_items
       (id, adjustment_id, order_id, order_item_id, product_id, variant_id, sku_code,
        product_name_snapshot, variant_name_snapshot, before_qty, after_qty, removed_qty,
        unit_price, line_refund_amount, shortage_reason)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      row.id,
      row.adjustment_id,
      row.order_id,
      row.order_item_id,
      row.product_id,
      row.variant_id || null,
      row.sku_code || '',
      row.product_name_snapshot || '',
      row.variant_name_snapshot || '',
      row.before_qty,
      row.after_qty,
      row.removed_qty,
      row.unit_price,
      row.line_refund_amount,
      row.shortage_reason || '',
    ],
  );
}

async function updateOrderItemAfterShortage(q, orderItemId, row) {
  await q.query(
    `UPDATE order_items
     SET qty = ?,
         line_status = ?,
         original_qty = COALESCE(original_qty, ?),
         subtotal = ?,
         discount_allocated = ?,
         cost_amount = ?,
         net_sales_amount = ?,
         gross_profit_amount = ?,
         adjusted_at = NOW(),
         adjusted_by = ?,
         adjusted_reason = ?
     WHERE id = ?`,
    [
      row.qty,
      row.line_status,
      row.original_qty,
      row.subtotal,
      row.discount_allocated,
      row.cost_amount,
      row.net_sales_amount,
      row.gross_profit_amount,
      row.adjusted_by || null,
      row.adjusted_reason || '',
      orderItemId,
    ],
  );
}

async function updateOrderAmountsAfterShortage(q, orderId, row) {
  await q.query(
    `UPDATE orders
     SET raw_amount = ?,
         goods_sale_amount = ?,
         goods_net_sales_amount = ?,
         goods_cost_amount = ?,
         gross_profit_amount = ?,
         discount_amount = ?,
         total_discount_amount = ?,
         total_amount = ?,
         payable_amount = ?,
         refunded_amount = ?,
         net_received_amount = ?,
         outstanding_amount = ?,
         net_profit_amount = ?,
         payment_status = ?,
         refund_status = ?,
         amount_snapshot = ?
     WHERE id = ?`,
    [
      row.raw_amount,
      row.goods_sale_amount,
      row.goods_net_sales_amount,
      row.goods_cost_amount,
      row.gross_profit_amount,
      row.discount_amount,
      row.total_discount_amount,
      row.total_amount,
      row.payable_amount,
      row.refunded_amount,
      row.net_received_amount,
      row.outstanding_amount,
      row.net_profit_amount,
      row.payment_status,
      row.refund_status || '',
      row.amount_snapshot ? JSON.stringify(row.amount_snapshot) : null,
      orderId,
    ],
  );
}

async function insertPaymentEvent(q, row) {
  await q.query(
    `INSERT INTO payment_events
      (id, payment_order_id, order_id, provider, provider_event_id, event_type,
       verify_status, processing_result, payload_json, error_message)
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
    [
      row.id,
      row.payment_order_id || null,
      row.order_id || null,
      row.provider || 'manual',
      row.provider_event_id || null,
      row.event_type,
      row.verify_status || 'success',
      row.processing_result || 'success',
      row.payload_json ? JSON.stringify(row.payload_json) : null,
      row.error_message || '',
    ],
  );
}

async function correctVariantStockToZero(q, variantId, meta = {}) {
  const [[row]] = await q.query(
    `SELECT v.id, v.product_id, v.stock, v.title, v.sku_code, p.name AS product_name
     FROM product_variants v
     JOIN products p ON p.id = v.product_id
     WHERE v.id = ?
     FOR UPDATE`,
    [variantId],
  );
  if (!row) return null;
  const beforeStock = Number(row.stock || 0);
  if (beforeStock === 0) return { product_id: row.product_id, before_stock: 0, after_stock: 0 };
  await q.query('UPDATE product_variants SET stock = 0 WHERE id = ?', [variantId]);
  await q.query(
    `UPDATE products p
     SET p.stock = COALESCE((SELECT SUM(v.stock) FROM product_variants v WHERE v.product_id = p.id AND v.deleted_at IS NULL AND v.enabled = 1), 0)
     WHERE p.id = ?`,
    [row.product_id],
  );
  await q.query(
    `INSERT INTO inventory_stock_records
       (id, product_id, variant_id, change_type, quantity_delta, before_stock,
        after_stock, reason, ref_type, ref_id, operator_id,
        product_name_snapshot, variant_name_snapshot, sku_code_snapshot, order_no_snapshot, source_no, remark, created_by_type)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      generateId(),
      row.product_id,
      variantId,
      'adjust',
      -beforeStock,
      beforeStock,
      0,
      meta.reason || '订单缺货处理校正库存为 0',
      meta.refType || 'order_shortage',
      meta.refId || '',
      meta.operatorId || null,
      row.product_name || '',
      row.title || '',
      row.sku_code || '',
      meta.orderNo || '',
      '',
      meta.remark || '',
      'admin',
    ],
  );
  return { product_id: row.product_id, before_stock: beforeStock, after_stock: 0 };
}

async function updateOrderShipped(orderId, trackingNo, carrier) {
  await db.query(
    `UPDATE orders
       SET status = ?, tracking_no = ?, carrier = ?,
           shipped_at = COALESCE(shipped_at, NOW())
     WHERE id = ?`,
    [ORDER_STATUS.SHIPPED, trackingNo, carrier, orderId],
  );
}

async function updateOrderShippedTx(q, orderId, trackingNo, carrier) {
  await q.query(
    `UPDATE orders
       SET status = ?, tracking_no = ?, carrier = ?,
           shipped_at = COALESCE(shipped_at, NOW())
     WHERE id = ?`,
    [ORDER_STATUS.SHIPPED, trackingNo, carrier, orderId],
  );
}

/**
 * 杩涘叆銆屽凡鍙戣揣銆嶆椂璁板綍棣栨鍙戣揣鏃堕棿锛堣嫢宸叉湁鍒欎繚鐣欙紝渚夸簬澶氭鏇存柊杩愬崟鍙蜂笉鏀瑰彉璁℃椂璧风偣锛? * @param {import('mysql2/promise').PoolConnection} q
 * @param {string} orderId
 */
async function touchOrderShippedAtIfNull(q, orderId) {
  await q.query(
    'UPDATE orders SET shipped_at = COALESCE(shipped_at, NOW()) WHERE id = ?',
    [orderId],
  );
}

async function selectOrderItemsBatch(orderIds) {
  if (!orderIds.length) return [];
  const placeholders = orderIds.map(() => '?').join(',');
  const [items] = await db.query(
    `SELECT
       oi.*,
       COALESCE(NULLIF(oi.product_name, ''), p.name) AS name,
       COALESCE(NULLIF(oi.product_image, ''), p.cover_image) AS cover_image,
       oi.price AS unit_price,
       COALESCE(v.stock, 0) AS current_stock
     FROM order_items oi
     LEFT JOIN products p ON oi.product_id = p.id
     LEFT JOIN product_variants v ON v.id = oi.variant_id
     WHERE oi.order_id IN (${placeholders})
       AND COALESCE(oi.line_status, 'active') = 'active'
       AND COALESCE(oi.qty, 0) > 0`,
    orderIds,
  );
  return items;
}

/* 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
 * 浜嬪姟鍐呮柟娉曪紙鎺ユ敹 conn锛? * 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€ */

/**
 * @param {Queryable} q
 * @param {string} orderId
 * @param {string} status
 * @param {string} paymentStatus
 */
async function updateOrderStatusAndPayment(q, orderId, status, paymentStatus) {
  await q.query(
    'UPDATE orders SET status = ?, payment_status = ? WHERE id = ?',
    [status, paymentStatus, orderId],
  );
}

async function updateOrderStatusPaymentAndPaidTime(q, orderId, status, paymentStatus) {
  await q.query(
    `UPDATE orders
     SET status = ?, payment_status = ?,
         payment_time = COALESCE(payment_time, NOW()),
         paid_at = COALESCE(paid_at, NOW()),
         paid_amount = COALESCE(NULLIF(paid_amount, 0), NULLIF(payable_amount, 0), total_amount, 0),
         net_received_amount = GREATEST(0, COALESCE(NULLIF(paid_amount, 0), NULLIF(payable_amount, 0), total_amount, 0) - COALESCE(refunded_amount, 0)),
         outstanding_amount = 0
     WHERE id = ?`,
    [status, paymentStatus, orderId],
  );
}

/**
 * @param {Queryable} q
 * @param {string} orderId
 * @param {string} remark
 */
async function appendAdminRemark(q, orderId, remark) {
  await q.query(
    'UPDATE orders SET note = CONCAT(IFNULL(note, ""), ?) WHERE id = ?',
    [`\n[绠＄悊澶囨敞] ${remark}`, orderId],
  );
}

async function selectFullOrder(q, orderId) {
  const [[row]] = await q.query('SELECT * FROM orders WHERE id = ?', [orderId]);
  return row || null;
}

async function selectOrderItemPairs(q, orderId) {
  const [rows] = await q.query(
    'SELECT product_id, variant_id, qty FROM order_items WHERE order_id = ?',
    [orderId],
  );
  return rows || [];
}

async function restoreVariantStock(q, variantId, qty, meta = {}) {
  const [[beforeRow]] = await q.query(
    `SELECT v.stock, v.product_id, v.title, v.sku_code, p.name AS product_name
     FROM product_variants v
     JOIN products p ON p.id = v.product_id
     WHERE v.id = ?
     FOR UPDATE`,
    [variantId],
  );
  if (!beforeRow) return 0;
  const beforeStock = Number(beforeRow.stock || 0);
  const afterStock = beforeStock + Number(qty || 0);
  await q.query('UPDATE product_variants SET stock = ? WHERE id = ?', [afterStock, variantId]);
  await q.query(
    `UPDATE products p
     SET p.stock = COALESCE((SELECT SUM(v.stock) FROM product_variants v WHERE v.product_id = p.id), p.stock)
     WHERE p.id = ?`,
    [beforeRow.product_id],
  );
  await q.query(
    `INSERT INTO inventory_stock_records
       (id, product_id, variant_id, change_type, quantity_delta, before_stock,
        after_stock, reason, ref_type, ref_id, operator_id,
        product_name_snapshot, variant_name_snapshot, sku_code_snapshot, order_no_snapshot, source_no, remark, created_by_type)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      generateId(),
      beforeRow.product_id,
      variantId,
      'order_release',
      qty,
      beforeStock,
      afterStock,
      meta.reason || '管理员取消订单释放 SKU 库存',
      meta.refType || 'order',
      meta.refId || '',
      meta.operatorId || null,
      beforeRow.product_name || '',
      beforeRow.title || '',
      beforeRow.sku_code || '',
      meta.orderNo || '',
      '',
      '',
      'admin',
    ],
  );
  return 1;
}

async function bumpProductSalesCount(q, productId, qty) {
  await q.query(
    'UPDATE products SET sales_count = sales_count + ? WHERE id = ?',
    [qty, productId],
  );
}
async function ensurePointsAccount(q, userId) {
  await q.query(
    `INSERT IGNORE INTO points_accounts (user_id, balance, total_earned)
     SELECT id, COALESCE(points_balance, 0), GREATEST(COALESCE(points_balance, 0), 0)
     FROM users WHERE id = ?`,
    [userId],
  );
}

async function syncUserPointsFromAccount(q, userId) {
  await q.query(
    `UPDATE users u
     JOIN points_accounts pa ON pa.user_id = u.id
     SET u.points_balance = pa.balance
     WHERE u.id = ?`,
    [userId],
  );
}

async function decrementUserPoints(q, userId, points) {
  const amount = Math.max(Number(points) || 0, 0);
  await ensurePointsAccount(q, userId);
  await q.query(
    `UPDATE points_accounts
     SET balance = GREATEST(0, balance - ?),
         total_spent = total_spent + ?,
         total_reversed = total_reversed + ?
     WHERE user_id = ?`,
    [amount, amount, amount, userId],
  );
  await syncUserPointsFromAccount(q, userId);
}

async function restoreUserCouponById(q, userCouponId) {
  await q.query(
    "UPDATE user_coupons SET status = 'available', used_at = NULL WHERE id = ?",
    [userCouponId],
  );
}

async function selectUserParentInviteCode(q, userId) {
  const [[row]] = await q.query('SELECT parent_invite_code FROM users WHERE id = ?', [userId]);
  return row || null;
}

async function selectUserIdByInviteCode(q, inviteCode) {
  const [[row]] = await q.query('SELECT id FROM users WHERE invite_code = ?', [inviteCode]);
  return row || null;
}

async function selectReferralRulesEnabled(q) {
  const [rows] = await q.query('SELECT * FROM referral_rules WHERE enabled = 1 ORDER BY level ASC');
  return rows || [];
}

async function insertRewardRecord(q, params) {
  const { id, userId, orderId, orderNo, amount, rate, status } = params;
  await q.query(
    `INSERT INTO reward_records (id, user_id, order_id, order_no, amount, rate, status)
     VALUES (?,?,?,?,?,?,?)`,
    [id, userId, orderId, orderNo, amount, rate, status],
  );
}

async function incrementUserPoints(q, userId, points) {
  const amount = Math.max(Number(points) || 0, 0);
  await ensurePointsAccount(q, userId);
  await q.query(
    `UPDATE points_accounts
     SET balance = balance + ?, total_earned = total_earned + ?
     WHERE user_id = ?`,
    [amount, amount, userId],
  );
  await syncUserPointsFromAccount(q, userId);
}

async function insertPointsRecord(q, params) {
  const { id, userId, action, amount, description } = params;
  await q.query(
    `INSERT INTO points_records (id, user_id, action, amount, description) VALUES (?,?,?,?,?)`,
    [id, userId, action, amount, description],
  );
}

async function insertOrderNotification(q, params) {
  const { id, userId, title, content } = params;
  await q.query(
    `INSERT INTO notifications (id, user_id, type, title, content) VALUES (?,?,?,?,?)`,
    [id, userId, 'order', title, content],
  );
}

module.exports = {
  getPool,
  getConnection,
  selectOrderItemsWithProduct,
  selectOrderItemsBatch,
  countOrdersAdmin,
  selectOrderStatusSummary,
  selectOrderOperationalSummary,
  selectOrderFinancialSummary,
  selectOrderGlobalTodaySummary,
  selectOrdersAdminPage,
  selectOrdersForExport,
  selectOrderById,
  selectOrderStateById,
  selectAdminOrderForUpdate,
  selectOrderItemsForAdjustment,
  selectOrderAdjustments,
  selectOrderAdjustmentItemsByOrder,
  insertOrderAdjustment,
  insertOrderAdjustmentItem,
  updateOrderItemAfterShortage,
  updateOrderAmountsAfterShortage,
  insertPaymentEvent,
  correctVariantStockToZero,
  updateOrderShipped,
  updateOrderShippedTx,
  touchOrderShippedAtIfNull,

  updateOrderStatusAndPayment,
  updateOrderStatusPaymentAndPaidTime,
  appendAdminRemark,
  selectFullOrder,
  selectOrderItemPairs,
  bumpProductSalesCount,
  restoreVariantStock,
  decrementUserPoints,
  restoreUserCouponById,
  selectUserParentInviteCode,
  selectUserIdByInviteCode,
  selectReferralRulesEnabled,
  insertRewardRecord,
  incrementUserPoints,
  insertPointsRecord,
  insertOrderNotification,
  countPendingShipmentOrders,
  selectPendingShipmentOrdersPage,
  selectOrdersByIds,
};


async function countPendingShipmentOrders() {
  const [[{ total }]] = await db.query(
    'SELECT COUNT(*) AS total FROM orders WHERE status = ? AND (payment_status = ? OR payment_status = ?)',
    [ORDER_STATUS.PAID, 'paid', 'partially_refunded'],
  );
  return total;
}

async function selectPendingShipmentOrdersPage(pageSize, offset) {
  const [rows] = await db.query(
    'SELECT * FROM orders WHERE status = ? AND (payment_status = ? OR payment_status = ?) ORDER BY created_at DESC LIMIT ? OFFSET ?',
    [ORDER_STATUS.PAID, 'paid', 'partially_refunded', pageSize, offset],
  );
  return rows;
}

async function selectOrdersByIds(orderIds = []) {
  if (!orderIds.length) return [];
  const placeholders = orderIds.map(() => '?').join(',');
  const [rows] = await db.query(
    'SELECT * FROM orders WHERE id IN (' + placeholders + ')',
    orderIds,
  );
  return rows;
}

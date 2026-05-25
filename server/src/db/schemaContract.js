/**
 * 数据库结构契约（全站唯一入口）
 *
 * 管理端统计/报表等 SQL 必须经此模块获取「列是否存在」与「营收表达式」，
 * 禁止在仓库层写死依赖未迁移字段的常量 SQL。
 */
const db = require('../config/db');
const { PAID_PAYMENT_SQL, netSalesExpr, refundedAmountExpr, orderNetRatioExpr } = require('../utils/orderRevenueSql');
const { listPendingMigrationNames } = require('./migrateRunner');

/** 影响管理端统计/报表的关键迁移（文件名，不含扩展名） */
const CRITICAL_ADMIN_MIGRATIONS = Object.freeze([
  '096_orders_refunded_amount',
  '091_notification_logs',
  '090_analytics_traffic_fields',
  '100_order_profit_snapshot',
  '121_order_amount_snapshot',
]);

/** @type {null | Record<string, boolean>} */
let capabilitiesCache = null;

async function tableExists(tableName) {
  try {
    await db.query(`SELECT 1 FROM \`${tableName}\` LIMIT 1`);
    return true;
  } catch (e) {
    if (e.code === 'ER_NO_SUCH_TABLE') return false;
    throw e;
  }
}

async function columnExists(tableName, columnName) {
  if (!(await tableExists(tableName))) return false;
  const [rows] = await db.query(`SHOW COLUMNS FROM \`${tableName}\` LIKE ?`, [columnName]);
  return (rows || []).length > 0;
}

async function loadSchemaCapabilities() {
  if (capabilitiesCache) return capabilitiesCache;
  const [
    ordersRefundedAmount,
    returnRequests,
    productVariants,
    categoriesDeletedAt,
    analyticsReady,
    analyticsOs,
    analyticsDevice,
    ordersGrossProfit,
    ordersNetProfit,
    ordersGoodsCost,
    ordersGoodsNetSales,
    ordersRawAmount,
    ordersShippingCost,
    ordersPaymentFee,
    ordersPointsDiscount,
    ordersRewardCashDiscount,
    ordersGoodsOriginalAmount,
    ordersGoodsSaleAmount,
    ordersActivityDiscount,
    ordersCouponDiscount,
    ordersShippingOriginalFee,
    ordersShippingDiscount,
    ordersTotalDiscount,
    ordersPayableAmount,
    ordersPaidAmount,
    ordersNetReceivedAmount,
    ordersOutstandingAmount,
    ordersAmountSnapshot,
    orderItemsCostSnapshot,
    orderItemsNetSales,
    orderItemsGrossProfit,
    orderItemsDiscountAllocated,
    operatingExpenses,
    notificationLogs,
  ] = await Promise.all([
    columnExists('orders', 'refunded_amount'),
    tableExists('return_requests'),
    tableExists('product_variants'),
    columnExists('categories', 'deleted_at'),
    tableExists('analytics_events'),
    columnExists('analytics_events', 'os'),
    columnExists('analytics_events', 'device'),
    columnExists('orders', 'gross_profit_amount'),
    columnExists('orders', 'net_profit_amount'),
    columnExists('orders', 'goods_cost_amount'),
    columnExists('orders', 'goods_net_sales_amount'),
    columnExists('orders', 'raw_amount'),
    columnExists('orders', 'shipping_cost_amount'),
    columnExists('orders', 'payment_fee_amount'),
    columnExists('orders', 'points_discount_amount'),
    columnExists('orders', 'reward_cash_discount_amount'),
    columnExists('orders', 'goods_original_amount'),
    columnExists('orders', 'goods_sale_amount'),
    columnExists('orders', 'activity_discount_amount'),
    columnExists('orders', 'coupon_discount_amount'),
    columnExists('orders', 'shipping_original_fee'),
    columnExists('orders', 'shipping_discount_amount'),
    columnExists('orders', 'total_discount_amount'),
    columnExists('orders', 'payable_amount'),
    columnExists('orders', 'paid_amount'),
    columnExists('orders', 'net_received_amount'),
    columnExists('orders', 'outstanding_amount'),
    columnExists('orders', 'amount_snapshot'),
    columnExists('order_items', 'cost_snapshot_source'),
    columnExists('order_items', 'net_sales_amount'),
    columnExists('order_items', 'gross_profit_amount'),
    columnExists('order_items', 'discount_allocated'),
    tableExists('operating_expense_records'),
    tableExists('notification_logs'),
  ]);

  capabilitiesCache = {
    ordersRefundedAmount,
    returnRequests,
    productVariants,
    categoriesDeletedAt,
    analyticsReady,
    analyticsOs,
    analyticsDevice,
    ordersGrossProfit,
    ordersNetProfit,
    ordersGoodsCost,
    ordersGoodsNetSales,
    ordersRawAmount,
    ordersShippingCost,
    ordersPaymentFee,
    ordersPointsDiscount,
    ordersRewardCashDiscount,
    ordersGoodsOriginalAmount,
    ordersGoodsSaleAmount,
    ordersActivityDiscount,
    ordersCouponDiscount,
    ordersShippingOriginalFee,
    ordersShippingDiscount,
    ordersTotalDiscount,
    ordersPayableAmount,
    ordersPaidAmount,
    ordersNetReceivedAmount,
    ordersOutstandingAmount,
    ordersAmountSnapshot,
    orderItemsCostSnapshot,
    orderItemsNetSales,
    orderItemsGrossProfit,
    orderItemsDiscountAllocated,
    operatingExpenses,
    notificationLogs,
  };
  return capabilitiesCache;
}

function invalidateSchemaCapabilitiesCache() {
  capabilitiesCache = null;
}

async function getPendingCriticalMigrations() {
  const pending = await listPendingMigrationNames();
  return pending.filter((name) => CRITICAL_ADMIN_MIGRATIONS.includes(name));
}

async function getPendingMigrations() {
  return listPendingMigrationNames();
}

/**
 * 管理端统计 / 报表共用的营收 SQL 片段
 */
async function getOrderRevenueExprs() {
  const schema = await loadSchemaCapabilities();
  const revOpts = { includeRefundedAmount: schema.ordersRefundedAmount };
  const paid = PAID_PAYMENT_SQL;
  return {
    schema,
    NET_SALES_O: netSalesExpr('o', revOpts),
    NET_SALES: netSalesExpr('', revOpts),
    REFUNDED_O: refundedAmountExpr('o', revOpts),
    REFUNDED: refundedAmountExpr('', revOpts),
    GROSS_O: `CASE WHEN o.payment_status IN (${paid}) THEN o.total_amount ELSE 0 END`,
    GROSS: `CASE WHEN payment_status IN (${paid}) THEN total_amount ELSE 0 END`,
    ORDER_NET_RATIO: orderNetRatioExpr('o', revOpts),
    grossProfitSumO: schema.ordersGrossProfit
      ? `COALESCE(SUM(CASE WHEN o.payment_status IN (${paid}) THEN o.gross_profit_amount ELSE 0 END),0)`
      : '0',
    netProfitSumO: schema.ordersNetProfit
      ? `COALESCE(SUM(CASE WHEN o.payment_status IN (${paid}) THEN o.net_profit_amount ELSE 0 END),0)`
      : '0',
    missingCostJoin: schema.orderItemsCostSnapshot
      ? `LEFT JOIN (
          SELECT order_id,
                 SUM(CASE WHEN cost_snapshot_source='missing' THEN 1 ELSE 0 END) AS missing_cost_item_count
          FROM order_items
          GROUP BY order_id
        ) missing ON missing.order_id = o.id`
      : `LEFT JOIN (
          SELECT CAST(NULL AS CHAR(36)) AS order_id, 0 AS missing_cost_item_count
          LIMIT 0
        ) missing ON missing.order_id = o.id`,
    missingCostOrderCount: schema.orderItemsCostSnapshot
      ? `COUNT(DISTINCT CASE WHEN o.payment_status IN (${paid}) AND missing.missing_cost_item_count > 0 THEN o.id END)`
      : '0',
    orderRefundCol: schema.ordersRefundedAmount ? 'o.refunded_amount' : '0',
  };
}

/** @deprecated 使用 getOrderRevenueExprs().schema */
async function getDashboardSchema() {
  return loadSchemaCapabilities();
}

/** @deprecated 使用 getOrderRevenueExprs */
async function getReportExprs() {
  return getOrderRevenueExprs();
}

/** 已支付订单按列汇总：列不存在时返回 0 */
function orderPaidSum(columnExpr, alias) {
  if (!columnExpr || columnExpr === '0') return `0 AS ${alias}`;
  return `SUM(CASE WHEN o.payment_status IN (${PAID_PAYMENT_SQL}) THEN ${columnExpr} ELSE 0 END) AS ${alias}`;
}

/**
 * 利润日报 orders 子查询聚合列（按 schema 降级）
 */
async function getProfitDailySqlParts() {
  const schema = await loadSchemaCapabilities();
  const { missingCostJoin } = await getOrderRevenueExprs();
  const paid = PAID_PAYMENT_SQL;
  const paidAmountExpr = schema.ordersRefundedAmount
    ? 'GREATEST(0, o.total_amount - COALESCE(o.refunded_amount,0))'
    : 'o.total_amount';
  const refundSum = schema.ordersRefundedAmount
    ? 'SUM(COALESCE(o.refunded_amount,0))'
    : '0';
  const missingOrderCount = schema.orderItemsCostSnapshot
    ? `COUNT(DISTINCT CASE WHEN o.payment_status IN (${paid}) AND missing.missing_cost_item_count > 0 THEN o.id END)`
    : '0';
  const missingItemCount = schema.orderItemsCostSnapshot
    ? `SUM(CASE WHEN o.payment_status IN (${paid}) THEN COALESCE(missing.missing_cost_item_count,0) ELSE 0 END)`
    : '0';

  const orderAggSelect = [
    `COUNT(DISTINCT CASE WHEN o.payment_status IN (${paid}) THEN o.id END) AS paid_order_count`,
    orderPaidSum(paidAmountExpr, 'paid_amount'),
    orderPaidSum(schema.ordersRawAmount ? 'o.raw_amount' : '0', 'product_sales_amount'),
    orderPaidSum('o.discount_amount', 'discount_amount'),
    orderPaidSum(schema.ordersPointsDiscount ? 'o.points_discount_amount' : '0', 'points_discount_amount'),
    orderPaidSum(schema.ordersRewardCashDiscount ? 'o.reward_cash_discount_amount' : '0', 'reward_cash_discount_amount'),
    orderPaidSum(schema.ordersGoodsNetSales ? 'o.goods_net_sales_amount' : '0', 'net_goods_sales_amount'),
    orderPaidSum(schema.ordersGoodsCost ? 'o.goods_cost_amount' : '0', 'goods_cost_amount'),
    orderPaidSum(schema.ordersGrossProfit ? 'o.gross_profit_amount' : '0', 'gross_profit_amount'),
    orderPaidSum('o.shipping_fee', 'shipping_income'),
    orderPaidSum(schema.ordersShippingCost ? 'o.shipping_cost_amount' : '0', 'shipping_cost_amount'),
    orderPaidSum(schema.ordersPaymentFee ? 'o.payment_fee_amount' : '0', 'payment_fee_amount'),
    `${refundSum} AS refund_amount`,
    `${missingOrderCount} AS missing_cost_order_count`,
    `${missingItemCount} AS missing_cost_item_count`,
  ].join(',\n              ');

  return {
    schema,
    missingCostJoin,
    orderAggSelect,
    expenseDateUnion: schema.operatingExpenses
      ? `UNION
       SELECT expense_date AS date
       FROM operating_expense_records
       WHERE expense_date BETWEEN ? AND ?`
      : '',
    expenseJoin: schema.operatingExpenses
      ? `LEFT JOIN (
       SELECT expense_date AS date, SUM(amount) AS expense_amount
       FROM operating_expense_records
       WHERE expense_date BETWEEN ? AND ?
       GROUP BY expense_date
     ) e ON e.date = d.date`
      : `LEFT JOIN (
       SELECT CAST(NULL AS DATE) AS date, 0 AS expense_amount
       LIMIT 0
     ) e ON e.date = d.date`,
  };
}

module.exports = {
  CRITICAL_ADMIN_MIGRATIONS,
  loadSchemaCapabilities,
  invalidateSchemaCapabilitiesCache,
  getPendingCriticalMigrations,
  getPendingMigrations,
  getOrderRevenueExprs,
  getDashboardSchema,
  getReportExprs,
  orderPaidSum,
  getProfitDailySqlParts,
};

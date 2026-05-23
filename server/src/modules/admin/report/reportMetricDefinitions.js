const { ORDER_STATUS, PAYMENT_STATUS, PAID_PAYMENT_STATUS_LIST } = require('../../../constants/status');
const {
  PAID_PAYMENT_SQL,
  UNPAID_PAYMENT_SQL,
  netSalesExpr,
  refundedAmountExpr,
  orderNetRatioExpr,
  isPaidOrderExpr,
} = require('../../../utils/orderRevenueSql');

const PAID_PAYMENT_STATUSES = Object.freeze([...PAID_PAYMENT_STATUS_LIST]);
const REFUNDED_PAYMENT_STATUSES = Object.freeze([
  PAYMENT_STATUS.REFUNDED,
  PAYMENT_STATUS.PARTIALLY_REFUNDED,
]);
const EXCLUDED_ORDER_STATUSES = Object.freeze([
  ORDER_STATUS.CANCELLED,
]);

const REPORT_DATE_FIELD = 'created_at';
const REPORT_TIMEZONE_OFFSET_HOURS = 8;

function reportDateExpr(alias = 'o', field = REPORT_DATE_FIELD) {
  const prefix = alias ? `${alias}.` : '';
  return `DATE(DATE_ADD(${prefix}${field}, INTERVAL ${REPORT_TIMEZONE_OFFSET_HOURS} HOUR))`;
}

function reportMonthExpr(alias = 'o', field = REPORT_DATE_FIELD) {
  const prefix = alias ? `${alias}.` : '';
  return `DATE_FORMAT(DATE_ADD(${prefix}${field}, INTERVAL ${REPORT_TIMEZONE_OFFSET_HOURS} HOUR),'%Y-%m')`;
}

function isCancelledOrderExpr(alias = 'o') {
  const prefix = alias ? `${alias}.` : '';
  return `${prefix}status IN (${EXCLUDED_ORDER_STATUSES.map((status) => `'${status}'`).join(',')})`;
}

function isEffectiveOrderExpr(alias = 'o') {
  return `(${isPaidOrderExpr(alias)} AND NOT (${isCancelledOrderExpr(alias)}))`;
}

const METRIC_DEFINITIONS = Object.freeze({
  grossSales: '已支付订单 total_amount 汇总，部分退款订单仍纳入销售额，退款另行扣减。',
  netSales: '净销售额 = 已支付订单 total_amount - refunded_amount，缺少退款字段时按 total_amount 降级。',
  refundAmount: '退款金额 = orders.refunded_amount 汇总；旧库缺字段时降级为 0。',
  discountAmount: '优惠金额 = 已支付订单 discount_amount 汇总。',
  goodsCost: '商品成本优先使用订单/明细成本快照字段，缺成本需暴露 missing_cost 指标。',
  grossProfit: '商品毛利优先使用订单/明细毛利快照字段。',
  netProfit: '净利润 = 商品毛利 + 运费收入 - 物流成本 - 支付手续费 - 退款金额 - 经营支出。',
  paidOrder: 'payment_status 属于 PAID_PAYMENT_STATUSES。',
  effectiveOrder: '已支付且订单状态未取消。',
  cancelledOrder: 'status 属于 EXCLUDED_ORDER_STATUSES。',
});

module.exports = {
  PAID_PAYMENT_STATUSES,
  REFUNDED_PAYMENT_STATUSES,
  EXCLUDED_ORDER_STATUSES,
  REPORT_DATE_FIELD,
  REPORT_TIMEZONE_OFFSET_HOURS,
  PAID_PAYMENT_SQL,
  UNPAID_PAYMENT_SQL,
  netSalesExpr,
  refundedAmountExpr,
  orderNetRatioExpr,
  isPaidOrderExpr,
  isEffectiveOrderExpr,
  isCancelledOrderExpr,
  reportDateExpr,
  reportMonthExpr,
  METRIC_DEFINITIONS,
};

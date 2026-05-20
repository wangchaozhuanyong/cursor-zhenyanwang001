const { PAYMENT_STATUS, PAID_PAYMENT_STATUS_LIST } = require('../constants/status');

/** 已产生支付收入的 payment_status（含部分退款，需扣 refunded_amount） */
const PAID_PAYMENT_SQL = PAID_PAYMENT_STATUS_LIST.map((s) => `'${s}'`).join(',');

/** @param {string} [alias] 空字符串表示无表别名（单表 orders 查询） */
function orderCol(alias, column) {
  return alias ? `${alias}.${column}` : column;
}

/**
 * 净销售额表达式（订单别名）
 * @param {string} [alias]
 * @param {{ includeRefundedAmount?: boolean }} [options]
 */
function netSalesExpr(alias = 'o', options = {}) {
  const includeRefunded = options.includeRefundedAmount !== false;
  const ps = orderCol(alias, 'payment_status');
  const total = orderCol(alias, 'total_amount');
  if (!includeRefunded) {
    return `CASE
    WHEN ${ps} IN (${PAID_PAYMENT_SQL})
      THEN ${total}
    ELSE 0
  END`;
  }
  const refunded = orderCol(alias, 'refunded_amount');
  return `CASE
    WHEN ${ps} IN (${PAID_PAYMENT_SQL})
      THEN GREATEST(0, ${total} - COALESCE(${refunded}, 0))
    ELSE 0
  END`;
}

/** 累计退款金额 */
function refundedAmountExpr(alias = 'o', options = {}) {
  if (options.includeRefundedAmount === false) {
    return '0';
  }
  return `COALESCE(${orderCol(alias, 'refunded_amount')}, 0)`;
}

/** 订单净收入占比（用于 order_items 分摊） */
function orderNetRatioExpr(alias = 'o', options = {}) {
  const includeRefunded = options.includeRefundedAmount !== false;
  const a = alias;
  if (!includeRefunded) {
    return `(CASE WHEN ${a}.total_amount > 0 AND ${a}.payment_status IN (${PAID_PAYMENT_SQL})
      THEN 1 ELSE 0 END)`;
  }
  return `(CASE WHEN ${a}.total_amount > 0 AND ${a}.payment_status IN (${PAID_PAYMENT_SQL})
  THEN GREATEST(0, ${a}.total_amount - COALESCE(${a}.refunded_amount, 0)) / ${a}.total_amount ELSE 0 END)`;
}

/** 是否计为已支付订单（用于计数） */
function isPaidOrderExpr(alias = 'o') {
  return `${orderCol(alias, 'payment_status')} IN (${PAID_PAYMENT_SQL})`;
}

module.exports = {
  PAID_PAYMENT_SQL,
  netSalesExpr,
  refundedAmountExpr,
  orderNetRatioExpr,
  isPaidOrderExpr,
};

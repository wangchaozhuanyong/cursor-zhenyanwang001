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
 */
function netSalesExpr(alias = 'o') {
  const ps = orderCol(alias, 'payment_status');
  const total = orderCol(alias, 'total_amount');
  const refunded = orderCol(alias, 'refunded_amount');
  return `CASE
    WHEN ${ps} IN (${PAID_PAYMENT_SQL})
      THEN GREATEST(0, ${total} - COALESCE(${refunded}, 0))
    ELSE 0
  END`;
}

/** 累计退款金额 */
function refundedAmountExpr(alias = 'o') {
  return `COALESCE(${orderCol(alias, 'refunded_amount')}, 0)`;
}

/** 是否计为已支付订单（用于计数） */
function isPaidOrderExpr(alias = 'o') {
  return `${orderCol(alias, 'payment_status')} IN (${PAID_PAYMENT_SQL})`;
}

module.exports = {
  PAID_PAYMENT_SQL,
  netSalesExpr,
  refundedAmountExpr,
  isPaidOrderExpr,
};

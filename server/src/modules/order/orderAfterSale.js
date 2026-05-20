const { ORDER_STATUS, RETURN_STATUS } = require('../../constants/status');

/** 进行中的售后状态（与 return.repository countActiveReturnRequests 一致） */
const ACTIVE_RETURN_STATUS_LIST = Object.freeze([
  RETURN_STATUS.PENDING,
  RETURN_STATUS.NEED_EVIDENCE,
  RETURN_STATUS.APPROVED,
  RETURN_STATUS.PROCESSING,
  RETURN_STATUS.WAITING_RETURN,
  RETURN_STATUS.RETURN_IN_TRANSIT,
  RETURN_STATUS.RECEIVED,
  RETURN_STATUS.REFUND_PENDING,
  RETURN_STATUS.EXCHANGE_SHIPPING,
]);

const ACTIVE_RETURN_SQL_IN = ACTIVE_RETURN_STATUS_LIST.map(() => '?').join(', ');

/**
 * SQL 片段：订单是否属于「退款/售后」口径（履约退款中/已退款，或存在售后单）
 * @param {string} alias orders 表别名
 */
function orderAfterSalePredicate(alias = 'o') {
  return `(
    ${alias}.status IN (?, ?)
    OR EXISTS (
      SELECT 1 FROM return_requests rr
      WHERE rr.order_id = ${alias}.id
        AND rr.user_id = ${alias}.user_id
        AND rr.status IN (${ACTIVE_RETURN_SQL_IN})
    )
  )`;
}

const ORDER_REFUNDING_STATUSES = [ORDER_STATUS.REFUNDING, ORDER_STATUS.REFUNDED];

/** SQL 占位符绑定参数（先订单退款状态，再活跃售后状态） */
function orderAfterSaleParams() {
  return [...ORDER_REFUNDING_STATUSES, ...ACTIVE_RETURN_STATUS_LIST];
}

module.exports = {
  ACTIVE_RETURN_STATUS_LIST,
  ACTIVE_RETURN_SQL_IN,
  ORDER_REFUNDING_STATUSES,
  orderAfterSalePredicate,
  orderAfterSaleParams,
};

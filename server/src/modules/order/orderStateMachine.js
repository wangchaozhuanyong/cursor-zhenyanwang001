const { BusinessError } = require('../../errors/BusinessError');
const { ORDER_STATUS, PAYMENT_STATUS } = require('../../constants/status');

/**
 * 履约状态（orders.status）：下单后的业务流转，与支付解耦。
 * pending: 待确认付款/待处理（线下或线上未付）
 * paid: 已收款，待发货
 * shipped / completed / cancelled / refunding / refunded: 同原语义
 */
const FULFILLMENT_TRANSITIONS = {
  [ORDER_STATUS.PENDING]: [ORDER_STATUS.PAID, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.PAID]: [ORDER_STATUS.SHIPPED, ORDER_STATUS.REFUNDING, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.SHIPPED]: [ORDER_STATUS.COMPLETED, ORDER_STATUS.REFUNDING],
  [ORDER_STATUS.COMPLETED]: [ORDER_STATUS.REFUNDING],
  [ORDER_STATUS.REFUNDING]: [ORDER_STATUS.REFUNDED, ORDER_STATUS.SHIPPED, ORDER_STATUS.COMPLETED],
  [ORDER_STATUS.REFUNDED]: [],
  [ORDER_STATUS.CANCELLED]: [],
};

/**
 * 支付状态（orders.payment_status）合法迁移（系统/管理端）
 */
const PAYMENT_TRANSITIONS = {
  [PAYMENT_STATUS.PENDING]: [PAYMENT_STATUS.PAID, PAYMENT_STATUS.FAILED],
  [PAYMENT_STATUS.PAID]: [PAYMENT_STATUS.REFUNDED, PAYMENT_STATUS.PARTIALLY_REFUNDED, PAYMENT_STATUS.FAILED],
  [PAYMENT_STATUS.FAILED]: [PAYMENT_STATUS.PENDING, PAYMENT_STATUS.PAID],
  [PAYMENT_STATUS.REFUNDED]: [],
  [PAYMENT_STATUS.PARTIALLY_REFUNDED]: [PAYMENT_STATUS.REFUNDED, PAYMENT_STATUS.PAID],
};

/**
 * @param {string} from
 * @param {string} to
 * @throws {BusinessError}
 */
function assertFulfillmentTransition(from, to) {
  const allowed = FULFILLMENT_TRANSITIONS[from];
  if (!allowed || !allowed.includes(to)) {
    throw new BusinessError(400, `不能从履约状态「${from}」变更为「${to}」`);
  }
}

/**
 * 支付状态迁移校验（在履约变更联动或单独更新支付时使用）
 * @param {string} from
 * @param {string} to
 */
function assertPaymentTransition(from, to) {
  const allowed = PAYMENT_TRANSITIONS[from];
  if (!allowed || !allowed.includes(to)) {
    throw new BusinessError(400, `不能从支付状态「${from}」变更为「${to}」`);
  }
}

/**
 * 履约状态变更后，支付状态应如何联动（与 assertPaymentTransition 配合使用）
 * @param {string} fromFulfillment
 * @param {string} toFulfillment
 * @param {string} currentPayment
 * @returns {string}
 */
function paymentStatusAfterFulfillmentChange(fromFulfillment, toFulfillment, currentPayment) {
  if (toFulfillment === ORDER_STATUS.REFUNDED) return PAYMENT_STATUS.REFUNDED;
  if (toFulfillment === ORDER_STATUS.PAID && fromFulfillment === ORDER_STATUS.PENDING) return PAYMENT_STATUS.PAID;
  return currentPayment;
}

/**
 * 是否允许用户取消（未付款）
 * @param {{ status: string; payment_status?: string }} order
 */
function canUserCancel(order) {
  return order.status === ORDER_STATUS.PENDING
    && (order.payment_status || PAYMENT_STATUS.PENDING) === PAYMENT_STATUS.PENDING;
}

/**
 * 是否允许管理端发货
 * @param {{ status: string; payment_status?: string }} order
 */
function canShip(order) {
  return order.status === ORDER_STATUS.PAID
    && (order.payment_status || PAYMENT_STATUS.PENDING) === PAYMENT_STATUS.PAID;
}

module.exports = {
  assertFulfillmentTransition,
  assertPaymentTransition,
  paymentStatusAfterFulfillmentChange,
  canUserCancel,
  canShip,
  FULFILLMENT_TRANSITIONS,
  PAYMENT_TRANSITIONS,
};

const ORDER_STATUS = Object.freeze({
  PENDING: 'pending',
  PAID: 'paid',
  SHIPPED: 'shipped',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  REFUNDING: 'refunding',
  REFUNDED: 'refunded',
});

const PAYMENT_STATUS = Object.freeze({
  PENDING: 'pending',
  PAID: 'paid',
  FAILED: 'failed',
  REFUNDED: 'refunded',
  PARTIALLY_REFUNDED: 'partially_refunded',
});

const RETURN_STATUS = Object.freeze({
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
});

const REWARD_STATUS = Object.freeze({
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  PAID: 'paid',
  REVERSED: 'reversed',
});

const EXPORT_TASK_STATUS = Object.freeze({
  PENDING: 'pending',
  SUCCESS: 'success',
  FAILED: 'failed',
});

const ORDER_STATUS_LIST = Object.freeze(Object.values(ORDER_STATUS));
const PAYMENT_STATUS_LIST = Object.freeze(Object.values(PAYMENT_STATUS));
const RETURN_STATUS_LIST = Object.freeze(Object.values(RETURN_STATUS));
const REWARD_STATUS_LIST = Object.freeze(Object.values(REWARD_STATUS));
const EXPORT_TASK_STATUS_LIST = Object.freeze(Object.values(EXPORT_TASK_STATUS));

const PAID_PAYMENT_STATUS_LIST = Object.freeze([
  PAYMENT_STATUS.PAID,
  PAYMENT_STATUS.PARTIALLY_REFUNDED,
]);

module.exports = {
  ORDER_STATUS,
  PAYMENT_STATUS,
  RETURN_STATUS,
  REWARD_STATUS,
  EXPORT_TASK_STATUS,
  ORDER_STATUS_LIST,
  PAYMENT_STATUS_LIST,
  RETURN_STATUS_LIST,
  REWARD_STATUS_LIST,
  EXPORT_TASK_STATUS_LIST,
  PAID_PAYMENT_STATUS_LIST,
};

const SETTLE_TIMING_HINTS = {
  payment_success: '订单支付成功后，将按后台当前积分规则发放积分。',
  order_shipped: '订单发货后，将按后台当前积分规则发放积分。',
  order_completed: '订单完成后，将按后台当前积分规则发放积分。',
};

function getOrderPointsHint(settleTiming) {
  return SETTLE_TIMING_HINTS[settleTiming] || SETTLE_TIMING_HINTS.order_completed;
}

module.exports = {
  SETTLE_TIMING_HINTS,
  getOrderPointsHint,
};

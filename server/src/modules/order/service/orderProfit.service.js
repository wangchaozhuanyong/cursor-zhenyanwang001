const repo = require('../repository/order.repository');

function money(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

async function recomputeOrderProfitAmounts(q, orderId, options = {}) {
  const order = await repo.selectOrderByIdForUpdate(q, orderId);
  if (!order) return null;

  const shippingCostAmount = options.shippingCostAmount === undefined
    ? Number(order.shipping_cost_amount || 0)
    : Number(options.shippingCostAmount || 0);

  const paymentFeeAmount = options.paymentFeeAmount === undefined
    ? await repo.selectOrderPaymentFeeTotal(q, orderId)
    : Number(options.paymentFeeAmount || 0);

  const grossProfitAmount = Number(order.gross_profit_amount || 0);
  const shippingFee = Number(order.shipping_fee || 0);
  const netProfitAmount = money(grossProfitAmount + shippingFee - shippingCostAmount - paymentFeeAmount);

  await repo.updateOrderProfitAmounts(q, orderId, {
    shippingCostAmount,
    paymentFeeAmount,
    netProfitAmount,
  });

  return {
    order_id: orderId,
    shipping_cost_amount: money(shippingCostAmount),
    payment_fee_amount: money(paymentFeeAmount),
    net_profit_amount: netProfitAmount,
  };
}

module.exports = {
  recomputeOrderProfitAmounts,
};


const fixture = {
  orders: [
    { id: 'paid-100', status: 'paid', payment_status: 'paid', total_amount: 100, discount_amount: 0, refunded_amount: 0, goods_cost_amount: 60, shipping_fee: 0, shipping_cost_amount: 0, payment_fee_amount: 0 },
    { id: 'paid-200-discount', status: 'paid', payment_status: 'paid', total_amount: 200, discount_amount: 20, refunded_amount: 0, goods_cost_amount: 120, shipping_fee: 0, shipping_cost_amount: 0, payment_fee_amount: 0, coupon_id: 'coupon-1' },
    { id: 'unpaid-300', status: 'pending', payment_status: 'pending', total_amount: 300, discount_amount: 0, refunded_amount: 0, goods_cost_amount: 180, shipping_fee: 0, shipping_cost_amount: 0, payment_fee_amount: 0 },
    { id: 'cancelled-500', status: 'cancelled', payment_status: 'pending', total_amount: 500, discount_amount: 0, refunded_amount: 0, goods_cost_amount: 300, shipping_fee: 0, shipping_cost_amount: 0, payment_fee_amount: 0 },
    { id: 'partial-refund-50', status: 'paid', payment_status: 'partially_refunded', total_amount: 150, discount_amount: 0, refunded_amount: 50, goods_cost_amount: 80, shipping_fee: 0, shipping_cost_amount: 0, payment_fee_amount: 0 },
    { id: 'missing-cost', status: 'paid', payment_status: 'paid', total_amount: 80, discount_amount: 0, refunded_amount: 0, goods_cost_amount: null, shipping_fee: 0, shipping_cost_amount: 0, payment_fee_amount: 0 },
    { id: 'shipping-fee', status: 'paid', payment_status: 'paid', total_amount: 60, discount_amount: 0, refunded_amount: 0, goods_cost_amount: 35, shipping_fee: 8, shipping_cost_amount: 5, payment_fee_amount: 0 },
    { id: 'payment-fee', status: 'paid', payment_status: 'paid', total_amount: 40, discount_amount: 0, refunded_amount: 0, goods_cost_amount: 22, shipping_fee: 0, shipping_cost_amount: 0, payment_fee_amount: 2 },
  ],
  orderItems: [
    { order_id: 'paid-100', product_id: 'product-1', category_id: 'category-1', qty: 1 },
    { order_id: 'paid-200-discount', product_id: 'product-1', category_id: 'category-1', qty: 2 },
    { order_id: 'unpaid-300', product_id: 'product-1', category_id: 'category-1', qty: 3 },
    { order_id: 'cancelled-500', product_id: 'product-2', category_id: 'category-2', qty: 5 },
    { order_id: 'partial-refund-50', product_id: 'product-2', category_id: 'category-2', qty: 1 },
    { order_id: 'missing-cost', product_id: 'product-3', category_id: 'category-3', qty: 1, missing_cost: true },
    { order_id: 'shipping-fee', product_id: 'product-3', category_id: 'category-3', qty: 1 },
    { order_id: 'payment-fee', product_id: 'product-4', category_id: 'category-4', qty: 1 },
  ],
  coupons: [
    { id: 'coupon-1', claimed_count: 1, used_count: 1, expired_count: 0, discount_amount: 20, order_id: 'paid-200-discount' },
  ],
  operatingExpenses: [
    { id: 'expense-30', amount: 30 },
  ],
};

function isPaid(order) {
  return ['paid', 'partially_refunded'].includes(order.payment_status);
}

function isEffective(order) {
  return isPaid(order) && order.status !== 'cancelled';
}

function summarizeFixture(data = fixture) {
  const paidOrders = data.orders.filter(isPaid);
  const effectiveOrders = data.orders.filter(isEffective);
  const grossSales = paidOrders.reduce((sum, order) => sum + order.total_amount, 0);
  const refundAmount = paidOrders.reduce((sum, order) => sum + (order.refunded_amount || 0), 0);
  const discountAmount = paidOrders.reduce((sum, order) => sum + (order.discount_amount || 0), 0);
  const goodsCost = paidOrders.reduce((sum, order) => sum + (order.goods_cost_amount || 0), 0);
  const shippingIncome = paidOrders.reduce((sum, order) => sum + (order.shipping_fee || 0), 0);
  const shippingCost = paidOrders.reduce((sum, order) => sum + (order.shipping_cost_amount || 0), 0);
  const paymentFee = paidOrders.reduce((sum, order) => sum + (order.payment_fee_amount || 0), 0);
  const expenseAmount = data.operatingExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const netSales = grossSales - refundAmount;
  const grossProfit = grossSales - goodsCost;
  const netProfit = grossProfit + shippingIncome - shippingCost - paymentFee - refundAmount - expenseAmount;
  const paidOrderIds = new Set(effectiveOrders.map((order) => order.id));
  const salesQty = data.orderItems
    .filter((item) => paidOrderIds.has(item.order_id))
    .reduce((sum, item) => sum + item.qty, 0);

  return {
    paid_order_count: paidOrders.length,
    gross_sales: grossSales,
    net_sales: netSales,
    refund_amount: refundAmount,
    discount_amount: discountAmount,
    goods_cost_amount: goodsCost,
    gross_profit_amount: grossProfit,
    expense_amount: expenseAmount,
    net_profit_amount: netProfit,
    missing_cost_order_count: paidOrders.filter((order) => order.goods_cost_amount == null).length,
    sales_qty: salesQty,
  };
}

module.exports = {
  fixture,
  summarizeFixture,
  isPaid,
  isEffective,
};

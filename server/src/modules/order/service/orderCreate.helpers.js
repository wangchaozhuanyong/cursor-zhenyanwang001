const { ValidationError } = require('../../../errors');

function money(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function allocateOrderProfitSnapshot(orderItems, {
  rawAmount,
  discountAmount,
  pointsDiscountAmount,
  rewardCashDiscountAmount,
  shippingFee,
}) {
  const goodsDiscountTotal = money(
    Number(discountAmount || 0)
    + Number(pointsDiscountAmount || 0)
    + Number(rewardCashDiscountAmount || 0),
  );
  const baseAmount = money(rawAmount || orderItems.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.qty || 0), 0));
  let allocated = 0;
  let goodsCostAmount = 0;
  let goodsNetSalesAmount = 0;
  let grossProfitAmount = 0;

  const items = orderItems.map((item, index) => {
    const lineSubtotal = money(Number(item.price || 0) * Number(item.qty || 0));
    const discountAllocated = baseAmount > 0
      ? (index === orderItems.length - 1
        ? money(goodsDiscountTotal - allocated)
        : money(goodsDiscountTotal * lineSubtotal / baseAmount))
      : 0;
    allocated = money(allocated + discountAllocated);
    const unitCostPrice = money(item.unitCostPrice || 0);
    const costAmount = money(unitCostPrice * Number(item.qty || 0));
    const netSalesAmount = money(Math.max(0, lineSubtotal - discountAllocated));
    const grossProfit = money(netSalesAmount - costAmount);
    const source = unitCostPrice > 0 ? 'sku_cost' : 'missing';
    goodsCostAmount = money(goodsCostAmount + costAmount);
    goodsNetSalesAmount = money(goodsNetSalesAmount + netSalesAmount);
    grossProfitAmount = money(grossProfitAmount + grossProfit);
    return {
      ...item,
      discountAllocated,
      unitCostPrice,
      costAmount,
      netSalesAmount,
      grossProfitAmount: grossProfit,
      costSnapshotSource: source,
    };
  });

  return {
    items,
    summary: {
      goodsCostAmount,
      goodsNetSalesAmount,
      grossProfitAmount,
      shippingCostAmount: 0,
      paymentFeeAmount: 0,
      netProfitAmount: money(grossProfitAmount + Number(shippingFee || 0)),
    },
  };
}

function normalizeMalaysiaAddress(address, contactName, contactPhone) {
  if (address && typeof address === 'object') {
    const line1 = String(address.line1 || '').trim();
    const city = String(address.city || '').trim();
    const state = String(address.state || '').trim();
    const postcode = String(address.postcode || '').trim();
    if (!line1 || !city || !state || !postcode) {
      throw new ValidationError('请填写完整的马来西亚收货地址：地址、城市、州属和邮编');
    }
    return {
      text: [
        address.recipient_name || contactName,
        address.phone || contactPhone,
        line1,
        address.line2,
        city,
        state,
        postcode,
        'MY',
      ].filter(Boolean).join(', '),
      line1,
      line2: String(address.line2 || '').trim(),
      city,
      state,
      postcode,
      country: 'MY',
    };
  }
  const text = String(address || '').trim();
  return {
    text,
    line1: text,
    line2: '',
    city: '',
    state: '',
    postcode: '',
    country: 'MY',
  };
}

module.exports = {
  money,
  allocateOrderProfitSnapshot,
  normalizeMalaysiaAddress,
};

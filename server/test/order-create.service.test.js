const { test } = require('node:test');
const assert = require('node:assert/strict');
const { buildOrderLineItems } = require('../src/modules/order/service/orderCreate.service');
const { allocateOrderProfitSnapshot } = require('../src/modules/order/service/orderCreate.helpers');

test('buildOrderLineItems sums line subtotals', () => {
  const productMap = {
    p1: { id: 'p1', name: 'Apple', price: 10, cover_image: '', points: 0 },
  };
  const variant = { id: 'v1', product_id: 'p1', price: 12, sku_code: 'SKU1', title: 'Large' };
  const result = buildOrderLineItems(
    [{ product_id: 'p1', variant_id: 'v1', qty: 2 }],
    {
      productMap,
      variantById: new Map([['v1', variant]]),
      defaultVariantByProductId: new Map(),
      specMap: new Map([['v1', []]]),
      activityMap: new Map(),
    },
  );
  assert.equal(result.rawAmount, 24);
  assert.equal(result.orderItems.length, 1);
  assert.equal(result.orderItems[0].price, 12);
});

test('allocateOrderProfitSnapshot allocates discount to lines', () => {
  const snapshot = allocateOrderProfitSnapshot(
    [{ price: 100, qty: 1, unitCostPrice: 40 }],
    {
      rawAmount: 100,
      discountAmount: 10,
      pointsDiscountAmount: 0,
      rewardCashDiscountAmount: 0,
      shippingFee: 5,
    },
  );
  assert.equal(snapshot.items[0].discountAllocated, 10);
  assert.equal(snapshot.summary.netProfitAmount, 55);
});

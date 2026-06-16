const { test } = require('node:test');
const assert = require('node:assert/strict');

const pricing = require('../src/modules/order/order.pricing');
const userModule = require('../src/modules/user');

test('product scoped coupon threshold and discount use only eligible subtotal', () => {
  const original = {
    buildEffectiveCoupon: userModule.api.buildEffectiveCoupon,
    resolveUserCouponRuntimeStatus: userModule.api.resolveUserCouponRuntimeStatus,
  };

  try {
    userModule.api.buildEffectiveCoupon = (uc) => uc;
    userModule.api.resolveUserCouponRuntimeStatus = () => 'available';

    const discount = pricing.assertCouponUsableOnOrder({
      uc: {
        status: 'available',
        type: 'fixed',
        value: 50,
        min_amount: 100,
        usable_scope_type: 'product',
        usable_product_ids: JSON.stringify(['p1']),
      },
      rawAmount: 300,
      fullReductionDiscount: 0,
      goodsAmountAfterFullReduction: 300,
      shippingFee: 0,
      orderItems: [
        { productId: 'p1', price: 120, qty: 1 },
        { productId: 'p2', price: 180, qty: 1 },
      ],
      productMap: {
        p1: { category_id: 'c1' },
        p2: { category_id: 'c2' },
      },
      hasActivityDiscount: false,
      activityAllowsCoupon: true,
    });

    assert.equal(discount, 50);
  } finally {
    userModule.api.buildEffectiveCoupon = original.buildEffectiveCoupon;
    userModule.api.resolveUserCouponRuntimeStatus = original.resolveUserCouponRuntimeStatus;
  }
});

test('product scoped coupon cannot use non-eligible items to meet threshold', () => {
  const original = {
    buildEffectiveCoupon: userModule.api.buildEffectiveCoupon,
    resolveUserCouponRuntimeStatus: userModule.api.resolveUserCouponRuntimeStatus,
  };

  try {
    userModule.api.buildEffectiveCoupon = (uc) => uc;
    userModule.api.resolveUserCouponRuntimeStatus = () => 'available';

    assert.throws(() => pricing.assertCouponUsableOnOrder({
        uc: {
          status: 'available',
          type: 'fixed',
          value: 50,
          min_amount: 100,
          usable_scope_type: 'product',
          usable_product_ids: JSON.stringify(['p1']),
        },
        rawAmount: 300,
        fullReductionDiscount: 0,
        goodsAmountAfterFullReduction: 300,
        shippingFee: 0,
        orderItems: [
          { productId: 'p1', price: 80, qty: 1 },
          { productId: 'p2', price: 220, qty: 1 },
        ],
        productMap: {
          p1: { category_id: 'c1' },
          p2: { category_id: 'c2' },
        },
        hasActivityDiscount: false,
        activityAllowsCoupon: true,
      }));
  } finally {
    userModule.api.buildEffectiveCoupon = original.buildEffectiveCoupon;
    userModule.api.resolveUserCouponRuntimeStatus = original.resolveUserCouponRuntimeStatus;
  }
});

test('full discount promotion contributes to full reduction compatible discount total and lines', () => {
  const result = pricing.computeFullPromotionDiscounts(
    [
      { productId: 'p1', price: 120, qty: 1 },
      { productId: 'p2', price: 80, qty: 1 },
    ],
    {
      p1: { category_id: 'c1' },
      p2: { category_id: 'c2' },
    },
    [{
      activity_id: 'fd-1',
      title: '满100打9折',
      type: 'full_discount',
      scope_type: 'product',
      scopes: [{ scope_type: 'product', scope_id: 'p1' }],
      activity_config: JSON.stringify({
        full_discount_rules: [{ threshold_amount: 100, discount_percent: 90 }],
      }),
    }],
  );

  assert.equal(result.total, 12);
  assert.equal(pricing.computeFullReductionDiscount(
    [{ productId: 'p1', price: 120, qty: 1 }],
    { p1: { category_id: 'c1' } },
    [{
      activity_id: 'fd-1',
      type: 'full_discount',
      scope_type: 'all',
      activity_config: { full_discount_rules: [{ threshold_amount: 100, discount_rate: 0.9 }] },
    }],
  ), 12);
  assert.equal(result.lines[0].type, 'full_discount');
  assert.equal(result.lines[0].amount, 12);
});

test('member price promotion discounts scoped items for matching member level', () => {
  const result = pricing.computeMemberPriceDiscounts(
    [
      { productId: 'p1', price: 100, qty: 1 },
      { productId: 'p2', price: 80, qty: 1 },
    ],
    {
      p1: { category_id: 'c1' },
      p2: { category_id: 'c2' },
    },
    [{
      activity_id: 'mp-1',
      title: 'VIP 会员价',
      type: 'member_price',
      scope_type: 'product',
      scopes: [{ scope_type: 'product', scope_id: 'p1' }],
      activity_config: {
        member_price_rules: [{ discount_percent: 90, min_order_amount: 0, member_level_ids: ['vip'] }],
      },
    }],
    { id: 'vip', name: 'VIP' },
    { rawAmount: 180, priorGoodsDiscount: 0 },
  );

  assert.equal(result.total, 10);
  assert.equal(result.lines[0].type, 'member_price');
  assert.equal(result.lines[0].promotion_id, 'mp-1');
  assert.equal(result.lines[0].discount_percent, 90);
});

test('member price promotion ignores non-matching member levels', () => {
  const result = pricing.computeMemberPriceDiscounts(
    [{ productId: 'p1', price: 100, qty: 1 }],
    { p1: { category_id: 'c1' } },
    [{
      activity_id: 'mp-1',
      type: 'member_price',
      scope_type: 'all',
      activity_config: {
        member_price_rules: [{ discount_percent: 90, member_level_ids: ['vip'] }],
      },
    }],
    { id: 'normal', name: '普通会员' },
    { rawAmount: 100, priorGoodsDiscount: 0 },
  );

  assert.equal(result.total, 0);
  assert.equal(result.lines.length, 0);
});

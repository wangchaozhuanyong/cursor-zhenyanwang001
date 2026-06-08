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

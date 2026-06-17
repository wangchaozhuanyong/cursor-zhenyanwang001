const { test } = require('node:test');
const assert = require('node:assert/strict');
const orderCheckout = require('../src/modules/order/service/orderCheckout.service');

test('couponUnavailableReason maps runtime coupon status', () => {
  const userModule = require('../src/modules/user');
  const original = userModule.api?.resolveUserCouponRuntimeStatus;
  try {
    userModule.api.resolveUserCouponRuntimeStatus = (row) => row.status;
    assert.equal(orderCheckout.couponUnavailableReason({ status: 'expired' }), '优惠券已过期');
    assert.equal(orderCheckout.couponUnavailableReason({ status: 'active' }), '');
  } finally {
    if (original) userModule.api.resolveUserCouponRuntimeStatus = original;
  }
});

test('assertOrderCapabilityUsage rejects points when capability disabled', async () => {
  const siteCapabilities = require('../src/modules/siteCapabilities');
  const original = siteCapabilities.api?.isCapabilityEnabled;
  try {
    siteCapabilities.api.isCapabilityEnabled = async (key) => key !== 'pointsEnabled';
    await assert.rejects(
      () => orderCheckout.assertOrderCapabilityUsage({ use_points: true }),
      (err) => err.message.includes('积分'),
    );
  } finally {
    if (original) siteCapabilities.api.isCapabilityEnabled = original;
  }
});

test('loadCheckoutCouponRows scans beyond the first 100 coupons and reports cap', async () => {
  const userModule = require('../src/modules/user');
  const original = userModule.api?.selectCheckoutCandidateUserCoupons;
  const previousLimit = process.env.CHECKOUT_COUPON_SCAN_LIMIT;

  try {
    process.env.CHECKOUT_COUPON_SCAN_LIMIT = '150';
    userModule.api.selectCheckoutCandidateUserCoupons = async (_userId, limit) => {
      assert.equal(limit, 151);
      return Array.from({ length: 151 }, (_, index) => ({ id: `uc-${index}` }));
    };

    const result = await orderCheckout.loadCheckoutCouponRows('user-1');

    assert.equal(result.rows.length, 150);
    assert.equal(result.hasMore, true);
  } finally {
    if (original) userModule.api.selectCheckoutCandidateUserCoupons = original;
    if (previousLimit === undefined) delete process.env.CHECKOUT_COUPON_SCAN_LIMIT;
    else process.env.CHECKOUT_COUPON_SCAN_LIMIT = previousLimit;
  }
});

test('loadCheckoutCouponRows uses checkout-only candidate query', async () => {
  const userModule = require('../src/modules/user');
  const originalCandidate = userModule.api?.selectCheckoutCandidateUserCoupons;
  const originalPage = userModule.api?.selectUserCouponsPage;

  try {
    let calledCandidate = false;
    userModule.api.selectCheckoutCandidateUserCoupons = async () => {
      calledCandidate = true;
      return [{ id: 'active-candidate' }];
    };
    userModule.api.selectUserCouponsPage = async () => {
      throw new Error('checkout must not scan all user coupons');
    };

    const result = await orderCheckout.loadCheckoutCouponRows('user-1');

    assert.equal(calledCandidate, true);
    assert.deepEqual(result.rows.map((row) => row.id), ['active-candidate']);
  } finally {
    if (originalCandidate) userModule.api.selectCheckoutCandidateUserCoupons = originalCandidate;
    if (originalPage) userModule.api.selectUserCouponsPage = originalPage;
  }
});

test('previewOrder exposes pricing engine version and backend order snapshot', async () => {
  const siteCapabilitiesPublicApi = require('../src/modules/siteCapabilities/publicApi');
  const pricingService = require('../src/modules/order/service/pricing.service');
  const originalCapability = siteCapabilitiesPublicApi.isCapabilityEnabled;
  const originalPricing = pricingService.buildCheckoutPricing;

  try {
    siteCapabilitiesPublicApi.isCapabilityEnabled = async () => true;
    pricingService.buildCheckoutPricing = async () => ({
      rawAmount: 100,
      flashSaleDiscount: 0,
      fullReductionDiscount: 10,
      couponDiscount: 5,
      discountAmount: 15,
      shippingFee: 7,
      finalTotal: 92,
      totalPoints: 9,
      discount_lines: [{ type: 'full_reduction', label: '满减优惠', amount: 10 }],
      points_bonus_lines: [],
      loyalty: { earned_points: 9 },
      pricing_engine_version: 'pricing_v2_test',
      source: 'order_pricing_compat',
      promotion_evaluation: {
        engine_version: 'promotion_engine_v2_test',
        order_snapshot: {
          goods_amount: 100,
          total_discount_amount: 15,
          shipping_fee: 7,
          final_amount: 92,
        },
      },
      taxSnap: null,
    });

    const result = await orderCheckout.previewOrder('u1', {
      items: [{ product_id: 'p1', qty: 1 }],
      payment_method: 'online',
    });

    assert.equal(result.data.pricing_engine_version, 'pricing_v2_test');
    assert.equal(result.data.pricing_engine_source, 'order_pricing_compat');
    assert.equal(result.data.promotion_engine_version, 'promotion_engine_v2_test');
    assert.equal(result.data.order_snapshot.final_amount, 92);
  } finally {
    siteCapabilitiesPublicApi.isCapabilityEnabled = originalCapability;
    pricingService.buildCheckoutPricing = originalPricing;
  }
});

test('previewOrder rejects ineligible promotion evaluation before exposing invalid totals', async () => {
  const siteCapabilitiesPublicApi = require('../src/modules/siteCapabilities/publicApi');
  const pricingService = require('../src/modules/order/service/pricing.service');
  const originalCapability = siteCapabilitiesPublicApi.isCapabilityEnabled;
  const originalPricing = pricingService.buildCheckoutPricing;

  try {
    siteCapabilitiesPublicApi.isCapabilityEnabled = async () => true;
    pricingService.buildCheckoutPricing = async () => ({
      rawAmount: 312,
      discountAmount: 106.1,
      shippingFee: 5.5,
      finalTotal: 211.4,
      discount_lines: [{ type: 'flash_sale', label: 'V10 秒杀测试活动', amount: 51 }],
      promotion_evaluation: {
        eligible: false,
        unavailable_reasons: [
          {
            promotion_id: 'promo-flash',
            title: 'V10 秒杀测试活动',
            reason: '该活动不可与其他活动叠加',
            blocking: true,
          },
        ],
      },
    });

    await assert.rejects(
      () => orderCheckout.previewOrder('u1', {
        items: [{ product_id: 'p1', qty: 1 }],
        payment_method: 'online',
      }),
      (err) => err.name === 'ValidationError'
        && err.message.includes('V10 秒杀测试活动')
        && err.message.includes('不可与其他活动叠加'),
    );
  } finally {
    siteCapabilitiesPublicApi.isCapabilityEnabled = originalCapability;
    pricingService.buildCheckoutPricing = originalPricing;
  }
});

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
  const original = userModule.api?.selectUserCouponsPage;
  const previousLimit = process.env.CHECKOUT_COUPON_SCAN_LIMIT;

  try {
    process.env.CHECKOUT_COUPON_SCAN_LIMIT = '150';
    userModule.api.selectUserCouponsPage = async (_userId, _status, limit, offset) => {
      assert.equal(limit, 100);
      return Array.from({ length: 100 }, (_, index) => ({ id: `uc-${offset + index}` }));
    };

    const result = await orderCheckout.loadCheckoutCouponRows('user-1');

    assert.equal(result.rows.length, 200);
    assert.equal(result.hasMore, true);
  } finally {
    if (original) userModule.api.selectUserCouponsPage = original;
    if (previousLimit === undefined) delete process.env.CHECKOUT_COUPON_SCAN_LIMIT;
    else process.env.CHECKOUT_COUPON_SCAN_LIMIT = previousLimit;
  }
});

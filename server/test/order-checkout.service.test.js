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

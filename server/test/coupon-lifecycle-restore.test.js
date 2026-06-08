const { test } = require('node:test');
const assert = require('node:assert/strict');

const lifecycle = require('../src/modules/user/service/couponLifecycle.service');
const couponRepo = require('../src/modules/user/repository/coupon.repository');

test('restoreCouponAfterOrderCancelled restores only current order coupon and decrements used count', async () => {
  const original = {
    selectUserCouponForRestore: couponRepo.selectUserCouponForRestore,
    updateUserCouponAfterRestore: couponRepo.updateUserCouponAfterRestore,
    decrementUsedCount: couponRepo.decrementUsedCount,
    insertCouponEvent: couponRepo.insertCouponEvent,
  };
  const calls = [];

  try {
    couponRepo.selectUserCouponForRestore = async () => ({
      id: 'uc-1',
      coupon_id: 'coupon-1',
      user_id: 'user-1',
      status: 'used',
      order_id: 'order-1',
      order_no: 'NO1',
      valid_from: '2026-01-01 00:00:00',
      valid_until: '2099-01-01 00:00:00',
    });
    couponRepo.updateUserCouponAfterRestore = async (_q, id, status) => calls.push(['restore', id, status]);
    couponRepo.decrementUsedCount = async (_q, couponId) => calls.push(['decrement', couponId]);
    couponRepo.insertCouponEvent = async (_q, event) => calls.push(['event', event.eventType, event.orderId]);

    const result = await lifecycle.restoreCouponAfterOrderCancelled({}, 'uc-1', {
      orderId: 'order-1',
      orderNo: 'NO1',
      reason: 'order cancel',
    });

    assert.deepEqual(result, { restored: true, status: 'available' });
    assert.deepEqual(calls, [
      ['restore', 'uc-1', 'available'],
      ['decrement', 'coupon-1'],
      ['event', 'returned', 'order-1'],
    ]);
  } finally {
    couponRepo.selectUserCouponForRestore = original.selectUserCouponForRestore;
    couponRepo.updateUserCouponAfterRestore = original.updateUserCouponAfterRestore;
    couponRepo.decrementUsedCount = original.decrementUsedCount;
    couponRepo.insertCouponEvent = original.insertCouponEvent;
  }
});

test('restoreCouponAfterOrderCancelled rejects coupon linked to another order', async () => {
  const original = couponRepo.selectUserCouponForRestore;

  try {
    couponRepo.selectUserCouponForRestore = async () => ({
      id: 'uc-1',
      coupon_id: 'coupon-1',
      user_id: 'user-1',
      status: 'used',
      order_id: 'other-order',
      valid_until: '2099-01-01 00:00:00',
    });

    await assert.rejects(
      () => lifecycle.restoreCouponAfterOrderCancelled({}, 'uc-1', { orderId: 'order-1' }),
      /当前取消订单/,
    );
  } finally {
    couponRepo.selectUserCouponForRestore = original;
  }
});

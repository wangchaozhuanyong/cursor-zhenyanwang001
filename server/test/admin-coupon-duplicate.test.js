const { test } = require('node:test');
const assert = require('node:assert/strict');

const couponService = require('../src/modules/admin/service/adminCoupon.service');
const couponRepo = require('../src/modules/admin/repository/adminCoupon.repository');
const { BusinessError } = require('../src/errors/BusinessError');

test('admin coupon create rejects duplicate coupon code before insert', async () => {
  const original = {
    selectCouponByCode: couponRepo.selectCouponByCode,
    insertCoupon: couponRepo.insertCoupon,
  };
  let insertCalled = false;

  couponRepo.selectCouponByCode = async (code) => ({
    id: 'existing-coupon',
    code,
    title: 'Existing coupon',
  });
  couponRepo.insertCoupon = async () => {
    insertCalled = true;
  };

  try {
    await assert.rejects(
      () => couponService.createCoupon({
        code: '001',
        title: 'Test coupon',
        type: 'fixed',
        value: 5,
        min_amount: 0,
      }),
      (err) => {
        assert.ok(err instanceof BusinessError);
        assert.equal(err.statusCode, 409);
        assert.equal(err.message, '优惠券编码已存在，请换一个编码');
        return true;
      },
    );
    assert.equal(insertCalled, false);
  } finally {
    couponRepo.selectCouponByCode = original.selectCouponByCode;
    couponRepo.insertCoupon = original.insertCoupon;
  }
});

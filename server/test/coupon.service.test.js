const { test } = require('node:test');
const assert = require('node:assert/strict');

const couponService = require('../src/modules/user/service/coupon.service');
const couponRepo = require('../src/modules/user/repository/coupon.repository');
const memberLevelService = require('../src/modules/user/service/memberLevel.service');

test('getAvailableCoupons only returns coupons currently claimable by the user', async () => {
  const original = {
    selectAvailableCoupons: couponRepo.selectAvailableCoupons,
    selectUserCouponClaimCounts: couponRepo.selectUserCouponClaimCounts,
    selectUserOrderCount: couponRepo.selectUserOrderCount,
    getUserMemberLevel: memberLevelService.getUserMemberLevel,
  };

  try {
    couponRepo.selectAvailableCoupons = async () => [
      { id: 'welcome', code: 'WELCOME', title: '新用户券', type: 'fixed', value: 10, min_amount: 0, status: 'available', per_user_limit: 1, new_user_only: 1 },
      { id: 'member', code: 'MEMBER', title: '会员券', type: 'fixed', value: 20, min_amount: 0, status: 'available', per_user_limit: 1, member_only: 1 },
      { id: 'auto', code: 'AUTO', title: '自动发放券', type: 'fixed', value: 5, min_amount: 0, status: 'available', per_user_limit: 1, auto_issue: 1 },
      { id: 'limited', code: 'LIMITED', title: '已达上限券', type: 'fixed', value: 5, min_amount: 0, status: 'available', per_user_limit: 1 },
      { id: 'public', code: 'PUBLIC', title: '通用券', type: 'fixed', value: 8, min_amount: 0, status: 'available', per_user_limit: 1 },
    ];
    couponRepo.selectUserCouponClaimCounts = async () => [{ coupon_id: 'limited', cnt: 1 }];
    couponRepo.selectUserOrderCount = async () => 2;
    memberLevelService.getUserMemberLevel = async () => ({ level: null });

    const list = await couponService.getAvailableCoupons('user-1');

    assert.deepEqual(list.map((row) => row.coupon.id), ['public']);
  } finally {
    couponRepo.selectAvailableCoupons = original.selectAvailableCoupons;
    couponRepo.selectUserCouponClaimCounts = original.selectUserCouponClaimCounts;
    couponRepo.selectUserOrderCount = original.selectUserOrderCount;
    memberLevelService.getUserMemberLevel = original.getUserMemberLevel;
  }
});

test('member_only coupons exclude users with only default member level', async () => {
  const original = {
    selectAvailableCoupons: couponRepo.selectAvailableCoupons,
    selectUserCouponClaimCounts: couponRepo.selectUserCouponClaimCounts,
    getUserMemberLevel: memberLevelService.getUserMemberLevel,
  };

  try {
    couponRepo.selectAvailableCoupons = async () => [
      { id: 'member', code: 'MEMBER', title: '会员券', type: 'fixed', value: 20, min_amount: 0, status: 'available', per_user_limit: 1, member_only: 1 },
      { id: 'public', code: 'PUBLIC', title: '通用券', type: 'fixed', value: 8, min_amount: 0, status: 'available', per_user_limit: 1 },
    ];
    couponRepo.selectUserCouponClaimCounts = async () => [];
    memberLevelService.getUserMemberLevel = async () => ({
      level: { id: 'default-level', is_default: true },
    });

    const list = await couponService.getAvailableCoupons('user-1');

    assert.deepEqual(list.map((row) => row.coupon.id), ['public']);
  } finally {
    couponRepo.selectAvailableCoupons = original.selectAvailableCoupons;
    couponRepo.selectUserCouponClaimCounts = original.selectUserCouponClaimCounts;
    memberLevelService.getUserMemberLevel = original.getUserMemberLevel;
  }
});

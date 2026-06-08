const { test } = require('node:test');
const assert = require('node:assert/strict');

const couponService = require('../src/modules/user/service/coupon.service');
const couponLifecycle = require('../src/modules/user/service/couponLifecycle.service');
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

test('guest coupon center still shows audience-limited coupons for login-first claim', async () => {
  const original = {
    selectAvailableCoupons: couponRepo.selectAvailableCoupons,
    selectAvailableCouponsByDisplayPositions: couponRepo.selectAvailableCouponsByDisplayPositions,
  };

  try {
    couponRepo.selectAvailableCoupons = async () => [
      { id: 'welcome', code: 'WELCOME', title: '新用户券', type: 'fixed', value: 10, min_amount: 0, status: 'available', per_user_limit: 1, new_user_only: 1 },
      { id: 'member', code: 'MEMBER', title: '会员券', type: 'fixed', value: 20, min_amount: 0, status: 'available', per_user_limit: 1, member_only: 1 },
      { id: 'auto', code: 'AUTO', title: '自动发放券', type: 'fixed', value: 5, min_amount: 0, status: 'available', per_user_limit: 1, auto_issue: 1 },
      { id: 'public', code: 'PUBLIC', title: '通用券', type: 'fixed', value: 8, min_amount: 0, status: 'available', per_user_limit: 1 },
    ];
    couponRepo.selectAvailableCouponsByDisplayPositions = async () => [];

    const list = await couponService.getAvailableCoupons(null);

    assert.deepEqual(list.map((row) => row.coupon.id), ['welcome', 'member', 'public']);
  } finally {
    couponRepo.selectAvailableCoupons = original.selectAvailableCoupons;
    couponRepo.selectAvailableCouponsByDisplayPositions = original.selectAvailableCouponsByDisplayPositions;
  }
});

test('coupon center includes coupons configured for storefront coupon display positions', async () => {
  const original = {
    selectAvailableCoupons: couponRepo.selectAvailableCoupons,
    selectAvailableCouponsByDisplayPositions: couponRepo.selectAvailableCouponsByDisplayPositions,
  };

  try {
    couponRepo.selectAvailableCoupons = async () => [];
    couponRepo.selectAvailableCouponsByDisplayPositions = async (positions) => {
      assert.deepEqual(positions, ['home_coupon_zone', 'home_coupon_center', 'home_new_user_gift']);
      return [
        { id: 'display-coupon', code: 'DISPLAY', title: '展示位礼券', type: 'fixed', value: 20, min_amount: 100, status: 'available', per_user_limit: 1, new_user_only: 1 },
      ];
    };

    const center = await couponService.getCouponCenter(null);

    assert.equal(center.claimable_count, 1);
    assert.deepEqual(center.claimable_coupons.map((row) => row.coupon.id), ['display-coupon']);
  } finally {
    couponRepo.selectAvailableCoupons = original.selectAvailableCoupons;
    couponRepo.selectAvailableCouponsByDisplayPositions = original.selectAvailableCouponsByDisplayPositions;
  }
});

test('coupon center hides ended vouchers from claimable list', async () => {
  const original = {
    selectAvailableCoupons: couponRepo.selectAvailableCoupons,
    selectAvailableCouponsByDisplayPositions: couponRepo.selectAvailableCouponsByDisplayPositions,
    selectUserCouponClaimCounts: couponRepo.selectUserCouponClaimCounts,
    countUserCoupons: couponRepo.countUserCoupons,
    selectUserCouponsPage: couponRepo.selectUserCouponsPage,
  };

  try {
    couponRepo.selectAvailableCoupons = async () => [
      { id: 'ended', code: 'ENDED', title: '已结束礼券', type: 'fixed', value: 10, min_amount: 0, status: 'available', per_user_limit: 1, campaign_end_at: '2026-01-01 00:00:00' },
      { id: 'active', code: 'ACTIVE', title: '进行中礼券', type: 'fixed', value: 10, min_amount: 0, status: 'available', per_user_limit: 1, campaign_end_at: '2099-01-01 00:00:00' },
    ];
    couponRepo.selectAvailableCouponsByDisplayPositions = async () => [];
    couponRepo.selectUserCouponClaimCounts = async () => [];
    couponRepo.countUserCoupons = async () => 0;
    couponRepo.selectUserCouponsPage = async () => [];

    const center = await couponService.getCouponCenter('user-1');

    assert.deepEqual(center.claimable_coupons.map((row) => row.coupon.id), ['active']);
    assert.equal(center.usable_count, 0);
  } finally {
    couponRepo.selectAvailableCoupons = original.selectAvailableCoupons;
    couponRepo.selectAvailableCouponsByDisplayPositions = original.selectAvailableCouponsByDisplayPositions;
    couponRepo.selectUserCouponClaimCounts = original.selectUserCouponClaimCounts;
    couponRepo.countUserCoupons = original.countUserCoupons;
    couponRepo.selectUserCouponsPage = original.selectUserCouponsPage;
  }
});

test('getUserCoupons honors requested status and falls back invalid status to available', async () => {
  const original = {
    countUserCoupons: couponRepo.countUserCoupons,
    selectUserCouponsPage: couponRepo.selectUserCouponsPage,
  };
  const calls = [];

  try {
    couponRepo.countUserCoupons = async (_userId, status) => {
      calls.push(['count', status]);
      return 0;
    };
    couponRepo.selectUserCouponsPage = async (_userId, status) => {
      calls.push(['list', status]);
      return [];
    };

    await couponService.getUserCoupons('user-1', { status: 'used' });
    await couponService.getUserCoupons('user-1', { status: 'bad-status' });

    assert.deepEqual(calls, [
      ['count', 'used'],
      ['list', 'used'],
      ['count', 'available'],
      ['list', 'available'],
    ]);
  } finally {
    couponRepo.countUserCoupons = original.countUserCoupons;
    couponRepo.selectUserCouponsPage = original.selectUserCouponsPage;
  }
});

test('claimed voucher validity is clamped by campaign end unless post-end days are configured', () => {
  const now = new Date('2026-06-01T00:00:00Z');
  const base = {
    validity_mode: 'absolute',
    use_start_at: '2026-06-01 00:00:00',
    use_end_at: '2026-06-30 23:59:59',
    campaign_end_at: '2026-06-10 23:59:59',
  };

  const defaultValidity = couponLifecycle.resolveUserCouponValidity({ ...base, post_end_valid_days: 0 }, now);
  const extendedValidity = couponLifecycle.resolveUserCouponValidity({ ...base, post_end_valid_days: 3 }, now);

  assert.equal(defaultValidity.validUntil.toISOString().slice(0, 10), '2026-06-10');
  assert.equal(extendedValidity.validUntil.toISOString().slice(0, 10), '2026-06-13');
});

test('coupon campaign datetime is interpreted as Malaysia time', () => {
  const campaignEnd = couponLifecycle.couponDateOrNull('2026-06-07 23:59:59', 'endOfDay');
  assert.equal(campaignEnd.toISOString(), '2026-06-07T15:59:59.000Z');

  const dateOnlyEnd = couponLifecycle.couponDateOrNull('2026-06-07', 'endOfDay');
  assert.equal(dateOnlyEnd.toISOString(), '2026-06-07T15:59:59.000Z');

  const validity = couponLifecycle.resolveUserCouponValidity({
    validity_mode: 'absolute',
    use_end_at: '2026-06-30 23:59:59',
    campaign_end_at: '2026-06-07 23:59:59',
    post_end_valid_days: 0,
  }, new Date('2026-06-01T00:00:00.000Z'));

  assert.equal(validity.validUntil.toISOString(), '2026-06-07T15:59:59.000Z');
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

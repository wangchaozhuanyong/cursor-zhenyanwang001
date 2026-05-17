const { generateId } = require('../../utils/helpers');
const marketingRepo = require('./marketing.repository');
const couponRepo = require('../user/coupon.repository');

async function issueCouponIfEligible(userId, coupon) {
  const existing = await couponRepo.findUserCoupon(userId, coupon.id);
  if (existing) return { skipped: true, reason: 'already_claimed' };

  const perUserLimit = Math.max(1, Number(coupon.per_user_limit || 1));
  const userClaims = await couponRepo.countUserClaimsForCoupon(userId, coupon.id);
  if (userClaims >= perUserLimit) return { skipped: true, reason: 'per_user_limit' };

  const totalQty = Number(coupon.total_quantity || 0);
  if (totalQty > 0) {
    const totalClaims = await couponRepo.countTotalClaimsForCoupon(coupon.id);
    if (totalClaims >= totalQty) return { skipped: true, reason: 'sold_out' };
  }

  const id = generateId();
  await couponRepo.insertUserCoupon(id, userId, coupon.id);
  return { issued: true, userCouponId: id, couponId: coupon.id };
}

/**
 * 注册成功后发放新人礼包（关联 coupons 表，不重复创建券规则）
 */
async function issueNewUserGiftPack(userId) {
  const activities = await marketingRepo.selectActivitiesByPosition('home_new_user_gift', ['new_user_gift']);
  const issued = [];
  for (const activity of activities) {
    const couponIds = Array.isArray(activity.activity_config?.coupon_ids)
      ? activity.activity_config.coupon_ids
      : [];
    if (!couponIds.length) continue;
    const coupons = await marketingRepo.selectCouponsByIds(couponIds);
    for (const coupon of coupons) {
      const r = await issueCouponIfEligible(userId, coupon);
      if (r.issued) {
        issued.push({ activity_id: activity.id, coupon_id: coupon.id, user_coupon_id: r.userCouponId });
      }
    }
  }
  return issued;
}

module.exports = {
  issueNewUserGiftPack,
};

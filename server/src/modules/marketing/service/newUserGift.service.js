const marketingRepo = require('../repository/marketing.repository');

function getAdminApi() {
  return /** @type {any} */ (require('../../admin')).api || {};
}

function getUserApi() {
  return /** @type {any} */ (require('../../user')).api || {};
}

function requireUserApi(name) {
  const fn = getUserApi()[name];
  if (typeof fn !== 'function') {
    throw new Error(`User module API missing method: ${name}`);
  }
  return fn;
}

async function issueCouponIfEligible(userId, coupon, activityId) {
  const result = await requireUserApi('issueCouponToUsers')(coupon.id, [userId], {
    issueChannel: 'new_user_gift',
    metadata: { activityId },
  });
  return { issued: Number(result?.issued || 0) > 0, couponId: coupon.id };
}

/**
 * 娉ㄥ唽鎴愬姛鍚庡彂鏀炬柊浜虹ぜ鍖咃紙鍏宠仈 coupons 琛紝涓嶉噸澶嶅垱寤哄埜瑙勫垯锛? */
async function issueNewUserGiftPack(userId) {
  const adminApi = getAdminApi();
  const campaigns = await adminApi.selectPublicCouponCampaignsByPosition('home_coupon_zone', ['new_user_gift']);
  const issued = [];
  for (const campaign of campaigns) {
    const couponIds = await adminApi.selectCouponCampaignCouponIds(campaign.id);
    if (!couponIds.length) continue;
    const coupons = await marketingRepo.selectCouponsByIds(couponIds);
    for (const coupon of coupons) {
      const r = await issueCouponIfEligible(userId, coupon, campaign.id);
      if (r.issued) {
        issued.push({ campaign_id: campaign.id, coupon_id: coupon.id });
      }
    }
  }
  if (campaigns.length) return issued;

  const activities = await marketingRepo.selectActivitiesByPosition('home_new_user_gift', ['new_user_gift']);
  for (const activity of activities) {
    const couponIds = Array.isArray(activity.activity_config?.coupon_ids)
      ? activity.activity_config.coupon_ids
      : [];
    if (!couponIds.length) continue;
    const coupons = await marketingRepo.selectCouponsByIds(couponIds);
    for (const coupon of coupons) {
      const r = await issueCouponIfEligible(userId, coupon, activity.id);
      if (r.issued) {
        issued.push({ activity_id: activity.id, coupon_id: coupon.id });
      }
    }
  }
  return issued;
}

module.exports = {
  issueNewUserGiftPack,
};

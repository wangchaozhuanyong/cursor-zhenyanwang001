const repo = require('../repository/marketing.repository');
const promo = require('../marketingPromo');

function getAdminApi() {
  return /** @type {any} */ (require('../../admin')).api || {};
}

function getUserApi() {
  return /** @type {any} */ (require('../../user')).api || {};
}

function attachCouponSource(coupons, source) {
  return coupons.map((coupon) => ({
    ...coupon,
    issue_activity_id: source?.id || null,
    campaign_id: source?.id || null,
    campaign_type: source?.campaign_type || source?.type || null,
    audience_type: source?.audience_type || null,
  }));
}

async function decorateCoupons(coupons, context = {}) {
  return getUserApi().decorateCouponsWithClaimability(coupons, context.userId || null);
}

function appendStandaloneCoupons(target, standaloneCoupons, seen) {
  for (const coupon of standaloneCoupons) {
    if (!coupon?.id || seen.has(coupon.id)) continue;
    seen.add(coupon.id);
    target.push(coupon);
  }
}

function formatFlashSaleResponse(bundle) {
  if (!bundle) return { data: null };
  const { activity, items, scopes } = bundle;
  const endMs = new Date(activity.end_at).getTime();
  const nowMs = Date.now();
  return {
    data: {
      id: activity.id,
      type: activity.type,
      title: activity.title,
      subtitle: activity.subtitle || '',
      cover_image: activity.cover_image || '',
      start_at: activity.start_at,
      end_at: activity.end_at,
      display_positions: activity.display_positions,
      allow_coupon_stack: activity.allow_coupon_stack,
      allow_points_stack: activity.allow_points_stack,
      allow_reward: activity.allow_reward,
      countdown_seconds: Number.isFinite(endMs) ? Math.max(0, Math.floor((endMs - nowMs) / 1000)) : 0,
      scopes: scopes || [],
      items: items.map((it) => ({
        product_id: it.product_id,
        product_name: it.product_name,
        cover_image: it.cover_image,
        original_price: it.product_price,
        flash_price: it.activity_price,
        activity_stock: it.activity_stock,
        sold_count: it.sold_count,
        remaining_stock: it.remaining_stock,
        limit_per_user: it.limit_per_user,
      })),
    },
  };
}

async function getFlashSaleForHome(query = {}) {
  const position = query.position || 'home_flash_sale';
  const bundle = await repo.selectFlashSaleActivityByPosition(position);
  return formatFlashSaleResponse(bundle);
}

async function getActivitiesByPosition(query = {}) {
  const position = query.position;
  const types = query.type ? [String(query.type)] : [];
  const list = await repo.selectActivitiesByPosition(position, types);
  return { data: list.map(promo.mapActivitySummary) };
}

function audienceOptions(context = {}) {
  return { userId: context.userId || null };
}

async function getCouponCenter(query = {}, context = {}) {
  const position = 'home_coupon_zone';
  const adminApi = getAdminApi();
  const campaigns = await adminApi.selectPublicCouponCampaignsByPosition(
    position,
    ['public_claim', 'member', 'seasonal'],
    audienceOptions(context),
  );
  const campaign = campaigns[0];
  if (campaign) {
    const couponIds = await adminApi.selectCouponCampaignCouponIds(campaign.id);
    const rows = await repo.selectCouponsByIds(couponIds);
    const coupons = await decorateCoupons(attachCouponSource(rows.map(repo.mapPublicCoupon), campaign), context);
    const seen = new Set(coupons.map((coupon) => coupon.id).filter(Boolean));
    appendStandaloneCoupons(
      coupons,
      await decorateCoupons((await repo.selectCouponsByPosition(position)).map(repo.mapPublicCoupon), context),
      seen,
    );
    return {
      data: {
        activity: promo.mapCouponCampaignSummary(campaign),
        campaign: promo.mapCouponCampaignSummary(campaign),
        campaigns: campaigns.map(promo.mapCouponCampaignSummary),
        coupons,
      },
    };
  }

  const legacyPosition = query.position || 'home_coupon_center';
  const activities = await repo.selectActivitiesByPosition(legacyPosition, ['coupon_activity']);
  const activity = activities[0];
  if (!activity) {
    const coupons = await decorateCoupons((await repo.selectCouponsByPosition(legacyPosition)).map(repo.mapPublicCoupon), context);
    if (!coupons.length) return { data: null };
    return {
      data: {
        activity: null,
        coupons,
      },
    };
  }
  const couponIds = Array.isArray(activity.activity_config?.coupon_ids)
    ? activity.activity_config.coupon_ids
    : [];
  const rows = await repo.selectCouponsByIds(couponIds);
  const coupons = await decorateCoupons(attachCouponSource(rows.map(repo.mapPublicCoupon), activity), context);
  const seen = new Set(coupons.map((coupon) => coupon.id).filter(Boolean));
  appendStandaloneCoupons(
    coupons,
    await decorateCoupons((await repo.selectCouponsByPosition(legacyPosition)).map(repo.mapPublicCoupon), context),
    seen,
  );
  return {
    data: {
      activity: promo.mapActivitySummary(activity),
      coupons,
    },
  };
}

async function getNewUserGift(query = {}, context = {}) {
  const position = 'home_coupon_zone';
  const adminApi = getAdminApi();
  const campaigns = await adminApi.selectPublicCouponCampaignsByPosition(
    position,
    ['new_user_gift'],
    audienceOptions(context),
  );
  const campaign = campaigns[0];
  if (campaign) {
    const couponIds = await adminApi.selectCouponCampaignCouponIds(campaign.id);
    const rows = await repo.selectCouponsByIds(couponIds);
    const coupons = await decorateCoupons(attachCouponSource(rows.map(repo.mapPublicCoupon), campaign), context);
    return {
      data: {
        activity: promo.mapCouponCampaignSummary(campaign),
        campaign: promo.mapCouponCampaignSummary(campaign),
        campaigns: campaigns.map(promo.mapCouponCampaignSummary),
        coupons,
        auto_issue_on_register: true,
      },
    };
  }

  const legacyPosition = query.position || 'home_new_user_gift';
  const activities = await repo.selectActivitiesByPosition(legacyPosition, ['new_user_gift']);
  const activity = activities[0];
  if (!activity) return { data: null };
  const couponIds = Array.isArray(activity.activity_config?.coupon_ids)
    ? activity.activity_config.coupon_ids
    : [];
  const rows = await repo.selectCouponsByIds(couponIds);
  const coupons = await decorateCoupons(attachCouponSource(rows.map(repo.mapPublicCoupon), activity), context);
  return {
    data: {
      activity: promo.mapActivitySummary(activity),
      coupons,
      auto_issue_on_register: true,
    },
  };
}

async function getCouponZone(query = {}, context = {}) {
  const position = query.position || 'home_coupon_zone';
  const adminApi = getAdminApi();
  const campaigns = await adminApi.selectPublicCouponCampaignsByPosition(position, [
    'public_claim',
    'new_user_gift',
    'member',
    'seasonal',
  ], audienceOptions(context));
  const seen = new Set();
  const coupons = [];
  const mappedCampaigns = [];
  for (const campaign of campaigns) {
    const couponIds = await adminApi.selectCouponCampaignCouponIds(campaign.id);
    const rows = await repo.selectCouponsByIds(couponIds);
    const mapped = (await decorateCoupons(attachCouponSource(rows.map(repo.mapPublicCoupon), campaign), context)).filter((coupon) => {
      if (!coupon?.id || seen.has(coupon.id)) return false;
      seen.add(coupon.id);
      return true;
    });
    mappedCampaigns.push({
      ...promo.mapCouponCampaignSummary(campaign),
      campaign_type: campaign.campaign_type,
      coupons: mapped,
    });
    coupons.push(...mapped);
  }
  appendStandaloneCoupons(
    coupons,
    await decorateCoupons((await repo.selectCouponsByPosition(position)).map(repo.mapPublicCoupon), context),
    seen,
  );
  if (!mappedCampaigns.length && !coupons.length) return { data: null };
  return {
    data: {
      activity: mappedCampaigns[0] || null,
      campaign: mappedCampaigns[0] || null,
      campaigns: mappedCampaigns,
      coupons,
    },
  };
}

async function getPositionNotices(query = {}) {
  const position = String(query.position || '').trim();
  if (!position) return { data: [] };
  const types = query.type
    ? [String(query.type)]
    : ['full_reduction', 'flash_sale'];
  const list = await repo.selectActivitiesByPosition(position, types);
  return {
    data: list.map((a) => ({
      ...promo.mapActivitySummary(a),
      display_positions: a.display_positions,
    })),
  };
}

async function getFullReductionNotices(query = {}) {
  const position = query.position || 'full_reduction_notice';
  const list = await repo.selectActivitiesByPosition(position, ['full_reduction']);
  return { data: list.map(promo.mapActivitySummary) };
}

module.exports = {
  getFlashSaleForHome,
  getActivitiesByPosition,
  getCouponCenter,
  getNewUserGift,
  getPositionNotices,
  getFullReductionNotices,
  getCouponZone,
};

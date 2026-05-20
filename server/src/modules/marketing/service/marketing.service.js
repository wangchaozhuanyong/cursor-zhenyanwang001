const repo = require('../repository/marketing.repository');
const promo = require('../marketingPromo');

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

async function getCouponCenter(query = {}) {
  const position = query.position || 'home_coupon_center';
  const activities = await repo.selectActivitiesByPosition(position, ['coupon_activity']);
  const activity = activities[0];
  if (!activity) return { data: null };
  const couponIds = Array.isArray(activity.activity_config?.coupon_ids)
    ? activity.activity_config.coupon_ids
    : [];
  const rows = await repo.selectCouponsByIds(couponIds);
  return {
    data: {
      activity: promo.mapActivitySummary(activity),
      coupons: rows.map(repo.mapPublicCoupon),
    },
  };
}

async function getNewUserGift(query = {}) {
  const position = query.position || 'home_new_user_gift';
  const activities = await repo.selectActivitiesByPosition(position, ['new_user_gift']);
  const activity = activities[0];
  if (!activity) return { data: null };
  const couponIds = Array.isArray(activity.activity_config?.coupon_ids)
    ? activity.activity_config.coupon_ids
    : [];
  const rows = await repo.selectCouponsByIds(couponIds);
  return {
    data: {
      activity: promo.mapActivitySummary(activity),
      coupons: rows.map(repo.mapPublicCoupon),
      auto_issue_on_register: true,
    },
  };
}

async function getPositionNotices(query = {}) {
  const position = String(query.position || '').trim();
  if (!position) return { data: [] };
  const types = query.type
    ? [String(query.type)]
    : ['full_reduction', 'coupon_activity', 'new_user_gift', 'flash_sale'];
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
};

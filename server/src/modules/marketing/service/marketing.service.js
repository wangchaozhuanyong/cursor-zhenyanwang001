const repo = require('../repository/marketing.repository');
const promo = require('../marketingPromo');

function getAdminApi() {
  return /** @type {any} */ (require('../../admin/publicApi')) || {};
}

function getUserApi() {
  return /** @type {any} */ (require('../../user/publicApi')) || {};
}

function mapPromotionType(type) {
  const raw = String(type || '');
  if (raw === 'coupon_activity' || raw === 'new_user_gift') return 'coupon';
  if (raw === 'points_bonus') return 'points_reward';
  if (raw === 'member_activity') return 'member_price';
  if (raw === 'cashback_activity') return 'campaign';
  return raw || 'campaign';
}

function promotionTypeLabel(type) {
  return {
    campaign: '主题活动',
    coupon: '优惠券',
    full_reduction: '满减',
    full_discount: '满折',
    limited_time_discount: '限时折扣',
    flash_sale: '秒杀',
    member_price: '会员价',
    checkin_reward: '签到奖励',
    points_reward: '积分奖励',
  }[type] || '活动';
}

function toInt(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

function toMoney(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

function secondsUntil(value) {
  const ms = new Date(value).getTime();
  if (!Number.isFinite(ms)) return 0;
  return Math.max(0, Math.floor((ms - Date.now()) / 1000));
}

function runtimeStatus(row) {
  const startMs = new Date(row?.start_at).getTime();
  const endMs = new Date(row?.end_at).getTime();
  const now = Date.now();
  if (Number.isFinite(startMs) && now < startMs) return 'scheduled';
  if (Number.isFinite(endMs) && now > endMs) return 'ended';
  return 'active';
}

function normalizePromotionItem(item) {
  const productPrice = toMoney(item.product_price);
  const activityPrice = toMoney(item.activity_price);
  const activityStock = Math.max(0, toInt(item.activity_stock, 0));
  const soldCount = Math.max(0, toInt(item.sold_count, 0));
  const remainingStock = Math.max(0, toInt(item.remaining_stock, activityStock - soldCount));
  const savingAmount = activityPrice > 0 && productPrice > activityPrice
    ? toMoney(productPrice - activityPrice)
    : 0;
  return {
    ...item,
    product_price: productPrice,
    product_stock: Math.max(0, toInt(item.product_stock, 0)),
    activity_price: activityPrice,
    activity_stock: activityStock,
    sold_count: soldCount,
    remaining_stock: remainingStock,
    limit_per_user: Math.max(0, toInt(item.limit_per_user, 0)),
    stock_progress_percent: activityStock > 0
      ? Math.max(0, Math.min(100, Math.round((soldCount / activityStock) * 100)))
      : 0,
    sold_out: activityStock > 0 && remainingStock <= 0,
    saving_amount: savingAmount,
    saving_percent: savingAmount > 0 && productPrice > 0
      ? Math.max(0, Math.min(100, Math.round((savingAmount / productPrice) * 100)))
      : 0,
  };
}

function parseCheckinRewardConfig(activity) {
  const cfg = {
    ...(activity?.activity_config && typeof activity.activity_config === 'object' ? activity.activity_config : {}),
    ...(activity?.rule_config && typeof activity.rule_config === 'object' ? activity.rule_config : {}),
  };
  return {
    bonus_kind: 'checkin',
    reward_points: toInt(cfg.reward_points ?? cfg.points ?? cfg.daily_points ?? cfg.sign_in_points, 0),
    once_per_day: cfg.once_per_day !== false && cfg.once_per_day !== 0,
    streak_bonus_points: Math.max(0, toInt(cfg.streak_bonus_points, 0)),
    streak_bonus_every_days: Math.max(0, toInt(cfg.streak_bonus_every_days, 0)),
  };
}

function normalizePromotion(row) {
  const type = mapPromotionType(row.type);
  const slug = row.slug || row.id;
  const status = runtimeStatus(row);
  return {
    id: row.id,
    slug,
    type,
    legacy_type: row.type,
    title: row.title,
    subtitle: row.subtitle || '',
    description: row.description || row.subtitle || '',
    cover_image: row.cover_image || '',
    promo_label: promotionTypeLabel(type),
    start_at: row.start_at,
    end_at: row.end_at,
    priority: Number(row.priority ?? row.sort_order ?? 0),
    scope_type: row.scope_type || 'all',
    display_positions: row.display_positions || [],
    rule_config: row.rule_config || row.activity_config || null,
    stackable: !!row.stackable,
    exclusive_with: Array.isArray(row.exclusive_with) ? row.exclusive_with.map(mapPromotionType) : [],
    usage_limit_total: row.usage_limit_total == null ? null : Number(row.usage_limit_total),
    usage_limit_per_user: row.usage_limit_per_user == null ? null : Number(row.usage_limit_per_user),
    version: Number(row.version || 1),
    href: `/promotions/${slug}`,
    runtime_status: status,
    countdown_seconds: status === 'active' ? secondsUntil(row.end_at) : 0,
    starts_in_seconds: status === 'scheduled' ? secondsUntil(row.start_at) : 0,
    items: Array.isArray(row.items) ? row.items.map(normalizePromotionItem) : [],
    scopes: Array.isArray(row.scopes) ? row.scopes : [],
    coupons: Array.isArray(row.coupons) ? row.coupons : [],
  };
}

function getPromotionCouponIds(row) {
  const configs = [row?.rule_config, row?.activity_config].filter(Boolean);
  const ids = [];
  for (const config of configs) {
    const raw = Array.isArray(config?.coupon_ids)
      ? config.coupon_ids
      : Array.isArray(config?.couponIds)
        ? config.couponIds
        : Array.isArray(config?.coupons)
          ? config.coupons.map((item) => item?.id || item?.coupon_id || item)
          : [];
    ids.push(...raw);
  }
  return [...new Set(ids.map((id) => String(id || '').trim()).filter(Boolean))];
}

async function attachPromotionCoupons(row, context = {}) {
  if (!row) return row;
  const type = mapPromotionType(row.type);
  if (type !== 'coupon') return row;
  const couponIds = getPromotionCouponIds(row);
  if (!couponIds.length) return { ...row, coupons: [] };
  const couponRows = await repo.selectCouponsByIds(couponIds);
  const coupons = await decorateCoupons(attachCouponSource(couponRows.map(repo.mapPublicCoupon), row), context);
  return { ...row, coupons };
}

function attachCouponSource(coupons, source) {
  return coupons.map((coupon) => ({
    ...coupon,
    issue_activity_id: source?.id || null,
    campaign_id: source?.id || null,
    campaign_type: source?.campaign_type || source?.type || null,
    display_category: source?.display_category || null,
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
      slug: activity.slug || activity.id,
      type: activity.type,
      title: activity.title,
      subtitle: activity.subtitle || '',
      cover_image: activity.cover_image || '',
      href: `/promotions/${activity.slug || activity.id}`,
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
  const activities = await repo.selectActivitiesByPosition(legacyPosition, ['coupon', 'coupon_activity']);
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
    : ['full_reduction', 'full_discount', 'flash_sale'];
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
  const list = await repo.selectActivitiesByPosition(position, ['full_reduction', 'full_discount']);
  return { data: list.map(promo.mapActivitySummary) };
}

async function getPromotions(query = {}) {
  const type = query.type ? String(query.type) : '';
  const legacyType = type === 'points_reward'
    ? ['points_reward', 'points_bonus']
    : type === 'member_price'
      ? ['member_price', 'member_activity']
      : type;
  const result = await repo.selectActivePromotions({
    page: query.page,
    pageSize: query.pageSize,
    type: legacyType,
  });
  return {
    data: {
      list: result.list.map(normalizePromotion),
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      totalPages: Math.ceil(result.total / result.pageSize),
    },
  };
}

async function resolveCheckinReward() {
  const rows = await repo.selectActiveCheckinRewardActivities();
  for (const row of rows) {
    const config = parseCheckinRewardConfig(row);
    if (config.reward_points < 1) continue;
    return {
      activity_id: row.activity_id || row.id,
      id: row.id,
      slug: row.slug || row.id,
      type: 'checkin_reward',
      title: row.title || '每日签到奖励',
      subtitle: row.subtitle || '',
      reward_points: config.reward_points,
      once_per_day: config.once_per_day,
      streak_bonus_points: config.streak_bonus_points,
      streak_bonus_every_days: config.streak_bonus_every_days,
      usage_limit_total: row.usage_limit_total == null ? 0 : Number(row.usage_limit_total || 0),
      usage_limit_per_user: row.usage_limit_per_user == null ? 0 : Number(row.usage_limit_per_user || 0),
      version: Number(row.version || 1),
      start_at: row.start_at,
      end_at: row.end_at,
    };
  }
  return null;
}

async function getPromotionBySlug(slug, context = {}) {
  const row = await repo.selectActivePromotionBySlug(slug);
  const withCoupons = await attachPromotionCoupons(row, context);
  return { data: withCoupons ? normalizePromotion(withCoupons) : null };
}

module.exports = {
  getFlashSaleForHome,
  getActivitiesByPosition,
  getCouponCenter,
  getNewUserGift,
  getPositionNotices,
  getFullReductionNotices,
  getPromotions,
  resolveCheckinReward,
  getPromotionBySlug,
  getCouponZone,
};

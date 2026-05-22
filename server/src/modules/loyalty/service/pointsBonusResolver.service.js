const { klDateString } = require('../../../utils/klDateRange');
const { isInBirthdayWindow } = require('../../../utils/birthdayWindow');

const CALCULATION_VERSION = 'loyalty_points_bonus_v1';

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function parseActivityConfig(raw) {
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function parsePointsBonusConfig(activity) {
  const cfg = parseActivityConfig(activity?.activity_config);
  return {
    bonus_kind: String(cfg.bonus_kind || 'normal'),
    bonus_mode: String(cfg.bonus_mode || 'multiplier'),
    multiplier_percent: Math.max(100, toNumber(cfg.multiplier_percent, 100)),
    min_order_amount: Math.max(0, toNumber(cfg.min_order_amount, 0)),
    max_bonus_points: Math.max(0, toInt(cfg.max_bonus_points, 0)),
    stack_strategy: String(cfg.stack_strategy || 'max'),
    apply_scope: String(cfg.apply_scope || 'matched_items'),
    holiday_name: String(cfg.holiday_name || ''),
    birthday_window_before_days: Math.max(0, toInt(cfg.birthday_window_before_days, 0)),
    birthday_window_after_days: Math.max(0, toInt(cfg.birthday_window_after_days, 7)),
    once_per_year: cfg.once_per_year !== false && cfg.once_per_year !== 0,
  };
}

function getActivityId(activity) {
  return String(activity?.activity_id || activity?.id || '');
}

function isBirthdayActivityEligible(activity, config, userContext = {}) {
  if (config.bonus_kind !== 'birthday') return true;
  if (!userContext.birthday) return false;
  if (!isInBirthdayWindow(
    userContext.today || klDateString(),
    userContext.birthday,
    config.birthday_window_before_days,
    config.birthday_window_after_days,
  )) return false;
  if (config.once_per_year) {
    const consumed = userContext.consumedBirthdayActivityIds || [];
    if (consumed.includes(getActivityId(activity))) return false;
  }
  return true;
}

function filterPointsBonusActivitiesForUser(activities, userContext = {}) {
  return (activities || []).filter((activity) => {
    const config = parsePointsBonusConfig(activity);
    return isBirthdayActivityEligible(activity, config, userContext);
  });
}

function toInt(value, fallback = 0) {
  return Math.trunc(toNumber(value, fallback));
}

function lineMatchesActivityScope(oi, product, activity, scopes = []) {
  const scopeType = String(activity.scope_type || 'all');
  if (scopeType === 'all') return true;
  const scopeIds = scopes.length ? scopes.map((s) => String(s.scope_id)) : [];
  const productId = String(oi.productId || oi.product_id || '');
  if (scopeType === 'product') {
    if (scopeIds.length) return scopeIds.includes(productId);
    return true;
  }
  if (scopeType === 'category') {
    const cid = product?.category_id;
    if (!cid) return false;
    return scopeIds.length ? scopeIds.includes(String(cid)) : false;
  }
  return false;
}

function activityMatchesLine(oi, product, activity) {
  const scopes = activity.scopes || [];
  return lineMatchesActivityScope(oi, product, activity, scopes);
}

function pickBestActivity(candidates) {
  if (!candidates.length) return null;
  return candidates.reduce((best, cur) => (
    cur.config.multiplier_percent > best.config.multiplier_percent ? cur : best
  ));
}

/**
 * Resolve per-line points_bonus multiplier (percent, 200 = 2x) and order-level snapshots.
 */
function resolvePointsBonusForPricing(params = {}) {
  const activities = params.pointsBonusActivities || [];
  const orderItems = params.orderItems || [];
  const productMap = params.productMap || {};
  const orderGoodsAmount = Math.max(0, toNumber(params.orderGoodsAmount, 0));

  const userContext = params.userContext || {};
  const eligibleActivities = filterPointsBonusActivitiesForUser(activities, userContext)
    .map((activity) => ({ activity, config: parsePointsBonusConfig(activity) }))
    .filter(({ config }) => orderGoodsAmount >= config.min_order_amount);

  const orderWideCandidates = eligibleActivities.filter(({ activity, config }) => {
    if (config.apply_scope !== 'all') return false;
    if (String(activity.scope_type || 'all') === 'all') return true;
    return orderItems.some((oi) => {
      const product = productMap[oi.productId || oi.product_id] || {};
      return activityMatchesLine(oi, product, activity);
    });
  });
  const orderWideBest = pickBestActivity(orderWideCandidates);
  const orderWidePercent = orderWideBest?.config.multiplier_percent || 100;

  const itemResults = [];
  const snapshotMap = new Map();

  for (const oi of orderItems) {
    const product = productMap[oi.productId || oi.product_id] || {};
    const lineCandidates = eligibleActivities.filter(({ activity, config }) => {
      if (config.apply_scope === 'all') return activityMatchesLine(oi, product, activity);
      return config.apply_scope === 'matched_items' && activityMatchesLine(oi, product, activity);
    });
    const lineBest = pickBestActivity(lineCandidates);
    const linePercent = lineBest?.config.multiplier_percent || 100;
    const finalPercent = Math.max(linePercent, orderWidePercent);
    const winning = (finalPercent === linePercent && lineBest) ? lineBest : orderWideBest;

    const activityId = winning?.activity?.activity_id || winning?.activity?.id || null;
    const title = winning?.activity?.title || '';
    if (activityId && finalPercent > 100) {
      const key = String(activityId);
      const existing = snapshotMap.get(key) || {
        activity_id: key,
        title,
        multiplier_percent: finalPercent,
        bonus_kind: winning.config.bonus_kind,
        holiday_name: winning.config.holiday_name || null,
        matched_product_ids: [],
        max_bonus_points: winning.config.max_bonus_points,
      };
      existing.matched_product_ids.push(String(oi.productId || oi.product_id || ''));
      existing.multiplier_percent = Math.max(existing.multiplier_percent, finalPercent);
      snapshotMap.set(key, existing);
    }

    itemResults.push({
      product_id: oi.productId || oi.product_id,
      points_bonus_multiplier_percent: finalPercent,
      points_bonus_activity_id: activityId,
      points_bonus_activity_title: title,
      points_bonus_bonus_kind: winning?.config.bonus_kind || 'normal',
    });
  }

  const snapshots = [...snapshotMap.values()].map((s) => ({
    ...s,
    matched_product_ids: [...new Set(s.matched_product_ids.filter(Boolean))],
  }));

  const maxBonusPoints = snapshots.reduce(
    (max, s) => Math.max(max, toInt(s.max_bonus_points, 0)),
    orderWideBest?.config.max_bonus_points || 0,
  );

  return {
    item_results: itemResults,
    points_bonus_snapshots: snapshots,
    order_multiplier_percent: orderWidePercent,
    max_bonus_points: maxBonusPoints,
    calculation_version: CALCULATION_VERSION,
  };
}

module.exports = {
  CALCULATION_VERSION,
  parsePointsBonusConfig,
  lineMatchesActivityScope,
  filterPointsBonusActivitiesForUser,
  isBirthdayActivityEligible,
  resolvePointsBonusForPricing,
};

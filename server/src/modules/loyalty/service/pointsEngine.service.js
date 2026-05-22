const CALCULATION_VERSION = 'loyalty_engine_v1';

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toInt(value, fallback = 0) {
  return Math.trunc(toNumber(value, fallback));
}

function toCents(value) {
  return Math.round(toNumber(value) * 100);
}

function fromCents(cents) {
  return Number((Math.max(0, Math.round(toNumber(cents))) / 100).toFixed(2));
}

function money(value) {
  return fromCents(toCents(value));
}

function roundPoints(value, roundingMode = 'floor') {
  const n = toNumber(value);
  if (roundingMode === 'ceil') return Math.max(0, Math.ceil(n));
  if (roundingMode === 'round') return Math.max(0, Math.round(n));
  return Math.max(0, Math.floor(n));
}

function normalizeSettings(settings = {}) {
  const pointValue = toNumber(settings.point_value_myr, 0.01) > 0
    ? toNumber(settings.point_value_myr, 0.01)
    : 0.01;
  return {
    display_enabled: settings.display_enabled == null ? 1 : Number(!!settings.display_enabled),
    earn_enabled: settings.earn_enabled == null ? 1 : Number(!!settings.earn_enabled),
    redeem_enabled: settings.redeem_enabled == null ? 0 : Number(!!settings.redeem_enabled),
    earn_mode: settings.earn_mode || settings.earn_basis || 'amount_plus_product_rule',
    earn_currency_unit: Math.max(toNumber(settings.earn_currency_unit, 1), 0.01),
    earn_points_unit: Math.max(toInt(settings.earn_points_unit, 1), 0),
    earn_rounding: settings.earn_rounding || 'floor',
    earn_after_discount: settings.earn_after_discount == null ? 1 : Number(!!settings.earn_after_discount),
    earn_after_points_redeem: settings.earn_after_points_redeem == null ? 0 : Number(!!settings.earn_after_points_redeem),
    promotion_no_points: settings.promotion_no_points == null ? 0 : Number(!!settings.promotion_no_points),
    marketing_activity_no_points: settings.marketing_activity_no_points == null ? 0 : Number(!!settings.marketing_activity_no_points),
    coupon_no_points: settings.coupon_no_points == null ? 0 : Number(!!settings.coupon_no_points),
    member_price_no_points: settings.member_price_no_points == null ? 0 : Number(!!settings.member_price_no_points),
    payment_points_mode: settings.payment_points_mode || 'all',
    allowed_payment_methods: Array.isArray(settings.allowed_payment_methods) ? settings.allowed_payment_methods : [],
    point_value_myr: pointValue,
    points_per_currency: Math.max(toInt(settings.points_per_currency, Math.round(1 / pointValue)), 1),
    min_redeem_points: Math.max(toInt(settings.min_redeem_points, 0), 0),
    redeem_step: Math.max(toInt(settings.redeem_step, 1), 1),
    max_redeem_percent: Math.max(toNumber(settings.max_redeem_percent, 100), 0),
    max_redeem_amount: Math.max(toNumber(settings.max_redeem_amount, 0), 0),
    min_order_amount: Math.max(toNumber(settings.min_order_amount, 0), 0),
    redeem_scope: settings.redeem_scope || 'exclude_restricted',
    allow_with_coupon: settings.allow_with_coupon == null ? 1 : Number(!!settings.allow_with_coupon),
    allow_with_reward_cash: settings.allow_with_reward_cash == null ? 1 : Number(!!settings.allow_with_reward_cash),
    allow_negative_points: settings.allow_negative_points == null ? 0 : Number(!!settings.allow_negative_points),
    settle_timing: settings.settle_timing || 'order_completed',
    expire_enabled: settings.expire_enabled == null ? 0 : Number(!!settings.expire_enabled),
    expire_days: Math.max(toInt(settings.expire_days, 0), 0),
    zero_pay_allowed: settings.zero_pay_allowed == null ? 1 : Number(!!settings.zero_pay_allowed),
  };
}

function isRuleActive(rule, now = new Date()) {
  if (!rule || rule.enabled === false || Number(rule.enabled) === 0) return false;
  const start = rule.start_at ? new Date(rule.start_at) : null;
  const end = rule.end_at ? new Date(rule.end_at) : null;
  if (start && Number.isFinite(start.getTime()) && start > now) return false;
  if (end && Number.isFinite(end.getTime()) && end < now) return false;
  return true;
}

function productMatchesRule(product = {}, rule = {}) {
  const scopeType = rule.scope_type || 'all';
  const scopeId = rule.scope_id == null ? '' : String(rule.scope_id);
  if (scopeType === 'all') return true;
  if (scopeType === 'product') return String(product.id || product.product_id || '') === scopeId;
  if (scopeType === 'category') return String(product.category_id || product.categoryId || '') === scopeId;
  if (scopeType === 'tag') {
    const tags = product.tags || product.tag_ids || product.tagIds || [];
    return Array.isArray(tags) && tags.map(String).includes(scopeId);
  }
  return false;
}

function ruleScopeRank(scopeType) {
  if (scopeType === 'product') return 1;
  if (scopeType === 'tag') return 2;
  if (scopeType === 'category') return 3;
  if (scopeType === 'all') return 4;
  return 5;
}

function resolveProductPointRule(product, rules = [], now = new Date()) {
  const candidates = rules
    .filter((rule) => isRuleActive(rule, now) && productMatchesRule(product, rule))
    .sort((a, b) => {
      const scopeDiff = ruleScopeRank(a.scope_type || 'all') - ruleScopeRank(b.scope_type || 'all');
      if (scopeDiff !== 0) return scopeDiff;
      const priorityDiff = toInt(a.priority, 100) - toInt(b.priority, 100);
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(b.updated_at || b.created_at || 0).getTime() - new Date(a.updated_at || a.created_at || 0).getTime();
    });
  return candidates[0] || null;
}

function calculateGlobalEarnPoints(settings, baseAmount) {
  const s = normalizeSettings(settings);
  if (!s.earn_enabled || s.earn_points_unit <= 0) return 0;
  const raw = (toNumber(baseAmount) / s.earn_currency_unit) * s.earn_points_unit;
  return roundPoints(raw, s.earn_rounding);
}

function getItemProduct(item, productMap = {}) {
  return item.product || productMap[item.product_id] || productMap[item.productId] || item;
}

function getLineAmount(item, keyCandidates, fallback = 0) {
  for (const key of keyCandidates) {
    if (item[key] !== undefined && item[key] !== null) return money(item[key]);
  }
  return money(fallback);
}

function getLineEarnAmounts(item, product, qty, settings) {
  const priceAmount = money(toNumber(item.price || product.price || 0) * qty);
  if (settings.earn_after_discount) {
    const paidAmount = getLineAmount(
      item,
      ['line_paid_amount', 'paid_amount', 'subtotal_after_discount', 'subtotal'],
      priceAmount,
    );
    return { paidAmount, priceAmount };
  }
  const preDiscount = getLineAmount(item, ['subtotal', 'line_subtotal', 'line_original_amount'], priceAmount);
  return { paidAmount: preDiscount, priceAmount };
}

function calculateEarnFromProductRule(rule, ruleMode, settings, paidAmount, priceAmount, qty, appliedFixedPerOrderRuleIds) {
  if (!rule || !Number(rule.earn_enabled)) return { earned: 0, reason: 'rule_earn_disabled' };
  if (ruleMode === 'no_points') return { earned: 0, reason: 'rule_no_points' };
  if (ruleMode === 'fixed_per_item') {
    return { earned: Math.max(toInt(rule.fixed_points, 0), 0) * qty, reason: '' };
  }
  if (ruleMode === 'fixed_per_order') {
    const ruleId = String(rule.id || `${rule.scope_type}:${rule.scope_id || 'all'}`);
    if (appliedFixedPerOrderRuleIds.has(ruleId)) return { earned: 0, reason: '' };
    appliedFixedPerOrderRuleIds.add(ruleId);
    return { earned: Math.max(toInt(rule.fixed_points, 0), 0), reason: '' };
  }
  if (ruleMode === 'amount_percent') {
    return {
      earned: roundPoints((paidAmount * Math.max(toNumber(rule.points_percent, 0), 0)) / 100, settings.earn_rounding),
      reason: '',
    };
  }
  if (ruleMode === 'price_percent') {
    return {
      earned: roundPoints((priceAmount * Math.max(toNumber(rule.points_percent, 0), 0)) / 100, settings.earn_rounding),
      reason: '',
    };
  }
  if (ruleMode === 'multiplier') {
    return {
      earned: roundPoints(
        calculateGlobalEarnPoints(settings, paidAmount) * (Math.max(toNumber(rule.multiplier_percent, 100), 0) / 100),
        settings.earn_rounding,
      ),
      reason: '',
    };
  }
  return { earned: calculateGlobalEarnPoints(settings, paidAmount), reason: '' };
}

function calculateOrderEarnedPoints(params = {}) {
  const settings = normalizeSettings(params.settings);
  const rules = params.productRules || [];
  const items = params.orderItems || [];
  const productMap = params.productMap || {};
  const memberMultiplier = Math.max(toNumber(params.memberLevel?.points_multiplier, 1), 0);
  const hasCoupon = !!params.coupon || toNumber(params.discounts?.coupon_amount, 0) > 0;
  const appliedFixedPerOrderRuleIds = new Set();
  const itemResults = [];

  if (!settings.earn_enabled) {
    return { earned_points: 0, item_results: [], product_rule_snapshots: [], calculation_version: CALCULATION_VERSION };
  }
  if (settings.coupon_no_points && hasCoupon) {
    return { earned_points: 0, item_results: [], product_rule_snapshots: [], disabled_reason: '当前优惠不能与积分叠加', calculation_version: CALCULATION_VERSION };
  }

  const globalEarnMode = settings.earn_mode;
  let total = 0;
  for (const item of items) {
    const product = getItemProduct(item, productMap);
    const qty = Math.max(toInt(item.qty || item.quantity, 1), 1);
    const rule = globalEarnMode === 'amount' ? null : resolveProductPointRule(product, rules);
    const ruleMode = rule?.earn_mode || 'inherit';
    const { paidAmount, priceAmount } = getLineEarnAmounts(item, product, qty, settings);
    const isPromotion = !!item.activity_id || !!item.activityId || !!product.is_promotion;
    const isRestricted = !!product.is_restricted || !!product.restricted || !!product.is_age_restricted;
    const memberDiscountShare = money(item.member_discount_share || 0);

    let earned = 0;
    let reason = '';
    if ((settings.marketing_activity_no_points && isPromotion) || (settings.promotion_no_points && isPromotion)) {
      reason = 'activity_no_points';
    } else if (settings.member_price_no_points && memberDiscountShare > 0) {
      reason = 'member_price_no_points';
    } else if (isRestricted) {
      reason = 'restricted_no_points';
    } else if (globalEarnMode === 'product_rule' && !rule) {
      reason = 'no_product_rule';
    } else if (globalEarnMode === 'amount' || !rule) {
      earned = calculateGlobalEarnPoints(settings, paidAmount);
    } else if (ruleMode === 'inherit') {
      earned = calculateGlobalEarnPoints(settings, paidAmount);
    } else {
      const ruleEarn = calculateEarnFromProductRule(
        rule,
        ruleMode,
        settings,
        paidAmount,
        priceAmount,
        qty,
        appliedFixedPerOrderRuleIds,
      );
      earned = ruleEarn.earned;
      reason = ruleEarn.reason;
    }

    const snapshot = rule ? { ...rule } : null;
    itemResults.push({
      product_id: item.product_id || item.productId || product.id,
      earned_points: earned,
      points_rule_snapshot: snapshot,
      line_points_base_amount: paidAmount,
      reason,
    });
    total += earned;
  }

  const finalTotal = roundPoints(total * memberMultiplier, settings.earn_rounding);
  return {
    earned_points: finalTotal,
    item_results: itemResults,
    product_rule_snapshots: itemResults.map((x) => x.points_rule_snapshot).filter(Boolean),
    member_level_snapshot: params.memberLevel ? { ...params.memberLevel, points_multiplier: memberMultiplier } : { points_multiplier: 1 },
    calculation_version: CALCULATION_VERSION,
  };
}

function calculateMaxUsablePoints(params = {}) {
  const settings = normalizeSettings(params.settings);
  const userPointsBalance = Math.max(toInt(params.userPointsBalance, 0), 0);
  const items = params.orderItems || [];
  const rules = params.productRules || [];
  const productMap = params.productMap || {};
  const hasCoupon = !!params.coupon || toNumber(params.discounts?.coupon_amount, 0) > 0;
  const requestedPoints = Math.max(toInt(params.pointsToUse ?? params.requestedPoints ?? 0, 0), 0);

  if (!settings.redeem_enabled || !settings.display_enabled) {
    return { max_usable_points: 0, points_used: 0, points_discount_amount: 0, disabled_reason: '当前未开启积分抵扣', adjusted: false, calculation_version: CALCULATION_VERSION };
  }
  if (settings.allow_with_coupon === 0 && hasCoupon) {
    return { max_usable_points: 0, points_used: 0, points_discount_amount: 0, disabled_reason: '当前优惠不能与积分叠加', adjusted: false, calculation_version: CALCULATION_VERSION };
  }
  const useRewardCash = !!(params.useRewardCash ?? params.use_reward_cash);
  if (settings.allow_with_reward_cash === 0 && useRewardCash) {
    return { max_usable_points: 0, points_used: 0, points_discount_amount: 0, disabled_reason: '返现余额不能与积分叠加', adjusted: false, calculation_version: CALCULATION_VERSION };
  }
  if (userPointsBalance <= 0) {
    return { max_usable_points: 0, points_used: 0, points_discount_amount: 0, disabled_reason: '可用积分不足', adjusted: false, calculation_version: CALCULATION_VERSION };
  }

  let redeemableCents = 0;
  const itemResults = [];
  for (const item of items) {
    const product = getItemProduct(item, productMap);
    const rule = resolveProductPointRule(product, rules);
    const paidAmount = getLineAmount(item, ['line_paid_amount', 'paid_amount', 'subtotal_after_discount', 'subtotal'], toNumber(item.price) * Math.max(toInt(item.qty || item.quantity, 1), 1));
    const isRestricted = !!product.is_restricted || !!product.restricted || !!product.is_age_restricted;
    const isActivityBlocked = !!item.activity_points_blocked || item.allow_points_stack === false;
    let lineRedeemable = paidAmount;
    let reason = '';

    if (isRestricted && settings.redeem_scope === 'exclude_restricted') {
      lineRedeemable = 0;
      reason = '受监管商品不支持积分抵扣';
    }
    if (isActivityBlocked) {
      lineRedeemable = 0;
      reason = '当前活动不支持积分抵扣';
    }
    if (rule && Number(rule.redeem_enabled) === 0) {
      lineRedeemable = 0;
      reason = '当前商品不支持积分抵扣';
    }
    if (rule && rule.max_redeem_percent !== null && rule.max_redeem_percent !== undefined && lineRedeemable > 0) {
      lineRedeemable = money((lineRedeemable * Math.max(toNumber(rule.max_redeem_percent, 0), 0)) / 100);
    }

    redeemableCents += toCents(lineRedeemable);
    itemResults.push({
      product_id: item.product_id || item.productId || product.id,
      redeemable_amount: money(lineRedeemable),
      is_restricted_excluded: Number(isRestricted && settings.redeem_scope === 'exclude_restricted'),
      disabled_reason: reason,
      points_rule_snapshot: rule ? { ...rule } : null,
    });
  }

  const redeemableAmount = fromCents(redeemableCents);
  if (redeemableAmount <= 0) {
    return { max_usable_points: 0, points_used: 0, points_discount_amount: 0, disabled_reason: '当前商品不支持积分抵扣', adjusted: false, item_results: itemResults, calculation_version: CALCULATION_VERSION };
  }
  if (redeemableAmount < settings.min_order_amount) {
    return { max_usable_points: 0, points_used: 0, points_discount_amount: 0, disabled_reason: '未达到最低订单金额', adjusted: false, item_results: itemResults, calculation_version: CALCULATION_VERSION };
  }

  const percentCap = money((redeemableAmount * settings.max_redeem_percent) / 100);
  const amountCap = settings.max_redeem_amount > 0 ? settings.max_redeem_amount : redeemableAmount;
  let maxDiscount = Math.min(redeemableAmount, percentCap, amountCap);
  if (!settings.zero_pay_allowed) maxDiscount = Math.max(0, maxDiscount - 0.01);
  let maxUsable = Math.floor(maxDiscount / settings.point_value_myr);
  maxUsable = Math.min(maxUsable, userPointsBalance);
  maxUsable = Math.floor(maxUsable / settings.redeem_step) * settings.redeem_step;
  if (maxUsable < settings.min_redeem_points) maxUsable = 0;

  let pointsUsed = Math.min(requestedPoints, maxUsable);
  pointsUsed = Math.floor(pointsUsed / settings.redeem_step) * settings.redeem_step;
  let adjusted = requestedPoints > 0 && pointsUsed !== requestedPoints;
  if (pointsUsed > 0 && pointsUsed < settings.min_redeem_points) {
    pointsUsed = 0;
    adjusted = true;
  }

  return {
    max_usable_points: maxUsable,
    points_used: pointsUsed,
    points_discount_amount: money(pointsUsed * settings.point_value_myr),
    point_value_myr: settings.point_value_myr,
    points_per_currency: settings.points_per_currency,
    disabled_reason: maxUsable > 0 ? '' : '可用积分不足',
    adjusted,
    adjusted_reason: adjusted ? '已按积分使用步长自动调整。' : '',
    item_results: itemResults,
    calculation_version: CALCULATION_VERSION,
  };
}

module.exports = {
  CALCULATION_VERSION,
  calculateOrderEarnedPoints,
  calculateMaxUsablePoints,
  calculateGlobalEarnPoints,
  normalizeSettings,
  resolveProductPointRule,
  roundPoints,
  money,
  toCents,
  fromCents,
};

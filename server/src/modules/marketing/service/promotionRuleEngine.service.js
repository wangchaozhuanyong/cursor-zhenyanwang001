const marketingService = require('./marketing.service');

const PROMOTION_ENGINE_VERSION = 'promotion_engine_v2_compat_2026_06';

function money(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function parseConfig(raw) {
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function parseList(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'object') return Object.values(raw);
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return String(raw)
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
}

function normalizePromotionType(type) {
  const raw = String(type || '');
  if (raw === 'coupon_activity' || raw === 'new_user_gift') return 'coupon';
  if (raw === 'points_bonus') return 'points_reward';
  if (raw === 'member_activity') return 'member_price';
  if (raw === 'member_level_discount' || raw === 'member_free_shipping') return 'member_price';
  return raw || 'campaign';
}

function promotionId(activity) {
  return activity?.activity_id || activity?.id || null;
}

function productIdOf(line) {
  return String(line?.productId || line?.product_id || '');
}

function categoryIdOf(product) {
  return String(product?.category_id || product?.categoryId || '');
}

function lineSubtotal(line) {
  return money(Number(line?.price || 0) * Number(line?.qty || 0));
}

function lineMatchesScope(line, product, activity) {
  const scopeType = String(activity?.scope_type || 'all');
  if (scopeType === 'all') return true;
  const scopes = Array.isArray(activity?.scopes) ? activity.scopes : [];
  const scopeIds = scopes.map((scope) => String(scope.scope_id || scope.id || '')).filter(Boolean);
  if (scopeType === 'product') {
    return scopeIds.length ? scopeIds.includes(productIdOf(line)) : true;
  }
  if (scopeType === 'category') {
    const categoryId = categoryIdOf(product);
    return !!categoryId && scopeIds.includes(categoryId);
  }
  return false;
}

function normalizeDiscountPercent(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  if (n > 0 && n <= 1) return n * 100;
  return n;
}

function formatDiscountFold(percent) {
  const fold = Number(percent || 0) / 10;
  return fold.toFixed(2).replace(/\.?0+$/, '');
}

function defaultFullPromotionTitle(type) {
  return type === 'full_discount' ? '满折活动' : '满减活动';
}

function buildFullPromotionRules(activity) {
  const type = normalizePromotionType(activity?.type) === 'full_discount' ? 'full_discount' : 'full_reduction';
  const cfg = {
    ...parseConfig(activity?.activity_config),
    ...parseConfig(activity?.rule_config),
  };
  const rules = [];
  if (type === 'full_discount') {
    if (Array.isArray(cfg.full_discount_rules)) {
      for (const rule of cfg.full_discount_rules) {
        const threshold = Number(rule.threshold_amount || rule.threshold || 0);
        const discountPercent = normalizeDiscountPercent(rule.discount_percent ?? rule.discount_rate ?? rule.rate ?? 0);
        if (threshold > 0 && discountPercent > 0 && discountPercent < 100) {
          rules.push({ type, threshold, discountPercent });
        }
      }
    }
    const threshold = Number(activity?.threshold_amount || cfg.threshold_amount || 0);
    const discountPercent = normalizeDiscountPercent(cfg.discount_percent ?? cfg.discount_rate ?? cfg.rate ?? 0);
    if (!rules.length && threshold > 0 && discountPercent > 0 && discountPercent < 100) {
      rules.push({ type, threshold, discountPercent });
    }
    return rules.sort((a, b) => a.threshold - b.threshold || b.discountPercent - a.discountPercent);
  }

  if (Array.isArray(cfg.full_reduction_rules)) {
    for (const rule of cfg.full_reduction_rules) {
      const threshold = Number(rule.threshold_amount || rule.threshold || 0);
      const discount = Number(rule.discount_amount || rule.discount || 0);
      if (threshold > 0 && discount > 0) rules.push({ type, threshold, discount });
    }
  }
  const threshold = Number(activity?.threshold_amount || 0);
  const discount = Number(activity?.discount_amount || 0);
  if (!rules.length && threshold > 0 && discount > 0) {
    rules.push({ type, threshold, discount });
  }
  return rules.sort((a, b) => a.threshold - b.threshold || a.discount - b.discount);
}

function computeFullPromotionRuleDiscount(rule, subtotal) {
  if (!rule || subtotal < Number(rule.threshold || 0)) return 0;
  if (rule.type === 'full_discount') {
    return money(subtotal * ((100 - Number(rule.discountPercent || 0)) / 100));
  }
  return money(Math.min(Number(rule.discount || 0), subtotal));
}

function selectBestFullPromotionRule(rules, subtotal) {
  let bestRule = null;
  let bestAmount = 0;
  for (const rule of rules || []) {
    const amount = computeFullPromotionRuleDiscount(rule, subtotal);
    if (amount <= 0) continue;
    if (amount > bestAmount || (amount === bestAmount && Number(rule.threshold || 0) > Number(bestRule?.threshold || 0))) {
      bestRule = rule;
      bestAmount = amount;
    }
  }
  return { rule: bestRule, amount: bestAmount };
}

function buildDiscountLine(line) {
  return {
    type: normalizePromotionType(line.type),
    source_type: line.type,
    promotion_id: line.promotion_id || line.activity_id || null,
    activity_id: line.activity_id || line.promotion_id || null,
    label: line.label || '',
    amount: money(line.amount),
  };
}

function isActivityStackable(activity) {
  return activity?.stackable === true
    || activity?.stackable === 1
    || activity?.stackable === '1';
}

function exclusiveWith(activity) {
  return parseList(activity?.exclusive_with).map(normalizePromotionType).filter(Boolean);
}

function promotionUsageEntry(pricing = {}, id) {
  if (!id) return { total_count: 0, user_count: 0 };
  const usage = pricing.promotion_usage || pricing.promotionUsage || {};
  const byPromotionId = usage.byPromotionId || usage;
  const entry = byPromotionId[String(id)] || {};
  return {
    total_count: Number(entry.total_count || entry.totalCount || 0),
    user_count: Number(entry.user_count || entry.userCount || 0),
  };
}

function buildUsageLimitReason(activity, pricing = {}, increment = 1) {
  const id = promotionId(activity);
  if (!id) return null;
  const usage = promotionUsageEntry(pricing, id);
  const totalLimit = Number(activity?.usage_limit_total || 0);
  if (totalLimit > 0 && usage.total_count + increment > totalLimit) {
    return {
      promotion_id: id,
      type: normalizePromotionType(activity?.type),
      title: activity?.title || '',
      reason: '活动总使用次数已达上限',
      current_count: usage.total_count,
      limit: totalLimit,
      limit_type: 'total',
      blocking: true,
    };
  }
  const userLimit = Number(activity?.usage_limit_per_user || 0);
  if (userLimit > 0 && usage.user_count + increment > userLimit) {
    return {
      promotion_id: id,
      type: normalizePromotionType(activity?.type),
      title: activity?.title || '',
      reason: '您已达到该活动可使用次数上限',
      current_count: usage.user_count,
      limit: userLimit,
      limit_type: 'per_user',
      blocking: true,
    };
  }
  return null;
}

function buildRewardLines(pricing = {}) {
  const lines = [];
  for (const line of pricing.points_bonus_lines || []) {
    lines.push({
      type: 'points_reward',
      source_type: line.type || 'points_bonus',
      promotion_id: line.activity_id || null,
      label: line.label || '积分奖励',
      multiplier_percent: Number(line.multiplier_percent || 100),
    });
  }
  const earnedPoints = Number(pricing.loyalty?.earned_points || pricing.earned_points || pricing.totalPoints || 0);
  if (earnedPoints > 0) {
    lines.push({
      type: 'points_reward',
      source_type: 'earned_points',
      label: '订单预计获得积分',
      points: earnedPoints,
    });
  }
  return lines;
}

function findPromotionActivity(pricing = {}, id) {
  if (!id) return null;
  const stringId = String(id);
  const flashRows = pricing.flashByProductId instanceof Map
    ? [...pricing.flashByProductId.values()]
    : [];
  return [
    ...flashRows,
    ...(pricing.fullReductionActivities || []),
    ...(pricing.memberPriceActivities || []),
    ...(pricing.pointsBonusActivities || []),
  ].find((activity) => String(promotionId(activity) || '') === stringId) || null;
}

function evaluateFlashSales(pricing = {}) {
  const applied = [];
  const unavailable = [];
  const matchedItems = [];
  const flashRows = pricing.flashByProductId instanceof Map
    ? pricing.flashByProductId
    : new Map();
  for (const line of pricing.orderItems || []) {
    const activityId = line.activityId || line.activity_id || null;
    if (!activityId) continue;
    const row = flashRows.get(productIdOf(line)) || {};
    const activityType = normalizePromotionType(line.activityType || row.type || 'flash_sale');
    const limitReason = buildUsageLimitReason({
      ...row,
      activity_id: activityId,
      title: line.activityTitle || row.title || '',
      type: activityType,
    }, pricing);
    if (limitReason) {
      unavailable.push({
        ...limitReason,
        title: limitReason.title || line.activityTitle || row.title || '活动价',
        matched_product_ids: [productIdOf(line)].filter(Boolean),
      });
      continue;
    }
    const originalPrice = Number(line.basePrice ?? row.product_price ?? pricing.productMap?.[productIdOf(line)]?.price ?? line.price ?? 0);
    const activityPrice = Number(line.price || row.activity_price || 0);
    const discount = Math.max(0, originalPrice - activityPrice) * Number(line.qty || 0);
    const remainingStock = row.activity_stock == null
      ? null
      : Math.max(0, Number(row.activity_stock || 0) - Number(row.sold_count || 0));
    applied.push({
      promotion_id: activityId,
      type: activityType,
      title: line.activityTitle || row.title || (activityType === 'limited_time_discount' ? '限时折扣' : '秒杀活动'),
      discount_amount: money(discount),
      matched_product_ids: [productIdOf(line)].filter(Boolean),
      stackable: isActivityStackable(row),
      exclusive_with: exclusiveWith(row),
      version: Number(row.version || 1),
    });
    matchedItems.push({
      promotion_id: activityId,
      type: activityType,
      product_id: productIdOf(line),
      variant_id: line.variantId || line.variant_id || null,
      qty: Number(line.qty || 0),
      original_price: money(originalPrice),
      activity_price: money(activityPrice),
      remaining_stock: remainingStock,
      limit_per_user: row.limit_per_user == null ? null : Number(row.limit_per_user || 0),
    });
  }
  return { applied, unavailable, matchedItems };
}

function evaluateFullReductions(pricing = {}) {
  const applied = [];
  const unavailable = [];
  const matchedItems = [];
  const productMap = pricing.productMap || {};
  for (const activity of pricing.fullReductionActivities || []) {
    const id = promotionId(activity);
    const type = normalizePromotionType(activity.type) === 'full_discount' ? 'full_discount' : 'full_reduction';
    const defaultTitle = defaultFullPromotionTitle(type);
    const limitReason = buildUsageLimitReason(activity, pricing);
    if (limitReason) {
      unavailable.push({
        ...limitReason,
        title: limitReason.title || activity.title || defaultTitle,
      });
      continue;
    }
    const matchedLines = [];
    let subtotal = 0;
    for (const line of pricing.orderItems || []) {
      const product = productMap[productIdOf(line)] || {};
      if (!lineMatchesScope(line, product, activity)) continue;
      matchedLines.push(line);
      subtotal += lineSubtotal(line);
    }
    const rules = buildFullPromotionRules(activity);
    if (!matchedLines.length || !rules.length) {
      unavailable.push({
        promotion_id: id,
        type,
        title: activity.title || defaultTitle,
        reason: !matchedLines.length ? '当前商品不在活动范围内' : '活动规则未配置',
      });
      continue;
    }

    const { rule: matchedRule, amount: discountAmount } = selectBestFullPromotionRule(rules, subtotal);
    if (matchedRule) {
      applied.push({
        promotion_id: id,
        type,
        title: activity.title || defaultTitle,
        threshold_amount: money(matchedRule.threshold),
        discount_percent: matchedRule.type === 'full_discount' ? money(matchedRule.discountPercent) : undefined,
        discount_label: matchedRule.type === 'full_discount' ? `${formatDiscountFold(matchedRule.discountPercent)}折` : undefined,
        discount_amount: money(Math.min(discountAmount, subtotal)),
        matched_product_ids: [...new Set(matchedLines.map(productIdOf).filter(Boolean))],
        stackable: isActivityStackable(activity),
        exclusive_with: exclusiveWith(activity),
        version: Number(activity.version || 1),
      });
      for (const line of matchedLines) {
        matchedItems.push({
          promotion_id: id,
          type,
          product_id: productIdOf(line),
          variant_id: line.variantId || line.variant_id || null,
          qty: Number(line.qty || 0),
          subtotal: lineSubtotal(line),
        });
      }
      continue;
    }

    const nextRule = rules.find((rule) => subtotal < rule.threshold);
    unavailable.push({
      promotion_id: id,
      type,
      title: activity.title || defaultTitle,
      reason: '未达到活动门槛',
      current_amount: money(subtotal),
      threshold_amount: money(nextRule?.threshold || 0),
      shortfall_amount: money(Math.max(0, Number(nextRule?.threshold || 0) - subtotal)),
    });
  }
  return { applied, unavailable, matchedItems };
}

function buildStackingResult(pricing = {}, applied = []) {
  const flashRows = pricing.flashByProductId instanceof Map ? [...pricing.flashByProductId.values()] : [];
  const fullReductionActivities = pricing.fullReductionActivities || [];
  const memberPriceActivities = pricing.memberPriceActivities || [];
  const pointsBonusActivities = pricing.pointsBonusActivities || [];
  const activities = [...flashRows, ...fullReductionActivities, ...memberPriceActivities, ...pointsBonusActivities];
  const couponStackAllowed = activities.every((activity) => activity.allow_coupon_stack !== 0);
  const pointsStackAllowed = activities.every((activity) => activity.allow_points_stack !== 0);
  const rewardAllowed = activities.every((activity) => activity.allow_reward !== 0);
  const conflicts = [];
  const activeActivityPromotions = applied
    .filter((item) => item.promotion_id)
    .map((item) => ({
      promotion_id: String(item.promotion_id),
      type: normalizePromotionType(item.type),
      title: item.title || '',
      stackable: item.stackable,
      exclusive_with: Array.isArray(item.exclusive_with)
        ? item.exclusive_with.map(normalizePromotionType)
        : [],
    }));
  const uniqueActiveActivities = [];
  const seen = new Set();
  for (const item of activeActivityPromotions) {
    if (seen.has(item.promotion_id)) continue;
    seen.add(item.promotion_id);
    uniqueActiveActivities.push(item);
  }
  for (const item of uniqueActiveActivities) {
    if (item.stackable === false && uniqueActiveActivities.some((other) => other.promotion_id !== item.promotion_id)) {
      conflicts.push({
        promotion_id: item.promotion_id,
        type: item.type,
        title: item.title,
        reason: '该活动不可与其他活动叠加使用',
        blocking: true,
      });
    }
    for (const other of applied) {
      const otherType = normalizePromotionType(other.type);
      if (!otherType || other.promotion_id === item.promotion_id) continue;
      if (!item.exclusive_with.includes(otherType)) continue;
      conflicts.push({
        promotion_id: item.promotion_id,
        type: item.type,
        title: item.title,
        conflict_type: otherType,
        conflict_title: other.title || '',
        reason: `该活动不可与「${other.title || otherType}」叠加使用`,
        blocking: true,
      });
    }
  }
  return {
    stackable: couponStackAllowed && pointsStackAllowed,
    coupon_stack_allowed: couponStackAllowed,
    points_stack_allowed: pointsStackAllowed,
    reward_allowed: rewardAllowed,
    conflicts,
    exclusive_with: activities
      .flatMap((activity) => exclusiveWith(activity))
      .map(normalizePromotionType),
  };
}

function buildOrderSnapshot(pricing = {}, body = {}) {
  return {
    goods_amount: money(pricing.rawAmount),
    activity_discount_amount: money(pricing.activityDiscountAmount || pricing.flashSaleDiscount + pricing.fullReductionDiscount),
    coupon_discount_amount: money(pricing.couponDiscount || 0),
    shipping_fee: money(pricing.shippingFee),
    total_discount_amount: money(pricing.totalDiscountAmount || 0),
    final_amount: money(pricing.finalTotal),
    coupon_id: body.coupon_id || null,
    item_count: (body.items || pricing.orderItems || []).reduce((sum, item) => sum + Number(item.qty || 0), 0),
    items: (pricing.orderItems || []).map((line) => ({
      product_id: productIdOf(line),
      variant_id: line.variantId || line.variant_id || null,
      qty: Number(line.qty || 0),
      unit_price: money(line.price),
      subtotal: lineSubtotal(line),
      activity_id: line.activityId || line.activity_id || null,
      activity_type: line.activityType || null,
    })),
  };
}

function evaluatePricingResult({ pricing = {}, body = {}, userId = null } = {}) {
  const pricingData = /** @type {any} */ (pricing || {});
  const bodyData = /** @type {any} */ (body || {});
  const flash = evaluateFlashSales(pricingData);
  const fullReduction = evaluateFullReductions(pricingData);
  const discountLines = (pricingData.discount_lines || []).map(buildDiscountLine);
  const rewardLines = buildRewardLines(pricingData);
  const promotionDiscountUnavailable = [];
  const usablePromotionDiscountLines = [];
  for (const line of discountLines.filter((item) => ['coupon', 'member_price'].includes(item.type) && Number(item.amount || 0) > 0)) {
    if (line.type !== 'member_price' || !line.promotion_id) {
      usablePromotionDiscountLines.push(line);
      continue;
    }
    const activity = findPromotionActivity(pricingData, line.promotion_id) || {
      activity_id: line.promotion_id,
      title: line.label,
      type: 'member_price',
    };
    const limitReason = buildUsageLimitReason(activity, pricingData);
    if (limitReason) {
      promotionDiscountUnavailable.push({
        ...limitReason,
        title: limitReason.title || line.label || '会员价',
      });
      continue;
    }
    usablePromotionDiscountLines.push(line);
  }
  const rewardUnavailable = [];
  const usableRewardLines = [];
  for (const line of rewardLines) {
    if (line.source_type === 'earned_points' || !line.promotion_id) {
      usableRewardLines.push(line);
      continue;
    }
    const activity = findPromotionActivity(pricingData, line.promotion_id) || {
      activity_id: line.promotion_id,
      title: line.label,
      type: 'points_reward',
    };
    const limitReason = buildUsageLimitReason(activity, pricingData);
    if (limitReason) {
      rewardUnavailable.push({
        ...limitReason,
        title: limitReason.title || line.label || '积分奖励',
      });
      continue;
    }
    usableRewardLines.push(line);
  }
  const applied = [
    ...flash.applied,
    ...fullReduction.applied,
    ...usablePromotionDiscountLines.map((line) => {
      const activity = findPromotionActivity(pricingData, line.promotion_id) || {};
      return {
        promotion_id: line.promotion_id || null,
        type: line.type,
        source_type: line.source_type,
        title: line.label,
        discount_amount: line.amount,
        stackable: line.promotion_id ? isActivityStackable(activity) : undefined,
        exclusive_with: line.promotion_id ? exclusiveWith(activity) : [],
        version: Number(activity.version || 1),
      };
    }),
    ...usableRewardLines
      .filter((line) => line.source_type !== 'earned_points')
      .map((line) => ({
        promotion_id: line.promotion_id || null,
        type: 'points_reward',
        title: line.label,
        reward: {
          multiplier_percent: line.multiplier_percent,
        },
        stackable: isActivityStackable(findPromotionActivity(pricingData, line.promotion_id) || {}),
        exclusive_with: exclusiveWith(findPromotionActivity(pricingData, line.promotion_id) || {}),
      })),
  ];
  const stackingResult = buildStackingResult(pricingData, applied);
  const unavailableReasons = [
    ...flash.unavailable,
    ...fullReduction.unavailable,
    ...promotionDiscountUnavailable,
    ...rewardUnavailable,
    ...stackingResult.conflicts,
  ];
  const blockingReasons = unavailableReasons.filter((item) => item && item['blocking']);

  return {
    engine_version: PROMOTION_ENGINE_VERSION,
    user_id: userId || null,
    eligible: blockingReasons.length === 0,
    applied,
    unavailable_reasons: unavailableReasons,
    discount_lines: discountLines,
    reward_lines: usableRewardLines,
    matched_items: [...flash.matchedItems, ...fullReduction.matchedItems],
    stacking_result: stackingResult,
    order_snapshot: buildOrderSnapshot(pricingData, bodyData),
    snapshots: applied.map((item) => ({
      promotion_id: item.promotion_id || null,
      type: normalizePromotionType(item.type),
      title: item.title || '',
      version: Number((/** @type {any} */ (item)).version || 1),
    })),
  };
}

function emptyEvaluation() {
  return {
    engine_version: PROMOTION_ENGINE_VERSION,
    eligible: true,
    applied: [],
    unavailable_reasons: [],
    discount_lines: [],
    reward_lines: [],
    matched_items: [],
    stacking_result: {
      stackable: true,
      coupon_stack_allowed: true,
      points_stack_allowed: true,
      reward_allowed: true,
      exclusive_with: [],
      conflicts: [],
    },
    snapshots: [],
  };
}

async function listRuntimePromotions(query = {}) {
  const result = await marketingService.getPromotions(query);
  return result.data;
}

async function evaluatePromotionsForCart(input = {}) {
  if (input.pricing) {
    return evaluatePricingResult(input);
  }
  const evaluation = emptyEvaluation();
  const promotions = await listRuntimePromotions({ pageSize: input.pageSize || 80 });
  evaluation.snapshots = (promotions.list || []).map((promotion) => ({
    id: promotion.id,
    type: promotion.type,
    legacy_type: promotion.legacy_type,
    title: promotion.title,
    version: promotion.version,
    stackable: promotion.stackable,
    exclusive_with: promotion.exclusive_with,
    rule_config: promotion.rule_config,
  }));
  return evaluation;
}

module.exports = {
  PROMOTION_ENGINE_VERSION,
  emptyEvaluation,
  listRuntimePromotions,
  evaluatePromotionsForCart,
  evaluatePricingResult,
};

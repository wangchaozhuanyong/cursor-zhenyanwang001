const { ForbiddenError, ValidationError } = require('../../errors');
const repo = require('./repository/order.repository');
const siteSettingsRepo = require('./repository/siteSettings.repository');
const sstTax = require('./sstTax');
const { computeShippingFee, estimateWeightFromItems } = require('../../utils/shippingFee');

function getUserApi() {
  return /** @type {any} */ (require('../user')).api || {};
}

function getLoyaltyApi() {
  return /** @type {any} */ (require('../loyalty')).api || {};
}

function getSiteCapabilitiesApi() {
  return /** @type {any} */ (require('../siteCapabilities')).api || {};
}

function getAuthApi() {
  return /** @type {any} */ (require('../auth')).api || {};
}

function parseActivityConfig(raw) {
  if (!raw) return null;
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function parseIdList(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map((x) => String(x || '').trim()).filter(Boolean);
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map((x) => String(x || '').trim()).filter(Boolean);
    } catch {
      return raw.split(',').map((x) => x.trim()).filter(Boolean);
    }
  }
  return [];
}

function calculateCouponDiscount(coupon, rawAmount, shippingFee) {
  const type = coupon.type === 'amount' ? 'fixed' : coupon.type === 'percent' ? 'percentage' : coupon.type;
  const value = parseFloat(coupon.value) || 0;
  if (type === 'fixed') return Math.min(value, rawAmount);
  if (type === 'percentage') return Math.min(rawAmount, Math.floor(rawAmount * value / 100));
  if (type === 'shipping') return Math.min(shippingFee, value > 0 ? value : shippingFee);
  return 0;
}

function money(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function parseJsonArray(raw, fallback = []) {
  if (!raw) return fallback;
  if (Array.isArray(raw)) return raw;
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : fallback;
  } catch {
    return fallback;
  }
}

function isPaymentMethodAllowedForPoints(settings, paymentMethod) {
  const mode = settings?.payment_points_mode || 'all';
  const methods = parseJsonArray(settings?.allowed_payment_methods, []);
  if (mode === 'all') return true;
  if (mode === 'disabled') return false;
  if (mode === 'include') return methods.includes(paymentMethod);
  if (mode === 'exclude') return !methods.includes(paymentMethod);
  return true;
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function roundEarnedPoints(value, mode) {
  if (mode === 'ceil') return Math.ceil(value);
  if (mode === 'round') return Math.round(value);
  return Math.floor(value);
}

function computeEarnedPointsBySettings(settings, amountAfterDiscount, fallbackPoints) {
  if (!settings || !settings.earn_enabled) return 0;
  if (settings.earn_basis === 'legacy_product_points') return Math.max(0, Math.trunc(fallbackPoints || 0));
  const currencyUnit = Number(settings.earn_currency_unit || 1);
  const pointsUnit = Number(settings.earn_points_unit || 1);
  const mult = Number(settings.earn_multiplier_percent || 100) / 100;
  if (currencyUnit <= 0 || pointsUnit <= 0 || amountAfterDiscount <= 0) return 0;
  const raw = (amountAfterDiscount / currencyUnit) * pointsUnit * mult;
  return Math.max(0, roundEarnedPoints(raw, settings.earn_rounding || 'floor'));
}

function lineMatchesActivityScope(oi, product, activity, scopes) {
  const scopeType = String(activity.scope_type || 'all');
  if (scopeType === 'all') return true;
  const scopeIds = scopes.length ? scopes.map((s) => s.scope_id) : [];
  if (scopeType === 'product') {
    if (scopeIds.length) return scopeIds.includes(oi.productId);
    return true;
  }
  if (scopeType === 'category') {
    const cid = product?.category_id;
    if (!cid) return false;
    return scopeIds.length ? scopeIds.includes(String(cid)) : false;
  }
  return false;
}

function lineMatchesCouponScope(oi, product, coupon) {
  const usableScope = coupon.usable_scope_type || coupon.scope_type || 'all';
  if (usableScope === 'all') return true;
  const usableProductIds = parseIdList(coupon.usable_product_ids);
  if (usableScope === 'product') {
    return !usableProductIds.length || usableProductIds.includes(String(oi.productId));
  }
  const usableCategoryIds = parseIdList(coupon.usable_category_ids || coupon.category_ids);
  if (usableScope === 'category') {
    const categoryId = product?.category_id;
    return !!categoryId && usableCategoryIds.includes(String(categoryId));
  }
  return true;
}

function computeCouponEligibleSubtotal(coupon, orderItems, productMap, rawAmount, fullReductionDiscount, goodsAmountAfterFullReduction) {
  const usableScope = coupon.usable_scope_type || coupon.scope_type || 'all';
  if (usableScope === 'all') return money(goodsAmountAfterFullReduction);

  let eligibleRaw = 0;
  for (const oi of orderItems) {
    const product = productMap[oi.productId];
    if (lineMatchesCouponScope(oi, product, coupon)) {
      eligibleRaw += Number(oi.price || 0) * Number(oi.qty || 0);
    }
  }
  if (eligibleRaw <= 0) return 0;

  const allocatedFullReduction = rawAmount > 0
    ? (Number(fullReductionDiscount || 0) * eligibleRaw) / rawAmount
    : 0;
  return money(Math.max(0, eligibleRaw - allocatedFullReduction));
}

/** 婊″噺锛氭寜娲诲姩鑱氬悎锛岃鍙?activity_config 澶氭。瑙勫垯 */
function computeFullReductionDiscount(orderItems, productMap, fullReductionActivities) {
  let sum = 0;
  for (const act of fullReductionActivities) {
    const scopes = act.scopes || [];
    let subtotal = 0;
    for (const oi of orderItems) {
      const product = productMap[oi.productId];
      if (!lineMatchesActivityScope(oi, product, act, scopes)) continue;
      subtotal += oi.price * oi.qty;
    }
    if (subtotal <= 0) continue;

    const cfg = parseActivityConfig(act.activity_config);
    const rules = [];
    if (Array.isArray(cfg?.full_reduction_rules) && cfg.full_reduction_rules.length) {
      for (const r of cfg.full_reduction_rules) {
        const th = Number(r.threshold_amount || 0);
        const disc = Number(r.discount_amount || 0);
        if (th > 0 && disc > 0) rules.push({ th, disc });
      }
    } else {
      const th = act.threshold_amount != null && act.threshold_amount !== '' ? Number(act.threshold_amount) : 0;
      const disc = act.discount_amount != null && act.discount_amount !== '' ? Number(act.discount_amount) : 0;
      if (th > 0 && disc > 0) rules.push({ th, disc });
    }
    let best = 0;
    for (const r of rules) {
      if (subtotal >= r.th) best = Math.max(best, r.disc);
    }
    if (best > 0) sum += Math.min(best, subtotal);
  }
  return sum;
}

function computeFlashSaleSavings(orderItems, flashByProductId, productMap) {
  let saved = 0;
  for (const oi of orderItems) {
    const flash = flashByProductId.get(oi.productId);
    if (!flash) continue;
    const product = productMap[oi.productId];
    const original = parseFloat(product?.price || oi.price);
    const flashPrice = parseFloat(flash.activity_price);
    if (flashPrice < original) saved += (original - flashPrice) * oi.qty;
  }
  return saved;
}

function assertCouponUsableOnOrder({
  uc,
  rawAmount = 0,
  fullReductionDiscount = 0,
  goodsAmountAfterFullReduction,
  shippingFee,
  orderItems,
  productMap,
  hasActivityDiscount,
  activityAllowsCoupon,
}) {
  const userApi = getUserApi();
  const effectiveCoupon = userApi.buildEffectiveCoupon(uc);
  const runtimeStatus = userApi.resolveUserCouponRuntimeStatus({ ...uc, status: uc.user_coupon_status || uc.status });
  if (runtimeStatus === 'pending') throw new ValidationError('优惠券未到使用时间');
  if (runtimeStatus === 'expired') throw new ValidationError('优惠券已过期');
  if (runtimeStatus === 'invalidated') throw new ValidationError('优惠券已被作废');
  if (runtimeStatus !== 'available') throw new ValidationError('优惠券不可用');
  const usableScope = effectiveCoupon.usable_scope_type || effectiveCoupon.scope_type || 'all';
  const usableProductIds = parseIdList(effectiveCoupon.usable_product_ids);
  const usableCategoryIds = parseIdList(effectiveCoupon.usable_category_ids);

  if (usableScope === 'product' && usableProductIds.length) {
    const ids = orderItems.map((oi) => oi.productId);
    if (!ids.some((id) => usableProductIds.includes(id))) {
      throw new ValidationError('优惠券不适用于当前商品');
    }
  }
  if (usableScope === 'category' && usableCategoryIds.length) {
    const cats = [...new Set(orderItems.map((oi) => productMap[oi.productId]?.category_id).filter(Boolean))];
    if (!cats.some((cid) => usableCategoryIds.includes(String(cid)))) {
      throw new ValidationError('优惠券不适用于当前商品分类');
    }
  }
  if (effectiveCoupon.scope_type === 'category') {
    const allowedCategoryIds = parseIdList(effectiveCoupon.category_ids);
    if (allowedCategoryIds.length) {
      const orderCategoryIds = [...new Set(orderItems.map((oi) => productMap[oi.productId]?.category_id).filter(Boolean))];
      if (!orderCategoryIds.some((cid) => allowedCategoryIds.includes(String(cid)))) {
        throw new ValidationError('优惠券不适用于当前商品分类');
      }
    }
  }

  const eligibleSubtotal = computeCouponEligibleSubtotal(
    effectiveCoupon,
    orderItems,
    productMap,
    rawAmount,
    fullReductionDiscount,
    goodsAmountAfterFullReduction,
  );
  const minAmount = Number(effectiveCoupon.min_amount || 0);
  if (eligibleSubtotal < minAmount) {
    throw new ValidationError('订单金额未满足优惠券使用门槛');
  }

  if (hasActivityDiscount && effectiveCoupon.stackable_with_activity === false) {
    throw new ValidationError('该优惠券不可与营销活动叠加使用');
  }
  if (hasActivityDiscount && activityAllowsCoupon === false) {
    throw new ValidationError('当前活动不可与优惠券叠加');
  }

  const discountBase = effectiveCoupon.type === 'shipping' ? goodsAmountAfterFullReduction : eligibleSubtotal;
  const couponDiscount = calculateCouponDiscount(effectiveCoupon, discountBase, shippingFee);
  if (couponDiscount <= 0) {
    throw new ValidationError(effectiveCoupon.type === 'shipping' ? '当前订单没有可抵扣的运费' : '优惠券无法用于当前订单');
  }
  return couponDiscount;
}

/**
 * 鏋勫缓璁㈠崟閲戦锛堥瑙堜笌涓嬪崟鍏辩敤锛? * @param {import('mysql2/promise').PoolConnection|null} conn
 */
async function buildOrderPricing(userId, body, conn = null) {
  const q = conn || repo.getPool();
  const { items, coupon_id, shipping_template_id, estimated_weight_kg } = body;
  const [pointsEnabled, couponEnabled] = await Promise.all([
    getSiteCapabilitiesApi().isCapabilityEnabled('pointsEnabled'),
    getSiteCapabilitiesApi().isCapabilityEnabled('couponEnabled'),
  ]);
  if (!couponEnabled && (coupon_id || body.coupon_title)) {
    throw new ForbiddenError('优惠券功能已关闭');
  }
  if (!pointsEnabled && (body.use_points || Number(body.points_to_use || 0) > 0)) {
    throw new ForbiddenError('积分功能已关闭');
  }

  const productIds = items.map((i) => i.product_id);
  const products = conn
    ? await repo.selectProductsForUpdate(conn, productIds)
    : await repo.selectProductsByIds(q, productIds);
  const productMap = Object.fromEntries(products.map((p) => [p.id, p]));

  const requestedVariantIds = items.map((i) => i.variant_id).filter(Boolean);
  const requestedVariants = conn
    ? await repo.selectVariantsForUpdate(conn, requestedVariantIds)
    : await repo.selectVariantsByIds(q, requestedVariantIds);
  const defaultVariants = conn
    ? await repo.selectDefaultVariantsForProducts(conn, productIds)
    : await repo.selectDefaultVariantsForProductsRead(q, productIds);

  const variantById = new Map(requestedVariants.map((v) => [v.id, v]));
  const defaultVariantByProductId = new Map(defaultVariants.map((v) => [v.product_id, v]));

  const flashRows = conn
    ? await repo.selectFlashSaleActivityItemsForUpdate(conn, productIds)
    : await repo.selectFlashSaleActivityItemsRead(q, productIds);
  const flashByProductId = new Map();
  for (const row of flashRows) {
    if (!flashByProductId.has(row.product_id)) flashByProductId.set(row.product_id, row);
  }

  const fullReductionActivities = conn
    ? await repo.selectActiveFullReductionActivitiesForUpdate(conn)
    : await repo.selectActiveFullReductionActivitiesRead(q);
  const pointsBonusActivitiesRaw = conn
    ? await repo.selectActivePointsBonusActivitiesForUpdate(conn)
    : await repo.selectActivePointsBonusActivitiesRead(q);
  let pointsBonusUserContext = {};
  if (userId) {
    const { klYear } = require('../../utils/birthdayWindow');
    const { klDateString } = require('../../utils/klDateRange');
    const birthdayRow = await getAuthApi().selectUserBirthdayFields(userId);
    const consumedBirthdayActivityIds = await repo.selectBirthdayBonusActivityIdsUsedInYear(
      q,
      userId,
      klYear(),
    );
    pointsBonusUserContext = {
      birthday: birthdayRow?.birthday || null,
      today: klDateString(),
      consumedBirthdayActivityIds,
    };
  }
  const pointsBonusActivities = pointsBonusActivitiesRaw;

  let rawAmount = 0;
  let legacyTotalPoints = 0;
  const orderItems = items.map((item) => {
    const p = productMap[item.product_id];
    const variant = item.variant_id
      ? variantById.get(item.variant_id)
      : defaultVariantByProductId.get(item.product_id);
    const flash = flashByProductId.get(item.product_id);
    const basePrice = parseFloat(variant?.price ?? p?.price ?? 0);
    const price = flash ? parseFloat(flash.activity_price) : basePrice;
    rawAmount += price * item.qty;
    legacyTotalPoints += (p?.points || 0) * item.qty;
    return {
      productId: p.id,
      variantId: variant?.id || null,
      name: p.name,
      price,
      basePrice,
      qty: item.qty,
      activityId: flash?.activity_id || null,
      activityTitle: flash?.title || null,
      activityType: flash ? 'flash_sale' : null,
    };
  });

  const flashSaleDiscount = computeFlashSaleSavings(orderItems, flashByProductId, productMap);
  const fullReductionDiscount = computeFullReductionDiscount(orderItems, productMap, fullReductionActivities);
  const goodsAmountAfterFullReduction = Math.max(0, rawAmount - fullReductionDiscount);

  let shippingFee = 0;
  const tpl = shipping_template_id
    ? (conn
      ? await repo.selectShippingTemplate(conn, shipping_template_id)
      : await repo.selectShippingTemplate(q, shipping_template_id))
    : (conn
      ? await repo.selectDefaultEnabledShippingTemplate(conn)
      : await repo.selectDefaultEnabledShippingTemplate(q));
  if (tpl) {
    const w = estimated_weight_kg != null && Number.isFinite(Number(estimated_weight_kg))
      ? Number(estimated_weight_kg)
      : estimateWeightFromItems(items);
    shippingFee = computeShippingFee(tpl, rawAmount, w);
  }
  const originalShippingFee = shippingFee;

  const hasActivityDiscount = flashSaleDiscount > 0 || fullReductionDiscount > 0;
  const activityAllowsCoupon = fullReductionActivities.every((a) => !!a.allow_coupon_stack)
    && [...flashByProductId.values()].every((f) => f.allow_coupon_stack !== 0);

  let couponDiscount = 0;
  let couponTitle = null;
  let couponType = null;
  if (coupon_id && userId) {
    const uc = conn
      ? await repo.selectUserCouponForUpdate(conn, coupon_id, userId)
      : await repo.selectUserCouponRead(q, coupon_id, userId);
    if (!uc) throw new ValidationError('优惠券不存在、已使用或不可用');
    const effectiveCoupon = getUserApi().buildEffectiveCoupon(uc);
    couponDiscount = assertCouponUsableOnOrder({
      uc,
      rawAmount,
      fullReductionDiscount,
      goodsAmountAfterFullReduction,
      shippingFee,
      orderItems,
      productMap,
      hasActivityDiscount,
      activityAllowsCoupon,
    });
    couponTitle = effectiveCoupon.title;
    couponType = effectiveCoupon.type;
  }

  const nonShippingGoodsCoupon = couponType === 'shipping' ? 0 : couponDiscount;
  const loyaltyApi = getLoyaltyApi();
  const pointsSettings = await loyaltyApi.selectPointsSettings();
  const rewardSettings = await loyaltyApi.selectRewardSettings();
  const productRules = await loyaltyApi.selectProductRules(q);
  const memberLevel = await loyaltyApi.selectUserMemberLevel(q, userId);
  const memberDiscountRate = memberLevel
    ? Math.min(1, Math.max(0.01, Number(memberLevel.discount_rate || 1)))
    : 1;
  const memberFreeShipping = !!memberLevel?.free_shipping_enabled;
  if (memberFreeShipping && shippingFee > 0) {
    shippingFee = 0;
  }
  const pointMethods = parseJsonArray(pointsSettings?.allowed_payment_methods, ['online', 'whatsapp']);
  const rewardMethods = parseJsonArray(rewardSettings?.allowed_payment_methods, ['online', 'whatsapp']);

  const userApi = getUserApi();
  const pointsBalance = userId ? Number(await userApi.selectUserPointsBalance(userId)) : 0;
  const hasPendingPointsReverse = userId ? await userApi.hasPendingReverse(userId) : false;
  const rewardBalance = userId ? Number(await userApi.sumUserRewardTransactions(q, userId)) : 0;

  const usePoints = pointsEnabled && !!body.use_points;
  const useRewardCashRequested = !!body.use_reward_cash;
  const requestPointsToUse = Number(body.points_to_use || 0);
  if (usePoints && !isPaymentMethodAllowedForPoints(pointsSettings, body.payment_method)) {
    throw new ValidationError('当前支付方式不支持积分抵扣');
  }
  if (usePoints && useRewardCashRequested && !loyaltyApi.normalizePointsSettings(pointsSettings).allow_with_reward_cash) {
    throw new ValidationError('返现余额不能与积分抵扣同时使用');
  }
  const memberLevelDiscountBase = Math.max(0, rawAmount - fullReductionDiscount - nonShippingGoodsCoupon);
  const memberLevelDiscount = memberDiscountRate < 1
    ? loyaltyApi.pointsMoney(memberLevelDiscountBase * (1 - memberDiscountRate))
    : 0;
  const memberShippingDiscount = memberFreeShipping ? loyaltyApi.pointsMoney(originalShippingFee) : 0;
  const totalGoodsDiscount = fullReductionDiscount + couponDiscount + memberLevelDiscount;
  const basePayableBeforeLoyaltyWithMember = Math.max(0, rawAmount - totalGoodsDiscount + shippingFee);
  const goodsInclusiveTaxable = Math.max(0, rawAmount - fullReductionDiscount - nonShippingGoodsCoupon - memberLevelDiscount);
  const sstRows = await siteSettingsRepo.selectSiteSettingsByKeys(['sstEnabled', 'sstRatePercent', 'sstLabel']);
  const sstSettings = sstTax.parseSstSettingsFromSiteSettingsRows(sstRows);
  const taxSnap = sstTax.buildOrderTaxSnapshot(sstSettings, goodsInclusiveTaxable);
  const goodsDiscountForAllocation = fullReductionDiscount + nonShippingGoodsCoupon + memberLevelDiscount;
  const loyaltyItems = orderItems.map((oi) => {
    const lineSubtotal = oi.price * oi.qty;
    const discountShare = rawAmount > 0 ? (goodsDiscountForAllocation * lineSubtotal) / rawAmount : 0;
    const memberDiscountShare = rawAmount > 0 && memberLevelDiscount > 0
      ? (memberLevelDiscount * lineSubtotal) / rawAmount
      : 0;
    const product = productMap[oi.productId] || {};
    const fullReductionBlocksPoints = fullReductionActivities.some((act) => act.allow_points_stack === 0 && lineMatchesActivityScope(oi, product, act, act.scopes || []));
    const flash = flashByProductId.get(oi.productId);
    return {
      product_id: oi.productId,
      qty: oi.qty,
      price: oi.price,
      subtotal: lineSubtotal,
      line_paid_amount: Math.max(0, lineSubtotal - discountShare),
      member_discount_share: loyaltyApi.pointsMoney(memberDiscountShare),
      activity_id: oi.activityId,
      allow_points_stack: flash ? flash.allow_points_stack !== 0 : !fullReductionBlocksPoints,
    };
  });
  const pointsBonusResolved = loyaltyApi.resolvePointsBonusForPricing({
    pointsBonusActivities,
    orderItems,
    productMap,
    orderGoodsAmount: goodsInclusiveTaxable,
    userContext: pointsBonusUserContext,
  });
  const bonusByProductId = new Map(
    (pointsBonusResolved.item_results || []).map((row) => [String(row.product_id), row]),
  );
  const loyaltyItemsWithBonus = loyaltyItems.map((item) => {
    const bonus = /** @type {any} */ (bonusByProductId.get(String(item.product_id)) || {});
    return {
      ...item,
      points_bonus_multiplier_percent: bonus.points_bonus_multiplier_percent || 100,
      points_bonus_activity_id: bonus.points_bonus_activity_id || null,
      points_bonus_activity_title: bonus.points_bonus_activity_title || '',
      points_bonus_bonus_kind: bonus.points_bonus_bonus_kind || 'normal',
    };
  });
  const pointsRedeem = hasPendingPointsReverse
    ? {
      max_usable_points: 0,
      points_used: 0,
      points_discount_amount: 0,
      point_value_myr: Number(pointsSettings?.point_value_myr || 0.01),
      points_per_currency: Number(pointsSettings?.points_per_currency || 100),
      disabled_reason: '存在待扣回积分，暂不可使用积分抵扣',
      adjusted: usePoints,
      adjusted_reason: usePoints ? 'pending_reverse' : '',
      item_results: [],
    }
    : loyaltyApi.calculateMaxUsablePoints({
      settings: pointsSettings,
      userPointsBalance: pointsBalance,
      orderItems: loyaltyItemsWithBonus,
      productMap,
      productRules,
      coupon: couponDiscount > 0 ? { title: couponTitle, type: couponType } : null,
      discounts: { coupon_amount: couponDiscount, full_reduction_amount: fullReductionDiscount, member_level_discount: memberLevelDiscount },
      useRewardCash: useRewardCashRequested,
      pointsToUse: pointsEnabled && usePoints ? (requestPointsToUse > 0 ? requestPointsToUse : pointsBalance) : 0,
    });
  const max_usable_points = pointsEnabled ? (pointsRedeem.max_usable_points || 0) : 0;
  const points_used = usePoints ? Number(pointsRedeem.points_used || 0) : 0;
  const points_discount_amount = usePoints ? Number(pointsRedeem.points_discount_amount || 0) : 0;

  const afterPoints = Math.max(0, basePayableBeforeLoyaltyWithMember - points_discount_amount);
  const rewardMaxByPercent = afterPoints * (Number(rewardSettings?.max_redeem_percent || 100) / 100);
  const rewardMaxByAmount = Number(rewardSettings?.max_redeem_amount || 0) > 0
    ? Number(rewardSettings?.max_redeem_amount || 0)
    : Number.MAX_SAFE_INTEGER;
  const max_usable_reward_cash = (
    rewardSettings?.wallet_redeem_enabled
    && afterPoints >= Number(rewardSettings?.min_redeem_amount || 0)
  ) ? clamp(Math.min(rewardBalance, rewardMaxByPercent, rewardMaxByAmount, afterPoints), 0, afterPoints) : 0;

  const useRewardCash = useRewardCashRequested;
  const requestRewardCash = Number(body.reward_cash_amount || 0);
  const reward_cash_used = useRewardCash
    ? clamp(requestRewardCash > 0 ? requestRewardCash : max_usable_reward_cash, 0, max_usable_reward_cash)
    : 0;
  const reward_cash_discount_amount = reward_cash_used;

  const finalTotal = Math.max(0, basePayableBeforeLoyaltyWithMember - points_discount_amount - reward_cash_discount_amount);
  const paymentAllowsPoints = isPaymentMethodAllowedForPoints(pointsSettings, body.payment_method);
  const earnOrderItems = loyaltyItemsWithBonus.map((item) => ({
    ...item,
    line_paid_amount: Math.max(0, item.line_paid_amount - (pointsSettings?.earn_after_points_redeem ? points_discount_amount * (item.line_paid_amount / Math.max(goodsInclusiveTaxable || 1, 1)) : 0)),
  }));
  const pointsEarn = paymentAllowsPoints
    ? loyaltyApi.calculateOrderEarnedPoints({
      settings: pointsSettings,
      productRules,
      orderItems: earnOrderItems,
      productMap,
      memberLevel,
      coupon: couponDiscount > 0 ? { title: couponTitle, type: couponType } : null,
      discounts: { coupon_amount: couponDiscount, full_reduction_amount: fullReductionDiscount, member_level_discount: memberLevelDiscount },
      pointsBonusSnapshots: pointsBonusResolved.points_bonus_snapshots || [],
      maxBonusPoints: pointsBonusResolved.max_bonus_points || 0,
    })
    : {
      earned_points: 0,
      item_results: [],
      product_rule_snapshots: [],
      disabled_reason: '当前支付方式不支持积分',
      calculation_version: loyaltyApi.POINTS_CALCULATION_VERSION,
    };
  const earned_points = Number(pointsEarn.earned_points || 0);
  const points_bonus_lines = (pointsBonusResolved.points_bonus_snapshots || [])
    .filter((snap) => Number(snap.multiplier_percent || 100) > 100)
    .map((snap) => ({
      type: 'points_bonus',
      label: snap.bonus_kind === 'holiday' && snap.holiday_name
        ? `${snap.holiday_name} ${Number(snap.multiplier_percent) / 100} 倍积分`
        : snap.bonus_kind === 'birthday'
          ? `生日 ${Number(snap.multiplier_percent) / 100} 倍积分`
          : `${snap.title || '积分活动'} ${Number(snap.multiplier_percent) / 100} 倍积分`,
      multiplier_percent: Number(snap.multiplier_percent || 100),
      activity_id: snap.activity_id,
    }));

  const discount_lines = [];
  if (flashSaleDiscount > 0) {
    discount_lines.push({ type: 'flash_sale', label: '秒杀优惠', amount: loyaltyApi.pointsMoney(flashSaleDiscount) });
  }
  if (fullReductionDiscount > 0) {
    discount_lines.push({ type: 'full_reduction', label: '满减优惠', amount: loyaltyApi.pointsMoney(fullReductionDiscount) });
  }
  if (couponDiscount > 0) {
    discount_lines.push({
      type: 'coupon',
      label: couponTitle ? `优惠券抵扣：${couponTitle}` : '优惠券抵扣',
      amount: loyaltyApi.pointsMoney(couponDiscount),
    });
  }
  if (memberLevelDiscount > 0) {
    discount_lines.push({
      type: 'member_level_discount',
      label: memberLevel?.name ? `会员折扣：${memberLevel.name}` : '会员折扣',
      amount: loyaltyApi.pointsMoney(memberLevelDiscount),
    });
  }
  if (memberShippingDiscount > 0) {
    discount_lines.push({
      type: 'member_free_shipping',
      label: memberLevel?.name ? `会员免邮：${memberLevel.name}` : '会员免邮',
      amount: loyaltyApi.pointsMoney(memberShippingDiscount),
    });
  }
  if (points_discount_amount > 0) {
    discount_lines.push({ type: 'points', label: '积分抵扣', amount: loyaltyApi.pointsMoney(points_discount_amount) });
  }
  if (reward_cash_discount_amount > 0) {
    discount_lines.push({ type: 'reward_cash', label: '返现余额抵扣', amount: loyaltyApi.pointsMoney(reward_cash_discount_amount) });
  }

  return {
    rawAmount,
    flashSaleDiscount,
    fullReductionDiscount,
    couponDiscount,
    discountAmount: totalGoodsDiscount,
    activityDiscountAmount: flashSaleDiscount + fullReductionDiscount + memberLevelDiscount,
    shippingOriginalFee: originalShippingFee,
    shippingDiscountAmount: memberShippingDiscount,
    totalDiscountAmount: flashSaleDiscount
      + fullReductionDiscount
      + memberLevelDiscount
      + couponDiscount
      + points_discount_amount
      + reward_cash_discount_amount
      + memberShippingDiscount,
    shippingFee,
    finalTotal,
    totalPoints: earned_points,
    legacyTotalPoints,
    goodsAmountAfterFullReduction,
    taxSnap,
    orderItems,
    productMap,
    flashByProductId,
    fullReductionActivities,
    couponTitle,
    couponType,
    discount_lines,
    points_bonus_lines,
    earned_points,
    loyalty: {
      use_points: usePoints,
      points_used,
      points_discount_amount,
      use_reward_cash: useRewardCash,
      reward_cash_used,
      reward_cash_discount_amount,
      available_points: pointsBalance,
      max_usable_points,
      disabled_reason: pointsRedeem.disabled_reason || '',
      adjusted: !!pointsRedeem.adjusted,
      adjusted_reason: pointsRedeem.adjusted_reason || '',
      point_value_myr: pointsRedeem.point_value_myr || Number(pointsSettings?.point_value_myr || 0.01),
      points_per_currency: pointsRedeem.points_per_currency || Number(pointsSettings?.points_per_currency || 100),
      min_redeem_points: Number(pointsSettings?.min_redeem_points || 0),
      redeem_step: Number(pointsSettings?.redeem_step || 1),
      available_reward_balance: rewardBalance,
      max_usable_reward_cash,
      earned_points,
      member_level_discount: memberLevelDiscount,
      member_free_shipping_discount: memberShippingDiscount,
      points_summary: {
        earned_points,
        points_used,
        max_usable_points,
        points_discount_amount,
        point_value_myr: pointsRedeem.point_value_myr || Number(pointsSettings?.point_value_myr || 0.01),
        final_amount: finalTotal,
        discount_lines,
        disabled_reason: pointsRedeem.disabled_reason || '',
        adjusted: !!pointsRedeem.adjusted,
        calculation_version: pointsEarn.calculation_version || loyaltyApi.POINTS_CALCULATION_VERSION,
        points_bonus_lines,
        points_bonus_snapshots: pointsBonusResolved.points_bonus_snapshots || [],
      },
      points_settings_snapshot: pointsSettings ? { ...pointsSettings } : null,
      product_rule_snapshots: pointsEarn.product_rule_snapshots || [],
      member_level_snapshot: pointsEarn.member_level_snapshot || (memberLevel ? { ...memberLevel } : { points_multiplier: 1 }),
      item_results: pointsEarn.item_results || [],
      redeem_item_results: pointsRedeem.item_results || [],
      points_bonus_snapshots: pointsBonusResolved.points_bonus_snapshots || [],
      points_bonus_lines,
      calculation_version: pointsEarn.calculation_version || loyaltyApi.POINTS_CALCULATION_VERSION,
      point_payment_method_whitelist: pointMethods,
      reward_payment_method_whitelist: rewardMethods,
    },
  };
}

module.exports = {
  buildOrderPricing,
  calculateCouponDiscount,
  computeFullReductionDiscount,
  computeFlashSaleSavings,
  lineMatchesActivityScope,
  lineMatchesCouponScope,
  computeCouponEligibleSubtotal,
  parseActivityConfig,
  parseIdList,
  assertCouponUsableOnOrder,
  isPaymentMethodAllowedForPoints,
};

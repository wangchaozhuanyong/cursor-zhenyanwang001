const { ValidationError } = require('../../errors');
const repo = require('./repository/order.repository');
const siteSettingsRepo = require('./repository/siteSettings.repository');
const loyaltyRepo = require('../loyalty/repository/loyalty.repository');
const pointsRepo = require('../user/repository/points.repository');
const rewardRepo = require('../user/repository/reward.repository');
const sstTax = require('./sstTax');
const { computeShippingFee, estimateWeightFromItems } = require('../../utils/shippingFee');

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
  const type = coupon.type;
  const value = parseFloat(coupon.value) || 0;
  if (type === 'fixed') return Math.min(value, rawAmount);
  if (type === 'percentage') return Math.min(rawAmount, Math.floor(rawAmount * value / 100));
  if (type === 'shipping') return Math.min(shippingFee, value > 0 ? value : shippingFee);
  return 0;
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
  goodsAmountAfterFullReduction,
  shippingFee,
  orderItems,
  productMap,
  hasActivityDiscount,
  activityAllowsCoupon,
}) {
  const minAmount = parseFloat(uc.min_amount);
  if (goodsAmountAfterFullReduction < minAmount) {
    throw new ValidationError('Order amount below minimum requirement for coupon');
  }

  const usableScope = uc.usable_scope_type || uc.scope_type || 'all';
  const usableProductIds = parseIdList(uc.usable_product_ids);
  const usableCategoryIds = parseIdList(uc.usable_category_ids);

  if (usableScope === 'product' && usableProductIds.length) {
    const ids = orderItems.map((oi) => oi.productId);
    if (!ids.some((id) => usableProductIds.includes(id))) {
      throw new ValidationError('Coupon is not applicable to current products');
    }
  }
  if (usableScope === 'category' && usableCategoryIds.length) {
    const cats = [...new Set(orderItems.map((oi) => productMap[oi.productId]?.category_id).filter(Boolean))];
    if (!cats.some((cid) => usableCategoryIds.includes(String(cid)))) {
      throw new ValidationError('Coupon is not applicable to current product categories');
    }
  }
  if (uc.scope_type === 'category') {
    const allowedCategoryIds = parseIdList(uc.category_ids);
    if (allowedCategoryIds.length) {
      const orderCategoryIds = [...new Set(orderItems.map((oi) => productMap[oi.productId]?.category_id).filter(Boolean))];
      if (!orderCategoryIds.some((cid) => allowedCategoryIds.includes(String(cid)))) {
        throw new ValidationError('Coupon is not applicable to current product categories');
      }
    }
  }

  if (hasActivityDiscount && uc.stackable_with_activity === 0) {
    throw new ValidationError('璇ヤ紭鎯犲埜涓嶅彲涓庤惀閿€娲诲姩鍙犲姞浣跨敤');
  }
  if (hasActivityDiscount && activityAllowsCoupon === false) {
    throw new ValidationError('Current promotion cannot be stacked with coupon');
  }

  const couponDiscount = calculateCouponDiscount(uc, goodsAmountAfterFullReduction, shippingFee);
  if (couponDiscount <= 0) {
    throw new ValidationError(uc.type === 'shipping' ? 'Current order has no shippable fee to deduct' : 'Coupon cannot be deducted for current order');
  }
  return couponDiscount;
}

/**
 * 鏋勫缓璁㈠崟閲戦锛堥瑙堜笌涓嬪崟鍏辩敤锛? * @param {import('mysql2/promise').PoolConnection|null} conn
 */
async function buildOrderPricing(userId, body, conn = null) {
  const q = conn || repo.getPool();
  const { items, coupon_id, shipping_template_id, estimated_weight_kg } = body;

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
    if (!uc) throw new ValidationError('浼樻儬鍒镐笉瀛樺湪銆佸凡浣跨敤鎴栦笉鍙敤');
    couponDiscount = assertCouponUsableOnOrder({
      uc,
      goodsAmountAfterFullReduction,
      shippingFee,
      orderItems,
      productMap,
      hasActivityDiscount,
      activityAllowsCoupon,
    });
    couponTitle = uc.title;
    couponType = uc.type;
  }

  const nonShippingGoodsCoupon = couponType === 'shipping' ? 0 : couponDiscount;
  const goodsInclusiveTaxable = Math.max(0, rawAmount - fullReductionDiscount - nonShippingGoodsCoupon);
  const sstRows = await siteSettingsRepo.selectSiteSettingsByKeys(['sstEnabled', 'sstRatePercent', 'sstLabel']);
  const sstSettings = sstTax.parseSstSettingsFromSiteSettingsRows(sstRows);
  const taxSnap = sstTax.buildOrderTaxSnapshot(sstSettings, goodsInclusiveTaxable);

  const discountAmount = fullReductionDiscount + couponDiscount;
  const basePayableBeforeLoyalty = Math.max(0, rawAmount - discountAmount + shippingFee);

  const pointsSettings = await loyaltyRepo.selectPointsSettings();
  const rewardSettings = await loyaltyRepo.selectRewardSettings();
  const pointMethods = parseJsonArray(pointsSettings?.allowed_payment_methods, ['online', 'whatsapp']);
  const rewardMethods = parseJsonArray(rewardSettings?.allowed_payment_methods, ['online', 'whatsapp']);

  const pointsBalance = userId ? Number(await pointsRepo.selectUserPointsBalance(userId)) : 0;
  const rewardBalance = userId ? Number(await rewardRepo.sumUserRewardTransactions(q, userId)) : 0;
  const pointsPerCurrency = Math.max(1, Number(pointsSettings?.points_per_currency || 100));
  const minRedeemPoints = Math.max(0, Number(pointsSettings?.min_redeem_points || 0));
  const pointsMaxByPercent = basePayableBeforeLoyalty * (Number(pointsSettings?.max_redeem_percent || 100) / 100);
  const pointsMaxByAmount = Number(pointsSettings?.max_redeem_amount || 0) > 0
    ? Number(pointsSettings?.max_redeem_amount || 0)
    : Number.MAX_SAFE_INTEGER;
  const pointsMaxCurrency = clamp(
    Math.min(pointsMaxByPercent, pointsMaxByAmount, basePayableBeforeLoyalty),
    0,
    basePayableBeforeLoyalty,
  );
  const maxUsablePointsBySetting = Math.floor(pointsMaxCurrency * pointsPerCurrency);
  const max_usable_points = (
    pointsSettings?.redeem_enabled
    && basePayableBeforeLoyalty >= Number(pointsSettings?.min_order_amount || 0)
    && pointsBalance >= minRedeemPoints
  ) ? Math.max(0, Math.min(pointsBalance, maxUsablePointsBySetting)) : 0;

  const usePoints = !!body.use_points;
  const requestPointsToUse = Number(body.points_to_use || 0);
  const points_used = usePoints
    ? clamp(requestPointsToUse > 0 ? Math.floor(requestPointsToUse) : max_usable_points, 0, max_usable_points)
    : 0;
  const points_discount_amount = points_used > 0 ? clamp(points_used / pointsPerCurrency, 0, basePayableBeforeLoyalty) : 0;

  const afterPoints = Math.max(0, basePayableBeforeLoyalty - points_discount_amount);
  const rewardMaxByPercent = afterPoints * (Number(rewardSettings?.max_redeem_percent || 100) / 100);
  const rewardMaxByAmount = Number(rewardSettings?.max_redeem_amount || 0) > 0
    ? Number(rewardSettings?.max_redeem_amount || 0)
    : Number.MAX_SAFE_INTEGER;
  const max_usable_reward_cash = (
    rewardSettings?.wallet_redeem_enabled
    && afterPoints >= Number(rewardSettings?.min_redeem_amount || 0)
  ) ? clamp(Math.min(rewardBalance, rewardMaxByPercent, rewardMaxByAmount, afterPoints), 0, afterPoints) : 0;

  const useRewardCash = !!body.use_reward_cash;
  const requestRewardCash = Number(body.reward_cash_amount || 0);
  const reward_cash_used = useRewardCash
    ? clamp(requestRewardCash > 0 ? requestRewardCash : max_usable_reward_cash, 0, max_usable_reward_cash)
    : 0;
  const reward_cash_discount_amount = reward_cash_used;

  const finalTotal = Math.max(0, basePayableBeforeLoyalty - points_discount_amount - reward_cash_discount_amount);
  const earned_points = computeEarnedPointsBySettings(
    pointsSettings,
    Math.max(0, goodsInclusiveTaxable - points_discount_amount - reward_cash_discount_amount),
    legacyTotalPoints,
  );

  const discount_lines = [];
  if (flashSaleDiscount > 0) {
    discount_lines.push({ type: 'flash_sale', label: '绉掓潃浼樻儬', amount: flashSaleDiscount });
  }
  if (fullReductionDiscount > 0) {
    discount_lines.push({ type: 'full_reduction', label: '婊″噺浼樻儬', amount: fullReductionDiscount });
  }
  if (couponDiscount > 0) {
    discount_lines.push({
      type: 'coupon',
      label: couponTitle ? `优惠券：${couponTitle}` : '优惠券折扣',
      amount: couponDiscount,
    });
  }
  if (points_discount_amount > 0) {
    discount_lines.push({ type: 'points', label: '绉垎鎶垫墸', amount: points_discount_amount });
  }
  if (reward_cash_discount_amount > 0) {
    discount_lines.push({ type: 'reward_cash', label: '杩旂幇浣欓鎶垫墸', amount: reward_cash_discount_amount });
  }

  return {
    rawAmount,
    flashSaleDiscount,
    fullReductionDiscount,
    couponDiscount,
    discountAmount,
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
    loyalty: {
      use_points: usePoints,
      points_used,
      points_discount_amount,
      use_reward_cash: useRewardCash,
      reward_cash_used,
      reward_cash_discount_amount,
      available_points: pointsBalance,
      max_usable_points,
      available_reward_balance: rewardBalance,
      max_usable_reward_cash,
      earned_points,
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
  parseActivityConfig,
  parseIdList,
  assertCouponUsableOnOrder,
};




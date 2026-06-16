const { ForbiddenError, ValidationError } = require('../../errors');
const repo = require('./repository/order.repository');
const siteSettingsRepo = require('./repository/siteSettings.repository');
const sstTax = require('./sstTax');
const {
  computeShippingFee,
  estimateWeightFromItems,
  normalizeShippingDestination,
  matchesShippingTemplate,
  pickBestShippingTemplate,
} = require('../../utils/shippingFee');

function getUserApi() {
  return /** @type {any} */ (require('../user/publicApi')) || {};
}

function getLoyaltyApi() {
  return /** @type {any} */ (require('../loyalty/publicApi')) || {};
}

function getSiteCapabilitiesApi() {
  return /** @type {any} */ (require('../siteCapabilities/publicApi')) || {};
}

function getAuthApi() {
  return /** @type {any} */ (require('../auth/publicApi')) || {};
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

async function resolveShippingTemplateForPricing(q, shippingTemplateId, destination, rawAmount, estimatedWeightKg) {
  const templates = await repo.selectEnabledShippingTemplates(q);
  const requestedId = shippingTemplateId == null ? '' : String(shippingTemplateId).trim();
  const requested = requestedId
    ? templates.find((tpl) => String(tpl.id) === requestedId) || null
    : null;
  if (requested && matchesShippingTemplate(requested, destination, rawAmount, estimatedWeightKg)) {
    return requested;
  }
  return pickBestShippingTemplate(templates, destination, rawAmount, estimatedWeightKg)
    || requested
    || templates[0]
    || null;
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

function buildFullPromotionRules(activity) {
  const type = String(activity?.type || 'full_reduction') === 'full_discount' ? 'full_discount' : 'full_reduction';
  const activityCfg = parseActivityConfig(activity.activity_config) || {};
  const ruleCfg = parseActivityConfig(activity.rule_config) || {};
  const cfg = { ...activityCfg, ...ruleCfg };
  const rules = [];
  if (type === 'full_discount') {
    const rawRules = Array.isArray(cfg.full_discount_rules) ? cfg.full_discount_rules : [];
    for (const rule of rawRules) {
      const threshold = Number(rule.threshold_amount || rule.threshold || 0);
      const discountPercent = normalizeDiscountPercent(rule.discount_percent ?? rule.discount_rate ?? rule.rate ?? 0);
      if (threshold > 0 && discountPercent > 0 && discountPercent < 100) {
        rules.push({ type, threshold, discountPercent });
      }
    }
    if (!rules.length) {
      const threshold = Number(cfg.threshold_amount || activity.threshold_amount || 0);
      const discountPercent = normalizeDiscountPercent(cfg.discount_percent ?? cfg.discount_rate ?? cfg.rate ?? 0);
      if (threshold > 0 && discountPercent > 0 && discountPercent < 100) {
        rules.push({ type, threshold, discountPercent });
      }
    }
    return rules.sort((a, b) => a.threshold - b.threshold || b.discountPercent - a.discountPercent);
  }

  if (Array.isArray(cfg.full_reduction_rules) && cfg.full_reduction_rules.length) {
    for (const rule of cfg.full_reduction_rules) {
      const threshold = Number(rule.threshold_amount || rule.threshold || 0);
      const discount = Number(rule.discount_amount || rule.discount || 0);
      if (threshold > 0 && discount > 0) rules.push({ type, threshold, discount });
    }
  } else {
    const threshold = activity.threshold_amount != null && activity.threshold_amount !== ''
      ? Number(activity.threshold_amount)
      : Number(cfg.threshold_amount || 0);
    const discount = activity.discount_amount != null && activity.discount_amount !== ''
      ? Number(activity.discount_amount)
      : Number(cfg.discount_amount || 0);
    if (threshold > 0 && discount > 0) rules.push({ type, threshold, discount });
  }
  return rules.sort((a, b) => a.threshold - b.threshold || Number(a.discount || 0) - Number(b.discount || 0));
}

function computeRuleDiscount(rule, subtotal) {
  if (!rule || subtotal < Number(rule.threshold || 0)) return 0;
  if (rule.type === 'full_discount') {
    return money(subtotal * ((100 - Number(rule.discountPercent || 0)) / 100));
  }
  return money(Math.min(Number(rule.discount || 0), subtotal));
}

function buildFullPromotionLine(activity, rule, amount) {
  const type = rule.type === 'full_discount' ? 'full_discount' : 'full_reduction';
  const fallbackLabel = type === 'full_discount'
    ? `满${money(rule.threshold)}打${formatDiscountFold(rule.discountPercent)}折`
    : `满${money(rule.threshold)}减${money(rule.discount)}`;
  return {
    promotion_id: activity.activity_id || activity.id || null,
    activity_id: activity.activity_id || activity.id || null,
    type,
    label: activity.title ? `${type === 'full_discount' ? '满折优惠' : '满减优惠'}：${activity.title}` : fallbackLabel,
    amount: money(amount),
  };
}

function buildMemberPriceRules(activity) {
  const activityCfg = parseActivityConfig(activity?.activity_config) || {};
  const ruleCfg = parseActivityConfig(activity?.rule_config) || {};
  const cfg = { ...activityCfg, ...ruleCfg };
  const rawRules = Array.isArray(cfg.member_price_rules) ? cfg.member_price_rules : [];
  const rules = [];
  for (const rule of rawRules) {
    const discountPercent = normalizeDiscountPercent(rule.discount_percent ?? rule.discount_rate ?? rule.rate ?? 0);
    const minOrderAmount = Number(rule.min_order_amount ?? rule.minOrderAmount ?? 0);
    if (discountPercent > 0 && discountPercent < 100 && minOrderAmount >= 0) {
      rules.push({
        discountPercent,
        minOrderAmount,
        memberLevelIds: parseIdList(rule.member_level_ids ?? rule.memberLevelIds),
      });
    }
  }
  if (!rules.length) {
    const discountPercent = normalizeDiscountPercent(cfg.discount_percent ?? cfg.discount_rate ?? cfg.rate ?? 0);
    const minOrderAmount = Number(cfg.min_order_amount ?? cfg.minOrderAmount ?? 0);
    if (discountPercent > 0 && discountPercent < 100 && minOrderAmount >= 0) {
      rules.push({
        discountPercent,
        minOrderAmount,
        memberLevelIds: parseIdList(cfg.member_level_ids ?? cfg.memberLevelIds),
      });
    }
  }
  return rules.sort((a, b) => a.minOrderAmount - b.minOrderAmount || a.discountPercent - b.discountPercent);
}

function memberLevelMatchesRule(memberLevel, rule) {
  if (!memberLevel) return false;
  const ids = rule?.memberLevelIds || [];
  if (!ids.length) return true;
  const candidates = [
    memberLevel.id,
    memberLevel.level_id,
    memberLevel.member_level_id,
    memberLevel.code,
    memberLevel.name,
  ].map((value) => String(value || '').trim()).filter(Boolean);
  return ids.some((id) => candidates.includes(String(id)));
}

function buildMemberPriceLine(activity, rule, amount) {
  return {
    promotion_id: activity.activity_id || activity.id || null,
    activity_id: activity.activity_id || activity.id || null,
    type: 'member_price',
    label: activity.title ? `会员价：${activity.title}` : `${formatDiscountFold(rule.discountPercent)}折会员价`,
    amount: money(amount),
    discount_percent: money(rule.discountPercent),
    discount_label: `${formatDiscountFold(rule.discountPercent)}折`,
  };
}

function computeMemberPriceDiscounts(orderItems, productMap, memberPriceActivities = [], memberLevel = null, options = {}) {
  if (!memberLevel) return { total: 0, lines: [] };
  const rawAmount = Number(options.rawAmount == null
    ? orderItems.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.qty || 0), 0)
    : options.rawAmount);
  const priorGoodsDiscount = Number(options.priorGoodsDiscount || 0);
  const lines = [];
  let total = 0;
  for (const act of memberPriceActivities || []) {
    const scopes = act.scopes || [];
    let eligibleRaw = 0;
    for (const oi of orderItems) {
      const product = productMap[oi.productId];
      if (!lineMatchesActivityScope(oi, product, act, scopes)) continue;
      eligibleRaw += Number(oi.price || 0) * Number(oi.qty || 0);
    }
    if (eligibleRaw <= 0) continue;

    const allocatedPriorDiscount = rawAmount > 0 ? (priorGoodsDiscount * eligibleRaw) / rawAmount : 0;
    const discountBase = money(Math.max(0, eligibleRaw - allocatedPriorDiscount));
    if (discountBase <= 0) continue;

    let bestRule = null;
    let bestAmount = 0;
    for (const rule of buildMemberPriceRules(act)) {
      if (!memberLevelMatchesRule(memberLevel, rule)) continue;
      if (rawAmount < Number(rule.minOrderAmount || 0)) continue;
      const amount = money(discountBase * ((100 - Number(rule.discountPercent || 0)) / 100));
      if (amount <= 0) continue;
      if (amount > bestAmount || (amount === bestAmount && Number(rule.minOrderAmount || 0) > Number(bestRule?.minOrderAmount || 0))) {
        bestRule = rule;
        bestAmount = amount;
      }
    }
    if (!bestRule || bestAmount <= 0) continue;
    const lineAmount = money(Math.min(bestAmount, discountBase));
    total += lineAmount;
    lines.push(buildMemberPriceLine(act, bestRule, lineAmount));
  }
  return { total: money(total), lines };
}

function computeFullPromotionDiscounts(orderItems, productMap, fullReductionActivities = []) {
  const lines = [];
  let total = 0;
  for (const act of fullReductionActivities || []) {
    const scopes = act.scopes || [];
    let subtotal = 0;
    for (const oi of orderItems) {
      const product = productMap[oi.productId];
      if (!lineMatchesActivityScope(oi, product, act, scopes)) continue;
      subtotal += Number(oi.price || 0) * Number(oi.qty || 0);
    }
    if (subtotal <= 0) continue;

    let bestRule = null;
    let bestAmount = 0;
    for (const rule of buildFullPromotionRules(act)) {
      const amount = computeRuleDiscount(rule, subtotal);
      if (amount <= 0) continue;
      if (amount > bestAmount || (amount === bestAmount && Number(rule.threshold || 0) > Number(bestRule?.threshold || 0))) {
        bestRule = rule;
        bestAmount = amount;
      }
    }
    if (!bestRule || bestAmount <= 0) continue;
    total += Math.min(bestAmount, subtotal);
    lines.push(buildFullPromotionLine(act, bestRule, Math.min(bestAmount, subtotal)));
  }
  return { total: money(total), lines };
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

function computeFullReductionDiscount(orderItems, productMap, fullReductionActivities) {
  return computeFullPromotionDiscounts(orderItems, productMap, fullReductionActivities).total;
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
  const memberPriceActivities = conn
    ? await repo.selectActiveMemberPriceActivitiesForUpdate(conn)
    : await repo.selectActiveMemberPriceActivitiesRead(q);
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
      activityType: flash?.type || null,
    };
  });

  const flashSaleDiscount = computeFlashSaleSavings(orderItems, flashByProductId, productMap);
  const fullPromotionDiscounts = computeFullPromotionDiscounts(orderItems, productMap, fullReductionActivities);
  const fullReductionDiscount = fullPromotionDiscounts.total;
  const goodsAmountAfterFullReduction = Math.max(0, rawAmount - fullReductionDiscount);

  let shippingFee = 0;
  const destination = normalizeShippingDestination(typeof body.address === 'object' ? body.address : {});
  const w = estimated_weight_kg != null && Number.isFinite(Number(estimated_weight_kg))
    ? Number(estimated_weight_kg)
    : estimateWeightFromItems(items);
  const tpl = await resolveShippingTemplateForPricing(q, shipping_template_id, destination, rawAmount, w);
  if (tpl) {
    shippingFee = computeShippingFee(tpl, rawAmount, w);
  }
  const originalShippingFee = shippingFee;

  const loyaltyApi = getLoyaltyApi();
  const memberLevel = await loyaltyApi.selectUserMemberLevel(q, userId);
  const memberPriceCouponPreview = computeMemberPriceDiscounts(
    orderItems,
    productMap,
    memberPriceActivities,
    memberLevel,
    { rawAmount, priorGoodsDiscount: fullReductionDiscount },
  );
  const memberPriceActivityById = new Map(
    (memberPriceActivities || []).map((act) => [String(act.activity_id || act.id || ''), act]),
  );
  const couponPreviewMemberActivities = memberPriceCouponPreview.lines
    .map((line) => memberPriceActivityById.get(String(line.activity_id || line.promotion_id || '')))
    .filter(Boolean);
  const hasActivityDiscount = flashSaleDiscount > 0 || fullReductionDiscount > 0 || memberPriceCouponPreview.total > 0;
  const activityAllowsCoupon = fullReductionActivities.every((a) => !!a.allow_coupon_stack)
    && [...flashByProductId.values()].every((f) => f.allow_coupon_stack !== 0)
    && couponPreviewMemberActivities.every((a) => a.allow_coupon_stack !== 0);

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
  const pointsSettings = await loyaltyApi.selectPointsSettings();
  const rewardSettings = await loyaltyApi.selectRewardSettings();
  const productRules = await loyaltyApi.selectProductRules(q);
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
  const memberPriceDiscounts = computeMemberPriceDiscounts(
    orderItems,
    productMap,
    memberPriceActivities,
    memberLevel,
    {
      rawAmount,
      priorGoodsDiscount: fullReductionDiscount + nonShippingGoodsCoupon + memberLevelDiscount,
    },
  );
  const memberActivityDiscount = loyaltyApi.pointsMoney(memberPriceDiscounts.total);
  const totalMemberDiscount = memberLevelDiscount + memberActivityDiscount;
  const memberShippingDiscount = memberFreeShipping ? loyaltyApi.pointsMoney(originalShippingFee) : 0;
  const totalGoodsDiscount = fullReductionDiscount + couponDiscount + totalMemberDiscount;
  const basePayableBeforeLoyaltyWithMember = Math.max(0, rawAmount - totalGoodsDiscount + shippingFee);
  const goodsInclusiveTaxable = Math.max(0, rawAmount - fullReductionDiscount - nonShippingGoodsCoupon - totalMemberDiscount);
  const sstRows = await siteSettingsRepo.selectSiteSettingsByKeys(['sstEnabled', 'sstRatePercent', 'sstLabel']);
  const sstSettings = sstTax.parseSstSettingsFromSiteSettingsRows(sstRows);
  const taxSnap = sstTax.buildOrderTaxSnapshot(sstSettings, goodsInclusiveTaxable);
  const goodsDiscountForAllocation = fullReductionDiscount + nonShippingGoodsCoupon + totalMemberDiscount;
  const loyaltyItems = orderItems.map((oi) => {
    const lineSubtotal = oi.price * oi.qty;
    const discountShare = rawAmount > 0 ? (goodsDiscountForAllocation * lineSubtotal) / rawAmount : 0;
    const memberDiscountShare = rawAmount > 0 && totalMemberDiscount > 0
      ? (totalMemberDiscount * lineSubtotal) / rawAmount
      : 0;
    const product = productMap[oi.productId] || {};
    const fullReductionBlocksPoints = fullReductionActivities.some((act) => act.allow_points_stack === 0 && lineMatchesActivityScope(oi, product, act, act.scopes || []));
    const memberPriceBlocksPoints = memberPriceActivities.some((act) => act.allow_points_stack === 0 && lineMatchesActivityScope(oi, product, act, act.scopes || []));
    const flash = flashByProductId.get(oi.productId);
    return {
      product_id: oi.productId,
      qty: oi.qty,
      price: oi.price,
      subtotal: lineSubtotal,
      line_paid_amount: Math.max(0, lineSubtotal - discountShare),
      member_discount_share: loyaltyApi.pointsMoney(memberDiscountShare),
      activity_id: oi.activityId,
      allow_points_stack: flash ? flash.allow_points_stack !== 0 : !(fullReductionBlocksPoints || memberPriceBlocksPoints),
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
      discounts: {
        coupon_amount: couponDiscount,
        full_reduction_amount: fullReductionDiscount,
        member_level_discount: totalMemberDiscount,
        member_price_activity_discount: memberActivityDiscount,
      },
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
      discounts: {
        coupon_amount: couponDiscount,
        full_reduction_amount: fullReductionDiscount,
        member_level_discount: totalMemberDiscount,
        member_price_activity_discount: memberActivityDiscount,
      },
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
    for (const line of fullPromotionDiscounts.lines) {
      discount_lines.push({ ...line, amount: loyaltyApi.pointsMoney(line.amount) });
    }
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
  if (memberActivityDiscount > 0) {
    for (const line of memberPriceDiscounts.lines) {
      discount_lines.push({ ...line, amount: loyaltyApi.pointsMoney(line.amount) });
    }
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
    memberActivityDiscount,
    memberPriceDiscount: memberActivityDiscount,
    couponDiscount,
    discountAmount: totalGoodsDiscount,
    activityDiscountAmount: flashSaleDiscount + fullReductionDiscount + totalMemberDiscount,
    shippingOriginalFee: originalShippingFee,
    shippingTemplateId: tpl?.id || null,
    shippingName: tpl?.name || '',
    shippingDestination: destination,
    shippingDiscountAmount: memberShippingDiscount,
    totalDiscountAmount: flashSaleDiscount
      + fullReductionDiscount
      + totalMemberDiscount
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
    memberPriceActivities,
    pointsBonusActivities,
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
      member_price_discount: memberActivityDiscount,
      member_total_discount: totalMemberDiscount,
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
  resolveShippingTemplateForPricing,
  calculateCouponDiscount,
  computeFullPromotionDiscounts,
  computeMemberPriceDiscounts,
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

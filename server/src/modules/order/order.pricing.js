const { ValidationError } = require('../../errors');
const repo = require('./order.repository');
const siteSettingsRepo = require('./siteSettings.repository');
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

/** 满减：按活动聚合，读取 activity_config 多档规则 */
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
    throw new ValidationError(`订单金额未满 RM ${minAmount}，无法使用该优惠券`);
  }

  const usableScope = uc.usable_scope_type || uc.scope_type || 'all';
  const usableProductIds = parseIdList(uc.usable_product_ids);
  const usableCategoryIds = parseIdList(uc.usable_category_ids);

  if (usableScope === 'product' && usableProductIds.length) {
    const ids = orderItems.map((oi) => oi.productId);
    if (!ids.some((id) => usableProductIds.includes(id))) {
      throw new ValidationError('该优惠券不适用于当前商品');
    }
  }
  if (usableScope === 'category' && usableCategoryIds.length) {
    const cats = [...new Set(orderItems.map((oi) => productMap[oi.productId]?.category_id).filter(Boolean))];
    if (!cats.some((cid) => usableCategoryIds.includes(String(cid)))) {
      throw new ValidationError('该优惠券不适用于当前商品分类');
    }
  }
  if (uc.scope_type === 'category') {
    const allowedCategoryIds = parseIdList(uc.category_ids);
    if (allowedCategoryIds.length) {
      const orderCategoryIds = [...new Set(orderItems.map((oi) => productMap[oi.productId]?.category_id).filter(Boolean))];
      if (!orderCategoryIds.some((cid) => allowedCategoryIds.includes(String(cid)))) {
        throw new ValidationError('该优惠券不适用于当前商品分类');
      }
    }
  }

  if (hasActivityDiscount && uc.stackable_with_activity === 0) {
    throw new ValidationError('该优惠券不可与营销活动叠加使用');
  }
  if (hasActivityDiscount && activityAllowsCoupon === false) {
    throw new ValidationError('当前营销活动不可叠加优惠券');
  }

  const couponDiscount = calculateCouponDiscount(uc, goodsAmountAfterFullReduction, shippingFee);
  if (couponDiscount <= 0) {
    throw new ValidationError(uc.type === 'shipping' ? '当前订单无可抵扣运费，无法使用该运费券' : '该优惠券当前不可抵扣');
  }
  return couponDiscount;
}

/**
 * 构建订单金额（预览与下单共用）
 * @param {import('mysql2/promise').PoolConnection|null} conn
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
  let totalPoints = 0;
  const orderItems = items.map((item) => {
    const p = productMap[item.product_id];
    const variant = item.variant_id
      ? variantById.get(item.variant_id)
      : defaultVariantByProductId.get(item.product_id);
    const flash = flashByProductId.get(item.product_id);
    const basePrice = parseFloat(variant?.price ?? p?.price ?? 0);
    const price = flash ? parseFloat(flash.activity_price) : basePrice;
    rawAmount += price * item.qty;
    totalPoints += (p?.points || 0) * item.qty;
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
  if (shipping_template_id) {
    const tpl = conn
      ? await repo.selectShippingTemplate(conn, shipping_template_id)
      : await repo.selectShippingTemplate(q, shipping_template_id);
    if (tpl) {
      const w = estimated_weight_kg != null && Number.isFinite(Number(estimated_weight_kg))
        ? Number(estimated_weight_kg)
        : estimateWeightFromItems(items);
      shippingFee = computeShippingFee(tpl, rawAmount, w);
    }
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
    if (!uc) throw new ValidationError('优惠券不存在、已使用或不可用');
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
  const finalTotal = Math.max(0, rawAmount - discountAmount + shippingFee);

  const discount_lines = [];
  if (flashSaleDiscount > 0) {
    discount_lines.push({ type: 'flash_sale', label: '秒杀优惠', amount: flashSaleDiscount });
  }
  if (fullReductionDiscount > 0) {
    discount_lines.push({ type: 'full_reduction', label: '满减优惠', amount: fullReductionDiscount });
  }
  if (couponDiscount > 0) {
    discount_lines.push({
      type: 'coupon',
      label: couponTitle ? `优惠券（${couponTitle}）` : '优惠券抵扣',
      amount: couponDiscount,
    });
  }

  return {
    rawAmount,
    flashSaleDiscount,
    fullReductionDiscount,
    couponDiscount,
    discountAmount,
    shippingFee,
    finalTotal,
    totalPoints,
    goodsAmountAfterFullReduction,
    taxSnap,
    orderItems,
    productMap,
    flashByProductId,
    fullReductionActivities,
    couponTitle,
    couponType,
    discount_lines,
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

const legacyPricing = require('../order.pricing');
const repo = require('../repository/order.repository');

const PRICING_ENGINE_VERSION = 'pricing_v2_compat_2026_06';

function getMarketingApi() {
  return /** @type {any} */ (require('../../marketing/publicApi')) || {};
}

async function buildPromotionEvaluation(userId, body, pricing) {
  const fn = getMarketingApi().evaluatePricingResult;
  if (typeof fn !== 'function') return null;
  return fn({ pricing, body, userId });
}

function collectPromotionIds(pricing = {}) {
  const ids = new Set();
  const flashRows = pricing.flashByProductId instanceof Map
    ? [...pricing.flashByProductId.values()]
    : [];
  for (const row of flashRows) {
    if (row?.activity_id) ids.add(String(row.activity_id));
  }
  for (const row of pricing.fullReductionActivities || []) {
    if (row?.activity_id) ids.add(String(row.activity_id));
  }
  for (const row of pricing.memberPriceActivities || []) {
    if (row?.activity_id) ids.add(String(row.activity_id));
  }
  for (const row of pricing.pointsBonusActivities || []) {
    if (row?.activity_id) ids.add(String(row.activity_id));
  }
  for (const line of pricing.discount_lines || []) {
    if (line?.promotion_id) ids.add(String(line.promotion_id));
    if (line?.activity_id) ids.add(String(line.activity_id));
  }
  for (const line of pricing.points_bonus_lines || []) {
    if (line?.activity_id) ids.add(String(line.activity_id));
  }
  return [...ids];
}

async function attachPromotionUsage(q, userId, pricing) {
  const promotionIds = collectPromotionIds(pricing);
  if (!promotionIds.length) {
    return {
      ...pricing,
      promotion_usage: { byPromotionId: {} },
    };
  }
  const promotionUsage = await repo.selectPromotionUsageCounts(q || repo.getPool(), {
    userId,
    promotionIds,
  });
  return {
    ...pricing,
    promotion_usage: promotionUsage,
  };
}

async function buildCheckoutPricing(userId, body, conn = null) {
  const result = await legacyPricing.buildOrderPricing(userId, body, conn);
  const pricingWithUsage = await attachPromotionUsage(conn || repo.getPool(), userId, result);
  const promotionEvaluation = await buildPromotionEvaluation(userId, body, pricingWithUsage);
  return {
    ...pricingWithUsage,
    pricing_engine_version: PRICING_ENGINE_VERSION,
    source: 'order_pricing_compat',
    promotion_evaluation: promotionEvaluation,
  };
}

module.exports = {
  PRICING_ENGINE_VERSION,
  buildCheckoutPricing,
  attachPromotionUsage,
  calculateCouponDiscount: legacyPricing.calculateCouponDiscount,
  computeFullPromotionDiscounts: legacyPricing.computeFullPromotionDiscounts,
  computeMemberPriceDiscounts: legacyPricing.computeMemberPriceDiscounts,
  computeFullReductionDiscount: legacyPricing.computeFullReductionDiscount,
  computeFlashSaleSavings: legacyPricing.computeFlashSaleSavings,
};

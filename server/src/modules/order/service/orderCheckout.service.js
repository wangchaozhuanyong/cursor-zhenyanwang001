const { ForbiddenError } = require('../../../errors');
const orderPricing = require('../order.pricing');

function getSiteCapabilitiesApi() {
  return /** @type {any} */ (require('../../siteCapabilities')).api || {};
}

function getUserApi() {
  return /** @type {any} */ (require('../../user')).api || {};
}

async function assertOrderCapabilityUsage(body = {}) {
  const [pointsEnabled, couponEnabled] = await Promise.all([
    getSiteCapabilitiesApi().isCapabilityEnabled('pointsEnabled'),
    getSiteCapabilitiesApi().isCapabilityEnabled('couponEnabled'),
  ]);
  if (!pointsEnabled && (body.use_points || Number(body.points_to_use || 0) > 0)) {
    throw new ForbiddenError('积分功能已关闭');
  }
  if (!couponEnabled && (body.coupon_id || body.coupon_title)) {
    throw new ForbiddenError('优惠券功能已关闭');
  }
}

function couponUnavailableReason(row) {
  const status = getUserApi().resolveUserCouponRuntimeStatus(row);
  if (status === 'pending') return '优惠券未到使用时间';
  if (status === 'expired') return '优惠券已过期';
  if (status === 'invalidated') return row.invalid_reason || '优惠券已被作废';
  if (status === 'used') return '优惠券已使用';
  if (status === 'cancelled') return row.invalid_reason || '优惠券已失效';
  return '';
}

async function getCheckoutCoupons(userId, body) {
  const rows = await getUserApi().selectUserCouponsPage(userId, 'all', 100, 0);
  const usable = [];
  const unusable = [];
  for (const row of rows) {
    const coupon = getUserApi().buildEffectiveCoupon(row);
    const base = {
      user_coupon_id: row.id,
      id: row.id,
      coupon_id: coupon.id,
      title: coupon.title,
      type: coupon.type,
      value: coupon.value,
      min_amount: coupon.min_amount,
      valid_from: row.valid_from,
      valid_until: row.valid_until,
      scope_type: coupon.scope_type || 'all',
      category_ids: coupon.category_ids || [],
      category_names: coupon.category_names || [],
    };
    const preReason = couponUnavailableReason(row);
    if (preReason) {
      unusable.push({ ...base, reason: preReason });
      continue;
    }
    try {
      const pricing = await orderPricing.buildOrderPricing(userId, { ...body, coupon_id: row.id });
      const discount = Number(pricing.couponDiscount || 0);
      if (discount > 0) usable.push({ ...base, discount_amount: discount, reason: '可使用' });
      else unusable.push({ ...base, reason: '优惠券无法用于当前订单' });
    } catch (err) {
      unusable.push({ ...base, reason: err?.message || '优惠券不可用' });
    }
  }
  usable.sort((a, b) => Number(b.discount_amount || 0) - Number(a.discount_amount || 0));
  return {
    usable,
    unusable,
    best_coupon_id: usable[0]?.user_coupon_id || null,
  };
}

async function previewOrder(userId, body) {
  await assertOrderCapabilityUsage(body);
  const pricing = await orderPricing.buildOrderPricing(userId, body, null);
  return {
    data: {
      goods_amount: pricing.rawAmount,
      flash_sale_discount: pricing.flashSaleDiscount,
      full_reduction_discount: pricing.fullReductionDiscount,
      coupon_discount: pricing.couponDiscount,
      discount_amount: pricing.discountAmount,
      shipping_fee: pricing.shippingFee,
      final_amount: pricing.finalTotal,
      total_points: pricing.totalPoints,
      earned_points: pricing.loyalty?.earned_points || pricing.totalPoints || 0,
      points_used: pricing.loyalty?.points_used || 0,
      available_points: pricing.loyalty?.available_points || 0,
      max_usable_points: pricing.loyalty?.max_usable_points || 0,
      points_discount_amount: pricing.loyalty?.points_discount_amount || 0,
      point_value_myr: pricing.loyalty?.point_value_myr || 0.01,
      min_redeem_points: pricing.loyalty?.min_redeem_points || 0,
      redeem_step: pricing.loyalty?.redeem_step || 1,
      disabled_reason: pricing.loyalty?.disabled_reason || '',
      adjusted: !!pricing.loyalty?.adjusted,
      points_summary: pricing.loyalty?.points_summary || null,
      loyalty_meta: pricing.loyalty?.points_summary || null,
      available_reward_balance: pricing.loyalty?.available_reward_balance || 0,
      max_usable_reward_cash: pricing.loyalty?.max_usable_reward_cash || 0,
      reward_cash_discount_amount: pricing.loyalty?.reward_cash_discount_amount || 0,
      discount_lines: pricing.discount_lines,
      points_bonus_lines: pricing.points_bonus_lines || [],
      tax: pricing.taxSnap,
    },
  };
}

module.exports = {
  assertOrderCapabilityUsage,
  couponUnavailableReason,
  getCheckoutCoupons,
  previewOrder,
};

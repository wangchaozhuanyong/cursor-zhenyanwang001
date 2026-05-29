const { generateId, generateOrderNo } = require('../../../utils/helpers');
const { computeShippingFee, estimateWeightFromItems } = require('../../../utils/shippingFee');
const { NotFoundError, ValidationError } = require('../../../errors');
const { formatOrderItem, formatOrder } = require('../order.mapper');
const { enrichOrderWithPaymentDeadline } = require('../orderPaymentDeadline');
const { enrichOrderWithAutoConfirmReceiveDeadline } = require('../orderReceiveDeadline');
const repo = require('../repository/order.repository');
const checkoutAbandonmentRepo = require('../repository/checkoutAbandonment.repository');
const siteSettingsRepo = require('../repository/siteSettings.repository');
const sstTax = require('../sstTax');
const orderDb = repo.getPool();
const orderPricing = require('../order.pricing');
const orderPoints = require('./orderPoints.service');
const orderCheckout = require('./orderCheckout.service');
const { publishAdminEvent, emitAdminEvent } = require('../orderAdminEvents');
const { allocateOrderProfitSnapshot, normalizeMalaysiaAddress } = require('./orderCreate.helpers');

function getUserApi() {
  return /** @type {any} */ (require('../../user')).api || {};
}

function requireApiMethod(api, name) {
  if (!api || typeof api[name] !== 'function') {
    throw new Error(`模块 API 未暴露方法: ${name}`);
  }
  return api[name];
}

async function prepareOrderCatalog(conn, items, orderId, orderNo) {
  const productIds = items.map((i) => i.product_id);
  const products = await repo.selectProductsForUpdate(conn, productIds);
  const productMap = Object.fromEntries(products.map((p) => [p.id, p]));
  const requestedVariantIds = items.map((i) => i.variant_id).filter(Boolean);
  const requestedVariants = await repo.selectVariantsForUpdate(conn, requestedVariantIds);
  const defaultVariants = await repo.selectDefaultVariantsForProducts(conn, productIds);
  const variantById = new Map(requestedVariants.map((v) => [v.id, v]));
  const defaultVariantByProductId = new Map(defaultVariants.map((v) => [v.product_id, v]));
  const allCandidateVariantIds = [
    ...requestedVariants.map((v) => v.id),
    ...defaultVariants.map((v) => v.id),
  ];
  const specMap = await repo.selectVariantSpecValuesByVariantIds(conn, allCandidateVariantIds);
  const activityRows = await repo.selectFlashSaleActivityItemsForUpdate(conn, productIds);
  const activityMap = new Map();
  for (const row of activityRows) {
    if (!activityMap.has(row.product_id)) activityMap.set(row.product_id, row);
  }
  const fullReductionActivities = await repo.selectActiveFullReductionActivitiesForUpdate(conn);
  const requiredVariantQty = new Map();

  for (const item of items) {
    const p = productMap[item.product_id];
    if (!p) {
      throw new NotFoundError(`商品 ${item.product_id} 不存在或已下架`);
    }
    const variant = item.variant_id
      ? variantById.get(item.variant_id)
      : defaultVariantByProductId.get(item.product_id);
    if (!variant || variant.product_id !== item.product_id) {
      throw new ValidationError(`商品「${p.name}」请选择有效规格`);
    }
    requiredVariantQty.set(variant.id, Number(requiredVariantQty.get(variant.id) || 0) + Number(item.qty || 0));
    const activity = activityMap.get(item.product_id);
    if (activity) {
      const remaining = Number(activity.activity_stock || 0) - Number(activity.sold_count || 0);
      const limitPerUser = Number(activity.limit_per_user || 0);
      if (remaining < item.qty) {
        throw new ValidationError(`活动商品「${p.name}」库存不足，剩余 ${remaining} 件`);
      }
      if (limitPerUser > 0 && item.qty > limitPerUser) {
        throw new ValidationError(`活动商品「${p.name}」每单限购 ${limitPerUser} 件`);
      }
    }
  }

  for (const [variantId, requiredQty] of requiredVariantQty.entries()) {
    const result = await repo.ensureVariantStockWithAutoUnpack(conn, variantId, requiredQty, {
      orderId,
      orderNo,
      reason: `订单 ${orderNo} 库存不足自动拆包`,
    });
    if (!result.ok) {
      const variant = variantById.get(variantId)
        || requestedVariants.find((v) => v.id === variantId)
        || defaultVariants.find((v) => v.id === variantId);
      throw new ValidationError(`SKU「${variant?.title || variant?.sku_code || variantId}」库存不足，剩余 ${result.stock || 0} 件`);
    }
    const variant = variantById.get(variantId) || defaultVariants.find((v) => v.id === variantId);
    if (variant) variant.stock = result.stock;
  }

  return {
    productMap,
    variantById,
    defaultVariantByProductId,
    specMap,
    activityMap,
    fullReductionActivities,
  };
}

function buildOrderLineItems(items, {
  productMap,
  variantById,
  defaultVariantByProductId,
  specMap,
  activityMap,
}) {
  let rawAmount = 0;
  const orderItems = items.map((item) => {
    const p = productMap[item.product_id];
    const variant = item.variant_id
      ? variantById.get(item.variant_id)
      : defaultVariantByProductId.get(item.product_id);
    const activity = activityMap.get(item.product_id);
    const price = activity
      ? parseFloat(activity.activity_price)
      : parseFloat(variant?.price ?? p.price);
    const specs = variant?.id ? (specMap.get(variant.id) || []) : [];
    const specText = specs.map((x) => x.value).filter(Boolean).join(' / ');
    rawAmount += price * item.qty;
    return {
      productId: p.id,
      variantId: variant?.id || null,
      skuCode: variant?.sku_code || '',
      variantName: specText || variant?.title || '',
      specSnapshot: specs.length
        ? specs.map((x) => ({
          group_id: x.group_id,
          group_name: x.group_name,
          value_id: x.value_id,
          value: x.value,
        }))
        : null,
      name: p.name,
      image: p.cover_image,
      variantImage: variant?.image_url || '',
      price,
      unitOriginalPrice: variant?.original_price == null ? null : Number(variant.original_price),
      unitCostPrice: Number(variant?.cost_price || 0),
      points: p.points,
      qty: item.qty,
      activityId: activity?.activity_id || null,
      activityTitle: activity?.title || null,
    };
  });
  return { orderItems, rawAmount };
}

async function resolveOrderPricing(conn, userId, body, {
  orderItems,
  productMap,
  activityMap,
  fullReductionActivities,
  rawAmount,
  coupon_id,
  coupon_title,
  shipping_template_id,
  estimated_weight_kg,
  use_points,
  points_to_use,
  use_reward_cash,
  reward_cash_amount,
}) {
  const fullReductionDiscount = orderPricing.computeFullReductionDiscount(
    orderItems,
    productMap,
    fullReductionActivities,
  );
  const goodsAmountAfterFullReduction = Math.max(0, rawAmount - fullReductionDiscount);

  let shippingFee = 0;
  const tpl = shipping_template_id
    ? await repo.selectShippingTemplate(conn, shipping_template_id)
    : await repo.selectDefaultEnabledShippingTemplate(conn);
  if (tpl) {
    const w = estimated_weight_kg != null && Number.isFinite(Number(estimated_weight_kg))
      ? Number(estimated_weight_kg)
      : estimateWeightFromItems(body.items);
    shippingFee = computeShippingFee(tpl, rawAmount, w);
  }

  const flashSaleDiscount = orderPricing.computeFlashSaleSavings(orderItems, activityMap, productMap);
  const hasActivityDiscount = flashSaleDiscount > 0 || fullReductionDiscount > 0;
  const activityAllowsCoupon = fullReductionActivities.every((a) => !!a.allow_coupon_stack)
    && [...activityMap.values()].every((f) => f.allow_coupon_stack !== 0);

  let discountAmount = fullReductionDiscount;
  let usedCouponUcId = null;
  let usedCouponCouponId = null;
  let usedCouponTitle = coupon_title;
  let couponType = null;
  let couponDiscountValue = 0;

  if (coupon_id) {
    const uc = await repo.selectUserCouponForUpdate(conn, coupon_id, userId);
    if (!uc) {
      throw new ValidationError('优惠券不存在、已使用或不可用');
    }
    couponDiscountValue = orderPricing.assertCouponUsableOnOrder({
      uc,
      goodsAmountAfterFullReduction,
      shippingFee,
      orderItems,
      productMap,
      hasActivityDiscount,
      activityAllowsCoupon,
    });
    const effectiveCoupon = getUserApi().buildEffectiveCoupon(uc);
    couponType = effectiveCoupon.type;
    discountAmount += couponDiscountValue;
    usedCouponUcId = uc.uc_id;
    usedCouponCouponId = effectiveCoupon.id;
    usedCouponTitle = effectiveCoupon.title || coupon_title;
  }

  const nonShippingGoodsCoupon = couponType === 'shipping' ? 0 : couponDiscountValue;
  const goodsInclusiveTaxable = Math.max(0, rawAmount - fullReductionDiscount - nonShippingGoodsCoupon);
  const sstRows = await siteSettingsRepo.selectSiteSettingsByKeys([
    'sstEnabled',
    'sstRatePercent',
    'sstLabel',
  ]);
  const sstSettings = sstTax.parseSstSettingsFromSiteSettingsRows(sstRows);
  const taxSnap = sstTax.buildOrderTaxSnapshot(sstSettings, goodsInclusiveTaxable);

  const pricing = await orderPricing.buildOrderPricing(userId, {
    ...body,
    use_points,
    points_to_use,
    use_reward_cash,
    reward_cash_amount,
  }, conn);
  const loyalty = /** @type {any} */ (pricing.loyalty || {});
  discountAmount = Number(pricing.discountAmount || discountAmount);
  shippingFee = Number(pricing.shippingFee ?? shippingFee);
  const finalTaxSnap = pricing.taxSnap || taxSnap;
  const totalAmount = Number(pricing.finalTotal || Math.max(0, rawAmount - discountAmount + shippingFee));
  const totalPoints = Number(loyalty.earned_points || 0);

  return {
    loyalty,
    discountAmount,
    shippingFee,
    finalTaxSnap,
    totalAmount,
    totalPoints,
    flashSaleDiscount,
    fullReductionDiscount,
    activityDiscountAmount: Number(pricing.activityDiscountAmount ?? (
      flashSaleDiscount + fullReductionDiscount + Number(loyalty.member_level_discount || 0)
    )),
    shippingOriginalFee: Number(pricing.shippingOriginalFee ?? shippingFee),
    shippingDiscountAmount: Number(pricing.shippingDiscountAmount ?? Number(loyalty.member_free_shipping_discount || 0)),
    totalDiscountAmount: Number(pricing.totalDiscountAmount ?? (
      flashSaleDiscount
      + fullReductionDiscount
      + couponDiscountValue
      + Number(loyalty.member_level_discount || 0)
      + Number(loyalty.points_discount_amount || 0)
      + Number(loyalty.reward_cash_discount_amount || 0)
      + Number(loyalty.member_free_shipping_discount || 0)
    )),
    couponDiscountValue,
    usedCouponUcId,
    usedCouponCouponId,
    usedCouponTitle,
    discountMeta: {
      flash_sale_discount: flashSaleDiscount,
      full_reduction_discount: fullReductionDiscount,
      coupon_discount: couponDiscountValue,
      member_level_discount: Number(loyalty.member_level_discount || 0),
      member_free_shipping: Number(loyalty.member_free_shipping_discount || 0),
      points_discount: Number(loyalty.points_discount_amount || 0),
      reward_cash_discount: Number(loyalty.reward_cash_discount_amount || 0),
      lines: pricing.discount_lines || [],
    },
  };
}

async function persistOrder(conn, {
  userId,
  body,
  orderId,
  orderNo,
  items,
  orderItems,
  rawAmount,
  pricingResult,
  contact_name,
  contact_phone,
  address,
  note,
  shipping_name,
  payment_method,
}) {
  const {
    loyalty,
    discountAmount,
    shippingFee,
    finalTaxSnap,
    totalAmount,
    totalPoints,
    usedCouponUcId,
    usedCouponCouponId,
    usedCouponTitle,
    couponDiscountValue,
    discountMeta,
    flashSaleDiscount,
    fullReductionDiscount,
    activityDiscountAmount,
    shippingOriginalFee,
    shippingDiscountAmount,
    totalDiscountAmount,
  } = pricingResult;

  const normalizedAddress = normalizeMalaysiaAddress(address, contact_name, contact_phone);
  const profitSnapshot = allocateOrderProfitSnapshot(orderItems, {
    rawAmount,
    discountAmount,
    pointsDiscountAmount: Number(loyalty.points_discount_amount || 0),
    rewardCashDiscountAmount: Number(loyalty.reward_cash_discount_amount || 0),
    shippingFee,
  });
  const orderItemsWithProfit = profitSnapshot.items;
  const goodsOriginalAmount = Number(rawAmount || 0) + Number(flashSaleDiscount || 0);
  const goodsSaleAmount = Number(rawAmount || 0);
  const payableAmount = Number(totalAmount || 0);
  const amountSnapshot = {
    goods_original_amount: goodsOriginalAmount,
    goods_sale_amount: goodsSaleAmount,
    goods_net_sales_amount: profitSnapshot.summary.goodsNetSalesAmount,
    activity_discount_amount: Number(activityDiscountAmount || 0),
    coupon_discount_amount: Number(couponDiscountValue || 0),
    points_discount_amount: Number(loyalty.points_discount_amount || 0),
    reward_cash_discount_amount: Number(loyalty.reward_cash_discount_amount || 0),
    shipping_original_fee: Number(shippingOriginalFee || 0),
    shipping_discount_amount: Number(shippingDiscountAmount || 0),
    shipping_fee: Number(shippingFee || 0),
    total_discount_amount: Number(totalDiscountAmount || 0),
    payable_amount: payableAmount,
    paid_amount: 0,
    refunded_amount: 0,
    net_received_amount: 0,
    outstanding_amount: payableAmount,
    calculation_version: 'order_amount_snapshot_v1',
  };

  await repo.insertOrder(conn, {
    id: orderId,
    userId,
    orderNo,
    rawAmount,
    discountAmount,
    goodsOriginalAmount,
    goodsSaleAmount,
    activityDiscountAmount,
    couponDiscountAmount: couponDiscountValue,
    shippingOriginalFee,
    shippingDiscountAmount,
    totalDiscountAmount,
    payableAmount,
    paidAmount: 0,
    netReceivedAmount: 0,
    outstandingAmount: payableAmount,
    amountSnapshot,
    discountMeta,
    couponTitle: usedCouponTitle,
    shippingFee,
    shippingName: shipping_name,
    totalAmount,
    totalPoints,
    note,
    contactName: contact_name,
    contactPhone: contact_phone,
    address: normalizedAddress.text,
    addressLine1: normalizedAddress.line1,
    addressLine2: normalizedAddress.line2,
    addressCity: normalizedAddress.city,
    addressState: normalizedAddress.state,
    addressPostcode: normalizedAddress.postcode,
    addressCountry: normalizedAddress.country,
    paymentMethod: payment_method,
    taxMode: finalTaxSnap.tax_mode,
    taxRate: finalTaxSnap.tax_rate,
    taxLabel: finalTaxSnap.tax_label,
    taxableAmount: finalTaxSnap.taxable_amount,
    taxAmount: finalTaxSnap.tax_amount,
    taxExclusiveAmount: finalTaxSnap.tax_exclusive_amount,
    pointsUsed: Number(loyalty.points_used || 0),
    pointsDiscountAmount: Number(loyalty.points_discount_amount || 0),
    rewardCashUsed: Number(loyalty.reward_cash_used || 0),
    rewardCashDiscountAmount: Number(loyalty.reward_cash_discount_amount || 0),
    goodsCostAmount: profitSnapshot.summary.goodsCostAmount,
    goodsNetSalesAmount: profitSnapshot.summary.goodsNetSalesAmount,
    grossProfitAmount: profitSnapshot.summary.grossProfitAmount,
    shippingCostAmount: profitSnapshot.summary.shippingCostAmount,
    paymentFeeAmount: profitSnapshot.summary.paymentFeeAmount,
    netProfitAmount: profitSnapshot.summary.netProfitAmount,
    loyaltyMeta: {
      settings_snapshot: loyalty.points_settings_snapshot || null,
      product_rule_snapshots: loyalty.product_rule_snapshots || [],
      member_level_snapshot: loyalty.member_level_snapshot || { points_multiplier: 1 },
      points_used: Number(loyalty.points_used || 0),
      points_discount_amount: Number(loyalty.points_discount_amount || 0),
      earned_points: totalPoints,
      point_value_myr: Number(loyalty.point_value_myr || 0.01),
      max_usable_points: Number(loyalty.max_usable_points || 0),
      redeem_step: Number(loyalty.points_settings_snapshot?.redeem_step || 1),
      adjusted: !!loyalty.adjusted,
      disabled_reason: loyalty.disabled_reason || '',
      calculation_version: loyalty.calculation_version || 'loyalty_engine_v1',
      use_points: !!body.use_points,
      use_reward_cash: !!body.use_reward_cash,
      available_points: Number(loyalty.available_points || 0),
      available_reward_balance: Number(loyalty.available_reward_balance || 0),
      points_bonus_snapshots: loyalty.points_bonus_snapshots || [],
      points_bonus_lines: loyalty.points_bonus_lines || [],
    },
  });

  if (usedCouponUcId) {
    await repo.updateOrderCouponUcId(conn, orderId, usedCouponUcId);
    await repo.updateUserCouponUsed(conn, usedCouponUcId, {
      orderId,
      orderNo,
      userId,
      couponId: usedCouponCouponId,
      discountAmount: couponDiscountValue,
    });
  }
  if (body.checkout_abandonment_id) {
    await checkoutAbandonmentRepo.markOrdered(conn, body.checkout_abandonment_id, userId, {
      orderId,
      orderNo,
    });
  }

  if (Number(loyalty.points_used || 0) > 0) {
    await orderPoints.applyOrderRedeem(conn, {
      id: orderId,
      user_id: userId,
      order_no: orderNo,
      points_used: Number(loyalty.points_used || 0),
    });
  }
  if (Number(loyalty.reward_cash_used || 0) > 0) {
    const balance = await requireApiMethod(getUserApi(), 'sumRewardTransactionsBalance')(conn, userId);
    const useAmount = Number(loyalty.reward_cash_used || 0);
    if (Number(balance || 0) < useAmount) {
      throw new ValidationError('返现余额不足');
    }
    await requireApiMethod(getUserApi(), 'insertRewardTransaction')(conn, {
      id: generateId(),
      rewardRecordId: null,
      userId,
      orderId,
      orderNo,
      type: 'wallet_redeem_order',
      amount: -useAmount,
      status: 'success',
      reason: `订单返现余额抵扣 ${orderNo}`,
      metadata: { trigger: 'create_order' },
    });
  }

  const earnItemsByProductId = new Map((loyalty.item_results || []).map((x) => [String(x.product_id), x]));
  const redeemItemsByProductId = new Map((loyalty.redeem_item_results || []).map((x) => [String(x.product_id), x]));
  for (const oi of orderItemsWithProfit) {
    const earnLine = earnItemsByProductId.get(String(oi.productId)) || {};
    const redeemLine = redeemItemsByProductId.get(String(oi.productId)) || {};
    await repo.insertOrderItem(conn, {
      id: generateId(),
      orderId,
      productId: oi.productId,
      variantId: oi.variantId,
      skuCode: oi.skuCode,
      variantName: oi.variantName,
      specSnapshot: oi.specSnapshot,
      productName: oi.name,
      productImage: oi.image,
      variantImage: oi.variantImage,
      price: oi.price,
      points: oi.points,
      earnedPoints: Number(earnLine.earned_points || 0),
      pointsRuleSnapshot: earnLine.points_rule_snapshot || redeemLine.points_rule_snapshot || null,
      redeemableAmount: Number(redeemLine.redeemable_amount || 0),
      isRestrictedExcluded: !!redeemLine.is_restricted_excluded,
      linePointsBaseAmount: Number(earnLine.line_points_base_amount || 0),
      unitCostPrice: oi.unitCostPrice,
      costAmount: oi.costAmount,
      discountAllocated: oi.discountAllocated,
      netSalesAmount: oi.netSalesAmount,
      grossProfitAmount: oi.grossProfitAmount,
      costSnapshotSource: oi.costSnapshotSource,
      qty: oi.qty,
      activityId: oi.activityId,
      activityTitle: oi.activityTitle,
    });
  }

  for (const oi of orderItemsWithProfit) {
    if (oi.activityId) {
      const n = await repo.incrementActivitySold(conn, oi.activityId, oi.productId, oi.qty);
      if (!n) {
        throw new ValidationError(`活动商品「${oi.name}」库存不足`);
      }
    }
    if (oi.variantId) {
      const affected = await repo.deductVariantStock(conn, oi.variantId, oi.qty, {
        refType: 'order',
        refId: orderId,
        orderNo,
        reason: oi.activityId
          ? `订单 ${orderNo} 活动「${oi.activityTitle || oi.activityId}」下单扣减 SKU 库存`
          : `订单 ${orderNo} 下单扣减 SKU 库存`,
      });
      if (affected === 0) {
        throw new ValidationError(`SKU「${oi.variantName || oi.skuCode || oi.name}」库存不足`);
      }
      continue;
    }
    throw new ValidationError(`商品「${oi.name}」缺少 SKU 信息，请先修复商品默认规格后再下单`);
  }

  await repo.deleteCartItemsForLines(
    conn,
    userId,
    items.map((i) => ({ product_id: i.product_id, variant_id: i.variant_id || '' })),
  );

  await repo.insertAnalyticsEvent(conn, {
    user_id: userId,
    dedupe_key: `order_submit:${orderId}:order`,
    event_type: 'order_submit',
    module: 'order',
    page: '/checkout',
    keyword: String(body?.search_keyword || '').trim().slice(0, 100),
    order_id: orderId,
    amount: totalAmount,
    quantity: orderItems.reduce((sum, it) => sum + Number(it.qty || 0), 0),
  });

  return { orderItemsWithProfit, totalAmount };
}

async function createOrder(userId, body) {
  await orderCheckout.assertOrderCapabilityUsage(body);
  const {
    items,
    contact_name,
    contact_phone,
    address,
    note,
    coupon_id,
    coupon_title,
    shipping_template_id,
    shipping_name,
    payment_method,
    estimated_weight_kg,
    use_points,
    points_to_use,
    use_reward_cash,
    reward_cash_amount,
  } = body;

  const conn = await repo.getConnection();
  try {
    await conn.beginTransaction();
    const orderId = generateId();
    const orderNo = generateOrderNo();

    const catalog = await prepareOrderCatalog(conn, items, orderId, orderNo);
    const { orderItems, rawAmount } = buildOrderLineItems(items, catalog);
    const pricingResult = await resolveOrderPricing(conn, userId, body, {
      orderItems,
      productMap: catalog.productMap,
      activityMap: catalog.activityMap,
      fullReductionActivities: catalog.fullReductionActivities,
      rawAmount,
      coupon_id,
      coupon_title,
      shipping_template_id,
      estimated_weight_kg,
      use_points,
      points_to_use,
      use_reward_cash,
      reward_cash_amount,
    });
    const { orderItemsWithProfit, totalAmount } = await persistOrder(conn, {
      userId,
      body,
      orderId,
      orderNo,
      items,
      orderItems,
      rawAmount,
      pricingResult,
      contact_name,
      contact_phone,
      address,
      note,
      shipping_name,
      payment_method,
    });

    await conn.commit();

    publishAdminEvent({
      type: 'order.created',
      objectId: orderId,
      summary: orderNo,
    });
    emitAdminEvent({
      eventType: 'order.created',
      category: 'order',
      severity: 'P3',
      status: 'resolved',
      title: '订单创建',
      message: `订单 ${orderNo} 已创建`,
      entityType: 'order',
      entityId: orderId,
      fingerprint: { eventType: 'order.created', entityType: 'order', entityId: orderId },
      payload: { orderNo, userId, totalAmount },
      impactAmount: totalAmount,
      source: 'order_checkout',
    });

    const formattedItems = orderItemsWithProfit.map((oi) => formatOrderItem({
      product_id: oi.productId,
      variant_id: oi.variantId,
      sku_code: oi.skuCode,
      variant_name: oi.variantName,
      product_name: oi.name,
      product_image: oi.image,
      price: oi.price,
      points: oi.points,
      qty: oi.qty,
      subtotal: oi.price * oi.qty,
    }));
    const orderRow = await repo.selectOrderById(orderDb, orderId);
    const withPaymentDeadline = await enrichOrderWithPaymentDeadline(formatOrder(orderRow, formattedItems));
    const data = await enrichOrderWithAutoConfirmReceiveDeadline(withPaymentDeadline);
    return { data, message: '下单成功' };
  } catch (err) {
    try {
      await conn.rollback();
    } catch { /* ignore */ }
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = {
  createOrder,
  prepareOrderCatalog,
  buildOrderLineItems,
  resolveOrderPricing,
};

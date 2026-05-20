const { generateId, generateOrderNo } = require('../../../utils/helpers');
const { computeShippingFee, estimateWeightFromItems } = require('../../../utils/shippingFee');
const {
  NotFoundError,
  ValidationError,
} = require('../../../errors');
const { formatOrderItem, formatOrder } = require('../order.mapper');
const {
  enrichOrderWithPaymentDeadline,
  enrichOrdersWithPaymentDeadline,
} = require('../orderPaymentDeadline');
const {
  enrichOrderWithAutoConfirmReceiveDeadline,
  enrichOrdersWithAutoConfirmReceiveDeadline,
} = require('../orderReceiveDeadline');
const { canUserCancel } = require('../orderStateMachine');
const repo = require('../repository/order.repository');
const userModule = require('../../user');
const paymentsModule = require('../../payment');
const checkoutAbandonmentRepo = require('../repository/checkoutAbandonment.repository');
const siteSettingsRepo = require('../repository/siteSettings.repository');
const sstTax = require('../sstTax');
const { ORDER_STATUS, PAYMENT_STATUS } = require('../../../constants/status');
const logisticsModule = require('../../logistics');
const orderDb = repo.getPool();
const orderPricing = require('../order.pricing');
const orderPoints = require('./orderPoints.service');

function getUserApi() {
  return /** @type {any} */ (userModule).api || {};
}

function getPaymentsApi() {
  return /** @type {any} */ (paymentsModule).api || {};
}

function getLogisticsApi() {
  return /** @type {any} */ (logisticsModule).api || {};
}

function attachOrderItemReviewFlags(order, items) {
  const isCompleted = order?.status === ORDER_STATUS.COMPLETED;
  return items.map((item) => ({
    ...item,
    can_review: Boolean(isCompleted && !item.review_id),
  }));
}

function requireApiMethod(api, name) {
  if (!api || typeof api[name] !== 'function') {
    throw new Error(`模块 API 未暴露方法: ${name}`);
  }
  return api[name];
}

function requireLogisticsApi(name) {
  const fn = getLogisticsApi()[name];
  if (typeof fn !== 'function') {
    throw new Error(`Logistics 模块 API 未暴露方法: ${name}`);
  }
  return fn;
}

function calculateCouponDiscount(coupon, rawAmount, shippingFee) {
  const type = coupon.type;
  const value = parseFloat(coupon.value) || 0;
  if (type === 'fixed') {
    return Math.min(value, rawAmount);
  }
  if (type === 'percentage') {
    return Math.min(rawAmount, Math.floor(rawAmount * value / 100));
  }
  if (type === 'shipping') {
    return Math.min(shippingFee, value > 0 ? value : shippingFee);
  }
  return 0;
}

/** 同一满减活动下，活动商品小计达到门槛后减免一次（按活动 ID 聚合） */
function computeFullReductionDiscount(orderItems, activityByProductId) {
  const byActivity = new Map();
  for (const oi of orderItems) {
    const act = activityByProductId.get(oi.productId);
    if (!act || act.type !== 'full_reduction') continue;
    const aid = act.activity_id;
    const line = oi.price * oi.qty;
    const cur = byActivity.get(aid) || {
      subtotal: 0,
      threshold: act.threshold_amount,
      discount: act.discount_amount,
      rules: (() => {
        try {
          const cfg = act.activity_config ? (typeof act.activity_config === 'string' ? JSON.parse(act.activity_config) : act.activity_config) : null;
          return Array.isArray(cfg?.full_reduction_rules) ? cfg.full_reduction_rules : [];
        } catch {
          return [];
        }
      })(),
    };
    cur.subtotal += line;
    byActivity.set(aid, cur);
  }
  let sum = 0;
  for (const [, g] of byActivity) {
    const rules = [];
    if (Array.isArray(g.rules) && g.rules.length) {
      for (const r of g.rules) {
        const th = Number(r.threshold_amount || 0);
        const disc = Number(r.discount_amount || 0);
        if (th > 0 && disc > 0) rules.push({ th, disc });
      }
    } else {
      const th = g.threshold != null && g.threshold !== '' ? Number(g.threshold) : 0;
      const disc = g.discount != null && g.discount !== '' ? Number(g.discount) : 0;
      if (th > 0 && disc > 0) rules.push({ th, disc });
    }
    let best = 0;
    for (const r of rules) {
      if (g.subtotal >= r.th) best = Math.max(best, r.disc);
    }
    if (best > 0) {
      sum += Math.min(best, g.subtotal);
    }
  }
  return sum;
}

function normalizeMalaysiaAddress(address, contactName, contactPhone) {
  if (address && typeof address === 'object') {
    const line1 = String(address.line1 || '').trim();
    const city = String(address.city || '').trim();
    const state = String(address.state || '').trim();
    const postcode = String(address.postcode || '').trim();
    if (!line1 || !city || !state || !postcode) {
      throw new ValidationError('请填写完整的马来西亚收货地址：地址、城市、州属和邮编');
    }
    return {
      text: [
        address.recipient_name || contactName,
        address.phone || contactPhone,
        line1,
        address.line2,
        city,
        state,
        postcode,
        'MY',
      ].filter(Boolean).join(', '),
      line1,
      line2: String(address.line2 || '').trim(),
      city,
      state,
      postcode,
      country: 'MY',
    };
  }
  const text = String(address || '').trim();
  return {
    text,
    line1: text,
    line2: '',
    city: '',
    state: '',
    postcode: '',
    country: 'MY',
  };
}

/**
 * 创建订单。形状校验已由 routes 层 zod schema 完成。
 * 这里仅做业务规则（库存、优惠券资格、积分扣减、邀请奖励）与事务编排。
 * @param {string} userId
 * @param {object} body
 */
async function createOrder(userId, body) {
  const {
    items, contact_name, contact_phone, address, note,
    coupon_id, coupon_title, shipping_template_id, shipping_name, payment_method,
    estimated_weight_kg,
    use_points, points_to_use, use_reward_cash, reward_cash_amount,
  } = body;

  const conn = await repo.getConnection();
  try {
    await conn.beginTransaction();

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

    for (const item of items) {
      const p = productMap[item.product_id];
      if (!p) {
        await conn.rollback();
        throw new NotFoundError(`商品 ${item.product_id} 不存在或已下架`);
      }
      if (p.stock < item.qty) {
        await conn.rollback();
        throw new ValidationError(`商品「${p.name}」库存不足，剩余 ${p.stock} 件`);
      }
      const variant = item.variant_id
        ? variantById.get(item.variant_id)
        : defaultVariantByProductId.get(item.product_id);
      if (!variant || variant.product_id !== item.product_id) {
        await conn.rollback();
        throw new ValidationError(`商品「${p.name}」请选择有效规格`);
      }
      if (Number(variant.stock || 0) < item.qty) {
        await conn.rollback();
        throw new ValidationError(`SKU「${variant.title || variant.sku_code || p.name}」库存不足，剩余 ${variant.stock} 件`);
      }
      const activity = activityMap.get(item.product_id);
      if (activity) {
        const remaining = Number(activity.activity_stock || 0) - Number(activity.sold_count || 0);
        const limitPerUser = Number(activity.limit_per_user || 0);
        if (remaining < item.qty) {
          await conn.rollback();
          throw new ValidationError(`活动商品「${p.name}」库存不足，剩余 ${remaining} 件`);
        }
        if (limitPerUser > 0 && item.qty > limitPerUser) {
          await conn.rollback();
          throw new ValidationError(`活动商品「${p.name}」每单限购 ${limitPerUser} 件`);
        }
      }
    }

    let rawAmount = 0;
    let totalPoints = 0;
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
        // Legacy only: preserve old product points snapshot; new order points come from pointsEngine item_results.
        points: p.points,
        qty: item.qty,
        activityId: activity?.activity_id || null,
        activityTitle: activity?.title || null,
      };
    });

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
        : estimateWeightFromItems(items);
      shippingFee = computeShippingFee(tpl, rawAmount, w);
    }

    const flashSaleDiscount = orderPricing.computeFlashSaleSavings(orderItems, activityMap, productMap);
    const hasActivityDiscount = flashSaleDiscount > 0 || fullReductionDiscount > 0;
    const activityAllowsCoupon = fullReductionActivities.every((a) => !!a.allow_coupon_stack)
      && [...activityMap.values()].every((f) => f.allow_coupon_stack !== 0);

    let discountAmount = fullReductionDiscount;
    let usedCouponUcId = null;
    let usedCouponTitle = coupon_title;
    let couponType = null;
    let couponDiscountValue = 0;
    if (coupon_id) {
      const uc = await repo.selectUserCouponForUpdate(conn, coupon_id, userId);
      if (!uc) {
        await conn.rollback();
        throw new ValidationError('优惠券不存在、已使用或不可用');
      }
      try {
        couponDiscountValue = orderPricing.assertCouponUsableOnOrder({
          uc,
          goodsAmountAfterFullReduction,
          shippingFee,
          orderItems,
          productMap,
          hasActivityDiscount,
          activityAllowsCoupon,
        });
      } catch (e) {
        await conn.rollback();
        throw e;
      }
      couponType = uc.type;
      discountAmount += couponDiscountValue;
      await repo.updateUserCouponUsed(conn, uc.uc_id);
      usedCouponUcId = uc.uc_id;
      usedCouponTitle = uc.title || coupon_title;
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
    const totalAmount = Number(pricing.finalTotal || Math.max(0, rawAmount - discountAmount + shippingFee));
    totalPoints = Number(loyalty.earned_points || totalPoints || 0);
    const discountMeta = {
      flash_sale_discount: flashSaleDiscount,
      full_reduction_discount: fullReductionDiscount,
      coupon_discount: couponDiscountValue,
      points_discount: Number(loyalty.points_discount_amount || 0),
      reward_cash_discount: Number(loyalty.reward_cash_discount_amount || 0),
      lines: [
        flashSaleDiscount > 0 ? { type: 'flash_sale', label: '秒杀优惠', amount: flashSaleDiscount } : null,
        fullReductionDiscount > 0 ? { type: 'full_reduction', label: '满减优惠', amount: fullReductionDiscount } : null,
        couponDiscountValue > 0
          ? { type: 'coupon', label: usedCouponTitle ? `优惠券（${usedCouponTitle}）` : '优惠券抵扣', amount: couponDiscountValue }
          : null,
        Number(loyalty.points_discount_amount || 0) > 0
          ? { type: 'points', label: '积分抵扣', amount: Number(loyalty.points_discount_amount || 0) }
          : null,
        Number(loyalty.reward_cash_discount_amount || 0) > 0
          ? { type: 'reward_cash', label: '返现余额抵扣', amount: Number(loyalty.reward_cash_discount_amount || 0) }
          : null,
      ].filter(Boolean),
    };
    const orderId = generateId();
    const orderNo = generateOrderNo();
    const normalizedAddress = normalizeMalaysiaAddress(address, contact_name, contact_phone);

    await repo.insertOrder(conn, {
      id: orderId,
      userId,
      orderNo,
      rawAmount,
      discountAmount,
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
      taxMode: taxSnap.tax_mode,
      taxRate: taxSnap.tax_rate,
      taxLabel: taxSnap.tax_label,
      taxableAmount: taxSnap.taxable_amount,
      taxAmount: taxSnap.tax_amount,
      taxExclusiveAmount: taxSnap.tax_exclusive_amount,
      pointsUsed: Number(loyalty.points_used || 0),
      pointsDiscountAmount: Number(loyalty.points_discount_amount || 0),
      rewardCashUsed: Number(loyalty.reward_cash_used || 0),
      rewardCashDiscountAmount: Number(loyalty.reward_cash_discount_amount || 0),
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
        use_points: !!use_points,
        use_reward_cash: !!use_reward_cash,
        available_points: Number(loyalty.available_points || 0),
        available_reward_balance: Number(loyalty.available_reward_balance || 0),
      },
    });

    if (usedCouponUcId) {
      await repo.updateOrderCouponUcId(conn, orderId, usedCouponUcId);
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
        await conn.rollback();
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
    for (const oi of orderItems) {
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
        qty: oi.qty,
        activityId: oi.activityId,
        activityTitle: oi.activityTitle,
      });
    }

    for (const oi of orderItems) {
      if (oi.activityId) {
        const n = await repo.incrementActivitySold(conn, oi.activityId, oi.productId, oi.qty);
        if (!n) {
          await conn.rollback();
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
          await conn.rollback();
          throw new ValidationError(`SKU「${oi.variantName || oi.skuCode || oi.name}」库存不足`);
        }
        continue;
      }
      await conn.rollback();
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
      order_id: orderId,
      amount: totalAmount,
      quantity: orderItems.reduce((sum, it) => sum + Number(it.qty || 0), 0),
    });

    await conn.commit();

    const formattedItems = orderItems.map((oi) => formatOrderItem({
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

async function getOrders(userId, query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(query.pageSize, 10) || 10));
  const { status, tab } = query;

  const filters = { userId, status, tab };
  const total = await repo.countOrdersForUser(orderDb, filters);
  const offset = (page - 1) * pageSize;
  const orders = await repo.selectOrdersPage(orderDb, filters, pageSize, offset);

  if (!orders.length) {
    return { kind: 'paginate', list: [], total, page, pageSize };
  }

  const orderIds = orders.map((o) => o.id);
  const allItems = await repo.selectOrderItemsByOrderIds(orderDb, orderIds);

  const itemMap = {};
  for (const oi of allItems) {
    if (!itemMap[oi.order_id]) itemMap[oi.order_id] = [];
    itemMap[oi.order_id].push(oi);
  }

  const withPaymentDeadlines = await enrichOrdersWithPaymentDeadline(
    orders.map((o) => formatOrder(o, attachOrderItemReviewFlags(o, (itemMap[o.id] || []).map(formatOrderItem)))),
  );
  const list = await enrichOrdersWithAutoConfirmReceiveDeadline(withPaymentDeadlines);
  return { kind: 'paginate', list, total, page, pageSize };
}

async function getOrderSummary(userId) {
  return repo.selectOrderSummary(orderDb, userId);
}

async function getOrderById(userId, orderId) {
  const order = await repo.selectOrderByIdAndUser(orderDb, orderId, userId);
  if (!order) throw new NotFoundError('订单不存在');
  const items = await repo.selectOrderItems(orderDb, order.id);
  let data = formatOrder(order, attachOrderItemReviewFlags(order, items.map(formatOrderItem)));
  await requireLogisticsApi('attachTracking')(data);
  data = await enrichOrderWithPaymentDeadline(data);
  data = await enrichOrderWithAutoConfirmReceiveDeadline(data);
  return { data };
}

async function cancelPendingOrderInTransaction(conn, order, options = {}) {
  const trigger = options.trigger || 'order_cancel';
  const cancelReason = options.cancelReason || `订单 ${order.order_no} 取消`;
  const stockReason = options.stockReason || `订单 ${order.order_no} 取消释放库存`;
  const pointReason = options.pointReason || `订单取消回滚积分 ${order.order_no}`;

  await repo.updateOrderCancelled(conn, order.id, cancelReason);
  await checkoutAbandonmentRepo.markClosedByOrderId(conn, order.id);

  const lineItems = await repo.selectOrderItemQtyRows(conn, order.id);
  for (const item of lineItems) {
    if (!item.variant_id) {
      throw new ValidationError(`订单 ${order.order_no} 存在缺失 SKU 的明细，无法执行库存释放`);
    }
    await repo.restoreVariantStock(conn, item.variant_id, item.qty, {
      refType: 'order',
      refId: order.id,
      orderNo: order.order_no,
      reason: stockReason,
    });
    if (item.activity_id) {
      await repo.decrementActivitySold(conn, item.activity_id, item.product_id, item.qty);
    }
  }

  await orderPoints.reverseOrderEarnPoints(conn, order, {
    trigger,
    description: pointReason,
  });
  if (Number(order.points_used || 0) > 0) {
    await orderPoints.reverseOrderRedeem(conn, order, {
      trigger,
      description: `订单取消退回积分 ${order.order_no}`,
    });
  }
  if (Number(order.reward_cash_used || 0) > 0) {
    await requireApiMethod(getUserApi(), 'insertRewardTransaction')(conn, {
      id: generateId(),
      rewardRecordId: null,
      userId: order.user_id,
      orderId: order.id,
      orderNo: order.order_no,
      type: 'wallet_redeem_refund',
      amount: Number(order.reward_cash_used || 0),
      status: 'success',
      reason: `订单取消退回返现余额 ${order.order_no}`,
      metadata: { trigger: trigger || 'order_cancel' },
    });
  }

  if (order.coupon_uc_id) {
    await repo.restoreUserCouponById(conn, order.coupon_uc_id);
  } else if (order.coupon_title) {
    await repo.restoreUserCouponHeuristic(conn, order.user_id, order.created_at);
  }
}

async function cancelOrder(userId, orderId) {
  const conn = await repo.getConnection();
  try {
    await conn.beginTransaction();

    const order = await repo.selectOrderByIdAndUserForUpdate(conn, orderId, userId);
    if (!order) throw new NotFoundError('订单不存在');
    if (!canUserCancel(order)) throw new ValidationError('当前订单状态无法取消（仅未付款待处理订单可取消）');

    await cancelPendingOrderInTransaction(conn, order, {
      trigger: 'user_cancel_order',
      cancelReason: `用户取消订单 ${order.order_no}`,
      stockReason: `订单 ${order.order_no} 取消释放库存`,
      pointReason: `订单取消回滚积分 ${order.order_no}`,
    });
    await requireApiMethod(getUserApi(), 'syncStatsAfterOrderCancelled')(order.user_id, order.id, conn);

    await conn.commit();
    return { data: null, message: '订单已取消' };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function payOrder(userId, orderId, body) {
  const channel = body?.channel || '';
  const order = await repo.selectOrderByIdAndUser(orderDb, orderId, userId);
  if (!order) throw new NotFoundError('订单不存在');
  if (order.status !== ORDER_STATUS.PENDING || (order.payment_status || PAYMENT_STATUS.PENDING) !== PAYMENT_STATUS.PENDING) {
    throw new ValidationError('当前订单状态无法支付');
  }
  if (channel === 'reward_wallet') {
    return requireApiMethod(getPaymentsApi(), 'payWithRewardWallet')(userId, orderId);
  }
  if (channel === 'mock') {
    throw new ValidationError('生产环境已禁用 mock 支付，请使用 Stripe Checkout 完成支付');
  }
  throw new ValidationError('请使用 Stripe Checkout 发起支付，支付结果以服务端 Webhook 回写为准');
}

async function createStripeCheckoutSession(userId, orderId) {
  const r = await requireApiMethod(getPaymentsApi(), 'createStripeCheckoutForOrder')(userId, orderId, '', undefined);
  return { data: { url: r.data.url } };
}

/**
 * 将已发货订单标记完成并结算积分、返现（调用方需保证当前为 SHIPPED 且在事务内已加锁，如需）
 * @param {import('mysql2/promise').PoolConnection} conn
 * @param {Record<string, unknown>} order
 * @param {Record<string, unknown>} [options]
 */
async function completeShippedOrder(conn, order, options = {}) {
  await repo.updateOrderStatus(conn, order.id, ORDER_STATUS.COMPLETED);
  await orderPoints.grantOrderEarnPoints(conn, order, {
    ...options,
    timing: 'order_completed',
  });
  await requireApiMethod(getUserApi(), 'settleOrderRewards')(conn, order, options);
}

async function confirmReceive(userId, orderId) {
  const conn = await repo.getConnection();
  try {
    const order = await repo.selectOrderByIdAndUser(conn, orderId, userId);
    if (!order) throw new NotFoundError('订单不存在');
    if (order.status !== ORDER_STATUS.SHIPPED) throw new ValidationError('当前状态无法确认收货');

    await conn.beginTransaction();

    await completeShippedOrder(conn, order, { trigger: 'user_confirm_receive' });

    await conn.commit();
    return { data: null, message: '已确认收货' };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function previewOrder(userId, body) {
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
      disabled_reason: pricing.loyalty?.disabled_reason || '',
      adjusted: !!pricing.loyalty?.adjusted,
      points_summary: pricing.loyalty?.points_summary || null,
      loyalty_meta: pricing.loyalty?.points_summary || null,
      available_reward_balance: pricing.loyalty?.available_reward_balance || 0,
      max_usable_reward_cash: pricing.loyalty?.max_usable_reward_cash || 0,
      reward_cash_discount_amount: pricing.loyalty?.reward_cash_discount_amount || 0,
      discount_lines: pricing.discount_lines,
      tax: pricing.taxSnap,
    },
  };
}

module.exports = {
  createOrder,
  previewOrder,
  getOrders,
  getOrderSummary,
  getOrderById,
  cancelOrder,
  payOrder,
  createStripeCheckoutSession,
  confirmReceive,
  completeShippedOrder,
  cancelPendingOrderInTransaction,
};








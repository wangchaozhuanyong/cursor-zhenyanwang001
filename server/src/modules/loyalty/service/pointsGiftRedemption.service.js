const { generateId, generateOrderNo } = require('../../../utils/helpers');
const { ValidationError, NotFoundError, BusinessError } = require('../../../errors');
const { ORDER_STATUS, PAYMENT_STATUS } = require('../../../constants/status');
const giftRepo = require('../repository/pointsGift.repository');

function getOrderApi() {
  return /** @type {any} */ (require('../../order')).api || {};
}

function getProductApi() {
  return /** @type {any} */ (require('../../product')).api || {};
}

function getUserApi() {
  return /** @type {any} */ (require('../../user')).api || {};
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
        contactName,
        contactPhone,
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
  throw new ValidationError('请填写完整的收货地址');
}

function formatGiftItem(row, product) {
  const stockLimit = Number(row.stock_limit || 0);
  const redeemed = Number(row.redeemed_count || 0);
  const remaining = stockLimit > 0 ? Math.max(0, stockLimit - redeemed) : null;
  return {
    id: row.id,
    product_id: row.product_id,
    variant_id: row.variant_id || null,
    title: row.title || product?.name || '',
    image: row.image || product?.cover_image || '',
    required_points: Number(row.required_points || 0),
    cash_amount: Number(row.cash_amount || 0),
    stock_limit: stockLimit,
    redeemed_count: redeemed,
    remaining_stock: remaining,
    limit_per_user: Number(row.limit_per_user || 0),
    start_at: row.start_at,
    end_at: row.end_at,
    enabled: !!row.enabled,
    sort_order: Number(row.sort_order || 0),
    product_name: product?.name || '',
    product_stock: product?.stock ?? null,
  };
}

async function listActiveGiftItems() {
  const rows = await giftRepo.selectActiveGiftItems(getOrderApi().getPool());
  const out = [];
  for (const row of rows) {
    const product = await getProductApi().getProductById(row.product_id);
    if (!product) continue;
    out.push(formatGiftItem(row, product));
  }
  return { list: out };
}

async function getGiftItem(id) {
  const row = await giftRepo.selectGiftItemById(getOrderApi().getPool(), id);
  if (!row || !row.enabled) throw new NotFoundError('礼品不存在或已下架');
  const product = await getProductApi().getProductById(row.product_id);
  if (!product) throw new NotFoundError('关联商品不存在');
  return { data: formatGiftItem(row, product) };
}

async function redeemGift(userId, body) {
  const giftItemId = String(body.gift_item_id || body.giftItemId || '').trim();
  const quantity = Math.max(1, Math.trunc(Number(body.quantity || 1)));
  const {
    contact_name: contactName,
    contact_phone: contactPhone,
    address,
    note,
    shipping_template_id: shippingTemplateId,
    shipping_name: shippingName,
  } = body;
  if (!giftItemId) throw new ValidationError('请选择礼品');
  if (!contactName || !contactPhone || !address) {
    throw new ValidationError('请填写收货人、电话和地址');
  }

  const conn = await getOrderApi().getConnection();
  try {
    await conn.beginTransaction();
    const gift = await giftRepo.selectGiftItemByIdForUpdate(conn, giftItemId);
    if (!gift || !gift.enabled) {
      throw new ValidationError('礼品不存在或已下架');
    }
    const now = new Date();
    if (gift.start_at && new Date(gift.start_at) > now) throw new ValidationError('礼品兑换尚未开始');
    if (gift.end_at && new Date(gift.end_at) < now) throw new ValidationError('礼品兑换已结束');

    const stockLimit = Number(gift.stock_limit || 0);
    const redeemed = Number(gift.redeemed_count || 0);
    if (stockLimit > 0 && redeemed + quantity > stockLimit) {
      throw new ValidationError('礼品库存不足');
    }

    const limitPerUser = Number(gift.limit_per_user || 0);
    if (limitPerUser > 0) {
      const usedQty = await giftRepo.countUserGiftRedemptions(conn, userId, giftItemId);
      if (usedQty + quantity > limitPerUser) {
        throw new ValidationError(`每人限兑 ${limitPerUser} 件`);
      }
    }

    const pointsNeeded = Number(gift.required_points || 0) * quantity;
    const cashAmount = Number(gift.cash_amount || 0) * quantity;
    const balance = Number(await getUserApi().selectUserPointsBalance(userId));
    if (balance < pointsNeeded) throw new ValidationError('积分不足');

    const product = await getProductApi().getProductById(gift.product_id);
    if (!product) throw new ValidationError('关联商品不存在');

    let variantId = gift.variant_id || null;
    const productIds = [gift.product_id];
    const variants = variantId
      ? await getOrderApi().selectVariantsForUpdate(conn, [variantId])
      : await getOrderApi().selectDefaultVariantsForProducts(conn, productIds);
    const variant = variantId
      ? variants.find((v) => v.id === variantId)
      : variants[0];
    if (!variant) throw new ValidationError('商品规格不可用');
    variantId = variant.id;

    const stockResult = await getOrderApi().ensureVariantStockWithAutoUnpack(conn, variantId, quantity, {
      reason: '积分礼品兑换扣库存',
    });
    if (!stockResult.ok) throw new ValidationError('商品库存不足');

    const orderId = generateId();
    const orderNo = generateOrderNo();
    const redemptionId = generateId();
    const normalizedAddress = normalizeMalaysiaAddress(address, contactName, contactPhone);
    const paymentMethod = cashAmount > 0 ? 'points_plus_cash' : 'points_gift';
    const paymentStatus = cashAmount > 0 ? PAYMENT_STATUS.PENDING : PAYMENT_STATUS.PAID;
    const unitPrice = cashAmount / quantity;

    const loyaltyMeta = {
      order_type: 'points_gift',
      gift_item_id: giftItemId,
      gift_redemption_id: redemptionId,
      points_used: pointsNeeded,
      cash_amount: cashAmount,
      calculation_version: 'points_gift_v1',
    };

    await getOrderApi().insertOrder(conn, {
      id: orderId,
      userId,
      orderNo,
      orderType: 'points_gift',
      rawAmount: cashAmount,
      discountAmount: 0,
      discountMeta: { gift_redemption: true },
      couponTitle: '',
      shippingFee: 0,
      shippingName: shippingName || '',
      totalAmount: cashAmount,
      totalPoints: 0,
      note: note || '积分礼品兑换',
      contactName,
      contactPhone,
      address: normalizedAddress.text,
      addressLine1: normalizedAddress.line1,
      addressLine2: normalizedAddress.line2,
      addressCity: normalizedAddress.city,
      addressState: normalizedAddress.state,
      addressPostcode: normalizedAddress.postcode,
      addressCountry: normalizedAddress.country,
      paymentMethod,
      paymentStatus,
      pointsUsed: pointsNeeded,
      pointsDiscountAmount: 0,
      rewardCashUsed: 0,
      rewardCashDiscountAmount: 0,
      loyaltyMeta,
      goodsCostAmount: Number(variant.cost_price || 0) * quantity,
      goodsNetSalesAmount: cashAmount,
      grossProfitAmount: cashAmount - Number(variant.cost_price || 0) * quantity,
      shippingCostAmount: 0,
      paymentFeeAmount: 0,
      netProfitAmount: cashAmount - Number(variant.cost_price || 0) * quantity,
    });

    await getOrderApi().insertOrderItem(conn, {
      id: generateId(),
      orderId,
      productId: gift.product_id,
      variantId,
      skuCode: variant.sku_code || '',
      variantName: variant.title || '',
      specSnapshot: null,
      productName: product.name,
      productImage: gift.image || product.cover_image,
      variantImage: variant.image_url || '',
      price: unitPrice,
      points: 0,
      earnedPoints: 0,
      pointsRuleSnapshot: { gift_item_id: giftItemId, redemption_id: redemptionId },
      redeemableAmount: 0,
      qty: quantity,
      unitCostPrice: Number(variant.cost_price || 0),
      costAmount: Number(variant.cost_price || 0) * quantity,
      discountAllocated: 0,
      netSalesAmount: cashAmount,
      grossProfitAmount: cashAmount - Number(variant.cost_price || 0) * quantity,
      costSnapshotSource: 'variant',
    });

    const inc = await giftRepo.incrementGiftRedeemedCount(conn, giftItemId, quantity);
    if (!inc) {
      throw new ValidationError('礼品库存不足');
    }

    await giftRepo.insertGiftRedemption(conn, {
      id: redemptionId,
      user_id: userId,
      gift_item_id: giftItemId,
      order_id: orderId,
      order_no: orderNo,
      product_id: gift.product_id,
      variant_id: variantId,
      quantity,
      points_used: pointsNeeded,
      cash_amount: cashAmount,
      status: paymentStatus === PAYMENT_STATUS.PAID ? 'paid' : 'pending',
      address_snapshot: normalizedAddress,
      metadata: { gift_title: gift.title || product.name },
    });

    const stockDeducted = await getOrderApi().deductVariantStock(conn, variantId, quantity, {
      refType: 'order',
      refId: orderId,
      orderNo,
      reason: `积分礼品兑换 ${orderNo} 扣减 SKU 库存`,
    });
    if (!stockDeducted) {
      throw new ValidationError('商品库存不足');
    }

    await getOrderApi().applyGiftRedeem(conn, {
      id: orderId,
      user_id: userId,
      order_no: orderNo,
      points_used: pointsNeeded,
    }, { giftItemId, redemptionId });

    if (paymentStatus === PAYMENT_STATUS.PAID) {
      await getOrderApi().updateOrderGiftRedeemPaid(conn, orderId);
      await finalizeGiftOrderFulfillment(conn, {
        id: orderId,
        user_id: userId,
        order_type: 'points_gift',
        order_no: orderNo,
      }, [{ product_id: gift.product_id, qty: quantity }]);
      try {
        const userApi = /** @type {any} */ (require('../../user')).api || {};
        if (typeof userApi.syncStatsAfterOrderPaid === 'function') {
          await userApi.syncStatsAfterOrderPaid(userId, cashAmount, orderId, conn);
        }
      } catch (_) { /* non-blocking */ }
    }

    await conn.commit();
    return {
      data: {
        order_id: orderId,
        order_no: orderNo,
        redemption_id: redemptionId,
        points_used: pointsNeeded,
        cash_amount: cashAmount,
        payment_status: paymentStatus,
      },
      message: cashAmount > 0 ? '兑换订单已创建，请完成现金支付' : '兑换成功',
    };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function syncGiftRedemptionOnOrderPaid(conn, order) {
  if (!order?.id || String(order.order_type || '') !== 'points_gift') {
    return { skipped: true };
  }
  const redemption = await giftRepo.selectGiftRedemptionByOrderId(conn, order.id);
  if (!redemption) return { skipped: true, reason: 'redemption_not_found' };
  if (String(redemption.status || '') === 'paid' || String(redemption.status || '') === 'completed') {
    return { skipped: true, reason: 'already_synced' };
  }
  await giftRepo.updateGiftRedemptionStatus(conn, redemption.id, 'paid');
  return { synced: true, redemption_id: redemption.id };
}

async function finalizeGiftOrderFulfillment(conn, order, orderItems = []) {
  if (!order?.id || String(order.order_type || '') !== 'points_gift') {
    return { skipped: true };
  }
  const items = orderItems.length
    ? orderItems
    : await getOrderApi().selectOrderItemQtyRows(conn, order.id);
  for (const it of items) {
    if (it.product_id) {
      await getOrderApi().incrementProductSales(conn, it.product_id, Number(it.qty || 1));
    }
  }
  await syncGiftRedemptionOnOrderPaid(conn, order);
  return { ok: true };
}

async function reverseGiftRedemptionForCancelledOrder(conn, order) {
  const redemption = await giftRepo.selectGiftRedemptionByOrderId(conn, order.id);
  if (!redemption) return { skipped: true };
  await getOrderApi().reverseGiftRedeem(conn, order, {
    trigger: 'order_cancel',
    description: `礼品兑换取消退回积分 ${order.order_no}`,
  });
  await giftRepo.updateGiftRedemptionStatus(conn, redemption.id, 'cancelled');
  await giftRepo.decrementGiftRedeemedCount(conn, redemption.gift_item_id, Number(redemption.quantity || 1));
  return { reversed: true };
}

module.exports = {
  listActiveGiftItems,
  getGiftItem,
  redeemGift,
  syncGiftRedemptionOnOrderPaid,
  finalizeGiftOrderFulfillment,
  reverseGiftRedemptionForCancelledOrder,
  formatGiftItem,
};

const { generateId, formatProduct } = require('../../../utils/helpers');
const { NotFoundError, ValidationError } = require('../../../errors');
const repo = require('../repository/cart.repository');

function getOrderApi() {
  return /** @type {any} */ (require('../../order/publicApi')) || {};
}

function formatCartItem(row) {
  return {
    product: formatProduct(row),
    variant_id: row.variant_id || undefined,
    sku_code: row.sku_code || undefined,
    variant_name: row.variant_name || undefined,
    unit_price: Number(row.price || 0),
    subtotal: Number(row.price || 0) * Number(row.qty || 0),
    qty: row.qty,
  };
}

function buildCartPreviewBody(rows) {
  return {
    items: rows.map((row) => ({
      product_id: row.id,
      variant_id: row.variant_id || undefined,
      sku_code: row.sku_code || undefined,
      qty: Number(row.qty || 0),
    })),
    payment_method: 'online',
  };
}

async function getCart(userId) {
  await repo.deleteUnavailableCartItems(userId);
  const rows = await repo.selectCartLinesWithProducts(userId);
  return rows.map(formatCartItem);
}

async function getCartPreview(userId) {
  await repo.deleteUnavailableCartItems(userId);
  const rows = await repo.selectCartLinesWithProducts(userId);
  const items = rows.map(formatCartItem);
  if (!rows.length) {
    return {
      items,
      goods_amount: 0,
      discount_amount: 0,
      shipping_fee: 0,
      final_amount: 0,
      discount_lines: [],
      promotion_evaluation: null,
      promotion_engine_version: '',
      pricing_engine_version: '',
      pricing_engine_source: '',
      order_snapshot: null,
    };
  }

  const buildCheckoutPricing = getOrderApi().buildCheckoutPricing;
  if (typeof buildCheckoutPricing !== 'function') {
    return {
      items,
      goods_amount: items.reduce((sum, item) => sum + Number(item.subtotal || 0), 0),
      discount_amount: 0,
      shipping_fee: 0,
      final_amount: items.reduce((sum, item) => sum + Number(item.subtotal || 0), 0),
      discount_lines: [],
      promotion_evaluation: null,
      promotion_engine_version: '',
      pricing_engine_version: '',
      pricing_engine_source: '',
      order_snapshot: null,
      promotion_error: 'pricing_service_unavailable',
    };
  }

  const pricing = await buildCheckoutPricing(userId, buildCartPreviewBody(rows), null);
  return {
    items,
    goods_amount: pricing.rawAmount,
    flash_sale_discount: pricing.flashSaleDiscount,
    full_reduction_discount: pricing.fullReductionDiscount,
    coupon_discount: pricing.couponDiscount,
    discount_amount: pricing.discountAmount,
    shipping_fee: pricing.shippingFee,
    final_amount: pricing.finalTotal,
    discount_lines: pricing.discount_lines || [],
    reward_lines: pricing.promotion_evaluation?.reward_lines || [],
    promotion_evaluation: pricing.promotion_evaluation || null,
    promotion_engine_version: pricing.promotion_evaluation?.engine_version || '',
    pricing_engine_version: pricing.pricing_engine_version || '',
    pricing_engine_source: pricing.source || '',
    order_snapshot: pricing.promotion_evaluation?.order_snapshot || null,
  };
}

async function resolveVariant(productId, variantId) {
  if (variantId) {
    const variant = await repo.selectActiveVariant(productId, variantId);
    if (!variant) throw new ValidationError('规格不存在');
    return variant;
  }
  return repo.selectDefaultVariant(productId);
}

async function addToCart(userId, body) {
  const { productId, qty, variant_id: variantId } = body;
  const quantity = Number(qty || 0);
  if (!Number.isFinite(quantity) || quantity <= 0) throw new ValidationError('数量必须大于 0');

  const product = await repo.selectActiveProductId(productId);
  if (!product) throw new NotFoundError('商品不存在或已下架');

  const variant = await resolveVariant(productId, variantId);
  const lineVariantId = variant?.id || '';
  const currentLine = await repo.selectCartLine(userId, productId, lineVariantId);
  const existingQty = Number(currentLine?.qty || 0);
  const nextQty = existingQty + quantity;

  if (variant && Number(variant.stock || 0) < nextQty) {
    throw new ValidationError(variantId ? '规格库存不足' : '默认规格库存不足');
  }
  if (!variant && Number(product.stock || 0) < nextQty) throw new ValidationError('商品库存不足');

  const skuCode = variant?.sku_code || body.sku_code || '';
  await repo.upsertCartItem(generateId(), userId, productId, quantity, lineVariantId, skuCode);

  const row = await repo.selectCartLine(userId, productId, lineVariantId);
  return { data: formatCartItem(row) };
}

async function updateCartItem(userId, productId, body, variantId = '') {
  const quantity = Number(body.qty || 0);
  if (!Number.isFinite(quantity) || quantity <= 0) throw new ValidationError('数量必须大于 0');

  const product = await repo.selectActiveProductId(productId);
  if (!product) throw new NotFoundError('商品不存在或已下架');

  const variant = await resolveVariant(productId, variantId);
  const lineVariantId = variant?.id || '';

  if (variant && Number(variant.stock || 0) < quantity) {
    throw new ValidationError(variantId ? '规格库存不足' : '默认规格库存不足');
  }
  if (!variant && Number(product.stock || 0) < quantity) throw new ValidationError('商品库存不足');

  const affected = await repo.updateCartItemQty(userId, productId, quantity, lineVariantId);
  if (affected === 0) throw new NotFoundError('购物车商品不存在');

  const row = await repo.selectCartLine(userId, productId, lineVariantId);
  return { data: formatCartItem(row) };
}

async function pinCartItemToTop(userId, productId, variantId = '') {
  const line = await repo.selectCartLine(userId, productId, variantId);
  if (!line) throw new NotFoundError('购物车商品不存在');

  const affected = await repo.pinCartItemToTop(userId, productId, variantId);
  if (affected === 0) throw new NotFoundError('购物车商品不存在');

  const row = await repo.selectCartLine(userId, productId, variantId);
  return { data: formatCartItem(row) };
}

async function removeCartItem(userId, productId, variantId = '') {
  await repo.deleteCartItem(userId, productId, variantId);
  return { message: '已移除' };
}

async function clearCart(userId) {
  await repo.deleteAllCartItems(userId);
  return { message: '购物车已清空' };
}

module.exports = {
  getCart,
  getCartPreview,
  buildCartPreviewBody,
  addToCart,
  updateCartItem,
  pinCartItemToTop,
  removeCartItem,
  clearCart,
};

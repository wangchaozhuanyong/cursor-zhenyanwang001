const { generateId, formatProduct } = require('../../utils/helpers');
const { NotFoundError, ValidationError } = require('../../errors');
const repo = require('./cart.repository');

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

async function getCart(userId) {
  const rows = await repo.selectCartLinesWithProducts(userId);
  return rows.map(formatCartItem);
}

async function addToCart(userId, body) {
  const { productId, qty, variant_id: variantId } = body;
  const quantity = Number(qty || 0);
  if (!Number.isFinite(quantity) || quantity <= 0) throw new ValidationError('数量必须大于 0');

  const product = await repo.selectActiveProductId(productId);
  if (!product) throw new NotFoundError('商品不存在或已下架');

  const variant = await repo.selectActiveVariant(productId, variantId);
  if (variantId && !variant) throw new ValidationError('商品规格不存在');

  const currentLine = await repo.selectCartLine(userId, productId, variant?.id || '');
  const existingQty = Number(currentLine?.qty || 0);
  const nextQty = existingQty + quantity;

  if (variant && Number(variant.stock || 0) < nextQty) throw new ValidationError('规格库存不足');
  if (!variant && Number(product.stock || 0) < nextQty) throw new ValidationError('商品库存不足');

  const skuCode = variant?.sku_code || body.sku_code || '';
  await repo.upsertCartItem(generateId(), userId, productId, quantity, variant?.id || '', skuCode);

  const row = await repo.selectCartLine(userId, productId, variant?.id || '');
  return { data: formatCartItem(row) };
}

async function updateCartItem(userId, productId, body, variantId = '') {
  const quantity = Number(body.qty || 0);
  if (!Number.isFinite(quantity) || quantity <= 0) throw new ValidationError('数量必须大于 0');

  const product = await repo.selectActiveProductId(productId);
  if (!product) throw new NotFoundError('商品不存在或已下架');

  const variant = await repo.selectActiveVariant(productId, variantId);
  if (variantId && !variant) throw new ValidationError('商品规格不存在');
  if (variant && Number(variant.stock || 0) < quantity) throw new ValidationError('规格库存不足');
  if (!variant && Number(product.stock || 0) < quantity) throw new ValidationError('商品库存不足');

  const affected = await repo.updateCartItemQty(userId, productId, quantity, variantId);
  if (affected === 0) throw new NotFoundError('购物车中没有该商品');

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
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
};

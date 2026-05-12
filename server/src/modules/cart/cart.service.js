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

  const product = await repo.selectActiveProductId(productId);
  if (!product) throw new NotFoundError('商品不存在或已下架');

  const variant = await repo.selectActiveVariant(productId, variantId);
  if (variantId && !variant) throw new ValidationError('商品规格不存在');
  if (variant && Number(variant.stock || 0) < qty) throw new ValidationError('规格库存不足');

  const skuCode = variant?.sku_code || body.sku_code || '';
  await repo.upsertCartItem(generateId(), userId, productId, qty, variant?.id || '', skuCode);

  const row = await repo.selectCartLine(userId, productId, variant?.id || '');
  return { data: formatCartItem(row) };
}

async function updateCartItem(userId, productId, body, variantId = '') {
  const { qty } = body;
  const affected = await repo.updateCartItemQty(userId, productId, qty, variantId);
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

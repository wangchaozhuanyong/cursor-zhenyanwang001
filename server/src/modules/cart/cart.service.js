const { generateId, formatProduct } = require('../../utils/helpers');
const repo = require('./cart.repository');

function formatCartItem(row) {
  return { product: formatProduct(row), qty: row.qty };
}

async function getCart(userId) {
  const rows = await repo.selectCartLinesWithProducts(userId);
  return rows.map(formatCartItem);
}

async function addToCart(userId, body) {
  const { productId, qty = 1 } = body;
  if (!productId) return { error: { code: 400, message: '商品ID不能为空' } };

  const product = await repo.selectActiveProductId(productId);
  if (!product) return { error: { code: 404, message: '商品不存在或已下架' } };

  const id = generateId();
  await repo.upsertCartItem(id, userId, productId, qty);

  const row = await repo.selectCartLine(userId, productId);
  return { data: formatCartItem(row) };
}

async function updateCartItem(userId, productId, body) {
  const { qty } = body;
  if (!qty || qty < 1) return { error: { code: 400, message: '数量至少为1' } };

  const affected = await repo.updateCartItemQty(userId, productId, qty);
  if (affected === 0) return { error: { code: 404, message: '购物车中没有该商品' } };

  const row = await repo.selectCartLine(userId, productId);
  return { data: formatCartItem(row) };
}

async function removeCartItem(userId, productId) {
  await repo.deleteCartItem(userId, productId);
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

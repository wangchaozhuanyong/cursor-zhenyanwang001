/**
 * Cart Service
 *
 * 分层约定：
 * - 入参由 routes 层 zod 校验后到达 service，无需重复校验形状
 * - 业务规则（商品是否存在、库存等）抛 AppError 子类
 * - 不直接拼 SQL：所有数据访问通过 `./cart.repository`
 */
const { generateId, formatProduct } = require('../../utils/helpers');
const { NotFoundError } = require('../../errors');
const repo = require('./cart.repository');

function formatCartItem(row) {
  return { product: formatProduct(row), qty: row.qty };
}

async function getCart(userId) {
  const rows = await repo.selectCartLinesWithProducts(userId);
  return rows.map(formatCartItem);
}

async function addToCart(userId, body) {
  const { productId, qty } = body;

  const product = await repo.selectActiveProductId(productId);
  if (!product) throw new NotFoundError('商品不存在或已下架');

  await repo.upsertCartItem(generateId(), userId, productId, qty);

  const row = await repo.selectCartLine(userId, productId);
  return { data: formatCartItem(row) };
}

async function updateCartItem(userId, productId, body) {
  const { qty } = body;
  const affected = await repo.updateCartItemQty(userId, productId, qty);
  if (affected === 0) throw new NotFoundError('购物车中没有该商品');

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

const { generateId, formatProduct } = require('../../utils/helpers');
const repo = require('./favorites.repository');

async function getFavorites(userId, query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(query.pageSize, 10) || 20));
  const total = await repo.countByUser(userId);
  const offset = (page - 1) * pageSize;
  const rows = await repo.selectPage(userId, pageSize, offset);
  const list = rows.map((r) => formatProduct(r));
  return { list, total, page, pageSize };
}

async function addFavorite(userId, body) {
  const { product_id } = body;
  if (!product_id) return { error: { code: 400, message: '缺少 product_id' } };

  const existing = await repo.findByUserAndProduct(userId, product_id);
  if (existing) return { data: { id: existing.id }, message: '已收藏' };

  const id = generateId();
  await repo.insert(id, userId, product_id);
  return { data: { id }, message: '收藏成功' };
}

async function removeFavorite(userId, productId) {
  await repo.deleteByUserAndProduct(userId, productId);
  return { message: '已取消收藏' };
}

async function checkFavorite(userId, productId) {
  const row = await repo.findByUserAndProduct(userId, productId);
  return { isFavorited: !!row };
}

module.exports = {
  getFavorites,
  addFavorite,
  removeFavorite,
  checkFavorite,
};

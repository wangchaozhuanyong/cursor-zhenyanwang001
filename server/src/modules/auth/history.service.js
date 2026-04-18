const { generateId, formatProduct } = require('../../utils/helpers');
const repo = require('./history.repository');

async function getHistory(userId, query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(query.pageSize, 10) || 20));
  const total = await repo.countByUser(userId);
  const offset = (page - 1) * pageSize;
  const rows = await repo.selectPage(userId, pageSize, offset);
  const list = rows.map((r) => ({
    id: r.history_id,
    viewed_at: r.viewed_at,
    product: formatProduct(r),
  }));
  return { list, total, page, pageSize };
}

async function addHistory(userId, body) {
  const { product_id } = body;
  if (!product_id) return { error: { code: 400, message: '缺少 product_id' } };

  await repo.deletePair(userId, product_id);
  const id = generateId();
  await repo.insert(id, userId, product_id);

  const cnt = await repo.countRows(userId);
  if (cnt > 100) {
    await repo.deleteOldest(userId, cnt - 100);
  }

  return { data: { id }, message: '已记录' };
}

async function clearHistory(userId) {
  await repo.clearUser(userId);
  return { message: '已清空' };
}

module.exports = {
  getHistory,
  addHistory,
  clearHistory,
};

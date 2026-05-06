const { parseBool, formatProduct } = require('../../utils/helpers');
const repo = require('./catalog.repository');

async function getBanners() {
  return repo.selectActiveBanners();
}

async function getCategories() {
  return repo.selectActiveCategories();
}

async function getCategoryById(id) {
  return repo.selectCategoryById(id);
}

function buildProductListQuery(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(query.pageSize, 10) || 10));
  const { category_id, keyword, sort } = query;
  const isHot = parseBool(query.is_hot);
  const isNew = parseBool(query.is_new);
  const isRecommended = parseBool(query.is_recommended);

  let where = 'WHERE status = "active"';
  const params = [];

  if (category_id && category_id !== 'all') {
    where += ' AND category_id = ?';
    params.push(category_id);
  }
  if (keyword) {
    where += ' AND name LIKE ?';
    params.push(`%${keyword}%`);
  }
  if (isHot !== undefined) {
    where += ' AND is_hot = ?';
    params.push(isHot ? 1 : 0);
  }
  if (isNew !== undefined) {
    where += ' AND is_new = ?';
    params.push(isNew ? 1 : 0);
  }
  if (isRecommended !== undefined) {
    where += ' AND is_recommended = ?';
    params.push(isRecommended ? 1 : 0);
  }

  let orderBy;
  switch (sort) {
    case 'price-asc':
      orderBy = 'ORDER BY price ASC';
      break;
    case 'price-desc':
      orderBy = 'ORDER BY price DESC';
      break;
    case 'newest':
      orderBy = 'ORDER BY created_at DESC';
      break;
    default:
      orderBy = 'ORDER BY sort_order ASC, created_at DESC';
  }

  return { page, pageSize, where, params, orderBy };
}

async function getProducts(query) {
  const { page, pageSize, where, params, orderBy } = buildProductListQuery(query);
  const total = await repo.countActiveProducts(where, params);
  const offset = (page - 1) * pageSize;
  const rows = await repo.selectActiveProductsPage(where, params, orderBy, pageSize, offset);
  return {
    list: rows.map(formatProduct),
    total,
    page,
    pageSize,
  };
}

async function getProductById(id) {
  const row = await repo.selectProductById(id);
  if (!row) return null;
  return formatProduct(row);
}

async function getHomeProducts() {
  const limit = 8;
  const blocks = await repo.selectHomeProductBlocks(limit);
  return {
    hot: blocks.hot.map(formatProduct),
    new_arrivals: blocks.new_arrivals.map(formatProduct),
    recommended: blocks.recommended.map(formatProduct),
  };
}

async function getRelatedProducts(productId, limit) {
  const lim = Number.isFinite(Number(limit)) ? Number(limit) : 4;
  const product = await repo.selectProductCategoryId(productId);
  if (!product) return [];
  const rows = await repo.selectRelatedByCategory(product.category_id, productId, lim);
  return rows.map(formatProduct);
}

module.exports = {
  getBanners,
  getCategories,
  getCategoryById,
  getProducts,
  getProductById,
  getHomeProducts,
  getRelatedProducts,
};

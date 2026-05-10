const { parseBool, formatProduct } = require('../../utils/helpers');
const repo = require('./catalog.repository');
const tagAssignmentRepo = require('./productTagAssignment.repository');
const activityRepo = require('./activity.repository');
const { buildSearchKeywords, normalizeSearchKeyword } = require('../../utils/searchKeywords');

const CACHE_TTL_MS = 60 * 1000;
const cache = new Map();
const inFlight = new Map();

function getCached(key, fallback, loader) {
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && now - hit.updatedAt < CACHE_TTL_MS) return hit.value;

  if (!inFlight.has(key)) {
    const task = loader()
      .then((value) => {
        cache.set(key, { value, updatedAt: Date.now() });
      })
      .catch((err) => {
        console.warn(`[catalog] refresh ${key} failed: ${err?.message || err}`);
      })
      .finally(() => {
        inFlight.delete(key);
      });
    inFlight.set(key, task);
  }

  return hit?.value ?? fallback;
}

async function getBanners() {
  return getCached('banners', [], () => repo.selectActiveBanners());
}

async function getCategories() {
  return getCached('categories', [], async () => {
    const rows = await repo.selectActiveCategories();
    return buildCategoryTree(rows);
  });
}

async function getCategoryById(id) {
  return repo.selectCategoryById(id);
}

function buildCategoryTree(rows) {
  const map = new Map();
  const roots = [];
  rows.forEach((row) => {
    map.set(row.id, {
      id: row.id,
      parent_id: row.parent_id || null,
      name: row.name,
      icon: row.icon || '',
      icon_url: row.icon_url || row.icon || '',
      sort_order: row.sort_order ?? 0,
      is_visible: row.is_visible !== undefined ? !!row.is_visible : !!row.is_active,
      is_active: !!row.is_active,
      children: [],
    });
  });
  rows.forEach((row) => {
    const node = map.get(row.id);
    const parent = row.parent_id ? map.get(row.parent_id) : null;
    if (parent) parent.children.push(node);
    else roots.push(node);
  });
  return roots;
}

function collectDescendantCategoryIds(rows, rootId) {
  const children = new Map();
  rows.forEach((row) => {
    const key = row.parent_id || '';
    const list = children.get(key) || [];
    list.push(row.id);
    children.set(key, list);
  });
  const out = [];
  const walk = (id) => {
    out.push(id);
    for (const child of children.get(id) || []) walk(child);
  };
  walk(rootId);
  return out;
}

function buildProductListQuery(query, categoryIds) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(query.pageSize, 10) || 10));
  const category_id = query.category_id || query.categoryId || query.category;
  const { keyword, sort } = query;
  const isHot = parseBool(query.is_hot);
  const isNew = parseBool(query.is_new);
  const isRecommended = parseBool(query.is_recommended);

  let where = 'WHERE lifecycle_status = 1 AND deleted_at IS NULL';
  const params = [];

  if (category_id && category_id !== 'all') {
    if (categoryIds && categoryIds.length) {
      where += ` AND category_id IN (${categoryIds.map(() => '?').join(',')})`;
      params.push(...categoryIds);
    } else {
      where += ' AND category_id = ?';
      params.push(category_id);
    }
  }
  if (keyword) {
    const normalized = normalizeSearchKeyword(keyword);
    const expanded = buildSearchKeywords(normalized);
    const like = `%${normalized}%`;
    const expandedLike = `%${expanded}%`;
    where += ` AND (
      name LIKE ?
      OR description LIKE ?
      OR search_keywords LIKE ?
      OR search_keywords LIKE ?
    )`;
    params.push(like, like, like, expandedLike);
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
    case 'price_asc':
      orderBy = 'ORDER BY price ASC';
      break;
    case 'price-desc':
    case 'price_desc':
      orderBy = 'ORDER BY price DESC';
      break;
    case 'sales':
      orderBy = 'ORDER BY sales_count DESC, sort_order ASC, created_at DESC';
      break;
    case 'recommended':
      orderBy = 'ORDER BY is_recommended DESC, sort_order ASC, created_at DESC';
      break;
    case 'newest':
      orderBy = 'ORDER BY created_at DESC';
      break;
    default:
      orderBy = 'ORDER BY sort_order ASC, created_at DESC';
  }

  return { page, pageSize, where, params, orderBy };
}

function attachActivity(product, activity) {
  if (!activity) return product;
  const originalPrice = Number(product.price);
  if (activity.type === 'full_reduction') {
    const th = activity.threshold_amount != null ? Number(activity.threshold_amount) : null;
    const disc = activity.discount_amount != null ? Number(activity.discount_amount) : null;
    const label = th != null && disc != null && th > 0 && disc > 0 ? `满${th}减${disc}` : '';
    return {
      ...product,
      active_activity: activity,
      activity_promo_label: label || undefined,
    };
  }
  const activityPrice = Number(activity.activity_price);
  return {
    ...product,
    original_price: product.original_price != null ? product.original_price : originalPrice,
    activity_price: activityPrice,
    effective_price: activityPrice,
    price: activityPrice,
    active_activity: activity,
  };
}

async function formatRowsWithTagsAndActivities(rows) {
  const ids = rows.map((r) => r.id);
  const [tagMap, activityMap] = await Promise.all([
    tagAssignmentRepo.selectTagsByProductIds(ids),
    activityRepo.selectActiveActivitiesByProductIds(ids).catch((e) => {
      console.warn(`[catalog] activity lookup failed: ${e?.message || e}`);
      return new Map();
    }),
  ]);
  return rows.map((r) => attachActivity({ ...formatProduct(r), tags: tagMap.get(r.id) || [] }, activityMap.get(r.id)));
}

async function getProducts(query) {
  let categoryIds = null;
  const categoryId = query.category_id || query.categoryId || query.category;
  if (categoryId && categoryId !== 'all') {
    const categoryRows = await repo.selectVisibleCategoryIds();
    categoryIds = collectDescendantCategoryIds(categoryRows, categoryId);
  }
  const { page, pageSize, where, params, orderBy } = buildProductListQuery(query, categoryIds);
  const total = await repo.countActiveProducts(where, params);
  const offset = (page - 1) * pageSize;
  const rows = await repo.selectActiveProductsPage(where, params, orderBy, pageSize, offset);
  return {
    list: await formatRowsWithTagsAndActivities(rows),
    total,
    page,
    pageSize,
  };
}

async function getProductById(id) {
  const row = await repo.selectProductById(id);
  if (!row) return null;
  const [item] = await formatRowsWithTagsAndActivities([row]);
  return item;
}

async function getHomeProducts() {
  return getCached('homeProducts', { hot: [], new_arrivals: [], recommended: [] }, loadHomeProducts);
}

async function loadHomeProducts() {
  const limit = 8;
  const [hotManual, newArrivals, recommendedManual, fallbackBySales, fallbackByRecommend] = await Promise.all([
    repo.selectActiveProductsByFlag('is_hot', limit),
    repo.selectActiveProductsByFlag('is_new', limit),
    repo.selectActiveProductsByFlag('is_recommended', limit),
    repo.selectActiveProductsFallback('sales_count DESC, sort_order ASC, created_at DESC', 64),
    repo.selectActiveProductsFallback('is_recommended DESC, sales_count DESC, sort_order ASC, created_at DESC', 64),
  ]);

  const pickUnique = (primary, fallback, target, excludeIds = new Set()) => {
    const out = [];
    const used = new Set(excludeIds);
    for (const p of primary) {
      if (used.has(p.id)) continue;
      used.add(p.id);
      out.push(p);
      if (out.length >= target) return out;
    }
    for (const p of fallback) {
      if (used.has(p.id)) continue;
      used.add(p.id);
      out.push(p);
      if (out.length >= target) return out;
    }
    return out;
  };

  const hot = pickUnique(hotManual, fallbackBySales, limit);
  const hotIdSet = new Set(hot.map((p) => p.id));
  const recommended = pickUnique(recommendedManual, fallbackByRecommend, limit, hotIdSet);

  const allRows = [...hot, ...newArrivals, ...recommended];
  const tagMap = await tagAssignmentRepo.selectTagsByProductIds(allRows.map((r) => r.id));
  const activityMap = await activityRepo.selectActiveActivitiesByProductIds(allRows.map((r) => r.id)).catch((e) => {
    console.warn(`[catalog] activity lookup failed: ${e?.message || e}`);
    return new Map();
  });
  const fmt = (rows) => rows.map((r) => attachActivity({ ...formatProduct(r), tags: tagMap.get(r.id) || [] }, activityMap.get(r.id)));
  return {
    hot: fmt(hot),
    new_arrivals: fmt(newArrivals),
    recommended: fmt(recommended),
  };
}

async function getRelatedProducts(productId, limit) {
  const lim = Number.isFinite(Number(limit)) ? Number(limit) : 4;
  const product = await repo.selectProductCategoryId(productId);
  if (!product) return [];
  const rows = await repo.selectRelatedByCategory(product.category_id, productId, lim);
  return formatRowsWithTagsAndActivities(rows);
}

async function trackHomeEngagement(payload) {
  const module = String(payload?.module || '').trim();
  const event = String(payload?.event || '').trim();
  const productId = payload?.product_id ? String(payload.product_id).trim() : '';
  const sessionId = payload?.session_id ? String(payload.session_id).trim().slice(0, 64) : '';

  const allowedModule = module === 'new_arrivals';
  const allowedEvent = event === 'impression' || event === 'click';
  if (!allowedModule || !allowedEvent) return { ok: true };

  await repo.insertHomeEngagementEvent({
    module,
    eventKey: event,
    productId: productId || null,
    sessionId: sessionId || null,
    meta: payload?.meta && typeof payload.meta === 'object' ? payload.meta : null,
  });
  return { ok: true };
}

function clearCatalogCache() {
  cache.clear();
  inFlight.clear();
}

module.exports = {
  getBanners,
  getCategories,
  getCategoryById,
  getProducts,
  getProductById,
  getHomeProducts,
  getRelatedProducts,
  trackHomeEngagement,
  clearCatalogCache,
};

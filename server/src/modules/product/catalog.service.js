const { parseBool, formatProduct } = require('../../utils/helpers');
const repo = require('./catalog.repository');
const tagAssignmentRepo = require('./productTagAssignment.repository');
const activityRepo = require('./activity.repository');
const { buildSearchKeywords, normalizeSearchKeyword } = require('../../utils/searchKeywords');

const CACHE_TTL_MS = 60 * 1000;
const cache = new Map();
const inFlight = new Map();

/**
 * 异步缓存：缓存未命中时等待 loader，避免旧实现「先返回 fallback、后台再写入」导致
 * 首请求永远拿到空数组（会员端轮播长期落在本地 fallback）。
 */
async function getCached(key, loader) {
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && now - hit.updatedAt < CACHE_TTL_MS) return hit.value;

  if (inFlight.has(key)) return inFlight.get(key);

  const p = (async () => {
    try {
      const value = await loader();
      cache.set(key, { value, updatedAt: Date.now() });
      return value;
    } catch (err) {
      console.warn(`[catalog] refresh ${key} failed: ${err?.message || err}`);
      throw err;
    } finally {
      inFlight.delete(key);
    }
  })();

  inFlight.set(key, p);
  return p;
}

async function getBanners() {
  try {
    return await getCached('banners', () => repo.selectActiveBanners());
  } catch {
    return [];
  }
}

async function getCategories() {
  try {
    return await getCached('categories', async () => {
      const rows = await repo.selectActiveCategories();
      return buildCategoryTree(rows);
    });
  } catch {
    return [];
  }
}

async function getCategoryById(id) {
  return repo.selectCategoryById(id);
}

async function getProductTags(limit) {
  const rows = await repo.selectPublicProductTags(limit);
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    color: r.color || '金色',
    bg_color: r.bg_color || '#FEF3C7',
    text_color: r.text_color || '#92400E',
    sort_order: Number(r.sort_order) || 0,
    count: Number(r.count) || 0,
  }));
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
  const tagId = query.tag_id || query.tagId || query.tag;
  const isHot = parseBool(query.is_hot);
  const isNew = parseBool(query.is_new);
  const useHomeNewArrivalsRule = parseBool(query.home_new_arrivals_rule) === true;
  const newArrivalsOnlyInStock = parseBool(query.new_arrivals_only_in_stock);
  const isRecommended = parseBool(query.is_recommended);
  const inStock = parseBool(query.in_stock);
  const minPrice = Number(query.min_price);
  const maxPrice = Number(query.max_price);

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
  if (tagId) {
    where += ` AND EXISTS (
      SELECT 1
      FROM product_tag_assignments pta
      INNER JOIN product_tags pt ON pt.id = pta.tag_id
      WHERE pta.product_id = products.id
        AND pta.tag_id = ?
        AND pt.enabled = 1
        AND pt.deleted_at IS NULL
    )`;
    params.push(tagId);
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
    if (isNew && useHomeNewArrivalsRule) {
      where += ' AND (is_new = 1 OR created_at >= DATE_SUB(NOW(), INTERVAL 14 DAY))';
      if (newArrivalsOnlyInStock !== undefined) {
        where += newArrivalsOnlyInStock ? ' AND stock > 0' : '';
      }
    } else {
      where += ' AND is_new = ?';
      params.push(isNew ? 1 : 0);
    }
  }
  if (isRecommended !== undefined) {
    where += ' AND is_recommended = ?';
    params.push(isRecommended ? 1 : 0);
  }
  if (inStock !== undefined) {
    where += inStock ? ' AND stock > 0' : '';
  }
  if (Number.isFinite(minPrice) && minPrice >= 0) {
    where += ' AND price >= ?';
    params.push(minPrice);
  }
  if (Number.isFinite(maxPrice) && maxPrice >= 0) {
    where += ' AND price <= ?';
    params.push(maxPrice);
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
  const [tagMap, activityMap, defaultVariants] = await Promise.all([
    tagAssignmentRepo.selectTagsByProductIds(ids),
    activityRepo.selectActiveActivitiesByProductIds(ids).catch((e) => {
      console.warn(`[catalog] activity lookup failed: ${e?.message || e}`);
      return new Map();
    }),
    repo.selectDefaultVariantsByProductIds(ids),
  ]);
  const defaultVariantMap = new Map(defaultVariants.map((v) => [v.product_id, formatVariant(v)]));
  return rows.map((r) => attachActivity({ ...formatProduct(r), tags: tagMap.get(r.id) || [], default_variant: defaultVariantMap.get(r.id) || null }, activityMap.get(r.id)));
}

function formatVariant(row) {
  return {
    id: row.id,
    product_id: row.product_id,
    sku_code: row.sku_code || '',
    title: row.title || '',
    price: Number(row.price || 0),
    stock: Number(row.stock || 0),
    sort_order: Number(row.sort_order || 0),
    is_default: !!row.is_default,
  };
}

async function getProducts(query) {
  let categoryIds = null;
  const categoryId = query.category_id || query.categoryId || query.category;
  const includeDescendants = query.include_descendants === undefined
    ? true
    : parseBool(query.include_descendants) !== false;
  if (categoryId && categoryId !== 'all') {
    if (includeDescendants) {
      const categoryRows = await repo.selectVisibleCategoryIds();
      categoryIds = collectDescendantCategoryIds(categoryRows, categoryId);
    } else {
      categoryIds = [categoryId];
    }
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
  const variants = await repo.selectProductVariants(id);
  return { ...item, variants: variants.map(formatVariant) };
}

async function getHomeProducts() {
  try {
    return await getCached('homeProducts', loadHomeProducts);
  } catch {
    return { hot: [], new_arrivals: [], recommended: [] };
  }
}

async function loadHomeProducts() {
  const siteSettings = await repo.selectSiteSettingValues([
    'newArrivalDisplayCount',
    'newArrivalOnlyInStock',
  ]);
  const limit = 8;
  const newArrivalLimit = Math.min(16, Math.max(1, Number(siteSettings.newArrivalDisplayCount) || limit));
  const newArrivalOnlyInStock = String(siteSettings.newArrivalOnlyInStock ?? '1') !== '0';
  const [hotManual, newArrivals, recommendedManual, fallbackBySales, fallbackByRecommend, fallbackByNew] =
    await Promise.all([
      repo.selectActiveProductsByFlag('is_hot', limit),
      repo.selectActiveProductsByFlag('is_new', newArrivalLimit),
      repo.selectActiveProductsByFlag('is_recommended', limit),
      repo.selectActiveProductsFallback('sales_count DESC, sort_order ASC, created_at DESC', 64),
      repo.selectActiveProductsFallback('is_recommended DESC, sales_count DESC, sort_order ASC, created_at DESC', 64),
      repo.selectActiveProductsRecent(14, 64, newArrivalOnlyInStock),
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
  const newArrivalsUnique = pickUnique(newArrivals, fallbackByNew, newArrivalLimit, hotIdSet);
  const homeUsedIdSet = new Set([...hot, ...newArrivalsUnique].map((p) => p.id));
  const recommended = pickUnique(recommendedManual, fallbackByRecommend, limit, homeUsedIdSet);

  const allRows = [...hot, ...newArrivalsUnique, ...recommended];
  const allIds = allRows.map((r) => r.id);
  const [tagMap, defaultVariants] = await Promise.all([
    tagAssignmentRepo.selectTagsByProductIds(allIds),
    repo.selectDefaultVariantsByProductIds(allIds),
  ]);
  const defaultVariantMap = new Map(defaultVariants.map((v) => [v.product_id, formatVariant(v)]));
  const activityMap = await activityRepo.selectActiveActivitiesByProductIds(allIds).catch((e) => {
    console.warn('[catalog] activity lookup failed: ' + (e?.message || e));
    return new Map();
  });
  const fmt = (rows) => rows.map((r) => attachActivity({ ...formatProduct(r), tags: tagMap.get(r.id) || [], default_variant: defaultVariantMap.get(r.id) || null }, activityMap.get(r.id)));
  return {
    hot: fmt(hot),
    new_arrivals: fmt(newArrivalsUnique),
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
  getProductTags,
  getProducts,
  getProductById,
  getHomeProducts,
  getRelatedProducts,
  trackHomeEngagement,
  clearCatalogCache,
};

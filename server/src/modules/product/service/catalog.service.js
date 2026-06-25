const { parseBool, formatProduct, formatProductCard, omitInlineDataUrl } = require('../../../utils/helpers');
const { ACTIVE_PRODUCT_WHERE, activeProductWhere } = require('../productLifecycle');
const repo = require('../repository/catalog.repository');
const tagAssignmentRepo = require('../repository/productTagAssignment.repository');
const activityRepo = require('../repository/activity.repository');
const { buildSearchKeywords, normalizeSearchKeyword } = require('../../../utils/searchKeywords');
const { setCacheHit } = require('../../../utils/requestPerf');

const CACHE_TTL_MS = 60 * 1000;
const cache = new Map();
const inFlight = new Map();

/**
 * 异步缓存：缓存未命中时等�?loader，避免旧实现「先返回 fallback、后台再写入」导�? * 首请求永远拿到空数组（会员端轮播长期落在本地 fallback）�? */
async function getCached(key, loader) {
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && now - hit.updatedAt < CACHE_TTL_MS) {
    setCacheHit(true);
    return hit.value;
  }

  if (inFlight.has(key)) return inFlight.get(key);
  setCacheHit(false);

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
    const rows = await getCached('banners', () => repo.selectActiveBanners());
    return rows.map(formatBannerCard).filter(Boolean);
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

async function getBannersLite(limit = 3) {
  try {
    const rows = await getCached(`banners:lite:${limit}`, () => repo.selectActiveBannersLite(limit));
    return rows.map(formatBannerCard).filter(Boolean);
  } catch {
    return [];
  }
}

async function getCategoriesLite() {
  try {
    return await getCached('categories:lite', async () => {
      const rows = await repo.selectActiveCategoriesLite();
      return buildCategoryTree(rows, { lite: true });
    });
  } catch {
    return [];
  }
}

async function getCategoryById(id) {
  const row = await repo.selectCategoryById(id);
  if (!row) return null;
  return buildCategoryTree([row])[0] || null;
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

function normalizeCategoryFaq(value) {
  let parsed = value;
  if (typeof value === 'string' && value.trim()) {
    try {
      parsed = JSON.parse(value);
    } catch {
      parsed = [];
    }
  }
  if (!Array.isArray(parsed)) return [];
  return parsed
    .map((item) => ({
      question: String(item?.question || '').trim(),
      answer: String(item?.answer || '').trim(),
    }))
    .filter((item) => item.question && item.answer);
}

function buildCategoryTree(rows, options = {}) {
  const lite = options.lite === true;
  const map = new Map();
  const roots = [];
  rows.forEach((row) => {
    map.set(row.id, {
      id: row.id,
      parent_id: row.parent_id || null,
      name: row.name,
      ...(lite ? {} : {
        description: row.description || '',
        buying_guide: row.buying_guide || '',
        faq: normalizeCategoryFaq(row.faq_json),
        seo_title: row.seo_title || '',
        seo_description: row.seo_description || '',
        banner_image_url: row.banner_image_url || '',
        banner_title: row.banner_title || '',
        banner_subtitle: row.banner_subtitle || '',
        banner_link: row.banner_link || '',
        banner_enabled: !!row.banner_enabled,
      }),
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

function formatBannerCard(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title || '',
    description: row.description || row.subtitle || '',
    cta_text: row.cta_text || '',
    image: omitInlineDataUrl(row.image_url || row.image || ''),
    link: row.link || row.url || '',
    sort_order: Number(row.sort_order || 0),
    enabled: row.enabled !== undefined ? !!row.enabled : true,
  };
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

  let where = `WHERE ${activeProductWhere('products')}`;
  const params = [];

  if (category_id && category_id !== 'all') {
    if (categoryIds && categoryIds.length) {
      where += ` AND products.category_id IN (${categoryIds.map(() => '?').join(',')})`;
      params.push(...categoryIds);
    } else {
      where += ' AND products.category_id = ?';
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
      products.name LIKE ?
      OR products.description LIKE ?
      OR products.search_keywords LIKE ?
      OR products.search_keywords LIKE ?
    )`;
    params.push(like, like, like, expandedLike);
  }
  if (isHot !== undefined) {
    where += ' AND products.is_hot = ?';
    params.push(isHot ? 1 : 0);
  }
  if (isNew !== undefined) {
    if (isNew && useHomeNewArrivalsRule) {
      where += newArrivalsOnlyInStock === true
        ? ' AND (products.is_new = 1 OR (products.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) AND products.stock > 0))'
        : ' AND (products.is_new = 1 OR products.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY))';
    } else {
      where += ' AND products.is_new = ?';
      params.push(isNew ? 1 : 0);
    }
  }
  if (isRecommended !== undefined) {
    where += ' AND products.is_recommended = ?';
    params.push(isRecommended ? 1 : 0);
  }
  if (inStock !== undefined) {
    where += inStock ? ' AND products.stock > 0' : '';
  }
  if (Number.isFinite(minPrice) && minPrice >= 0) {
    where += ' AND products.price >= ?';
    params.push(minPrice);
  }
  if (Number.isFinite(maxPrice) && maxPrice >= 0) {
    where += ' AND products.price <= ?';
    params.push(maxPrice);
  }

  let orderBy;
  switch (sort) {
    case 'price-asc':
    case 'price_asc':
      orderBy = 'ORDER BY products.price ASC';
      break;
    case 'price-desc':
    case 'price_desc':
      orderBy = 'ORDER BY products.price DESC';
      break;
    case 'sales':
      orderBy = 'ORDER BY products.sales_count DESC, products.sort_order ASC, products.created_at DESC';
      break;
    case 'recommended':
      orderBy = 'ORDER BY products.is_recommended DESC, products.sort_order ASC, products.created_at DESC';
      break;
    case 'newest':
      orderBy = 'ORDER BY products.created_at DESC';
      break;
    default:
      orderBy = 'ORDER BY products.sort_order ASC, products.created_at DESC';
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

function formatActivityCard(activity) {
  if (!activity) return null;
  return {
    id: activity.id,
    type: activity.type,
    title: activity.title,
    activity_price: activity.activity_price == null ? undefined : Number(activity.activity_price),
    threshold_amount: activity.threshold_amount == null ? undefined : Number(activity.threshold_amount),
    discount_amount: activity.discount_amount == null ? undefined : Number(activity.discount_amount),
    start_at: activity.start_at,
    end_at: activity.end_at,
    status: activity.status,
    status_label: activity.status_label,
  };
}

async function formatRowsWithTagsAndActivities(rows) {
  const ids = rows.map((r) => r.id);
  const [tagMap, activityMap, defaultVariants, priceRanges] = await Promise.all([
    tagAssignmentRepo.selectTagsByProductIds(ids),
    activityRepo.selectActiveActivitiesByProductIds(ids).catch((e) => {
      console.warn(`[catalog] activity lookup failed: ${e?.message || e}`);
      return new Map();
    }),
    repo.selectDefaultVariantsByProductIds(ids),
    repo.selectVariantPriceRangesByProductIds(ids),
  ]);
  const defaultVariantMap = new Map(defaultVariants.map((v) => [v.product_id, formatVariantCard(v)]));
  const priceRangeMap = new Map(priceRanges.map((r) => [r.product_id, {
    min_price: Number(r.min_price || 0),
    max_price: Number(r.max_price || 0),
    min_original_price: r.min_original_price == null ? null : Number(r.min_original_price),
    max_original_price: r.max_original_price == null ? null : Number(r.max_original_price),
    variant_count: Number(r.variant_count || 0),
  }]));
  return rows.map((r) => attachActivity({
    ...formatProduct(r),
    ...(priceRangeMap.get(r.id) || {}),
    tags: tagMap.get(r.id) || [],
    default_variant: defaultVariantMap.get(r.id) || null,
  }, activityMap.get(r.id)));
}

async function formatCardRowsWithTagsAndActivities(rows) {
  const ids = rows.map((r) => r.id);
  if (!ids.length) return [];
  const [tagMap, activityMap, defaultVariants, priceRanges] = await Promise.all([
    tagAssignmentRepo.selectTagsByProductIds(ids),
    activityRepo.selectActiveActivitiesByProductIds(ids).catch((e) => {
      console.warn(`[catalog] activity lookup failed: ${e?.message || e}`);
      return new Map();
    }),
    repo.selectDefaultVariantsByProductIds(ids),
    repo.selectVariantPriceRangesByProductIds(ids),
  ]);
  const defaultVariantMap = new Map(defaultVariants.map((v) => [v.product_id, formatVariantCard(v)]));
  const priceRangeMap = new Map(priceRanges.map((r) => [r.product_id, {
    min_price: Number(r.min_price || 0),
    max_price: Number(r.max_price || 0),
    min_original_price: r.min_original_price == null ? null : Number(r.min_original_price),
    max_original_price: r.max_original_price == null ? null : Number(r.max_original_price),
    variant_count: Number(r.variant_count || 0),
  }]));
  return rows.map((r) => attachActivity({
    ...formatProductCard(r),
    ...(priceRangeMap.get(r.id) || {}),
    tags: tagMap.get(r.id) || [],
    default_variant: defaultVariantMap.get(r.id) || null,
  }, formatActivityCard(activityMap.get(r.id))));
}

function formatVariant(row) {
  return {
    id: row.id,
    product_id: row.product_id,
    sku_code: row.sku_code || '',
    title: row.title || '',
    price: Number(row.price || 0),
    original_price: row.original_price == null ? null : Number(row.original_price),
    cost_price: row.cost_price == null ? null : Number(row.cost_price),
    stock: Number(row.stock || 0),
    stock_warning_threshold: Number(row.stock_warning_threshold || 0),
    barcode: row.barcode || '',
    image_url: row.image_url || '',
    weight: row.weight == null ? null : Number(row.weight),
    enabled: row.enabled !== undefined ? !!row.enabled : true,
    sort_order: Number(row.sort_order || 0),
    is_default: !!row.is_default,
    spec_value_ids: Array.isArray(row.spec_value_ids) ? row.spec_value_ids : [],
    spec_values: Array.isArray(row.spec_values) ? row.spec_values : [],
    spec_text: row.spec_text || row.title || '',
  };
}

function formatVariantCard(row) {
  if (!row) return null;
  return {
    id: row.id,
    product_id: row.product_id,
    sku_code: row.sku_code || '',
    title: row.title || '',
    price: Number(row.price || 0),
    original_price: row.original_price == null ? null : Number(row.original_price),
    stock: Number(row.stock || 0),
    image_url: row.image_url || '',
    enabled: row.enabled !== undefined ? !!row.enabled : true,
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
    list: await formatCardRowsWithTagsAndActivities(rows),
    total,
    page,
    pageSize,
  };
}

async function getProductById(id) {
  const row = await repo.selectProductById(id);
  if (!row) return null;
  const [item] = await formatRowsWithTagsAndActivities([row]);
  const [variants, specGroups, specMap] = await Promise.all([
    repo.selectProductVariants(id),
    repo.selectProductSpecGroups(id),
    repo.selectVariantSpecValues(id),
  ]);
  const formattedVariants = variants.map((variant) => {
    const specs = specMap.get(variant.id) || [];
    const specText = specs.map((x) => x.value).filter(Boolean).join(' / ');
    return formatVariant({
      ...variant,
      spec_values: specs,
      spec_value_ids: specs.map((x) => x.value_id),
      spec_text: specText || variant.title || '',
    });
  });
  return {
    ...item,
    min_price: formattedVariants.length ? Math.min(...formattedVariants.map((v) => Number(v.price || 0))) : item.min_price,
    max_price: formattedVariants.length ? Math.max(...formattedVariants.map((v) => Number(v.price || 0))) : item.max_price,
    min_original_price: formattedVariants.map((v) => Number(v.original_price || 0)).filter((n) => n > 0).sort((a, b) => a - b)[0] ?? item.min_original_price ?? null,
    max_original_price: formattedVariants.map((v) => Number(v.original_price || 0)).filter((n) => n > 0).sort((a, b) => b - a)[0] ?? item.max_original_price ?? null,
    spec_groups: specGroups,
    spec_values: specGroups.flatMap((g) => g.values || []),
    variants: formattedVariants,
  };
}

async function getHomeProducts() {
  try {
    return await getCached('homeProducts', loadHomeProducts);
  } catch {
    return { hot: [], new_arrivals: [], recommended: [] };
  }
}

async function loadHomeProducts() {
  const homeModuleSettings = require('../../admin/homeModuleSettings');
  const moduleSettings = await homeModuleSettings.getHomeModuleSettings();
  const hotBatchSize = Number(moduleSettings.hotBatchSize) || 4;
  const recBatchSize = Number(moduleSettings.recBatchSize) || 4;
  const blockTarget = (batchSize) => Math.min(24, Math.max(1, Math.trunc(Number(batchSize) || 0)) * 2);
  const hotTarget = blockTarget(hotBatchSize);
  const recTarget = blockTarget(recBatchSize);

  const siteSettings = await repo.selectSiteSettingValues([
    'newArrivalDisplayCount',
    'newArrivalOnlyInStock',
  ]);
  const newArrivalLimit = Math.min(16, Math.max(1, Number(siteSettings.newArrivalDisplayCount) || 8));
  const hotLimit = Math.min(24, Math.max(8, hotTarget));
  const recLimit = Math.min(32, Math.max(8, recTarget + hotBatchSize + Math.min(newArrivalLimit, 8)));
  const newArrivalOnlyInStock = String(siteSettings.newArrivalOnlyInStock ?? '1') !== '0';
  const [hotManual, newArrivals, recommendedManual, fallbackBySales, fallbackByRecommend, fallbackByNew] =
    await Promise.all([
      repo.selectActiveProductsByFlag('is_hot', hotLimit),
      repo.selectActiveProductsByFlag('is_new', newArrivalLimit),
      repo.selectActiveProductsByFlag('is_recommended', recLimit),
      repo.selectActiveProductsFallback('sales_count DESC, sort_order ASC, created_at DESC', 64),
      repo.selectActiveProductsFallback('is_recommended DESC, sales_count DESC, sort_order ASC, created_at DESC', 64),
      repo.selectActiveProductsRecent(30, 64, newArrivalOnlyInStock),
    ]);

  const pickUnique = (primary, fallback, target, excludeIds = new Set(), options = {}) => {
    const out = [];
    const used = new Set();
    const blocked = excludeIds instanceof Set ? excludeIds : new Set();
    const sources = [primary, fallback];
    const take = (allowBlocked) => {
      for (const list of sources) {
        for (const p of Array.isArray(list) ? list : []) {
          if (!p?.id || used.has(p.id)) continue;
          if (!allowBlocked && blocked.has(p.id)) continue;
          used.add(p.id);
          out.push(p);
          if (out.length >= target) return true;
        }
      }
      return false;
    };
    if (take(false)) return out;
    if (options.allowExcludedBackfill) {
      take(true);
    }
    return out;
  };

  const hot = pickUnique(hotManual, fallbackBySales, hotTarget);
  const hotIdSet = new Set(hot.map((p) => p.id));
  const newArrivalsUnique = pickUnique(newArrivals, fallbackByNew, newArrivalLimit, hotIdSet, {
    allowExcludedBackfill: true,
  });
  const homeUsedIdSet = new Set([...hot, ...newArrivalsUnique].map((p) => p.id));
  const recommended = pickUnique(recommendedManual, fallbackByRecommend, recTarget, homeUsedIdSet, {
    allowExcludedBackfill: true,
  });

  const allRows = [...hot, ...newArrivalsUnique, ...recommended];
  const allIds = allRows.map((r) => r.id);
  const [tagMap, defaultVariants, priceRanges] = await Promise.all([
    tagAssignmentRepo.selectTagsByProductIds(allIds),
    repo.selectDefaultVariantsByProductIds(allIds),
    repo.selectVariantPriceRangesByProductIds(allIds),
  ]);
  const defaultVariantMap = new Map(defaultVariants.map((v) => [v.product_id, formatVariant(v)]));
  const priceRangeMap = new Map(priceRanges.map((r) => [r.product_id, {
    min_price: Number(r.min_price || 0),
    max_price: Number(r.max_price || 0),
    min_original_price: r.min_original_price == null ? null : Number(r.min_original_price),
    max_original_price: r.max_original_price == null ? null : Number(r.max_original_price),
    variant_count: Number(r.variant_count || 0),
  }]));
  const activityMap = await activityRepo.selectActiveActivitiesByProductIds(allIds).catch((e) => {
    console.warn('[catalog] activity lookup failed: ' + (e?.message || e));
    return new Map();
  });
  const fmt = (rows) => rows.map((r) => attachActivity({
    ...formatProductCard(r),
    ...(priceRangeMap.get(r.id) || {}),
    tags: tagMap.get(r.id) || [],
    default_variant: defaultVariantMap.get(r.id) || null,
  }, formatActivityCard(activityMap.get(r.id))));
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
  return formatCardRowsWithTagsAndActivities(rows);
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
  getBannersLite,
  getCategories,
  getCategoriesLite,
  getCategoryById,
  getProductTags,
  getProducts,
  getProductById,
  getHomeProducts,
  getRelatedProducts,
  trackHomeEngagement,
  clearCatalogCache,
};

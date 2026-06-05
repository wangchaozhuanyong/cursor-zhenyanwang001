const db = require('../../../config/db');
const {
  PRODUCT_COUNT_FROM,
  buildProductListQuery,
  buildProductSalesMetricsRefreshQuery,
} = require('./adminProductListQuery');

const PRODUCT_SALES_METRICS_LOCK = 'admin_product_sales_metrics_cache_refresh';
const DEFAULT_PRODUCT_SALES_METRICS_TTL_SECONDS = 300;
let salesMetricsCacheAvailable;
let salesMetricsRefreshPromise = null;

async function countProducts(where, params) {
  const [[{ total }]] = await db.query(
    `SELECT COUNT(*) AS total ${PRODUCT_COUNT_FROM} ${where}`,
    params,
  );
  return total;
}

async function selectProductsPage(where, params, pageSize, offset, sort) {
  const useSalesMetricsCache = await prepareProductSalesMetricsCache();
  const { sql, params: queryParams } = buildProductListQuery(where, params, {
    pageSize,
    offset,
    sort,
    useSalesMetricsCache,
  });
  const [rows] = await db.query(sql, queryParams);
  return rows;
}

async function selectProductsForExport(where, params, sort) {
  const useSalesMetricsCache = await prepareProductSalesMetricsCache();
  const { sql, params: queryParams } = buildProductListQuery(where, params, { sort, useSalesMetricsCache });
  const [rows] = await db.query(sql, queryParams);
  return rows;
}

function productSalesMetricsTtlSeconds() {
  const raw = Number(process.env.ADMIN_PRODUCT_SALES_METRICS_CACHE_TTL_SECONDS);
  return Number.isFinite(raw) && raw >= 0 ? raw : DEFAULT_PRODUCT_SALES_METRICS_TTL_SECONDS;
}

function isMissingProductSalesMetricsTable(error) {
  return error?.code === 'ER_NO_SUCH_TABLE' || /product_sales_metrics_cache/i.test(String(error?.message || ''));
}

async function productSalesMetricsCacheState() {
  const [[row]] = await db.query(`
    SELECT
      (SELECT COUNT(*) FROM products WHERE deleted_at IS NULL) AS product_count,
      COUNT(*) AS cache_count,
      TIMESTAMPDIFF(SECOND, MIN(computed_at), NOW()) AS max_age_seconds
    FROM product_sales_metrics_cache
  `);
  return {
    productCount: Number(row?.product_count || 0),
    cacheCount: Number(row?.cache_count || 0),
    maxAgeSeconds: row?.max_age_seconds == null ? null : Number(row.max_age_seconds),
  };
}

async function refreshProductSalesMetricsCacheIfStale() {
  if (salesMetricsRefreshPromise) return salesMetricsRefreshPromise;
  salesMetricsRefreshPromise = (async () => {
    const ttlSeconds = productSalesMetricsTtlSeconds();
    const state = await productSalesMetricsCacheState();
    const freshEnough = state.productCount === 0
      || (
        state.cacheCount >= state.productCount
        && state.maxAgeSeconds != null
        && state.maxAgeSeconds <= ttlSeconds
      );
    if (freshEnough) return true;

    const [[lockRow]] = await db.query('SELECT GET_LOCK(?, 0) AS locked', [PRODUCT_SALES_METRICS_LOCK]);
    if (Number(lockRow?.locked) !== 1) return state.cacheCount > 0;
    try {
      await db.query(buildProductSalesMetricsRefreshQuery());
      salesMetricsCacheAvailable = true;
      return true;
    } finally {
      await db.query('SELECT RELEASE_LOCK(?)', [PRODUCT_SALES_METRICS_LOCK]).catch(() => {});
    }
  })().finally(() => {
    salesMetricsRefreshPromise = null;
  });
  return salesMetricsRefreshPromise;
}

async function prepareProductSalesMetricsCache() {
  if (salesMetricsCacheAvailable === false) return false;
  try {
    const ready = await refreshProductSalesMetricsCacheIfStale();
    salesMetricsCacheAvailable = !!ready;
    return !!ready;
  } catch (error) {
    if (isMissingProductSalesMetricsTable(error)) {
      salesMetricsCacheAvailable = false;
      return false;
    }
    console.warn('[adminProduct] product sales metrics cache unavailable, falling back to dynamic aggregation:', error?.message || error);
    return salesMetricsCacheAvailable !== false;
  }
}

async function selectProductById(id, opts = {}) {
  const includeDeleted = !!opts.includeDeleted;
  const [[row]] = await db.query(
    `SELECT * FROM products WHERE id = ? ${includeDeleted ? '' : 'AND deleted_at IS NULL'}`,
    [id],
  );
  return row || null;
}

async function selectProductsByNamesAndCategoryIds(names, categoryIds) {
  const cleanNames = [...new Set((names || []).map((item) => String(item || '').trim()).filter(Boolean))];
  const cleanCategoryIds = [...new Set((categoryIds || []).map((item) => String(item || '').trim()).filter(Boolean))];
  if (!cleanNames.length || !cleanCategoryIds.length) return [];
  const namePlaceholders = cleanNames.map(() => '?').join(',');
  const categoryPlaceholders = cleanCategoryIds.map(() => '?').join(',');
  const [rows] = await db.query(
    `SELECT *
     FROM products
     WHERE deleted_at IS NULL
       AND name IN (${namePlaceholders})
       AND category_id IN (${categoryPlaceholders})
     ORDER BY created_at ASC`,
    [...cleanNames, ...cleanCategoryIds],
  );
  return rows;
}

async function insertProduct(params) {
  const {
    id, name, cover_image, cover_image_alt = '', video_url, imagesJson, imageAltJson = '[]', price, original_price, sales_count,
    category_id, stock, stock_warning_threshold, stock_lower_limit, stock_upper_limit,
    status, lifecycle_status, sort_order, description, search_keywords,
    is_recommended, is_new, is_hot,
  } = params;
  await db.query(
    `INSERT INTO products (id, name, cover_image, cover_image_alt, video_url, images, image_alt_json, price, original_price, sales_count,
      category_id, stock, stock_warning_threshold, stock_lower_limit, stock_upper_limit,
      status, lifecycle_status, sort_order, description, search_keywords, is_recommended, is_new, is_hot)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      id, name, cover_image, cover_image_alt || '', video_url || '', imagesJson, imageAltJson || '[]', price,
      original_price ?? null,
      Number.isFinite(sales_count) ? sales_count : 0,
      category_id, stock, stock_warning_threshold ?? 5, stock_lower_limit ?? null, stock_upper_limit ?? null,
      status,
      lifecycle_status ?? 1,
      sort_order, description, search_keywords || '', is_recommended, is_new, is_hot,
    ],
  );
}

async function updateProductDynamic(setFragments, values, id) {
  await db.query(`UPDATE products SET ${setFragments.join(', ')} WHERE id = ? AND deleted_at IS NULL`, [...values, id]);
}

async function updateProductDynamicWithVersion(setFragments, values, id, version) {
  const [result] = await db.query(
    `UPDATE products SET ${setFragments.join(', ')}, version = version + 1 WHERE id = ? AND version = ? AND deleted_at IS NULL`,
    [...values, id, Number(version)],
  );
  return result.affectedRows;
}

async function deleteProductById(id, deletedBy) {
  await db.query('UPDATE products SET deleted_at = NOW(), deleted_by = ? WHERE id = ?', [deletedBy || null, id]);
}

async function restoreProductById(id) {
  await db.query('UPDATE products SET deleted_at = NULL, deleted_by = NULL WHERE id = ?', [id]);
}

async function batchUpdateStatus(ids, status, lifecycleStatus) {
  if (!ids.length) return 0;
  const placeholders = ids.map(() => '?').join(',');
  const [result] = await db.query(
    `UPDATE products SET status = ?, lifecycle_status = ? WHERE id IN (${placeholders}) AND deleted_at IS NULL`,
    [status, lifecycleStatus, ...ids],
  );
  return result.affectedRows || 0;
}

module.exports = {
  countProducts,
  refreshProductSalesMetricsCacheIfStale,
  selectProductsPage,
  selectProductsForExport,
  selectProductById,
  selectProductsByNamesAndCategoryIds,
  insertProduct,
  updateProductDynamic,
  updateProductDynamicWithVersion,
  deleteProductById,
  restoreProductById,
  batchUpdateStatus,
};

const { generateId, formatProduct, parseProductImages, parseProductImageAlts } = require('../../../utils/helpers');
const { BusinessError } = require('../../../errors/BusinessError');
const { ValidationError } = require('../../../errors');
const { parseCsv, parseBool, decodeCsvBuffer } = require('../../../utils/csv');
const { rowsToCsvLocalized, normalizeCsvImportRows } = require('../../../utils/adminCsvLabels');
const { buildSearchKeywords, normalizeSearchKeyword } = require('../../../utils/searchKeywords');
const repo = require('../repository/adminProduct.repository');
const variantRepo = require('../repository/adminProductVariant.repository');
const adminExtendedRepo = require('../repository/adminExtended.repository');
const inventoryRepo = require('../repository/adminInventory.repository');
const categoryService = require('./adminCategory.service');
const {
  DEFAULT_VARIANT_TITLE: YINBAO_DEFAULT_VARIANT_TITLE,
  groupYinbaoRows,
  isYinbaoExcelFile,
  makeNameCategoryKey,
  normalizeKey: normalizeYinbaoKey,
  parseYinbaoWorkbookBuffer,
} = require('./yinbaoProductImport');
const {
  LIFECYCLE,
  lifecycleFromBody,
  lifecycleFromFilter,
  statusVarcharFromLifecycle,
  normalizeLifecycleFromRow,
} = require('../../product/productLifecycle');
const { writeAuditLog } = require('../../../utils/auditLog');

function getProductApi() {
  return /** @type {any} */ (require('../../product')).api || {};
}

function getHomeApi() {
  return /** @type {any} */ (require('../../home')).api || {};
}

function requireProductApi(name) {
  const fn = getProductApi()[name];
  if (typeof fn === 'undefined') {
    throw new Error(`Product 模块 API 缺少方法：${name}`);
  }
  return fn;
}

function bumpCatalogCache() {
  try {
    const fn = getProductApi().clearCatalogCache;
    if (typeof fn === 'function') fn();
  } catch (err) {
    console.warn('[adminProduct] clearCatalogCache:', err?.message || err);
  }
  try {
    const fn = getHomeApi().invalidateHomeBootstrapCache;
    if (typeof fn === 'function') fn();
  } catch (err) {
    console.warn('[adminProduct] invalidateHomeBootstrapCache:', err?.message || err);
  }
}

function emitProductEvent(event, options = {}) {
  try {
    void require('./adminEvent.service').emitEvent(event, {
      operatorId: options.operatorId || null,
      operatorType: options.operatorType || 'admin',
      source: event.source || 'product_admin',
    });
  } catch {
    // Event center is best-effort; product saves must not depend on it.
  }
}

function resolveProductImages(row) {
  const images = [];
  if (row?.cover_image) images.push(row.cover_image);
  const raw = row?.images;
  if (Array.isArray(raw)) images.push(...raw);
  else if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) images.push(...parsed);
      else images.push(raw);
    } catch {
      images.push(raw);
    }
  }
  return images.filter(Boolean);
}

function normalizeProductImageAltText(value) {
  return String(value || '').trim().slice(0, 255);
}

function normalizeProductImageAlts(value, imageCount) {
  const parsed = parseProductImageAlts(value);
  const count = Math.max(0, Number(imageCount) || 0);
  return Array.from({ length: count }, (_, index) => normalizeProductImageAltText(parsed[index] || ''));
}

function normalizeProductImagesInput(value) {
  return parseProductImages(value).map((url) => String(url || '').trim()).filter(Boolean);
}

function emitProductRiskEvents(row, variants = [], adminUserId = null) {
  if (!row?.id) return;
  const price = Number(row.price || 0);
  const stock = Number(row.stock || 0);
  const lifecycle = normalizeLifecycleFromRow(row);
  const images = resolveProductImages(row);
  const basePayload = {
    productId: row.id,
    productName: row.name,
    price,
    stock,
    lifecycleStatus: lifecycle,
  };
  if (price <= 0) {
    emitProductEvent({
      eventType: 'product.price_zero',
      category: 'content',
      severity: 'P1',
      title: '商品价格为零',
      message: `商品 ${row.name || row.id} 价格为 0`,
      entityType: 'product',
      entityId: row.id,
      fingerprint: { eventType: 'product.price_zero', entityType: 'product', entityId: row.id },
      payload: basePayload,
      source: 'product_admin',
    }, { operatorId: adminUserId });
  }
  const costly = variants.find((v) => Number(v.cost_price || 0) > Number(v.price || price || 0));
  if (costly) {
    emitProductEvent({
      eventType: 'product.cost_higher_than_price',
      category: 'content',
      severity: 'P1',
      title: '商品成本高于售价',
      message: `商品 ${row.name || row.id} 存在成本高于售价的 SKU`,
      entityType: 'product',
      entityId: row.id,
      fingerprint: { eventType: 'product.cost_higher_than_price', entityType: 'product', entityId: row.id },
      payload: { ...basePayload, variantId: costly.id, skuCode: costly.sku_code, costPrice: Number(costly.cost_price || 0), skuPrice: Number(costly.price || price || 0) },
      source: 'product_admin',
    }, { operatorId: adminUserId });
  }
  if (images.length === 0) {
    emitProductEvent({
      eventType: 'product.image_missing',
      category: 'content',
      severity: 'P2',
      title: '商品图片缺失',
      message: `商品 ${row.name || row.id} 没有主图或图片集`,
      entityType: 'product',
      entityId: row.id,
      fingerprint: { eventType: 'product.image_missing', entityType: 'product', entityId: row.id },
      payload: basePayload,
      source: 'product_admin',
    }, { operatorId: adminUserId });
  }
  if (stock <= 0 && lifecycle === LIFECYCLE.ON_SHELF) {
    emitProductEvent({
      eventType: 'product.no_stock_but_online',
      category: 'content',
      severity: 'P2',
      title: '无库存商品仍在线',
      message: `商品 ${row.name || row.id} 库存为 ${stock} 但仍在线`,
      entityType: 'product',
      entityId: row.id,
      fingerprint: { eventType: 'product.no_stock_but_online', entityType: 'product', entityId: row.id },
      payload: basePayload,
      source: 'product_admin',
    }, { operatorId: adminUserId });
  }
}

const MAX_PRODUCT_EXPORT_IDS = 1000;
const MAX_PRODUCT_IMPORT_ROWS = 2000;
const DEFAULT_VARIANT_TITLE = '默认规格';

function normalizeProductIdsInput(value) {
  const rawItems = Array.isArray(value) ? value : String(value || '').split(',');
  const ids = rawItems
    .flatMap((item) => String(item || '').split(','))
    .map((item) => item.trim())
    .filter(Boolean);
  return Array.from(new Set(ids));
}

function buildListWhere(query) {
  let where = 'WHERE p.deleted_at IS NULL';
  const params = [];
  const { keyword, category_id, status, stock_status: stockStatus, cost_status: costStatus } = query;
  const selectedIds = normalizeProductIdsInput(query.ids || query.product_ids || query.productIds);
  if (selectedIds.length > MAX_PRODUCT_EXPORT_IDS) {
    throw new ValidationError(`单次最多导出 ${MAX_PRODUCT_EXPORT_IDS} 个勾选商品`);
  }
  if (selectedIds.length) {
    where += ` AND p.id IN (${selectedIds.map(() => '?').join(',')})`;
    params.push(...selectedIds);
  }
  if (keyword) {
    const normalized = normalizeSearchKeyword(keyword);
    const expanded = buildSearchKeywords(normalized);
    where += ' AND (p.name LIKE ? OR p.description LIKE ? OR p.search_keywords LIKE ? OR p.search_keywords LIKE ?)';
    params.push(`%${normalized}%`, `%${normalized}%`, `%${normalized}%`, `%${expanded}%`);
  }
  if (category_id) {
    where += ' AND p.category_id = ?';
    params.push(category_id);
  }
  if (status) {
    const lc = lifecycleFromFilter(status);
    if (lc !== null) {
      where += ' AND p.lifecycle_status = ?';
      params.push(lc);
    } else {
      where += ' AND p.status = ?';
      params.push(status);
    }
  }
  const stockFilter = String(stockStatus || '').trim();
  if (stockFilter === 'out') {
    where += ` AND (
      (
        EXISTS (
          SELECT 1 FROM product_variants v
          WHERE v.product_id = p.id AND v.deleted_at IS NULL AND v.enabled = 1
        )
        AND NOT EXISTS (
          SELECT 1 FROM product_variants v
          WHERE v.product_id = p.id AND v.deleted_at IS NULL AND v.enabled = 1 AND v.stock > 0
        )
      )
      OR (
        NOT EXISTS (
          SELECT 1 FROM product_variants v
          WHERE v.product_id = p.id AND v.deleted_at IS NULL AND v.enabled = 1
        )
        AND p.stock <= 0
      )
    )`;
  } else if (stockFilter === 'low') {
    where += ` AND (
      (
        EXISTS (
          SELECT 1 FROM product_variants v
          WHERE v.product_id = p.id AND v.deleted_at IS NULL AND v.enabled = 1
            AND v.stock <= COALESCE(v.stock_warning_threshold, 5)
        )
        AND EXISTS (
          SELECT 1 FROM product_variants v
          WHERE v.product_id = p.id AND v.deleted_at IS NULL AND v.enabled = 1 AND v.stock > 0
        )
      )
      OR (
        NOT EXISTS (
          SELECT 1 FROM product_variants v
          WHERE v.product_id = p.id AND v.deleted_at IS NULL AND v.enabled = 1
        )
        AND p.stock > 0
        AND p.stock <= COALESCE(p.stock_warning_threshold, 5)
      )
    )`;
  } else if (stockFilter === 'normal') {
    where += ` AND (
      (
        EXISTS (
          SELECT 1 FROM product_variants v
          WHERE v.product_id = p.id AND v.deleted_at IS NULL AND v.enabled = 1
        )
        AND NOT EXISTS (
          SELECT 1 FROM product_variants v
          WHERE v.product_id = p.id AND v.deleted_at IS NULL AND v.enabled = 1
            AND v.stock <= COALESCE(v.stock_warning_threshold, 5)
        )
      )
      OR (
        NOT EXISTS (
          SELECT 1 FROM product_variants v
          WHERE v.product_id = p.id AND v.deleted_at IS NULL AND v.enabled = 1
        )
        AND p.stock > COALESCE(p.stock_warning_threshold, 5)
      )
    )`;
  }
  const costFilter = String(costStatus || '').trim();
  if (costFilter === 'missing') {
    where += ` AND EXISTS (
      SELECT 1 FROM product_variants v
      WHERE v.product_id = p.id AND v.deleted_at IS NULL AND v.enabled = 1
        AND (v.cost_price IS NULL OR v.cost_price <= 0)
    )`;
  } else if (costFilter === 'normal') {
    where += ` AND NOT EXISTS (
      SELECT 1 FROM product_variants v
      WHERE v.product_id = p.id AND v.deleted_at IS NULL AND v.enabled = 1
        AND (v.cost_price IS NULL OR v.cost_price <= 0)
    )`;
  }
  return { where, params };
}

function formatVariantRow(row) {
  if (!row) return null;
  const title = row.title || (row.is_default ? DEFAULT_VARIANT_TITLE : '');
  return {
    id: row.id,
    sku_code: row.sku_code,
    title,
    price: parseFloat(row.price),
    original_price: row.original_price == null ? null : parseFloat(row.original_price),
    cost_price: row.cost_price == null ? null : parseFloat(row.cost_price),
    stock: row.stock,
    stock_warning_threshold: row.stock_warning_threshold ?? 5,
    stock_lower_limit: row.stock_lower_limit == null ? null : Number(row.stock_lower_limit),
    stock_upper_limit: row.stock_upper_limit == null ? null : Number(row.stock_upper_limit),
    unit_name: row.unit_name || '件',
    barcode: row.barcode || '',
    image_url: row.image_url || '',
    weight: row.weight == null ? null : parseFloat(row.weight),
    enabled: row.enabled !== undefined ? !!row.enabled : true,
    sort_order: row.sort_order,
    is_default: !!row.is_default,
    spec_value_ids: Array.isArray(row.spec_value_ids) ? row.spec_value_ids : [],
    spec_values: Array.isArray(row.spec_values) ? row.spec_values : [],
    spec_text: row.spec_text || title,
  };
}

function buildProductSearchKeywordsFromPayload(payload, variants = [], tags = []) {
  return buildSearchKeywords(
    payload.name,
    payload.description,
    payload.category_id,
    variants.flatMap((v) => [v.title, v.sku_code]),
    tags.map((t) => t.name),
  );
}

function optionalNonnegativeInt(value) {
  if (value === '' || value == null) return null;
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 ? n : null;
}

async function tryPersistComplianceFields(productId, body) {
  const fields = [];
  const values = [];
  if (body.is_age_restricted !== undefined) {
    fields.push('is_age_restricted = ?');
    values.push(body.is_age_restricted ? 1 : 0);
  }
  if (body.minimum_age !== undefined) {
    const age = body.minimum_age === '' || body.minimum_age == null ? null : Number(body.minimum_age);
    fields.push('minimum_age = ?');
    values.push(Number.isFinite(age) ? age : null);
  }
  if (body.compliance_type !== undefined) {
    fields.push('compliance_type = ?');
    values.push(body.compliance_type ? String(body.compliance_type).trim() : null);
  }
  if (body.region_notice !== undefined) {
    fields.push('region_notice = ?');
    values.push(body.region_notice ? String(body.region_notice).trim() : null);
  }
  if (body.compliance_notice !== undefined) {
    fields.push('compliance_notice = ?');
    values.push(body.compliance_notice ? String(body.compliance_notice).trim() : null);
  }
  if (body.allow_index !== undefined) {
    fields.push('allow_index = ?');
    values.push(body.allow_index ? 1 : 0);
  }
  if (!fields.length) return;
  try {
    await repo.updateProductDynamic(fields, values, productId);
  } catch (err) {
    if (err?.code !== 'ER_BAD_FIELD_ERROR') throw err;
  }
}

function normalizeVariantPayloadForDb(variants, genId, mainPrice, mainStock, stockOptions = {}) {
  const mainP = Number(mainPrice);
  const price = Number.isFinite(mainP) ? mainP : 0;
  const mainS = Number(mainStock);
  const stock = Number.isFinite(mainS) ? mainS : 0;
  if (!variants || variants.length === 0) {
    return [{
      id: genId(),
      sku_code: null,
      title: DEFAULT_VARIANT_TITLE,
      price,
      stock,
      stock_warning_threshold: Number.isFinite(Number(stockOptions.stock_warning_threshold))
        ? Number(stockOptions.stock_warning_threshold)
        : 5,
      stock_lower_limit: optionalNonnegativeInt(stockOptions.stock_lower_limit),
      stock_upper_limit: optionalNonnegativeInt(stockOptions.stock_upper_limit),
      unit_name: stockOptions.unit_name || '件',
      sort_order: 0,
      is_default: 1,
    }];
  }
  const rows = variants.map((v, i) => {
    const vp = Number(v.price);
    const vs = Number(v.stock);
    const vo = Number(v.sort_order);
    return {
      id: v.id && typeof v.id === 'string' ? v.id : genId(),
      sku_code: v.sku_code ?? null,
      title: (v.title != null ? String(v.title).trim() : '') || (v.is_default ? DEFAULT_VARIANT_TITLE : ''),
      price: Number.isFinite(vp) ? vp : price,
      original_price: v.original_price === '' || v.original_price == null ? null : Number(v.original_price),
      cost_price: v.cost_price === '' || v.cost_price == null ? null : Number(v.cost_price),
      stock: Number.isFinite(vs) ? vs : stock,
      stock_warning_threshold: Number.isFinite(Number(v.stock_warning_threshold)) ? Number(v.stock_warning_threshold) : 5,
      stock_lower_limit: optionalNonnegativeInt(v.stock_lower_limit),
      stock_upper_limit: optionalNonnegativeInt(v.stock_upper_limit),
      unit_name: v.unit_name || '件',
      barcode: v.barcode || null,
      image_url: v.image_url || null,
      weight: v.weight === '' || v.weight == null ? null : Number(v.weight),
      enabled: v.enabled === false || v.enabled === 0 ? 0 : 1,
      sort_order: Number.isFinite(vo) ? vo : i,
      is_default: v.is_default ? 1 : 0,
      spec_value_ids: Array.isArray(v.spec_value_ids) ? v.spec_value_ids.filter(Boolean) : [],
    };
  });
  if (!rows.some((r) => r.is_default) && rows.length) rows[0].is_default = 1;
  let seen = false;
  return rows.map((r) => {
    if (r.is_default && !seen) {
      seen = true;
      return { ...r, is_default: 1 };
    }
    return { ...r, is_default: 0 };
  });
}

function formatAdminProductListRow(row) {
  const base = formatProduct(row);
  if (!base) return null;
  return {
    ...base,
    category_name: row.category_name || '',
    sku_count: Number(row.sku_count || 0),
    enabled_sku_count: Number(row.enabled_sku_count || 0),
    min_sku_price: row.min_sku_price != null ? parseFloat(row.min_sku_price) : null,
    max_sku_price: row.max_sku_price != null ? parseFloat(row.max_sku_price) : null,
    min_cost_price: row.min_cost_price != null ? parseFloat(row.min_cost_price) : null,
    max_cost_price: row.max_cost_price != null ? parseFloat(row.max_cost_price) : null,
    missing_cost_sku_count: Number(row.missing_cost_sku_count || 0),
    out_of_stock_sku_count: Number(row.out_of_stock_sku_count || 0),
    stock_warning_sku_count: Number(row.stock_warning_sku_count || 0),
    sales_qty_7d: Number(row.sales_qty_7d || 0),
    sales_qty_30d: Number(row.sales_qty_30d || 0),
    sales_amount_30d: parseFloat(row.sales_amount_30d || 0),
    gross_profit_30d: parseFloat(row.gross_profit_30d || 0),
    gross_margin_30d: row.gross_margin_30d != null ? parseFloat(row.gross_margin_30d) : null,
  };
}

async function attachTagsToProducts(rows) {
  if (!rows.length) return [];
  const formatted = rows.map((r) => formatAdminProductListRow(r)).filter(Boolean);
  try {
    const map = await requireProductApi('selectTagsByProductIds')(rows.map((r) => r.id));
    return formatted.map((r) => ({ ...r, tags: map.get(r.id) || [] }));
  } catch (e) {
    console.error('[adminProduct] attachTagsToProducts failed (listing without tags):', e.code || e.message);
    return formatted.map((r) => ({ ...r, tags: [] }));
  }
}

async function syncProductPriceStockFromDefaultVariant(productId) {
  const rows = await variantRepo.selectVariantsByProductId(productId);
  const enabledRows = rows.filter((r) => r.enabled !== 0);
  const def = enabledRows.find((r) => r.is_default) || enabledRows[0] || rows[0];
  if (!def) return;
  const totalStock = enabledRows.reduce((sum, r) => sum + Number(r.stock || 0), 0);
  await repo.updateProductDynamic(
    [
      'price = ?',
      'original_price = ?',
      'stock = ?',
      'stock_warning_threshold = ?',
      'stock_lower_limit = ?',
      'stock_upper_limit = ?',
    ],
    [
      def.price,
      def.original_price == null || def.original_price === '' ? null : Number(def.original_price),
      totalStock,
      def.stock_warning_threshold ?? def.stock_lower_limit ?? 5,
      def.stock_lower_limit ?? null,
      def.stock_upper_limit ?? null,
    ],
    productId,
  );
}

async function listProducts(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(query.pageSize, 10) || 20));
  const { where, params } = buildListWhere(query);
  const total = await repo.countProducts(where, params);
  const offset = (page - 1) * pageSize;
  const rows = await repo.selectProductsPage(where, params, pageSize, offset, query.sort);
  const list = await attachTagsToProducts(rows);
  return {
    kind: 'paginate',
    list,
    total,
    page,
    pageSize,
  };
}

async function getProductById(id) {
  const row = await repo.selectProductById(id);
  if (!row) throw new BusinessError(404, '商品不存在');
  const matrix = await variantRepo.selectProductSkuMatrix(id);
  const tagMap = await requireProductApi('selectTagsByProductIds')([id]);
  return {
    data: {
      ...formatProduct(row),
      spec_groups: matrix.spec_groups,
      spec_values: matrix.spec_groups.flatMap((g) => g.values || []),
      variants: matrix.variants.map(formatVariantRow),
      tags: tagMap.get(id) || [],
    },
  };
}

async function createProduct(body, adminUserId, req) {
  const {
    name, cover_image, cover_image_alt, video_url, images, image_alts, price, original_price, sales_count,
    category_id, stock, stock_warning_threshold, stock_lower_limit, stock_upper_limit, sort_order,
    description, is_recommended, is_new, isNewArrival, is_hot,
    variants,
    tag_ids: tagIdsBody,
  } = body;

  const lcResolved = lifecycleFromBody(body) ?? LIFECYCLE.ON_SHELF;
  const statusStr = statusVarcharFromLifecycle(lcResolved);

  const id = generateId();
  const productImages = normalizeProductImagesInput(images);
  const productImageAlts = normalizeProductImageAlts(image_alts, productImages.length);
  const variantRows = normalizeVariantPayloadForDb(variants, generateId, price, stock, {
    stock_warning_threshold,
    stock_lower_limit,
    stock_upper_limit,
  });
  try {
    await repo.insertProduct({
      id,
      name,
      cover_image: cover_image || '',
      cover_image_alt: normalizeProductImageAltText(cover_image_alt),
      video_url: video_url || '',
      imagesJson: JSON.stringify(productImages),
      imageAltJson: JSON.stringify(productImageAlts),
      price,
      original_price: original_price === '' || original_price == null
        ? null
        : Number(original_price),
      sales_count: Number.isFinite(Number(sales_count)) ? Number(sales_count) : 0,
      category_id: category_id || '',
      stock: stock || 0,
      stock_warning_threshold: Number.isFinite(Number(stock_warning_threshold))
        ? Number(stock_warning_threshold)
        : (variantRows.find((v) => v.is_default)?.stock_warning_threshold ?? 5),
      stock_lower_limit: optionalNonnegativeInt(stock_lower_limit) ?? (variantRows.find((v) => v.is_default)?.stock_lower_limit ?? null),
      stock_upper_limit: optionalNonnegativeInt(stock_upper_limit) ?? (variantRows.find((v) => v.is_default)?.stock_upper_limit ?? null),
      status: statusStr,
      lifecycle_status: lcResolved,
      sort_order: sort_order || 0,
      description: description || '',
      search_keywords: buildProductSearchKeywordsFromPayload(
        { name, description, category_id },
        variantRows,
        [],
      ),
      is_recommended: is_recommended ? 1 : 0,
      is_new: (isNewArrival ?? is_new) ? 1 : 0,
      is_hot: is_hot ? 1 : 0,
    });
    await variantRepo.upsertProductSkuMatrix(id, body.spec_groups, variantRows);
    await syncProductPriceStockFromDefaultVariant(id);
    await tryPersistComplianceFields(id, body);
    if (Number(stock || 0) > 0) {
      const defaultVariant = variantRows.find((v) => v.is_default) || variantRows[0];
      const conn = await inventoryRepo.getConnection();
      try {
        await conn.beginTransaction();
        await inventoryRepo.insertStockRecord(conn, {
          id: generateId(),
          productId: id,
          variantId: defaultVariant?.id || null,
          changeType: 'in',
          quantityDelta: Number(stock || 0),
          beforeStock: 0,
          afterStock: Number(stock || 0),
          reason: '初始库存',
          refType: 'admin',
          refId: '',
          operatorId: adminUserId,
          productNameSnapshot: name,
          variantNameSnapshot: defaultVariant?.title || '',
          skuCodeSnapshot: defaultVariant?.sku_code || '',
          orderNoSnapshot: '',
          sourceNo: '',
          remark: '',
          costPrice: null,
          createdByType: 'admin',
        });
        await conn.commit();
      } catch (e) {
        await conn.rollback();
        throw e;
      } finally {
        conn.release();
      }
    }
    await requireProductApi('replaceTagAssignments')(id, Array.isArray(tagIdsBody) ? tagIdsBody : []);
    const row = await repo.selectProductById(id);
    const matrix = await variantRepo.selectProductSkuMatrix(id);
    const vrows = matrix.variants;
    const tagMap = await requireProductApi('selectTagsByProductIds')([id]);
    await repo.updateProductDynamic(
      ['search_keywords = ?'],
      [buildProductSearchKeywordsFromPayload(row, vrows, tagMap.get(id) || [])],
      id,
    );
    await writeAuditLog({
      req,
      operatorId: adminUserId,
      actionType: 'product.create',
      objectType: 'product',
      objectId: id,
      summary: `创建商品 ${name}`,
      after: { name, price, stock: stock || 0, lifecycle_status: lcResolved, status: statusStr },
      result: 'success',
    });
    emitProductRiskEvents(row, vrows, adminUserId);
    bumpCatalogCache();
    return {
      data: { ...formatProduct(row), spec_groups: matrix.spec_groups, spec_values: matrix.spec_groups.flatMap((g) => g.values || []), variants: vrows.map(formatVariantRow), tags: tagMap.get(id) || [] },
      message: '创建成功',
    };
  } catch (err) {
    await writeAuditLog({
      req,
      operatorId: adminUserId,
      actionType: 'product.create',
      objectType: 'product',
      objectId: id,
      summary: `创建商品失败 ${name}`,
      result: 'failure',
      errorMessage: err.message || String(err),
    });
    throw err;
  }
}

async function updateProduct(id, body, adminUserId, req) {
  const beforeRow = await repo.selectProductById(id);
  if (!beforeRow) throw new BusinessError(404, '商品不存在');
  if (body.isNewArrival !== undefined && body.is_new === undefined) {
    body.is_new = body.isNewArrival;
  }
  const beforeSnap = {
    name: beforeRow.name,
    price: parseFloat(beforeRow.price),
    stock: beforeRow.stock,
    status: beforeRow.status,
    lifecycle_status: normalizeLifecycleFromRow(beforeRow),
  };

  try {
    const fields = [];
    const values = [];
    const allowedFields = ['name', 'cover_image', 'video_url', 'price', 'category_id',
      'sort_order', 'description', 'sales_count', 'stock_warning_threshold', 'stock_lower_limit', 'stock_upper_limit'];
    for (const f of allowedFields) {
      if (body[f] !== undefined) {
        fields.push(`${f} = ?`);
        values.push(body[f]);
      }
    }
    if (body.cover_image_alt !== undefined) {
      fields.push('cover_image_alt = ?');
      values.push(normalizeProductImageAltText(body.cover_image_alt));
    }
    if (body.lifecycle_status !== undefined || body.status !== undefined) {
      const lc = lifecycleFromBody(body);
      if (lc === null) throw new BusinessError(400, '状态无效');
      fields.push('lifecycle_status = ?', 'status = ?');
      values.push(lc, statusVarcharFromLifecycle(lc));
    }
    if (body.original_price !== undefined) {
      const op = body.original_price;
      fields.push('original_price = ?');
      values.push(op === '' || op == null ? null : Number(op));
    }
    const hasImageAltPayload = body.image_alts !== undefined || body.image_alt_json !== undefined;
    const nextProductImages = body.images !== undefined ? normalizeProductImagesInput(body.images) : null;
    if (nextProductImages) {
      fields.push('images = ?');
      values.push(JSON.stringify(nextProductImages));
    }
    if (hasImageAltPayload) {
      const imageCount = nextProductImages ? nextProductImages.length : parseProductImages(beforeRow.images).length;
      fields.push('image_alt_json = ?');
      values.push(JSON.stringify(normalizeProductImageAlts(body.image_alts ?? body.image_alt_json, imageCount)));
    } else if (nextProductImages) {
      fields.push('image_alt_json = ?');
      values.push(JSON.stringify(normalizeProductImageAlts(beforeRow.image_alt_json, nextProductImages.length)));
    }
    for (const bool of ['is_recommended', 'is_new', 'is_hot']) {
      if (body[bool] !== undefined) {
        fields.push(`${bool} = ?`);
        values.push(body[bool] ? 1 : 0);
      }
    }
    const hasVariantUpdate = body.variants !== undefined;
    const hasTagUpdate = body.tag_ids !== undefined;
    if (fields.length === 0 && !hasVariantUpdate && !hasTagUpdate) {
      throw new BusinessError(400, '没有需要更新的字段');
    }

    if (fields.length > 0) {
      await repo.updateProductDynamic(fields, values, id);
    }
    if (hasVariantUpdate) {
      const row = await repo.selectProductById(id);
      const variantRows = normalizeVariantPayloadForDb(
        body.variants,
        generateId,
        row.price,
        row.stock,
      );
      await variantRepo.upsertProductSkuMatrix(id, body.spec_groups, variantRows);
      await syncProductPriceStockFromDefaultVariant(id);
    } else if (body.price !== undefined) {
      const row = await repo.selectProductById(id);
      await variantRepo.updateDefaultVariantPriceStock(
        id,
        Number(row.price),
        Number((await variantRepo.selectVariantsByProductId(id)).find((x) => x.is_default)?.stock || 0),
      );
    }
    if (hasTagUpdate) {
      await requireProductApi('replaceTagAssignments')(id, Array.isArray(body.tag_ids) ? body.tag_ids : []);
    }
    await tryPersistComplianceFields(id, body);
    const row = await repo.selectProductById(id);
    const matrix = await variantRepo.selectProductSkuMatrix(id);
    const vrows = matrix.variants;
    const tagMap = await requireProductApi('selectTagsByProductIds')([id]);
    await repo.updateProductDynamic(
      ['search_keywords = ?'],
      [buildProductSearchKeywordsFromPayload(row, vrows, tagMap.get(id) || [])],
      id,
    );
    await writeAuditLog({
      req,
      operatorId: adminUserId,
      actionType: 'product.update',
      objectType: 'product',
      objectId: id,
      summary: `更新商品 ${row.name}`,
      before: beforeSnap,
      after: {
        name: row.name,
        price: parseFloat(row.price),
        stock: row.stock,
        status: row.status,
        lifecycle_status: normalizeLifecycleFromRow(row),
      },
      result: 'success',
    });
    emitProductRiskEvents(row, vrows, adminUserId);
    bumpCatalogCache();
    return {
      data: { ...formatProduct(row), spec_groups: matrix.spec_groups, spec_values: matrix.spec_groups.flatMap((g) => g.values || []), variants: vrows.map(formatVariantRow), tags: tagMap.get(id) || [] },
      message: '更新成功',
    };
  } catch (err) {
    await writeAuditLog({
      req,
      operatorId: adminUserId,
      actionType: 'product.update',
      objectType: 'product',
      objectId: id,
      summary: '商品更新失败',
      before: beforeSnap,
      result: 'failure',
      errorMessage: err.message || String(err),
    });
    throw err;
  }
}

async function updateProductTags(id, tagIds, adminUserId, req) {
  const row = await repo.selectProductById(id);
  if (!row) return { error: { code: 404, message: '商品不存在' } };
  if (!Array.isArray(tagIds)) return { error: { code: 400, message: 'tag_ids 必须为数组' } };
  await requireProductApi('replaceTagAssignments')(id, tagIds);
  const vrows = await variantRepo.selectVariantsByProductId(id);
  const tagMap = await requireProductApi('selectTagsByProductIds')([id]);
  await repo.updateProductDynamic(
    ['search_keywords = ?'],
    [buildProductSearchKeywordsFromPayload(row, vrows, tagMap.get(id) || [])],
    id,
  );
  await writeAuditLog({
    req,
    operatorId: adminUserId,
    actionType: 'product.tags.update',
    objectType: 'product',
    objectId: id,
    summary: `更新商品标签 ${row.name}`,
    after: { tag_ids: tagIds },
    result: 'success',
  });
  bumpCatalogCache();
  return {
    data: { product_id: id, tags: tagMap.get(id) || [] },
    message: '商品标签已更新',
  };
}

async function patchProductLifecycle(id, lifecycleStatus, adminUserId, req) {
  const beforeRow = await repo.selectProductById(id);
  if (!beforeRow) throw new BusinessError(404, '商品不存在');
  const beforeLc = normalizeLifecycleFromRow(beforeRow);
  const st = statusVarcharFromLifecycle(lifecycleStatus);
  await repo.updateProductDynamic(
    ['lifecycle_status = ?', 'status = ?'],
    [lifecycleStatus, st],
    id,
  );
  const row = await repo.selectProductById(id);
  await writeAuditLog({
    req,
    operatorId: adminUserId,
    actionType: 'product.patch_status',
    objectType: 'product',
    objectId: id,
    summary: `调整商品生命周期 ${row.name}`,
    before: { lifecycle_status: beforeLc },
    after: { lifecycle_status: lifecycleStatus, status: st },
    result: 'success',
  });
  const vrows = await variantRepo.selectVariantsByProductId(id);
  const tagMap = await requireProductApi('selectTagsByProductIds')([id]);
  bumpCatalogCache();
  return {
    data: { ...formatProduct(row), variants: vrows.map(formatVariantRow), tags: tagMap.get(id) || [] },
    message: '状态已更新',
  };
}

async function deleteProduct(id, adminUserId, req) {
  const before = await repo.selectProductById(id);
  if (!before) throw new BusinessError(404, '商品不存在或已删除');
  if (normalizeLifecycleFromRow(before) !== LIFECYCLE.OFF_SHELF) {
    throw new BusinessError(400, '请先下架商品后再删除');
  }
  try {
    const deleted = await repo.deleteProductById(id, adminUserId);
    if (!deleted) throw new BusinessError(400, '请先下架商品后再删除');
    await writeAuditLog({
      req,
      operatorId: adminUserId,
      actionType: 'product.delete',
      objectType: 'product',
      objectId: id,
      summary: `删除商品 ${before?.name || id}`,
      before: before ? { name: before.name, status: before.status } : null,
      result: 'success',
    });
    bumpCatalogCache();
    return { data: null, message: '已删除' };
  } catch (err) {
    await writeAuditLog({
      req,
      operatorId: adminUserId,
      actionType: 'product.delete',
      objectType: 'product',
      objectId: id,
      summary: '删除商品失败',
      result: 'failure',
      errorMessage: err.message || String(err),
    });
    throw err;
  }
}

async function batchDeleteProducts(ids, adminUserId, req) {
  if (!Array.isArray(ids) || ids.length === 0) return { error: { code: 400, message: '请选择商品' } };
  const uniqueIds = [...new Set(ids.map((id) => String(id || '').trim()).filter(Boolean))];
  if (!uniqueIds.length) return { error: { code: 400, message: '请选择商品' } };
  if (uniqueIds.length > 1000) return { error: { code: 400, message: '单次最多删除 1000 个商品' } };

  const rows = await repo.selectProductsByIds(uniqueIds);
  const rowMap = new Map(rows.map((row) => [row.id, row]));
  const missingIds = uniqueIds.filter((id) => !rowMap.has(id));
  const blockedIds = [];
  const deleteIds = [];

  for (const row of rows) {
    if (normalizeLifecycleFromRow(row) === LIFECYCLE.OFF_SHELF) {
      deleteIds.push(row.id);
    } else {
      blockedIds.push(row.id);
    }
  }

  const deleted = deleteIds.length ? await repo.batchDeleteProductsByIds(deleteIds, adminUserId) : 0;
  const skippedIds = [...missingIds, ...blockedIds];
  const skipped = uniqueIds.length - deleted;

  await writeAuditLog({
    req,
    operatorId: adminUserId,
    actionType: 'product.batch_delete',
    objectType: 'product',
    objectId: uniqueIds.length <= 3 ? uniqueIds.join(',') : `${uniqueIds.slice(0, 3).join(',')}…(+${uniqueIds.length})`,
    summary: `批量删除下架商品：成功 ${deleted}，跳过 ${skipped}`,
    before: {
      requested: uniqueIds.length,
      inactive_ids: deleteIds,
      blocked_ids: blockedIds,
      missing_ids: missingIds,
    },
    after: {
      requested: uniqueIds.length,
      deleted,
      skipped,
      skipped_ids: skippedIds,
      blocked_active_ids: blockedIds,
    },
    result: skipped && !deleted ? 'failure' : (skipped ? 'partial' : 'success'),
  });

  if (deleted > 0) bumpCatalogCache();

  const parts = [`已删除 ${deleted} 个下架商品`];
  if (blockedIds.length) parts.push(`跳过 ${blockedIds.length} 个非下架商品`);
  if (missingIds.length) parts.push(`跳过 ${missingIds.length} 个不存在或已删除商品`);
  return {
    data: {
      requested: uniqueIds.length,
      deleted,
      skipped,
      skipped_ids: skippedIds,
      blocked_active_ids: blockedIds,
    },
    message: parts.join('，'),
  };
}

/** 一行一 SKU（ERP 整表同步） */
const EXPORT_HEADERS_SKU = [
  'product_id', 'name', 'category_id', 'cover_image', 'video_url', 'status', 'lifecycle_status',
  'sort_order', 'description', 'points', 'sales_count', 'is_recommended', 'is_new', 'is_hot', 'images', 'tags',
  'variant_id', 'sku_code', 'variant_title', 'price', 'original_price', 'stock', 'cost_price', 'barcode',
  'variant_enabled', 'is_default', 'variant_sort_order', 'stock_warning_threshold',
];

/** 兼容旧版：单商品一行 */
const EXPORT_HEADERS_LEGACY = [
  'id', 'name', 'price', 'original_price', 'sales_count', 'stock', 'category_id',
  'cover_image', 'video_url', 'status', 'lifecycle_status', 'sort_order',
  'description', 'points', 'is_recommended', 'is_new', 'is_hot', 'images',
];

function parseTagNamesRaw(raw) {
  return String(raw || '')
    .split(/[,，;；|]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function resolveTagNamesToIds(raw, tagCatalog) {
  const names = parseTagNamesRaw(raw);
  const nameToId = new Map(tagCatalog.map((t) => [String(t.name || '').trim(), t.id]));
  const ids = [];
  const unknown = [];
  for (const name of names) {
    const id = nameToId.get(name);
    if (id) ids.push(id);
    else unknown.push(name);
  }
  return { ids: [...new Set(ids)], unknown };
}

function isSkuMatrixCsvRow(row) {
  return Boolean(
    String(row.variant_id || '').trim()
    || String(row.sku_code || '').trim()
    || String(row.variant_title || row.variant_name || '').trim(),
  );
}

function isSkuMatrixImport(rows) {
  return rows.some(isSkuMatrixCsvRow);
}

function productImagesJsonFromRow(row) {
  let imagesJson = '[]';
  if (row.images && String(row.images).trim()) {
    const raw = String(row.images).trim();
    try {
      JSON.parse(raw);
      imagesJson = raw;
    } catch {
      imagesJson = JSON.stringify([raw]);
    }
  }
  return imagesJson;
}

function buildProductPayloadFromCsvRow(row) {
  const sortOrder = row.sort_order !== undefined && row.sort_order !== '' ? parseInt(row.sort_order, 10) : 0;
  const points = row.points !== undefined && row.points !== '' ? parseInt(row.points, 10) : 0;
  const originalPriceRaw = row.original_price !== undefined && row.original_price !== ''
    ? Number(row.original_price)
    : null;
  const salesCountRaw = row.sales_count !== undefined && row.sales_count !== ''
    ? parseInt(row.sales_count, 10)
    : 0;
  const { lifecycle_status: lc, status: st } = csvStatusToLifecycle(row.status);
  const imagesJson = productImagesJsonFromRow(row);
  return {
    payload: {
      name: (row.name || '').trim(),
      cover_image: (row.cover_image || '').trim(),
      video_url: (row.video_url || '').trim(),
      images: JSON.parse(imagesJson),
      original_price: Number.isFinite(originalPriceRaw) ? originalPriceRaw : null,
      sales_count: Number.isFinite(salesCountRaw) ? salesCountRaw : 0,
      points: Number.isFinite(points) ? points : 0,
      category_id: (row.category_id || '').trim(),
      status: st,
      lifecycle_status: lc,
      sort_order: Number.isFinite(sortOrder) ? sortOrder : 0,
      description: (row.description || '').trim(),
      is_recommended: parseBool(row.is_recommended),
      is_new: parseBool(row.is_new),
      is_hot: parseBool(row.is_hot),
    },
    imagesJson,
  };
}

function buildVariantRowFromCsv(row, productId, existingVariants, genId) {
  const price = parseFloat(row.price);
  if (Number.isNaN(price)) return { error: '售价格式无效' };
  const stock = parseInt(row.stock, 10);
  const sortOrder = row.variant_sort_order !== undefined && row.variant_sort_order !== ''
    ? parseInt(row.variant_sort_order, 10)
    : (row.sort_order !== undefined && row.sort_order !== '' ? parseInt(row.sort_order, 10) : 0);
  const threshold = row.stock_warning_threshold !== undefined && row.stock_warning_threshold !== ''
    ? parseInt(row.stock_warning_threshold, 10)
    : 5;
  const originalPrice = row.original_price !== undefined && row.original_price !== ''
    ? Number(row.original_price)
    : null;
  const costPrice = row.cost_price !== undefined && row.cost_price !== ''
    ? Number(row.cost_price)
    : null;
  let variantId = String(row.variant_id || '').trim();
  if (!variantId) {
    const sku = String(row.sku_code || '').trim();
    if (sku && Array.isArray(existingVariants)) {
      const found = existingVariants.find((v) => String(v.sku_code || '').trim() === sku);
      if (found) variantId = found.id;
    }
  }
  if (!variantId) variantId = genId();
  return {
    variant: {
      id: variantId,
      sku_code: String(row.sku_code || '').trim() || null,
      title: String(row.variant_title || row.variant_name || '').trim(),
      price,
      original_price: Number.isFinite(originalPrice) ? originalPrice : null,
      cost_price: Number.isFinite(costPrice) ? costPrice : null,
      stock: Number.isFinite(stock) ? stock : 0,
      stock_warning_threshold: Number.isFinite(threshold) ? threshold : 5,
      barcode: String(row.barcode || '').trim() || null,
      enabled: parseBool(row.variant_enabled !== undefined && row.variant_enabled !== '' ? row.variant_enabled : 1),
      sort_order: Number.isFinite(sortOrder) ? sortOrder : 0,
      is_default: parseBool(row.is_default),
    },
  };
}

function groupSkuImportRows(rows) {
  /** @type {Map<string, { rows: Record<string, string>[], rowNums: number[] }>} */
  const groups = new Map();
  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    const rowNum = i + 2;
    const productId = String(row.product_id || row.id || '').trim();
    const name = String(row.name || '').trim();
    const key = productId || (name ? `__name__:${name}` : `__row__:${rowNum}`);
    if (!groups.has(key)) groups.set(key, { rows: [], rowNums: [] });
    const g = groups.get(key);
    g.rows.push(row);
    g.rowNums.push(rowNum);
  }
  return groups;
}

function csvStatusToLifecycle(statusRaw) {
  const t = String(statusRaw || 'active').trim().toLowerCase();
  if (t === 'draft') return { lifecycle_status: 0, status: 'draft' };
  if (t === 'inactive') return { lifecycle_status: 2, status: 'inactive' };
  return { lifecycle_status: 1, status: 'active' };
}

async function exportProductsCsv(query) {
  const { where, params } = buildListWhere(query);
  const rows = await repo.selectProductsForExport(where, params, query.sort);
  const productIds = rows.map((r) => r.id);
  const [variantMap, tagMap] = await Promise.all([
    variantRepo.selectVariantsByProductIds(productIds),
    requireProductApi('selectTagsByProductIds')(productIds),
  ]);

  const data = [];
  for (const r of rows) {
    let imagesStr = '';
    if (r.images == null) imagesStr = '';
    else if (typeof r.images === 'string') imagesStr = r.images;
    else imagesStr = JSON.stringify(r.images);
    const lc = normalizeLifecycleFromRow(r);
    const tags = (tagMap.get(r.id) || []).map((t) => t.name).join(',');
    const base = {
      product_id: r.id,
      name: r.name,
      category_id: r.category_id || '',
      cover_image: r.cover_image || '',
      video_url: r.video_url || '',
      status: statusVarcharFromLifecycle(lc),
      lifecycle_status: lc,
      sort_order: r.sort_order ?? 0,
      description: (r.description || '').replace(/\r\n/g, '\n'),
      points: r.points ?? 0,
      sales_count: r.sales_count ?? 0,
      is_recommended: r.is_recommended ? 1 : 0,
      is_new: r.is_new ? 1 : 0,
      is_hot: r.is_hot ? 1 : 0,
      images: imagesStr,
      tags,
    };
    const variants = variantMap.get(r.id) || [];
    if (!variants.length) {
      data.push({
        ...base,
        variant_id: '',
        sku_code: '',
        variant_title: '',
        price: r.price,
        original_price: r.original_price ?? '',
        stock: r.stock,
        cost_price: '',
        barcode: '',
        variant_enabled: 1,
        is_default: 1,
        variant_sort_order: 0,
        stock_warning_threshold: r.stock_warning_threshold ?? 5,
      });
      continue;
    }
    for (const v of variants) {
      data.push({
        ...base,
        variant_id: v.id,
        sku_code: v.sku_code || '',
        variant_title: v.title || '',
        price: v.price,
        original_price: v.original_price ?? '',
        stock: v.stock,
        cost_price: v.cost_price ?? '',
        barcode: v.barcode || '',
        variant_enabled: v.enabled !== 0 ? 1 : 0,
        is_default: v.is_default ? 1 : 0,
        variant_sort_order: v.sort_order ?? 0,
        stock_warning_threshold: v.stock_warning_threshold ?? 5,
      });
    }
  }
  const csv = rowsToCsvLocalized(EXPORT_HEADERS_SKU, data);
  return { csv, filename: `products_sku_${Date.now()}.csv` };
}

async function importProductsCsvLegacy(rows, adminUserId, req) {
  let created = 0;
  let updated = 0;
  let skipped = 0;
  const errors = [];
  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    const rowNum = i + 2;
    const name = (row.name || '').trim();
    const price = parseFloat(row.price);
    if (!name || Number.isNaN(price)) {
      skipped += 1;
      errors.push({
        row: rowNum,
        reason: !name ? '缺少商品名称' : '售价格式无效',
      });
      continue;
    }

    const stock = parseInt(row.stock, 10);
    const sortOrder = row.sort_order !== undefined && row.sort_order !== '' ? parseInt(row.sort_order, 10) : 0;
    const points = row.points !== undefined && row.points !== '' ? parseInt(row.points, 10) : 0;
    let imagesJson = '[]';
    if (row.images && String(row.images).trim()) {
      const raw = String(row.images).trim();
      try {
        JSON.parse(raw);
        imagesJson = raw;
      } catch {
        imagesJson = JSON.stringify([raw]);
      }
    }

    const originalPriceRaw = row.original_price !== undefined && row.original_price !== ''
      ? Number(row.original_price)
      : null;
    const salesCountRaw = row.sales_count !== undefined && row.sales_count !== ''
      ? parseInt(row.sales_count, 10)
      : 0;

    const { lifecycle_status: lc, status: st } = csvStatusToLifecycle(row.status);

    const payload = {
      name,
      cover_image: (row.cover_image || '').trim(),
      video_url: (row.video_url || '').trim(),
      images: JSON.parse(imagesJson),
      price,
      original_price: Number.isFinite(originalPriceRaw) ? originalPriceRaw : null,
      sales_count: Number.isFinite(salesCountRaw) ? salesCountRaw : 0,
      points: Number.isFinite(points) ? points : 0,
      category_id: (row.category_id || '').trim(),
      stock: Number.isFinite(stock) ? stock : 0,
      status: st,
      lifecycle_status: lc,
      sort_order: Number.isFinite(sortOrder) ? sortOrder : 0,
      description: (row.description || '').trim(),
      is_recommended: parseBool(row.is_recommended),
      is_new: parseBool(row.is_new),
      is_hot: parseBool(row.is_hot),
    };

    const id = (row.id || '').trim();
    try {
      if (id) {
        const existing = await repo.selectProductById(id, { includeDeleted: true });
        if (existing) {
          if (existing.deleted_at) {
            throw new BusinessError(400, '商品已删除，请先恢复后再导入更新');
          }
          await updateProduct(id, {
            ...payload,
            images: JSON.parse(imagesJson),
          }, adminUserId, undefined);
          updated += 1;
        } else {
          await repo.insertProduct({
            id,
            name: payload.name,
            cover_image: payload.cover_image,
            video_url: payload.video_url,
            imagesJson,
            price: payload.price,
            original_price: payload.original_price,
            sales_count: payload.sales_count,
            category_id: payload.category_id,
            stock: payload.stock,
            status: payload.status,
            lifecycle_status: payload.lifecycle_status,
            sort_order: payload.sort_order,
            description: payload.description,
            search_keywords: buildProductSearchKeywordsFromPayload(payload),
            is_recommended: payload.is_recommended ? 1 : 0,
            is_new: payload.is_new ? 1 : 0,
            is_hot: payload.is_hot ? 1 : 0,
          });
          const variantRows = normalizeVariantPayloadForDb(null, generateId, payload.price, payload.stock);
          await variantRepo.upsertProductVariants(id, variantRows);
          await syncProductPriceStockFromDefaultVariant(id);
          created += 1;
        }
      } else {
        const newId = generateId();
        await repo.insertProduct({
          id: newId,
          name: payload.name,
          cover_image: payload.cover_image,
          video_url: payload.video_url,
          imagesJson,
          price: payload.price,
          original_price: payload.original_price,
          sales_count: payload.sales_count,
          category_id: payload.category_id,
          stock: payload.stock,
          status: payload.status,
          lifecycle_status: payload.lifecycle_status,
          sort_order: payload.sort_order,
          description: payload.description,
          search_keywords: buildProductSearchKeywordsFromPayload(payload),
          is_recommended: payload.is_recommended ? 1 : 0,
          is_new: payload.is_new ? 1 : 0,
          is_hot: payload.is_hot ? 1 : 0,
        });
        const variantRows = normalizeVariantPayloadForDb(null, generateId, payload.price, payload.stock);
        await variantRepo.upsertProductVariants(newId, variantRows);
        await syncProductPriceStockFromDefaultVariant(newId);
        created += 1;
      }
    } catch (err) {
      skipped += 1;
      errors.push({
        row: rowNum,
        reason: err?.message || '导入失败',
      });
    }
  }

  return { created, updated, skipped, errors, sku_rows: 0 };
}

async function importProductsCsvSkuMatrix(rows, adminUserId, req) {
  let created = 0;
  let updated = 0;
  let skipped = 0;
  let skuRows = 0;
  const errors = [];
  let tagCatalog = [];
  try {
    tagCatalog = await adminExtendedRepo.selectProductTags();
  } catch (e) {
    console.warn('[adminProduct] import tag catalog load failed:', e?.message || e);
  }
  const enabledTags = tagCatalog.filter((t) => t.enabled !== 0);

  const groups = groupSkuImportRows(rows);
  for (const [, group] of groups) {
    const { rows: groupRows, rowNums } = group;
    const firstRowNum = rowNums[0];
    try {
      const first = groupRows[0];
      const { payload, imagesJson } = buildProductPayloadFromCsvRow(first);
      if (!payload.name) {
        throw new BusinessError(400, '缺少商品名称');
      }

      const productIdHint = String(first.product_id || first.id || '').trim();
      if (!productIdHint) {
        const hintedUpdate = groupRows.some((r) => String(r.product_id || r.id || '').trim());
        if (hintedUpdate) {
          throw new BusinessError(400, '更新商品必须填写 product_id 或 id 列');
        }
      }
      let productId = productIdHint;
      let existing = productId ? await repo.selectProductById(productId, { includeDeleted: true }) : null;
      if (existing?.deleted_at) {
        throw new BusinessError(400, '商品已删除，请先恢复后再导入更新');
      }

      const existingVariants = productId && existing
        ? await variantRepo.selectVariantsByProductId(productId)
        : [];

      const variants = [];
      const variantRowErrors = [];
      let defaultAssigned = false;
      for (let j = 0; j < groupRows.length; j += 1) {
        const row = groupRows[j];
        const built = buildVariantRowFromCsv(row, productId, existingVariants, generateId);
        if (built.error) {
          variantRowErrors.push({ row: rowNums[j], reason: built.error });
          continue;
        }
        let { variant } = built;
        if (variant.is_default) defaultAssigned = true;
        if (!defaultAssigned && j === groupRows.length - 1) {
          variant = { ...variant, is_default: true };
          defaultAssigned = true;
        }
        variants.push(variant);
        skuRows += 1;
      }
      if (variantRowErrors.length) {
        for (const item of variantRowErrors) errors.push(item);
        skipped += groupRows.length;
        throw new BusinessError(400, variantRowErrors[0].reason || 'SKU 行数据无效');
      }
      if (!variants.length) {
        throw new BusinessError(400, '至少需要一个有效 SKU（售价必填）');
      }
      if (!defaultAssigned) {
        variants[0] = { ...variants[0], is_default: true };
      }

      const tagSource = groupRows.map((r) => r.tags || r.tag_names).find((t) => String(t || '').trim()) || '';
      const { ids: tagIds, unknown: unknownTags } = resolveTagNamesToIds(tagSource, enabledTags);
      if (unknownTags.length) {
        throw new BusinessError(400, `未知标签：${unknownTags.join('、')}`);
      }

      const body = {
        ...payload,
        images: JSON.parse(imagesJson),
        variants,
        tag_ids: tagIds,
        price: variants.find((v) => v.is_default)?.price ?? variants[0].price,
        stock: variants.reduce((sum, v) => sum + (v.enabled ? Number(v.stock || 0) : 0), 0),
      };

      if (productId && existing) {
        await updateProduct(productId, body, adminUserId, req);
        updated += 1;
      } else if (productId && !existing) {
        await repo.insertProduct({
          id: productId,
          name: payload.name,
          cover_image: payload.cover_image,
          video_url: payload.video_url,
          imagesJson,
          price: body.price,
          original_price: payload.original_price,
          sales_count: payload.sales_count,
          category_id: payload.category_id,
          stock: body.stock,
          status: payload.status,
          lifecycle_status: payload.lifecycle_status,
          sort_order: payload.sort_order,
          description: payload.description,
          search_keywords: buildProductSearchKeywordsFromPayload(payload, variants, []),
          is_recommended: payload.is_recommended ? 1 : 0,
          is_new: payload.is_new ? 1 : 0,
          is_hot: payload.is_hot ? 1 : 0,
        });
        await variantRepo.upsertProductVariants(productId, normalizeVariantPayloadForDb(variants, generateId, body.price, body.stock));
        await requireProductApi('replaceTagAssignments')(productId, tagIds);
        await syncProductPriceStockFromDefaultVariant(productId);
        created += 1;
      } else {
        const r = await createProduct(body, adminUserId, req);
        productId = r.data?.id;
        created += 1;
      }
    } catch (err) {
      skipped += groupRows.length;
      const reason = err?.message || '导入失败';
      for (const rowNum of rowNums) {
        errors.push({ row: rowNum, reason });
      }
    }
  }

  return { created, updated, skipped, errors, sku_rows: skuRows };
}

async function importProductsCsv(text, adminUserId, req) {
  const { rows: rawRows } = parseCsv(text);
  const rows = normalizeCsvImportRows(rawRows);
  if (!rows.length) throw new BusinessError(400, 'CSV 无数据行');
  if (rows.length > MAX_PRODUCT_IMPORT_ROWS) {
    throw new BusinessError(400, `单次最多导入 ${MAX_PRODUCT_IMPORT_ROWS} 行`);
  }

  const skuMode = isSkuMatrixImport(rows);
  const result = skuMode
    ? await importProductsCsvSkuMatrix(rows, adminUserId, req)
    : await importProductsCsvLegacy(rows, adminUserId, req);

  const { created, updated, skipped, errors, sku_rows: skuRows } = result;
  const importResult = errors.length > 0 || skipped > 0 ? 'partial' : 'success';

  await writeAuditLog({
    req,
    operatorId: adminUserId,
    actionType: 'product.import',
    objectType: 'product',
    objectId: 'batch',
    summary: skuMode
      ? `SKU 矩阵导入：新建 ${created}，更新 ${updated}，SKU 行 ${skuRows || 0}，跳过 ${skipped}`
      : `导入商品：新建 ${created}，更新 ${updated}，跳过 ${skipped}`,
    after: { created, updated, skipped, sku_rows: skuRows || 0, error_count: errors.length, mode: skuMode ? 'sku_matrix' : 'legacy' },
    result: importResult,
  });
  if (created > 0 || updated > 0) bumpCatalogCache();
  const parts = [`新建 ${created} 条`, `更新 ${updated} 条`];
  if (skuMode && skuRows) parts.push(`同步 ${skuRows} 个 SKU`);
  if (skipped > 0) parts.push(`跳过 ${skipped} 条`);
  return {
    data: { created, updated, skipped, errors, sku_rows: skuRows || 0, mode: skuMode ? 'sku_matrix' : 'legacy' },
    message: `导入完成：${parts.join('，')}`,
  };
}

function flattenCategoryTree(nodes, out = []) {
  for (const node of Array.isArray(nodes) ? nodes : []) {
    out.push(node);
    if (Array.isArray(node.children) && node.children.length) flattenCategoryTree(node.children, out);
  }
  return out;
}

async function loadCategoryNameMap() {
  const result = await categoryService.listCategories();
  const categories = flattenCategoryTree(result.data || []);
  const map = new Map();
  for (const category of categories) {
    const key = normalizeYinbaoKey(category.name);
    if (key && !map.has(key)) map.set(key, category);
  }
  return { map, categories };
}

function categoryNamesFromGroups(groups) {
  const names = [];
  const seen = new Set();
  for (const group of groups) {
    const key = normalizeYinbaoKey(group.categoryName);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    names.push(group.categoryName);
  }
  return names;
}

async function buildExistingProductMap(groups, categoryMap) {
  const pairs = [];
  const names = [];
  const categoryIds = [];
  for (const group of groups) {
    const category = categoryMap.get(normalizeYinbaoKey(group.categoryName));
    if (!category?.id) continue;
    names.push(group.name);
    categoryIds.push(category.id);
    pairs.push({ name: group.name, categoryId: category.id });
  }
  if (!pairs.length) return new Map();
  const rows = await repo.selectProductsByNamesAndCategoryIds(names, categoryIds);
  const wanted = new Set(pairs.map((item) => makeNameCategoryKey(item.name, item.categoryId)));
  const map = new Map();
  for (const row of rows) {
    const key = makeNameCategoryKey(row.name, row.category_id);
    if (wanted.has(key) && !map.has(key)) map.set(key, row);
  }
  return map;
}

function buildYinbaoPreviewFromParsed(parsed, groups, categoryMap, existingProductMap) {
  const categoryNames = categoryNamesFromGroups(groups);
  const categoriesToCreate = categoryNames.filter((name) => !categoryMap.has(normalizeYinbaoKey(name)));
  const existingCategories = categoryNames.filter((name) => categoryMap.has(normalizeYinbaoKey(name)));
  let productsToCreate = 0;
  let productsToUpdate = 0;
  for (const group of groups) {
    const category = categoryMap.get(normalizeYinbaoKey(group.categoryName));
    const existing = category ? existingProductMap.get(makeNameCategoryKey(group.name, category.id)) : null;
    if (existing) productsToUpdate += 1;
    else productsToCreate += 1;
  }

  const categoriesByName = new Map();
  for (const group of groups) {
    const set = categoriesByName.get(group.name) || new Set();
    set.add(group.categoryName);
    categoriesByName.set(group.name, set);
  }
  const sameNameMultiCategory = [...categoriesByName.entries()]
    .filter(([, set]) => set.size > 1)
    .map(([name, set]) => ({ name, categories: [...set] }));
  const negativeStockRows = parsed.rows.filter((row) => Number(row.stock) < 0).length;

  return {
    mode: 'yinbao_excel',
    filename: parsed.filename || '',
    sheet_name: parsed.sheetName || '',
    total_rows: parsed.totalRows,
    valid_rows: parsed.rows.length,
    sku_rows: parsed.rows.length,
    product_groups: groups.length,
    products_to_create: productsToCreate,
    products_to_update: productsToUpdate,
    categories_existing: existingCategories,
    categories_to_create: categoriesToCreate,
    negative_stock_rows: negativeStockRows,
    same_name_multi_category: sameNameMultiCategory,
    ignored_columns: ['主编码', '扩展条码', '批发价', '毛利率', '创建日期'],
    errors: parsed.errors,
    warnings: [
      ...(negativeStockRows ? [`检测到 ${negativeStockRows} 行负库存，确认导入后会按银豹账面数保留。`] : []),
      ...(sameNameMultiCategory.length ? [`检测到 ${sameNameMultiCategory.length} 组同名不同分类商品，本次会按“商品名 + 分类”分开导入。`] : []),
      '条码字段本次会完全忽略，不会写入 SKU。',
    ],
  };
}

async function previewProductsImportFile(file, adminUserId, req) {
  if (!file || !file.buffer) throw new ValidationError('请上传导入文件');
  if (!isYinbaoExcelFile(file)) {
    const text = decodeCsvBuffer(file.buffer);
    const { rows: rawRows } = parseCsv(text);
    const rows = normalizeCsvImportRows(rawRows);
    return {
      data: {
        mode: 'csv',
        filename: file.originalname || '',
        total_rows: rows.length,
        valid_rows: rows.length,
        sku_rows: rows.filter(isSkuMatrixCsvRow).length || rows.length,
        product_groups: isSkuMatrixImport(rows) ? groupSkuImportRows(rows).size : rows.length,
        products_to_create: 0,
        products_to_update: 0,
        categories_existing: [],
        categories_to_create: [],
        negative_stock_rows: rows.filter((row) => Number(row.stock) < 0).length,
        same_name_multi_category: [],
        ignored_columns: [],
        errors: [],
        warnings: ['CSV 会沿用原有商品导入模板规则；银豹 Excel 请上传 .xlsx 文件。'],
      },
      message: '预览完成',
    };
  }

  const parsed = await parseYinbaoWorkbookBuffer(file.buffer, file.originalname || '');
  const fatal = parsed.errors.find((item) => item.row === 0);
  const groups = groupYinbaoRows(parsed.rows);
  const { map: categoryMap } = await loadCategoryNameMap();
  const existingProductMap = await buildExistingProductMap(groups, categoryMap);
  return {
    data: buildYinbaoPreviewFromParsed(parsed, groups, categoryMap, existingProductMap),
    message: fatal ? fatal.reason : '预览完成',
  };
}

async function ensureYinbaoCategories(groups, adminUserId, req) {
  const { map, categories } = await loadCategoryNameMap();
  let sortOrder = categories.length;
  const created = [];
  for (const name of categoryNamesFromGroups(groups)) {
    const key = normalizeYinbaoKey(name);
    if (map.has(key)) continue;
    const result = await categoryService.createCategory({
      name,
      sort_order: sortOrder,
      is_visible: true,
    }, adminUserId, req);
    sortOrder += 1;
    if (result?.data?.id) {
      map.set(key, result.data);
      created.push(result.data);
    } else {
      const refreshed = await loadCategoryNameMap();
      if (refreshed.map.has(key)) map.set(key, refreshed.map.get(key));
      else throw new BusinessError(400, `分类「${name}」创建失败`);
    }
  }
  return { map, created };
}

function makeVariantTitleKey(title) {
  return normalizeYinbaoKey(title || YINBAO_DEFAULT_VARIANT_TITLE);
}

function buildYinbaoVariantRows(groupRows, existingVariants) {
  const existingByTitle = new Map();
  for (const variant of existingVariants || []) {
    const key = makeVariantTitleKey(variant.title);
    if (key && !existingByTitle.has(key)) existingByTitle.set(key, variant);
  }

  const usedExistingIds = new Set();
  const usedTitleKeys = new Set();
  const importRows = groupRows.map((row, index) => {
    let title = row.variantTitle || YINBAO_DEFAULT_VARIANT_TITLE;
    let titleKey = makeVariantTitleKey(title);
    if (usedTitleKeys.has(titleKey)) {
      title = `${title} #${row.rowNumber}`;
      titleKey = makeVariantTitleKey(title);
    }
    usedTitleKeys.add(titleKey);
    const existing = existingByTitle.get(titleKey);
    if (existing?.id) usedExistingIds.add(existing.id);
    return {
      id: existing?.id || generateId(),
      sku_code: existing?.sku_code ?? null,
      title,
      price: row.price,
      original_price: null,
      stock: row.stock,
      cost_price: row.costPrice,
      stock_warning_threshold: existing?.stock_warning_threshold ?? 5,
      stock_lower_limit: existing?.stock_lower_limit ?? null,
      stock_upper_limit: existing?.stock_upper_limit ?? null,
      unit_name: row.unitName || existing?.unit_name || '件',
      barcode: null,
      image_url: existing?.image_url || null,
      weight: existing?.weight ?? null,
      enabled: true,
      sort_order: index,
      is_default: index === 0,
      _yinbaoRowNumber: row.rowNumber,
      _beforeStock: existing ? Number(existing.stock || 0) : 0,
      _isExistingVariant: !!existing,
    };
  });

  const preservedRows = (existingVariants || [])
    .filter((variant) => variant.id && !usedExistingIds.has(variant.id))
    .map((variant, index) => ({
      id: variant.id,
      sku_code: variant.sku_code ?? null,
      title: variant.title || YINBAO_DEFAULT_VARIANT_TITLE,
      price: Number(variant.price || 0),
      original_price: variant.original_price == null ? null : Number(variant.original_price),
      stock: Number(variant.stock || 0),
      cost_price: variant.cost_price == null ? null : Number(variant.cost_price),
      stock_warning_threshold: variant.stock_warning_threshold ?? 5,
      stock_lower_limit: variant.stock_lower_limit ?? null,
      stock_upper_limit: variant.stock_upper_limit ?? null,
      unit_name: variant.unit_name || '件',
      barcode: variant.barcode ?? null,
      image_url: variant.image_url || null,
      weight: variant.weight ?? null,
      enabled: variant.enabled !== 0,
      sort_order: importRows.length + index,
      is_default: false,
    }));

  return {
    imported: importRows,
    all: [...importRows, ...preservedRows],
  };
}

async function writeYinbaoStockRecords(productId, productName, importedVariants, adminUserId) {
  const rows = importedVariants.filter((variant) => {
    const afterStock = Number(variant.stock || 0);
    const beforeStock = Number(variant._beforeStock || 0);
    return !variant._isExistingVariant || afterStock !== beforeStock;
  });
  if (!rows.length) return;
  const conn = await inventoryRepo.getConnection();
  try {
    await conn.beginTransaction();
    for (const variant of rows) {
      const beforeStock = Number(variant._beforeStock || 0);
      const afterStock = Number(variant.stock || 0);
      await inventoryRepo.insertStockRecord(conn, {
        id: generateId(),
        productId,
        variantId: variant.id,
        changeType: variant._isExistingVariant ? 'adjust' : (afterStock >= 0 ? 'in' : 'adjust'),
        quantityDelta: afterStock - beforeStock,
        beforeStock,
        afterStock,
        reason: variant._isExistingVariant ? '银豹导入库存同步' : '银豹导入初始库存',
        refType: 'admin',
        refId: '',
        operatorId: adminUserId,
        productNameSnapshot: productName,
        variantNameSnapshot: variant.title || '',
        skuCodeSnapshot: variant.sku_code || '',
        orderNoSnapshot: '',
        sourceNo: 'yinbao-import',
        remark: `银豹 Excel 第 ${variant._yinbaoRowNumber || '-'} 行`,
        costPrice: variant.cost_price,
        createdByType: 'admin',
      });
    }
    await conn.commit();
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

async function upsertYinbaoGroup(group, categoryId, existingProduct, adminUserId, req) {
  const existingVariants = existingProduct?.id
    ? await variantRepo.selectVariantsByProductId(existingProduct.id)
    : [];
  const { imported, all } = buildYinbaoVariantRows(group.rows, existingVariants);
  const defaultVariant = imported[0] || all[0];
  const lc = csvStatusToLifecycle(group.rows[0]?.status || 'active');
  const productId = existingProduct?.id || generateId();
  const payloadForKeywords = {
    name: group.name,
    description: '',
    category_id: categoryId,
  };

  if (existingProduct) {
    await repo.updateProductDynamic([
      'name = ?',
      'category_id = ?',
      'status = ?',
      'lifecycle_status = ?',
      'search_keywords = ?',
    ], [
      group.name,
      categoryId,
      lc.status,
      lc.lifecycle_status,
      buildProductSearchKeywordsFromPayload(payloadForKeywords, all, []),
      productId,
    ]);
  } else {
    await repo.insertProduct({
      id: productId,
      name: group.name,
      cover_image: '',
      video_url: '',
      imagesJson: '[]',
      imageAltJson: '[]',
      price: defaultVariant?.price ?? 0,
      original_price: null,
      sales_count: 0,
      category_id: categoryId,
      stock: all.reduce((sum, variant) => sum + (variant.enabled ? Number(variant.stock || 0) : 0), 0),
      stock_warning_threshold: defaultVariant?.stock_warning_threshold ?? 5,
      stock_lower_limit: defaultVariant?.stock_lower_limit ?? null,
      stock_upper_limit: defaultVariant?.stock_upper_limit ?? null,
      status: lc.status,
      lifecycle_status: lc.lifecycle_status,
      sort_order: 0,
      description: '',
      search_keywords: buildProductSearchKeywordsFromPayload(payloadForKeywords, all, []),
      is_recommended: 0,
      is_new: 0,
      is_hot: 0,
    });
  }

  await variantRepo.upsertProductSkuMatrix(productId, null, all);
  await syncProductPriceStockFromDefaultVariant(productId);
  await writeYinbaoStockRecords(productId, group.name, imported, adminUserId);
  return { productId, created: existingProduct ? 0 : 1, updated: existingProduct ? 1 : 0, skuRows: imported.length };
}

async function importYinbaoProductsFile(file, adminUserId, req) {
  const parsed = await parseYinbaoWorkbookBuffer(file.buffer, file.originalname || '');
  const fatal = parsed.errors.find((item) => item.row === 0);
  if (fatal) throw new BusinessError(400, fatal.reason);
  if (!parsed.rows.length) throw new BusinessError(400, 'Excel 没有可导入的数据行');
  const groups = groupYinbaoRows(parsed.rows);
  const { map: categoryMap, created: createdCategories } = await ensureYinbaoCategories(groups, adminUserId, req);
  const existingProductMap = await buildExistingProductMap(groups, categoryMap);

  let created = 0;
  let updated = 0;
  let skuRows = 0;
  let skipped = parsed.errors.filter((item) => item.row > 0).length;
  const errors = [...parsed.errors];

  for (const group of groups) {
    try {
      const category = categoryMap.get(normalizeYinbaoKey(group.categoryName));
      if (!category?.id) throw new BusinessError(400, `分类「${group.categoryName}」不存在`);
      const existingProduct = existingProductMap.get(makeNameCategoryKey(group.name, category.id));
      const result = await upsertYinbaoGroup(group, category.id, existingProduct, adminUserId, req);
      created += result.created;
      updated += result.updated;
      skuRows += result.skuRows;
    } catch (error) {
      skipped += group.rows.length;
      for (const row of group.rows) {
        errors.push({ row: row.rowNumber, reason: error?.message || '导入失败' });
      }
    }
  }

  await writeAuditLog({
    req,
    operatorId: adminUserId,
    actionType: 'product.import.yinbao',
    objectType: 'product',
    objectId: 'batch',
    summary: `银豹商品导入：新建 ${created}，更新 ${updated}，SKU ${skuRows}，新建分类 ${createdCategories.length}，跳过 ${skipped}`,
    after: {
      created,
      updated,
      skipped,
      sku_rows: skuRows,
      categories_created: createdCategories.map((item) => item.name),
      error_count: errors.length,
      mode: 'yinbao_excel',
      ignored_barcode: true,
    },
    result: errors.length || skipped ? 'partial' : 'success',
  });

  if (created > 0 || updated > 0 || createdCategories.length > 0) bumpCatalogCache();
  return {
    data: {
      created,
      updated,
      skipped,
      errors,
      sku_rows: skuRows,
      mode: 'yinbao_excel',
      categories_created: createdCategories.map((item) => item.name),
    },
    message: `银豹导入完成：新建 ${created} 个商品，更新 ${updated} 个商品，同步 ${skuRows} 个 SKU，新建 ${createdCategories.length} 个分类${skipped ? `，跳过 ${skipped} 行` : ''}`,
  };
}

async function importProductsFile(file, adminUserId, req) {
  if (!file || !file.buffer) throw new ValidationError('请上传导入文件');
  if (isYinbaoExcelFile(file)) return importYinbaoProductsFile(file, adminUserId, req);
  const text = decodeCsvBuffer(file.buffer);
  return importProductsCsv(text, adminUserId, req);
}

async function batchUpdateStatus(ids, status, adminUserId, req) {
  if (!Array.isArray(ids) || ids.length === 0) return { error: { code: 400, message: '请选择商品' } };
  const lcMap = { active: 1, inactive: 2, draft: 0 };
  const lc = lcMap[status];
  if (lc === undefined) return { error: { code: 400, message: '状态无效' } };
  const st = statusVarcharFromLifecycle(lc);
  const uniqueIds = [...new Set(ids.map((id) => String(id || '').trim()).filter(Boolean))];
  const activeIds = [];
  const skippedIds = [];
  for (const id of uniqueIds) {
    const row = await repo.selectProductById(id);
    if (row) activeIds.push(id);
    else skippedIds.push(id);
  }
  const updated = activeIds.length
    ? await repo.batchUpdateStatus(activeIds, st, lc)
    : 0;
  const verb = { active: '上架', inactive: '下架', draft: '设为草稿' }[status];
  await writeAuditLog({
    req, operatorId: adminUserId,
    actionType: 'product.batch_status',
    objectType: 'product',
    objectId: uniqueIds.length <= 3 ? uniqueIds.join(',') : `${uniqueIds.slice(0, 3).join(',')}…(+${uniqueIds.length})`,
    summary: `批量${verb}：成功 ${updated}，跳过 ${skippedIds.length}`,
    after: {
      status: st,
      lifecycle_status: lc,
      requested: uniqueIds.length,
      updated,
      skipped: skippedIds.length,
      skipped_ids: skippedIds,
    },
    result: skippedIds.length && !updated ? 'failure' : (skippedIds.length ? 'partial' : 'success'),
  });
  if (updated > 0) bumpCatalogCache();
  const parts = [`已${verb} ${updated} 个商品`];
  if (skippedIds.length) parts.push(`跳过 ${skippedIds.length} 个（不存在或已删除）`);
  return {
    data: { updated, skipped: skippedIds.length, skipped_ids: skippedIds, requested: uniqueIds.length },
    message: parts.join('，'),
  };
}

module.exports = {
  listProducts,
  getProductById,
  createProduct,
  updateProduct,
  updateProductTags,
  patchProductLifecycle,
  deleteProduct,
  exportProductsCsv,
  importProductsCsv,
  previewProductsImportFile,
  importProductsFile,
  batchUpdateStatus,
  batchDeleteProducts,
};

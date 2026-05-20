const { generateId, formatProduct } = require('../../../utils/helpers');
const { BusinessError } = require('../../../errors/BusinessError');
const { logAdminAction } = require('../../../utils/adminAudit');
const { parseCsv, parseBool } = require('../../../utils/csv');
const { rowsToCsvLocalized, normalizeCsvImportRows } = require('../../../utils/adminCsvLabels');
const { buildSearchKeywords, normalizeSearchKeyword } = require('../../../utils/searchKeywords');
const repo = require('../repository/adminProduct.repository');
const variantRepo = require('../repository/adminProductVariant.repository');
const inventoryRepo = require('../repository/adminInventory.repository');
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

function requireProductApi(name) {
  const fn = getProductApi()[name];
  if (typeof fn === 'undefined') {
    throw new Error(`Product ?? API ??????${name}`);
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
}

function buildListWhere(query) {
  let where = 'WHERE deleted_at IS NULL';
  const params = [];
  const { keyword, category_id, status } = query;
  if (keyword) {
    const normalized = normalizeSearchKeyword(keyword);
    const expanded = buildSearchKeywords(normalized);
    where += ' AND (name LIKE ? OR description LIKE ? OR search_keywords LIKE ? OR search_keywords LIKE ?)';
    params.push(`%${normalized}%`, `%${normalized}%`, `%${normalized}%`, `%${expanded}%`);
  }
  if (category_id) {
    where += ' AND category_id = ?';
    params.push(category_id);
  }
  if (status) {
    const lc = lifecycleFromFilter(status);
    if (lc !== null) {
      where += ' AND lifecycle_status = ?';
      params.push(lc);
    } else {
      where += ' AND status = ?';
      params.push(status);
    }
  }
  return { where, params };
}

function formatVariantRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    sku_code: row.sku_code,
    title: row.title || '',
    price: parseFloat(row.price),
    original_price: row.original_price == null ? null : parseFloat(row.original_price),
    cost_price: row.cost_price == null ? null : parseFloat(row.cost_price),
    stock: row.stock,
    stock_warning_threshold: row.stock_warning_threshold ?? 5,
    barcode: row.barcode || '',
    image_url: row.image_url || '',
    weight: row.weight == null ? null : parseFloat(row.weight),
    enabled: row.enabled !== undefined ? !!row.enabled : true,
    sort_order: row.sort_order,
    is_default: !!row.is_default,
    spec_value_ids: Array.isArray(row.spec_value_ids) ? row.spec_value_ids : [],
    spec_values: Array.isArray(row.spec_values) ? row.spec_values : [],
    spec_text: row.spec_text || row.title || '',
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

function normalizeVariantPayloadForDb(variants, genId, mainPrice, mainStock) {
  const mainP = Number(mainPrice);
  const price = Number.isFinite(mainP) ? mainP : 0;
  const mainS = Number(mainStock);
  const stock = Number.isFinite(mainS) ? mainS : 0;
  if (!variants || variants.length === 0) {
    return [{
      id: genId(),
      sku_code: null,
      title: '',
      price,
      stock,
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
      title: (v.title != null ? String(v.title) : '') || '',
      price: Number.isFinite(vp) ? vp : price,
      original_price: v.original_price === '' || v.original_price == null ? null : Number(v.original_price),
      cost_price: v.cost_price === '' || v.cost_price == null ? null : Number(v.cost_price),
      stock: Number.isFinite(vs) ? vs : stock,
      stock_warning_threshold: Number.isFinite(Number(v.stock_warning_threshold)) ? Number(v.stock_warning_threshold) : 5,
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

async function attachTagsToProducts(rows) {
  if (!rows.length) return [];
  try {
    const map = await requireProductApi('selectTagsByProductIds')(rows.map((r) => r.id));
    return rows.map((r) => ({ ...formatProduct(r), tags: map.get(r.id) || [] }));
  } catch (e) {
    console.error('[adminProduct] attachTagsToProducts failed (listing without tags):', e.code || e.message);
    return rows.map((r) => ({ ...formatProduct(r), tags: [] }));
  }
}

async function syncProductPriceStockFromDefaultVariant(productId) {
  const rows = await variantRepo.selectVariantsByProductId(productId);
  const enabledRows = rows.filter((r) => r.enabled !== 0);
  const def = enabledRows.find((r) => r.is_default) || enabledRows[0] || rows[0];
  if (!def) return;
  const totalStock = enabledRows.reduce((sum, r) => sum + Number(r.stock || 0), 0);
  await repo.updateProductDynamic(
    ['price = ?', 'stock = ?'],
    [def.price, totalStock],
    productId,
  );
}

async function listProducts(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(query.pageSize, 10) || 20));
  const { where, params } = buildListWhere(query);
  const total = await repo.countProducts(where, params);
  const offset = (page - 1) * pageSize;
  const rows = await repo.selectProductsPage(where, params, pageSize, offset);
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
    name, cover_image, video_url, images, price, original_price, sales_count,
    category_id, stock, sort_order,
    description, is_recommended, is_new, isNewArrival, is_hot,
    variants,
    tag_ids: tagIdsBody,
  } = body;

  const lcResolved = lifecycleFromBody(body) ?? LIFECYCLE.ON_SHELF;
  const statusStr = statusVarcharFromLifecycle(lcResolved);

  const id = generateId();
  const variantRows = normalizeVariantPayloadForDb(variants, generateId, price, stock);
  try {
    await repo.insertProduct({
      id,
      name,
      cover_image: cover_image || '',
      video_url: video_url || '',
      imagesJson: JSON.stringify(images || []),
      price,
      original_price: original_price === '' || original_price == null
        ? null
        : Number(original_price),
      sales_count: Number.isFinite(Number(sales_count)) ? Number(sales_count) : 0,
      category_id: category_id || '',
      stock: stock || 0,
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
    await logAdminAction(adminUserId, '创建商品', name);
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
      'sort_order', 'description', 'sales_count'];
    for (const f of allowedFields) {
      if (body[f] !== undefined) {
        fields.push(`${f} = ?`);
        values.push(body[f]);
      }
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
    if (body.images !== undefined) {
      fields.push('images = ?');
      values.push(JSON.stringify(body.images));
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
  try {
    await repo.deleteProductById(id, adminUserId);
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

const EXPORT_HEADERS = [
  'id', 'name', 'price', 'original_price', 'sales_count', 'stock', 'category_id',
  'cover_image', 'video_url', 'status', 'lifecycle_status', 'sort_order',
  'description', 'points', 'is_recommended', 'is_new', 'is_hot', 'images',
];

function csvStatusToLifecycle(statusRaw) {
  const t = String(statusRaw || 'active').trim().toLowerCase();
  if (t === 'draft') return { lifecycle_status: 0, status: 'draft' };
  if (t === 'inactive') return { lifecycle_status: 2, status: 'inactive' };
  return { lifecycle_status: 1, status: 'active' };
}

async function exportProductsCsv(query) {
  const { where, params } = buildListWhere(query);
  const rows = await repo.selectProductsForExport(where, params);
  const data = rows.map((r) => {
    let imagesStr = '';
    if (r.images == null) imagesStr = '';
    else if (typeof r.images === 'string') imagesStr = r.images;
    else imagesStr = JSON.stringify(r.images);
    const lc = normalizeLifecycleFromRow(r);
    return {
      id: r.id,
      name: r.name,
      price: r.price,
      original_price: r.original_price ?? '',
      sales_count: r.sales_count ?? 0,
      stock: r.stock,
      category_id: r.category_id || '',
      cover_image: r.cover_image || '',
      video_url: r.video_url || '',
      status: statusVarcharFromLifecycle(lc),
      lifecycle_status: lc,
      sort_order: r.sort_order ?? 0,
      description: (r.description || '').replace(/\r\n/g, '\n'),
      points: r.points ?? 0,
      is_recommended: r.is_recommended ? 1 : 0,
      is_new: r.is_new ? 1 : 0,
      is_hot: r.is_hot ? 1 : 0,
      images: imagesStr,
    };
  });
  const csv = rowsToCsvLocalized(EXPORT_HEADERS, data);
  return { csv, filename: `products_${Date.now()}.csv` };
}

async function importProductsCsv(text, adminUserId) {
  const { rows: rawRows } = parseCsv(text);
  const rows = normalizeCsvImportRows(rawRows);
  if (!rows.length) throw new BusinessError(400, 'CSV 无数据行');

  let created = 0;
  let updated = 0;
  for (const row of rows) {
    const name = (row.name || '').trim();
    const price = parseFloat(row.price);
    if (!name || Number.isNaN(price)) continue;

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
    if (id) {
      const existing = await repo.selectProductById(id);
      if (existing) {
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
  }

  await logAdminAction(adminUserId, '导入商品', `新建 ${created}，更新 ${updated}`);
  if (created > 0 || updated > 0) bumpCatalogCache();
  return {
    data: { created, updated },
    message: `导入完成：新建 ${created} 条，更新 ${updated} 条`,
  };
}

async function batchUpdateStatus(ids, status, adminUserId, req) {
  if (!Array.isArray(ids) || ids.length === 0) return { error: { code: 400, message: '请选择商品' } };
  const lcMap = { active: 1, inactive: 2, draft: 0 };
  const lc = lcMap[status];
  if (lc === undefined) return { error: { code: 400, message: '状态无效' } };
  const st = statusVarcharFromLifecycle(lc);
  await repo.batchUpdateStatus(ids, st, lc);
  const verb = { active: '上架', inactive: '下架', draft: '设为草稿' }[status];
  await writeAuditLog({
    req, operatorId: adminUserId,
    actionType: 'product.batch_status',
    objectType: 'product',
    objectId: ids.join(','),
    summary: `批量${verb} ${ids.length} 个商品`,
    after: { status: st, lifecycle_status: lc, count: ids.length },
    result: 'success',
  });
  bumpCatalogCache();
  return { message: `已${verb} ${ids.length} 个商品` };
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
  batchUpdateStatus,
};








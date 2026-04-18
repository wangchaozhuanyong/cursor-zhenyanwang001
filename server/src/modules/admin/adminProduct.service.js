const { generateId, formatProduct } = require('../../utils/helpers');
const { BusinessError } = require('../../errors/BusinessError');
const { logAdminAction } = require('../../utils/adminAudit');
const { rowsToCsv, parseCsv, parseBool } = require('../../utils/csv');
const repo = require('./adminProduct.repository');
const { writeAuditLog } = require('../../utils/auditLog');

function buildListWhere(query) {
  let where = 'WHERE deleted_at IS NULL';
  const params = [];
  const { keyword, category_id, status } = query;
  if (keyword) {
    where += ' AND name LIKE ?';
    params.push(`%${keyword}%`);
  }
  if (category_id) {
    where += ' AND category_id = ?';
    params.push(category_id);
  }
  if (status) {
    where += ' AND status = ?';
    params.push(status);
  }
  return { where, params };
}

async function listProducts(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(query.pageSize, 10) || 20));
  const { where, params } = buildListWhere(query);
  const total = await repo.countProducts(where, params);
  const offset = (page - 1) * pageSize;
  const rows = await repo.selectProductsPage(where, params, pageSize, offset);
  return {
    kind: 'paginate',
    list: rows.map(formatProduct),
    total,
    page,
    pageSize,
  };
}

async function getProductById(id) {
  const row = await repo.selectProductById(id);
  if (!row) throw new BusinessError(404, '商品不存在');
  return { data: formatProduct(row) };
}

async function createProduct(body, adminUserId, req) {
  const {
    name, cover_image, images, price, points, category_id, stock, status, sort_order,
    description, is_recommended, is_new, is_hot,
  } = body;
  if (!name || !price) throw new BusinessError(400, '名称和价格必填');

  const id = generateId();
  try {
    await repo.insertProduct({
      id,
      name,
      cover_image: cover_image || '',
      imagesJson: JSON.stringify(images || []),
      price,
      points: points || 0,
      category_id: category_id || '',
      stock: stock || 0,
      status: status || 'active',
      sort_order: sort_order || 0,
      description: description || '',
      is_recommended: is_recommended ? 1 : 0,
      is_new: is_new ? 1 : 0,
      is_hot: is_hot ? 1 : 0,
    });
    const row = await repo.selectProductById(id);
    await logAdminAction(adminUserId, '创建商品', name);
    await writeAuditLog({
      req,
      operatorId: adminUserId,
      actionType: 'product.create',
      objectType: 'product',
      objectId: id,
      summary: `创建商品 ${name}`,
      after: { name, price, stock: stock || 0, status: status || 'active' },
      result: 'success',
    });
    return { data: formatProduct(row), message: '创建成功' };
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
  const beforeSnap = {
    name: beforeRow.name,
    price: parseFloat(beforeRow.price),
    stock: beforeRow.stock,
    status: beforeRow.status,
  };

  try {
    const fields = [];
    const values = [];
    const allowedFields = ['name', 'cover_image', 'price', 'points', 'category_id', 'stock',
      'status', 'sort_order', 'description'];
    for (const f of allowedFields) {
      if (body[f] !== undefined) {
        fields.push(`${f} = ?`);
        values.push(body[f]);
      }
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
    if (fields.length === 0) throw new BusinessError(400, '没有需要更新的字段');

    await repo.updateProductDynamic(fields, values, id);
    const row = await repo.selectProductById(id);
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
      },
      result: 'success',
    });
    return { data: formatProduct(row), message: '更新成功' };
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
  'id', 'name', 'price', 'stock', 'category_id', 'cover_image', 'status', 'sort_order',
  'description', 'points', 'is_recommended', 'is_new', 'is_hot', 'images',
];

async function exportProductsCsv(query) {
  const { where, params } = buildListWhere(query);
  const rows = await repo.selectProductsForExport(where, params);
  const data = rows.map((r) => {
    let imagesStr = '';
    if (r.images == null) imagesStr = '';
    else if (typeof r.images === 'string') imagesStr = r.images;
    else imagesStr = JSON.stringify(r.images);
    return {
      id: r.id,
      name: r.name,
      price: r.price,
      stock: r.stock,
      category_id: r.category_id || '',
      cover_image: r.cover_image || '',
      status: r.status || 'active',
      sort_order: r.sort_order ?? 0,
      description: (r.description || '').replace(/\r\n/g, '\n'),
      points: r.points ?? 0,
      is_recommended: r.is_recommended ? 1 : 0,
      is_new: r.is_new ? 1 : 0,
      is_hot: r.is_hot ? 1 : 0,
      images: imagesStr,
    };
  });
  const csv = rowsToCsv(EXPORT_HEADERS, data);
  return { csv, filename: `products_${Date.now()}.csv` };
}

async function importProductsCsv(text, adminUserId) {
  const { rows } = parseCsv(text);
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

    const payload = {
      name,
      cover_image: (row.cover_image || '').trim(),
      images: JSON.parse(imagesJson),
      price,
      points: Number.isFinite(points) ? points : 0,
      category_id: (row.category_id || '').trim(),
      stock: Number.isFinite(stock) ? stock : 0,
      status: (row.status || 'active').trim() || 'active',
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
          imagesJson,
          price: payload.price,
          points: payload.points,
          category_id: payload.category_id,
          stock: payload.stock,
          status: payload.status,
          sort_order: payload.sort_order,
          description: payload.description,
          is_recommended: payload.is_recommended ? 1 : 0,
          is_new: payload.is_new ? 1 : 0,
          is_hot: payload.is_hot ? 1 : 0,
        });
        created += 1;
      }
    } else {
      const newId = generateId();
      await repo.insertProduct({
        id: newId,
        name: payload.name,
        cover_image: payload.cover_image,
        imagesJson,
        price: payload.price,
        points: payload.points,
        category_id: payload.category_id,
        stock: payload.stock,
        status: payload.status,
        sort_order: payload.sort_order,
        description: payload.description,
        is_recommended: payload.is_recommended ? 1 : 0,
        is_new: payload.is_new ? 1 : 0,
        is_hot: payload.is_hot ? 1 : 0,
      });
      created += 1;
    }
  }

  await logAdminAction(adminUserId, '导入商品', `新建 ${created}，更新 ${updated}`);
  return {
    data: { created, updated },
    message: `导入完成：新建 ${created} 条，更新 ${updated} 条`,
  };
}

async function batchUpdateStatus(ids, status, adminUserId, req) {
  if (!Array.isArray(ids) || ids.length === 0) return { error: { code: 400, message: '请选择商品' } };
  if (!['active', 'inactive'].includes(status)) return { error: { code: 400, message: '状态无效' } };
  await repo.batchUpdateStatus(ids, status);
  await writeAuditLog({
    req, operatorId: adminUserId,
    actionType: 'product.batch_status',
    objectType: 'product',
    objectId: ids.join(','),
    summary: `批量${status === 'active' ? '上架' : '下架'} ${ids.length} 个商品`,
    after: { status, count: ids.length },
    result: 'success',
  });
  return { message: `已${status === 'active' ? '上架' : '下架'} ${ids.length} 个商品` };
}

module.exports = {
  listProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  exportProductsCsv,
  importProductsCsv,
  batchUpdateStatus,
};

const repo = require('../repository/adminRecycleBin.repository');
const productModule = require('../../product');
const { writeAuditLog } = require('../../../utils/auditLog');

const NOT_IN_RECYCLE_BIN = '记录不存在或未在回收站';

function getProductApi() {
  return /** @type {any} */ (productModule).api || {};
}

function requireProductApi(name) {
  const fn = getProductApi()[name];
  if (typeof fn !== 'function') {
    throw new Error(`Product 模块 API 未暴露方法：${name}`);
  }
  return fn;
}

async function listRecycleBin(query = {}) {
  if (query.page || query.pageSize || query.keyword || query.dateFrom || query.dateTo) {
    return repo.listDeletedPage(query);
  }
  const type = query.type;
  if (type && repo.TABLE_CONFIGS[type]) {
    return repo.listDeletedItems(type, query);
  }
  return repo.listAllDeleted(query);
}

async function validateRestoreDependencies(type, id) {
  const item = await repo.getDeletedItem(type, id);
  if (!item) return NOT_IN_RECYCLE_BIN;
  if (type === 'products' && item.category_id) {
    const category = await repo.getActiveCategory(item.category_id);
    if (!category) return '商品分类不存在或仍在回收站，不能恢复商品';
  }
  if (type === 'categories' && item.parent_id) {
    const parent = await repo.getActiveCategory(item.parent_id);
    if (!parent) return '父分类不存在或仍在回收站，不能恢复分类';
  }
  if (type === 'coupons') {
    const categoryIds = await repo.getCouponCategoryIds(id);
    for (const categoryId of categoryIds) {
      const category = await repo.getActiveCategory(categoryId);
      if (!category) return '优惠券关联分类不存在或仍在回收站，不能恢复优惠券';
    }
  }
  if (type === 'product_reviews') {
    const product = await repo.getActiveProduct(item.product_id);
    if (!product) return '评论关联商品不存在或仍在回收站，不能恢复评论';
    const user = await repo.getAnyUser(item.user_id);
    if (!user) return '评论关联用户不存在，不能恢复评论';
  }
  if (['product_variants', 'product_spec_groups', 'product_spec_values'].includes(type)) {
    const product = await repo.getActiveProduct(item.product_id);
    if (!product) return '关联商品不存在或仍在回收站，不能恢复';
  }
  if (type === 'inventory_pack_rules') {
    const parentProduct = await repo.getActiveProduct(item.parent_product_id);
    const childProduct = await repo.getActiveProduct(item.child_product_id);
    if (!parentProduct || !childProduct) return '组装拆包规则关联商品不存在或仍在回收站，不能恢复';
  }
  return '';
}

async function auditRecycleBinFailure(req, adminUserId, actionType, type, id, message) {
  await writeAuditLog({
    req,
    operatorId: adminUserId,
    actionType,
    objectType: type,
    objectId: id,
    summary: message,
    result: 'failure',
    errorMessage: message,
  });
}

async function restoreItem(type, id, adminUserId, req) {
  if (!repo.TABLE_CONFIGS[type]) {
    const message = '不支持的类型';
    await auditRecycleBinFailure(req, adminUserId, 'recycle_bin.restore', type, id, message);
    return { error: { code: 400, message } };
  }
  const dependencyError = await validateRestoreDependencies(type, id);
  if (dependencyError) {
    await auditRecycleBinFailure(req, adminUserId, 'recycle_bin.restore', type, id, dependencyError);
    return { error: { code: 400, message: dependencyError } };
  }
  try {
    const ok = await repo.restoreItem(type, id);
    if (!ok) {
      await auditRecycleBinFailure(req, adminUserId, 'recycle_bin.restore', type, id, NOT_IN_RECYCLE_BIN);
      return { error: { code: 400, message: NOT_IN_RECYCLE_BIN } };
    }
    if (type === 'banners') requireProductApi('clearCatalogCache')();
    await writeAuditLog({
      req,
      operatorId: adminUserId,
      actionType: 'recycle_bin.restore',
      objectType: type,
      objectId: id,
      summary: `从回收站恢复 ${type} ${id}`,
      result: 'success',
    });
    return { message: '恢复成功' };
  } catch (err) {
    await auditRecycleBinFailure(req, adminUserId, 'recycle_bin.restore', type, id, err?.message || String(err));
    throw err;
  }
}

async function permanentDelete(type, id, adminUserId, req) {
  const config = repo.TABLE_CONFIGS[type];
  if (!config) {
    const message = '不支持的类型';
    await auditRecycleBinFailure(req, adminUserId, 'recycle_bin.permanent_delete', type, id, message);
    return { error: { code: 400, message } };
  }
  if (!config.permanentDelete) {
    const message = '该类型暂不支持彻底删除，请先恢复或保持在回收站';
    await auditRecycleBinFailure(req, adminUserId, 'recycle_bin.permanent_delete', type, id, message);
    return { error: { code: 400, message } };
  }
  try {
    const ok = await repo.permanentDeleteItem(type, id);
    if (!ok) {
      await auditRecycleBinFailure(req, adminUserId, 'recycle_bin.permanent_delete', type, id, NOT_IN_RECYCLE_BIN);
      return { error: { code: 400, message: NOT_IN_RECYCLE_BIN } };
    }
    if (type === 'banners') requireProductApi('clearCatalogCache')();
    await writeAuditLog({
      req,
      operatorId: adminUserId,
      actionType: 'recycle_bin.permanent_delete',
      objectType: type,
      objectId: id,
      summary: `彻底删除 ${type} ${id}`,
      result: 'success',
    });
    return { message: '删除成功' };
  } catch (err) {
    await auditRecycleBinFailure(req, adminUserId, 'recycle_bin.permanent_delete', type, id, err?.message || String(err));
    throw err;
  }
}

module.exports = { listRecycleBin, restoreItem, permanentDelete };

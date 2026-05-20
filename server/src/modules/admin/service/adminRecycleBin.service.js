const repo = require('../repository/adminRecycleBin.repository');
const productModule = require('../../product');
const { writeAuditLog } = require('../../../utils/auditLog');
function getProductApi() {
  return /** @type {any} */ (productModule).api || {};
}

function requireProductApi(name) {
  const fn = getProductApi()[name];
  if (typeof fn !== 'function') {
    throw new Error(`Product 模块 API 未暴露方法: ${name}`);
  }
  return fn;
}

async function listRecycleBin(query) {
  const type = query.type;
  if (type && repo.TABLE_CONFIGS[type]) {
    return repo.listDeletedItems(type);
  }
  return repo.listAllDeleted();
}

async function restoreItem(type, id, adminUserId, req) {
  if (!repo.TABLE_CONFIGS[type]) return { error: { code: 400, message: '不支持的类型' } };
  const ok = await repo.restoreItem(type, id);
  if (!ok) return { error: { code: 400, message: '恢复失败' } };
  if (type === 'banners') requireProductApi('clearCatalogCache')();
  await writeAuditLog({
    req, operatorId: adminUserId,
    actionType: 'recycle_bin.restore',
    objectType: type, objectId: id,
    summary: `从回收站恢复 ${type} ${id}`,
    result: 'success',
  });
  return { message: '恢复成功' };
}

async function permanentDelete(type, id, adminUserId, req) {
  if (!repo.TABLE_CONFIGS[type]) return { error: { code: 400, message: '不支持的类型' } };
  const ok = await repo.permanentDeleteItem(type, id);
  if (!ok) return { error: { code: 400, message: '删除失败' } };
  if (type === 'banners') requireProductApi('clearCatalogCache')();
  await writeAuditLog({
    req, operatorId: adminUserId,
    actionType: 'recycle_bin.permanent_delete',
    objectType: type, objectId: id,
    summary: `彻底删除 ${type} ${id}`,
    result: 'success',
  });
  return { message: '删除成功' };
}

module.exports = { listRecycleBin, restoreItem, permanentDelete };








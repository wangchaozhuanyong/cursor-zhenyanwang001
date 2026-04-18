const repo = require('./adminRecycleBin.repository');
const { writeAuditLog } = require('../../utils/auditLog');

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
  await writeAuditLog({
    req, operatorId: adminUserId,
    actionType: 'recycle_bin.restore',
    objectType: type, objectId: id,
    summary: `从回收站恢复 ${type} ${id}`,
    result: 'success',
  });
  return { message: '已恢复' };
}

async function permanentDelete(type, id, adminUserId, req) {
  if (!repo.TABLE_CONFIGS[type]) return { error: { code: 400, message: '不支持的类型' } };
  const ok = await repo.permanentDeleteItem(type, id);
  if (!ok) return { error: { code: 400, message: '删除失败' } };
  await writeAuditLog({
    req, operatorId: adminUserId,
    actionType: 'recycle_bin.permanent_delete',
    objectType: type, objectId: id,
    summary: `彻底删除 ${type} ${id}`,
    result: 'success',
  });
  return { message: '已彻底删除' };
}

module.exports = { listRecycleBin, restoreItem, permanentDelete };

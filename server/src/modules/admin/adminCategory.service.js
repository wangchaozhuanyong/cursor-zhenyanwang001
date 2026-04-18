const { BusinessError } = require('../../errors/BusinessError');
const repo = require('./adminCategory.repository');
const { writeAuditLog } = require('../../utils/auditLog');

async function listCategories() {
  const rows = await repo.selectAllCategoriesOrdered();
  return { data: rows };
}

async function createCategory(body, adminUserId, req) {
  const { id, name, icon, sort_order } = body;
  if (!id || !name) throw new BusinessError(400, 'ID和名称必填');
  await repo.insertCategory({ id, name, icon, sort_order });
  await writeAuditLog({ req, operatorId: adminUserId, actionType: 'category.create', objectType: 'category', objectId: id, summary: `创建分类 ${name}`, after: { name, icon, sort_order }, result: 'success' });
  return {
    data: { id, name, icon: icon || '', sort_order: sort_order ?? 0 },
    message: '创建成功',
  };
}

async function updateCategory(id, body, adminUserId, req) {
  const { name, icon, sort_order } = body;
  const fragments = [];
  const values = [];
  if (name !== undefined) {
    fragments.push('name = ?');
    values.push(name);
  }
  if (icon !== undefined) {
    fragments.push('icon = ?');
    values.push(icon);
  }
  if (sort_order !== undefined) {
    fragments.push('sort_order = ?');
    values.push(sort_order);
  }
  if (fragments.length === 0) throw new BusinessError(400, '没有需要更新的字段');
  await repo.updateCategoryDynamic(fragments, values, id);
  await writeAuditLog({ req, operatorId: adminUserId, actionType: 'category.update', objectType: 'category', objectId: id, summary: `更新分类 ${name || id}`, after: body, result: 'success' });
  return { data: null, message: '更新成功' };
}

async function deleteCategory(id, adminUserId, req) {
  await repo.deleteCategoryById(id);
  await writeAuditLog({ req, operatorId: adminUserId, actionType: 'category.delete', objectType: 'category', objectId: id, summary: `删除分类 ${id}`, result: 'success' });
  return { data: null, message: '已删除' };
}

module.exports = {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
};

const { BusinessError } = require('../../../errors/BusinessError');
const repo = require('../repository/adminCategory.repository');
const { writeAuditLog } = require('../../../utils/auditLog');
const { generateId } = require('../../../utils/helpers');

const MAX_CATEGORY_DEPTH = 3;

function normalizeCategory(row) {
  return {
    id: row.id,
    parent_id: row.parent_id || null,
    name: row.name,
    icon: row.icon || '',
    icon_url: row.icon_url || row.icon || '',
    sort_order: row.sort_order ?? 0,
    is_active: !!row.is_active,
    is_visible: row.is_visible !== undefined ? !!row.is_visible : !!row.is_active,
    productCount: Number(row.productCount) || 0,
    children: [],
  };
}

function buildCategoryTree(rows) {
  const map = new Map();
  const roots = [];
  rows.forEach((row) => map.set(row.id, normalizeCategory(row)));
  rows.forEach((row) => {
    const node = map.get(row.id);
    const parent = row.parent_id ? map.get(row.parent_id) : null;
    if (parent) parent.children.push(node);
    else roots.push(node);
  });
  return roots;
}

async function getDepth(parentId) {
  if (!parentId) return 1;
  let depth = 1;
  let current = await repo.selectCategoryById(parentId);
  if (!current) throw new BusinessError(400, '父分类不存在');
  while (current) {
    depth += 1;
    if (depth > MAX_CATEGORY_DEPTH) return depth;
    current = current.parent_id ? await repo.selectCategoryById(current.parent_id) : null;
  }
  return depth;
}

async function getSubtreeHeight(categoryId) {
  const rows = await repo.selectAllCategoriesOrdered();
  const children = new Map();
  rows.forEach((row) => {
    const key = row.parent_id || '';
    const list = children.get(key) || [];
    list.push(row.id);
    children.set(key, list);
  });

  const walk = (id) => {
    const childIds = children.get(id) || [];
    if (!childIds.length) return 1;
    return 1 + Math.max(...childIds.map(walk));
  };

  return rows.some((row) => row.id === categoryId) ? walk(categoryId) : 1;
}

async function assertParentAllowed(parentId, selfId) {
  if (!parentId) return;
  if (parentId === selfId) throw new BusinessError(400, '父分类不能选择自己');
  let current = await repo.selectCategoryById(parentId);
  while (current) {
    if (current.id === selfId) throw new BusinessError(400, '不能把分类移动到自己的子分类下');
    current = current.parent_id ? await repo.selectCategoryById(current.parent_id) : null;
  }
  const depth = await getDepth(parentId);
  if (depth > MAX_CATEGORY_DEPTH) throw new BusinessError(400, `Max category depth is ${MAX_CATEGORY_DEPTH}`);
  const selfExists = selfId ? await repo.selectCategoryById(selfId) : null;
  if (selfExists) {
    const height = await getSubtreeHeight(selfId);
    if (depth + height - 1 > MAX_CATEGORY_DEPTH) {
      throw new BusinessError(400, `Depth exceeds max level ${MAX_CATEGORY_DEPTH} after move`);
    }
  }
}

async function listCategories() {
  const rows = await repo.selectAllCategoriesOrdered();
  return { data: buildCategoryTree(rows) };
}

async function createCategory(body, adminUserId, req) {
  const { name, icon, icon_url, parent_id, sort_order, is_visible } = body;
  const id = body.id || generateId();
  if (!name) throw new BusinessError(400, '分类名称不能为空');
  await assertParentAllowed(parent_id, id);
  await repo.insertCategory({ id, parent_id, name, icon, icon_url, sort_order, is_visible });
  await writeAuditLog({
    req,
    operatorId: adminUserId,
    actionType: 'category.create',
    objectType: 'category',
    objectId: id,
    summary: `创建分类 ${name}`,
    after: { name, icon, icon_url, parent_id, sort_order, is_visible },
    result: 'success',
  });
  return {
    data: {
      id,
      parent_id: parent_id || null,
      name,
      icon: icon || '',
      icon_url: icon_url || icon || '',
      sort_order: sort_order ?? 0,
      is_visible: is_visible !== false,
      is_active: is_visible !== false,
      productCount: 0,
      children: [],
    },
    message: '创建成功',
  };
}

async function updateCategory(id, body, adminUserId, req) {
  const existing = await repo.selectCategoryById(id);
  if (!existing) throw new BusinessError(404, '分类不存在');
  const { name, icon, icon_url, parent_id, sort_order, is_visible } = body;
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
  if (icon_url !== undefined) {
    fragments.push('icon_url = ?');
    values.push(icon_url);
  }
  if (parent_id !== undefined) {
    await assertParentAllowed(parent_id, id);
    fragments.push('parent_id = ?');
    values.push(parent_id || null);
  }
  if (sort_order !== undefined) {
    fragments.push('sort_order = ?');
    values.push(sort_order);
  }
  if (is_visible !== undefined) {
    fragments.push('is_visible = ?', 'is_active = ?');
    values.push(is_visible ? 1 : 0, is_visible ? 1 : 0);
  }
  if (fragments.length === 0) throw new BusinessError(400, '没有需要更新的字段');
  await repo.updateCategoryDynamic(fragments, values, id);
  await writeAuditLog({ req, operatorId: adminUserId, actionType: 'category.update', objectType: 'category', objectId: id, summary: `更新分类 ${name || id}`, after: body, result: 'success' });
  return { data: null, message: '更新成功' };
}

async function deleteCategory(id, adminUserId, req) {
  const children = await repo.countChildren(id);
  if (children > 0) throw new BusinessError(400, '该分类下存在子分类，禁止删除');
  const products = await repo.countProducts(id);
  if (products > 0) throw new BusinessError(400, '该分类已关联商品，禁止删除');
  await repo.deleteCategoryById(id, adminUserId);
  await writeAuditLog({ req, operatorId: adminUserId, actionType: 'category.delete', objectType: 'category', objectId: id, summary: `删除分类 ${id}`, result: 'success' });
  return { data: null, message: '已删除' };
}

async function updateCategorySort(items, adminUserId, req) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new BusinessError(400, '排序数据不能为空');
  }
  for (const item of items) {
    if (!item.id) throw new BusinessError(400, '分类 ID 不能为空');
    await assertParentAllowed(item.parent_id || null, item.id);
  }
  await repo.batchUpdateSort(items.map((item, index) => ({
    id: item.id,
    parent_id: item.parent_id || null,
    sort_order: Number.isFinite(Number(item.sort_order)) ? Number(item.sort_order) : index,
  })));
  await writeAuditLog({
    req,
    operatorId: adminUserId,
    actionType: 'category.sort',
    objectType: 'category',
    objectId: null,
    summary: `Adjusted category sort for ${items.length} items`,
    after: { count: items.length },
    result: 'success',
  });
  return { data: null, message: '排序已更新' };
}

module.exports = {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  updateCategorySort,
};








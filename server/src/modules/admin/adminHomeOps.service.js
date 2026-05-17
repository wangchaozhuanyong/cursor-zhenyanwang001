const { generateId } = require('../../utils/helpers');
const repo = require('./adminHomeOps.repository');
const homeModuleSettings = require('./homeModuleSettings');

function trimString(value, max = 512) {
  return String(value ?? '').trim().slice(0, max);
}

function toSortOrder(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

function normalizeBool(value, fallback = true) {
  if (value === undefined) return fallback;
  return value === true || value === 1 || value === '1' || value === 'true';
}

function formatNavItem(row) {
  return {
    id: row.id,
    icon_url: row.icon_url || '',
    title: row.title || '',
    link_url: row.link_url || '',
    target_type: row.target_type || 'url',
    target_category_id: row.target_category_id || null,
    sort_order: Number(row.sort_order || 0),
    enabled: !!row.enabled,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function listNavItems(options) {
  const rows = await repo.selectNavItems(options);
  return rows.map(formatNavItem);
}

async function createNavItem(body) {
  const title = trimString(body.title, 64);
  if (!title) return { error: { code: 400, message: '标题不能为空' } };
  const targetType = trimString(body.target_type ?? body.targetType, 20) || 'url';
  const targetCategoryId = trimString(body.target_category_id ?? body.targetCategoryId, 36) || null;
  const item = {
    id: generateId(),
    iconUrl: trimString(body.icon_url ?? body.iconUrl, 512),
    title,
    linkUrl: trimString(body.link_url ?? body.linkUrl, 512),
    targetType: targetType === 'category' ? 'category' : 'url',
    targetCategoryId: targetType === 'category' ? targetCategoryId : null,
    sortOrder: toSortOrder(body.sort_order ?? body.sortOrder, 0),
    enabled: normalizeBool(body.enabled, true),
  };
  await repo.insertNavItem(item);
  const rows = await repo.selectNavItems();
  return { data: rows.map(formatNavItem).find((r) => r.id === item.id), message: '创建成功' };
}

async function updateNavItem(id, body) {
  const fields = [];
  const values = [];
  if (body.icon_url !== undefined || body.iconUrl !== undefined) {
    fields.push('icon_url = ?');
    values.push(trimString(body.icon_url ?? body.iconUrl, 512));
  }
  if (body.title !== undefined) {
    const title = trimString(body.title, 64);
    if (!title) return { error: { code: 400, message: '标题不能为空' } };
    fields.push('title = ?');
    values.push(title);
  }
  if (body.link_url !== undefined || body.linkUrl !== undefined) {
    fields.push('link_url = ?');
    values.push(trimString(body.link_url ?? body.linkUrl, 512));
  }
  if (body.target_type !== undefined || body.targetType !== undefined) {
    const targetType = trimString(body.target_type ?? body.targetType, 20);
    const normalized = targetType === 'category' ? 'category' : 'url';
    fields.push('target_type = ?');
    values.push(normalized);
    if (normalized !== 'category') {
      fields.push('target_category_id = ?');
      values.push(null);
    }
  }
  if (body.target_category_id !== undefined || body.targetCategoryId !== undefined) {
    fields.push('target_category_id = ?');
    values.push(trimString(body.target_category_id ?? body.targetCategoryId, 36) || null);
  }
  if (body.sort_order !== undefined || body.sortOrder !== undefined) {
    fields.push('sort_order = ?');
    values.push(toSortOrder(body.sort_order ?? body.sortOrder, 0));
  }
  if (body.enabled !== undefined) {
    fields.push('enabled = ?');
    values.push(normalizeBool(body.enabled, true) ? 1 : 0);
  }
  await repo.updateNavItem(id, fields, values);
  return { data: null, message: '更新成功' };
}

async function deleteNavItem(id) {
  await repo.deleteNavItem(id);
  return { data: null, message: '删除成功' };
}

async function getHomeOpsSettings() {
  return homeModuleSettings.getHomeModuleSettings();
}

async function updateHomeOpsSettings(body, adminUserId, req) {
  const data = await homeModuleSettings.saveHomeModuleSettings(body, adminUserId, req);
  return { data, message: '首页模块配置已保存' };
}

async function getPublicHomeOps() {
  const [navItems, moduleSettings] = await Promise.all([
    listNavItems({ publicOnly: true }),
    homeModuleSettings.getHomeModuleSettings(),
  ]);
  return { navItems, moduleSettings };
}

module.exports = {
  listNavItems,
  createNavItem,
  updateNavItem,
  deleteNavItem,
  getHomeOpsSettings,
  updateHomeOpsSettings,
  getPublicHomeOps,
};

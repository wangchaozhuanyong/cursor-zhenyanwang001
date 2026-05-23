const { generateId } = require('../../../utils/helpers');
const db = require('../../../config/db');
const repo = require('../repository/adminHomeOps.repository');
const homeModuleSettings = require('../homeModuleSettings');
const supportChannels = require('../homeNavSupportChannels');
const siteCapabilitiesService = require('../../siteCapabilities/service/siteCapabilities.service');

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

function normalizeTargetType(value) {
  const raw = trimString(value, 20);
  if (raw === 'category') return 'category';
  if (raw === 'categories') return 'categories';
  if (raw === 'support') return 'support';
  return 'url';
}

async function assertSupportNavAllowed() {
  const caps = await siteCapabilitiesService.getSiteCapabilities();
  if (caps.customerServiceDownloadEnabled === false) {
    return { error: { code: 400, message: '请先开启站点能力中的「客服/APP 页」' } };
  }
  return null;
}

async function resolveNavTarget(body) {
  const targetType = normalizeTargetType(body.target_type ?? body.targetType);
  const targetCategoryId = trimString(body.target_category_id ?? body.targetCategoryId, 36) || null;
  const targetSupportChannelId = trimString(
    body.target_support_channel_id ?? body.targetSupportChannelId,
    64,
  ) || null;

  if (targetType === 'category') {
    if (!targetCategoryId) {
      return { error: { code: 400, message: '请选择要跳转的分类' } };
    }
    return {
      targetType,
      targetCategoryId,
      targetSupportChannelId: null,
      linkUrl: `/categories?cat=${targetCategoryId}`,
    };
  }

  if (targetType === 'categories') {
    return {
      targetType: 'categories',
      targetCategoryId: null,
      targetSupportChannelId: null,
      linkUrl: '/categories',
    };
  }

  if (targetType === 'support') {
    const capError = await assertSupportNavAllowed();
    if (capError) return capError;
    if (!targetSupportChannelId) {
      return { error: { code: 400, message: '请选择客服账号' } };
    }
    const channel = await supportChannels.findSupportChannel(targetSupportChannelId, { requireEnabled: true });
    if (!channel) {
      return { error: { code: 400, message: '所选客服账号不存在或已禁用，请在客服/APP 设置中检查' } };
    }
    return {
      targetType,
      targetCategoryId: null,
      targetSupportChannelId: channel.id,
      linkUrl: supportChannels.buildSupportNavLinkUrl(channel.id),
    };
  }

  return {
    targetType: 'url',
    targetCategoryId: null,
    targetSupportChannelId: null,
    linkUrl: trimString(body.link_url ?? body.linkUrl, 512),
  };
}

function formatNavItem(row) {
  return {
    id: row.id,
    icon_url: row.icon_url || '',
    title: row.title || '',
    link_url: row.link_url || '',
    target_type: row.target_type || 'url',
    target_category_id: row.target_category_id || null,
    target_support_channel_id: row.target_support_channel_id || null,
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

async function listSupportChannelsForAdmin() {
  const capError = await assertSupportNavAllowed();
  if (capError) return capError;
  const channels = await supportChannels.listSupportChannels({ enabledOnly: true });
  return { data: channels };
}

async function createNavItem(body) {
  const title = trimString(body.title, 64);
  if (!title) return { error: { code: 400, message: '标题不能为空' } };

  const target = await resolveNavTarget(body);
  if (target.error) return target;

  const existing = await repo.selectNavItems();
  const maxSort = existing.reduce((max, row) => Math.max(max, Number(row.sort_order || 0)), 0);
  const item = {
    id: generateId(),
    iconUrl: trimString(body.icon_url ?? body.iconUrl, 512),
    title,
    linkUrl: target.linkUrl,
    targetType: target.targetType,
    targetCategoryId: target.targetCategoryId,
    targetSupportChannelId: target.targetSupportChannelId,
    sortOrder: toSortOrder(body.sort_order ?? body.sortOrder, maxSort + 1),
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

  const targetTouched =
    body.target_type !== undefined
    || body.targetType !== undefined
    || body.link_url !== undefined
    || body.linkUrl !== undefined
    || body.target_category_id !== undefined
    || body.targetCategoryId !== undefined
    || body.target_support_channel_id !== undefined
    || body.targetSupportChannelId !== undefined;

  if (targetTouched) {
    const [[current]] = await db.query(
      'SELECT target_type, target_category_id, target_support_channel_id, link_url FROM home_nav_items WHERE id = ? LIMIT 1',
      [id],
    );
    if (!current) return { error: { code: 404, message: '导航不存在' } };
    const merged = {
      target_type: body.target_type ?? body.targetType ?? current.target_type,
      target_category_id: body.target_category_id ?? body.targetCategoryId ?? current.target_category_id,
      target_support_channel_id:
        body.target_support_channel_id ?? body.targetSupportChannelId ?? current.target_support_channel_id,
      link_url: body.link_url ?? body.linkUrl ?? current.link_url,
    };
    const target = await resolveNavTarget(merged);
    if (target.error) return target;
    fields.push('target_type = ?', 'target_category_id = ?', 'target_support_channel_id = ?', 'link_url = ?');
    values.push(target.targetType, target.targetCategoryId, target.targetSupportChannelId, target.linkUrl);
  }

  if (body.sort_order !== undefined || body.sortOrder !== undefined) {
    fields.push('sort_order = ?');
    values.push(toSortOrder(body.sort_order ?? body.sortOrder, 0));
  }
  if (body.enabled !== undefined) {
    fields.push('enabled = ?');
    values.push(normalizeBool(body.enabled, true) ? 1 : 0);
  }
  if (!fields.length) return { data: null, message: '更新成功' };
  await repo.updateNavItem(id, fields, values);
  return { data: null, message: '更新成功' };
}

async function deleteNavItem(id) {
  await repo.deleteNavItem(id);
  return { data: null, message: '删除成功' };
}

async function sortNavItems(body) {
  const items = body?.items;
  if (!Array.isArray(items) || items.length === 0) {
    return { error: { code: 400, message: '排序数据不能为空' } };
  }
  const normalized = items.map((item, index) => {
    const itemId = trimString(item.id, 36);
    if (!itemId) return null;
    return {
      id: itemId,
      sort_order: toSortOrder(item.sort_order ?? item.sortOrder, index + 1),
    };
  }).filter(Boolean);
  if (normalized.length !== items.length) {
    return { error: { code: 400, message: '导航 ID 无效' } };
  }
  await repo.batchUpdateNavSort(normalized);
  return { data: null, message: '排序已更新' };
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
  listSupportChannelsForAdmin,
  createNavItem,
  updateNavItem,
  deleteNavItem,
  sortNavItems,
  getHomeOpsSettings,
  updateHomeOpsSettings,
  getPublicHomeOps,
};

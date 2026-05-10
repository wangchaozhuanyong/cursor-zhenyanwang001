const { generateId } = require('../../utils/helpers');
const { BusinessError } = require('../../errors/BusinessError');
const { writeAuditLog } = require('../../utils/auditLog');
const catalogService = require('../product/catalog.service');
const repo = require('./adminActivity.repository');

function bumpCatalogCache() {
  try {
    if (typeof catalogService.clearCatalogCache === 'function') {
      catalogService.clearCatalogCache();
    }
  } catch (e) {
    console.warn(`[adminActivity] clear catalog cache: ${e?.message || e}`);
  }
}

function assertFullReductionRules(type, threshold, discount) {
  if (type !== 'full_reduction') return;
  const th = threshold != null && threshold !== '' ? Number(threshold) : NaN;
  const disc = discount != null && discount !== '' ? Number(discount) : NaN;
  if (!Number.isFinite(th) || !Number.isFinite(disc) || th <= 0 || disc <= 0) {
    throw new BusinessError(400, '满减活动需设置满额门槛与减免金额，且均须大于 0');
  }
}

function toNumber(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function computeStatus(row) {
  if (Number(row.disabled) === 1) return 'disabled';
  const now = Date.now();
  const start = new Date(row.start_at).getTime();
  const end = new Date(row.end_at).getTime();
  if (Number.isFinite(start) && now < start) return 'not_started';
  if (Number.isFinite(end) && now > end) return 'ended';
  return 'active';
}

function statusLabel(status) {
  return {
    not_started: '未开始',
    active: '进行中',
    ended: '已结束',
    disabled: '禁用',
  }[status] || status;
}

function normalizeItem(item, index) {
  const productId = String(item.product_id || '').trim();
  if (!productId) throw new BusinessError(400, '活动商品不能为空');
  const activityPrice = toNumber(item.activity_price, 0);
  if (activityPrice <= 0) throw new BusinessError(400, '活动价必须大于 0');
  const stock = Math.max(0, Math.floor(toNumber(item.activity_stock, 0)));
  const limit = Math.max(0, Math.floor(toNumber(item.limit_per_user, 0)));
  return {
    id: item.id && typeof item.id === 'string' ? item.id : generateId(),
    product_id: productId,
    activity_price: activityPrice,
    activity_stock: stock,
    limit_per_user: limit,
    sold_count: Math.max(0, Math.floor(toNumber(item.sold_count, 0))),
    sort_order: item.sort_order != null ? Math.floor(toNumber(item.sort_order, index)) : index,
  };
}

function normalizePayload(body, partial = false) {
  const out = {};
  if (!partial || body.type !== undefined) {
    out.type = body.type === 'full_reduction' ? 'full_reduction' : 'flash_sale';
  }
  if (!partial || body.title !== undefined) {
    const title = String(body.title || '').trim();
    if (!title) throw new BusinessError(400, '活动名称必填');
    out.title = title;
  }
  if (!partial || body.start_at !== undefined) out.start_at = String(body.start_at || '').replace('T', ' ');
  if (!partial || body.end_at !== undefined) out.end_at = String(body.end_at || '').replace('T', ' ');
  if (out.start_at && out.end_at && new Date(out.end_at).getTime() <= new Date(out.start_at).getTime()) {
    throw new BusinessError(400, '结束时间必须晚于开始时间');
  }
  if (body.description !== undefined || !partial) out.description = String(body.description || '').trim();
  if (body.disabled !== undefined || !partial) out.disabled = !!body.disabled;
  if (body.threshold_amount !== undefined || !partial) {
    const n = body.threshold_amount === '' || body.threshold_amount == null ? null : toNumber(body.threshold_amount, 0);
    out.threshold_amount = n != null ? Math.max(0, n) : null;
  }
  if (body.discount_amount !== undefined || !partial) {
    const n = body.discount_amount === '' || body.discount_amount == null ? null : toNumber(body.discount_amount, 0);
    out.discount_amount = n != null ? Math.max(0, n) : null;
  }
  if (body.sort_order !== undefined || !partial) out.sort_order = Math.floor(toNumber(body.sort_order, 0));
  return out;
}

function formatActivity(row, items = undefined) {
  const status = computeStatus(row);
  const out = {
    ...row,
    disabled: !!row.disabled,
    threshold_amount: row.threshold_amount != null ? Number(row.threshold_amount) : null,
    discount_amount: row.discount_amount != null ? Number(row.discount_amount) : null,
    product_count: Number(row.product_count || 0),
    activity_stock_total: Number(row.activity_stock_total || 0),
    sold_count_total: Number(row.sold_count_total || 0),
    status,
    status_label: statusLabel(status),
  };
  if (items) {
    out.items = items.map((it) => ({
      ...it,
      activity_price: Number(it.activity_price),
      activity_stock: Number(it.activity_stock),
      sold_count: Number(it.sold_count),
      limit_per_user: Number(it.limit_per_user),
      product_price: it.product_price != null ? Number(it.product_price) : null,
      product_stock: it.product_stock != null ? Number(it.product_stock) : null,
    }));
  }
  return out;
}

async function listActivities(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(query.pageSize, 10) || 20));
  const { where, params } = repo.listWhere(query);
  const total = await repo.countActivities(where, params);
  const offset = (page - 1) * pageSize;
  const rows = await repo.selectActivitiesPage(where, params, pageSize, offset);
  return { kind: 'paginate', list: rows.map((r) => formatActivity(r)), total, page, pageSize };
}

async function getActivity(id) {
  const row = await repo.selectActivityById(id);
  if (!row) throw new BusinessError(404, '活动不存在');
  const items = await repo.selectActivityItems(id);
  return { data: formatActivity(row, items) };
}

async function createActivity(body, adminUserId, req) {
  const payload = normalizePayload(body);
  assertFullReductionRules(payload.type, payload.threshold_amount, payload.discount_amount);
  const items = Array.isArray(body.items) ? body.items.map(normalizeItem) : [];
  if (items.length === 0) throw new BusinessError(400, '至少配置一个活动商品');
  const id = generateId();
  await repo.insertActivity({ ...payload, id, adminUserId });
  await repo.replaceActivityItems(id, items);
  bumpCatalogCache();
  await writeAuditLog({
    req,
    operatorId: adminUserId,
    actionType: 'activity.create',
    objectType: 'marketing_activity',
    objectId: id,
    summary: `创建活动 ${payload.title}`,
    after: { ...payload, items },
    result: 'success',
  });
  return getActivity(id);
}

async function updateActivity(id, body, adminUserId, req) {
  const existing = await repo.selectActivityById(id);
  if (!existing) throw new BusinessError(404, '活动不存在');
  const payload = normalizePayload(body, true);
  const mergedType = payload.type !== undefined ? payload.type : existing.type;
  const mergedTh = payload.threshold_amount !== undefined ? payload.threshold_amount : existing.threshold_amount;
  const mergedDisc = payload.discount_amount !== undefined ? payload.discount_amount : existing.discount_amount;
  assertFullReductionRules(mergedType, mergedTh, mergedDisc);
  const fragments = [];
  const values = [];
  for (const [key, value] of Object.entries(payload)) {
    fragments.push(`${key} = ?`);
    values.push(key === 'disabled' ? (value ? 1 : 0) : value);
  }
  if (fragments.length) await repo.updateActivityDynamic(id, fragments, values, adminUserId);
  if (Array.isArray(body.items)) {
    await repo.replaceActivityItems(id, body.items.map(normalizeItem));
  }
  bumpCatalogCache();
  await writeAuditLog({
    req,
    operatorId: adminUserId,
    actionType: 'activity.update',
    objectType: 'marketing_activity',
    objectId: id,
    summary: `更新活动 ${existing.title}`,
    after: body,
    result: 'success',
  });
  return getActivity(id);
}

async function updateActivityStatus(id, body, adminUserId, req) {
  const existing = await repo.selectActivityById(id);
  if (!existing) throw new BusinessError(404, '活动不存在');
  await repo.setActivityDisabled(id, !!body.disabled, adminUserId);
  bumpCatalogCache();
  await writeAuditLog({
    req,
    operatorId: adminUserId,
    actionType: body.disabled ? 'activity.disable' : 'activity.enable',
    objectType: 'marketing_activity',
    objectId: id,
    summary: `${body.disabled ? '禁用' : '启用'}活动 ${existing.title}`,
    result: 'success',
  });
  return getActivity(id);
}

async function deleteActivity(id, adminUserId, req) {
  const existing = await repo.selectActivityById(id);
  if (!existing) throw new BusinessError(404, '活动不存在');
  await repo.softDeleteActivity(id, adminUserId);
  bumpCatalogCache();
  await writeAuditLog({
    req,
    operatorId: adminUserId,
    actionType: 'activity.delete',
    objectType: 'marketing_activity',
    objectId: id,
    summary: `删除活动 ${existing.title}`,
    result: 'success',
  });
  return { data: null, message: '已删除' };
}

module.exports = {
  listActivities,
  getActivity,
  createActivity,
  updateActivity,
  updateActivityStatus,
  deleteActivity,
};

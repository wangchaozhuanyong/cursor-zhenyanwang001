const { generateId } = require('../../../utils/helpers');
const { BusinessError } = require('../../../errors/BusinessError');
const { writeAuditLog } = require('../../../utils/auditLog');
const {
  PUBLISHABLE_ACTIVITY_TYPES,
  WIP_ACTIVITY_TYPES,
  normalizeDisplayPositions,
  normalizeDisplayPositionsForActivity,
  findInvalidDisplayPositionsForActivity,
} = require('../../../constants/marketingDisplayPositions');
const repo = require('../repository/adminActivity.repository');

const LEGACY_COUPON_ACTIVITY_TYPES = new Set(['coupon_activity', 'new_user_gift']);
const COUPON_CAMPAIGN_MIGRATION_MESSAGE = '优惠券活动请到「营销中心 > 优惠券活动」创建和维护';

function parseJsonField(value, fallback) {
  if (value == null || value === '') return fallback;
  if (typeof value === 'object') return value;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }
  return fallback;
}

function bumpCatalogCache() {
  try {
    const productApi = require('../../product')?.api;
    if (typeof productApi?.clearCatalogCache === 'function') {
      productApi.clearCatalogCache();
    }
  } catch (e) {
    console.warn(`[adminActivity] clear catalog cache: ${e?.message || e}`);
  }
}

function toNumber(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function computeStatus(row) {
  if (Number(row.disabled) === 1 || row.status === 'disabled') return 'disabled';
  const now = Date.now();
  const start = new Date(row.start_at).getTime();
  const end = new Date(row.end_at).getTime();
  if (row.status === 'draft') return 'draft';
  if (Number.isFinite(start) && now < start) return 'scheduled';
  if (Number.isFinite(end) && now > end) return 'ended';
  return 'active';
}

function statusLabel(status) {
  return {
    draft: '草稿',
    scheduled: 'scheduled',
    active: 'active',
    ended: 'ended',
    disabled: 'disabled',
  }[status] || status;
}

function assertPublishRules(payload) {
  if (!payload.title) throw new BusinessError(400, '活动名称不能为空');
  if (!payload.start_at || !payload.end_at) throw new BusinessError(400, '开始时间和结束时间不能为空');
  if (new Date(payload.end_at).getTime() <= new Date(payload.start_at).getTime()) {
    throw new BusinessError(400, '结束时间必须晚于开始时间');
  }
  if (WIP_ACTIVITY_TYPES.includes(payload.type)) {
    throw new BusinessError(400, '该活动类型仍在开发中，暂不可发布');
  }
  if (LEGACY_COUPON_ACTIVITY_TYPES.has(payload.type)) {
    throw new BusinessError(400, COUPON_CAMPAIGN_MIGRATION_MESSAGE);
  }
  if (!PUBLISHABLE_ACTIVITY_TYPES.includes(payload.type)) {
    throw new BusinessError(400, '不支持的活动类型');
  }
  const invalidPositions = findInvalidDisplayPositionsForActivity(payload.type, payload.display_positions);
  if (invalidPositions.length) throw new BusinessError(400, `活动类型与展示位置不匹配：${invalidPositions.join(', ')}`);
  const positions = normalizeDisplayPositionsForActivity(payload.type, payload.display_positions);
  if (!positions.length) throw new BusinessError(400, '请至少选择一个展示位置');
  payload.display_positions = positions;

  if (payload.type !== 'flash_sale' && ['category', 'product'].includes(payload.scope_type)) {
    const scopeIds = Array.isArray(payload.scope_ids) ? payload.scope_ids.map((id) => String(id || '').trim()).filter(Boolean) : [];
    if (!scopeIds.length) {
      throw new BusinessError(400, payload.scope_type === 'category' ? '请选择活动适用分类' : '请选择活动适用商品');
    }
    payload.scope_ids = Array.from(new Set(scopeIds));
  }

  if (payload.type === 'coupon_activity') {
    const couponIds = payload?.activity_config?.coupon_ids;
    if (!Array.isArray(couponIds) || !couponIds.length) {
      throw new BusinessError(400, '优惠券活动必须关联 coupons 表中的优惠券');
    }
  }
  if (payload.type === 'new_user_gift') {
    const pack = payload?.activity_config?.coupon_ids;
    if (!Array.isArray(pack) || !pack.length) {
      throw new BusinessError(400, '新人礼包必须关联至少一张优惠券');
    }
  }
  if (payload.type === 'flash_sale') {
    if (!payload.items.length) throw new BusinessError(400, '秒杀活动必须选择商品');
    const invalid = payload.items.find((it) => Number(it.activity_price) <= 0 || Number(it.activity_stock) < 0 || Number(it.limit_per_user) < 0);
    if (invalid) throw new BusinessError(400, '秒杀活动存在不合法商品配置（活动价/活动库存/限购）');
  }
  if (payload.type === 'points_bonus') {
    const cfg = payload?.activity_config || {};
    const pct = Number(cfg.multiplier_percent ?? 0);
    if (!Number.isFinite(pct) || pct < 100) {
      throw new BusinessError(400, '积分倍率必须至少为 100（100=1倍，200=2倍）');
    }
    if (Number(cfg.min_order_amount || 0) < 0) {
      throw new BusinessError(400, '最低订单金额不能为负数');
    }
    if (Number(cfg.max_bonus_points || 0) < 0) {
      throw new BusinessError(400, '额外积分上限不能为负数');
    }
    if (String(cfg.bonus_kind || 'normal') === 'birthday') {
      const before = Number(cfg.birthday_window_before_days ?? 0);
      const after = Number(cfg.birthday_window_after_days ?? 7);
      if (before < 0 || after < 0) {
        throw new BusinessError(400, '生日窗口天数不能为负数');
      }
    }
    if (String(cfg.bonus_kind || '') === 'holiday' && !String(cfg.holiday_name || '').trim()) {
      throw new BusinessError(400, '节日活动请填写节日名称');
    }
  }
  if (payload.type === 'full_reduction') {
    const rules = payload?.activity_config?.full_reduction_rules;
    if (Array.isArray(rules) && rules.length > 0) {
      for (const r of rules) {
        const th = Number(r.threshold_amount || 0);
        const disc = Number(r.discount_amount || 0);
        if (th <= 0) throw new BusinessError(400, '满减门槛必须大于 0');
        if (disc <= 0) throw new BusinessError(400, '满减金额必须大于 0');
        if (disc > th) throw new BusinessError(400, '满减金额不能大于满减门槛');
      }
    } else {
      const th = Number(payload.threshold_amount || 0);
      const disc = Number(payload.discount_amount || 0);
      if (th <= 0) throw new BusinessError(400, '满减门槛必须大于 0');
      if (disc <= 0) throw new BusinessError(400, '满减金额必须大于 0');
      if (disc > th) throw new BusinessError(400, '满减金额不能大于满减门槛');
    }
  }
}

function normalizeItem(item, index) {
  const productId = String(item.product_id || '').trim();
  if (!productId) throw new BusinessError(400, '活动商品不能为空');
  const activityPrice = toNumber(item.activity_price, 0);
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

function normalizeScopes(body = {}) {
  const scopeType = ['all', 'category', 'product', 'member_level', 'user_tag', 'new_user', 'old_user'].includes(String(body.scope_type || 'product'))
    ? String(body.scope_type)
    : 'product';
  const scopeIds = Array.isArray(body.scope_ids) ? body.scope_ids.map((x) => String(x || '').trim()).filter(Boolean) : [];
  const scopes = scopeIds.map((scopeId) => ({ id: generateId(), scope_type: scopeType, scope_id: scopeId }));
  return { scopeType, scopes };
}

function normalizeFlashSaleScopes(items = []) {
  const productIds = [...new Set(items.map((item) => String(item.product_id || '').trim()).filter(Boolean))];
  return {
    scopeType: 'product',
    scopes: productIds.map((scopeId) => ({ id: generateId(), scope_type: 'product', scope_id: scopeId })),
  };
}

function assertDraftDisplayPositions(type, positions) {
  const invalidPositions = findInvalidDisplayPositionsForActivity(type, positions);
  if (invalidPositions.length) {
    throw new BusinessError(400, `活动类型与展示位置不匹配：${invalidPositions.join(', ')}`);
  }
}

function normalizePayload(body, partial = false) {
  const out = {};
  if (!partial || body.type !== undefined) {
    const requestedType = String(body.type || 'flash_sale');
    if (LEGACY_COUPON_ACTIVITY_TYPES.has(requestedType)) {
      throw new BusinessError(400, COUPON_CAMPAIGN_MIGRATION_MESSAGE);
    }
    const supported = ['flash_sale', 'full_reduction', 'member_activity', 'points_bonus', 'cashback_activity'];
    out.type = supported.includes(requestedType) ? requestedType : 'flash_sale';
  }
  if (!partial || body.title !== undefined) {
    const title = String(body.title || '').trim();
    if (!title) throw new BusinessError(400, '活动名称不能为空');
    out.title = title;
  }
  if (body.subtitle !== undefined || !partial) out.subtitle = String(body.subtitle || '').trim();
  if (body.cover_image !== undefined || !partial) out.cover_image = String(body.cover_image || '').trim();
  if (!partial || body.start_at !== undefined) out.start_at = String(body.start_at || '').replace('T', ' ');
  if (!partial || body.end_at !== undefined) out.end_at = String(body.end_at || '').replace('T', ' ');
  if (body.description !== undefined || !partial) out.description = String(body.description || '').trim();
  if (body.disabled !== undefined || !partial) out.disabled = !!body.disabled;
  if (body.sort_order !== undefined || !partial) out.sort_order = Math.floor(toNumber(body.sort_order, 0));
  if (body.threshold_amount !== undefined || !partial) out.threshold_amount = body.threshold_amount === '' || body.threshold_amount == null ? null : toNumber(body.threshold_amount, 0);
  if (body.discount_amount !== undefined || !partial) out.discount_amount = body.discount_amount === '' || body.discount_amount == null ? null : toNumber(body.discount_amount, 0);
  if (body.allow_coupon_stack !== undefined || !partial) out.allow_coupon_stack = !!body.allow_coupon_stack;
  if (body.allow_points_stack !== undefined || !partial) out.allow_points_stack = !!body.allow_points_stack;
  if (body.allow_reward !== undefined || !partial) out.allow_reward = !!body.allow_reward;
  if (body.publish_at !== undefined || !partial) out.publish_at = body.publish_at ? String(body.publish_at).replace('T', ' ') : null;
  if (body.internal_note !== undefined || !partial) out.internal_note = String(body.internal_note || '').trim();
  if (body.activity_config !== undefined || !partial) out.activity_config = body.activity_config || null;
  if (body.display_positions !== undefined || !partial) {
    out.display_positions = normalizeDisplayPositions(body.display_positions);
  }
  if (body.status !== undefined || !partial) out.status = String(body.status || 'draft');
  return out;
}

function formatActivity(row, items = undefined, scopes = undefined) {
  const status = computeStatus(row);
  const out = {
    ...row,
    disabled: !!row.disabled,
    threshold_amount: row.threshold_amount != null ? Number(row.threshold_amount) : null,
    discount_amount: row.discount_amount != null ? Number(row.discount_amount) : null,
    product_count: Number(row.product_count || 0),
    activity_stock_total: Number(row.activity_stock_total || 0),
    sold_count_total: Number(row.sold_count_total || 0),
    allow_coupon_stack: !!row.allow_coupon_stack,
    allow_points_stack: !!row.allow_points_stack,
    allow_reward: !!row.allow_reward,
    display_positions: parseJsonField(row.display_positions, []),
    activity_config: parseJsonField(row.activity_config, null),
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
  if (scopes) {
    out.scopes = scopes;
    out.scope_ids = scopes.map((s) => s.scope_id);
  }
  return out;
}

async function validateProductsForFlashSale(items, startAt, endAt, excludeActivityId = null) {
  if (!items.length) return;
  const productIds = [...new Set(items.map((it) => it.product_id))];
  const products = await repo.selectProductStocksByIds(productIds);
  const productMap = new Map(products.map((p) => [p.id, p]));
  for (const item of items) {
    const product = productMap.get(item.product_id);
    if (!product) throw new BusinessError(400, `Product ${item.product_id} not found`);
    if (Number(product.lifecycle_status) !== 1) throw new BusinessError(400, `Product "${product.name}" is not active`);
    if (item.activity_stock > Number(product.stock || 0)) {
      throw new BusinessError(400, `Product "${product.name}" activity stock exceeds available stock`);
    }
    if (item.activity_price > Number(product.price || 0)) {
      throw new BusinessError(400, `商品“${product.name}”活动价不能高于原价`);
    }
  }
  const conflicts = await repo.selectConflictingActivities({ productIds, startAt, endAt, excludeActivityId });
  if (conflicts.length) {
    const first = conflicts[0];
    throw new BusinessError(400, `Product ${first.product_id} conflicts with activity "${first.title}" time window`);
  }
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
  const scopes = await repo.selectActivityScopes(id);
  return { data: formatActivity(row, items, scopes) };
}

async function createActivity(body, adminUserId, req) {
  const payload = normalizePayload(body);
  const items = Array.isArray(body.items) ? body.items.map(normalizeItem) : [];
  assertDraftDisplayPositions(payload.type, payload.display_positions);
  payload.display_positions = normalizeDisplayPositionsForActivity(payload.type, payload.display_positions);
  const { scopeType, scopes } = payload.type === 'flash_sale' ? normalizeFlashSaleScopes(items) : normalizeScopes(body);
  const targetStatus = body.status === 'active' || body.status === 'scheduled' ? body.status : 'draft';
  const finalPayload = {
    ...payload,
    items,
    scope_type: scopeType,
    scope_ids: scopes.map((scope) => scope.scope_id),
    status: targetStatus,
  };
  if (WIP_ACTIVITY_TYPES.includes(finalPayload.type) && targetStatus !== 'draft') {
    throw new BusinessError(400, '该活动类型仍在开发中，仅可保存草稿');
  }
  if (targetStatus !== 'draft') {
    assertPublishRules(finalPayload);
    if (finalPayload.type === 'flash_sale') {
      await validateProductsForFlashSale(items, payload.start_at, payload.end_at);
    }
  }
  const id = generateId();
  await repo.insertActivity({ ...finalPayload, id, adminUserId });
  if (items.length) await repo.replaceActivityItems(id, items);
  await repo.replaceActivityScopes(id, scopes);
  bumpCatalogCache();
  await writeAuditLog({
    req,
    operatorId: adminUserId,
    actionType: 'activity.create',
    objectType: 'marketing_activity',
    objectId: id,
    summary: `创建活动 ${payload.title}`,
    after: { ...finalPayload, scopes },
    result: 'success',
  });
  return getActivity(id);
}

async function updateActivity(id, body, adminUserId, req) {
  const existing = await repo.selectActivityById(id);
  if (!existing) throw new BusinessError(404, '活动不存在');
  const payload = normalizePayload(body, true);
  const fragments = [];
  const values = [];
  const items = Array.isArray(body.items) ? body.items.map(normalizeItem) : null;
  const scopesNormalized = body.scope_type !== undefined || body.scope_ids !== undefined ? normalizeScopes(body) : null;
  const merged = {
    ...existing,
    ...payload,
    display_positions: payload.display_positions !== undefined
      ? payload.display_positions
      : parseJsonField(existing.display_positions, []),
    items: items ?? await repo.selectActivityItems(id),
    scope_type: scopesNormalized?.scopeType || existing.scope_type,
    scope_ids: scopesNormalized?.scopes?.map((scope) => scope.scope_id) || (await repo.selectActivityScopes(id)).map((scope) => scope.scope_id),
  };
  if (payload.display_positions !== undefined || payload.type !== undefined) {
    assertDraftDisplayPositions(merged.type, merged.display_positions);
    payload.display_positions = normalizeDisplayPositionsForActivity(merged.type, merged.display_positions);
    merged.display_positions = payload.display_positions;
  }
  const finalScopes = merged.type === 'flash_sale' ? normalizeFlashSaleScopes(merged.items) : scopesNormalized;
  if (merged.type === 'flash_sale') {
    payload.scope_type = 'product';
    merged.scope_type = 'product';
  }
  if (WIP_ACTIVITY_TYPES.includes(merged.type) && payload.status && payload.status !== 'draft') {
    throw new BusinessError(400, '该活动类型仍在开发中，仅可保存草稿');
  }
  if (payload.status && payload.status !== 'draft') {
    assertPublishRules(merged);
    if (merged.type === 'flash_sale') {
      await validateProductsForFlashSale(merged.items, merged.start_at, merged.end_at, id);
    }
  }
  for (const [key, value] of Object.entries(payload)) {
    if (key === 'display_positions' || key === 'activity_config') {
      fragments.push(`${key} = ?`);
      values.push(value ? JSON.stringify(value) : null);
    } else if (key === 'disabled' || key === 'allow_coupon_stack' || key === 'allow_points_stack' || key === 'allow_reward') {
      fragments.push(`${key} = ?`);
      values.push(value ? 1 : 0);
    } else {
      fragments.push(`${key} = ?`);
      values.push(value);
    }
  }
  if (fragments.length) await repo.updateActivityDynamic(id, fragments, values, adminUserId);
  if (items) await repo.replaceActivityItems(id, items);
  if (finalScopes) await repo.replaceActivityScopes(id, finalScopes.scopes);
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

async function validateActivityBeforePublish(body, id = null) {
  const payload = normalizePayload(body, !!id);
  const items = Array.isArray(body.items) ? body.items.map(normalizeItem) : [];
  const flashScopes = (payload.type || body.type) === 'flash_sale' ? normalizeFlashSaleScopes(items) : null;
  const bodyScopes = flashScopes || normalizeScopes(body);
  const merged = {
    ...payload,
    items,
    scope_type: bodyScopes.scopeType,
    scope_ids: bodyScopes.scopes.map((scope) => scope.scope_id),
  };
  assertPublishRules(merged);
  if ((payload.type || body.type) === 'flash_sale') {
    await validateProductsForFlashSale(items, payload.start_at || body.start_at, payload.end_at || body.end_at, id);
  }
  return { data: { ok: true } };
}

async function searchActivityProducts(query) {
  return repo.searchActivityProducts(query);
}

module.exports = {
  listActivities,
  getActivity,
  createActivity,
  updateActivity,
  updateActivityStatus,
  deleteActivity,
  validateActivityBeforePublish,
  searchActivityProducts,
};




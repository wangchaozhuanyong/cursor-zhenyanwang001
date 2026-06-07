const { generateId } = require('../../../utils/helpers');
const { BusinessError } = require('../../../errors/BusinessError');
const repo = require('../repository/adminCoupon.repository');
const { writeAuditLog } = require('../../../utils/auditLog');

function getUserApi() {
  return /** @type {any} */ (require('../../user')).api || {};
}

function requireUserApi(name) {
  const fn = getUserApi()[name];
  if (typeof fn !== 'function') {
    throw new Error(`User module API missing method: ${name}`);
  }
  return fn;
}

function formatCouponRow(row) {
  if (!row) return row;
  const r = { ...row };
  r.value = parseFloat(r.value);
  r.min_amount = parseFloat(r.min_amount);
  r.scope_type = r.scope_type || 'all';
  r.display_badge = r.display_badge || '';
  r.category_ids = typeof r.category_ids === 'string' && r.category_ids
    ? r.category_ids.split(',').filter(Boolean)
    : [];
  r.category_names = typeof r.category_names === 'string' && r.category_names
    ? r.category_names.split(',').filter(Boolean)
    : [];
  r.total_quantity = Number(r.total_quantity || 0);
  r.per_user_limit = Number(r.per_user_limit || 1);
  r.claimed_count = Number(r.claimed_count_real ?? r.claimed_count ?? 0);
  r.used_count = Number(r.used_count_real ?? r.used_count ?? 0);
  r.expired_count = Number(r.expired_count_real || 0);
  r.available_user_coupon_count = Number(r.available_user_coupon_count || 0);
  r.remaining_quantity = r.total_quantity > 0 ? Math.max(0, r.total_quantity - r.claimed_count) : null;
  r.usage_rate = r.claimed_count > 0 ? Number((r.used_count / r.claimed_count).toFixed(4)) : 0;
  if (r.status === 'available' && dateOnly(r.end_date) && dateOnly(r.end_date) < new Date().toISOString().slice(0, 10)) {
    r.status = 'expired';
  }
  r.new_user_only = !!r.new_user_only;
  r.member_only = !!r.member_only;
  r.auto_issue = !!r.auto_issue;
  r.stackable_with_activity = r.stackable_with_activity !== 0;
  r.publish_status = r.publish_status || (r.status === 'available' ? 'active' : r.status || 'active');
  r.validity_mode = r.validity_mode || 'absolute';
  r.issue_mode = r.issue_mode || (r.auto_issue ? 'auto' : 'manual');
  r.campaign_start_at = r.campaign_start_at || r.claim_start_at || null;
  r.campaign_end_at = r.campaign_end_at || r.claim_end_at || null;
  r.post_end_valid_days = Number(r.post_end_valid_days || 0);
  r.source_campaign_id = r.source_campaign_id || null;
  r.source_coupon_id = r.source_coupon_id || null;
  r.usable_scope_type = r.usable_scope_type || 'all';
  try { r.usable_product_ids = r.usable_product_ids ? JSON.parse(r.usable_product_ids) : []; } catch { r.usable_product_ids = []; }
  try { r.usable_category_ids = r.usable_category_ids ? JSON.parse(r.usable_category_ids) : []; } catch { r.usable_category_ids = []; }
  return r;
}

function dateOnly(value) {
  if (!value) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function assertCouponActiveForIssue(coupon) {
  if (!coupon) throw new BusinessError(404, '优惠券不存在');
  const publishStatus = String(coupon.publish_status || (coupon.status === 'available' ? 'active' : coupon.status || ''));
  if (coupon.deleted_at || coupon.archived_at || coupon.invalidated_at || publishStatus !== 'active' || !['available', 'active'].includes(String(coupon.status || 'available'))) {
    throw new BusinessError(400, '该优惠券未启用，不能发放');
  }
  const today = new Date().toISOString().slice(0, 10);
  if (dateOnly(coupon.claim_start_at || coupon.start_date) > today || dateOnly(coupon.claim_end_at || coupon.end_date) < today) {
    throw new BusinessError(400, '该优惠券不在有效期内，不能发放');
  }
}

function assertCouponPayloadValid(body, options = {}) {
  const partial = !!options.partial;
  const type = body.type || 'fixed';
  if ((!partial || body.type !== undefined) && !['fixed', 'percentage', 'shipping'].includes(type)) {
    throw new BusinessError(400, '优惠券类型无效');
  }
  if (!partial || body.value !== undefined) {
    const value = Number(body.value || 0);
    if (!Number.isFinite(value) || value < 0) throw new BusinessError(400, '优惠券面额无效');
    if (type !== 'shipping' && value <= 0) throw new BusinessError(400, '优惠券面额必须大于 0');
    if (type === 'percentage' && value > 100) throw new BusinessError(400, '折扣比例需在 0-100 之间');
  }
  if (!partial || body.min_amount !== undefined) {
    const minAmount = Number(body.min_amount || 0);
    if (!Number.isFinite(minAmount) || minAmount < 0) throw new BusinessError(400, '优惠券使用门槛无效');
  }
  if (body.start_date && body.end_date && dateOnly(body.start_date) > dateOnly(body.end_date)) {
    throw new BusinessError(400, '优惠券结束日期不能早于开始日期');
  }
  if (body.total_quantity !== undefined && Number(body.total_quantity) < 0) {
    throw new BusinessError(400, '发放总量不能小于 0');
  }
  if (body.per_user_limit !== undefined && Number(body.per_user_limit) < 1) {
    throw new BusinessError(400, '每人领取上限不能小于 1');
  }
}

const CORE_FIELDS = new Set([
  'code', 'type', 'value', 'min_amount', 'scope_type', 'category_ids',
  'usable_scope_type', 'usable_product_ids', 'usable_category_ids',
  'stackable_with_activity', 'new_user_only', 'member_only',
  'validity_mode', 'valid_days_after_claim', 'follow_activity_id',
  'campaign_start_at', 'campaign_end_at', 'post_end_valid_days', 'audience_type', 'audience_config',
]);

function isCouponClosedForDelete(coupon) {
  if (!coupon) return false;
  if (coupon.deleted_at || coupon.archived_at || coupon.invalidated_at || coupon.stop_use_at || coupon.stop_claim_at) return true;
  const publishStatus = String(coupon.publish_status || '');
  if (['paused', 'disabled', 'archived', 'invalidated'].includes(publishStatus)) return true;
  const end = coupon.campaign_end_at || coupon.claim_end_at || coupon.use_end_at || coupon.end_date;
  return !!end && new Date(end).getTime() < Date.now();
}

async function listCoupons(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize, 10) || 20));
  const total = await repo.countCoupons(query);
  const offset = (page - 1) * pageSize;
  const rows = await repo.selectCouponsPage(pageSize, offset, query);
  const list = rows.map(formatCouponRow);
  return { kind: 'paginate', list, total, page, pageSize };
}

async function createCoupon(body, adminUserId, req) {
  const {
    code, title, type, value, min_amount, start_date, end_date, description, scope_type, display_badge, category_ids,
    total_quantity, per_user_limit, new_user_only, member_only, auto_issue,
    usable_scope_type, usable_product_ids, usable_category_ids, stackable_with_activity,
    publish_status, claim_start_at, claim_end_at, use_start_at, use_end_at,
    validity_mode, valid_days_after_claim, follow_activity_id, issue_mode,
    campaign_start_at, campaign_end_at, post_end_valid_days, display_positions,
    audience_type, audience_config, source_campaign_id, source_coupon_id,
  } = body;
  if (!code || !title) throw new BusinessError(400, '编码和标题不能为空');
  assertCouponPayloadValid({ ...body, type: type || 'fixed' });
  const id = generateId();
  const scopeType = scope_type === 'category' ? 'category' : 'all';
  const normalizedCategoryIds = Array.isArray(category_ids)
    ? [...new Set(category_ids.map((x) => String(x).trim()).filter(Boolean))]
    : [];
  await repo.insertCoupon({
    id,
    code,
    title,
    type: type || 'fixed',
    value,
    min_amount,
    start_date: start_date || new Date().toISOString().slice(0, 10),
    end_date: end_date || '2026-12-31',
    description: description || '',
    scope_type: scopeType,
    display_badge: display_badge || '',
    total_quantity,
    per_user_limit,
    new_user_only,
    member_only,
    auto_issue,
    usable_scope_type: usable_scope_type || 'all',
    usable_product_ids: Array.isArray(usable_product_ids) ? usable_product_ids : [],
    usable_category_ids: Array.isArray(usable_category_ids) ? usable_category_ids : [],
    stackable_with_activity: stackable_with_activity !== false,
    publish_status: publish_status || 'active',
    claim_start_at: claim_start_at || (start_date ? `${start_date} 00:00:00` : null),
    claim_end_at: claim_end_at || (end_date ? `${end_date} 23:59:59` : null),
    campaign_start_at: campaign_start_at || claim_start_at || (start_date ? `${start_date} 00:00:00` : null),
    campaign_end_at: campaign_end_at || claim_end_at || (end_date ? `${end_date} 23:59:59` : null),
    post_end_valid_days,
    display_positions,
    audience_type,
    audience_config,
    source_campaign_id,
    source_coupon_id,
    use_start_at: use_start_at || (start_date ? `${start_date} 00:00:00` : null),
    use_end_at: use_end_at || (end_date ? `${end_date} 23:59:59` : null),
    validity_mode: validity_mode || 'absolute',
    valid_days_after_claim,
    follow_activity_id,
    issue_mode: issue_mode || (auto_issue ? 'auto' : 'manual'),
  });
  if (scopeType === 'category') {
    for (const categoryId of normalizedCategoryIds) {
      await repo.insertCouponCategory(generateId(), id, categoryId);
    }
  }
  const row = await repo.selectCouponById(id);
  await writeAuditLog({ req, operatorId: adminUserId, actionType: 'coupon.create', objectType: 'coupon', objectId: id, summary: `创建优惠券 ${title}`, after: { code, title, type, value, min_amount, scope_type: scopeType, category_ids: normalizedCategoryIds }, result: 'success' });
  return { data: formatCouponRow(row), message: '创建成功' };
}

async function updateCoupon(id, body, adminUserId, req) {
  assertCouponPayloadValid(body, { partial: true });
  const existing = await repo.selectCouponById(id);
  if (!existing || existing.deleted_at) throw new BusinessError(404, '优惠券不存在');
  const claimedCount = await repo.countUserCouponsByCouponId(id);
  if (claimedCount > 0) {
    const touchedCore = Object.keys(body).some((key) => CORE_FIELDS.has(key));
    if (touchedCore) {
      throw new BusinessError(409, '该优惠券已有领取记录，核心规则已锁定。请新建优惠券，或仅修改标题、说明、角标和延长使用结束时间。');
    }
    if (body.use_end_at !== undefined || body.end_date !== undefined) {
      const beforeEnd = new Date(existing.use_end_at || existing.end_date || 0).getTime();
      const nextEnd = new Date(body.use_end_at || (body.end_date ? `${body.end_date} 23:59:59` : 0)).getTime();
      if (beforeEnd && nextEnd && nextEnd < beforeEnd) throw new BusinessError(409, '已有领取记录后，使用结束时间只能延长，不能缩短');
    }
  }
  const fragments = [];
  const values = [];
  for (const f of ['code', 'title', 'type', 'description', 'start_date', 'end_date', 'scope_type', 'display_badge', 'total_quantity', 'per_user_limit', 'usable_scope_type', 'publish_status', 'claim_start_at', 'claim_end_at', 'campaign_start_at', 'campaign_end_at', 'post_end_valid_days', 'audience_type', 'use_start_at', 'use_end_at', 'validity_mode', 'valid_days_after_claim', 'follow_activity_id', 'source_campaign_id', 'source_coupon_id', 'issue_mode']) {
    if (body[f] !== undefined) {
      fragments.push(`${f} = ?`);
      values.push(body[f]);
    }
  }
  for (const boolField of ['new_user_only', 'member_only', 'auto_issue', 'stackable_with_activity']) {
    if (body[boolField] !== undefined) {
      fragments.push(`${boolField} = ?`);
      values.push(body[boolField] ? 1 : 0);
    }
  }
  if (body.usable_product_ids !== undefined) {
    fragments.push('usable_product_ids = ?');
    values.push(Array.isArray(body.usable_product_ids) ? JSON.stringify(body.usable_product_ids) : null);
  }
  if (body.usable_category_ids !== undefined) {
    fragments.push('usable_category_ids = ?');
    values.push(Array.isArray(body.usable_category_ids) ? JSON.stringify(body.usable_category_ids) : null);
  }
  if (body.display_positions !== undefined) {
    fragments.push('display_positions = ?');
    values.push(Array.isArray(body.display_positions) ? JSON.stringify(body.display_positions) : null);
  }
  if (body.audience_config !== undefined) {
    fragments.push('audience_config = ?');
    values.push(body.audience_config ? JSON.stringify(body.audience_config) : null);
  }
  if (body.value !== undefined) {
    fragments.push('value = ?');
    values.push(body.value);
  }
  if (body.min_amount !== undefined) {
    fragments.push('min_amount = ?');
    values.push(body.min_amount);
  }
  if (fragments.length === 0) throw new BusinessError(400, '没有需要更新的字段');
  await repo.updateCouponDynamic(fragments, values, id);
  if (body.category_ids !== undefined || body.scope_type !== undefined) {
    await repo.clearCouponCategories(id);
    const scopeType = body.scope_type === 'category' ? 'category' : 'all';
    const normalizedCategoryIds = Array.isArray(body.category_ids)
      ? [...new Set(body.category_ids.map((x) => String(x).trim()).filter(Boolean))]
      : [];
    if (scopeType === 'category') {
      for (const categoryId of normalizedCategoryIds) {
        await repo.insertCouponCategory(generateId(), id, categoryId);
      }
    }
  }
  await writeAuditLog({ req, operatorId: adminUserId, actionType: 'coupon.update', objectType: 'coupon', objectId: id, summary: `更新优惠券 ${id}`, after: body, result: 'success' });
  return { data: null, message: '更新成功' };
}

async function deleteCoupon(id, adminUserId, req) {
  const coupon = await repo.selectCouponById(id);
  if (!coupon || coupon.deleted_at) throw new BusinessError(404, '礼券不存在或已删除');
  const claimedCount = await repo.countUserCouponsByCouponId(id);
  if (claimedCount > 0 && ((await repo.countOpenUserCouponsByCouponId(id)) > 0 || !isCouponClosedForDelete(coupon))) {
    throw new BusinessError(409, '该优惠券已有领取记录，不能直接删除。请使用归档、暂停领取、停止使用或作废已领取券。');
  }
  await repo.deleteCouponById(id, adminUserId);
  await writeAuditLog({ req, operatorId: adminUserId, actionType: 'coupon.delete', objectType: 'coupon', objectId: id, summary: `删除优惠券 ${id}`, result: 'success' });
  return { data: null, message: '已删除' };
}

async function pauseClaimCoupon(id, adminUserId, req) {
  await repo.updateCouponDynamic(['publish_status = ?', 'stop_claim_at = NOW()'], ['paused'], id);
  await writeAuditLog({ req, operatorId: adminUserId, actionType: 'coupon.pause_claim', objectType: 'coupon', objectId: id, summary: `暂停领取优惠券 ${id}`, result: 'success' });
  return { data: null, message: '已暂停领取' };
}

async function disableUseCoupon(id, adminUserId, req) {
  await repo.updateCouponDynamic(['publish_status = ?', 'stop_use_at = NOW()'], ['disabled'], id);
  await repo.invalidateUsableUserCouponsByCoupon(id, '优惠券已停止使用');
  await writeAuditLog({ req, operatorId: adminUserId, actionType: 'coupon.disable_use', objectType: 'coupon', objectId: id, summary: `停止使用优惠券 ${id}`, result: 'success' });
  return { data: null, message: '已停止使用并作废未使用券' };
}

async function archiveCoupon(id, adminUserId, req) {
  await repo.updateCouponDynamic(['publish_status = ?', 'archived_at = NOW()'], ['archived'], id);
  await writeAuditLog({ req, operatorId: adminUserId, actionType: 'coupon.archive', objectType: 'coupon', objectId: id, summary: `归档优惠券 ${id}`, result: 'success' });
  return { data: null, message: '已归档' };
}

async function invalidateUserCoupons(id, body, adminUserId, req) {
  const reason = String(body?.reason || '后台作废优惠券').slice(0, 255);
  const result = await repo.invalidateUsableUserCouponsByCoupon(id, reason);
  const affected = result?.affectedRows || 0;
  await writeAuditLog({ req, operatorId: adminUserId, actionType: 'coupon.invalidate_user_coupons', objectType: 'coupon', objectId: id, summary: `作废已领取优惠券 ${id}`, after: { reason, affected }, result: 'success' });
  return { data: { affected }, message: '已作废未使用券' };
}

async function getAllCouponRecords(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(query.pageSize, 10) || 20));
  const total = await repo.countAllUserCoupons(query);
  const offset = (page - 1) * pageSize;
  const list = await repo.selectAllCouponRecordsPage(pageSize, offset, query);
  return { kind: 'paginate', list, total, page, pageSize };
}

async function getCouponRecords(couponId, query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(query.pageSize, 10) || 20));
  const total = await repo.countUserCouponsByCouponId(couponId, query);
  const offset = (page - 1) * pageSize;
  const list = await repo.selectCouponRecordsPage(couponId, pageSize, offset, query);
  return { kind: 'paginate', list, total, page, pageSize };
}

async function issueCouponByTag(couponId, body, adminUserId, req) {
  const coupon = await repo.selectCouponBaseById(couponId);
  if (!coupon || coupon.deleted_at) throw new BusinessError(404, '优惠券不存在');
  assertCouponActiveForIssue(coupon);
  const tagIds = Array.isArray(body?.tagIds)
    ? [...new Set(body.tagIds.map((x) => String(x).trim()).filter(Boolean))]
    : [];
  if (!tagIds.length) throw new BusinessError(400, 'tagIds 不能为空');
  const userIds = await repo.selectUserIdsByTagIds(tagIds);
  if (!userIds.length) throw new BusinessError(400, '当前标签下无可发放用户');
  const issueResult = await requireUserApi('issueCouponToUsers')(couponId, userIds, {
    issueChannel: 'tag',
    adminUserId,
    metadata: { tagIds },
  });
  const affected = Number(issueResult?.issued || 0);
  await writeAuditLog({
    req,
    operatorId: adminUserId,
    actionType: 'coupon.issue_by_tag',
    objectType: 'coupon',
    objectId: couponId,
    summary: `按标签发放优惠券 ${coupon.title || couponId}`,
    after: { tagIds, userCount: userIds.length, issued: affected },
    result: 'success',
  });
  return { data: { issued: affected, targetUsers: userIds.length }, message: '发放完成' };
}

module.exports = {
  listCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  pauseClaimCoupon,
  disableUseCoupon,
  archiveCoupon,
  invalidateUserCoupons,
  getAllCouponRecords,
  getCouponRecords,
  issueCouponByTag,
};

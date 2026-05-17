const { generateId } = require('../../utils/helpers');
const { BusinessError } = require('../../errors/BusinessError');
const repo = require('./adminCoupon.repository');
const { writeAuditLog } = require('../../utils/auditLog');

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
  r.new_user_only = !!r.new_user_only;
  r.member_only = !!r.member_only;
  r.auto_issue = !!r.auto_issue;
  r.stackable_with_activity = r.stackable_with_activity !== 0;
  r.usable_scope_type = r.usable_scope_type || 'all';
  try { r.usable_product_ids = r.usable_product_ids ? JSON.parse(r.usable_product_ids) : []; } catch { r.usable_product_ids = []; }
  try { r.usable_category_ids = r.usable_category_ids ? JSON.parse(r.usable_category_ids) : []; } catch { r.usable_category_ids = []; }
  return r;
}

async function listCoupons(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(query.pageSize, 10) || 20));
  const total = await repo.countCoupons();
  const offset = (page - 1) * pageSize;
  const rows = await repo.selectCouponsPage(pageSize, offset);
  const list = rows.map(formatCouponRow);
  return { kind: 'paginate', list, total, page, pageSize };
}

async function createCoupon(body, adminUserId, req) {
  const {
    code, title, type, value, min_amount, start_date, end_date, description, scope_type, display_badge, category_ids,
    total_quantity, per_user_limit, new_user_only, member_only, auto_issue,
    usable_scope_type, usable_product_ids, usable_category_ids, stackable_with_activity,
  } = body;
  if (!code || !title) throw new BusinessError(400, '编码和标题必填');
  const id = generateId();
  const scopeType = scope_type === 'category' ? 'category' : 'all';
  const normalizedCategoryIds = Array.isArray(category_ids)
    ? [...new Set(category_ids.map((x) => String(x).trim()).filter(Boolean))]
    : [];

  await repo.insertCoupon({
    id, code, title,
    type: type || 'fixed',
    value: value || 0,
    min_amount: min_amount || 0,
    start_date: start_date || new Date().toISOString().slice(0, 10),
    end_date: end_date || '2026-12-31',
    description: description || '',
    scope_type: scopeType,
    display_badge: display_badge || '',
    total_quantity: Number(total_quantity || 0),
    per_user_limit: Math.max(1, Number(per_user_limit || 1)),
    new_user_only: !!new_user_only,
    member_only: !!member_only,
    auto_issue: !!auto_issue,
    usable_scope_type: usable_scope_type || 'all',
    usable_product_ids: Array.isArray(usable_product_ids) ? usable_product_ids : [],
    usable_category_ids: Array.isArray(usable_category_ids) ? usable_category_ids : [],
    stackable_with_activity: stackable_with_activity !== false,
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
  const fragments = [];
  const values = [];
  for (const f of ['code', 'title', 'type', 'description', 'start_date', 'end_date', 'scope_type', 'display_badge', 'total_quantity', 'per_user_limit', 'usable_scope_type']) {
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
  await repo.deleteCouponById(id);
  await writeAuditLog({ req, operatorId: adminUserId, actionType: 'coupon.delete', objectType: 'coupon', objectId: id, summary: `删除优惠券 ${id}`, result: 'success' });
  return { data: null, message: '已删除' };
}

async function getAllCouponRecords(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(query.pageSize, 10) || 20));
  const total = await repo.countAllUserCoupons();
  const offset = (page - 1) * pageSize;
  const list = await repo.selectAllCouponRecordsPage(pageSize, offset);
  return { kind: 'paginate', list, total, page, pageSize };
}

async function getCouponRecords(couponId, query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(query.pageSize, 10) || 20));
  const total = await repo.countUserCouponsByCouponId(couponId);
  const offset = (page - 1) * pageSize;
  const list = await repo.selectCouponRecordsPage(couponId, pageSize, offset);
  return { kind: 'paginate', list, total, page, pageSize };
}

async function issueCouponByTag(couponId, body, adminUserId, req) {
  const coupon = await repo.selectCouponBaseById(couponId);
  if (!coupon || coupon.deleted_at) throw new BusinessError(404, '优惠券不存在');
  const tagIds = Array.isArray(body?.tagIds)
    ? [...new Set(body.tagIds.map((x) => String(x).trim()).filter(Boolean))]
    : [];
  if (!tagIds.length) throw new BusinessError(400, 'tagIds不能为空');
  const userIds = await repo.selectUserIdsByTagIds(tagIds);
  if (!userIds.length) throw new BusinessError(400, '当前标签下无可发放用户');
  const affected = await repo.batchIssueCouponToUsers(couponId, userIds, generateId);
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
  getAllCouponRecords,
  getCouponRecords,
  issueCouponByTag,
};

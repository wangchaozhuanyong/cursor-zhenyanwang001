const { generateId } = require('../../utils/helpers');
const { BusinessError } = require('../../errors/BusinessError');
const repo = require('./adminCoupon.repository');
const { writeAuditLog } = require('../../utils/auditLog');

function formatCouponRow(row) {
  if (!row) return row;
  const r = { ...row };
  r.value = parseFloat(r.value);
  r.min_amount = parseFloat(r.min_amount);
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
  const { code, title, type, value, min_amount, start_date, end_date, description } = body;
  if (!code || !title) throw new BusinessError(400, '编码和标题必填');
  const id = generateId();
  await repo.insertCoupon({
    id, code, title,
    type: type || 'fixed',
    value: value || 0,
    min_amount: min_amount || 0,
    start_date: start_date || new Date().toISOString().slice(0, 10),
    end_date: end_date || '2026-12-31',
    description: description || '',
  });
  const row = await repo.selectCouponById(id);
  await writeAuditLog({ req, operatorId: adminUserId, actionType: 'coupon.create', objectType: 'coupon', objectId: id, summary: `创建优惠券 ${title}`, after: { code, title, type, value, min_amount }, result: 'success' });
  return { data: formatCouponRow(row), message: '创建成功' };
}

async function updateCoupon(id, body, adminUserId, req) {
  const fragments = [];
  const values = [];
  for (const f of ['code', 'title', 'type', 'description', 'start_date', 'end_date']) {
    if (body[f] !== undefined) {
      fragments.push(`${f} = ?`);
      values.push(body[f]);
    }
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

module.exports = {
  listCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  getAllCouponRecords,
  getCouponRecords,
};

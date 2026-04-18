const db = require('../../config/db');
const { generateId } = require('../../utils/helpers');
const repo = require('./adminExtended.repository');
const { writeAuditLog } = require('../../utils/auditLog');
const { assertReturnTransition } = require('../order/returnStateMachine');
const { ORDER_STATUS, RETURN_STATUS } = require('../../constants/status');

function buildReturnListWhere(query) {
  let where = 'WHERE 1=1';
  const params = [];
  if (query.status) { where += ' AND r.status = ?'; params.push(query.status); }
  if (query.keyword) {
    where += ' AND (r.id LIKE ? OR r.order_id LIKE ? OR r.reason LIKE ?)';
    const kw = `%${query.keyword}%`;
    params.push(kw, kw, kw);
  }
  if (query.dateFrom) { where += ' AND r.created_at >= ?'; params.push(query.dateFrom); }
  if (query.dateTo) { where += ' AND r.created_at <= ?'; params.push(`${query.dateTo} 23:59:59`); }
  return { where, params };
}

async function listReturns(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(query.pageSize, 10) || 20));
  const { where, params } = buildReturnListWhere(query);
  const total = await repo.countReturnRequests(where, params);
  const offset = (page - 1) * pageSize;
  const rows = await repo.selectReturnRequestsPage(where, params, pageSize, offset, query.sortBy, query.sortOrder);
  rows.forEach((r) => {
    r.images = typeof r.images === 'string' ? JSON.parse(r.images || '[]') : (r.images || []);
  });
  return { list: rows, total, page, pageSize };
}

async function updateReturnStatus(id, body, adminUserId, req) {
  const { status, admin_remark, refund_amount } = body;
  if (!status) return { error: { code: 400, message: '状态参数必填' } };

  const current = await repo.selectReturnById(id);
  if (!current) return { error: { code: 404, message: '售后单不存在' } };

  try {
    assertReturnTransition(current.status, status);
  } catch (err) {
    await writeAuditLog({ req, operatorId: adminUserId, actionType: 'return.status_update', objectType: 'return_request', objectId: id, summary: '售后状态更新被拦截', before: { status: current.status }, result: 'failure', errorMessage: err.message });
    return { error: { code: 400, message: err.message } };
  }

  const setFragments = ['status = ?'];
  const values = [status];
  if (admin_remark) { setFragments.push('admin_remark = ?'); values.push(admin_remark); }
  if (refund_amount !== undefined) { setFragments.push('refund_amount = ?'); values.push(refund_amount); }
  await repo.updateReturnRequestByFields(setFragments, values, id);
  await writeAuditLog({ req, operatorId: adminUserId, actionType: 'return.status_update', objectType: 'return_request', objectId: id, summary: `售后状态 ${current.status}->${status}`, before: { status: current.status }, after: { status, admin_remark, refund_amount }, result: 'success' });
  return { message: '状态已更新' };
}

async function listBanners() {
  return repo.selectAllBanners();
}

async function createBanner(body, adminUserId, req) {
  const { title, image, link, sort_order, enabled, publish_status } = body;
  if (!image) return { error: { code: 400, message: '图片地址必填' } };
  const id = generateId();
  await repo.insertBanner({ id, title, image, link, sort_order, enabled: enabled !== false ? 1 : 0, publish_status: publish_status || 'published', last_modified_by: adminUserId });
  const row = await repo.selectBannerById(id);
  await writeAuditLog({ req, operatorId: adminUserId, actionType: 'banner.create', objectType: 'banner', objectId: id, summary: `创建Banner ${title || id}`, after: { title, image }, result: 'success' });
  return { data: row, message: '创建成功' };
}

async function updateBanner(id, body, adminUserId, req) {
  const setFragments = [];
  const values = [];
  for (const f of ['title', 'image', 'link']) {
    if (body[f] !== undefined) { setFragments.push(`${f} = ?`); values.push(body[f]); }
  }
  if (body.sort_order !== undefined) { setFragments.push('sort_order = ?'); values.push(body.sort_order); }
  if (body.enabled !== undefined) { setFragments.push('enabled = ?'); values.push(body.enabled ? 1 : 0); }
  if (body.publish_status !== undefined) { setFragments.push('publish_status = ?'); values.push(body.publish_status); }
  setFragments.push('last_modified_by = ?'); values.push(adminUserId);
  setFragments.push('last_modified_at = NOW()');
  if (setFragments.length === 0) return { error: { code: 400, message: '没有需要更新的字段' } };
  await repo.updateBannerByFields(setFragments, values, id);
  await writeAuditLog({ req, operatorId: adminUserId, actionType: 'banner.update', objectType: 'banner', objectId: id, summary: `更新Banner ${id}`, after: body, result: 'success' });
  return { message: '更新成功' };
}

async function deleteBanner(id, adminUserId, req) {
  await repo.deleteBanner(id, adminUserId);
  await writeAuditLog({ req, operatorId: adminUserId, actionType: 'banner.delete', objectType: 'banner', objectId: id, summary: `删除Banner ${id}`, result: 'success' });
  return { message: '已删除' };
}

async function listProductTags() {
  return repo.selectProductTags();
}

async function createProductTag(body, adminUserId, req) {
  const { name } = body;
  if (!name) return { error: { code: 400, message: '标签名称必填' } };
  try {
    const id = generateId();
    await repo.insertProductTag(id, name);
    await writeAuditLog({ req, operatorId: adminUserId, actionType: 'tag.create', objectType: 'product_tag', objectId: id, summary: `创建标签 ${name}`, result: 'success' });
    return { data: { id, name }, message: '创建成功' };
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return { error: { code: 400, message: '标签已存在' } };
    throw err;
  }
}

async function deleteProductTag(id, adminUserId, req) {
  await repo.deleteProductTag(id);
  await writeAuditLog({ req, operatorId: adminUserId, actionType: 'tag.delete', objectType: 'product_tag', objectId: id, summary: `删除标签 ${id}`, result: 'success' });
  return { message: '已删除' };
}

async function getReturnById(id) {
  const row = await repo.selectReturnById(id);
  if (!row) return { error: { code: 404, message: '售后单不存在' } };
  row.images = typeof row.images === 'string' ? JSON.parse(row.images || '[]') : (row.images || []);
  return { data: row };
}

async function approveReturn(id, body, adminUserId, req) {
  const beforeSnapRow = await repo.selectReturnById(id);
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const { refund_amount, admin_remark } = body;

    const ret = await repo.selectReturnByIdConn(conn, id);
    if (!ret) {
      await conn.rollback();
      await writeAuditLog({ req, operatorId: adminUserId, actionType: 'return.approve', objectType: 'return_request', objectId: id, summary: '售后批准失败', result: 'failure', errorMessage: '售后单不存在' });
      return { error: { code: 404, message: '售后单不存在' } };
    }

    if (ret.status !== RETURN_STATUS.PENDING) {
      await conn.rollback();
      const msg = `售后单当前状态为「${ret.status}」，只能在 ${RETURN_STATUS.PENDING} 状态下批准`;
      await writeAuditLog({ req, operatorId: adminUserId, actionType: 'return.approve', objectType: 'return_request', objectId: id, summary: '重复/非法批准被拦截', before: { status: ret.status }, result: 'failure', errorMessage: msg });
      return { error: { code: 400, message: msg } };
    }

    await repo.updateReturnApprovedConn(conn, refund_amount, admin_remark, id);

    const order = await repo.selectOrderByIdConn(conn, ret.order_id);
    if (order) {
      await repo.updateOrderStatusConn(conn, ORDER_STATUS.REFUNDED, order.id);

      const orderItems = await repo.selectOrderItemsConn(conn, order.id);
      for (const oi of orderItems) {
        await repo.addProductStockConn(conn, oi.product_id, oi.qty);
      }

      if (order.total_points > 0) {
        await repo.deductUserPointsConn(conn, order.user_id, order.total_points);
        await repo.insertPointsRecordConn(
          conn,
          generateId(),
          order.user_id,
          'refund',
          -order.total_points,
          `退款扣回 ${order.order_no}`,
        );
      }

      if (order.coupon_uc_id) {
        await repo.restoreUserCouponConn(conn, order.coupon_uc_id);
      }

      await repo.insertNotificationConn(
        conn,
        generateId(),
        order.user_id,
        'order',
        '退款已批准',
        `您的订单 ${order.order_no} 退款已批准，退款金额 RM ${refund_amount || order.total_amount}`,
      );
    }

    await conn.commit();
    await writeAuditLog({
      req,
      operatorId: adminUserId,
      actionType: 'return.approve',
      objectType: 'return_request',
      objectId: id,
      summary: `售后批准退款 订单 ${ret.order_id}`,
      before: beforeSnapRow ? { status: beforeSnapRow.status } : { status: ret.status },
      after: { status: RETURN_STATUS.APPROVED, refund_amount: refund_amount ?? null },
      result: 'success',
    });
    return { message: '已批准' };
  } catch (err) {
    await conn.rollback();
    await writeAuditLog({
      req,
      operatorId: adminUserId,
      actionType: 'return.approve',
      objectType: 'return_request',
      objectId: id,
      summary: '售后批准异常',
      result: 'failure',
      errorMessage: err.message || String(err),
    });
    throw err;
  } finally {
    conn.release();
  }
}

async function rejectReturn(id, body, adminUserId, req) {
  const { admin_remark } = body;
  const beforeSnapRow = await repo.selectReturnById(id);
  try {
    if (!beforeSnapRow) {
      await writeAuditLog({ req, operatorId: adminUserId, actionType: 'return.reject', objectType: 'return_request', objectId: id, summary: '售后拒绝失败', result: 'failure', errorMessage: '售后单不存在' });
      return { error: { code: 404, message: '售后单不存在' } };
    }
    if (beforeSnapRow.status !== RETURN_STATUS.PENDING) {
      const msg = `售后单当前状态为「${beforeSnapRow.status}」，只能在 ${RETURN_STATUS.PENDING} 状态下拒绝`;
      await writeAuditLog({ req, operatorId: adminUserId, actionType: 'return.reject', objectType: 'return_request', objectId: id, summary: '重复/非法拒绝被拦截', before: { status: beforeSnapRow.status }, result: 'failure', errorMessage: msg });
      return { error: { code: 400, message: msg } };
    }
    await repo.updateReturnRejected(id, admin_remark);
    await writeAuditLog({
      req,
      operatorId: adminUserId,
      actionType: 'return.reject',
      objectType: 'return_request',
      objectId: id,
      summary: '售后已拒绝',
      before: { status: beforeSnapRow.status },
      after: { status: RETURN_STATUS.REJECTED, admin_remark: admin_remark || '' },
      result: 'success',
    });
    return { message: '已拒绝' };
  } catch (err) {
    await writeAuditLog({
      req,
      operatorId: adminUserId,
      actionType: 'return.reject',
      objectType: 'return_request',
      objectId: id,
      summary: '售后拒绝失败',
      result: 'failure',
      errorMessage: err.message || String(err),
    });
    throw err;
  }
}

async function listShippingTemplates() {
  const rows = await repo.selectShippingTemplatesRaw();
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    regions: r.regions,
    baseFee: parseFloat(r.base_fee),
    freeAbove: parseFloat(r.free_above),
    extraPerKg: parseFloat(r.extra_per_kg),
    enabled: !!r.enabled,
  }));
}

async function createShippingTemplate(body, adminUserId, req) {
  const { name, regions, baseFee, freeAbove, extraPerKg, enabled } = body;
  if (!name) return { error: { code: 400, message: '名称必填' } };
  const insertId = await repo.insertShippingTemplate([name, regions || '', baseFee || 0, freeAbove || 0, extraPerKg || 0, enabled !== false ? 1 : 0]);
  await writeAuditLog({ req, operatorId: adminUserId, actionType: 'shipping_template.create', objectType: 'shipping_template', objectId: String(insertId), summary: `创建运费模板 ${name}`, result: 'success' });
  return { data: { id: insertId, name }, message: '创建成功' };
}

async function updateShippingTemplate(id, body, adminUserId, req) {
  const map = { name: 'name', regions: 'regions', baseFee: 'base_fee', freeAbove: 'free_above', extraPerKg: 'extra_per_kg' };
  const setFragments = [];
  const values = [];
  for (const [k, col] of Object.entries(map)) {
    if (body[k] !== undefined) { setFragments.push(`${col} = ?`); values.push(body[k]); }
  }
  if (body.enabled !== undefined) { setFragments.push('enabled = ?'); values.push(body.enabled ? 1 : 0); }
  if (setFragments.length === 0) return { error: { code: 400, message: '没有需要更新的字段' } };
  await repo.updateShippingTemplateByFields(setFragments, values, id);
  await writeAuditLog({ req, operatorId: adminUserId, actionType: 'shipping_template.update', objectType: 'shipping_template', objectId: String(id), summary: `更新运费模板 ${id}`, after: body, result: 'success' });
  return { message: '更新成功' };
}

async function deleteShippingTemplate(id, adminUserId, req) {
  await repo.deleteShippingTemplate(id);
  await writeAuditLog({ req, operatorId: adminUserId, actionType: 'shipping_template.delete', objectType: 'shipping_template', objectId: String(id), summary: `删除运费模板 ${id}`, result: 'success' });
  return { message: '已删除' };
}

async function listPointsRules() {
  const rows = await repo.selectPointsRules();
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    action: r.action,
    points: r.points,
    enabled: !!r.enabled,
  }));
}

async function updatePointsRule(id, body, adminUserId, req) {
  const { name, points, enabled } = body;
  const setFragments = [];
  const values = [];
  if (name !== undefined) { setFragments.push('name = ?'); values.push(name); }
  if (points !== undefined) { setFragments.push('points = ?'); values.push(points); }
  if (enabled !== undefined) { setFragments.push('enabled = ?'); values.push(enabled ? 1 : 0); }
  if (setFragments.length === 0) return { error: { code: 400, message: '没有需要更新的字段' } };
  await repo.updatePointsRuleByFields(setFragments, values, id);
  await writeAuditLog({ req, operatorId: adminUserId, actionType: 'points_rule.update', objectType: 'points_rule', objectId: String(id), summary: `更新积分规则 ${name || id}`, after: body, result: 'success' });
  return { message: '规则已更新' };
}

async function listReferralRules() {
  const rows = await repo.selectReferralRules();
  return rows.map((r) => ({
    id: r.id,
    level: r.level,
    name: r.name,
    rewardPercent: parseFloat(r.reward_percent),
    enabled: !!r.enabled,
  }));
}

async function updateReferralRule(id, body, adminUserId, req) {
  const { name, rewardPercent, enabled } = body;
  const setFragments = [];
  const values = [];
  if (name !== undefined) { setFragments.push('name = ?'); values.push(name); }
  if (rewardPercent !== undefined) { setFragments.push('reward_percent = ?'); values.push(rewardPercent); }
  if (enabled !== undefined) { setFragments.push('enabled = ?'); values.push(enabled ? 1 : 0); }
  if (setFragments.length === 0) return { error: { code: 400, message: '没有需要更新的字段' } };
  await repo.updateReferralRuleByFields(setFragments, values, id);
  await writeAuditLog({ req, operatorId: adminUserId, actionType: 'referral_rule.update', objectType: 'referral_rule', objectId: String(id), summary: `更新返现规则 ${name || id}`, after: body, result: 'success' });
  return { message: '规则已更新' };
}

async function listContentPages() {
  const rows = await repo.selectContentPages();
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    slug: r.slug,
    content: r.content || '',
    updatedAt: r.updated_at,
  }));
}

async function updateContentPage(id, body, adminUserId, req) {
  const { title, content } = body;
  const before = await repo.selectContentPageAuditSnapshotById(id);
  if (!before) {
    await writeAuditLog({
      req,
      operatorId: adminUserId,
      actionType: 'content.publish',
      objectType: 'content_page',
      objectId: id,
      summary: '内容更新失败',
      result: 'failure',
      errorMessage: '页面不存在',
    });
    return { error: { code: 404, message: '页面不存在' } };
  }

  const setFragments = [];
  const values = [];
  if (title !== undefined) {
    setFragments.push('title = ?');
    values.push(title);
  }
  if (content !== undefined) {
    setFragments.push('content = ?');
    values.push(content);
  }
  if (body.publish_status !== undefined) {
    setFragments.push('publish_status = ?');
    values.push(body.publish_status);
  }
  setFragments.push('last_modified_by = ?');
  values.push(adminUserId);
  setFragments.push('last_modified_at = NOW()');
  if (setFragments.length === 0) {
    await writeAuditLog({
      req,
      operatorId: adminUserId,
      actionType: 'content.publish',
      objectType: 'content_page',
      objectId: id,
      summary: '内容更新失败',
      result: 'failure',
      errorMessage: '没有需要更新的字段',
    });
    return { error: { code: 400, message: '没有需要更新的字段' } };
  }

  try {
    await repo.updateContentPageByFields(setFragments, values, id);
    await writeAuditLog({
      req,
      operatorId: adminUserId,
      actionType: 'content.publish',
      objectType: 'content_page',
      objectId: id,
      summary: `更新内容页 ${before.slug || id}`,
      before: { title: before.title, content_len: before.content_len },
      after: {
        title: title !== undefined ? title : before.title,
        content_updated: content !== undefined,
      },
      result: 'success',
    });
    return { message: '内容已更新' };
  } catch (err) {
    await writeAuditLog({
      req,
      operatorId: adminUserId,
      actionType: 'content.publish',
      objectType: 'content_page',
      objectId: id,
      summary: '内容更新失败',
      before: { title: before.title, content_len: before.content_len },
      result: 'failure',
      errorMessage: err.message || String(err),
    });
    throw err;
  }
}

module.exports = {
  listReturns,
  updateReturnStatus,
  listBanners,
  createBanner,
  updateBanner,
  deleteBanner,
  listProductTags,
  createProductTag,
  deleteProductTag,
  getReturnById,
  approveReturn,
  rejectReturn,
  listShippingTemplates,
  createShippingTemplate,
  updateShippingTemplate,
  deleteShippingTemplate,
  listPointsRules,
  updatePointsRule,
  listReferralRules,
  updateReferralRule,
  listContentPages,
  updateContentPage,
};

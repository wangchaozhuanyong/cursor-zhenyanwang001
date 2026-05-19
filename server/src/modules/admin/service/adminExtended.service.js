const { generateId, parseProductImages } = require('../../../utils/helpers');
const repo = require('../repository/adminExtended.repository');
const { writeAuditLog } = require('../../../utils/auditLog');
const { ORDER_STATUS, RETURN_STATUS } = require('../../../constants/status');
const { getResolvedTriggerCopy } = require('./notificationTriggerSettings.service');
const { normalizeKnownMojibakeText } = require('../../../utils/textNormalize');

function getUserApi() {
  return /** @type {any} */ (require('../../user')).api || {};
}
function getProductApi() {
  return /** @type {any} */ (require('../../product')).api || {};
}
function getMyinvoisApi() {
  return /** @type {any} */ (require('../../myinvois')).api || {};
}
function getOrderApi() {
  return /** @type {any} */ (require('../../order')).api || {};
}
function getPaymentApi() {
  return /** @type {any} */ (require('../../payment')).api || {};
}

const COLOR_PRESETS = {
  red: { bg_color: '#FEE2E2', text_color: '#B91C1C' },
  green: { bg_color: '#DCFCE7', text_color: '#15803D' },
  blue: { bg_color: '#DBEAFE', text_color: '#1D4ED8' },
  gold: { bg_color: '#FEF3C7', text_color: '#92400E' },
};

function normalizeTagVisual(body = {}) {
  const preset = COLOR_PRESETS[body.color] || COLOR_PRESETS.gold;
  return {
    color: body.color || 'gold',
    bg_color: body.bg_color || preset.bg_color,
    text_color: body.text_color || preset.text_color,
    sort_order: Number.isFinite(Number(body.sort_order)) ? Number(body.sort_order) : 0,
    enabled: body.enabled === false ? 0 : 1,
  };
}

function formatTag(row) {
  const preset = COLOR_PRESETS[row.color] || COLOR_PRESETS.gold;
  return {
    id: row.id,
    name: row.name,
    sort_order: Number(row.sort_order) || 0,
    color: row.color || 'gold',
    bg_color: row.bg_color || preset.bg_color,
    text_color: row.text_color || preset.text_color,
    enabled: row.enabled !== undefined ? !!row.enabled : true,
    count: Number(row.usage_count) || 0,
  };
}

function requireUserApi(name) {
  const fn = getUserApi()[name];
  if (typeof fn !== 'function') {
    throw new Error(`User 模块 API 未暴露方法: ${name}`);
  }
  return fn;
}

function requireProductApi(name) {
  const fn = getProductApi()[name];
  if (typeof fn !== 'function') {
    throw new Error(`Product 模块 API 未暴露方法: ${name}`);
  }
  return fn;
}

function requireMyinvoisApi(name) {
  const fn = getMyinvoisApi()[name];
  if (typeof fn !== 'function') {
    throw new Error(`MyInvois 模块 API 未暴露方法: ${name}`);
  }
  return fn;
}

function requireOrderApi(name) {
  const fn = getOrderApi()[name];
  if (typeof fn !== 'function') {
    throw new Error(`Order 模块 API 未暴露方法: ${name}`);
  }
  return fn;
}

function requirePaymentApi(name) {
  const fn = getPaymentApi()[name];
  if (typeof fn !== 'function') {
    throw new Error(`Payment 模块 API 未暴露方法: ${name}`);
  }
  return fn;
}

function safeClearCatalogCache() {
  try {
    const api = getProductApi();
    if (typeof api.clearCatalogCache === 'function') {
      api.clearCatalogCache();
    }
  } catch (err) {
    // Cache invalidation must not break write-path APIs.
    console.error('[adminExtended] clearCatalogCache skipped:', err?.message || err);
  }
}

function hasPermission(req, code) {
  if (!req?.user) return false;
  if (req.user.isSuperAdmin) return true;
  return Array.isArray(req.user.permissions) && req.user.permissions.includes(code);
}
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

function sanitizeCmsHtml(input) {
  let html = String(input || '');
  // Drop dangerous tags entirely.
  html = html.replace(/<\s*(script|iframe|object|embed|form|input|button|meta|link|style)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '');
  html = html.replace(/<\s*(script|iframe|object|embed|form|input|button|meta|link|style)[^>]*\/?\s*>/gi, '');
  // Remove inline event handlers such as onclick/onerror.
  html = html.replace(/\son[a-z]+\s*=\s*(['"]).*?\1/gi, '');
  html = html.replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, '');
  // Neutralize javascript: and data:text/html URLs.
  html = html.replace(/\s(href|src)\s*=\s*(['"])\s*(javascript:|data:text\/html)/gi, ' $1=$2#');
  return html;
}

async function listReturns(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(query.pageSize, 10) || 20));
  const { where, params } = buildReturnListWhere(query);
  const total = await repo.countReturnRequests(where, params);
  const offset = (page - 1) * pageSize;
  const rows = await repo.selectReturnRequestsPage(where, params, pageSize, offset, query.sortBy, query.sortOrder);
  rows.forEach((r) => {
    r.images = parseProductImages(r.images);
  });
  return { list: rows, total, page, pageSize };
}

async function updateReturnStatus(id, body, adminUserId, req) {
  const { status, admin_remark, refund_amount } = body;
  if (!status) return { error: { code: 400, message: '状态参数必填' } };

  const current = await repo.selectReturnById(id);
  if (!current) return { error: { code: 404, message: '售后单不存在' } };

  try {
    requireOrderApi('assertReturnTransition')(current.status, status);
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
  safeClearCatalogCache();
  await writeAuditLog({ req, operatorId: adminUserId, actionType: 'banner.create', objectType: 'banner', objectId: id, summary: `创建 Banner ${title || id}`, after: { title, image }, result: 'success' });
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
  safeClearCatalogCache();
  await writeAuditLog({ req, operatorId: adminUserId, actionType: 'banner.update', objectType: 'banner', objectId: id, summary: `更新 Banner ${id}`, after: body, result: 'success' });
  return { message: '更新成功' };
}

async function deleteBanner(id, adminUserId, req) {
  await repo.deleteBanner(id, adminUserId);
  safeClearCatalogCache();
  await writeAuditLog({ req, operatorId: adminUserId, actionType: 'banner.delete', objectType: 'banner', objectId: id, summary: `鍒犻櫎Banner ${id}`, result: 'success' });
  return { message: '已删除' };
}

async function listProductTags() {
  const rows = await repo.selectProductTags();
  return rows.map(formatTag);
}

async function createProductTag(body, adminUserId, req) {
  const { name } = body;
  if (!name) return { error: { code: 400, message: '标签名称必填' } };
  try {
    const id = generateId();
    const visual = normalizeTagVisual(body);
    await repo.insertProductTag(id, name, visual.color, visual.bg_color, visual.text_color, visual.sort_order, visual.enabled);
    await writeAuditLog({ req, operatorId: adminUserId, actionType: 'tag.create', objectType: 'product_tag', objectId: id, summary: `创建标签 ${name}`, result: 'success' });
    const row = await repo.selectProductTagById(id);
    return { data: formatTag(row || { id, name, ...visual }), message: '创建成功' };
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return { error: { code: 400, message: '标签已存在' } };
    throw err;
  }
}

async function updateProductTag(id, body, adminUserId, req) {
  const fields = [];
  const values = [];
  const visual = normalizeTagVisual(body);
  if (body.name !== undefined) {
    if (!body.name) return { error: { code: 400, message: '标签名称必填' } };
    fields.push('name = ?');
    values.push(body.name);
  }
  for (const [key, value] of Object.entries(visual)) {
    if (body[key] !== undefined || (key === 'bg_color' && body.color !== undefined) || (key === 'text_color' && body.color !== undefined)) {
      fields.push(`${key} = ?`);
      values.push(value);
    }
  }
  if (!fields.length) return { error: { code: 400, message: '没有需要更新的字段' } };
  await repo.updateProductTag(id, fields, values);
  await writeAuditLog({ req, operatorId: adminUserId, actionType: 'tag.update', objectType: 'product_tag', objectId: id, summary: `更新标签 ${id}`, after: body, result: 'success' });
  const row = await repo.selectProductTagById(id);
  return { data: formatTag(row), message: '已保存' };
}

async function deleteProductTag(id, adminUserId, req) {
  await repo.deleteProductTag(id);
  await writeAuditLog({ req, operatorId: adminUserId, actionType: 'tag.delete', objectType: 'product_tag', objectId: id, summary: `删除标签 ${id}`, result: 'success' });
  return { message: '已删除' };
}

async function getReturnById(id) {
  const row = await repo.selectReturnDetailById(id);
  if (!row) return { error: { code: 404, message: '售后单不存在' } };
  row.images = parseProductImages(row.images);
  const paymentRecords = row.order_id ? await repo.selectPaymentEventsByOrderId(row.order_id) : [];
  const inventoryRecords = await repo.selectInventoryRecordsByReturnId(row.id, row.order_id);
  const operationLogs = await repo.selectAuditLogsByReturnId(row.id);
  return {
    data: {
      ...row,
      user_info: {
        id: row.user_id,
        name: row.user_name || '',
        email: row.user_email || '',
        phone: row.user_phone || '',
      },
      order_info: {
        id: row.order_id,
        order_no: row.order_no_snapshot || row.order_no || '',
        total_amount: Number(row.order_total_amount || 0),
        payment_status: row.order_payment_status || '',
        status: row.order_status || '',
        refund_status: row.order_refund_status || '',
        created_at: row.order_created_at || null,
      },
      item_info: {
        order_item_id: row.order_item_id || '',
        product_id: row.product_id || '',
        variant_id: row.variant_id || '',
        product_name: row.order_item_product_name || row.product_name || '',
        product_image: row.order_item_product_image || '',
        unit_price: Number(row.order_item_price || 0),
        purchased_qty: Number(row.order_item_qty || 0),
        request_qty: Number(row.quantity || 0),
        variant_name: row.order_item_variant_name || row.variant_title || '',
        sku_code: row.order_item_sku_code || row.variant_sku_code || row.sku_code || '',
      },
      refund_records: paymentRecords,
      inventory_restore_records: inventoryRecords,
      operation_logs: operationLogs,
    },
  };
}

async function approveReturn(id, body, adminUserId, req) {
  const beforeSnapRow = await repo.selectReturnById(id);
  const conn = await repo.getConnection();
  try {
    await conn.beginTransaction();
    const {
      refund_amount,
      admin_remark,
      refund_mode = 'none',
      restore_stock = false,
      restore_coupon = false,
      reverse_points = false,
      reverse_rewards = false,
    } = body || {};

    const ret = await repo.selectReturnByIdConn(conn, id);
    if (!ret) {
      await conn.rollback();
      return { error: { code: 404, message: '售后单不存在' } };
    }
    if (ret.status !== RETURN_STATUS.PENDING) {
      await conn.rollback();
      return { error: { code: 400, message: `售后单当前状态为「${ret.status}」，仅允许在 ${RETURN_STATUS.PENDING} 状态下批准` } };
    }

    const order = await repo.selectOrderByIdConn(conn, ret.order_id);
    if (!order) {
      await conn.rollback();
      return { error: { code: 404, message: '关联订单不存在' } };
    }

    const orderTotal = Number(order.total_amount || 0);
    const refundAmount = Number(refund_amount ?? 0);
    if (!Number.isFinite(refundAmount) || refundAmount < 0) {
      await conn.rollback();
      return { error: { code: 400, message: '退款金额必须大于等于 0' } };
    }
    if (refundAmount > orderTotal) {
      await conn.rollback();
      return { error: { code: 400, message: '退款金额不能超过订单实付金额' } };
    }

    if (refundAmount > 0 && !hasPermission(req, 'payment.manage')) {
      await conn.rollback();
      return { error: { code: 403, message: '无 payment.manage 权限，不能执行退款记录' } };
    }
    if (restore_stock && !(hasPermission(req, 'inventory.update') || hasPermission(req, 'inventory.manage'))) {
      await conn.rollback();
      return { error: { code: 403, message: '无 inventory.update 权限，不能执行库存恢复' } };
    }

    const nextReturnStatus = refundAmount > 0 ? RETURN_STATUS.REFUND_PENDING : RETURN_STATUS.APPROVED;
    await repo.updateReturnByFieldsConn(
      conn,
      ['status = ?', 'refund_amount = ?', 'admin_remark = ?'],
      [nextReturnStatus, refundAmount, admin_remark || ''],
      id,
    );

    if (restore_stock) {
      const qty = Math.max(0, Number(ret.quantity || 0));
      if (qty > 0) {
        if (ret.variant_id) {
          await repo.restoreVariantStockByReturnConn(conn, ret.variant_id, qty, {
            returnId: id,
            operatorId: adminUserId,
            orderNo: order.order_no,
            reason: `售后恢复库存 ${id}`,
            remark: admin_remark || '',
          });
        } else if (ret.product_id) {
          await repo.addProductStockFallbackConn(conn, ret.product_id, qty);
        }
      }
    }

    if (restore_coupon && order.coupon_uc_id) {
      await repo.restoreUserCouponConn(conn, order.coupon_uc_id);
    }
    if (reverse_points) {
      await requireUserApi('reverseOrderPoints')(conn, order, `售后单 ${id} 审核通过，积分回滚`, {
        operatorId: adminUserId,
        trigger: 'return_approved',
      });
    }
    if (reverse_rewards) {
      await requireUserApi('reverseOrderRewards')(conn, order, `售后单 ${id} 审核通过，返现冲正`, {
        operatorId: adminUserId,
        trigger: 'return_approved',
      });
    }

    await conn.commit();

    if (refundAmount > 0) {
      await requirePaymentApi('recordRefundByAdmin')(req, order.id, {
        amount: refundAmount,
        mode: refund_mode === 'provider' ? 'provider' : 'manual',
        reason: admin_remark || `售后单 ${id} 退款`,
        refund_reference: `return_${id}_${Date.now()}`,
      });
      await repo.updateReturnRequestByFields(['status = ?'], [RETURN_STATUS.REFUNDED], id);
    }

    const retCopy = await getResolvedTriggerCopy('return_approved', {
      order_no: order.order_no,
      refund_amount: String(refundAmount),
    });
    if (retCopy) {
      await repo.insertNotificationConn(
        null,
        generateId(),
        order.user_id,
        'order',
        retCopy.title,
        retCopy.content,
      );
    }

    await writeAuditLog({
      req,
      operatorId: adminUserId,
      actionType: 'return.approve',
      objectType: 'return_request',
      objectId: id,
      summary: `售后批准处理 ${ret.order_id}`,
      before: beforeSnapRow ? { status: beforeSnapRow.status } : { status: ret.status },
      after: {
        status: refundAmount > 0 ? RETURN_STATUS.REFUNDED : RETURN_STATUS.APPROVED,
        refund_amount: refundAmount,
        refund_mode,
        restore_stock,
        restore_coupon,
        reverse_points,
        reverse_rewards,
      },
      result: 'success',
    });

    if (refundAmount > 0) {
      try {
        await requireMyinvoisApi('enqueueRefundCreditNoteIfEnabled')({
          returnId: id,
          refundAmount,
        }, 'return_approved');
      } catch (e) {
        console.error('[MyInvois] enqueue credit note after return approval failed:', e?.message || e);
      }
    }

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
  const { admin_remark } = body || {};
  if (!admin_remark || !String(admin_remark).trim()) {
    return { error: { code: 400, message: '拒绝原因不能为空' } };
  }
  const beforeSnapRow = await repo.selectReturnById(id);
  try {
    if (!beforeSnapRow) {
      await writeAuditLog({ req, operatorId: adminUserId, actionType: 'return.reject', objectType: 'return_request', objectId: id, summary: '售后拒绝失败', result: 'failure', errorMessage: '售后单不存在' });
      return { error: { code: 404, message: '售后单不存在' } };
    }
    if (beforeSnapRow.status !== RETURN_STATUS.PENDING) {
      const msg = `售后单当前状态为「${beforeSnapRow.status}」，仅允许在 ${RETURN_STATUS.PENDING} 状态下拒绝`;
      await writeAuditLog({ req, operatorId: adminUserId, actionType: 'return.reject', objectType: 'return_request', objectId: id, summary: '重复/非法拒绝被拦截', before: { status: beforeSnapRow.status }, result: 'failure', errorMessage: msg });
      return { error: { code: 400, message: msg } };
    }
    await repo.updateReturnRejected(id, String(admin_remark).trim());
    await writeAuditLog({
      req,
      operatorId: adminUserId,
      actionType: 'return.reject',
      objectType: 'return_request',
      objectId: id,
      summary: '售后已拒绝',
      before: { status: beforeSnapRow.status },
      after: { status: RETURN_STATUS.REJECTED, admin_remark: String(admin_remark).trim() },
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
    name: normalizeKnownMojibakeText(r.name),
    regions: normalizeKnownMojibakeText(r.regions),
    baseFee: parseFloat(r.base_fee),
    freeAbove: parseFloat(r.free_above),
    extraPerKg: parseFloat(r.extra_per_kg),
    enabled: !!r.enabled,
    isDefault: !!Number(r.is_default),
  }));
}

async function createShippingTemplate(body, adminUserId, req) {
  const { name, regions, baseFee, freeAbove, extraPerKg, enabled, isDefault } = body;
  if (!name) return { error: { code: 400, message: '名称必填' } };
  const rowsBefore = await repo.selectShippingTemplatesRaw();
  const makeActive = rowsBefore.length === 0 || isDefault === true;
  const insertId = await repo.insertShippingTemplate([
    name,
    regions || '',
    baseFee || 0,
    freeAbove || 0,
    extraPerKg || 0,
    makeActive ? 1 : 0,
  ]);
  if (makeActive) {
    await repo.activateShippingTemplateAsDefault(insertId);
  } else {
    await repo.ensureShippingTemplateHasDefault();
  }
  await writeAuditLog({ req, operatorId: adminUserId, actionType: 'shipping_template.create', objectType: 'shipping_template', objectId: String(insertId), summary: `创建运费模板 ${name}`, result: 'success' });
  return { data: { id: insertId, name }, message: '创建成功' };
}

async function updateShippingTemplate(id, body, adminUserId, req) {
  const existing = await repo.selectShippingTemplateByIdAny(id);
  if (!existing) return { error: { code: 404, message: '运费模板不存在' } };

  const wantsDefault = body.isDefault === true || body.enabled === true;
  const wantsDisable = body.enabled === false;

  if (wantsDisable && !wantsDefault) {
    const allTemplates = await repo.selectShippingTemplatesRaw();
    if (allTemplates.length <= 1) {
      return { error: { code: 400, message: '至少保留一个生效中的运费模板' } };
    }
    if (existing.is_default) {
      return { error: { code: 400, message: '请先切换其他模板为默认生效，再停用当前模板' } };
    }
  }

  const map = { name: 'name', regions: 'regions', baseFee: 'base_fee', freeAbove: 'free_above', extraPerKg: 'extra_per_kg' };
  const setFragments = [];
  const values = [];
  for (const [k, col] of Object.entries(map)) {
    if (body[k] !== undefined) { setFragments.push(`${col} = ?`); values.push(body[k]); }
  }

  if (wantsDefault) {
    await repo.activateShippingTemplateAsDefault(id);
  } else if (wantsDisable) {
    setFragments.push('enabled = ?', 'is_default = ?');
    values.push(0, 0);
  } else if (body.enabled !== undefined) {
    setFragments.push('enabled = ?');
    values.push(body.enabled ? 1 : 0);
  }

  if (setFragments.length > 0) {
    await repo.updateShippingTemplateByFields(setFragments, values, id);
  }

  if (wantsDisable) {
    await repo.ensureShippingTemplateHasDefault();
  }

  await writeAuditLog({ req, operatorId: adminUserId, actionType: 'shipping_template.update', objectType: 'shipping_template', objectId: String(id), summary: `更新运费模板 ${id}`, after: body, result: 'success' });
  return { message: '更新成功' };
}

async function deleteShippingTemplate(id, adminUserId, req) {
  const existing = await repo.selectShippingTemplateByIdAny(id);
  if (!existing) return { error: { code: 404, message: '运费模板不存在' } };
  const wasDefault = !!existing.is_default;
  await repo.deleteShippingTemplate(id);
  if (wasDefault) {
    await repo.ensureShippingTemplateHasDefault();
  }
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
    content: r.body || '',
    publish_status: r.publish_status || 'published',
    updatedAt: r.last_modified_at || null,
  }));
}

async function createContentPage(body, adminUserId, req) {
  const title = String(body?.title || '').trim();
  const slug = String(body?.slug || '').trim().toLowerCase();
  const content = sanitizeCmsHtml(String(body?.content || '').trim());
  const publishStatus = body?.publish_status === 'draft' ? 'draft' : 'published';

  if (!title) return { error: { code: 400, message: '标题不能为空' } };
  if (!content) return { error: { code: 400, message: '正文不能为空' } };
  if (!slug) return { error: { code: 400, message: 'slug 不能为空' } };
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return { error: { code: 400, message: 'slug 仅允许小写字母、数字和中横线' } };
  }

  const exists = await repo.selectContentPageBySlug(slug);
  if (exists) return { error: { code: 409, message: 'slug 已存在' } };

  const id = generateId();
  await repo.insertContentPage({
    id,
    slug,
    title,
    body: content,
    publish_status: publishStatus,
    last_modified_by: adminUserId || null,
  });

  await writeAuditLog({
    req,
    operatorId: adminUserId,
    actionType: 'content.create',
    objectType: 'content_page',
    objectId: id,
    summary: `创建内容页 ${slug}`,
    after: { slug, title, publish_status: publishStatus },
    result: 'success',
  });

  return {
    data: {
      id,
      slug,
      title,
      content,
      publish_status: publishStatus,
      updatedAt: new Date().toISOString(),
    },
    message: '内容页已创建',
  };
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
    setFragments.push('body = ?');
    values.push(sanitizeCmsHtml(String(content)));
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
  updateProductTag,
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
  createContentPage,
  updateContentPage,
  _sanitizeCmsHtmlForTest: sanitizeCmsHtml,
};










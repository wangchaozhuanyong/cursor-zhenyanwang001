const { generateId, parseProductImages } = require('../../../utils/helpers');
const repo = require('../repository/adminExtended.repository');
const { writeAuditLog } = require('../../../utils/auditLog');
const { ORDER_STATUS, RETURN_STATUS } = require('../../../constants/status');
const { getResolvedTriggerCopy } = require('./notificationTriggerSettings.service');
const adminEventBus = require('./adminEventBus.service');
const { normalizeKnownMojibakeText } = require('../../../utils/textNormalize');
const { sanitizeCmsHtml } = require('../../../utils/cmsSanitizer');
const orderPoints = require('../../order/service/orderPoints.service');

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

const DEFAULT_LEGAL_PAGES = [
  {
    slug: 'privacy-policy',
    title: '隐私政策',
    body: `
<h2>平台信息</h2>
<p>本页面用于说明本平台在提供服务过程中对用户信息的处理规则。</p>
<h2>我们可能收集的信息</h2>
<p>包括账号信息、联系方式、订单与服务沟通记录、必要的设备与日志信息。</p>
<h2>我们如何使用你的信息</h2>
<p>用于订单处理、客服沟通、服务办理、售后支持和必要合规处理。</p>
<h2>Cookie 和类似技术</h2>
<p>平台可能使用 Cookie 或类似技术以保障登录状态、提升访问体验与安全性。</p>
<h2>信息共享与披露</h2>
<p>仅在履约、合规要求或经用户授权场景下进行必要披露。</p>
<h2>信息保存期限</h2>
<p>在满足业务与法律要求的前提下保留必要期限，到期后按规则处理。</p>
<h2>信息安全</h2>
<p>平台采取合理的管理与技术措施保护用户信息安全。</p>
<h2>用户权利</h2>
<p>你可申请查询、更正或删除相关资料，具体以客服处理流程为准。</p>
<h2>未成年人隐私</h2>
<p>平台重视未成年人保护，不面向未成年人推广受限制内容。</p>
<h2>第三方链接</h2>
<p>第三方页面由其自行负责，建议用户同时查看对应隐私说明。</p>
<h2>跨境处理</h2>
<p>如涉及跨境处理，将遵循适用法律法规并采取必要保护措施。</p>
<h2>政策更新</h2>
<p>本政策可能根据业务或法规变化更新，更新后以页面公示版本为准。</p>
<h2>联系我们</h2>
<p>如对隐私事项有疑问，请通过平台客服渠道联系我们。</p>
`,
  },
  {
    slug: 'terms-of-service',
    title: '用户协议',
    body: `
<h2>平台定位</h2>
<p>本平台提供商品、服务信息、咨询协助与客户支持信息。</p>
<h2>用户资格</h2>
<p>用户需具备完全民事行为能力并遵守所在地适用法律法规。</p>
<h2>账户与信息真实性</h2>
<p>用户应提供真实、准确、完整的信息并及时更新。</p>
<h2>服务咨询说明</h2>
<p>平台提供服务咨询与流程协助，不承诺签证、留学、第二家园等结果。</p>
<h2>商品信息说明</h2>
<p>页面信息用于展示与说明，具体库存、价格、可配送范围以确认结果为准。</p>
<h2>受监管商品与年龄限制</h2>
<p>受限制内容仅面向符合法定年龄且符合地区规定的用户展示与处理。</p>
<h2>订单与付款</h2>
<p>订单提交后需结合库存、地区和服务条件确认，付款规则以页面与客服说明为准。</p>
<h2>配送、售后和退款</h2>
<p>相关规则以退款与售后政策、配送说明及具体订单约定为准。</p>
<h2>用户禁止行为</h2>
<p>禁止发布违法信息、恶意下单、滥用平台功能或侵害他人合法权益。</p>
<h2>知识产权</h2>
<p>平台内容受法律保护，未经许可不得擅自复制、传播或商用。</p>
<h2>第三方服务</h2>
<p>部分服务由第三方提供，平台会在必要范围内进行说明或对接。</p>
<h2>免责声明</h2>
<p>在法律允许范围内，平台对不可抗力或第三方原因导致的延误不承担超出法定责任。</p>
<h2>责任限制</h2>
<p>平台责任范围以法律规定和双方确认的服务内容为边界。</p>
<h2>协议变更</h2>
<p>协议可根据业务和法规更新，更新后公示版本生效。</p>
<h2>适用法律与争议处理</h2>
<p>争议处理遵循适用法律与双方约定方式执行。</p>
<h2>联系方式</h2>
<p>如有疑问，请通过平台客服渠道联系。</p>
`,
  },
  {
    slug: 'refund-policy',
    title: '退款与售后政策',
    body: `
<h2>适用范围</h2>
<p>本政策适用于平台商品与服务相关订单的售后与退款处理。</p>
<h2>退款与售后基本原则</h2>
<p>平台基于订单状态、商品或服务性质、履约进度和证据材料综合判断。</p>
<h2>普通商品退换条件</h2>
<p>未使用且不影响二次销售的商品，可在规则期限内申请处理。</p>
<h2>不支持无理由退换的情况</h2>
<p>包括定制类、已拆封影响二次销售、法律法规限制退换等情形。</p>
<h2>服务类订单退款规则</h2>
<p>按服务开始情况、资料提交进度及第三方已产生费用综合判定。</p>
<h2>商品问题处理</h2>
<p>请提供订单号、问题描述与图片信息，客服将协助核实处理。</p>
<h2>退款流程</h2>
<p>申请受理、审核确认、结果通知、原路或约定路径退款。</p>
<h2>运费承担</h2>
<p>根据具体责任归属、平台规则和订单约定确定。</p>
<h2>受监管商品售后</h2>
<p>需同时满足年龄、地区与法规要求，按合规规则执行。</p>
<h2>恶意售后与滥用</h2>
<p>平台有权对异常行为采取限制措施并保留追责权利。</p>
<h2>联系我们</h2>
<p>如需售后支持，请通过平台客服渠道联系。</p>
`,
  },
  {
    slug: 'shipping-policy',
    title: '配送说明',
    body: `
<h2>配送范围</h2>
<p>配送范围依据商品属性、地区限制和物流能力确定。</p>
<h2>订单处理时间</h2>
<p>订单确认后进入处理流程，具体时效受库存与服务安排影响。</p>
<h2>发货时间</h2>
<p>发货时点以订单确认结果和仓配排期为准。</p>
<h2>配送方式</h2>
<p>平台将按商品特点和地区条件匹配合适的配送方式。</p>
<h2>物流信息查询</h2>
<p>发货后可通过订单详情或客服获取物流状态。</p>
<h2>收货信息要求</h2>
<p>请确保收件信息准确完整，避免配送延误。</p>
<h2>签收与验货</h2>
<p>建议收货时核对外包装和商品状态，异常请尽快反馈。</p>
<h2>配送失败</h2>
<p>因地址错误、无人签收等导致失败时，按规则协商重派或处理。</p>
<h2>特殊商品配送限制</h2>
<p>受限制商品或服务可能存在额外配送或地区要求。</p>
<h2>服务类订单说明</h2>
<p>服务类订单不适用实物配送逻辑，以服务约定为准。</p>
<h2>不可抗力</h2>
<p>因天气、政策、公共事件等导致的延误，平台将尽力协调处理。</p>
<h2>联系我们</h2>
<p>如需配送协助，请通过平台客服渠道联系。</p>
`,
  },
  {
    slug: 'compliance-notice',
    title: '合规与年龄限制说明',
    body: `
<h2>平台合规原则</h2>
<p>平台遵循适用法律法规，持续完善内容展示与交易合规管理。</p>
<h2>受限制内容范围</h2>
<p>可能包含受年龄、地区或监管规则限制的商品或服务信息。</p>
<h2>未成年人保护</h2>
<p>平台不面向未成年人展示、推荐或处理受限制商品或服务。</p>
<h2>年龄确认</h2>
<p>用户应确认已达到当地法律要求年龄后再进行相关浏览与咨询。</p>
<h2>地区适用说明</h2>
<p>页面展示不代表所有地区均可购买、配送、咨询或办理。</p>
<h2>受监管商品处理规则</h2>
<p>此类内容默认采取更严格展示与索引策略，并根据规则限制处理。</p>
<h2>用户责任</h2>
<p>用户应确保自身年龄与所在地区符合法律法规及平台规则要求。</p>
<h2>平台权利</h2>
<p>平台有权对不符合要求的访问、咨询或交易行为进行限制。</p>
<h2>页面信息性质</h2>
<p>页面信息用于说明与合规提示，不构成对不适格用户的推广。</p>
<h2>投诉与举报</h2>
<p>如发现违规内容，可通过平台客服渠道投诉举报。</p>
<h2>说明更新</h2>
<p>本说明可根据法规与业务变化更新，更新后以公示版本为准。</p>
<h2>联系我们</h2>
<p>如有合规相关问题，请通过平台客服渠道联系。</p>
`,
  },
];

async function ensureDefaultLegalContentPages() {
  for (const page of DEFAULT_LEGAL_PAGES) {
    const existing = await repo.selectContentPageBySlug(page.slug);
    if (existing) continue;
    await repo.insertContentPage({
      id: generateId(),
      slug: page.slug,
      title: page.title,
      body: sanitizeCmsHtml(page.body),
      publish_status: 'published',
      last_modified_by: null,
    });
  }
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
  adminEventBus.publishAdminEvent({
    type: 'return.updated',
    objectId: id,
    summary: `售后状态 ${current.status} -> ${status}`,
  });
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
  await writeAuditLog({ req, operatorId: adminUserId, actionType: 'banner.delete', objectType: 'banner', objectId: id, summary: `删除Banner ${id}`, result: 'success' });
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
    safeClearCatalogCache();
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
  safeClearCatalogCache();
  return { data: formatTag(row), message: '已保存' };
}

async function deleteProductTag(id, adminUserId, req) {
  await repo.deleteProductTag(id);
  await writeAuditLog({ req, operatorId: adminUserId, actionType: 'tag.delete', objectType: 'product_tag', objectId: id, summary: `删除标签 ${id}`, result: 'success' });
  safeClearCatalogCache();
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
      reverse_points = true,
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

    const isFullRefund = refundAmount > 0 && refundAmount >= orderTotal;
    const partialPointsNote = '';

    if (refundAmount > 0) {
      await requirePaymentApi('recordRefundByAdmin')(req, order.id, {
        amount: refundAmount,
        mode: refund_mode === 'provider' ? 'provider' : 'manual',
        reason: admin_remark || `售后单 ${id} 退款`,
        refund_reference: `return_${id}_${Date.now()}`,
        restore_stock: false,
        restore_coupon,
        reverse_points,
        reverse_rewards,
        decrement_sales: isFullRefund,
        reverse_wallet: isFullRefund,
      }, conn);
      await repo.updateReturnByFieldsConn(
        conn,
        ['status = ?'],
        [RETURN_STATUS.REFUNDED],
        id,
      );
    } else if (reverse_rewards) {
      await requireUserApi('reverseOrderRewards')(conn, order, `售后单 ${id} 审核通过，返现冲正`, {
        operatorId: adminUserId,
        trigger: 'return_approved',
      });
    }

    await conn.commit();
    adminEventBus.publishAdminEvent({
      type: refundAmount > 0 ? 'order.refunded' : 'return.updated',
      objectId: ret.order_id || id,
      summary: refundAmount > 0 ? `订单退款 ${ret.order_id}` : `售后批准 ${id}`,
    });

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
        partial_points_note: partialPointsNote,
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

    return { message: partialPointsNote ? `已批准。${partialPointsNote}` : '已批准' };
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
    adminEventBus.publishAdminEvent({
      type: 'return.updated',
      objectId: id,
      summary: '售后已拒绝',
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
  ensureDefaultLegalContentPages,
  _sanitizeCmsHtmlForTest: sanitizeCmsHtml,
};









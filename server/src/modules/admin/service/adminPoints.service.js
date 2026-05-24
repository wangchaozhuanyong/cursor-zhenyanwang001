const { generateId } = require('../../../utils/helpers');
const { ValidationError, NotFoundError } = require('../../../errors');
const { writeAuditLog } = require('../../../utils/auditLog');
const repo = require('../repository/adminPoints.repository');

function getUserApi() {
  return /** @type {any} */ (require('../../user')).api || {};
}

function requireUserApi(name) {
  const fn = getUserApi()[name];
  if (typeof fn !== 'function') {
    throw new Error(`User 模块 API 未暴露方法：${name}`);
  }
  return fn;
}

function getLoyaltyApi() {
  return /** @type {any} */ (require('../../loyalty')).api || {};
}

function requireLoyaltyApi(name) {
  const fn = getLoyaltyApi()[name];
  if (typeof fn !== 'function') {
    throw new Error(`Loyalty module API missing method: ${name}`);
  }
  return fn;
}

function toBool(value) {
  return value === true || value === 1 || value === '1';
}

function compactDefined(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}

function normalizePaymentMethods(value) {
  if (Array.isArray(value)) return value.map((x) => String(x || '').trim()).filter(Boolean);
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map((x) => String(x || '').trim()).filter(Boolean);
    } catch {
      return value.split(',').map((x) => x.trim()).filter(Boolean);
    }
  }
  return [];
}

function normalizeSettingsBody(body = {}) {
  const pointValue = Number(body.point_value_myr ?? body.pointValueMyr ?? 0.01);
  const normalizedPointValue = Number.isFinite(pointValue) && pointValue > 0 ? pointValue : 0.01;
  return {
    display_enabled: body.display_enabled ?? body.displayEnabled,
    earn_enabled: body.earn_enabled ?? body.earnEnabled,
    redeem_enabled: body.redeem_enabled ?? body.redeemEnabled,
    earn_mode: body.earn_mode ?? body.earnMode,
    earn_currency_unit: body.earn_currency_unit ?? body.earnCurrencyUnit,
    earn_points_unit: body.earn_points_unit ?? body.earnPointsUnit,
    earn_rounding: body.earn_rounding ?? body.earnRounding,
    earn_after_discount: body.earn_after_discount ?? body.earnAfterDiscount,
    earn_after_points_redeem: body.earn_after_points_redeem ?? body.earnAfterPointsRedeem,
    promotion_no_points: body.promotion_no_points ?? body.promotionNoPoints,
    marketing_activity_no_points: body.marketing_activity_no_points ?? body.marketingActivityNoPoints,
    coupon_no_points: body.coupon_no_points ?? body.couponNoPoints,
    member_price_no_points: body.member_price_no_points ?? body.memberPriceNoPoints,
    payment_points_mode: body.payment_points_mode ?? body.paymentPointsMode,
    allowed_payment_methods: body.allowed_payment_methods ?? body.allowedPaymentMethods,
    redeem_scope: body.redeem_scope ?? body.redeemScope,
    point_value_myr: normalizedPointValue,
    points_per_currency: Math.max(1, Math.round(1 / normalizedPointValue)),
    min_redeem_points: body.min_redeem_points ?? body.minRedeemPoints,
    redeem_step: body.redeem_step ?? body.redeemStep,
    max_redeem_percent: body.max_redeem_percent ?? body.maxRedeemPercent,
    max_redeem_amount: body.max_redeem_amount ?? body.maxRedeemAmount,
    min_order_amount: body.min_order_amount ?? body.minOrderAmount,
    allow_with_coupon: body.allow_with_coupon ?? body.allowWithCoupon,
    allow_with_reward_cash: body.allow_with_reward_cash ?? body.allowWithRewardCash,
    zero_pay_allowed: body.zero_pay_allowed ?? body.zeroPayAllowed,
    settle_timing: body.settle_timing ?? body.settleTiming ?? 'order_completed',
    expire_enabled: body.expire_enabled ?? body.expireEnabled,
    expire_days: body.expire_days ?? body.expireDays,
    allow_negative_points: body.allow_negative_points ?? body.allowNegativePoints,
  };
}

function normalizeRuleBody(body = {}) {
  return {
    name: body.name,
    scope_type: body.scope_type || 'all',
    scope_id: body.scope_id || null,
    priority: Number(body.priority ?? 100),
    earn_enabled: body.earn_enabled === undefined ? 1 : (toBool(body.earn_enabled) ? 1 : 0),
    earn_mode: body.earn_mode || 'inherit',
    fixed_points: Number(body.fixed_points || 0),
    points_percent: Number(body.points_percent || 0),
    multiplier_percent: Number(body.multiplier_percent || 100),
    redeem_enabled: body.redeem_enabled === undefined ? 1 : (toBool(body.redeem_enabled) ? 1 : 0),
    max_redeem_percent: body.max_redeem_percent === '' || body.max_redeem_percent === undefined ? null : Number(body.max_redeem_percent),
    start_at: body.start_at || null,
    end_at: body.end_at || null,
    enabled: body.enabled === undefined ? 1 : (toBool(body.enabled) ? 1 : 0),
  };
}

function buildSettingsUpdate(input) {
  const boolKeys = new Set([
    'display_enabled',
    'earn_enabled',
    'redeem_enabled',
    'earn_after_discount',
    'earn_after_points_redeem',
    'promotion_no_points',
    'marketing_activity_no_points',
    'coupon_no_points',
    'member_price_no_points',
    'allow_with_coupon',
    'allow_with_reward_cash',
    'zero_pay_allowed',
    'expire_enabled',
    'allow_negative_points',
  ]);
  const fields = [];
  const values = [];
  for (const [key, value] of Object.entries(input)) {
    fields.push(`${key} = ?`);
    values.push(
      key === 'allowed_payment_methods'
        ? JSON.stringify(normalizePaymentMethods(value))
        : boolKeys.has(key) ? (toBool(value) ? 1 : 0) : value,
    );
  }
  return { fields, values };
}

async function listRecords(query) {
  return requireUserApi('getAdminPointsRecords')(query);
}

async function getSettings() {
  return repo.selectSettings();
}

async function updateSettings(body, req) {
  const before = await repo.selectSettings();
  const input = compactDefined(normalizeSettingsBody(body));
  const { fields, values } = buildSettingsUpdate(input);
  await repo.updateSettings(fields, values);
  const after = await repo.selectSettings();
  await writeAuditLog({
    req,
    operatorId: req.user?.id,
    actionType: 'points.settings.update',
    objectType: 'loyalty_points_settings',
    objectId: '1',
    summary: '更新积分全局设置',
    before,
    after,
    result: 'success',
  });
  return after;
}

async function listProductRules(query = {}) {
  const page = Math.max(1, Number(query.page || 1));
  const pageSize = Math.min(100, Math.max(1, Number(query.pageSize || 20)));
  const filters = {
    scope_type: query.scope_type || '',
    scope_id: query.scope_id || '',
    enabled: query.enabled !== undefined && query.enabled !== '' ? (toBool(query.enabled) ? 1 : 0) : '',
    keyword: query.keyword || '',
  };
  const total = await repo.countProductRules(filters);
  const list = await repo.selectProductRulesPage(filters, pageSize, (page - 1) * pageSize);
  return { list, total, page, pageSize };
}

async function createProductRule(body, req) {
  const id = generateId();
  const input = normalizeRuleBody(body);
  if (!input.name) throw new ValidationError('规则名称不能为空');
  await repo.insertProductRule(id, input);
  const row = await repo.selectProductRuleById(id);
  await writeAuditLog({
    req,
    operatorId: req.user?.id,
    actionType: 'points.product_rule.create',
    objectType: 'loyalty_points_product_rule',
    objectId: id,
    summary: `新增商品积分规则 ${input.name}`,
    after: row,
    result: 'success',
  });
  return row;
}

async function updateProductRule(id, body, req) {
  const before = await repo.selectProductRuleById(id);
  if (!before) throw new NotFoundError('规则不存在');
  const input = normalizeRuleBody({ ...before, ...body });
  await repo.updateProductRule(id, input);
  const after = await repo.selectProductRuleById(id);
  await writeAuditLog({
    req,
    operatorId: req.user?.id,
    actionType: 'points.product_rule.update',
    objectType: 'loyalty_points_product_rule',
    objectId: id,
    summary: `修改商品积分规则 ${after.name}`,
    before,
    after,
    result: 'success',
  });
  return after;
}

async function runPointsExpireJob(req) {
  const result = await requireLoyaltyApi('runPointsExpireTick')();
  await writeAuditLog({
    req,
    operatorId: req.user?.id,
    actionType: 'points.expire.run',
    objectType: 'loyalty_points_settings',
    objectId: '1',
    summary: '手动执行积分过期扣减',
    after: result,
    result: 'success',
  });
  return result;
}

async function deleteProductRule(id, req) {
  const before = await repo.selectProductRuleById(id);
  if (!before) throw new NotFoundError('规则不存在');
  await repo.disableProductRule(id);
  await writeAuditLog({
    req,
    operatorId: req.user?.id,
    actionType: 'points.product_rule.delete',
    objectType: 'loyalty_points_product_rule',
    objectId: id,
    summary: `停用商品积分规则 ${before.name}`,
    before,
    after: { enabled: 0 },
    result: 'success',
  });
  return null;
}

module.exports = {
  listRecords,
  getSettings,
  updateSettings,
  listProductRules,
  createProductRule,
  updateProductRule,
  deleteProductRule,
  runPointsExpireJob,
};

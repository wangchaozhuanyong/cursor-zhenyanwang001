const db = require('../../../config/db');
const { generateId } = require('../../../utils/helpers');
const { asyncRoute } = require('../../../middleware/asyncRoute');
const { writeAuditLog } = require('../../../utils/auditLog');
const pointsController = require('../../user/controller/points.controller');

function toBool(value) {
  return value === true || value === 1 || value === '1';
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
    promotion_no_points: body.promotion_no_points ?? body.promotionNoPoints,
    marketing_activity_no_points: body.marketing_activity_no_points ?? body.marketingActivityNoPoints,
    coupon_no_points: body.coupon_no_points ?? body.couponNoPoints,
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
    settle_timing: body.settle_timing ?? body.settleTiming,
  };
}

function compactDefined(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}

exports.listRecords = pointsController.adminListRecords;

exports.getSettings = asyncRoute(async (_req, res) => {
  const [[row]] = await db.query('SELECT * FROM loyalty_points_settings WHERE id = 1 LIMIT 1');
  res.success(row || null);
});

exports.updateSettings = asyncRoute(async (req, res) => {
  const [[before]] = await db.query('SELECT * FROM loyalty_points_settings WHERE id = 1 LIMIT 1');
  const input = compactDefined(normalizeSettingsBody(req.body));
  const fields = [];
  const values = [];
  for (const [key, value] of Object.entries(input)) {
    if (['display_enabled', 'earn_enabled', 'redeem_enabled', 'earn_after_discount', 'promotion_no_points', 'marketing_activity_no_points', 'coupon_no_points', 'allow_with_coupon', 'allow_with_reward_cash', 'zero_pay_allowed'].includes(key)) {
      fields.push(`${key} = ?`);
      values.push(toBool(value) ? 1 : 0);
    } else {
      fields.push(`${key} = ?`);
      values.push(value);
    }
  }
  if (fields.length) {
    await db.query(`UPDATE loyalty_points_settings SET ${fields.join(', ')} WHERE id = 1`, values);
  }
  const [[after]] = await db.query('SELECT * FROM loyalty_points_settings WHERE id = 1 LIMIT 1');
  await writeAuditLog({ req, operatorId: req.user?.id, actionType: 'points.settings.update', objectType: 'loyalty_points_settings', objectId: '1', summary: '更新积分全局设置', before, after, result: 'success' });
  res.success(after, '积分设置已保存');
});

exports.listProductRules = asyncRoute(async (req, res) => {
  const page = Math.max(1, Number(req.query.page || 1));
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize || 20)));
  const where = ['WHERE 1=1'];
  const params = [];
  if (req.query.scope_type) { where.push('scope_type = ?'); params.push(req.query.scope_type); }
  if (req.query.scope_id) { where.push('scope_id = ?'); params.push(req.query.scope_id); }
  if (req.query.enabled !== undefined && req.query.enabled !== '') { where.push('enabled = ?'); params.push(toBool(req.query.enabled) ? 1 : 0); }
  if (req.query.keyword) { where.push('name LIKE ?'); params.push(`%${req.query.keyword}%`); }
  const whereSql = where.join(' AND ');
  const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM loyalty_points_product_rules ${whereSql}`, params);
  const [rows] = await db.query(
    `SELECT * FROM loyalty_points_product_rules ${whereSql} ORDER BY priority ASC, updated_at DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, (page - 1) * pageSize],
  );
  res.success({ list: rows, total, page, pageSize });
});

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

exports.createProductRule = asyncRoute(async (req, res) => {
  const id = generateId();
  const input = normalizeRuleBody(req.body);
  if (!input.name) return res.fail(400, '规则名称不能为空');
  await db.query(
    `INSERT INTO loyalty_points_product_rules
      (id, name, scope_type, scope_id, priority, earn_enabled, earn_mode, fixed_points, points_percent, multiplier_percent, redeem_enabled, max_redeem_percent, start_at, end_at, enabled)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [id, input.name, input.scope_type, input.scope_id, input.priority, input.earn_enabled, input.earn_mode, input.fixed_points, input.points_percent, input.multiplier_percent, input.redeem_enabled, input.max_redeem_percent, input.start_at, input.end_at, input.enabled],
  );
  const [[row]] = await db.query('SELECT * FROM loyalty_points_product_rules WHERE id = ?', [id]);
  await writeAuditLog({ req, operatorId: req.user?.id, actionType: 'points.product_rule.create', objectType: 'loyalty_points_product_rule', objectId: id, summary: `新增商品积分规则 ${input.name}`, after: row, result: 'success' });
  res.success(row, '规则已创建');
});

exports.updateProductRule = asyncRoute(async (req, res) => {
  const id = String(req.params.id);
  const [[before]] = await db.query('SELECT * FROM loyalty_points_product_rules WHERE id = ? LIMIT 1', [id]);
  if (!before) return res.fail(404, '规则不存在');
  const input = normalizeRuleBody({ ...before, ...req.body });
  await db.query(
    `UPDATE loyalty_points_product_rules
     SET name=?, scope_type=?, scope_id=?, priority=?, earn_enabled=?, earn_mode=?, fixed_points=?, points_percent=?, multiplier_percent=?, redeem_enabled=?, max_redeem_percent=?, start_at=?, end_at=?, enabled=?
     WHERE id=?`,
    [input.name, input.scope_type, input.scope_id, input.priority, input.earn_enabled, input.earn_mode, input.fixed_points, input.points_percent, input.multiplier_percent, input.redeem_enabled, input.max_redeem_percent, input.start_at, input.end_at, input.enabled, id],
  );
  const [[after]] = await db.query('SELECT * FROM loyalty_points_product_rules WHERE id = ?', [id]);
  await writeAuditLog({ req, operatorId: req.user?.id, actionType: 'points.product_rule.update', objectType: 'loyalty_points_product_rule', objectId: id, summary: `修改商品积分规则 ${after.name}`, before, after, result: 'success' });
  res.success(after, '规则已更新');
});

exports.deleteProductRule = asyncRoute(async (req, res) => {
  const id = String(req.params.id);
  const [[before]] = await db.query('SELECT * FROM loyalty_points_product_rules WHERE id = ? LIMIT 1', [id]);
  if (!before) return res.fail(404, '规则不存在');
  await db.query('UPDATE loyalty_points_product_rules SET enabled = 0 WHERE id = ?', [id]);
  await writeAuditLog({ req, operatorId: req.user?.id, actionType: 'points.product_rule.delete', objectType: 'loyalty_points_product_rule', objectId: id, summary: `停用商品积分规则 ${before.name}`, before, after: { enabled: 0 }, result: 'success' });
  res.success(null, '规则已停用');
});

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
const ACTIVITY_PRICE_TYPES = new Set(['flash_sale', 'limited_time_discount']);
const POINTS_REWARD_TYPES = new Set(['points_bonus', 'points_reward']);
const SUPPORTED_ACTIVITY_TYPES = new Set([
  'campaign',
  'coupon',
  'full_reduction',
  'full_discount',
  'limited_time_discount',
  'flash_sale',
  'member_price',
  'checkin_reward',
  'points_reward',
  'member_activity',
  'points_bonus',
  'cashback_activity',
]);

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

function normalizeSlug(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 180);
}

function normalizeStringList(value) {
  if (!value) return [];
  const raw = Array.isArray(value) ? value : String(value).split(',');
  return [...new Set(raw.map((item) => String(item || '').trim()).filter(Boolean))];
}

function normalizeActivityType(type) {
  const raw = String(type || '');
  if (raw === 'coupon_activity' || raw === 'new_user_gift') return 'coupon';
  if (raw === 'points_bonus') return 'points_reward';
  if (raw === 'member_activity') return 'member_price';
  if (raw === 'member_level_discount' || raw === 'member_free_shipping') return 'member_price';
  return raw || 'campaign';
}

function groupOverlappingActivities(rows = []) {
  const map = new Map();
  for (const row of rows || []) {
    const id = row.activity_id || row.id;
    if (!id) continue;
    const current = map.get(id) || {
      id,
      title: row.title || '',
      type: normalizeActivityType(row.type),
      scope_type: row.scope_type || 'all',
      start_at: row.start_at,
      end_at: row.end_at,
      stackable: row.stackable === 1 || row.stackable === true,
      exclusive_with: normalizeStringList(parseJsonField(row.exclusive_with, row.exclusive_with)).map(normalizeActivityType),
      activity_config: parseJsonField(row.activity_config, null),
      rule_config: parseJsonField(row.rule_config, null),
      scopes: [],
    };
    if (row.scope_id) {
      current.scopes.push({
        scope_type: row.row_scope_type || row.scope_type || current.scope_type,
        scope_id: String(row.scope_id),
      });
    }
    map.set(id, current);
  }
  return [...map.values()];
}

function normalizeActivityScopeForConflict(payload = {}) {
  const scopeType = String(payload.scope_type || 'all');
  const scopeIds = normalizeStringList(payload.scope_ids);
  return { scope_type: scopeType, scope_ids: scopeIds };
}

function promotionConflictFamily(type) {
  const normalized = normalizeActivityType(type);
  if (normalized === 'full_reduction' || normalized === 'full_discount') return 'order_discount';
  if (normalized === 'flash_sale' || normalized === 'limited_time_discount') return 'activity_price';
  if (normalized === 'member_price') return 'member_price';
  if (normalized === 'checkin_reward') return 'checkin_reward';
  return '';
}

function promotionConflictFamilyLabel(family) {
  return {
    order_discount: '满减/满折',
    activity_price: '活动价',
    member_price: '会员价',
    checkin_reward: '签到奖励',
  }[family] || '同类活动';
}

function allowSameFamilyStack(activity = {}) {
  const config = {
    ...parseJsonField(activity.activity_config, {}),
    ...parseJsonField(activity.rule_config, {}),
  };
  return config.allow_same_type_stack === true
    || config.allow_same_type_stack === 1
    || config.allow_same_type_stack === '1'
    || config.allow_same_family_stack === true
    || config.allow_same_family_stack === 1
    || config.allow_same_family_stack === '1';
}

function buildPublishIssue(code, message, patch = {}) {
  return {
    code,
    severity: patch.severity || 'blocking',
    message,
    ...patch,
  };
}

function normalizeCouponIdsFromConfig(config) {
  const source = config && typeof config === 'object' ? config : {};
  return normalizeStringList(source.coupon_ids || source.couponIds);
}

function buildRuleSummary(type, config = {}) {
  const normalizedType = normalizeActivityType(type);
  const cfg = /** @type {Record<string, any>} */ (config && typeof config === 'object' ? config : {});
  if (normalizedType === 'full_reduction') {
    const rules = Array.isArray(cfg.full_reduction_rules) ? cfg.full_reduction_rules : [];
    return rules.length ? `满减规则 ${rules.length} 条` : '满减规则未配置';
  }
  if (normalizedType === 'full_discount') {
    const rules = Array.isArray(cfg.full_discount_rules) ? cfg.full_discount_rules : [];
    return rules.length ? `满折规则 ${rules.length} 条` : '满折规则未配置';
  }
  if (normalizedType === 'member_price') {
    const rules = Array.isArray(cfg.member_price_rules) ? cfg.member_price_rules : [];
    return rules.length ? `会员价规则 ${rules.length} 条` : '会员价规则未配置';
  }
  if (normalizedType === 'coupon') {
    const couponIds = normalizeCouponIdsFromConfig(cfg);
    return couponIds.length ? `关联优惠券 ${couponIds.length} 张` : '未关联优惠券';
  }
  if (normalizedType === 'checkin_reward') {
    const rewardPoints = Number(cfg.reward_points ?? cfg.points ?? cfg.daily_points ?? cfg.sign_in_points ?? 0);
    return rewardPoints > 0 ? `每日签到 +${Math.trunc(rewardPoints)} 积分` : '签到奖励未配置';
  }
  if (normalizedType === 'points_reward') {
    const multiplier = Number(cfg.multiplier_percent || 0);
    return multiplier > 0 ? `积分奖励倍率 ${multiplier}%` : '积分奖励规则未配置';
  }
  if (normalizedType === 'flash_sale' || normalizedType === 'limited_time_discount') {
    return '活动价商品规则';
  }
  return '通用活动规则';
}

function buildPrecheckSnapshot(built, id = null) {
  const merged = built?.merged || {};
  const validationBody = built?.validationBody || {};
  const ruleConfig = merged.rule_config || merged.activity_config || {};
  return {
    activity_id: id || validationBody.id || null,
    title: merged.title || validationBody.title || '',
    type: normalizeActivityType(merged.type || validationBody.type),
    target_status: merged.status || validationBody.status || 'active',
    rule_version: Number(validationBody.version || 1),
    start_at: merged.start_at || validationBody.start_at || '',
    end_at: merged.end_at || validationBody.end_at || '',
    scope_type: merged.scope_type || validationBody.scope_type || 'all',
    scope_count: Array.isArray(merged.scope_ids) ? merged.scope_ids.length : 0,
    item_count: Array.isArray(built?.items) ? built.items.length : 0,
    display_positions: Array.isArray(merged.display_positions) ? merged.display_positions : [],
    stackable: merged.stackable !== false,
    exclusive_with: normalizeStringList(merged.exclusive_with).map(normalizeActivityType),
    usage_limit_total: merged.usage_limit_total == null ? null : Number(merged.usage_limit_total),
    usage_limit_per_user: merged.usage_limit_per_user == null ? null : Number(merged.usage_limit_per_user),
    rule_summary: buildRuleSummary(merged.type || validationBody.type, ruleConfig),
  };
}

function normalizeDiscountPercent(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  if (n > 0 && n <= 1) return n * 100;
  return n;
}

function normalizeFullDiscountRulesFromConfig(config) {
  const source = config && typeof config === 'object' ? config : {};
  const rawRules = Array.isArray(source.full_discount_rules)
    ? source.full_discount_rules
    : [];
  if (rawRules.length) {
    return rawRules.map((rule) => ({
      threshold_amount: Number(rule.threshold_amount || rule.threshold || 0),
      discount_percent: normalizeDiscountPercent(rule.discount_percent ?? rule.discount_rate ?? rule.rate ?? 0),
    }));
  }
  return [{
    threshold_amount: Number(source.threshold_amount || 0),
    discount_percent: normalizeDiscountPercent(source.discount_percent ?? source.discount_rate ?? source.rate ?? 0),
  }];
}

function normalizeMemberPriceRulesFromConfig(config) {
  const source = config && typeof config === 'object' ? config : {};
  const rawRules = Array.isArray(source.member_price_rules)
    ? source.member_price_rules
    : [];
  if (rawRules.length) {
    return rawRules.map((rule) => ({
      discount_percent: normalizeDiscountPercent(rule.discount_percent ?? rule.discount_rate ?? rule.rate ?? 0),
      min_order_amount: Number(rule.min_order_amount || rule.minOrderAmount || 0),
      member_level_ids: normalizeStringList(rule.member_level_ids || rule.memberLevelIds),
    }));
  }
  return [{
    discount_percent: normalizeDiscountPercent(source.discount_percent ?? source.discount_rate ?? source.rate ?? 0),
    min_order_amount: Number(source.min_order_amount || source.minOrderAmount || 0),
    member_level_ids: normalizeStringList(source.member_level_ids || source.memberLevelIds),
  }];
}

function normalizeCheckinRewardConfig(config) {
  const source = config && typeof config === 'object' ? config : {};
  return {
    bonus_kind: 'checkin',
    reward_points: Math.trunc(Number(source.reward_points ?? source.points ?? source.daily_points ?? source.sign_in_points ?? 0)),
    once_per_day: source.once_per_day !== false && source.once_per_day !== 0,
    streak_bonus_points: Math.max(0, Math.trunc(Number(source.streak_bonus_points || 0))),
    streak_bonus_every_days: Math.max(0, Math.trunc(Number(source.streak_bonus_every_days || 0))),
  };
}

function activityScopesOverlap(target, existing) {
  const targetScope = normalizeActivityScopeForConflict(target);
  const existingScopeType = String(existing.scope_type || 'all');
  if (targetScope.scope_type === 'all' || existingScopeType === 'all') return true;
  if (!['product', 'category'].includes(targetScope.scope_type) || !['product', 'category'].includes(existingScopeType)) {
    return targetScope.scope_type === existingScopeType;
  }
  if (targetScope.scope_type !== existingScopeType) return false;
  const targetIds = new Set(targetScope.scope_ids.map(String));
  const existingIds = new Set((existing.scopes || [])
    .filter((scope) => String(scope.scope_type || existingScopeType) === existingScopeType)
    .map((scope) => String(scope.scope_id || ''))
    .filter(Boolean));
  if (!targetIds.size || !existingIds.size) return true;
  return [...targetIds].some((id) => existingIds.has(id));
}

async function assertActivityRuleConflicts(payload, excludeActivityId = null) {
  const conflicts = await buildActivityRuleConflicts(payload, excludeActivityId);
  if (conflicts.length) {
    throw new BusinessError(409, conflicts[0].message);
  }
}

async function buildActivityRuleConflicts(payload, excludeActivityId = null) {
  const rows = await repo.selectOverlappingActivitiesForRuleConflict({
    startAt: payload.start_at,
    endAt: payload.end_at,
    excludeActivityId,
  });
  const conflicts = [];
  const targetType = normalizeActivityType(payload.type);
  const targetFamily = promotionConflictFamily(targetType);
  const targetExclusive = normalizeStringList(payload.exclusive_with).map(normalizeActivityType);
  const targetStackable = payload.stackable !== false;
  for (const activity of groupOverlappingActivities(rows)) {
    if (!activityScopesOverlap(payload, activity)) continue;
    const existingType = normalizeActivityType(activity.type);
    const existingFamily = promotionConflictFamily(existingType);
    const targetAllowsSameFamily = allowSameFamilyStack(payload);
    const existingAllowsSameFamily = allowSameFamilyStack(activity);
    if (
      targetFamily
      && existingFamily
      && targetFamily === existingFamily
      && !(targetAllowsSameFamily && existingAllowsSameFamily)
    ) {
      const label = promotionConflictFamilyLabel(targetFamily);
      conflicts.push(buildPublishIssue(
        'same_family_conflict',
        `活动“${payload.title}”与“${activity.title}”同属${label}优惠计算层，时间和适用范围重叠，默认不可并行发布，请调整活动时间、适用范围或先结束其中一个活动`,
        {
          conflict_activity_id: activity.id,
          conflict_activity_title: activity.title,
          conflict_activity_type: existingType,
          conflict_family: targetFamily,
          conflict_family_label: label,
        },
      ));
      continue;
    }
    if (!targetStackable || activity.stackable === false) {
      conflicts.push(buildPublishIssue(
        'non_stackable_conflict',
        `活动“${payload.title}”与“${activity.title}”时间和适用范围重叠，且其中一个活动不允许叠加，请调整活动时间、范围或叠加规则`,
        {
          conflict_activity_id: activity.id,
          conflict_activity_title: activity.title,
          conflict_activity_type: existingType,
        },
      ));
      continue;
    }
    if (targetExclusive.includes(existingType)) {
      conflicts.push(buildPublishIssue(
        'target_exclusive_conflict',
        `活动“${payload.title}”设置了不可与“${existingType}”叠加，已与“${activity.title}”冲突`,
        {
          conflict_activity_id: activity.id,
          conflict_activity_title: activity.title,
          conflict_activity_type: existingType,
        },
      ));
      continue;
    }
    if ((activity.exclusive_with || []).includes(targetType)) {
      conflicts.push(buildPublishIssue(
        'existing_exclusive_conflict',
        `活动“${activity.title}”设置了不可与“${targetType}”叠加，请调整活动时间、范围或互斥规则`,
        {
          conflict_activity_id: activity.id,
          conflict_activity_title: activity.title,
          conflict_activity_type: existingType,
        },
      ));
    }
  }
  return conflicts;
}

function bumpCatalogCache() {
  try {
    const productApi = require('../../product/publicApi');
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

function normalizeExpectedVersion(value) {
  if (value === undefined || value === null || value === '') return null;
  const version = Math.floor(Number(value));
  return Number.isFinite(version) && version > 0 ? version : null;
}

function pad2(value) {
  return String(value).padStart(2, '0');
}

function formatUtcDateTime(date) {
  return [
    date.getUTCFullYear(),
    pad2(date.getUTCMonth() + 1),
    pad2(date.getUTCDate()),
  ].join('-') + ' ' + [
    pad2(date.getUTCHours()),
    pad2(date.getUTCMinutes()),
    pad2(date.getUTCSeconds()),
  ].join(':');
}

function normalizeDateTimeForMysql(value) {
  if (value == null || value === '') return '';
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return '';
    return formatUtcDateTime(value);
  }

  const raw = String(value || '').trim();
  if (!raw) return '';

  const localMatch = raw.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})(?::(\d{2})(?:\.\d{1,6})?)?$/);
  if (localMatch) {
    return `${localMatch[1]} ${localMatch[2]}:${localMatch[3] || '00'}`;
  }

  const hasTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(raw);
  if (hasTimezone) {
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) return formatUtcDateTime(parsed);
  }

  return raw.replace('T', ' ').replace(/\.\d{1,6}(?:Z)?$/i, '').replace(/Z$/i, '');
}

function computeStatus(row) {
  if (Number(row.disabled) === 1 || row.status === 'disabled') return 'disabled';
  if (row.status === 'paused') return 'paused';
  if (row.status === 'archived') return 'archived';
  if (row.status === 'ended') return 'ended';
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
    paused: '已暂停',
    archived: '已归档',
    scheduled: '未开始',
    active: '进行中',
    ended: '已结束',
    disabled: '已禁用',
  }[status] || status;
}

function money(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function rate(numerator, denominator) {
  const top = Number(numerator || 0);
  const bottom = Number(denominator || 0);
  if (bottom <= 0) return null;
  return Math.round((top / bottom) * 10000) / 100;
}

function activityRiskLabel(level) {
  return {
    limit_reached: '使用次数已达上限',
    limit_warning: '使用次数接近上限',
    stock_warning: '活动库存接近售罄',
    ok: '正常',
  }[level] || '正常';
}

function buildEffectStats(row) {
  const stockTotal = Number(row.activity_stock_total || 0);
  const soldTotal = Number(row.sold_count_total || 0);
  const usageLimitTotal = row.usage_limit_total == null ? null : Number(row.usage_limit_total || 0);
  const activeUsageCount = Number(row.active_usage_count || 0);
  const stockUsageRate = rate(soldTotal, stockTotal);
  const limitUsageRate = usageLimitTotal && usageLimitTotal > 0
    ? rate(activeUsageCount, usageLimitTotal)
    : null;
  let riskLevel = 'ok';
  if (usageLimitTotal && usageLimitTotal > 0 && activeUsageCount >= usageLimitTotal) {
    riskLevel = 'limit_reached';
  } else if (limitUsageRate != null && limitUsageRate >= 80) {
    riskLevel = 'limit_warning';
  } else if (stockUsageRate != null && stockUsageRate >= 90) {
    riskLevel = 'stock_warning';
  }
  return {
    active_order_count: Number(row.active_order_count || 0),
    confirmed_order_count: Number(row.confirmed_order_count || 0),
    locked_order_count: Number(row.locked_order_count || 0),
    active_usage_count: activeUsageCount,
    total_usage_count: Number(row.total_usage_count || 0),
    active_discount_amount: money(row.active_discount_amount || 0),
    confirmed_discount_amount: money(row.confirmed_discount_amount || 0),
    stock_usage_rate: stockUsageRate,
    limit_usage_rate: limitUsageRate,
    risk_level: riskLevel,
    risk_label: activityRiskLabel(riskLevel),
  };
}

function runtimeStatusForDateWindow(row) {
  const now = Date.now();
  const start = new Date(row.start_at).getTime();
  const end = new Date(row.end_at).getTime();
  if (Number.isFinite(end) && now > end) return 'ended';
  if (Number.isFinite(start) && now < start) return 'scheduled';
  return 'active';
}

function normalizeStatusAction(body = {}, existing = {}) {
  if (body.disabled !== undefined) {
    return body.disabled
      ? { action: 'disable', status: 'disabled', disabled: 1, auditAction: 'activity.disable', summaryVerb: '禁用' }
      : {
        action: 'enable',
        status: runtimeStatusForDateWindow(existing),
        disabled: 0,
        auditAction: 'activity.enable',
        summaryVerb: '启用',
      };
  }

  const requested = String(body.action || body.status || '').trim().toLowerCase();
  if (requested === 'pause' || requested === 'paused') {
    return { action: 'pause', status: 'paused', disabled: 0, auditAction: 'activity.pause', summaryVerb: '暂停' };
  }
  if (requested === 'end' || requested === 'ended') {
    return { action: 'end', status: 'ended', disabled: 0, endNow: true, auditAction: 'activity.end', summaryVerb: '结束' };
  }
  if (requested === 'archive' || requested === 'archived') {
    return { action: 'archive', status: 'archived', disabled: 1, auditAction: 'activity.archive', summaryVerb: '归档' };
  }
  if (requested === 'disable' || requested === 'disabled') {
    return { action: 'disable', status: 'disabled', disabled: 1, auditAction: 'activity.disable', summaryVerb: '禁用' };
  }
  if (requested === 'resume' || requested === 'restore' || requested === 'enable' || requested === 'active' || requested === 'scheduled') {
    return {
      action: 'resume',
      status: runtimeStatusForDateWindow(existing),
      disabled: 0,
      auditAction: 'activity.resume',
      summaryVerb: '恢复',
    };
  }

  throw new BusinessError(400, '不支持的活动状态操作');
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
  if (payload.usage_limit_total != null && Number(payload.usage_limit_total) < 0) {
    throw new BusinessError(400, '活动总使用次数上限不能为负数');
  }
  if (payload.usage_limit_per_user != null && Number(payload.usage_limit_per_user) < 0) {
    throw new BusinessError(400, '每用户使用次数上限不能为负数');
  }

  if (!ACTIVITY_PRICE_TYPES.has(payload.type) && ['category', 'product'].includes(payload.scope_type)) {
    const scopeIds = Array.isArray(payload.scope_ids) ? payload.scope_ids.map((id) => String(id || '').trim()).filter(Boolean) : [];
    if (!scopeIds.length) {
      throw new BusinessError(400, payload.scope_type === 'category' ? '请选择活动适用分类' : '请选择活动适用商品');
    }
    payload.scope_ids = Array.from(new Set(scopeIds));
  }

  if (payload.type === 'coupon') {
    const couponIds = normalizeCouponIdsFromConfig(payload.activity_config || payload.rule_config);
    if (!couponIds.length) {
      throw new BusinessError(400, '优惠券活动必须关联至少一张可领取优惠券');
    }
    payload.activity_config = { ...(payload.activity_config || {}), coupon_ids: couponIds };
    payload.rule_config = { ...(payload.rule_config || payload.activity_config || {}), coupon_ids: couponIds };
  }
  if (payload.type === 'coupon_activity') {
    const couponIds = normalizeCouponIdsFromConfig(payload.activity_config);
    if (!couponIds.length) {
      throw new BusinessError(400, '优惠券活动必须关联 coupons 表中的优惠券');
    }
  }
  if (payload.type === 'new_user_gift') {
    const pack = normalizeCouponIdsFromConfig(payload.activity_config);
    if (!pack.length) {
      throw new BusinessError(400, '新人礼包必须关联至少一张优惠券');
    }
  }
  if (ACTIVITY_PRICE_TYPES.has(payload.type)) {
    if (!payload.items.length) throw new BusinessError(400, '活动价活动必须选择商品');
    const invalid = payload.items.find((it) => Number(it.activity_price) <= 0 || Number(it.activity_stock) < 0 || Number(it.limit_per_user) < 0);
    if (invalid) throw new BusinessError(400, '活动价活动存在不合法商品配置（活动价/活动库存/限购）');
  }
  if (payload.type === 'checkin_reward') {
    const cfg = normalizeCheckinRewardConfig(payload.activity_config || payload.rule_config);
    if (!Number.isFinite(cfg.reward_points) || cfg.reward_points < 1) {
      throw new BusinessError(400, '签到奖励积分必须至少为 1');
    }
    if (cfg.streak_bonus_points < 0) throw new BusinessError(400, '连续签到奖励积分不能为负数');
    if (cfg.streak_bonus_every_days < 0) throw new BusinessError(400, '连续签到天数不能为负数');
    payload.activity_config = {
      ...(payload.activity_config || {}),
      ...cfg,
    };
    payload.rule_config = {
      ...(payload.rule_config || payload.activity_config || {}),
      ...cfg,
    };
  }
  if (POINTS_REWARD_TYPES.has(payload.type)) {
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
  if (payload.type === 'full_discount') {
    const rules = normalizeFullDiscountRulesFromConfig(payload.activity_config || payload.rule_config);
    const validRules = rules.filter((rule) => Number(rule.threshold_amount || 0) > 0 || Number(rule.discount_percent || 0) > 0);
    if (!validRules.length) throw new BusinessError(400, '至少配置一档满折');
    for (const rule of validRules) {
      const threshold = Number(rule.threshold_amount || 0);
      const percent = Number(rule.discount_percent || 0);
      if (threshold <= 0) throw new BusinessError(400, '满折门槛必须大于 0');
      if (percent <= 0 || percent >= 100) {
        throw new BusinessError(400, '满折折扣必须大于 0 且小于 100（90=9折）');
      }
    }
    payload.activity_config = {
      ...(payload.activity_config || {}),
      full_discount_rules: validRules,
    };
    payload.rule_config = {
      ...(payload.rule_config || payload.activity_config || {}),
      full_discount_rules: validRules,
    };
  }
  if (payload.type === 'member_price') {
    const rules = normalizeMemberPriceRulesFromConfig(payload.activity_config || payload.rule_config);
    const validRules = rules.filter((rule) => Number(rule.discount_percent || 0) > 0 || Number(rule.min_order_amount || 0) > 0 || rule.member_level_ids.length > 0);
    if (!validRules.length) throw new BusinessError(400, '至少配置一档会员价');
    for (const rule of validRules) {
      const percent = Number(rule.discount_percent || 0);
      const minOrderAmount = Number(rule.min_order_amount || 0);
      if (percent <= 0 || percent >= 100) {
        throw new BusinessError(400, '会员价折扣必须大于 0 且小于 100（95=9.5折）');
      }
      if (minOrderAmount < 0) throw new BusinessError(400, '会员价最低订单金额不能为负数');
    }
    payload.activity_config = {
      ...(payload.activity_config || {}),
      member_price_rules: validRules,
    };
    payload.rule_config = {
      ...(payload.rule_config || payload.activity_config || {}),
      member_price_rules: validRules,
    };
  }
}

async function assertCouponActivityCouponsSelectable(payload) {
  if (payload.type !== 'coupon') return;
  const couponIds = normalizeCouponIdsFromConfig(payload.activity_config || payload.rule_config);
  const activeIds = await repo.selectActiveCouponIdsByIds(couponIds);
  if (activeIds.length !== couponIds.length) {
    throw new BusinessError(400, '优惠券活动包含不存在、未发布或不可领取的优惠券');
  }
}

function buildExistingItemLookup(items = []) {
  const byId = new Map();
  const byProductId = new Map();
  for (const item of items || []) {
    if (item.id) byId.set(String(item.id), item);
    if (item.product_id) byProductId.set(String(item.product_id), item);
  }
  return { byId, byProductId };
}

function normalizeItem(item, index, options = {}) {
  const productId = String(item.product_id || '').trim();
  if (!productId) throw new BusinessError(400, '活动商品不能为空');
  const activityPrice = toNumber(item.activity_price, 0);
  const stock = Math.max(0, Math.floor(toNumber(item.activity_stock, 0)));
  const limit = Math.max(0, Math.floor(toNumber(item.limit_per_user, 0)));
  const inputId = item.id && typeof item.id === 'string' ? String(item.id) : '';
  const existingById = inputId ? options.existingItemById?.get(inputId) : null;
  const existingByProductId = options.existingItemByProductId?.get(productId);
  const existingItem = existingById || existingByProductId || null;
  const itemId = options.preserveExistingId && existingById ? inputId : generateId();
  const soldCount = options.preserveExistingSoldCount && existingItem
    ? Math.max(0, Math.floor(toNumber(existingItem.sold_count, 0)))
    : 0;
  return {
    id: itemId,
    product_id: productId,
    activity_price: activityPrice,
    activity_stock: stock,
    limit_per_user: limit,
    sold_count: soldCount,
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
    const normalizedType = normalizeActivityType(requestedType);
    out.type = SUPPORTED_ACTIVITY_TYPES.has(requestedType) || SUPPORTED_ACTIVITY_TYPES.has(normalizedType)
      ? normalizedType
      : 'flash_sale';
  }
  if (!partial || body.title !== undefined) {
    const title = String(body.title || '').trim();
    if (!title) throw new BusinessError(400, '活动名称不能为空');
    out.title = title;
  }
  if (body.subtitle !== undefined || !partial) out.subtitle = String(body.subtitle || '').trim();
  if (body.slug !== undefined || !partial) {
    const slug = normalizeSlug(body.slug || body.title || '');
    out.slug = slug || null;
  }
  if (body.cover_image !== undefined || !partial) out.cover_image = String(body.cover_image || '').trim();
  if (!partial || body.start_at !== undefined) out.start_at = normalizeDateTimeForMysql(body.start_at);
  if (!partial || body.end_at !== undefined) out.end_at = normalizeDateTimeForMysql(body.end_at);
  if (body.description !== undefined || !partial) out.description = String(body.description || '').trim();
  if (body.disabled !== undefined || !partial) out.disabled = !!body.disabled;
  if (body.sort_order !== undefined || !partial) out.sort_order = Math.floor(toNumber(body.sort_order, 0));
  if (body.threshold_amount !== undefined || !partial) out.threshold_amount = body.threshold_amount === '' || body.threshold_amount == null ? null : toNumber(body.threshold_amount, 0);
  if (body.discount_amount !== undefined || !partial) out.discount_amount = body.discount_amount === '' || body.discount_amount == null ? null : toNumber(body.discount_amount, 0);
  if (body.allow_coupon_stack !== undefined || !partial) out.allow_coupon_stack = !!body.allow_coupon_stack;
  if (body.allow_points_stack !== undefined || !partial) out.allow_points_stack = !!body.allow_points_stack;
  if (body.allow_reward !== undefined || !partial) out.allow_reward = !!body.allow_reward;
  if (body.publish_at !== undefined || !partial) out.publish_at = body.publish_at ? normalizeDateTimeForMysql(body.publish_at) : null;
  if (body.internal_note !== undefined || !partial) out.internal_note = String(body.internal_note || '').trim();
  if (body.activity_config !== undefined || !partial) out.activity_config = body.activity_config || null;
  if (body.rule_config !== undefined || body.activity_config !== undefined || !partial) out.rule_config = body.rule_config || body.activity_config || null;
  if (body.stackable !== undefined) out.stackable = !!body.stackable;
  else if (!partial) out.stackable = true;
  if (body.exclusive_with !== undefined || !partial) out.exclusive_with = normalizeStringList(body.exclusive_with);
  if (body.usage_limit_total !== undefined || !partial) {
    const limit = body.usage_limit_total === '' || body.usage_limit_total == null
      ? null
      : Math.max(0, Math.floor(toNumber(body.usage_limit_total, 0)));
    out.usage_limit_total = limit && limit > 0 ? limit : null;
  }
  if (body.usage_limit_per_user !== undefined || !partial) {
    const limit = body.usage_limit_per_user === '' || body.usage_limit_per_user == null
      ? null
      : Math.max(0, Math.floor(toNumber(body.usage_limit_per_user, 0)));
    out.usage_limit_per_user = limit && limit > 0 ? limit : null;
  }
  if (body.priority !== undefined || !partial) out.priority = Math.floor(toNumber(body.priority, out.sort_order || 0));
  if (body.display_positions !== undefined || !partial) {
    out.display_positions = normalizeDisplayPositions(body.display_positions);
  }
  if (body.status !== undefined || !partial) out.status = String(body.status || 'draft');
  return out;
}

function formatActivity(row, items = undefined, scopes = undefined) {
  const status = computeStatus(row);
  const type = normalizeActivityType(row.type);
  const out = {
    ...row,
    type,
    legacy_type: row.type !== type ? row.type : undefined,
    disabled: !!row.disabled,
    threshold_amount: row.threshold_amount != null ? Number(row.threshold_amount) : null,
    discount_amount: row.discount_amount != null ? Number(row.discount_amount) : null,
    product_count: Number(row.product_count || 0),
    activity_stock_total: Number(row.activity_stock_total || 0),
    sold_count_total: Number(row.sold_count_total || 0),
    priority: Number(row.priority || 0),
    stackable: row.stackable === 1 || row.stackable === true,
    exclusive_with: parseJsonField(row.exclusive_with, []),
    usage_limit_total: row.usage_limit_total == null ? null : Number(row.usage_limit_total),
    usage_limit_per_user: row.usage_limit_per_user == null ? null : Number(row.usage_limit_per_user),
    version: Number(row.version || 1),
    effect_stats: buildEffectStats(row),
    allow_coupon_stack: !!row.allow_coupon_stack,
    allow_points_stack: !!row.allow_points_stack,
    allow_reward: !!row.allow_reward,
    display_positions: parseJsonField(row.display_positions, []),
    activity_config: parseJsonField(row.activity_config, null),
    rule_config: parseJsonField(row.rule_config, null),
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

function cloneRuleConfig(value) {
  if (!value || typeof value !== 'object') return value || null;
  return JSON.parse(JSON.stringify(value));
}

function buildCopiedActivityDraft(source, items = [], scopes = [], body = {}, adminUserId = null) {
  const formatted = formatActivity(source, items, scopes);
  const copiedType = normalizeActivityType(formatted.type);
  const copiedItems = ACTIVITY_PRICE_TYPES.has(copiedType)
    ? (formatted.items || []).map((item, index) => normalizeItem({
      ...item,
      id: null,
      sold_count: 0,
    }, index))
    : [];
  const copiedScopes = ACTIVITY_PRICE_TYPES.has(copiedType)
    ? normalizeFlashSaleScopes(copiedItems).scopes
    : (formatted.scope_ids || []).map((scopeId) => ({
      id: generateId(),
      scope_type: formatted.scope_type || 'all',
      scope_id: scopeId,
    }));
  const title = String(body.title || `${formatted.title || '活动'} 副本`).trim();
  const displayPositions = normalizeDisplayPositionsForActivity(copiedType, formatted.display_positions || []);
  return {
    payload: {
      id: generateId(),
      slug: null,
      type: copiedType,
      title,
      subtitle: formatted.subtitle || '',
      cover_image: formatted.cover_image || '',
      description: formatted.description || '',
      start_at: normalizeDateTimeForMysql(body.start_at || formatted.start_at),
      end_at: normalizeDateTimeForMysql(body.end_at || formatted.end_at),
      status: 'draft',
      disabled: 0,
      threshold_amount: formatted.threshold_amount,
      discount_amount: formatted.discount_amount,
      scope_type: ACTIVITY_PRICE_TYPES.has(copiedType) ? 'product' : (formatted.scope_type || 'all'),
      allow_coupon_stack: formatted.allow_coupon_stack !== false,
      allow_points_stack: formatted.allow_points_stack !== false,
      allow_reward: formatted.allow_reward === true,
      publish_at: null,
      internal_note: formatted.internal_note || '',
      display_positions: displayPositions,
      activity_config: cloneRuleConfig(formatted.activity_config),
      rule_config: cloneRuleConfig(formatted.rule_config || formatted.activity_config),
      stackable: formatted.stackable !== false,
      exclusive_with: normalizeStringList(formatted.exclusive_with).map(normalizeActivityType),
      usage_limit_total: formatted.usage_limit_total ?? null,
      usage_limit_per_user: formatted.usage_limit_per_user ?? null,
      sort_order: formatted.sort_order || 0,
      priority: formatted.priority || 0,
      adminUserId,
    },
    items: copiedItems,
    scopes: copiedScopes,
  };
}

async function validateProductsForFlashSale(items, startAt, endAt, excludeActivityId = null) {
  if (!items.length) return;
  const productIds = [...new Set(items.map((it) => it.product_id))];
  const products = await repo.selectProductStocksByIds(productIds);
  const productMap = new Map(products.map((p) => [p.id, p]));
  for (const item of items) {
    const product = productMap.get(item.product_id);
    if (!product) throw new BusinessError(400, `商品不存在：${item.product_id}`);
    if (Number(product.lifecycle_status) !== 1) throw new BusinessError(400, `商品“${product.name}”未上架，不能参加秒杀`);
    if (item.activity_stock > Number(product.stock || 0)) {
      throw new BusinessError(400, `商品“${product.name}”活动库存不能超过可用库存`);
    }
    if (item.activity_price > Number(product.price || 0)) {
      throw new BusinessError(400, `商品“${product.name}”活动价不能高于原价`);
    }
  }
  const conflicts = await repo.selectConflictingActivities({ productIds, startAt, endAt, excludeActivityId });
  if (conflicts.length) {
    const first = conflicts[0];
    const productName = productMap.get(first.product_id)?.name || first.product_id;
    throw new BusinessError(409, `商品“${productName}”已在活动“${first.title}”的时间范围内参与秒杀，请调整活动时间或更换商品`);
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
  const { scopeType, scopes } = ACTIVITY_PRICE_TYPES.has(payload.type) ? normalizeFlashSaleScopes(items) : normalizeScopes(body);
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
    await assertCouponActivityCouponsSelectable(finalPayload);
    if (ACTIVITY_PRICE_TYPES.has(finalPayload.type)) {
      await validateProductsForFlashSale(items, payload.start_at, payload.end_at);
    }
    await assertActivityRuleConflicts(finalPayload);
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
  const expectedVersion = normalizeExpectedVersion(body?.version ?? body?.expected_version);
  const payload = normalizePayload(body, true);
  const fragments = [];
  const values = [];
  const existingItems = await repo.selectActivityItems(id);
  const existingItemLookup = buildExistingItemLookup(existingItems);
  const items = Array.isArray(body.items)
    ? body.items.map((item, index) => normalizeItem(item, index, {
      preserveExistingId: true,
      preserveExistingSoldCount: true,
      existingItemById: existingItemLookup.byId,
      existingItemByProductId: existingItemLookup.byProductId,
    }))
    : null;
  const scopesNormalized = body.scope_type !== undefined || body.scope_ids !== undefined ? normalizeScopes(body) : null;
  const merged = {
    ...existing,
    ...payload,
    display_positions: payload.display_positions !== undefined
      ? payload.display_positions
      : parseJsonField(existing.display_positions, []),
    activity_config: payload.activity_config !== undefined
      ? payload.activity_config
      : parseJsonField(existing.activity_config, null),
    rule_config: payload.rule_config !== undefined
      ? payload.rule_config
      : parseJsonField(existing.rule_config, parseJsonField(existing.activity_config, null)),
    items: items ?? existingItems,
    scope_type: scopesNormalized?.scopeType || existing.scope_type,
    scope_ids: scopesNormalized?.scopes?.map((scope) => scope.scope_id) || (await repo.selectActivityScopes(id)).map((scope) => scope.scope_id),
  };
  if (payload.display_positions !== undefined || payload.type !== undefined) {
    assertDraftDisplayPositions(merged.type, merged.display_positions);
    payload.display_positions = normalizeDisplayPositionsForActivity(merged.type, merged.display_positions);
    merged.display_positions = payload.display_positions;
  }
  const finalScopes = ACTIVITY_PRICE_TYPES.has(merged.type) ? normalizeFlashSaleScopes(merged.items) : scopesNormalized;
  if (ACTIVITY_PRICE_TYPES.has(merged.type)) {
    payload.scope_type = 'product';
    merged.scope_type = 'product';
  }
  const nextRuntimeStatus = payload.status || computeStatus(existing);
  const shouldValidateRuntime = ['active', 'scheduled'].includes(nextRuntimeStatus);
  if (WIP_ACTIVITY_TYPES.includes(merged.type) && shouldValidateRuntime) {
    throw new BusinessError(400, '该活动类型仍在开发中，仅可保存草稿');
  }
  if (shouldValidateRuntime) {
    assertPublishRules(merged);
    await assertCouponActivityCouponsSelectable(merged);
    if (ACTIVITY_PRICE_TYPES.has(merged.type)) {
      await validateProductsForFlashSale(merged.items, merged.start_at, merged.end_at, id);
    }
    await assertActivityRuleConflicts(merged, id);
  }
  const shouldBumpRuleVersion = Object.keys(payload).length > 0
    || !!items
    || !!scopesNormalized;
  for (const [key, value] of Object.entries(payload)) {
    if (key === 'display_positions' || key === 'activity_config' || key === 'rule_config' || key === 'exclusive_with') {
      fragments.push(`${key} = ?`);
      values.push(value ? JSON.stringify(value) : null);
    } else if (key === 'disabled' || key === 'allow_coupon_stack' || key === 'allow_points_stack' || key === 'allow_reward' || key === 'stackable') {
      fragments.push(`${key} = ?`);
      values.push(value ? 1 : 0);
    } else {
      fragments.push(`${key} = ?`);
      values.push(value);
    }
  }
  if (shouldBumpRuleVersion) {
    fragments.push('version = COALESCE(version, 1) + 1');
  }
  if (fragments.length) {
    const affected = await repo.updateActivityDynamic(id, fragments, values, adminUserId, expectedVersion);
    if (expectedVersion != null && affected === 0) {
      throw new BusinessError(409, '数据已被其他管理员修改，请刷新后再编辑');
    }
  }
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

async function copyActivity(id, body = {}, adminUserId, req) {
  const existing = await repo.selectActivityById(id);
  if (!existing) throw new BusinessError(404, '活动不存在');
  const [items, scopes] = await Promise.all([
    repo.selectActivityItems(id),
    repo.selectActivityScopes(id),
  ]);
  const copied = buildCopiedActivityDraft(existing, items, scopes, body, adminUserId);
  await repo.insertActivity(copied.payload);
  if (copied.items.length) await repo.replaceActivityItems(copied.payload.id, copied.items);
  await repo.replaceActivityScopes(copied.payload.id, copied.scopes);
  bumpCatalogCache();
  await writeAuditLog({
    req,
    operatorId: adminUserId,
    actionType: 'activity.copy',
    objectType: 'marketing_activity',
    objectId: copied.payload.id,
    summary: `复制活动 ${existing.title}`,
    before: { source_activity_id: id, title: existing.title },
    after: {
      id: copied.payload.id,
      title: copied.payload.title,
      status: copied.payload.status,
      source_activity_id: id,
    },
    result: 'success',
  });
  return getActivity(copied.payload.id);
}

async function updateActivityStatus(id, body, adminUserId, req) {
  const existing = await repo.selectActivityById(id);
  if (!existing) throw new BusinessError(404, '活动不存在');
  const expectedVersion = normalizeExpectedVersion(body?.version ?? body?.expected_version);
  const transition = normalizeStatusAction(body, existing);
  if (transition.action === 'resume' && ['active', 'scheduled'].includes(transition.status)) {
    const items = await repo.selectActivityItems(id);
    const scopes = ACTIVITY_PRICE_TYPES.has(existing.type)
      ? normalizeFlashSaleScopes(items).scopes
      : await repo.selectActivityScopes(id);
    const payload = {
      ...existing,
      status: transition.status,
      display_positions: parseJsonField(existing.display_positions, []),
      activity_config: parseJsonField(existing.activity_config, null),
      rule_config: parseJsonField(existing.rule_config, null),
      stackable: existing.stackable === 1 || existing.stackable === true,
      exclusive_with: parseJsonField(existing.exclusive_with, []),
      items,
      scope_type: ACTIVITY_PRICE_TYPES.has(existing.type) ? 'product' : existing.scope_type,
      scope_ids: scopes.map((scope) => scope.scope_id),
    };
    assertPublishRules(payload);
    if (ACTIVITY_PRICE_TYPES.has(payload.type)) {
      await validateProductsForFlashSale(items.map((item, index) => normalizeItem(item, index)), payload.start_at, payload.end_at, id);
    }
    await assertActivityRuleConflicts(payload, id);
  }
  const affected = await repo.setActivityRuntimeStatus(id, transition, adminUserId, expectedVersion);
  if (expectedVersion != null && affected === 0) {
    throw new BusinessError(409, '数据已被其他管理员修改，请刷新后再操作');
  }
  bumpCatalogCache();
  await writeAuditLog({
    req,
    operatorId: adminUserId,
    actionType: transition.auditAction,
    objectType: 'marketing_activity',
    objectId: id,
    summary: `${transition.summaryVerb}活动 ${existing.title}`,
    before: {
      status: existing.status,
      disabled: !!existing.disabled,
      end_at: existing.end_at,
    },
    after: {
      status: transition.status,
      disabled: !!transition.disabled,
      action: transition.action,
    },
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
  const { merged, resolvedType, items, payload } = await buildPublishValidationPayload(body, id);
  assertPublishRules(merged);
  await assertCouponActivityCouponsSelectable(merged);
  if (ACTIVITY_PRICE_TYPES.has(resolvedType)) {
    await validateProductsForFlashSale(items, payload.start_at || body.start_at, payload.end_at || body.end_at, id);
  }
  await assertActivityRuleConflicts(merged, id);
  return { data: { ok: true } };
}

async function buildStoredActivityValidationBody(id, body = {}) {
  if (!id) return body || {};
  const row = await repo.selectActivityById(id);
  if (!row) throw new BusinessError(404, '活动不存在');
  const [items, scopes] = await Promise.all([
    repo.selectActivityItems(id),
    repo.selectActivityScopes(id),
  ]);
  const existing = formatActivity(row, items, scopes);
  const hasBodyItems = Array.isArray(body.items);
  const hasBodyScopes = Array.isArray(body.scope_ids) || body.scope_type !== undefined;
  return {
    ...existing,
    ...body,
    activity_config: body.activity_config !== undefined ? body.activity_config : existing.activity_config,
    rule_config: body.rule_config !== undefined ? body.rule_config : existing.rule_config,
    display_positions: body.display_positions !== undefined ? body.display_positions : existing.display_positions,
    items: hasBodyItems ? body.items : existing.items || [],
    scope_type: hasBodyScopes ? body.scope_type : existing.scope_type,
    scope_ids: hasBodyScopes ? body.scope_ids : existing.scope_ids || [],
  };
}

async function buildPublishValidationPayload(body, id = null) {
  const validationBody = await buildStoredActivityValidationBody(id, body || {});
  const payload = normalizePayload(validationBody, !!id);
  const items = Array.isArray(validationBody.items) ? validationBody.items.map(normalizeItem) : [];
  const resolvedType = payload.type || body.type;
  const flashScopes = ACTIVITY_PRICE_TYPES.has(resolvedType) ? normalizeFlashSaleScopes(items) : null;
  const bodyScopes = flashScopes || normalizeScopes(validationBody);
  const merged = {
    ...payload,
    type: resolvedType,
    items,
    scope_type: bodyScopes.scopeType,
    scope_ids: bodyScopes.scopes.map((scope) => scope.scope_id),
  };
  return { payload, items, resolvedType, merged, validationBody };
}

async function precheckActivityBeforePublish(body, id = null) {
  const blocking = [];
  const warnings = [];
  let built = null;
  try {
    built = await buildPublishValidationPayload(body, id);
    assertPublishRules(built.merged);
  } catch (err) {
    blocking.push(buildPublishIssue('validation_error', err?.message || '活动基础规则未通过'));
    return { data: { ok: false, blocking, warnings, snapshot: null } };
  }

  try {
    await assertCouponActivityCouponsSelectable(built.merged);
  } catch (err) {
    blocking.push(buildPublishIssue('coupon_template_error', err?.message || '优惠券活动配置未通过'));
  }

  if (ACTIVITY_PRICE_TYPES.has(built.resolvedType)) {
    try {
      await validateProductsForFlashSale(
        built.items,
        built.payload.start_at || body.start_at,
        built.payload.end_at || body.end_at,
        id,
      );
    } catch (err) {
      blocking.push(buildPublishIssue('activity_product_error', err?.message || '活动商品配置未通过'));
    }
  }

  const conflicts = await buildActivityRuleConflicts(built.merged, id);
  blocking.push(...conflicts);
  if (!blocking.length && !warnings.length) {
    warnings.push(buildPublishIssue('publish_ready', '未发现阻断发布的问题', { severity: 'info' }));
  }
  return {
    data: {
      ok: blocking.length === 0,
      blocking,
      warnings,
      snapshot: buildPrecheckSnapshot(built, id),
    },
  };
}

async function searchActivityProducts(query) {
  return repo.searchActivityProducts(query);
}

module.exports = {
  listActivities,
  getActivity,
  createActivity,
  updateActivity,
  copyActivity,
  updateActivityStatus,
  deleteActivity,
  validateActivityBeforePublish,
  precheckActivityBeforePublish,
  searchActivityProducts,
};

const { generateId } = require('../../../utils/helpers');
const couponRepo = require('../repository/coupon.repository');
const {
  klDateTimeOrNull,
  mysqlUtcDateTime,
} = require('../../../utils/couponBusinessTime');

function normalizeCouponType(type) {
  if (type === 'amount') return 'fixed';
  if (type === 'percent') return 'percentage';
  return type || 'fixed';
}

function parseJsonArray(raw, fallback = []) {
  if (!raw) return fallback;
  if (Array.isArray(raw)) return raw.map((x) => String(x || '').trim()).filter(Boolean);
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map((x) => String(x || '').trim()).filter(Boolean);
    } catch {
      return raw.split(',').map((x) => x.trim()).filter(Boolean);
    }
  }
  return fallback;
}

function parseSnapshot(raw) {
  if (!raw) return null;
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function dateOrNull(value) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function couponDateOrNull(value, mode = 'exact') {
  return klDateTimeOrNull(value, mode);
}

function mysqlDateTime(value) {
  return mysqlUtcDateTime(value);
}

function addDays(date, days) {
  const d = new Date(date.getTime());
  d.setDate(d.getDate() + days);
  return d;
}

function minDate(...values) {
  const dates = values.map(dateOrNull).filter(Boolean);
  if (!dates.length) return null;
  return new Date(Math.min(...dates.map((d) => d.getTime())));
}

function resolveCampaignCutoff(coupon) {
  const campaignEnd = couponDateOrNull(coupon.campaign_end_at || coupon.claim_end_at, 'endOfDay');
  if (!campaignEnd) return null;
  const postEndDays = Math.max(0, Number(coupon.post_end_valid_days || 0));
  return postEndDays > 0 ? addDays(campaignEnd, postEndDays) : campaignEnd;
}

function buildCouponSnapshot(coupon, claimedAt = new Date()) {
  return {
    coupon_id: coupon.id,
    code: coupon.code,
    title: coupon.title,
    type: normalizeCouponType(coupon.type),
    value: Number(coupon.value || 0),
    min_amount: Number(coupon.min_amount || 0),
    scope_type: coupon.scope_type || 'all',
    usable_scope_type: coupon.usable_scope_type || 'all',
    usable_product_ids: parseJsonArray(coupon.usable_product_ids),
    usable_category_ids: parseJsonArray(coupon.usable_category_ids),
    category_ids: parseJsonArray(coupon.category_ids),
    category_names: parseJsonArray(coupon.category_names),
    stackable_with_activity: coupon.stackable_with_activity !== 0 && coupon.stackable_with_activity !== false,
    new_user_only: !!coupon.new_user_only,
    member_only: !!coupon.member_only,
    validity_mode: coupon.validity_mode || 'absolute',
    claim_start_at: coupon.claim_start_at || null,
    claim_end_at: coupon.claim_end_at || null,
    campaign_start_at: coupon.campaign_start_at || coupon.claim_start_at || null,
    campaign_end_at: coupon.campaign_end_at || coupon.claim_end_at || null,
    post_end_valid_days: coupon.post_end_valid_days == null ? null : Number(coupon.post_end_valid_days),
    use_start_at: coupon.use_start_at || coupon.start_date || null,
    use_end_at: coupon.use_end_at || coupon.end_date || null,
    valid_days_after_claim: coupon.valid_days_after_claim == null ? null : Number(coupon.valid_days_after_claim),
    follow_activity_id: coupon.follow_activity_id || null,
    description: coupon.description || '',
    display_badge: coupon.display_badge || '',
    claimed_at: claimedAt.toISOString(),
  };
}

function resolveUserCouponValidity(coupon, now = new Date()) {
  const campaignCutoff = resolveCampaignCutoff(coupon);
  if ((coupon.validity_mode || 'absolute') === 'after_claim') {
    const days = Math.max(1, Number(coupon.valid_days_after_claim || 1));
    return { validFrom: now, validUntil: minDate(addDays(now, days), campaignCutoff) || addDays(now, days) };
  }
  const absoluteUntil = couponDateOrNull(coupon.use_end_at, 'endOfDay')
    || couponDateOrNull(coupon.end_date, 'endOfDay')
    || null;
  return {
    validFrom: couponDateOrNull(coupon.use_start_at, 'startOfDay')
      || couponDateOrNull(coupon.start_date, 'startOfDay')
      || now,
    validUntil: minDate(absoluteUntil, campaignCutoff) || absoluteUntil || campaignCutoff,
  };
}

function buildEffectiveCoupon(row = {}) {
  const snap = parseSnapshot(row.coupon_snapshot);
  const source = snap || row;
  return {
    id: source.coupon_id || source.id || row.coupon_id,
    code: source.code || row.code || '',
    title: source.title || row.title || '',
    type: normalizeCouponType(source.type || row.type),
    value: Number(source.value ?? row.value ?? 0),
    min_amount: Number(source.min_amount ?? row.min_amount ?? 0),
    start_date: source.use_start_at || source.start_date || row.use_start_at || row.start_date || '',
    end_date: source.use_end_at || source.end_date || row.use_end_at || row.end_date || '',
    campaign_start_at: source.campaign_start_at || row.campaign_start_at || row.claim_start_at || '',
    campaign_end_at: source.campaign_end_at || row.campaign_end_at || row.claim_end_at || '',
    post_end_valid_days: source.post_end_valid_days ?? row.post_end_valid_days ?? null,
    status: row.coupon_publish_status || row.coupon_status || row.publish_status || row.status || 'active',
    description: source.description || row.description || '',
    scope_type: source.scope_type || row.scope_type || 'all',
    display_badge: source.display_badge || row.display_badge || '',
    category_ids: Array.isArray(source.category_ids) ? source.category_ids : parseJsonArray(row.category_ids),
    category_names: Array.isArray(source.category_names) ? source.category_names : parseJsonArray(row.category_names),
    usable_scope_type: source.usable_scope_type || row.usable_scope_type || 'all',
    usable_product_ids: Array.isArray(source.usable_product_ids) ? source.usable_product_ids : parseJsonArray(row.usable_product_ids),
    usable_category_ids: Array.isArray(source.usable_category_ids) ? source.usable_category_ids : parseJsonArray(row.usable_category_ids),
    stackable_with_activity: source.stackable_with_activity !== false && source.stackable_with_activity !== 0,
  };
}

function resolveUserCouponRuntimeStatus(row, now = new Date()) {
  const status = String(row.status || '');
  if (['used', 'expired', 'invalidated', 'cancelled'].includes(status)) return status;
  if (row.invalidated_at || row.stop_use_at) return 'invalidated';
  const validFrom = dateOrNull(row.valid_from);
  const validUntil = dateOrNull(row.valid_until);
  if (validUntil && validUntil < now) return 'expired';
  if (validFrom && validFrom > now) return 'pending';
  return status || 'available';
}

async function insertCouponEvent(q, event) {
  await couponRepo.insertCouponEvent(q, { ...event, id: event.id || generateId() });
}

async function expireUserCouponsNow(q, options = {}) {
  const rows = await couponRepo.selectExpiredUserCoupons(q, Math.max(1, Math.min(1000, Number(options.limit || 500))));
  if (!rows.length) return { expired: 0 };
  const ids = rows.map((r) => r.id);
  await couponRepo.markUserCouponsExpired(q, ids, '优惠券已过期');
  for (const row of rows) {
    await insertCouponEvent(q, {
      couponId: row.coupon_id,
      userCouponId: row.id,
      userId: row.user_id,
      eventType: 'expired',
      reason: '优惠券已过期',
    });
  }
  return { expired: rows.length };
}

async function restoreCouponAfterOrderCancelled(q, userCouponId, options = {}) {
  const row = await couponRepo.selectUserCouponForRestore(q, userCouponId);
  if (!row) return { restored: false, status: null };
  let nextStatus = 'available';
  let reason = options.reason || '订单取消返还优惠券';
  const nowStatus = resolveUserCouponRuntimeStatus({ ...row, status: 'available' });
  if (nowStatus === 'expired') {
    nextStatus = 'expired';
    reason = '订单取消时优惠券已过期';
  } else if (
    row.invalidated_at
    || row.stop_use_at
    || row.deleted_at
    || ['disabled', 'archived'].includes(String(row.coupon_publish_status || row.coupon_status || ''))
  ) {
    nextStatus = 'invalidated';
    reason = '订单取消时优惠券已失效';
  }
  await couponRepo.updateUserCouponAfterRestore(q, userCouponId, nextStatus, options.reason || reason, reason);
  await insertCouponEvent(q, {
    couponId: row.coupon_id,
    userCouponId,
    userId: row.user_id,
    eventType: nextStatus === 'available' ? 'returned' : nextStatus,
    orderId: options.orderId || row.order_id,
    orderNo: options.orderNo || row.order_no,
    adminUserId: options.adminUserId || null,
    reason,
  });
  return { restored: nextStatus === 'available', status: nextStatus };
}

module.exports = {
  normalizeCouponType,
  parseJsonArray,
  parseSnapshot,
  couponDateOrNull,
  mysqlDateTime,
  buildCouponSnapshot,
  resolveUserCouponValidity,
  buildEffectiveCoupon,
  resolveUserCouponRuntimeStatus,
  insertCouponEvent,
  expireUserCouponsNow,
  restoreCouponAfterOrderCancelled,
};

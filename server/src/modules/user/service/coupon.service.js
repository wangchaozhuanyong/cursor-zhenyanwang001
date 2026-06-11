const { generateId } = require('../../../utils/helpers');
const repo = require('../repository/coupon.repository');
const lifecycle = require('./couponLifecycle.service');
const memberLevelService = require('./memberLevel.service');
const claimability = require('./couponClaimability.service');
const { klDateString } = require('../../../utils/klDateRange');

function normalizeCouponType(type) {
  return lifecycle.normalizeCouponType(type);
}

function dateOnly(value) {
  if (!value) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function normalizeCouponStatus(status, endDate) {
  const today = klDateString();
  if (status === 'available' && dateOnly(endDate) && dateOnly(endDate) < today) return 'expired';
  return status;
}

function hasCouponMemberPrivilege(memberContext) {
  const level = memberContext?.level;
  if (!level?.id) return false;
  return level.is_default !== true;
}

function isClaimWindowOpen(coupon, now = new Date()) {
  const publishStatus = String(coupon.publish_status || (coupon.status === 'available' ? 'active' : coupon.status || ''));
  if (coupon.deleted_at || coupon.archived_at || coupon.invalidated_at || coupon.stop_claim_at) return false;
  if (publishStatus !== 'active') return false;
  if (!['available', 'active'].includes(String(coupon.status || 'available'))) return false;
  const start = coupon.campaign_start_at
    ? lifecycle.couponDateOrNull(coupon.campaign_start_at, 'startOfDay')
    : (coupon.claim_start_at
      ? lifecycle.couponDateOrNull(coupon.claim_start_at, 'startOfDay')
      : (coupon.start_date ? lifecycle.couponDateOrNull(dateOnly(coupon.start_date), 'startOfDay') : null));
  const end = coupon.campaign_end_at
    ? lifecycle.couponDateOrNull(coupon.campaign_end_at, 'endOfDay')
    : (coupon.claim_end_at
      ? lifecycle.couponDateOrNull(coupon.claim_end_at, 'endOfDay')
      : (coupon.end_date ? lifecycle.couponDateOrNull(dateOnly(coupon.end_date), 'endOfDay') : null));
  if (start && start > now) return false;
  if (end && end < now) return false;
  return true;
}

function claimError(code, reason, message) {
  return { error: { code, reason, message } };
}

function claimabilityForUserCouponStatus(status) {
  if (status === 'available' || status === 'pending' || status === 'locked') {
    return {
      claimable: false,
      claim_status: 'already_claimed',
      claim_reason: '已领取',
      requires_login: false,
      requires_member: false,
      requires_new_user: false,
    };
  }
  if (status === 'expired') {
    return { claimable: false, claim_status: 'ended', claim_reason: '优惠券已过期', requires_login: false, requires_member: false, requires_new_user: false };
  }
  if (status === 'invalidated' || status === 'cancelled') {
    return { claimable: false, claim_status: 'disabled', claim_reason: '优惠券已失效', requires_login: false, requires_member: false, requires_new_user: false };
  }
  return { claimable: false, claim_status: 'already_claimed', claim_reason: '已领取', requires_login: false, requires_member: false, requires_new_user: false };
}

function mapUserCouponRow(r) {
  const coupon = lifecycle.buildEffectiveCoupon(r);
  const status = lifecycle.resolveUserCouponRuntimeStatus(r);
  const claimState = claimabilityForUserCouponStatus(status);
  return {
    id: r.id,
    claimed_at: r.claimed_at || '',
    used_at: r.used_at || undefined,
    status,
    valid_from: r.valid_from || undefined,
    valid_until: r.valid_until || undefined,
    issue_channel: r.issue_channel || undefined,
    order_id: r.order_id || undefined,
    order_no: r.order_no || undefined,
    discount_amount: r.discount_amount == null ? undefined : Number(r.discount_amount),
    invalid_reason: r.invalid_reason || undefined,
    returned_at: r.returned_at || undefined,
    return_reason: r.return_reason || undefined,
    ...claimState,
    issue_activity_id: r.issue_activity_id || undefined,
    campaign_id: r.issue_activity_id || undefined,
    coupon: {
      ...coupon,
      ...claimState,
      issue_activity_id: r.issue_activity_id || coupon.issue_activity_id || undefined,
      campaign_id: r.issue_activity_id || coupon.campaign_id || undefined,
      status: normalizeCouponStatus(coupon.status, coupon.end_date),
    },
  };
}

function mapCouponEntity(c) {
  const categoryIds = typeof c.category_ids === 'string' && c.category_ids
    ? c.category_ids.split(',').filter(Boolean)
    : [];
  const categoryNames = typeof c.category_names === 'string' && c.category_names
    ? c.category_names.split(',').filter(Boolean)
    : [];
  return {
    id: c.id,
    claimed_at: '',
    status: 'available',
    issue_activity_id: c.issue_activity_id || c.source_campaign_id || undefined,
    campaign_id: c.campaign_id || c.source_campaign_id || undefined,
    claimable: c.claimable,
    claim_status: c.claim_status,
    claim_reason: c.claim_reason,
    requires_login: c.requires_login,
    requires_member: c.requires_member,
    requires_new_user: c.requires_new_user,
    coupon: {
      id: c.id,
      code: c.code,
      title: c.title,
      type: normalizeCouponType(c.type),
      value: parseFloat(c.value),
      min_amount: parseFloat(c.min_amount),
      start_date: c.start_date,
      end_date: c.end_date,
      campaign_start_at: c.campaign_start_at || c.claim_start_at || undefined,
      campaign_end_at: c.campaign_end_at || c.claim_end_at || undefined,
      post_end_valid_days: c.post_end_valid_days == null ? undefined : Number(c.post_end_valid_days),
      status: normalizeCouponStatus(c.status, c.end_date),
      description: c.description || undefined,
      scope_type: c.scope_type || 'all',
      display_badge: c.display_badge || '',
      category_ids: categoryIds,
      category_names: categoryNames,
      member_only: !!c.member_only,
      new_user_only: !!c.new_user_only,
      auto_issue: !!c.auto_issue,
      per_user_limit: c.per_user_limit == null ? undefined : Number(c.per_user_limit),
      total_quantity: c.total_quantity == null ? undefined : Number(c.total_quantity),
      claimed_count: c.claimed_count == null ? undefined : Number(c.claimed_count),
      source_campaign_id: c.source_campaign_id || c.campaign_id || undefined,
    },
  };
}

const USER_COUPON_STATUSES = new Set([
  'all',
  'available',
  'pending',
  'used',
  'expired',
  'invalidated',
  'returned',
]);

function normalizeUserCouponListStatus(status) {
  const value = String(status || 'available').trim();
  return USER_COUPON_STATUSES.has(value) ? value : 'available';
}

const COUPON_CENTER_DISPLAY_POSITIONS = ['home_coupon_zone', 'home_coupon_center', 'home_new_user_gift'];

function mergeCouponRows(primaryRows, extraRows) {
  const seen = new Set();
  const merged = [];
  for (const row of [...(primaryRows || []), ...(extraRows || [])]) {
    const id = String(row?.id || '').trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    merged.push(row);
  }
  return merged;
}

async function getUserCoupons(userId, query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(query.pageSize, 10) || 20));
  const status = normalizeUserCouponListStatus(query.status);
  const total = await repo.countUserCoupons(userId, status);
  const offset = (page - 1) * pageSize;
  const rows = await repo.selectUserCouponsPage(userId, status, pageSize, offset);
  const list = rows.map(mapUserCouponRow);
  return { list, total, page, pageSize };
}

async function getCouponCenter(userId) {
  const [claimableCoupons, mine] = await Promise.all([
    getAvailableCoupons(userId, { includeDisplayPositions: true, includeAudienceLimited: true }),
    userId ? getUserCoupons(userId, { status: 'available', page: 1, pageSize: 50 }) : Promise.resolve({ list: [], total: 0 }),
  ]);
  return {
    usable_count: Number(mine.total || mine.list?.length || 0),
    claimable_count: claimableCoupons.length,
    my_usable_coupons: mine.list || [],
    claimable_coupons: claimableCoupons,
  };
}

async function getAvailableCoupons(userId, options = {}) {
  const baseCoupons = await repo.selectAvailableCoupons();
  const displayCoupons = options.includeDisplayPositions && typeof repo.selectAvailableCouponsByDisplayPositions === 'function'
    ? await repo.selectAvailableCouponsByDisplayPositions(COUPON_CENTER_DISPLAY_POSITIONS)
    : [];
  const coupons = mergeCouponRows(baseCoupons, displayCoupons);

  const decorated = await claimability.decorateCouponsWithClaimability(repo, coupons, userId);
  return decorated
    .filter((c) => isClaimWindowOpen(c, new Date()))
    .filter((c) => !c.auto_issue)
    .filter((c) => !userId || options.includeAudienceLimited || c.claimable)
    .map(mapCouponEntity);
}

async function assertCouponClaimable(userId, coupon) {
  if (!coupon) return claimError(404, 'disabled', '优惠券不存在或不在有效期内');
  if (!isClaimWindowOpen(coupon)) {
    return claimError(400, 'disabled', '该优惠券暂不可领取');
  }
  if (coupon.auto_issue) {
    return claimError(400, 'disabled', '该优惠券为系统自动发放，不可手动领取');
  }
  if (coupon.new_user_only) {
    const orderCount = await repo.selectUserOrderCount(userId);
    if (orderCount > 0) {
      return claimError(403, 'new_user_only', '该优惠券仅限新用户领取');
    }
  }
  if (coupon.member_only) {
    const memberContext = await memberLevelService.getUserMemberLevel(userId);
    if (!hasCouponMemberPrivilege(memberContext)) {
      return claimError(403, 'member_required', '该优惠券仅限会员领取');
    }
  }
  const perUserLimit = Math.max(1, Number(coupon.per_user_limit || 1));
  const userClaims = await repo.countUserClaimsForCoupon(userId, coupon.id);
  if (userClaims >= perUserLimit) {
    return claimError(409, 'already_claimed', '已达到每人领取上限');
  }
  const totalQty = Number(coupon.total_quantity || 0);
  if (totalQty > 0) {
    const totalClaims = Number(coupon.claimed_count ?? await repo.countTotalClaimsForCoupon(coupon.id));
    if (totalClaims >= totalQty) {
      return claimError(409, 'sold_out', '优惠券已领完');
    }
  }
  return null;
}

async function resolveCampaignClaim(userId, couponId, issueActivityId) {
  const adminApi = /** @type {any} */ (require('../../admin')).api || {};
  if (!issueActivityId) return { issueActivityId: null };
  if (typeof adminApi.resolveCouponCampaignClaim === 'function') {
    const resolved = await adminApi.resolveCouponCampaignClaim(issueActivityId, couponId, userId);
    if (!resolved) {
      return claimError(403, 'not_in_audience', '该优惠券活动不适合当前用户');
    }
    return { issueActivityId: resolved.campaignId || null };
  }
  if (!issueActivityId) return { issueActivityId: null };
  if (typeof adminApi.isCouponCampaignClaimAllowed !== 'function') return null;
  const allowed = await adminApi.isCouponCampaignClaimAllowed(issueActivityId, couponId, userId);
  if (!allowed) {
    return claimError(403, 'not_in_audience', '该优惠券活动不适合当前用户');
  }
  return { issueActivityId };
}

async function claimCoupon(userId, body) {
  const { code } = body;
  let issueActivityId = String(body.activity_id || '').trim() || null;
  if (!code) return claimError(400, 'disabled', '请提供优惠券码或ID');

  const conn = await repo.getPool().getConnection();
  try {
    await conn.beginTransaction();
    const coupon = await repo.selectCouponByCodeOrIdForUpdate(conn, code);
    const claimErr = await assertCouponClaimable(userId, coupon);
    if (claimErr) {
      await conn.rollback();
      return claimErr;
    }
    const legacyActivityId = issueActivityId && issueActivityId !== coupon.id && issueActivityId !== coupon.source_campaign_id
      ? issueActivityId
      : null;
    const campaignClaim = await resolveCampaignClaim(userId, coupon.id, legacyActivityId);
    if (campaignClaim?.error) {
      await conn.rollback();
      return campaignClaim;
    }
    issueActivityId = campaignClaim?.issueActivityId || coupon.source_campaign_id || coupon.id;
    const perUserLimit = Math.max(1, Number(coupon.per_user_limit || 1));
    const userClaims = await repo.countUserClaimsForCouponInConn(conn, userId, coupon.id);
    if (userClaims >= perUserLimit) {
      await conn.rollback();
      return claimError(409, 'already_claimed', '已达到每人领取上限');
    }
    const claimed = await repo.incrementClaimedCountIfAvailable(conn, coupon.id);
    if (!claimed) {
      await conn.rollback();
      return claimError(409, 'sold_out', '优惠券已领完');
    }
    const id = generateId();
    const now = new Date();
    const snapshot = lifecycle.buildCouponSnapshot(coupon, now);
    const validity = lifecycle.resolveUserCouponValidity(coupon, now);
    const status = validity.validFrom && validity.validFrom > now ? 'pending' : 'available';
    await repo.insertUserCouponWithMeta(conn, {
      id,
      userId,
      couponId: coupon.id,
      snapshot,
      status,
      validFrom: lifecycle.mysqlDateTime(validity.validFrom),
      validUntil: lifecycle.mysqlDateTime(validity.validUntil),
      issueChannel: 'self_claim',
      issueActivityId,
    });
    await lifecycle.insertCouponEvent(conn, {
      couponId: coupon.id,
      userCouponId: id,
      userId,
      eventType: 'claimed',
      metadata: { validity, issue_activity_id: issueActivityId },
    });
    await conn.commit();

    return {
      data: {
        id,
        claimed_at: now.toISOString(),
        status,
        valid_from: validity.validFrom ? validity.validFrom.toISOString() : undefined,
        valid_until: validity.validUntil ? validity.validUntil.toISOString() : undefined,
        issue_channel: 'self_claim',
        issue_activity_id: issueActivityId || undefined,
        coupon: lifecycle.buildEffectiveCoupon({ ...coupon, coupon_snapshot: snapshot, coupon_id: coupon.id }),
      },
      message: '领取成功',
    };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function expireUserCouponsNow() {
  return lifecycle.expireUserCouponsNow(repo.getPool());
}

module.exports = {
  getUserCoupons,
  getAvailableCoupons,
  getCouponCenter,
  claimCoupon,
  expireUserCouponsNow,
  decorateCouponsWithClaimability: (coupons, userId) => claimability.decorateCouponsWithClaimability(repo, coupons, userId),
};

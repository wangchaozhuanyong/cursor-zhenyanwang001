const { generateId } = require('../../../utils/helpers');
const repo = require('../repository/coupon.repository');
const lifecycle = require('./couponLifecycle.service');
const memberLevelService = require('./memberLevel.service');

function normalizeCouponType(type) {
  return lifecycle.normalizeCouponType(type);
}

function dateOnly(value) {
  if (!value) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function normalizeCouponStatus(status, endDate) {
  const today = new Date().toISOString().slice(0, 10);
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
  const start = coupon.claim_start_at ? new Date(coupon.claim_start_at) : (coupon.start_date ? new Date(`${dateOnly(coupon.start_date)}T00:00:00`) : null);
  const end = coupon.claim_end_at ? new Date(coupon.claim_end_at) : (coupon.end_date ? new Date(`${dateOnly(coupon.end_date)}T23:59:59`) : null);
  if (start && start > now) return false;
  if (end && end < now) return false;
  return true;
}

function mapUserCouponRow(r) {
  const coupon = lifecycle.buildEffectiveCoupon(r);
  const status = lifecycle.resolveUserCouponRuntimeStatus(r);
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
    issue_activity_id: r.issue_activity_id || undefined,
    discount_amount: r.discount_amount == null ? undefined : Number(r.discount_amount),
    invalid_reason: r.invalid_reason || undefined,
    returned_at: r.returned_at || undefined,
    return_reason: r.return_reason || undefined,
    coupon: { ...coupon, status: normalizeCouponStatus(coupon.status, coupon.end_date) },
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
    coupon: {
      id: c.id,
      code: c.code,
      title: c.title,
      type: normalizeCouponType(c.type),
      value: parseFloat(c.value),
      min_amount: parseFloat(c.min_amount),
      start_date: c.start_date,
      end_date: c.end_date,
      status: normalizeCouponStatus(c.status, c.end_date),
      description: c.description || undefined,
      scope_type: c.scope_type || 'all',
      display_badge: c.display_badge || '',
      category_ids: categoryIds,
      category_names: categoryNames,
    },
  };
}

async function getUserCoupons(userId, query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(query.pageSize, 10) || 20));
  const { status } = query;
  const total = await repo.countUserCoupons(userId, status);
  const offset = (page - 1) * pageSize;
  const rows = await repo.selectUserCouponsPage(userId, status, pageSize, offset);
  const list = rows.map(mapUserCouponRow);
  return { list, total, page, pageSize };
}

async function getAvailableCoupons(userId) {
  const coupons = await repo.selectAvailableCoupons();

  // 未登录：只能展示无需身份判断、无需“每人领取上限统计”的通用可领取券
  if (!userId) {
    const now = new Date();
    return coupons
      .filter((c) => !c.auto_issue)
      .filter((c) => !c.new_user_only)
      .filter((c) => !c.member_only)
      .filter((c) => isClaimWindowOpen(c, now))
      .map(mapCouponEntity);
  }

  const claimed = await repo.selectUserCouponClaimCounts(userId);
  const claimedCountMap = new Map(claimed.map((r) => [String(r.coupon_id), Number(r.cnt || 0)]));
  const needsOrderCount = coupons.some((c) => !!c.new_user_only);
  const needsMemberLevel = coupons.some((c) => !!c.member_only);
  const [orderCount, memberContext] = await Promise.all([
    needsOrderCount ? repo.selectUserOrderCount(userId) : Promise.resolve(0),
    needsMemberLevel ? memberLevelService.getUserMemberLevel(userId) : Promise.resolve({ level: null }),
  ]);
  const hasMemberLevel = hasCouponMemberPrivilege(memberContext);
  return coupons
    .filter((c) => Number(claimedCountMap.get(String(c.id)) || 0) < Math.max(1, Number(c.per_user_limit || 1)))
    .filter((c) => !c.auto_issue)
    .filter((c) => !c.new_user_only || orderCount <= 0)
    .filter((c) => !c.member_only || hasMemberLevel)
    .map(mapCouponEntity);
}

async function assertCouponClaimable(userId, coupon) {
  if (!coupon) return { error: { code: 404, message: '优惠券不存在或不在有效期内' } };
  if (!isClaimWindowOpen(coupon)) {
    return { error: { code: 400, message: '该优惠券暂不可领取' } };
  }
  if (coupon.auto_issue) {
    return { error: { code: 400, message: '该优惠券为系统自动发放，不可手动领取' } };
  }
  if (coupon.new_user_only) {
    const orderCount = await repo.selectUserOrderCount(userId);
    if (orderCount > 0) {
      return { error: { code: 403, message: '该优惠券仅限新用户' } };
    }
  }
  if (coupon.member_only) {
    const memberContext = await memberLevelService.getUserMemberLevel(userId);
    if (!hasCouponMemberPrivilege(memberContext)) {
      return { error: { code: 403, message: '该优惠券仅限会员领取' } };
    }
  }
  const perUserLimit = Math.max(1, Number(coupon.per_user_limit || 1));
  const userClaims = await repo.countUserClaimsForCoupon(userId, coupon.id);
  if (userClaims >= perUserLimit) {
    return { error: { code: 409, message: '已达到每人领取上限' } };
  }
  const totalQty = Number(coupon.total_quantity || 0);
  if (totalQty > 0) {
    const totalClaims = Number(coupon.claimed_count ?? await repo.countTotalClaimsForCoupon(coupon.id));
    if (totalClaims >= totalQty) {
      return { error: { code: 409, message: '优惠券已领完' } };
    }
  }
  return null;
}

async function resolveCampaignClaim(userId, couponId, issueActivityId) {
  const adminApi = /** @type {any} */ (require('../../admin')).api || {};
  if (typeof adminApi.resolveCouponCampaignClaim === 'function') {
    const resolved = await adminApi.resolveCouponCampaignClaim(issueActivityId, couponId, userId);
    if (!resolved) {
      return { error: { code: 403, message: '该优惠券活动不适合当前用户，不能领取' } };
    }
    return { issueActivityId: resolved.campaignId || null };
  }
  if (!issueActivityId) return { issueActivityId: null };
  if (typeof adminApi.isCouponCampaignClaimAllowed !== 'function') return null;
  const allowed = await adminApi.isCouponCampaignClaimAllowed(issueActivityId, couponId, userId);
  if (!allowed) {
    return { error: { code: 403, message: '该优惠券活动不适合当前用户，不能领取' } };
  }
  return { issueActivityId };
}

async function claimCoupon(userId, body) {
  const { code } = body;
  let issueActivityId = String(body.activity_id || '').trim() || null;
  if (!code) return { error: { code: 400, message: '请提供优惠券码或ID' } };

  const conn = await repo.getPool().getConnection();
  try {
    await conn.beginTransaction();
    const coupon = await repo.selectCouponByCodeOrIdForUpdate(conn, code);
    const claimErr = await assertCouponClaimable(userId, coupon);
    if (claimErr) {
      await conn.rollback();
      return claimErr;
    }
    const campaignClaim = await resolveCampaignClaim(userId, coupon.id, issueActivityId);
    if (campaignClaim?.error) {
      await conn.rollback();
      return campaignClaim;
    }
    issueActivityId = campaignClaim?.issueActivityId || null;
    const perUserLimit = Math.max(1, Number(coupon.per_user_limit || 1));
    const userClaims = await repo.countUserClaimsForCouponInConn(conn, userId, coupon.id);
    if (userClaims >= perUserLimit) {
      await conn.rollback();
      return { error: { code: 409, message: '已达到每人领取上限' } };
    }
    const claimed = await repo.incrementClaimedCountIfAvailable(conn, coupon.id);
    if (!claimed) {
      await conn.rollback();
      return { error: { code: 409, message: '优惠券已领完' } };
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
  claimCoupon,
  expireUserCouponsNow,
};

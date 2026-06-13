const memberLevelService = require('./memberLevel.service');
const { klDateString } = require('../../../utils/klDateRange');

function dateOnly(value) {
  if (!value) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function hasCouponMemberPrivilege(memberContext) {
  const level = memberContext?.level;
  return Boolean(level?.id);
}

function isClaimWindowOpen(coupon, now = new Date()) {
  const publishStatus = String(coupon.publish_status || (coupon.status === 'available' ? 'active' : coupon.status || ''));
  if (coupon.deleted_at || coupon.archived_at || coupon.invalidated_at || coupon.stop_claim_at) return false;
  if (publishStatus && publishStatus !== 'active') return false;
  if (!['available', 'active'].includes(String(coupon.status || 'available'))) return false;
  const today = klDateString();
  const startDate = dateOnly(coupon.claim_start_at || coupon.campaign_start_at || coupon.start_date);
  const endDate = dateOnly(coupon.claim_end_at || coupon.campaign_end_at || coupon.end_date);
  if (startDate && startDate > today) return false;
  if (endDate && endDate < today) return false;
  return true;
}

function baseClaimability(overrides = {}) {
  const status = overrides.claim_status || 'claimable';
  return {
    claimable: status === 'claimable',
    claim_status: status,
    claim_reason: overrides.claim_reason || (status === 'claimable' ? '可领取' : '暂不可领取'),
    requires_login: !!overrides.requires_login,
    requires_member: !!overrides.requires_member,
    requires_new_user: !!overrides.requires_new_user,
    issue_activity_id: overrides.issue_activity_id || undefined,
    campaign_id: overrides.campaign_id || overrides.issue_activity_id || undefined,
    audience_type: overrides.audience_type || undefined,
  };
}

async function buildAudienceContext(repo, userId, coupons = []) {
  const id = String(userId || '').trim();
  if (!id) return { userId: null, claimedCountMap: new Map(), orderCount: 0, memberContext: null };
  const needsOrderCount = coupons.some((c) => !!c.new_user_only || c.audience_type === 'new_user' || c.audience_type === 'old_user');
  const needsMemberLevel = coupons.some((c) => !!c.member_only || c.audience_type === 'member_level');
  const [claimed, orderCount, memberContext] = await Promise.all([
    repo.selectUserCouponClaimCounts(id),
    needsOrderCount ? repo.selectUserOrderCount(id) : Promise.resolve(0),
    needsMemberLevel ? memberLevelService.getUserMemberLevel(id) : Promise.resolve({ level: null }),
  ]);
  return {
    userId: id,
    claimedCountMap: new Map(claimed.map((r) => [String(r.coupon_id), Number(r.cnt || 0)])),
    orderCount,
    memberContext,
  };
}

function resolveCouponClaimability(coupon, context, source = {}) {
  const issueActivityId = source.issue_activity_id || coupon.issue_activity_id || coupon.source_campaign_id || undefined;
  const audienceType = source.audience_type || coupon.audience_type || undefined;
  const common = {
    issue_activity_id: issueActivityId,
    campaign_id: source.campaign_id || coupon.campaign_id || issueActivityId,
    audience_type: audienceType,
  };

  if (!isClaimWindowOpen(coupon)) {
    const today = klDateString();
    const startDate = dateOnly(coupon.claim_start_at || coupon.campaign_start_at || coupon.start_date);
    const endDate = dateOnly(coupon.claim_end_at || coupon.campaign_end_at || coupon.end_date);
    if (startDate && startDate > today) return baseClaimability({ ...common, claim_status: 'not_started', claim_reason: '优惠券活动尚未开始' });
    if (endDate && endDate < today) return baseClaimability({ ...common, claim_status: 'ended', claim_reason: '优惠券活动已结束' });
    return baseClaimability({ ...common, claim_status: 'disabled', claim_reason: '优惠券暂不可领取' });
  }
  if (coupon.auto_issue) {
    return baseClaimability({ ...common, claim_status: 'disabled', claim_reason: '该优惠券为系统自动发放' });
  }
  if (!context.userId) {
    return baseClaimability({
      ...common,
      claim_status: 'login_required',
      claim_reason: coupon.member_only ? '会员专享，登录后查看资格' : '登录后领取',
      requires_login: true,
      requires_member: !!coupon.member_only,
      requires_new_user: !!coupon.new_user_only,
    });
  }
  if (coupon.new_user_only && Number(context.orderCount || 0) > 0) {
    return baseClaimability({ ...common, claim_status: 'new_user_only', claim_reason: '该优惠券仅限新用户领取', requires_new_user: true });
  }
  if (coupon.member_only && !hasCouponMemberPrivilege(context.memberContext)) {
    return baseClaimability({ ...common, claim_status: 'member_required', claim_reason: '该优惠券仅限会员领取', requires_member: true });
  }
  const perUserLimit = Math.max(1, Number(coupon.per_user_limit || 1));
  if (Number(context.claimedCountMap.get(String(coupon.id)) || 0) >= perUserLimit) {
    return baseClaimability({ ...common, claim_status: 'already_claimed', claim_reason: '已达到每人领取上限' });
  }
  const totalQty = Number(coupon.total_quantity || 0);
  if (totalQty > 0 && Number(coupon.claimed_count || 0) >= totalQty) {
    return baseClaimability({ ...common, claim_status: 'sold_out', claim_reason: '优惠券已领完' });
  }
  return baseClaimability(common);
}

async function decorateCouponsWithClaimability(repo, coupons = [], userId = null) {
  const list = Array.isArray(coupons) ? coupons : [];
  const context = await buildAudienceContext(repo, userId, list);
  return list.map((coupon) => ({
    ...coupon,
    ...resolveCouponClaimability(coupon, context, coupon),
  }));
}

module.exports = {
  decorateCouponsWithClaimability,
  resolveCouponClaimability,
};

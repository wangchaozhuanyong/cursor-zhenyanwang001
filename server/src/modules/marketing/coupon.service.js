const { generateId } = require('../../utils/helpers');
const repo = require('./coupon.repository');

function mapUserCouponRow(r) {
  return {
    id: r.id,
    claimed_at: r.claimed_at || '',
    used_at: r.used_at || undefined,
    status: r.status,
    coupon: {
      id: r.coupon_id,
      code: r.code,
      title: r.title,
      type: r.type,
      value: parseFloat(r.value),
      min_amount: parseFloat(r.min_amount),
      start_date: r.start_date,
      end_date: r.end_date,
      status: r.coupon_status,
      description: r.description || undefined,
    },
  };
}

function mapCouponEntity(c) {
  return {
    id: c.id,
    claimed_at: '',
    status: 'available',
    coupon: {
      id: c.id,
      code: c.code,
      title: c.title,
      type: c.type,
      value: parseFloat(c.value),
      min_amount: parseFloat(c.min_amount),
      start_date: c.start_date,
      end_date: c.end_date,
      status: c.status,
      description: c.description || undefined,
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
  const claimed = await repo.selectClaimedCouponIds(userId);
  const claimedSet = new Set(claimed.map((r) => r.coupon_id));
  return coupons.filter((c) => !claimedSet.has(c.id)).map(mapCouponEntity);
}

async function claimCoupon(userId, body) {
  const { code } = body;
  if (!code) return { error: { code: 400, message: '请提供优惠券码或ID' } };

  const coupon = await repo.selectCouponByCodeOrId(code);
  if (!coupon) return { error: { code: 404, message: '优惠券不存在或未到使用时间或已过期' } };

  const existing = await repo.findUserCoupon(userId, coupon.id);
  if (existing) return { error: { code: 409, message: '您已领取过该优惠券' } };

  const id = generateId();
  await repo.insertUserCoupon(id, userId, coupon.id);

  return {
    data: {
      id,
      claimed_at: new Date().toISOString(),
      status: 'available',
      coupon: {
        id: coupon.id,
        code: coupon.code,
        title: coupon.title,
        type: coupon.type,
        value: parseFloat(coupon.value),
        min_amount: parseFloat(coupon.min_amount),
        start_date: coupon.start_date,
        end_date: coupon.end_date,
        status: coupon.status,
        description: coupon.description || undefined,
      },
    },
    message: '领取成功',
  };
}

module.exports = {
  getUserCoupons,
  getAvailableCoupons,
  claimCoupon,
};

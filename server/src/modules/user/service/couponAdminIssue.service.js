const { generateId } = require('../../../utils/helpers');
const { BusinessError } = require('../../../errors/BusinessError');
const couponRepo = require('../repository/coupon.repository');
const couponLifecycle = require('./couponLifecycle.service');

function dateOnly(value) {
  if (!value) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function assertCouponActiveForIssue(coupon) {
  const publishStatus = String(coupon?.publish_status || (coupon?.status === 'available' ? 'active' : coupon?.status || ''));
  if (!coupon || coupon.deleted_at || coupon.archived_at || coupon.invalidated_at || publishStatus !== 'active' || !['available', 'active'].includes(String(coupon.status || 'available'))) {
    throw new BusinessError(400, '该优惠券未启用，不能发放');
  }
  const today = new Date().toISOString().slice(0, 10);
  if (dateOnly(coupon.claim_start_at || coupon.start_date) > today || dateOnly(coupon.claim_end_at || coupon.end_date) < today) {
    throw new BusinessError(400, '该优惠券不在有效期内，不能发放');
  }
}

async function issueCouponToUsers(couponId, userIds, options = {}) {
  const targetUserIds = Array.isArray(userIds)
    ? [...new Set(userIds.map((x) => String(x || '').trim()).filter(Boolean))]
    : [];
  if (!targetUserIds.length) return { issued: 0, targetUsers: 0 };

  const conn = await couponRepo.getPool().getConnection();
  let affected = 0;
  try {
    await conn.beginTransaction();
    const lockedCoupon = await couponRepo.selectCouponByCodeOrIdForUpdate(conn, couponId);
    assertCouponActiveForIssue(lockedCoupon);

    const totalQty = Number(lockedCoupon.total_quantity || 0);
    const totalClaims = totalQty > 0 ? await couponRepo.countTotalClaimsForCoupon(couponId) : 0;
    const remaining = totalQty > 0 ? Math.max(0, totalQty - totalClaims) : Infinity;
    if (remaining <= 0) throw new BusinessError(409, '优惠券已发放完');

    for (const userId of targetUserIds) {
      if (affected >= remaining) break;
      const userClaims = await couponRepo.countUserClaimsForCouponInConn(conn, userId, couponId);
      if (userClaims >= Math.max(1, Number(lockedCoupon.per_user_limit || 1))) continue;
      const claimed = await couponRepo.incrementClaimedCountIfAvailable(conn, couponId);
      if (!claimed) break;
      const id = generateId();
      const now = new Date();
      const snapshot = couponLifecycle.buildCouponSnapshot(lockedCoupon, now);
      const validity = couponLifecycle.resolveUserCouponValidity(lockedCoupon, now);
      await couponRepo.insertUserCouponWithMeta(conn, {
        id,
        userId,
        couponId,
        snapshot,
        status: validity.validFrom && validity.validFrom > now ? 'pending' : 'available',
        validFrom: couponLifecycle.mysqlDateTime(validity.validFrom),
        validUntil: couponLifecycle.mysqlDateTime(validity.validUntil),
        issueChannel: options.issueChannel || 'tag',
        issueActivityId: options.issueActivityId || null,
        sourceAdminId: options.adminUserId,
      });
      await couponLifecycle.insertCouponEvent(conn, {
        couponId,
        userCouponId: id,
        userId,
        eventType: 'issued',
        adminUserId: options.adminUserId,
        metadata: options.metadata || {},
      });
      affected += 1;
    }
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  return { issued: affected, targetUsers: targetUserIds.length };
}

module.exports = {
  issueCouponToUsers,
};

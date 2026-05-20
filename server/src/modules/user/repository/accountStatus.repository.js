const db = require('../../../config/db');

/**
 * @param {string} userId
 * @returns {Promise<{
 *   account_status: string,
 *   order_restricted: number,
 *   coupon_restricted: number,
 *   comment_restricted: number
 * } | null>}
 */
async function findUserStatusSnapshotByUserId(userId) {
  try {
    const [[row]] = await db.query(
      `SELECT u.account_status,
              COALESCE(ur.order_restricted, 0) AS order_restricted,
              COALESCE(ur.coupon_restricted, 0) AS coupon_restricted,
              COALESCE(ur.comment_restricted, 0) AS comment_restricted
       FROM users u
       LEFT JOIN user_restrictions ur ON ur.user_id = u.id
       WHERE u.id = ?
       LIMIT 1`,
      [userId],
    );
    return row || null;
  } catch {
    return null;
  }
}

module.exports = {
  findUserStatusSnapshotByUserId,
};

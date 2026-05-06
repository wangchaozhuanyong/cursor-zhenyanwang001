const db = require('../../config/db');
const { ORDER_STATUS } = require('../../constants/status');

async function selectUserInviteCode(userId) {
  const [[row]] = await db.query('SELECT invite_code FROM users WHERE id = ?', [userId]);
  return row || null;
}

async function countDirectByParentCode(inviteCode) {
  const [[{ directCount }]] = await db.query(
    'SELECT COUNT(*) AS directCount FROM users WHERE parent_invite_code = ?',
    [inviteCode],
  );
  return directCount;
}

async function sumOrderAmountByParentCode(inviteCode) {
  const [[{ totalOrderAmount }]] = await db.query(
    `SELECT COALESCE(SUM(o.total_amount), 0) AS totalOrderAmount
     FROM orders o
     JOIN users u ON o.user_id = u.id
     WHERE u.parent_invite_code = ? AND o.status != ?`,
    [inviteCode, ORDER_STATUS.CANCELLED],
  );
  return totalOrderAmount;
}

async function sumPositiveRewards(userId) {
  const [[{ rwd }]] = await db.query(
    `SELECT COALESCE(SUM(amount), 0) AS rwd FROM reward_records WHERE user_id = ? AND amount > 0`,
    [userId],
  );
  return rwd != null ? parseFloat(rwd) : 0;
}

async function selectDirectInviteCodes(parentCode) {
  const [rows] = await db.query(
    'SELECT invite_code FROM users WHERE parent_invite_code = ?',
    [parentCode],
  );
  return rows;
}

async function countByParentCodes(codes) {
  if (!codes.length) return 0;
  const [[{ cnt }]] = await db.query(
    `SELECT COUNT(*) AS cnt FROM users WHERE parent_invite_code IN (${codes.map(() => '?').join(',')})`,
    codes,
  );
  return cnt;
}

async function selectParentInvite(userId) {
  const [[row]] = await db.query('SELECT parent_invite_code FROM users WHERE id = ?', [userId]);
  return row || null;
}

async function selectUserIdByInviteCode(code) {
  const [[row]] = await db.query('SELECT id FROM users WHERE invite_code = ?', [code]);
  return row || null;
}

async function updateParentInviteCode(userId, inviteCode) {
  await db.query('UPDATE users SET parent_invite_code = ? WHERE id = ?', [inviteCode, userId]);
}

async function countInviteesByCode(inviteCode) {
  const [[{ total }]] = await db.query(
    'SELECT COUNT(*) AS total FROM users WHERE parent_invite_code = ?',
    [inviteCode],
  );
  return total;
}

async function selectInviteRecordsPage(userId, inviteCode, pageSize, offset) {
  const [rows] = await db.query(
    `SELECT u.id, u.nickname, u.avatar, u.created_at,
            COALESCE((
              SELECT SUM(rr.amount)
              FROM reward_records rr
              WHERE rr.user_id = ?
                AND rr.amount > 0
                AND rr.order_no IN (
                  SELECT o.order_no
                  FROM orders o
                  WHERE o.user_id = u.id
                )
            ), 0) AS reward_amount,
            (SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id AND o.status != ?) AS order_count
     FROM users u
     WHERE u.parent_invite_code = ?
     ORDER BY u.created_at DESC LIMIT ? OFFSET ?`,
    [userId, ORDER_STATUS.CANCELLED, inviteCode, pageSize, offset],
  );
  return rows;
}

module.exports = {
  selectUserInviteCode,
  countDirectByParentCode,
  sumOrderAmountByParentCode,
  sumPositiveRewards,
  selectDirectInviteCodes,
  countByParentCodes,
  selectParentInvite,
  selectUserIdByInviteCode,
  updateParentInviteCode,
  countInviteesByCode,
  selectInviteRecordsPage,
};

const db = require('../../config/db');
const { ORDER_STATUS } = require('../../constants/status');

function buildUserListWhere(keyword) {
  let where = 'WHERE 1=1';
  const params = [];
  if (keyword) {
    where += ' AND (nickname LIKE ? OR phone LIKE ?)';
    params.push(`%${keyword}%`, `%${keyword}%`);
  }
  return { where, params };
}

async function countUsers(where, params) {
  const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM users ${where}`, params);
  return total;
}

async function selectUsersPage(where, params, pageSize, offset) {
  const [rows] = await db.query(
    `SELECT id, phone, nickname, avatar, invite_code, parent_invite_code,
            points_balance, subordinate_enabled, wechat, whatsapp, created_at
     FROM users ${where}
     ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, offset],
  );
  return rows;
}

async function selectUsersForExport(where, params) {
  const [rows] = await db.query(
    `SELECT id, phone, nickname, avatar, invite_code, parent_invite_code,
            points_balance, subordinate_enabled, wechat, whatsapp, created_at
     FROM users ${where}
     ORDER BY created_at DESC`,
    params,
  );
  return rows;
}

async function selectUserSummaryById(userId) {
  const [[user]] = await db.query(
    `SELECT id, phone, nickname, avatar, invite_code, parent_invite_code,
            points_balance, subordinate_enabled, wechat, whatsapp, created_at
     FROM users WHERE id = ?`,
    [userId],
  );
  return user || null;
}

async function countOrdersByUserId(userId) {
  const [[{ orderCount }]] = await db.query(
    'SELECT COUNT(*) AS orderCount FROM orders WHERE user_id = ?',
    [userId],
  );
  return orderCount;
}

async function sumUserSpentExcludingCancelled(userId) {
  const [[{ totalSpent }]] = await db.query(
    `SELECT COALESCE(SUM(total_amount), 0) AS totalSpent FROM orders WHERE user_id = ? AND status != '${ORDER_STATUS.CANCELLED}'`,
    [userId],
  );
  return totalSpent;
}

async function updateUserDynamic(setFragments, values, userId) {
  await db.query(`UPDATE users SET ${setFragments.join(', ')} WHERE id = ?`, [...values, userId]);
}

async function findPhoneDuplicateByPhones(userId, phones) {
  if (!Array.isArray(phones) || phones.length === 0) return null;
  const placeholders = phones.map(() => '?').join(',');
  const [[row]] = await db.query(
    `SELECT id FROM users WHERE phone IN (${placeholders}) AND id != ? LIMIT 1`,
    [...phones, userId],
  );
  return row || null;
}

async function updateSubordinateEnabled(userId, enabled) {
  await db.query('UPDATE users SET subordinate_enabled = ? WHERE id = ?', [enabled ? 1 : 0, userId]);
}

module.exports = {
  buildUserListWhere,
  countUsers,
  selectUsersPage,
  selectUsersForExport,
  selectUserSummaryById,
  countOrdersByUserId,
  sumUserSpentExcludingCancelled,
  updateUserDynamic,
  findPhoneDuplicateByPhones,
  updateSubordinateEnabled,
};

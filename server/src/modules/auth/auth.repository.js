const db = require('../../config/db');

async function findUserIdByPhone(phone) {
  const [[row]] = await db.query('SELECT id FROM users WHERE phone = ?', [phone]);
  return row || null;
}

async function insertUser(params) {
  const { id, phone, passwordHash, nickname, inviteCode, parentInviteCode } = params;
  await db.query(
    `INSERT INTO users (id, phone, password_hash, nickname, invite_code, parent_invite_code)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, phone, passwordHash, nickname, inviteCode, parentInviteCode],
  );
}

async function findUserByPhone(phone) {
  const [[row]] = await db.query('SELECT * FROM users WHERE phone = ?', [phone]);
  return row || null;
}

async function selectProfileFields(userId) {
  const [[row]] = await db.query(
    `SELECT id, phone, nickname, avatar, invite_code, parent_invite_code,
            points_balance, role, wechat, whatsapp, created_at
     FROM users WHERE id = ?`,
    [userId],
  );
  return row || null;
}

async function findPhoneDuplicate(userId, phone) {
  const [[row]] = await db.query('SELECT id FROM users WHERE phone = ? AND id != ?', [phone, userId]);
  return row || null;
}

async function updateUserProfile(userId, setFragments, values) {
  await db.query(`UPDATE users SET ${setFragments.join(', ')} WHERE id = ?`, [...values, userId]);
}

async function selectPasswordHash(userId) {
  const [[row]] = await db.query('SELECT password_hash FROM users WHERE id = ?', [userId]);
  return row || null;
}

async function updatePasswordHash(userId, hash) {
  await db.query('UPDATE users SET password_hash = ? WHERE id = ?', [hash, userId]);
}

async function selectRefreshVersion(userId) {
  const [[row]] = await db.query('SELECT id, refresh_token_version FROM users WHERE id = ?', [userId]);
  return row || null;
}

async function incrementRefreshTokenVersion(userId) {
  await db.query('UPDATE users SET refresh_token_version = refresh_token_version + 1 WHERE id = ?', [userId]);
}

/** 中间件等场景：校验用户是否存在及角色 */
async function selectIdAndRoleByUserId(userId) {
  const [[row]] = await db.query('SELECT id, role FROM users WHERE id = ?', [userId]);
  return row || null;
}

async function countUsers() {
  const [[row]] = await db.query('SELECT COUNT(*) AS c FROM users');
  return Number(row?.c) || 0;
}

async function setUserRole(userId, role) {
  await db.query('UPDATE users SET role = ? WHERE id = ?', [role, userId]);
}

async function updateLastLogin(userId) {
  await db.query('UPDATE users SET last_login_at = NOW() WHERE id = ?', [userId]);
}

module.exports = {
  findUserIdByPhone,
  insertUser,
  findUserByPhone,
  selectProfileFields,
  findPhoneDuplicate,
  updateUserProfile,
  selectPasswordHash,
  updatePasswordHash,
  selectRefreshVersion,
  incrementRefreshTokenVersion,
  selectIdAndRoleByUserId,
  countUsers,
  setUserRole,
  updateLastLogin,
};

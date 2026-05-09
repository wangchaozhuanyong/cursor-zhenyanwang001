// @ts-nocheck
const db = require('../../config/db');

let passwordResetTableEnsured = false;

async function ensurePasswordResetTokenTable() {
  if (passwordResetTableEnsured) return;
  await db.query(
    `CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id VARCHAR(64) NOT NULL PRIMARY KEY,
      user_id VARCHAR(64) NOT NULL,
      token_hash VARCHAR(128) NOT NULL,
      expires_at DATETIME NOT NULL,
      used_at DATETIME NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_prt_user_unused (user_id, used_at),
      INDEX idx_prt_token_hash (token_hash),
      INDEX idx_prt_expires (expires_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  );
  passwordResetTableEnsured = true;
}

async function findUserIdByPhone(phone) {
  const [[row]] = await db.query('SELECT id FROM users WHERE phone = ?', [phone]);
  return row || null;
}

async function findUserIdByPhones(phones) {
  if (!Array.isArray(phones) || phones.length === 0) return null;
  const placeholders = phones.map(() => '?').join(',');
  const [[row]] = await db.query(`SELECT id FROM users WHERE phone IN (${placeholders}) LIMIT 1`, phones);
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

async function findUserByPhones(phones) {
  if (!Array.isArray(phones) || phones.length === 0) return null;
  const placeholders = phones.map(() => '?').join(',');
  const [[row]] = await db.query(`SELECT * FROM users WHERE phone IN (${placeholders}) LIMIT 1`, phones);
  return row || null;
}

/** 同上，返回所有匹配（历史数据中同一号码多种形式并存时 LIMIT 1 会误匹配） */
async function findUsersByPhones(phones) {
  if (!Array.isArray(phones) || phones.length === 0) return [];
  const placeholders = phones.map(() => '?').join(',');
  const [rows] = await db.query(`SELECT * FROM users WHERE phone IN (${placeholders}) ORDER BY created_at DESC`, phones);
  return Array.isArray(rows) ? rows : [];
}

async function selectUserIdByInviteCode(inviteCode) {
  const [[row]] = await db.query('SELECT id FROM users WHERE invite_code = ? LIMIT 1', [inviteCode]);
  return row || null;
}

async function selectProfileFields(userId) {
  const [[row]] = await db.query(
    `SELECT id, phone, nickname, avatar, invite_code, parent_invite_code,
            points_balance, subordinate_enabled, role, wechat, whatsapp, created_at
     FROM users WHERE id = ?`,
    [userId],
  );
  return row || null;
}

async function findPhoneDuplicate(userId, phone) {
  const [[row]] = await db.query('SELECT id FROM users WHERE phone = ? AND id != ?', [phone, userId]);
  return row || null;
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

async function deleteUnusedPasswordResetTokens(userId) {
  await ensurePasswordResetTokenTable();
  await db.query('DELETE FROM password_reset_tokens WHERE BINARY user_id = BINARY ? AND used_at IS NULL', [userId]);
}

async function insertPasswordResetToken({ id, userId, tokenHash, expiresAt }) {
  await ensurePasswordResetTokenTable();
  await db.query(
    `INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at)
     VALUES (?, ?, ?, ?)`,
    [id, userId, tokenHash, expiresAt],
  );
}

async function selectPasswordResetToken(tokenHash) {
  await ensurePasswordResetTokenTable();
  const [[row]] = await db.query(
    `SELECT prt.id, prt.user_id, prt.expires_at, prt.used_at, u.password_hash
     FROM password_reset_tokens prt
     JOIN users u ON BINARY u.id = BINARY prt.user_id
     WHERE BINARY prt.token_hash = BINARY ?
     LIMIT 1`,
    [tokenHash],
  );
  return row || null;
}

async function markPasswordResetTokenUsed(id) {
  await ensurePasswordResetTokenTable();
  await db.query('UPDATE password_reset_tokens SET used_at = NOW() WHERE id = ?', [id]);
}

module.exports = {
  findUserIdByPhone,
  findUserIdByPhones,
  insertUser,
  findUserByPhone,
  findUserByPhones,
  findUsersByPhones,
  selectUserIdByInviteCode,
  selectProfileFields,
  findPhoneDuplicate,
  findPhoneDuplicateByPhones,
  updateUserProfile,
  selectPasswordHash,
  updatePasswordHash,
  selectRefreshVersion,
  incrementRefreshTokenVersion,
  selectIdAndRoleByUserId,
  countUsers,
  setUserRole,
  updateLastLogin,
  deleteUnusedPasswordResetTokens,
  insertPasswordResetToken,
  selectPasswordResetToken,
  markPasswordResetTokenUsed,
};

const db = require('../../../config/db');

async function findUserIdByPhone(phone) {
  const [[row]] = await db.query('SELECT id FROM users WHERE phone = ? AND deleted_at IS NULL', [phone]);
  return row || null;
}

async function findUserIdByPhones(phones) {
  if (!Array.isArray(phones) || phones.length === 0) return null;
  const placeholders = phones.map(() => '?').join(',');
  const [[row]] = await db.query(
    `SELECT id FROM users WHERE phone IN (${placeholders}) AND deleted_at IS NULL LIMIT 1`,
    phones,
  );
  return row || null;
}

async function insertUser(params) {
  const { id, phone, passwordHash, nickname, inviteCode, parentInviteCode } = params;
  const defaultLevelId = params.memberLevelId || await selectDefaultMemberLevelId();
  await db.query(
    `INSERT INTO users (id, phone, password_hash, nickname, invite_code, parent_invite_code, member_level_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, phone ?? null, passwordHash ?? null, nickname, inviteCode, parentInviteCode, defaultLevelId],
  );
}

async function selectDefaultMemberLevelId() {
  try {
    const [[row]] = await db.query(
      `SELECT id
       FROM member_levels
       WHERE enabled = 1
       ORDER BY is_default DESC, sort_order ASC, min_spent ASC, min_orders ASC, created_at ASC
       LIMIT 1`,
    );
    return row?.id || null;
  } catch (err) {
    const code = err?.code;
    const msg = String(err?.message || '');
    if (code === 'ER_NO_SUCH_TABLE' || code === 'ER_BAD_FIELD_ERROR' || msg.includes('member_levels')) {
      return null;
    }
    throw err;
  }
}

async function findUserByPhone(phone) {
  const [[row]] = await db.query('SELECT * FROM users WHERE phone = ? AND deleted_at IS NULL', [phone]);
  return row || null;
}

async function findUserByPhones(phones) {
  if (!Array.isArray(phones) || phones.length === 0) return null;
  const placeholders = phones.map(() => '?').join(',');
  const [[row]] = await db.query(
    `SELECT * FROM users WHERE phone IN (${placeholders}) AND deleted_at IS NULL LIMIT 1`,
    phones,
  );
  return row || null;
}

/** 鍚屼笂锛岃繑鍥炴墍鏈夊尮閰嶏紙鍘嗗彶鏁版嵁涓悓涓€鍙风爜澶氱褰㈠紡骞跺瓨鏃?LIMIT 1 浼氳鍖归厤锛?*/
async function findUsersByPhones(phones) {
  if (!Array.isArray(phones) || phones.length === 0) return [];
  const placeholders = phones.map(() => '?').join(',');
  const [rows] = await db.query(
    `SELECT * FROM users WHERE phone IN (${placeholders}) AND deleted_at IS NULL ORDER BY created_at DESC`,
    phones,
  );
  return Array.isArray(rows) ? rows : [];
}

async function selectUserIdByInviteCode(inviteCode) {
  const [[row]] = await db.query(
    'SELECT id FROM users WHERE invite_code = ? AND deleted_at IS NULL LIMIT 1',
    [inviteCode],
  );
  return row || null;
}

async function selectUserBirthdayFields(userId) {
  try {
    const [[row]] = await db.query(
      `SELECT birthday, birthday_locked, birthday_updated_at
       FROM users WHERE id = ? AND deleted_at IS NULL`,
      [userId],
    );
    return row || null;
  } catch (err) {
    if (err?.code === 'ER_BAD_FIELD_ERROR') return null;
    throw err;
  }
}

async function updateUserBirthday(userId, { birthday, birthdayLocked, birthdayUpdatedAt }) {
  const fields = [];
  const values = [];
  if (birthday !== undefined) {
    fields.push('birthday = ?');
    values.push(birthday);
  }
  if (birthdayLocked !== undefined) {
    fields.push('birthday_locked = ?');
    values.push(birthdayLocked ? 1 : 0);
  }
  if (birthdayUpdatedAt !== undefined) {
    fields.push('birthday_updated_at = ?');
    values.push(birthdayUpdatedAt);
  }
  if (!fields.length) return;
  values.push(userId);
  await db.query(`UPDATE users SET ${fields.join(', ')} WHERE id = ? AND deleted_at IS NULL`, values);
}

async function selectProfileFields(userId) {
  const withMemberLevel = `
    SELECT u.id, u.phone, u.nickname, u.avatar, u.invite_code, u.parent_invite_code,
            u.points_balance, u.subordinate_enabled, u.role, u.wechat, u.whatsapp,
            u.birthday, u.birthday_locked, u.birthday_updated_at, u.created_at,
            ml.id AS member_level_id,
            ml.name AS member_level_name,
            ml.description AS member_level_description,
            ml.min_spent AS member_level_min_spent,
            ml.min_orders AS member_level_min_orders
     FROM users u
     LEFT JOIN member_levels ml ON ml.id = u.member_level_id
     WHERE u.id = ? AND u.deleted_at IS NULL`;
  try {
    const [[row]] = await db.query(withMemberLevel, [userId]);
    return row || null;
  } catch (err) {
    const code = err?.code;
    const msg = String(err?.message || '');
    if (code === 'ER_NO_SUCH_TABLE' || code === 'ER_BAD_FIELD_ERROR' || msg.includes('member_levels') || msg.includes('member_level_id')) {
      const [[row]] = await db.query(
        `SELECT id, phone, nickname, avatar, invite_code, parent_invite_code,
                points_balance, subordinate_enabled, role, wechat, whatsapp, created_at
         FROM users WHERE id = ? AND deleted_at IS NULL`,
        [userId],
      );
      return row || null;
    }
    throw err;
  }
}

async function findPhoneDuplicate(userId, phone) {
  const [[row]] = await db.query('SELECT id FROM users WHERE phone = ? AND id != ? AND deleted_at IS NULL', [phone, userId]);
  return row || null;
}

async function findPhoneDuplicateByPhones(userId, phones) {
  if (!Array.isArray(phones) || phones.length === 0) return null;
  const placeholders = phones.map(() => '?').join(',');
  const [[row]] = await db.query(
    `SELECT id FROM users WHERE phone IN (${placeholders}) AND id != ? AND deleted_at IS NULL LIMIT 1`,
    [...phones, userId],
  );
  return row || null;
}

async function updateUserProfile(userId, setFragments, values) {
  await db.query(`UPDATE users SET ${setFragments.join(', ')} WHERE id = ?`, [...values, userId]);
}

async function selectPasswordHash(userId) {
  const [[row]] = await db.query('SELECT password_hash FROM users WHERE id = ? AND deleted_at IS NULL', [userId]);
  return row || null;
}

async function updatePasswordHash(userId, hash) {
  await db.query('UPDATE users SET password_hash = ? WHERE id = ?', [hash, userId]);
}

async function selectRefreshVersion(userId) {
  const [[row]] = await db.query(
    'SELECT id, refresh_token_version, role, account_status FROM users WHERE id = ? AND deleted_at IS NULL',
    [userId],
  );
  return row || null;
}

async function incrementRefreshTokenVersion(userId) {
  await db.query('UPDATE users SET refresh_token_version = refresh_token_version + 1 WHERE id = ?', [userId]);
}

/** 涓棿浠剁瓑鍦烘櫙锛氭牎楠岀敤鎴锋槸鍚﹀瓨鍦ㄥ強瑙掕壊 */
async function selectIdAndRoleByUserId(userId) {
  const [[row]] = await db.query('SELECT id, role, account_status FROM users WHERE id = ? AND deleted_at IS NULL', [userId]);
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
  await db.query('DELETE FROM password_reset_tokens WHERE BINARY user_id = BINARY ? AND used_at IS NULL', [userId]);
}

async function insertPasswordResetToken({ id, userId, tokenHash, expiresAt }) {
  await db.query(
    `INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at)
     VALUES (?, ?, ?, ?)`,
    [id, userId, tokenHash, expiresAt],
  );
}

async function selectPasswordResetToken(tokenHash) {
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
  await db.query('UPDATE password_reset_tokens SET used_at = NOW() WHERE id = ?', [id]);
}

/** 鈹€鈹€鈹€ OAuth / OTP锛堣縼绉?037_auth_oauth_otp锛夆攢鈹€鈹€ */

async function selectOauthAccount(provider, providerUserId) {
  const [[row]] = await db.query(
    `SELECT oa.*, u.id AS user_row_id, u.refresh_token_version, u.role, u.password_hash
     FROM oauth_accounts oa
     JOIN users u ON BINARY u.id = BINARY oa.user_id
     WHERE oa.provider = ? AND oa.provider_user_id = ?
       AND u.deleted_at IS NULL
     LIMIT 1`,
    [provider, providerUserId],
  );
  return row || null;
}

async function insertOauthAccount(params) {
  const {
    id, userId, provider, providerUserId, email, displayName, avatarUrl,
  } = params;
  await db.query(
    `INSERT INTO oauth_accounts (id, user_id, provider, provider_user_id, email, display_name, avatar_url)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, userId, provider, providerUserId, email || null, displayName || null, avatarUrl || null],
  );
}

async function updateOauthAccountProfile(userId, provider, fields) {
  const fragments = [];
  const values = [];
  if (fields.email !== undefined) {
    fragments.push('email = ?');
    values.push(fields.email || null);
  }
  if (fields.displayName !== undefined) {
    fragments.push('display_name = ?');
    values.push(fields.displayName || null);
  }
  if (fields.avatarUrl !== undefined) {
    fragments.push('avatar_url = ?');
    values.push(fields.avatarUrl || null);
  }
  if (!fragments.length) return;
  values.push(userId, provider);
  await db.query(
    `UPDATE oauth_accounts SET ${fragments.join(', ')} WHERE BINARY user_id = BINARY ? AND provider = ?`,
    values,
  );
}

async function insertOauthState(params) {
  const { id, stateHash, provider, redirectAfter, expiresAt } = params;
  await db.query(
    `INSERT INTO oauth_states (id, state_hash, provider, redirect_after, expires_at)
     VALUES (?, ?, ?, ?, ?)`,
    [id, stateHash, provider, redirectAfter, expiresAt],
  );
}

async function selectOauthStateByHash(stateHash) {
  const [[row]] = await db.query(
    `SELECT id, state_hash, provider, redirect_after, expires_at, consumed_at
     FROM oauth_states WHERE BINARY state_hash = BINARY ? LIMIT 1`,
    [stateHash],
  );
  return row || null;
}

async function markOauthStateConsumed(id) {
  await db.query('UPDATE oauth_states SET consumed_at = NOW() WHERE id = ?', [id]);
}

async function insertAuthLoginTicket(params) {
  const { id, codeHash, provider, userId, expiresAt } = params;
  await db.query(
    `INSERT INTO auth_login_tickets (id, code_hash, provider, user_id, expires_at)
     VALUES (?, ?, ?, ?, ?)`,
    [id, codeHash, provider, userId, expiresAt],
  );
}

async function selectAuthLoginTicketByHash(codeHash) {
  const [[row]] = await db.query(
    `SELECT alt.id, alt.user_id, alt.provider, alt.expires_at, alt.consumed_at,
            u.refresh_token_version, u.role
     FROM auth_login_tickets alt
     JOIN users u ON BINARY u.id = BINARY alt.user_id
     WHERE BINARY alt.code_hash = BINARY ?
       AND u.deleted_at IS NULL
       AND alt.consumed_at IS NULL AND alt.expires_at > NOW()
     LIMIT 1`,
    [codeHash],
  );
  return row || null;
}

async function markAuthLoginTicketConsumed(id) {
  await db.query('UPDATE auth_login_tickets SET consumed_at = NOW() WHERE id = ?', [id]);
}

async function tryConsumeAuthLoginTicket(id) {
  const [r] = await db.query(
    `UPDATE auth_login_tickets SET consumed_at = NOW()
     WHERE id = ? AND consumed_at IS NULL AND expires_at > NOW()`,
    [id],
  );
  return (r.affectedRows || 0) === 1;
}

async function countOtpSendsSince(phoneE164, since) {
  const [[row]] = await db.query(
    `SELECT COUNT(*) AS c FROM otp_send_logs
     WHERE phone_e164 = ? AND created_at >= ? AND send_status = 'sent'`,
    [phoneE164, since],
  );
  return Number(row?.c) || 0;
}

async function countOtpRequestsByIpSince(ip, since) {
  if (!ip) return 0;
  const [[row]] = await db.query(
    `SELECT COUNT(*) AS c FROM otp_send_logs
     WHERE ip = ? AND created_at >= ?`,
    [ip, since],
  );
  return Number(row?.c) || 0;
}

async function selectLatestOtpSend(phoneE164, purpose) {
  const [[row]] = await db.query(
    `SELECT id, code_hash, expires_at, consumed_at, created_at, send_status
     FROM otp_send_logs
     WHERE phone_e164 = ? AND purpose = ?
     ORDER BY created_at DESC LIMIT 1`,
    [phoneE164, purpose],
  );
  return row || null;
}

async function insertOtpSendLog(params) {
  const {
    id, phoneE164, purpose, codeHash, ip, uaHash, sendStatus, errorMessage, expiresAt,
  } = params;
  await db.query(
    `INSERT INTO otp_send_logs (id, phone_e164, purpose, code_hash, ip, ua_hash, send_status, error_message, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id, phoneE164, purpose, codeHash, ip || null, uaHash || null,
      sendStatus, errorMessage || null, expiresAt,
    ],
  );
}

async function selectOtpLogForVerify(phoneE164, purpose, codeHash) {
  const [[row]] = await db.query(
    `SELECT id, expires_at, consumed_at, send_status
     FROM otp_send_logs
     WHERE phone_e164 = ? AND purpose = ? AND BINARY code_hash = BINARY ?
       AND consumed_at IS NULL AND expires_at > NOW()
     ORDER BY created_at DESC LIMIT 1`,
    [phoneE164, purpose, codeHash],
  );
  return row || null;
}

async function tryConsumeOtpRow(id) {
  const [r] = await db.query(
    `UPDATE otp_send_logs SET consumed_at = NOW()
     WHERE id = ? AND consumed_at IS NULL AND expires_at > NOW()`,
    [id],
  );
  return (r.affectedRows || 0) === 1;
}

/** 鈹€鈹€鈹€ 寰俊绗笁鏂硅韩浠?/ 寰呯粦瀹?/ 鐧诲綍瀹¤锛堣縼绉?066锛夆攢鈹€鈹€ */

async function selectAuthIdentityByOpenid(provider, openid) {
  const [[row]] = await db.query(
    `SELECT uai.*, u.id AS user_row_id, u.phone, u.password_hash, u.role, u.refresh_token_version
     FROM user_auth_identities uai
     JOIN users u ON BINARY u.id = BINARY uai.user_id
     WHERE uai.provider = ? AND uai.provider_openid = ?
       AND u.deleted_at IS NULL
     LIMIT 1`,
    [provider, openid],
  );
  return row || null;
}

async function selectAuthIdentityByUnionid(provider, unionid) {
  if (!unionid || !String(unionid).trim()) return null;
  const [[row]] = await db.query(
    `SELECT uai.*, u.id AS user_row_id, u.phone, u.password_hash, u.role, u.refresh_token_version
     FROM user_auth_identities uai
     JOIN users u ON BINARY u.id = BINARY uai.user_id
     WHERE uai.provider = ? AND uai.provider_unionid = ?
       AND u.deleted_at IS NULL
     LIMIT 1`,
    [provider, String(unionid).trim()],
  );
  return row || null;
}

async function selectAuthIdentityByUserAndProvider(userId, provider) {
  const [[row]] = await db.query(
    `SELECT id, user_id, provider, provider_openid, provider_unionid, appid,
            nickname, avatar_url, bound_at, created_at, updated_at
     FROM user_auth_identities
     WHERE BINARY user_id = BINARY ? AND provider = ?
     LIMIT 1`,
    [userId, provider],
  );
  return row || null;
}

async function insertAuthIdentity(params) {
  const {
    id, userId, provider, providerOpenid, providerUnionid, appid, nickname, avatarUrl,
  } = params;
  await db.query(
    `INSERT INTO user_auth_identities
       (id, user_id, provider, provider_openid, provider_unionid, appid, nickname, avatar_url, bound_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
    [
      id, userId, provider, providerOpenid, providerUnionid || null,
      appid || null, nickname || null, avatarUrl || null,
    ],
  );
}

async function deleteAuthIdentityById(id) {
  await db.query('DELETE FROM user_auth_identities WHERE id = ?', [id]);
}

async function selectUserPhoneAndPassword(userId) {
  const [[row]] = await db.query(
    `SELECT id, phone, password_hash, role, refresh_token_version
     FROM users WHERE id = ? AND deleted_at IS NULL`,
    [userId],
  );
  return row || null;
}

async function updateUserPhone(userId, phone) {
  await db.query('UPDATE users SET phone = ? WHERE id = ?', [phone, userId]);
}

async function insertPendingWechatLogin(params) {
  const {
    id, tokenHash, userId, providerOpenid, providerUnionid, appid, nickname, avatarUrl, expiresAt,
  } = params;
  await db.query(
    `INSERT INTO pending_wechat_login
       (id, token_hash, user_id, provider_openid, provider_unionid, appid, nickname, avatar_url, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id, tokenHash, userId || null, providerOpenid, providerUnionid || null,
      appid || null, nickname || null, avatarUrl || null, expiresAt,
    ],
  );
}

async function selectPendingWechatByHash(tokenHash) {
  const [[row]] = await db.query(
    `SELECT id, user_id, provider_openid, provider_unionid, appid, nickname, avatar_url,
            expires_at, consumed_at
     FROM pending_wechat_login
     WHERE BINARY token_hash = BINARY ?
       AND consumed_at IS NULL AND expires_at > NOW()
     LIMIT 1`,
    [tokenHash],
  );
  return row || null;
}

async function tryConsumePendingWechat(id) {
  const [r] = await db.query(
    `UPDATE pending_wechat_login SET consumed_at = NOW()
     WHERE id = ? AND consumed_at IS NULL AND expires_at > NOW()`,
    [id],
  );
  return (r.affectedRows || 0) === 1;
}

async function insertLoginAudit(params) {
  const { id, userId, loginMethod, ip, uaHash } = params;
  await db.query(
    `INSERT INTO user_login_audits (id, user_id, login_method, ip, ua_hash)
     VALUES (?, ?, ?, ?, ?)`,
    [id, userId, loginMethod, ip || null, uaHash || null],
  );
}

module.exports = {
  findUserIdByPhone,
  findUserIdByPhones,
  insertUser,
  findUserByPhone,
  findUserByPhones,
  findUsersByPhones,
  selectUserIdByInviteCode,
  selectUserBirthdayFields,
  updateUserBirthday,
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
  selectOauthAccount,
  insertOauthAccount,
  updateOauthAccountProfile,
  insertOauthState,
  selectOauthStateByHash,
  markOauthStateConsumed,
  insertAuthLoginTicket,
  selectAuthLoginTicketByHash,
  markAuthLoginTicketConsumed,
  tryConsumeAuthLoginTicket,
  countOtpSendsSince,
  countOtpRequestsByIpSince,
  selectLatestOtpSend,
  insertOtpSendLog,
  selectOtpLogForVerify,
  tryConsumeOtpRow,
  selectAuthIdentityByOpenid,
  selectAuthIdentityByUnionid,
  selectAuthIdentityByUserAndProvider,
  insertAuthIdentity,
  deleteAuthIdentityById,
  selectUserPhoneAndPassword,
  updateUserPhone,
  insertPendingWechatLogin,
  selectPendingWechatByHash,
  tryConsumePendingWechat,
  insertLoginAudit,
};

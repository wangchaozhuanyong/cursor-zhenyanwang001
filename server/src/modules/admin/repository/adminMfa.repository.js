const db = require('../../../config/db');

async function selectMfaSettings(userId) {
  const [[row]] = await db.query('SELECT * FROM admin_mfa_settings WHERE user_id = ?', [userId]);
  return row || null;
}

async function upsertPendingMfaSettings(userId, encryptedSecret) {
  await db.query(
    `INSERT INTO admin_mfa_settings (user_id, totp_secret_enc, enabled)
     VALUES (?, ?, 0)
     ON DUPLICATE KEY UPDATE totp_secret_enc = VALUES(totp_secret_enc), updated_at = CURRENT_TIMESTAMP`,
    [userId, encryptedSecret],
  );
}

async function enableMfa(userId, encryptedSecret) {
  await db.query(
    `INSERT INTO admin_mfa_settings (user_id, totp_secret_enc, enabled, enabled_at, last_verified_at)
     VALUES (?, ?, 1, NOW(), NOW())
     ON DUPLICATE KEY UPDATE
       totp_secret_enc = VALUES(totp_secret_enc),
       enabled = 1,
       enabled_at = COALESCE(enabled_at, NOW()),
       last_verified_at = NOW(),
       updated_at = CURRENT_TIMESTAMP`,
    [userId, encryptedSecret],
  );
}

async function touchMfaVerified(userId) {
  await db.query('UPDATE admin_mfa_settings SET last_verified_at = NOW() WHERE user_id = ?', [userId]);
}

async function selectUserForMfa(userId) {
  const [[row]] = await db.query(
    'SELECT id, phone, nickname, role, account_status, refresh_token_version FROM users WHERE id = ? AND deleted_at IS NULL',
    [userId],
  );
  return row || null;
}

async function selectTrustedDevice(userId, deviceHash) {
  const [[row]] = await db.query(
    `SELECT *
     FROM admin_trusted_devices
     WHERE user_id = ? AND device_hash = ? AND revoked_at IS NULL AND expires_at > NOW()
     LIMIT 1`,
    [userId, deviceHash],
  );
  return row || null;
}

async function upsertTrustedDevice(row) {
  await db.query(
    `INSERT INTO admin_trusted_devices (id, user_id, device_hash, user_agent_hash, expires_at)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       user_agent_hash = VALUES(user_agent_hash),
       last_seen_at = CURRENT_TIMESTAMP,
       expires_at = VALUES(expires_at),
       revoked_at = NULL`,
    [row.id, row.userId, row.deviceHash, row.userAgentHash, row.expiresAt],
  );
}

module.exports = {
  selectMfaSettings,
  upsertPendingMfaSettings,
  enableMfa,
  touchMfaVerified,
  selectUserForMfa,
  selectTrustedDevice,
  upsertTrustedDevice,
};

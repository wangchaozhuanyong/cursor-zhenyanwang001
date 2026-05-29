const db = require('../../../config/db');

async function selectMfaSettings(userId) {
  const [[row]] = await db.query('SELECT * FROM admin_mfa_settings WHERE user_id = ?', [userId]);
  return row || null;
}

async function upsertPendingMfaSettings(userId, encryptedSecret) {
  await db.query(
    `INSERT INTO admin_mfa_settings (user_id, totp_secret_enc, enabled)
     VALUES (?, ?, 0)
     ON DUPLICATE KEY UPDATE
       totp_secret_enc = CASE
         WHEN enabled = 0 AND totp_secret_enc IS NOT NULL AND totp_secret_enc <> '' THEN totp_secret_enc
         ELSE VALUES(totp_secret_enc)
       END,
       updated_at = CURRENT_TIMESTAMP`,
    [userId, encryptedSecret],
  );
  return selectMfaSettings(userId);
}

async function enableMfa(userId, encryptedSecret) {
  await db.query(
    `INSERT INTO admin_mfa_settings (user_id, totp_secret_enc, enabled, required, enabled_at, last_verified_at)
     VALUES (?, ?, 1, 1, NOW(), NOW())
     ON DUPLICATE KEY UPDATE
       totp_secret_enc = VALUES(totp_secret_enc),
       enabled = 1,
       required = 1,
       enabled_at = COALESCE(enabled_at, NOW()),
       last_verified_at = NOW(),
       updated_at = CURRENT_TIMESTAMP`,
    [userId, encryptedSecret],
  );
}

async function setMfaRequired(userId, required) {
  await db.query(
    `INSERT INTO admin_mfa_settings (user_id, enabled, required)
     VALUES (?, 0, ?)
     ON DUPLICATE KEY UPDATE
       required = VALUES(required),
       updated_at = CURRENT_TIMESTAMP`,
    [userId, required ? 1 : 0],
  );
}

async function resetMfaSettings(userId, required = true) {
  await db.query(
    `INSERT INTO admin_mfa_settings (user_id, totp_secret_enc, enabled, required, enabled_at, last_verified_at)
     VALUES (?, NULL, 0, ?, NULL, NULL)
     ON DUPLICATE KEY UPDATE
       totp_secret_enc = NULL,
       enabled = 0,
       required = VALUES(required),
       enabled_at = NULL,
       last_verified_at = NULL,
       updated_at = CURRENT_TIMESTAMP`,
    [userId, required ? 1 : 0],
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

async function touchTrustedDevice(id, context = {}) {
  const lastIpHash = typeof context === 'string' ? context : String(context.lastIpHash || '');
  const lastRegionHash = typeof context === 'string' ? '' : String(context.lastRegionHash || '');
  await db.query(
    `UPDATE admin_trusted_devices
     SET last_seen_at = CURRENT_TIMESTAMP,
         last_ip_hash = CASE WHEN ? <> '' THEN ? ELSE last_ip_hash END,
         last_region_hash = CASE WHEN ? <> '' THEN ? ELSE last_region_hash END
     WHERE id = ?`,
    [lastIpHash, lastIpHash, lastRegionHash, lastRegionHash, id],
  );
}

async function upsertTrustedDevice(row) {
  await db.query(
    `INSERT INTO admin_trusted_devices
       (id, user_id, device_hash, user_agent_hash, device_label, trusted_ip_hash, last_ip_hash, trusted_region_hash, last_region_hash, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       user_agent_hash = VALUES(user_agent_hash),
       device_label = VALUES(device_label),
       trusted_ip_hash = VALUES(trusted_ip_hash),
       last_ip_hash = VALUES(last_ip_hash),
       trusted_region_hash = VALUES(trusted_region_hash),
       last_region_hash = VALUES(last_region_hash),
       last_seen_at = CURRENT_TIMESTAMP,
       expires_at = VALUES(expires_at),
       revoked_at = NULL`,
    [
      row.id,
      row.userId,
      row.deviceHash,
      row.userAgentHash,
      row.deviceLabel || '',
      row.trustedIpHash || '',
      row.lastIpHash || row.trustedIpHash || '',
      row.trustedRegionHash || '',
      row.lastRegionHash || row.trustedRegionHash || '',
      row.expiresAt,
    ],
  );
}

async function insertSensitiveActionToken(row) {
  await db.query(
    `INSERT INTO admin_sensitive_action_tokens
       (id, user_id, admin_session_id, device_hash, action_class, token_hash, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [row.id, row.userId, row.adminSessionId, row.deviceHash || '', row.actionClass, row.tokenHash, row.expiresAt],
  );
}

async function selectSensitiveActionToken({ userId, adminSessionId, actionClass, tokenHash }) {
  const [[row]] = await db.query(
    `SELECT *
     FROM admin_sensitive_action_tokens
     WHERE user_id = ?
       AND admin_session_id = ?
       AND action_class = ?
       AND token_hash = ?
       AND revoked_at IS NULL
       AND expires_at > NOW()
     LIMIT 1`,
    [userId, adminSessionId, actionClass, tokenHash],
  );
  return row || null;
}

async function touchSensitiveActionToken(id) {
  await db.query(
    `UPDATE admin_sensitive_action_tokens
     SET used_count = used_count + 1, last_used_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [id],
  );
}

async function listWebAuthnCredentials(userId) {
  const [rows] = await db.query(
    `SELECT *
     FROM admin_webauthn_credentials
     WHERE user_id = ? AND revoked_at IS NULL
     ORDER BY last_used_at DESC, created_at DESC`,
    [userId],
  );
  return rows;
}

async function selectWebAuthnCredentialByHash(credentialIdHash) {
  const [[row]] = await db.query(
    `SELECT *
     FROM admin_webauthn_credentials
     WHERE credential_id_hash = ? AND revoked_at IS NULL
     LIMIT 1`,
    [credentialIdHash],
  );
  return row || null;
}

async function insertWebAuthnCredential(row) {
  await db.query(
    `INSERT INTO admin_webauthn_credentials
       (id, user_id, credential_id_hash, credential_id_enc, public_key, counter, transports, aaguid, device_label)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      row.id,
      row.userId,
      row.credentialIdHash,
      row.credentialIdEnc || null,
      row.publicKey,
      row.counter || 0,
      row.transports ? JSON.stringify(row.transports) : null,
      row.aaguid || '',
      row.deviceLabel || '',
    ],
  );
}

async function updateWebAuthnCredentialCounter(id, counter) {
  await db.query(
    `UPDATE admin_webauthn_credentials
     SET counter = ?, last_used_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [counter || 0, id],
  );
}

async function listTrustedDevices(userId) {
  const [rows] = await db.query(
    `SELECT id, device_label, first_seen_at, last_seen_at, expires_at, revoked_at,
            CASE WHEN revoked_at IS NULL AND expires_at > NOW() THEN 1 ELSE 0 END AS active
     FROM admin_trusted_devices
     WHERE user_id = ?
     ORDER BY active DESC, last_seen_at DESC, first_seen_at DESC
     LIMIT 50`,
    [userId],
  );
  return rows;
}

async function revokeTrustedDevice(userId, deviceId) {
  const [res] = await db.query(
    `UPDATE admin_trusted_devices
     SET revoked_at = COALESCE(revoked_at, NOW())
     WHERE user_id = ? AND id = ?`,
    [userId, deviceId],
  );
  return res.affectedRows ?? 0;
}

async function revokeTrustedDevices(userId) {
  const [res] = await db.query(
    `UPDATE admin_trusted_devices
     SET revoked_at = COALESCE(revoked_at, NOW())
     WHERE user_id = ? AND revoked_at IS NULL`,
    [userId],
  );
  return res.affectedRows ?? 0;
}

module.exports = {
  selectMfaSettings,
  upsertPendingMfaSettings,
  enableMfa,
  setMfaRequired,
  resetMfaSettings,
  touchMfaVerified,
  selectUserForMfa,
  selectTrustedDevice,
  touchTrustedDevice,
  upsertTrustedDevice,
  insertSensitiveActionToken,
  selectSensitiveActionToken,
  touchSensitiveActionToken,
  listWebAuthnCredentials,
  selectWebAuthnCredentialByHash,
  insertWebAuthnCredential,
  updateWebAuthnCredentialCounter,
  listTrustedDevices,
  revokeTrustedDevice,
  revokeTrustedDevices,
};

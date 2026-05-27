// @ts-nocheck
const db = require('../../../config/db');

function toJson(value) {
  if (value == null) return null;
  return typeof value === 'string' ? value : JSON.stringify(value);
}

async function insertLoginAttempt(payload) {
  await db.query(
    `INSERT INTO user_login_attempts
      (id, user_id, login_identifier, success, failure_reason, risk_score, ip, device_id, user_agent, country, city)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      payload.id,
      payload.userId || null,
      payload.loginIdentifier,
      payload.success ? 1 : 0,
      payload.failureReason || null,
      Number(payload.riskScore || 0),
      payload.ip || null,
      payload.deviceId || null,
      payload.userAgent || null,
      payload.country || null,
      payload.city || null,
    ],
  );
}

async function insertSecurityEvent(payload) {
  await db.query(
    `INSERT INTO user_security_events
      (id, user_id, event_type, severity, title, description, ip, device_id, user_agent, metadata)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      payload.id,
      payload.userId || null,
      payload.eventType,
      payload.severity || 'info',
      payload.title,
      payload.description || null,
      payload.ip || null,
      payload.deviceId || null,
      payload.userAgent || null,
      toJson(payload.metadata || {}),
    ],
  );
}

async function upsertDevice(payload) {
  await db.query(
    `INSERT INTO user_devices
      (id, user_id, device_id, device_name, first_ip, last_ip, user_agent, fingerprint_hash, trusted)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       last_ip = VALUES(last_ip),
       user_agent = VALUES(user_agent),
       fingerprint_hash = VALUES(fingerprint_hash),
       last_seen_at = NOW(),
       revoked_at = NULL`,
    [
      payload.id,
      payload.userId,
      payload.deviceId,
      payload.deviceName || null,
      payload.ip || null,
      payload.ip || null,
      payload.userAgent || null,
      payload.fingerprintHash || null,
      payload.trusted ? 1 : 0,
    ],
  );
}

async function findActiveDevice(userId, deviceId) {
  const [[row]] = await db.query(
    `SELECT * FROM user_devices
     WHERE user_id = ? AND device_id = ? AND revoked_at IS NULL
     LIMIT 1`,
    [userId, deviceId],
  );
  return row || null;
}

async function countUserDevices(userId) {
  const [[row]] = await db.query(
    'SELECT COUNT(*) AS c FROM user_devices WHERE user_id = ? AND revoked_at IS NULL',
    [userId],
  );
  return Number(row?.c || 0);
}

async function countUserIpLogins(userId, ip) {
  if (!ip) return 0;
  const [[row]] = await db.query(
    `SELECT COUNT(*) AS c
     FROM user_login_attempts
     WHERE user_id = ? AND ip = ? AND success = 1`,
    [userId, ip],
  );
  return Number(row?.c || 0);
}

async function insertSession(payload) {
  await db.query(
    `INSERT INTO user_sessions
      (id, user_id, device_id, refresh_token_hash, ip, user_agent, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      payload.id,
      payload.userId,
      payload.deviceId,
      payload.refreshTokenHash,
      payload.ip || null,
      payload.userAgent || null,
      payload.expiresAt,
    ],
  );
}

async function findSessionByRefreshHash(refreshTokenHash) {
  const [[row]] = await db.query(
    `SELECT * FROM user_sessions
     WHERE refresh_token_hash = ? AND revoked_at IS NULL AND expires_at > NOW()
     LIMIT 1`,
    [refreshTokenHash],
  );
  return row || null;
}

async function rotateSessionRefreshToken(sessionId, refreshTokenHash, context = {}) {
  await db.query(
    `UPDATE user_sessions
     SET refresh_token_hash = ?, ip = ?, user_agent = ?, last_seen_at = NOW()
     WHERE id = ? AND revoked_at IS NULL`,
    [refreshTokenHash, context.ip || null, context.userAgent || null, sessionId],
  );
}

async function revokeSession(sessionId, userId, reason = 'user_revoked') {
  await db.query(
    `UPDATE user_sessions
     SET revoked_at = COALESCE(revoked_at, NOW()), revoke_reason = ?
     WHERE id = ? AND user_id = ?`,
    [reason, sessionId, userId],
  );
}

async function revokeOtherSessions(userId, keepSessionId, reason = 'security_revoked') {
  const params = [reason, userId];
  let where = 'user_id = ? AND revoked_at IS NULL';
  if (keepSessionId) {
    where += ' AND id != ?';
    params.push(keepSessionId);
  }
  await db.query(
    `UPDATE user_sessions
     SET revoked_at = NOW(), revoke_reason = ?
     WHERE ${where}`,
    params,
  );
}

async function revokeAllSessions(userId, reason = 'logout_all') {
  await db.query(
    `UPDATE user_sessions
     SET revoked_at = NOW(), revoke_reason = ?
     WHERE user_id = ? AND revoked_at IS NULL`,
    [reason, userId],
  );
}

async function listUserSessions(userId) {
  const [rows] = await db.query(
    `SELECT s.id, s.user_id, s.device_id, s.ip, s.user_agent, s.last_seen_at, s.expires_at,
            s.revoked_at, s.revoke_reason, d.device_name, d.trusted
     FROM user_sessions s
     LEFT JOIN user_devices d ON d.user_id = s.user_id AND d.device_id = s.device_id
     WHERE s.user_id = ?
     ORDER BY s.revoked_at IS NULL DESC, s.last_seen_at DESC
     LIMIT 100`,
    [userId],
  );
  return rows;
}

async function protectUser(userId, protectedUntil, reason) {
  await db.query(
    'UPDATE users SET protected_until = ?, protected_reason = ? WHERE id = ?',
    [protectedUntil, reason || null, userId],
  );
}

async function unprotectUser(userId) {
  await db.query(
    'UPDATE users SET protected_until = NULL, protected_reason = NULL WHERE id = ?',
    [userId],
  );
}

async function selectProtectionByIdentifier(loginIdentifier) {
  const [[row]] = await db.query(
    `SELECT id, protected_until, protected_reason
     FROM users
     WHERE phone = ? AND deleted_at IS NULL
     LIMIT 1`,
    [loginIdentifier],
  );
  return row || null;
}

async function selectSecurityOverview() {
  const [[row]] = await db.query(
    `SELECT
       (SELECT COUNT(*) FROM user_login_attempts WHERE success = 0 AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)) AS failed24h,
       (SELECT COUNT(*) FROM user_security_events WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)) AS events24h,
       (SELECT COUNT(*) FROM users WHERE protected_until > NOW()) AS protectedUsers,
       (SELECT COUNT(*) FROM user_sessions WHERE revoked_at IS NULL AND expires_at > NOW()) AS activeSessions`,
  );
  return row || {};
}

async function listLoginAttempts(query = {}) {
  const limit = Math.max(1, Math.min(Number(query.limit || query.pageSize || 50), 100));
  const [rows] = await db.query(
    `SELECT * FROM user_login_attempts
     ORDER BY created_at DESC
     LIMIT ?`,
    [limit],
  );
  return rows;
}

async function listSecurityEvents(query = {}) {
  const limit = Math.max(1, Math.min(Number(query.limit || query.pageSize || 50), 100));
  const [rows] = await db.query(
    `SELECT * FROM user_security_events
     ORDER BY created_at DESC
     LIMIT ?`,
    [limit],
  );
  return rows;
}

async function listRiskIps() {
  const [rows] = await db.query(
    `SELECT ip, reason, blocked_until, created_at, updated_at
     FROM security_risk_ip_blocks
     WHERE blocked_until IS NULL OR blocked_until > NOW()
     ORDER BY updated_at DESC
     LIMIT 100`,
  );
  return rows;
}

async function blockIp(ip, reason, blockedUntil) {
  await db.query(
    `INSERT INTO security_risk_ip_blocks (ip, reason, blocked_until)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE reason = VALUES(reason), blocked_until = VALUES(blocked_until)`,
    [ip, reason || null, blockedUntil || null],
  );
}

async function unblockIp(ip) {
  await db.query('DELETE FROM security_risk_ip_blocks WHERE ip = ?', [ip]);
}

async function listRiskDevices() {
  const [rows] = await db.query(
    `SELECT device_id, reason, blocked_until, created_at, updated_at
     FROM security_risk_device_blocks
     WHERE blocked_until IS NULL OR blocked_until > NOW()
     ORDER BY updated_at DESC
     LIMIT 100`,
  );
  return rows;
}

async function blockDevice(deviceId, reason, blockedUntil) {
  await db.query(
    `INSERT INTO security_risk_device_blocks (device_id, reason, blocked_until)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE reason = VALUES(reason), blocked_until = VALUES(blocked_until)`,
    [deviceId, reason || null, blockedUntil || null],
  );
}

async function unblockDevice(deviceId) {
  await db.query('DELETE FROM security_risk_device_blocks WHERE device_id = ?', [deviceId]);
}

module.exports = {
  insertLoginAttempt,
  insertSecurityEvent,
  upsertDevice,
  findActiveDevice,
  countUserDevices,
  countUserIpLogins,
  insertSession,
  findSessionByRefreshHash,
  rotateSessionRefreshToken,
  revokeSession,
  revokeOtherSessions,
  revokeAllSessions,
  listUserSessions,
  protectUser,
  unprotectUser,
  selectProtectionByIdentifier,
  selectSecurityOverview,
  listLoginAttempts,
  listSecurityEvents,
  listRiskIps,
  blockIp,
  unblockIp,
  listRiskDevices,
  blockDevice,
  unblockDevice,
};

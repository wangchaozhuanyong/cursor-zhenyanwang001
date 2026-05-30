const db = require('../../../config/db');

function parseJson(value) {
  if (value == null) return null;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function mapSecurityEvent(row) {
  if (!row) return row;
  return {
    ...row,
    metadata: parseJson(row.metadata),
  };
}

function buildLoginAttemptWhere(filters = {}) {
  let where = 'WHERE 1=1';
  const params = [];

  if (filters.userId) {
    where += ' AND BINARY ula.user_id = BINARY ?';
    params.push(filters.userId);
  }
  if (filters.ip) {
    where += ' AND ula.ip = ?';
    params.push(filters.ip);
  }
  if (filters.deviceId) {
    where += ' AND ula.ua_hash = ?';
    params.push(filters.deviceId);
  }
  if (filters.loginMethod) {
    where += ' AND ula.login_method = ?';
    params.push(filters.loginMethod);
  }
  if (filters.dateFrom) {
    where += ' AND ula.created_at >= ?';
    params.push(filters.dateFrom);
  }
  if (filters.dateTo) {
    where += ' AND ula.created_at < DATE_ADD(?, INTERVAL 1 DAY)';
    params.push(filters.dateTo);
  }
  if (filters.keyword) {
    const k = `%${filters.keyword}%`;
    where += ` AND (
      ula.user_id LIKE ?
      OR IFNULL(ula.ip, '') LIKE ?
      OR ula.login_method LIKE ?
      OR IFNULL(u.phone, '') LIKE ?
      OR IFNULL(u.nickname, '') LIKE ?
    )`;
    params.push(k, k, k, k, k);
  }

  return { where, params };
}

function buildSecurityEventWhere(filters = {}) {
  let where = 'WHERE 1=1';
  const params = [];

  if (filters.userId) {
    where += ' AND BINARY e.user_id = BINARY ?';
    params.push(filters.userId);
  }
  if (filters.ip) {
    where += ' AND e.ip = ?';
    params.push(filters.ip);
  }
  if (filters.deviceId) {
    where += ' AND e.device_id = ?';
    params.push(filters.deviceId);
  }
  if (filters.eventType) {
    where += ' AND e.event_type = ?';
    params.push(filters.eventType);
  }
  if (filters.severity) {
    where += ' AND e.severity = ?';
    params.push(filters.severity);
  }
  if (filters.dateFrom) {
    where += ' AND e.created_at >= ?';
    params.push(filters.dateFrom);
  }
  if (filters.dateTo) {
    where += ' AND e.created_at < DATE_ADD(?, INTERVAL 1 DAY)';
    params.push(filters.dateTo);
  }
  if (filters.keyword) {
    const k = `%${filters.keyword}%`;
    where += ` AND (
      e.title LIKE ?
      OR e.description LIKE ?
      OR e.event_type LIKE ?
      OR IFNULL(e.ip, '') LIKE ?
      OR IFNULL(e.device_id, '') LIKE ?
      OR IFNULL(u.phone, '') LIKE ?
      OR IFNULL(u.nickname, '') LIKE ?
    )`;
    params.push(k, k, k, k, k, k, k);
  }

  return { where, params };
}

async function countLoginAttempts(filters) {
  const { where, params } = buildLoginAttemptWhere(filters);
  const [[row]] = await db.query(
    `SELECT COUNT(*) AS total
       FROM user_login_audits ula
       LEFT JOIN users u ON BINARY u.id = BINARY ula.user_id
       ${where}`,
    params,
  );
  return Number(row?.total || 0);
}

async function selectLoginAttempts(filters, limit, offset) {
  const { where, params } = buildLoginAttemptWhere(filters);
  const [rows] = await db.query(
    `SELECT
        ula.id,
        ula.user_id,
        ula.login_method,
        ula.ip,
        ula.ua_hash AS device_id,
        ula.created_at,
        u.phone,
        u.nickname,
        u.account_status
       FROM user_login_audits ula
       LEFT JOIN users u ON BINARY u.id = BINARY ula.user_id
       ${where}
       ORDER BY ula.created_at DESC
       LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  );
  return rows;
}

async function countSecurityEvents(filters) {
  const { where, params } = buildSecurityEventWhere(filters);
  const [[row]] = await db.query(
    `SELECT COUNT(*) AS total
       FROM user_security_events e
       LEFT JOIN users u ON BINARY u.id = BINARY e.user_id
       ${where}`,
    params,
  );
  return Number(row?.total || 0);
}

async function selectSecurityEvents(filters, limit, offset) {
  const { where, params } = buildSecurityEventWhere(filters);
  const [rows] = await db.query(
    `SELECT
        e.*,
        u.phone,
        u.nickname
       FROM user_security_events e
       LEFT JOIN users u ON BINARY u.id = BINARY e.user_id
       ${where}
       ORDER BY e.created_at DESC
       LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  );
  return rows.map(mapSecurityEvent);
}

async function countLoginAttemptsSince(hours) {
  const [[row]] = await db.query(
    `SELECT COUNT(*) AS total, COUNT(DISTINCT user_id) AS users
       FROM user_login_audits
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? HOUR)`,
    [hours],
  );
  return {
    total: Number(row?.total || 0),
    users: Number(row?.users || 0),
  };
}

async function countSecurityEventsSince(hours) {
  const [[row]] = await db.query(
    `SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN severity IN ('critical', 'high', 'P0', 'P1') THEN 1 ELSE 0 END) AS high_risk
       FROM user_security_events
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? HOUR)`,
    [hours],
  );
  return {
    total: Number(row?.total || 0),
    highRisk: Number(row?.high_risk || 0),
  };
}

async function countBlockedIps() {
  const [[row]] = await db.query(
    "SELECT COUNT(*) AS total FROM user_risk_ips WHERE status = 'blocked'",
  );
  return Number(row?.total || 0);
}

async function countBlockedDevices() {
  const [[row]] = await db.query(
    "SELECT COUNT(*) AS total FROM user_risk_devices WHERE status = 'blocked'",
  );
  return Number(row?.total || 0);
}

async function selectRiskIpSignals(sinceDays, limit) {
  const [rows] = await db.query(
    `SELECT
        ip,
        COUNT(*) AS login_count,
        COUNT(DISTINCT user_id) AS related_user_count,
        MAX(created_at) AS last_seen_at
       FROM user_login_audits
      WHERE ip IS NOT NULL
        AND ip <> ''
        AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY ip
      HAVING login_count >= 3 OR related_user_count >= 2
      ORDER BY login_count DESC, last_seen_at DESC
      LIMIT ?`,
    [sinceDays, limit],
  );
  return rows;
}

async function selectRiskIpEventSignals(sinceDays, limit) {
  const [rows] = await db.query(
    `SELECT
        ip,
        COUNT(*) AS event_count,
        SUM(CASE WHEN severity IN ('critical', 'high', 'P0', 'P1') THEN 1 ELSE 0 END) AS high_event_count,
        MAX(created_at) AS last_event_at
       FROM user_security_events
      WHERE ip IS NOT NULL
        AND ip <> ''
        AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY ip
      ORDER BY event_count DESC, last_event_at DESC
      LIMIT ?`,
    [sinceDays, limit],
  );
  return rows;
}

async function selectManualRiskIps(status) {
  const params = [];
  let where = 'WHERE 1=1';
  if (status) {
    where += ' AND status = ?';
    params.push(status);
  }
  const [rows] = await db.query(
    `SELECT *
       FROM user_risk_ips
       ${where}
       ORDER BY FIELD(status, 'blocked', 'watching', 'unblocked'), updated_at DESC
       LIMIT 500`,
    params,
  );
  return rows;
}

async function selectRiskDeviceSignals(sinceDays, limit) {
  const [rows] = await db.query(
    `SELECT
        ua_hash AS device_id,
        COUNT(*) AS login_count,
        COUNT(DISTINCT user_id) AS related_user_count,
        MAX(created_at) AS last_seen_at
       FROM user_login_audits
      WHERE ua_hash IS NOT NULL
        AND ua_hash <> ''
        AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY ua_hash
      HAVING login_count >= 3 OR related_user_count >= 2
      ORDER BY login_count DESC, last_seen_at DESC
      LIMIT ?`,
    [sinceDays, limit],
  );
  return rows;
}

async function selectRiskDeviceEventSignals(sinceDays, limit) {
  const [rows] = await db.query(
    `SELECT
        device_id,
        COUNT(*) AS event_count,
        SUM(CASE WHEN severity IN ('critical', 'high', 'P0', 'P1') THEN 1 ELSE 0 END) AS high_event_count,
        MAX(created_at) AS last_event_at
       FROM user_security_events
      WHERE device_id IS NOT NULL
        AND device_id <> ''
        AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY device_id
      ORDER BY event_count DESC, last_event_at DESC
      LIMIT ?`,
    [sinceDays, limit],
  );
  return rows;
}

async function selectManualRiskDevices(status) {
  const params = [];
  let where = 'WHERE 1=1';
  if (status) {
    where += ' AND status = ?';
    params.push(status);
  }
  const [rows] = await db.query(
    `SELECT *
       FROM user_risk_devices
       ${where}
       ORDER BY FIELD(status, 'blocked', 'watching', 'unblocked'), updated_at DESC
       LIMIT 500`,
    params,
  );
  return rows;
}

async function selectRiskIp(ip) {
  const [[row]] = await db.query('SELECT * FROM user_risk_ips WHERE ip = ? LIMIT 1', [ip]);
  return row || null;
}

async function selectRiskDevice(deviceId) {
  const [[row]] = await db.query('SELECT * FROM user_risk_devices WHERE device_id = ? LIMIT 1', [deviceId]);
  return row || null;
}

async function upsertBlockedIp({ id, ip, riskLevel, reason, adminUserId, failedCount = 0, relatedUserCount = 0, lastSeenAt = null }) {
  await db.query(
    `INSERT INTO user_risk_ips (
        id, ip, risk_level, reason, status, failed_count, related_user_count,
        last_seen_at, blocked_at, blocked_by, unblocked_at, unblocked_by
      ) VALUES (?, ?, ?, ?, 'blocked', ?, ?, ?, NOW(), ?, NULL, NULL)
      ON DUPLICATE KEY UPDATE
        risk_level = VALUES(risk_level),
        reason = VALUES(reason),
        status = 'blocked',
        failed_count = GREATEST(failed_count, VALUES(failed_count)),
        related_user_count = GREATEST(related_user_count, VALUES(related_user_count)),
        last_seen_at = COALESCE(VALUES(last_seen_at), last_seen_at),
        blocked_at = NOW(),
        blocked_by = VALUES(blocked_by),
        unblocked_at = NULL,
        unblocked_by = NULL`,
    [id, ip, riskLevel, reason, failedCount, relatedUserCount, lastSeenAt, adminUserId || null],
  );
}

async function unblockIp(ip, adminUserId, reason) {
  const [result] = await db.query(
    `UPDATE user_risk_ips
        SET status = 'unblocked',
            reason = CASE WHEN ? = '' THEN reason ELSE ? END,
            unblocked_at = NOW(),
            unblocked_by = ?,
            updated_at = NOW()
      WHERE ip = ?`,
    [reason || '', reason || '', adminUserId || null, ip],
  );
  return Number(result?.affectedRows || 0);
}

async function upsertBlockedDevice({ id, deviceId, deviceLabel, riskLevel, reason, adminUserId, relatedUserCount = 0, lastSeenAt = null }) {
  await db.query(
    `INSERT INTO user_risk_devices (
        id, device_id, device_label, risk_level, reason, status, related_user_count,
        last_seen_at, blocked_at, blocked_by, unblocked_at, unblocked_by
      ) VALUES (?, ?, ?, ?, ?, 'blocked', ?, ?, NOW(), ?, NULL, NULL)
      ON DUPLICATE KEY UPDATE
        device_label = VALUES(device_label),
        risk_level = VALUES(risk_level),
        reason = VALUES(reason),
        status = 'blocked',
        related_user_count = GREATEST(related_user_count, VALUES(related_user_count)),
        last_seen_at = COALESCE(VALUES(last_seen_at), last_seen_at),
        blocked_at = NOW(),
        blocked_by = VALUES(blocked_by),
        unblocked_at = NULL,
        unblocked_by = NULL`,
    [id, deviceId, deviceLabel || '', riskLevel, reason, relatedUserCount, lastSeenAt, adminUserId || null],
  );
}

async function unblockDevice(deviceId, adminUserId, reason) {
  const [result] = await db.query(
    `UPDATE user_risk_devices
        SET status = 'unblocked',
            reason = CASE WHEN ? = '' THEN reason ELSE ? END,
            unblocked_at = NOW(),
            unblocked_by = ?,
            updated_at = NOW()
      WHERE device_id = ?`,
    [reason || '', reason || '', adminUserId || null, deviceId],
  );
  return Number(result?.affectedRows || 0);
}

async function isIpBlocked(ip) {
  if (!ip) return false;
  const [[row]] = await db.query(
    "SELECT id FROM user_risk_ips WHERE ip = ? AND status = 'blocked' LIMIT 1",
    [ip],
  );
  return Boolean(row);
}

async function isDeviceBlocked(deviceId) {
  if (!deviceId) return false;
  const [[row]] = await db.query(
    "SELECT id FROM user_risk_devices WHERE device_id = ? AND status = 'blocked' LIMIT 1",
    [deviceId],
  );
  return Boolean(row);
}

async function insertSecurityEvent({
  id,
  userId = null,
  eventType,
  severity,
  title,
  description = '',
  ip = null,
  deviceId = null,
  userAgent = null,
  metadata = null,
}) {
  await db.query(
    `INSERT INTO user_security_events (
       id, user_id, event_type, severity, title, description, ip, device_id, user_agent, metadata
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      userId || null,
      eventType,
      severity,
      title,
      description || '',
      ip || null,
      deviceId || null,
      userAgent ? String(userAgent).slice(0, 500) : null,
      metadata === undefined || metadata === null ? null : JSON.stringify(metadata),
    ],
  );
}

async function selectUserRecentLoginSessions(userId, limit, offset) {
  const [rows] = await db.query(
    `SELECT
        ula.id,
        ula.user_id,
        ula.login_method,
        ula.ip,
        ula.ua_hash AS device_id,
        ula.created_at,
        ula.created_at AS last_seen_at,
        NULL AS revoked_at
       FROM user_login_audits ula
      WHERE BINARY ula.user_id = BINARY ?
      ORDER BY ula.created_at DESC
      LIMIT ? OFFSET ?`,
    [userId, limit, offset],
  );
  return rows;
}

async function countUserRecentLoginSessions(userId) {
  const [[row]] = await db.query(
    'SELECT COUNT(*) AS total FROM user_login_audits WHERE BINARY user_id = BINARY ?',
    [userId],
  );
  return Number(row?.total || 0);
}

async function bumpUserRefreshTokenVersion(userId) {
  const [result] = await db.query(
    'UPDATE users SET refresh_token_version = refresh_token_version + 1 WHERE BINARY id = BINARY ? AND deleted_at IS NULL',
    [userId],
  );
  return Number(result?.affectedRows || 0);
}

async function selectUserProtection(userId) {
  const [[row]] = await db.query(
    `SELECT id, phone, nickname, protected_until, protected_reason
       FROM users
      WHERE BINARY id = BINARY ? AND deleted_at IS NULL
      LIMIT 1`,
    [userId],
  );
  return row || null;
}

async function clearUserProtection(userId) {
  const [result] = await db.query(
    `UPDATE users
        SET protected_until = NULL, protected_reason = NULL
      WHERE BINARY id = BINARY ? AND deleted_at IS NULL`,
    [userId],
  );
  return Number(result?.affectedRows || 0);
}

module.exports = {
  countLoginAttempts,
  selectLoginAttempts,
  countSecurityEvents,
  selectSecurityEvents,
  countLoginAttemptsSince,
  countSecurityEventsSince,
  countBlockedIps,
  countBlockedDevices,
  selectRiskIpSignals,
  selectRiskIpEventSignals,
  selectManualRiskIps,
  selectRiskDeviceSignals,
  selectRiskDeviceEventSignals,
  selectManualRiskDevices,
  selectRiskIp,
  selectRiskDevice,
  upsertBlockedIp,
  unblockIp,
  upsertBlockedDevice,
  unblockDevice,
  isIpBlocked,
  isDeviceBlocked,
  insertSecurityEvent,
  selectUserRecentLoginSessions,
  countUserRecentLoginSessions,
  bumpUserRefreshTokenVersion,
  selectUserProtection,
  clearUserProtection,
};

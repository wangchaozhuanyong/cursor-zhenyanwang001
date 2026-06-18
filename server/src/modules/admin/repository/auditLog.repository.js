const db = require('../../../config/db');

function parseJsonField(row, key) {
  const v = row[key];
  if (v == null) return null;
  if (typeof v === 'object') return v;
  try {
    return JSON.parse(v);
  } catch {
    return v;
  }
}

function mapRow(row) {
  if (!row) return row;
  return {
    ...row,
    before_json: parseJsonField(row, 'before_json'),
    after_json: parseJsonField(row, 'after_json'),
  };
}

/**
 * @param {Record<string, string|undefined>} query
 */
function buildWhere(query) {
  let where = 'WHERE 1=1';
  const params = [];

  if (query.operatorId) {
    where += ' AND operator_id = ?';
    params.push(query.operatorId);
  }
  if (query.objectType) {
    where += ' AND object_type = ?';
    params.push(query.objectType);
  }
  if (query.objectId) {
    where += ' AND object_id = ?';
    params.push(query.objectId);
  }
  if (query.actionTypes) {
    const actionTypes = String(query.actionTypes)
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 20);
    if (actionTypes.length) {
      where += ` AND action_type IN (${actionTypes.map(() => '?').join(',')})`;
      params.push(...actionTypes);
    }
  } else if (query.actionType) {
    where += ' AND action_type = ?';
    params.push(query.actionType);
  }
  if (query.result === 'success' || query.result === 'failure') {
    where += ' AND result = ?';
    params.push(query.result);
  }
  if (query.dateFrom) {
    where += ' AND created_at >= ?';
    params.push(query.dateFrom);
  }
  if (query.dateTo) {
    where += ' AND created_at < DATE_ADD(?, INTERVAL 1 DAY)';
    params.push(query.dateTo);
  }
  if (query.keyword) {
    const k = `%${query.keyword}%`;
    where += ' AND (summary LIKE ? OR operator_name LIKE ? OR action_type LIKE ? OR IFNULL(object_id,"") LIKE ? OR error_message LIKE ?)';
    params.push(k, k, k, k, k);
  }

  return { where, params };
}

async function countAuditLogs(where, params) {
  const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM audit_logs ${where}`, params);
  return total;
}

async function selectAuditLogsPage(where, params, orderSql, limit, offset) {
  const [rows] = await db.query(
    `SELECT * FROM audit_logs ${where} ${orderSql} LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  );
  return rows.map(mapRow);
}

async function selectOperatorDisplayByUserId(userId) {
  const [[row]] = await db.query(
    'SELECT nickname, role FROM users WHERE id = ? LIMIT 1',
    [userId],
  );
  return row || null;
}

async function selectSecurityAlerts(limit = 10, sinceHours = 24) {
  const safeLimit = Math.min(50, Math.max(1, Number(limit) || 10));
  const safeHours = Math.min(168, Math.max(1, Number(sinceHours) || 24));
  const [rows] = await db.query(
    `SELECT *
       FROM audit_logs
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? HOUR)
        AND (
          action_type LIKE 'security.%'
          OR (action_type = 'admin.login' AND result = 'failure')
          OR action_type = 'admin.mfa.challenge'
        )
      ORDER BY created_at DESC
      LIMIT ?`,
    [safeHours, safeLimit],
  );
  return rows.map(mapRow);
}

async function countSecurityAlerts(sinceHours = 24) {
  const safeHours = Math.min(168, Math.max(1, Number(sinceHours) || 24));
  const [[row]] = await db.query(
    `SELECT
       COUNT(*) AS total,
       SUM(CASE WHEN result = 'failure' THEN 1 ELSE 0 END) AS failures
       FROM audit_logs
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? HOUR)
        AND (
          action_type LIKE 'security.%'
          OR (action_type = 'admin.login' AND result = 'failure')
          OR action_type = 'admin.mfa.challenge'
        )`,
    [safeHours],
  );
  return {
    total: Number(row?.total || 0),
    failures: Number(row?.failures || 0),
  };
}

/**
 * @param {{
 *   id: string;
 *   operatorId: string|null;
 *   operatorName: string;
 *   operatorRole: string;
 *   actionType: string;
 *   objectType: string;
 *   objectId: string|null;
 *   summary: string;
 *   beforeStr: string|null;
 *   afterStr: string|null;
 *   ip: string;
 *   userAgent: string;
 *   path: string;
 *   method: string;
 *   result: string;
 *   errorMessage: string;
 * }} p
 */
async function insertAuditLogRow(p) {
  await db.query(
    `INSERT INTO audit_logs (
      id, operator_id, operator_name, operator_role, action_type, object_type, object_id,
      summary, before_json, after_json, ip, user_agent, request_path, request_method, result, error_message
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      p.id,
      p.operatorId,
      p.operatorName,
      p.operatorRole,
      p.actionType,
      p.objectType,
      p.objectId,
      p.summary,
      p.beforeStr,
      p.afterStr,
      p.ip,
      p.userAgent,
      p.path,
      p.method,
      p.result,
      p.errorMessage,
    ],
  );
}

module.exports = {
  buildWhere,
  countAuditLogs,
  selectAuditLogsPage,
  selectSecurityAlerts,
  countSecurityAlerts,
  selectOperatorDisplayByUserId,
  insertAuditLogRow,
};



const db = require('../../config/db');

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
  if (query.actionType) {
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

module.exports = {
  buildWhere,
  countAuditLogs,
  selectAuditLogsPage,
};

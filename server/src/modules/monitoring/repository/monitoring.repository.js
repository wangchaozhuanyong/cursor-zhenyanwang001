const crypto = require('crypto');
const db = require('../../../config/db');

function toJson(value) {
  if (value === undefined) return null;
  return JSON.stringify(value ?? null);
}

function parseJson(value) {
  if (value == null) return null;
  if (typeof value === 'object') return value;
  try { return JSON.parse(value); } catch { return value; }
}

function mapAnomaly(row) {
  if (!row) return null;
  return {
    ...row,
    id: Number(row.id),
    expected_value: parseJson(row.expected_value),
    actual_value: parseJson(row.actual_value),
    diff_value: parseJson(row.diff_value),
    evidence: parseJson(row.evidence),
  };
}

function mapRepairTask(row) {
  if (!row) return null;
  return {
    ...row,
    id: Number(row.id),
    anomaly_id: Number(row.anomaly_id),
    before_snapshot: parseJson(row.before_snapshot),
    after_snapshot: parseJson(row.after_snapshot),
    suggestion: parseJson(row.suggestion),
  };
}

function dedupeHash(ruleCode, entityType, entityId) {
  return crypto.createHash('sha256').update(`${ruleCode}:${entityType}:${entityId}`).digest('hex');
}

async function tableExists(tableName) {
  const [[row]] = await db.query(
    `SELECT COUNT(*) AS c FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    [tableName],
  );
  return Number(row?.c || 0) > 0;
}

async function columnExists(tableName, columnName) {
  const [[row]] = await db.query(
    `SELECT COUNT(*) AS c FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [tableName, columnName],
  );
  return Number(row?.c || 0) > 0;
}

async function createRun({ runType, ruleCode }) {
  const [result] = await db.query(
    `INSERT INTO data_consistency_runs (run_type, rule_code, status, started_at)
     VALUES (?, ?, 'running', NOW())`,
    [runType || 'manual', ruleCode || null],
  );
  return result.insertId;
}

async function finishRun(id, { status, checkedCount, anomalyCount, errorMessage }) {
  await db.query(
    `UPDATE data_consistency_runs
       SET status = ?, checked_count = ?, anomaly_count = ?, finished_at = NOW(),
           duration_ms = TIMESTAMPDIFF(MICROSECOND, started_at, NOW()) / 1000,
           error_message = ?
     WHERE id = ?`,
    [status, checkedCount || 0, anomalyCount || 0, errorMessage || null, id],
  );
}

async function listRules() {
  const [rows] = await db.query(`SELECT * FROM data_consistency_rules ORDER BY module, id`);
  return rows;
}

async function getRule(code) {
  const [[row]] = await db.query(`SELECT * FROM data_consistency_rules WHERE code = ?`, [code]);
  return row || null;
}

async function listEnabledRules() {
  const [rows] = await db.query(`SELECT * FROM data_consistency_rules WHERE enabled = 1 ORDER BY id`);
  return rows;
}

async function updateRule(code, patch) {
  const allowed = ['enabled', 'severity', 'schedule_cron', 'auto_fix_enabled'];
  const sets = [];
  const values = [];
  for (const key of allowed) {
    if (patch[key] === undefined) continue;
    sets.push(`${key} = ?`);
    values.push(patch[key]);
  }
  if (!sets.length) return getRule(code);
  values.push(code);
  await db.query(`UPDATE data_consistency_rules SET ${sets.join(', ')} WHERE code = ?`, values);
  await recordRuleEvent(code, 'rule.updated', patch);
  return getRule(code);
}

async function recordRuleEvent(ruleCode, eventType, payload = {}) {
  await db.query(
    `INSERT INTO data_consistency_rule_events (rule_code, event_type, payload) VALUES (?, ?, ?)`,
    [ruleCode, eventType, toJson(payload)],
  );
}

async function upsertAnomaly(anomaly) {
  const hash = anomaly.dedupeHash || dedupeHash(anomaly.ruleCode, anomaly.entityType, anomaly.entityId);
  const [result] = await db.query(
    `INSERT INTO data_consistency_anomalies
      (rule_code, module, severity, entity_type, entity_id, title,
       expected_value, actual_value, diff_value, root_cause_code, root_cause_message,
       evidence, dedupe_hash, status, first_seen_at, last_seen_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', NOW(), NOW())
     ON DUPLICATE KEY UPDATE
       severity = VALUES(severity),
       title = VALUES(title),
       expected_value = VALUES(expected_value),
       actual_value = VALUES(actual_value),
       diff_value = VALUES(diff_value),
       root_cause_code = VALUES(root_cause_code),
       root_cause_message = VALUES(root_cause_message),
       evidence = VALUES(evidence),
       seen_count = seen_count + 1,
       last_seen_at = NOW(),
       status = IF(status IN ('resolved','ignored','repaired'), status, 'open')`,
    [
      anomaly.ruleCode,
      anomaly.module,
      anomaly.severity,
      anomaly.entityType,
      String(anomaly.entityId),
      anomaly.title,
      toJson(anomaly.expectedValue),
      toJson(anomaly.actualValue),
      toJson(anomaly.diffValue),
      anomaly.rootCauseCode || 'UNKNOWN',
      anomaly.rootCauseMessage || '',
      toJson(anomaly.evidence),
      hash,
    ],
  );
  const [[row]] = await db.query(`SELECT * FROM data_consistency_anomalies WHERE dedupe_hash = ?`, [hash]);
  return { anomaly: mapAnomaly(row), inserted: result.affectedRows === 1 };
}

async function findAnomalyById(id) {
  const [[row]] = await db.query(`SELECT * FROM data_consistency_anomalies WHERE id = ?`, [id]);
  return mapAnomaly(row);
}

async function findOpenByRuleAndEntity(ruleCode, entityType, entityId) {
  const [[row]] = await db.query(
    `SELECT * FROM data_consistency_anomalies
     WHERE rule_code = ? AND entity_type = ? AND entity_id = ? AND status IN ('open','investigating','repair_pending')
     LIMIT 1`,
    [ruleCode, entityType, String(entityId)],
  );
  return mapAnomaly(row);
}

async function markAnomalyStatus(id, status, operatorId = null) {
  const resolved = ['resolved', 'ignored', 'repaired'].includes(status);
  await db.query(
    `UPDATE data_consistency_anomalies
       SET status = ?, resolved_at = ${resolved ? 'NOW()' : 'resolved_at'}, resolved_by = ?
     WHERE id = ?`,
    [status, operatorId || null, id],
  );
  return findAnomalyById(id);
}

function buildAnomalyWhere(query = {}) {
  let where = 'WHERE 1=1';
  const params = [];
  const add = (sql, value) => { if (value !== undefined && value !== null && value !== '') { where += sql; params.push(value); } };
  add(' AND status = ?', query.status);
  add(' AND severity = ?', query.severity);
  add(' AND module = ?', query.module);
  add(' AND rule_code = ?', query.ruleCode);
  add(' AND entity_type = ?', query.entityType);
  add(' AND entity_id = ?', query.entityId);
  if (query.keyword) {
    where += ' AND (title LIKE ? OR entity_id LIKE ? OR root_cause_message LIKE ?)';
    const kw = `%${query.keyword}%`;
    params.push(kw, kw, kw);
  }
  if (query.dateFrom) { where += ' AND first_seen_at >= ?'; params.push(query.dateFrom); }
  if (query.dateTo) { where += ' AND first_seen_at <= ?'; params.push(query.dateTo); }
  return { where, params };
}

async function listAnomalies(query = {}) {
  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));
  const offset = (page - 1) * pageSize;
  const { where, params } = buildAnomalyWhere(query);
  const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM data_consistency_anomalies ${where}`, params);
  const [rows] = await db.query(
    `SELECT * FROM data_consistency_anomalies ${where}
     ORDER BY FIELD(severity, 'P0','P1','P2','P3','INFO'), last_seen_at DESC
     LIMIT ? OFFSET ?`,
    [...params, pageSize, offset],
  );
  return { list: rows.map(mapAnomaly), total: Number(total || 0), page, pageSize };
}

async function getOverview() {
  const [[today]] = await db.query(
    `SELECT COUNT(*) AS runCount, COALESCE(SUM(anomaly_count), 0) AS anomalyCount
     FROM data_consistency_runs WHERE DATE(started_at) = CURDATE()`,
  );
  const [[open]] = await db.query(
    `SELECT
       SUM(CASE WHEN status IN ('open','investigating','repair_pending') THEN 1 ELSE 0 END) AS openCount,
       SUM(CASE WHEN severity IN ('P0','P1') AND status IN ('open','investigating','repair_pending') THEN 1 ELSE 0 END) AS highCount,
       SUM(CASE WHEN status IN ('repaired','resolved') THEN 1 ELSE 0 END) AS fixedCount
     FROM data_consistency_anomalies`,
  );
  const [moduleRows] = await db.query(
    `SELECT module, COUNT(*) AS count FROM data_consistency_anomalies
     WHERE status IN ('open','investigating','repair_pending')
     GROUP BY module ORDER BY count DESC`,
  );
  const [highRows] = await db.query(
    `SELECT * FROM data_consistency_anomalies
     WHERE severity IN ('P0','P1') AND status IN ('open','investigating','repair_pending')
     ORDER BY last_seen_at DESC LIMIT 10`,
  );
  const [runRows] = await db.query(
    `SELECT * FROM data_consistency_runs ORDER BY started_at DESC LIMIT 10`,
  );
  return {
    todayRunCount: Number(today?.runCount || 0),
    todayAnomalyCount: Number(today?.anomalyCount || 0),
    openAnomalyCount: Number(open?.openCount || 0),
    highRiskCount: Number(open?.highCount || 0),
    fixedCount: Number(open?.fixedCount || 0),
    moduleCounts: moduleRows.map((r) => ({ module: r.module, count: Number(r.count || 0) })),
    recentHighRisk: highRows.map(mapAnomaly),
    recentRuns: runRows,
  };
}

async function listRuns(query = {}) {
  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));
  const offset = (page - 1) * pageSize;
  let where = 'WHERE 1=1';
  const params = [];
  if (query.ruleCode) { where += ' AND rule_code = ?'; params.push(query.ruleCode); }
  if (query.status) { where += ' AND status = ?'; params.push(query.status); }
  const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM data_consistency_runs ${where}`, params);
  const [rows] = await db.query(
    `SELECT * FROM data_consistency_runs ${where} ORDER BY started_at DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, offset],
  );
  return { list: rows, total: Number(total || 0), page, pageSize };
}

async function createRepairTask({ anomalyId, repairType, suggestion, operatorId, remark, beforeSnapshot }) {
  const [result] = await db.query(
    `INSERT INTO data_repair_tasks
      (anomaly_id, repair_type, repair_status, before_snapshot, suggestion, operator_id, remark)
     VALUES (?, ?, 'pending', ?, ?, ?, ?)`,
    [anomalyId, repairType, toJson(beforeSnapshot), toJson(suggestion), operatorId || null, remark || null],
  );
  await markAnomalyStatus(anomalyId, 'repair_pending', operatorId);
  return findRepairTaskById(result.insertId);
}

async function findRepairTaskById(id) {
  const [[row]] = await db.query(
    `SELECT t.*, a.title AS anomaly_title, a.rule_code, a.severity, a.entity_type, a.entity_id
     FROM data_repair_tasks t
     JOIN data_consistency_anomalies a ON a.id = t.anomaly_id
     WHERE t.id = ?`,
    [id],
  );
  return mapRepairTask(row);
}

async function listRepairTasks(query = {}) {
  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));
  const offset = (page - 1) * pageSize;
  let where = 'WHERE 1=1';
  const params = [];
  if (query.status) { where += ' AND t.repair_status = ?'; params.push(query.status); }
  if (query.anomalyId) { where += ' AND t.anomaly_id = ?'; params.push(query.anomalyId); }
  const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM data_repair_tasks t ${where}`, params);
  const [rows] = await db.query(
    `SELECT t.*, a.title AS anomaly_title, a.rule_code, a.severity, a.entity_type, a.entity_id
     FROM data_repair_tasks t
     JOIN data_consistency_anomalies a ON a.id = t.anomaly_id
     ${where}
     ORDER BY t.created_at DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, offset],
  );
  return { list: rows.map(mapRepairTask), total: Number(total || 0), page, pageSize };
}

async function updateRepairTask(id, fields) {
  const sets = [];
  const params = [];
  for (const [k, v] of Object.entries(fields || {})) {
    if (['after_snapshot', 'before_snapshot', 'suggestion'].includes(k)) {
      sets.push(`${k} = ?`);
      params.push(toJson(v));
    } else {
      sets.push(`${k} = ?`);
      params.push(v);
    }
  }
  if (!sets.length) return findRepairTaskById(id);
  sets.push('updated_at = NOW()');
  params.push(id);
  await db.query(`UPDATE data_repair_tasks SET ${sets.join(', ')} WHERE id = ?`, params);
  return findRepairTaskById(id);
}

async function listDataChangeEvents(entityType, entityId, limit = 20) {
  const [rows] = await db.query(
    `SELECT * FROM data_change_events
     WHERE entity_type = ? AND entity_id = ?
     ORDER BY created_at DESC LIMIT ?`,
    [entityType, String(entityId), Number(limit) || 20],
  );
  return rows.map((row) => ({
    ...row,
    before_data: parseJson(row.before_data),
    after_data: parseJson(row.after_data),
  }));
}

async function trackChange(payload) {
  await db.query(
    `INSERT INTO data_change_events
      (request_id, module, entity_type, entity_id, action, actor_type, actor_id, source, before_data, after_data, ip, user_agent)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      payload.requestId || null,
      payload.module,
      payload.entityType,
      String(payload.entityId),
      payload.action,
      payload.actorType || 'system',
      payload.actorId || null,
      payload.source || '',
      toJson(payload.beforeData),
      toJson(payload.afterData),
      payload.ip || null,
      payload.userAgent || null,
    ],
  );
}

module.exports = {
  db,
  toJson,
  parseJson,
  dedupeHash,
  tableExists,
  columnExists,
  createRun,
  finishRun,
  listRules,
  getRule,
  listEnabledRules,
  updateRule,
  recordRuleEvent,
  upsertAnomaly,
  findAnomalyById,
  findOpenByRuleAndEntity,
  markAnomalyStatus,
  listAnomalies,
  getOverview,
  listRuns,
  createRepairTask,
  findRepairTaskById,
  listRepairTasks,
  updateRepairTask,
  listDataChangeEvents,
  trackChange,
};

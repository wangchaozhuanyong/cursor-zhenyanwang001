const crypto = require('crypto');
const db = require('../../../config/db');
const { eq } = require('../monitoringSql');

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
    `SELECT t.*, a.title AS anomaly_title, a.rule_code, a.severity, a.entity_type, a.entity_id,
            COALESCE(NULLIF(u.nickname, ''), u.phone, t.operator_id) AS operator_label
     FROM data_repair_tasks t
     JOIN data_consistency_anomalies a ON a.id = t.anomaly_id
     LEFT JOIN users u ON u.id = t.operator_id AND u.deleted_at IS NULL
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

async function selectProductStockMismatches() {
  const hasProductDeletedAt = await columnExists('products', 'deleted_at');
  const [rows] = await db.query(
    `SELECT p.id, p.name, p.stock AS product_stock,
            COALESCE(SUM(CASE WHEN (v.deleted_at IS NULL) AND (v.enabled IS NULL OR v.enabled = 1) THEN v.stock ELSE 0 END), 0) AS sku_stock
     FROM products p
     LEFT JOIN product_variants v ON ${eq('v.product_id', 'p.id')}
     ${hasProductDeletedAt ? 'WHERE p.deleted_at IS NULL' : ''}
     GROUP BY p.id, p.name, p.stock
     HAVING product_stock <> sku_stock`,
  );
  return rows;
}

async function selectNegativeSkuStocks() {
  const [rows] = await db.query(
    `SELECT v.id, v.product_id, v.sku_code, v.title, v.stock, p.name AS product_name
     FROM product_variants v
     LEFT JOIN products p ON ${eq('p.id', 'v.product_id')}
     WHERE v.stock < 0 AND v.deleted_at IS NULL`,
  );
  return rows;
}

async function selectPaymentSuccessUnpaidOrders() {
  const [rows] = await db.query(
    `SELECT po.id AS payment_order_id, po.order_id, po.order_no, po.amount, po.status AS payment_order_status,
            po.payment_transaction_no, o.status AS order_status, o.payment_status, o.total_amount
     FROM payment_orders po
     JOIN orders o ON ${eq('o.id', 'po.order_id')}
     WHERE po.status = 'paid'
       AND (o.payment_status IS NULL OR o.payment_status <> 'paid')
       AND o.status NOT IN ('refunded','cancelled')`,
  );
  return rows;
}

async function selectOrderPaymentAmountMismatches() {
  const [rows] = await db.query(
    `SELECT o.id AS order_id, o.order_no, o.total_amount,
            COALESCE(SUM(po.amount), 0) AS paid_amount,
            GROUP_CONCAT(po.id ORDER BY po.created_at) AS payment_order_ids
     FROM orders o
     JOIN payment_orders po ON ${eq('po.order_id', 'o.id')} AND po.status = 'paid'
     WHERE o.payment_status IN ('paid','partially_refunded','refunded') OR o.status IN ('paid','shipped','completed','refunding','refunded')
     GROUP BY o.id, o.order_no, o.total_amount
     HAVING ABS(COALESCE(SUM(po.amount), 0) - o.total_amount) > 0.01`,
  );
  return rows;
}

async function selectRefundAmountExceedsPaidOrders() {
  const [rows] = await db.query(
    `SELECT id, order_no, total_amount, refunded_amount, payment_status, refund_status
     FROM orders
     WHERE refunded_amount > total_amount + 0.01`,
  );
  return rows;
}

async function selectPointsBalanceMismatches() {
  const hasAccounts = await tableExists('points_accounts');
  const [rows] = hasAccounts
    ? await db.query(
      `SELECT u.id AS user_id, u.phone, u.nickname, COALESCE(pa.balance, u.points_balance, 0) AS account_balance,
              COALESCE(SUM(CASE WHEN pr.status IS NULL OR pr.status = 'success' THEN pr.amount ELSE 0 END), 0) AS ledger_balance,
              u.points_balance
       FROM users u
       LEFT JOIN points_accounts pa ON ${eq('pa.user_id', 'u.id')}
       LEFT JOIN points_records pr ON ${eq('pr.user_id', 'u.id')}
       WHERE u.deleted_at IS NULL
       GROUP BY u.id, u.phone, u.nickname, pa.balance, u.points_balance
       HAVING account_balance <> ledger_balance OR u.points_balance <> account_balance`,
    )
    : await db.query(
      `SELECT u.id AS user_id, u.phone, u.nickname, u.points_balance AS account_balance,
              COALESCE(SUM(CASE WHEN pr.status IS NULL OR pr.status = 'success' THEN pr.amount ELSE 0 END), 0) AS ledger_balance,
              u.points_balance
       FROM users u
       LEFT JOIN points_records pr ON ${eq('pr.user_id', 'u.id')}
       WHERE u.deleted_at IS NULL
       GROUP BY u.id, u.phone, u.nickname, u.points_balance
       HAVING account_balance <> ledger_balance`,
    );
  return { rows, hasAccounts };
}

async function selectCancelledOrdersWithoutStockRestore() {
  const [rows] = await db.query(
    `SELECT o.id, o.order_no, o.updated_at, COUNT(r.id) AS restore_records
     FROM orders o
     LEFT JOIN inventory_stock_records r
       ON (${eq('r.source_no', 'o.order_no')} OR ${eq('r.order_no_snapshot', 'o.order_no')})
      AND r.change_type IN ('restore','cancel_restore','order_cancel','refund')
     WHERE o.status = 'cancelled'
       AND o.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
     GROUP BY o.id, o.order_no, o.updated_at
     HAVING restore_records = 0`,
  );
  return rows;
}

async function selectStaleCacheRecords() {
  const [rows] = await db.query(
    `SELECT cache_key, module, entity_type, entity_id, cache_updated_at, db_updated_at
     FROM cache_meta
     WHERE db_updated_at IS NOT NULL AND cache_updated_at < db_updated_at`,
  );
  return rows;
}

async function selectFileReferenceRows() {
  const [products] = await db.query(`SELECT id, name, cover_image, images FROM products`);
  const variants = await tableExists('product_variants')
    ? (await db.query(`SELECT id, product_id, title, image_url FROM product_variants WHERE image_url IS NOT NULL AND image_url <> ''`))[0]
    : [];
  const [banners] = await db.query(`SELECT id, title, image FROM banners WHERE image IS NOT NULL AND image <> ''`);
  return { products, variants, banners };
}

async function selectUserStatsMismatches() {
  const hasRefundedAmount = await columnExists('orders', 'refunded_amount');
  const [rows] = await db.query(
    `SELECT u.id AS user_id, u.phone, u.nickname,
            COALESCE(us.total_spent, 0) AS stat_total_spent,
            COALESCE(us.valid_order_count, 0) AS stat_valid_order_count,
            COALESCE(real.total_spent, 0) AS real_total_spent,
            COALESCE(real.valid_order_count, 0) AS real_valid_order_count
     FROM users u
     LEFT JOIN user_statistics us ON ${eq('us.user_id', 'u.id')}
     LEFT JOIN (
       SELECT user_id,
              COUNT(*) AS valid_order_count,
              SUM(total_amount${hasRefundedAmount ? ' - COALESCE(refunded_amount, 0)' : ''}) AS total_spent
       FROM orders
       WHERE payment_status IN ('paid','partially_refunded','refunded')
         AND status <> 'cancelled'
       GROUP BY user_id
     ) real ON ${eq('real.user_id', 'u.id')}
     WHERE u.deleted_at IS NULL
       AND (
         ABS(COALESCE(us.total_spent, 0) - COALESCE(real.total_spent, 0)) > 0.01
         OR COALESCE(us.valid_order_count, 0) <> COALESCE(real.valid_order_count, 0)
       )`,
  );
  return rows;
}

async function hasPendingRepairTask(anomalyId) {
  const [[row]] = await db.query(
    `SELECT id FROM data_repair_tasks WHERE anomaly_id = ? AND repair_status = 'pending' LIMIT 1`,
    [anomalyId],
  );
  return Boolean(row);
}

async function syncProductStockFromVariants(productId) {
  const [[before]] = await db.query(`SELECT id, stock FROM products WHERE id = ?`, [productId]);
  await db.query(
    `UPDATE products p
     SET p.stock = COALESCE((
       SELECT SUM(v.stock)
       FROM product_variants v
       WHERE v.product_id = p.id
         AND v.deleted_at IS NULL
         AND (v.enabled IS NULL OR v.enabled = 1)
     ), 0)
     WHERE p.id = ?`,
    [productId],
  );
  const [[after]] = await db.query(`SELECT id, stock FROM products WHERE id = ?`, [productId]);
  return { before, after };
}

async function clearCacheKey(cacheKey) {
  await db.query(`DELETE FROM cache_meta WHERE cache_key = ?`, [cacheKey]);
}

async function recalculateUserStatistics(userId) {
  const [[real]] = await db.query(
    `SELECT COUNT(*) AS valid_order_count, COALESCE(SUM(total_amount - COALESCE(refunded_amount, 0)), 0) AS total_spent
     FROM orders
     WHERE user_id = ? AND payment_status IN ('paid','partially_refunded','refunded') AND status <> 'cancelled'`,
    [userId],
  );
  await db.query(
    `INSERT INTO user_statistics (user_id, total_spent, valid_order_count, average_order_value)
     VALUES (?, ?, ?, IF(? > 0, ? / ?, 0))
     ON DUPLICATE KEY UPDATE
       total_spent = VALUES(total_spent),
       valid_order_count = VALUES(valid_order_count),
       average_order_value = VALUES(average_order_value),
       updated_at = NOW()`,
    [
      userId,
      Number(real.total_spent || 0),
      Number(real.valid_order_count || 0),
      Number(real.valid_order_count || 0),
      Number(real.total_spent || 0),
      Number(real.valid_order_count || 0),
    ],
  );
  return real;
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
  selectProductStockMismatches,
  selectNegativeSkuStocks,
  selectPaymentSuccessUnpaidOrders,
  selectOrderPaymentAmountMismatches,
  selectRefundAmountExceedsPaidOrders,
  selectPointsBalanceMismatches,
  selectCancelledOrdersWithoutStockRestore,
  selectStaleCacheRecords,
  selectFileReferenceRows,
  selectUserStatsMismatches,
  hasPendingRepairTask,
  syncProductStockFromVariants,
  clearCacheKey,
  recalculateUserStatistics,
};

const db = require('../../../config/db');
const { quoteIdentifier } = require('../service/policyCatalog.service');

function toJson(value) {
  if (value === undefined) return null;
  return JSON.stringify(value ?? null);
}

function parseJson(value) {
  if (value == null) return null;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function mapRun(row) {
  if (!row) return null;
  return {
    ...row,
    id: Number(row.id),
    preview_run_id: row.preview_run_id == null ? null : Number(row.preview_run_id),
    backup_job_id: row.backup_job_id || null,
    backup_status: row.backup_status || null,
    backup_error_message: row.backup_error_message || null,
    policy_keys: parseJson(row.policy_keys) || [],
    request_snapshot: parseJson(row.request_snapshot),
    cancel_requested: Boolean(row.cancel_requested),
  };
}

function mapStep(row) {
  if (!row) return null;
  return {
    ...row,
    id: Number(row.id),
    run_id: Number(row.run_id),
    sample_ids: parseJson(row.sample_ids) || [],
  };
}

async function tableExists(tableName) {
  const [[row]] = await db.query(
    `SELECT COUNT(*) AS c
       FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    [tableName],
  );
  return Number(row?.c || 0) > 0;
}

async function upsertDefaultPolicy(policy) {
  await db.query(
    `INSERT INTO data_cleanup_policies
      (policy_key, title, description, category, table_name, date_column, delete_mode,
       retention_days, default_retention_days, min_retention_days, batch_size, enabled, locked)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       title = VALUES(title),
       description = VALUES(description),
       category = VALUES(category),
       table_name = VALUES(table_name),
       date_column = VALUES(date_column),
       delete_mode = VALUES(delete_mode),
       default_retention_days = VALUES(default_retention_days),
       min_retention_days = VALUES(min_retention_days),
       locked = VALUES(locked),
       retention_days = IF(VALUES(locked) = 1 AND retention_days < VALUES(min_retention_days), VALUES(min_retention_days), retention_days),
       batch_size = IF(batch_size < 500 OR batch_size > 2000, VALUES(batch_size), batch_size)`,
    [
      policy.key,
      policy.title,
      policy.description || '',
      policy.category || 'system',
      policy.tableName || '',
      policy.dateColumn || '',
      policy.deleteMode || 'hard_delete',
      policy.retentionDays,
      policy.retentionDays,
      policy.minRetentionDays || 1,
      policy.batchSize,
      policy.enabled ? 1 : 0,
      policy.locked ? 1 : 0,
    ],
  );
}

async function listPolicies() {
  const [rows] = await db.query(
    `SELECT * FROM data_cleanup_policies ORDER BY category, policy_key`,
  );
  return rows;
}

async function getPolicy(policyKey) {
  const [[row]] = await db.query(
    `SELECT * FROM data_cleanup_policies WHERE policy_key = ? LIMIT 1`,
    [policyKey],
  );
  return row || null;
}

async function updatePolicy(policyKey, patch) {
  const allowed = ['retention_days', 'enabled', 'batch_size'];
  const sets = [];
  const params = [];
  for (const key of allowed) {
    if (patch[key] === undefined) continue;
    sets.push(`${key} = ?`);
    params.push(patch[key]);
  }
  if (!sets.length) return getPolicy(policyKey);
  params.push(policyKey);
  await db.query(
    `UPDATE data_cleanup_policies SET ${sets.join(', ')} WHERE policy_key = ?`,
    params,
  );
  return getPolicy(policyKey);
}

async function resetPolicyToDefault(policy) {
  await db.query(
    `UPDATE data_cleanup_policies
        SET retention_days = ?, enabled = ?, batch_size = ?
      WHERE policy_key = ?`,
    [
      policy.retentionDays,
      policy.enabled ? 1 : 0,
      policy.batchSize,
      policy.key,
    ],
  );
}

async function countMatchingRows(tableName, whereSql, params) {
  const [[row]] = await db.query(
    `SELECT COUNT(*) AS total FROM ${quoteIdentifier(tableName)} WHERE ${whereSql}`,
    params,
  );
  return Number(row?.total || 0);
}

async function sampleMatchingIds(tableName, idColumn, whereSql, params, limit = 10) {
  const [rows] = await db.query(
    `SELECT ${quoteIdentifier(idColumn)} AS id
       FROM ${quoteIdentifier(tableName)}
      WHERE ${whereSql}
      ORDER BY ${quoteIdentifier(idColumn)}
      LIMIT ?`,
    [...params, Math.max(1, Math.min(50, Number(limit) || 10))],
  );
  return rows.map((row) => row.id);
}

async function deleteIds(tableName, idColumn, ids) {
  if (!Array.isArray(ids) || ids.length === 0) return 0;
  const placeholders = ids.map(() => '?').join(', ');
  const [result] = await db.query(
    `DELETE FROM ${quoteIdentifier(tableName)}
      WHERE ${quoteIdentifier(idColumn)} IN (${placeholders})`,
    ids,
  );
  return Number(result?.affectedRows || 0);
}

async function createRun(payload) {
  const [result] = await db.query(
    `INSERT INTO data_cleanup_runs
      (run_type, status, triggered_by, preview_run_id, backup_job_id, policy_keys, request_snapshot, started_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
    [
      payload.runType || 'manual',
      payload.status || 'running',
      payload.triggeredBy || null,
      payload.previewRunId || null,
      payload.backupJobId || null,
      toJson(payload.policyKeys || []),
      toJson(payload.requestSnapshot || null),
    ],
  );
  return Number(result.insertId);
}

async function updateRun(id, fields) {
  const sets = [];
  const params = [];
  const scalar = [
    'status',
    'total_matched',
    'total_deleted',
    'total_failed',
    'error_message',
    'cancel_requested',
    'backup_job_id',
  ];
  for (const key of scalar) {
    if (fields[key] === undefined) continue;
    sets.push(`${key} = ?`);
    params.push(fields[key]);
  }
  if (fields.policy_keys !== undefined) {
    sets.push('policy_keys = ?');
    params.push(toJson(fields.policy_keys));
  }
  if (fields.finished_at === true) {
    sets.push('finished_at = NOW()');
    sets.push('duration_ms = TIMESTAMPDIFF(MICROSECOND, started_at, NOW()) / 1000');
  }
  if (!sets.length) return;
  params.push(id);
  await db.query(`UPDATE data_cleanup_runs SET ${sets.join(', ')} WHERE id = ?`, params);
}

async function consumePreviewRun(id) {
  const [result] = await db.query(
    `UPDATE data_cleanup_runs
        SET preview_consumed_at = NOW()
      WHERE id = ?
        AND run_type = 'preview'
        AND preview_consumed_at IS NULL`,
    [id],
  );
  return Number(result?.affectedRows || 0) === 1;
}

async function insertStep(payload) {
  const [result] = await db.query(
    `INSERT INTO data_cleanup_run_steps
      (run_id, policy_key, table_name, status, cutoff_at, matched_count,
       deleted_count, batch_size, batch_count, sample_ids, error_message, started_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
    [
      payload.runId,
      payload.policyKey,
      payload.tableName || '',
      payload.status || 'running',
      payload.cutoffAt || null,
      payload.matchedCount || 0,
      payload.deletedCount || 0,
      payload.batchSize || 1000,
      payload.batchCount || 0,
      toJson(payload.sampleIds || []),
      payload.errorMessage || null,
    ],
  );
  return Number(result.insertId);
}

async function updateStep(id, fields) {
  const sets = [];
  const params = [];
  const allowed = [
    'status',
    'matched_count',
    'deleted_count',
    'batch_size',
    'batch_count',
    'error_message',
  ];
  for (const key of allowed) {
    if (fields[key] === undefined) continue;
    sets.push(`${key} = ?`);
    params.push(fields[key]);
  }
  if (fields.sample_ids !== undefined) {
    sets.push('sample_ids = ?');
    params.push(toJson(fields.sample_ids || []));
  }
  if (fields.finished_at === true) {
    sets.push('finished_at = NOW()');
    sets.push('duration_ms = TIMESTAMPDIFF(MICROSECOND, started_at, NOW()) / 1000');
  }
  if (!sets.length) return;
  params.push(id);
  await db.query(`UPDATE data_cleanup_run_steps SET ${sets.join(', ')} WHERE id = ?`, params);
}

async function getRunById(id) {
  const [[row]] = await db.query(
    `SELECT r.*, b.status AS backup_status, b.error_message AS backup_error_message
       FROM data_cleanup_runs r
       LEFT JOIN backup_jobs b ON b.id = r.backup_job_id
      WHERE r.id = ?`,
    [id],
  );
  return mapRun(row);
}

async function getRunWithSteps(id) {
  const run = await getRunById(id);
  if (!run) return null;
  const [steps] = await db.query(
    `SELECT * FROM data_cleanup_run_steps WHERE run_id = ? ORDER BY id`,
    [id],
  );
  return { ...run, steps: steps.map(mapStep) };
}

async function listRuns(query = {}) {
  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));
  const offset = (page - 1) * pageSize;
  let where = 'WHERE 1=1';
  const params = [];
  if (query.status) {
    where += ' AND status = ?';
    params.push(query.status);
  }
  if (query.runType) {
    where += ' AND run_type = ?';
    params.push(query.runType);
  }
  if (query.excludeRunType) {
    where += ' AND run_type <> ?';
    params.push(query.excludeRunType);
  }
  if (query.policyKey) {
    where += ' AND JSON_CONTAINS(policy_keys, JSON_QUOTE(?))';
    params.push(query.policyKey);
  }
  const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM data_cleanup_runs ${where}`, params);
  const [rows] = await db.query(
    `SELECT r.*, b.status AS backup_status, b.error_message AS backup_error_message
       FROM data_cleanup_runs r
       LEFT JOIN backup_jobs b ON b.id = r.backup_job_id
      ${where.replace(/\bstatus\b/g, 'r.status').replace(/\brun_type\b/g, 'r.run_type').replace(/\bpolicy_keys\b/g, 'r.policy_keys')}
      ORDER BY r.started_at DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, offset],
  );
  return {
    list: rows.map(mapRun),
    total: Number(total || 0),
    page,
    pageSize,
    totalPages: Number(total || 0) ? Math.ceil(Number(total || 0) / pageSize) : 0,
  };
}

async function findRunningRun() {
  const [[row]] = await db.query(
    `SELECT r.*, b.status AS backup_status, b.error_message AS backup_error_message
       FROM data_cleanup_runs r
       LEFT JOIN backup_jobs b ON b.id = r.backup_job_id
      WHERE r.status = 'running' AND r.run_type IN ('manual','scheduled')
      ORDER BY r.started_at DESC LIMIT 1`,
  );
  return mapRun(row);
}

async function getLatestPreCleanupBackup() {
  const [[row]] = await db.query(
    `SELECT * FROM backup_jobs
      WHERE job_type = 'pre_cleanup'
      ORDER BY created_at DESC
      LIMIT 1`,
  );
  return row || null;
}

async function columnExists(tableName, columnName) {
  const [[row]] = await db.query(
    `SELECT COUNT(*) AS c
       FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND COLUMN_NAME = ?`,
    [tableName, columnName],
  );
  return Number(row?.c || 0) > 0;
}

async function listUploadReferenceValues(sources) {
  const values = [];
  for (const source of sources || []) {
    if (!(await tableExists(source.table)) || !(await columnExists(source.table, source.column))) continue;
    const [rows] = await db.query(
      `SELECT ${quoteIdentifier(source.column)} AS value
         FROM ${quoteIdentifier(source.table)}
        WHERE ${quoteIdentifier(source.column)} IS NOT NULL
          AND ${quoteIdentifier(source.column)} <> ''
          AND ${quoteIdentifier(source.column)} LIKE '%uploads%'`,
    );
    for (const row of rows) values.push(row.value);
  }
  return values;
}

async function clearFileCandidates(previewRunId, policyKey) {
  await db.query(
    `DELETE FROM data_cleanup_file_candidates
      WHERE preview_run_id = ? AND policy_key = ?`,
    [previewRunId, policyKey],
  );
}

async function insertFileCandidates(candidates) {
  for (const item of candidates || []) {
    await db.query(
      `INSERT INTO data_cleanup_file_candidates
        (preview_run_id, policy_key, storage_provider, object_key, local_path, public_url,
         size_bytes, last_modified_at, status, error_message)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         public_url = VALUES(public_url),
         size_bytes = VALUES(size_bytes),
         last_modified_at = VALUES(last_modified_at),
         status = VALUES(status),
         error_message = VALUES(error_message)`,
      [
        item.previewRunId,
        item.policyKey,
        item.storageProvider,
        item.objectKey || '',
        item.localPath || '',
        item.publicUrl || '',
        item.sizeBytes || 0,
        item.lastModifiedAt || null,
        item.status || 'candidate',
        item.errorMessage || null,
      ],
    );
  }
}

async function listFileCandidates(previewRunId, policyKey, statuses = ['candidate']) {
  const safeStatuses = Array.isArray(statuses) && statuses.length ? statuses : ['candidate'];
  const placeholders = safeStatuses.map(() => '?').join(', ');
  const [rows] = await db.query(
    `SELECT * FROM data_cleanup_file_candidates
      WHERE preview_run_id = ?
        AND policy_key = ?
        AND status IN (${placeholders})
      ORDER BY COALESCE(last_modified_at, created_at), id`,
    [previewRunId, policyKey, ...safeStatuses],
  );
  return rows.map((row) => ({
    ...row,
    id: Number(row.id),
    preview_run_id: Number(row.preview_run_id),
    size_bytes: Number(row.size_bytes || 0),
  }));
}

async function updateFileCandidate(id, fields = {}) {
  const sets = [];
  const params = [];
  if (fields.status !== undefined) {
    sets.push('status = ?');
    params.push(fields.status);
  }
  if (fields.errorMessage !== undefined) {
    sets.push('error_message = ?');
    params.push(fields.errorMessage || null);
  }
  if (!sets.length) return;
  params.push(id);
  await db.query(`UPDATE data_cleanup_file_candidates SET ${sets.join(', ')} WHERE id = ?`, params);
}

async function requestCancel(id) {
  const [result] = await db.query(
    `UPDATE data_cleanup_runs
        SET cancel_requested = 1
      WHERE id = ? AND status = 'running'`,
    [id],
  );
  return Number(result?.affectedRows || 0) === 1;
}

async function isRunCancelRequested(id) {
  const [[row]] = await db.query(
    `SELECT cancel_requested FROM data_cleanup_runs WHERE id = ?`,
    [id],
  );
  return Boolean(row?.cancel_requested);
}

async function tryAcquireLock(lockName, ownerId, ttlSeconds = 3600) {
  await db.query(
    `INSERT INTO data_cleanup_locks (lock_name, owner_id, acquired_at, expires_at)
     VALUES (?, ?, NOW(), DATE_ADD(NOW(), INTERVAL ? SECOND))
     ON DUPLICATE KEY UPDATE
       owner_id = IF(expires_at < NOW(), VALUES(owner_id), owner_id),
       acquired_at = IF(expires_at < NOW(), NOW(), acquired_at),
       expires_at = IF(expires_at < NOW(), VALUES(expires_at), expires_at)`,
    [lockName, ownerId, ttlSeconds],
  );
  const [[row]] = await db.query(
    `SELECT owner_id FROM data_cleanup_locks WHERE lock_name = ?`,
    [lockName],
  );
  return row?.owner_id === ownerId;
}

async function releaseLock(lockName, ownerId) {
  await db.query(
    `DELETE FROM data_cleanup_locks WHERE lock_name = ? AND owner_id = ?`,
    [lockName, ownerId],
  );
}

module.exports = {
  db,
  toJson,
  parseJson,
  tableExists,
  upsertDefaultPolicy,
  listPolicies,
  getPolicy,
  updatePolicy,
  resetPolicyToDefault,
  countMatchingRows,
  sampleMatchingIds,
  deleteIds,
  createRun,
  updateRun,
  consumePreviewRun,
  insertStep,
  updateStep,
  getRunById,
  getRunWithSteps,
  listRuns,
  findRunningRun,
  requestCancel,
  isRunCancelRequested,
  tryAcquireLock,
  releaseLock,
  getLatestPreCleanupBackup,
  columnExists,
  listUploadReferenceValues,
  clearFileCandidates,
  insertFileCandidates,
  listFileCandidates,
  updateFileCandidate,
};

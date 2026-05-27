const db = require('../../../config/db');

function parseJson(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function mapJob(row) {
  if (!row) return null;
  return { ...row, metadata: parseJson(row.metadata) };
}

function mapRestoreJob(row) {
  if (!row) return null;
  return {
    ...row,
    validation_result: parseJson(row.validation_result),
    diff_summary: parseJson(row.diff_summary),
  };
}

function mapDrill(row) {
  if (!row) return null;
  return {
    ...row,
    table_counts: parseJson(row.table_counts),
    report_json: parseJson(row.report_json),
  };
}

async function insertBackupJob(job) {
  await db.query(
    `INSERT INTO backup_jobs
      (id, job_type, status, trigger_source, triggered_by, reason, started_at, metadata)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      job.id,
      job.jobType,
      job.status || 'queued',
      job.triggerSource || 'system',
      job.triggeredBy || null,
      job.reason || '',
      job.startedAt || null,
      job.metadata ? JSON.stringify(job.metadata) : null,
    ],
  );
}

async function updateBackupJob(id, fields = {}) {
  const sets = [];
  const values = [];
  const map = {
    status: 'status',
    startedAt: 'started_at',
    finishedAt: 'finished_at',
    errorMessage: 'error_message',
    metadata: 'metadata',
  };
  for (const [key, col] of Object.entries(map)) {
    if (fields[key] === undefined) continue;
    sets.push(`${col} = ?`);
    values.push(key === 'metadata' ? JSON.stringify(fields[key]) : fields[key]);
  }
  if (!sets.length) return;
  values.push(id);
  await db.query(`UPDATE backup_jobs SET ${sets.join(', ')} WHERE id = ?`, values);
}

async function insertBackupFile(file) {
  await db.query(
    `INSERT INTO backup_files
      (id, backup_job_id, file_kind, storage_provider, bucket, storage_key, local_path, size_bytes,
       sha256, encrypted, encryption_key_id, compression, binlog_file, binlog_position, gtid_set,
       recoverable_at, retention_tier, object_lock_until, verified_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      file.id,
      file.backupJobId,
      file.fileKind,
      file.storageProvider || 's3',
      file.bucket || '',
      file.storageKey,
      file.localPath || '',
      file.sizeBytes || 0,
      file.sha256 || '',
      file.encrypted === false ? 0 : 1,
      file.encryptionKeyId || '',
      file.compression || 'gzip',
      file.binlogFile || null,
      file.binlogPosition || null,
      file.gtidSet || null,
      file.recoverableAt || null,
      file.retentionTier || 'short',
      file.objectLockUntil || null,
      file.verifiedAt || null,
    ],
  );
}

async function insertBinlogFile(file) {
  await db.query(
    `INSERT INTO binlog_files
      (id, file_name, storage_provider, bucket, storage_key, size_bytes, sha256,
       first_event_at, last_event_at, uploaded_at, upload_status, error_message)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       size_bytes = VALUES(size_bytes),
       sha256 = VALUES(sha256),
       last_event_at = VALUES(last_event_at),
       uploaded_at = VALUES(uploaded_at),
       upload_status = VALUES(upload_status),
       error_message = VALUES(error_message)`,
    [
      file.id,
      file.fileName,
      file.storageProvider || 's3',
      file.bucket || '',
      file.storageKey,
      file.sizeBytes || 0,
      file.sha256 || '',
      file.firstEventAt || null,
      file.lastEventAt || null,
      file.uploadedAt || new Date(),
      file.uploadStatus || 'success',
      file.errorMessage || '',
    ],
  );
}

async function listBackupFiles({ page, pageSize, kind, status }) {
  let where = 'WHERE 1=1';
  const params = [];
  if (kind) {
    where += ' AND f.file_kind = ?';
    params.push(kind);
  }
  if (status) {
    where += ' AND j.status = ?';
    params.push(status);
  }
  const [[countRow]] = await db.query(
    `SELECT COUNT(*) AS total FROM backup_files f JOIN backup_jobs j ON j.id = f.backup_job_id ${where}`,
    params,
  );
  const offset = (page - 1) * pageSize;
  const [rows] = await db.query(
    `SELECT f.*, j.job_type, j.status AS job_status, j.trigger_source, j.reason
       FROM backup_files f
       JOIN backup_jobs j ON j.id = f.backup_job_id
      ${where}
      ORDER BY f.created_at DESC
      LIMIT ? OFFSET ?`,
    [...params, pageSize, offset],
  );
  return { list: rows, total: Number(countRow?.total || 0) };
}

async function listRestoreJobs({ page, pageSize }) {
  const [[countRow]] = await db.query(`SELECT COUNT(*) AS total FROM restore_jobs`);
  const offset = (page - 1) * pageSize;
  const [rows] = await db.query(
    `SELECT * FROM restore_jobs ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [pageSize, offset],
  );
  return { list: rows.map(mapRestoreJob), total: Number(countRow?.total || 0) };
}

async function insertRestoreJob(job) {
  await db.query(
    `INSERT INTO restore_jobs
      (id, restore_type, status, source_backup_file_id, target_time, target_table, target_entity_id,
       temp_db_name, requested_by, validation_result, diff_summary)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      job.id,
      job.restoreType,
      job.status || 'queued',
      job.sourceBackupFileId || null,
      job.targetTime || null,
      job.targetTable || null,
      job.targetEntityId || null,
      job.tempDbName || '',
      job.requestedBy || null,
      job.validationResult ? JSON.stringify(job.validationResult) : null,
      job.diffSummary ? JSON.stringify(job.diffSummary) : null,
    ],
  );
}

async function claimRestoreJobForSwitch(id) {
  const [res] = await db.query(
    `UPDATE restore_jobs
        SET status = 'merged', error_message = '', started_at = COALESCE(started_at, NOW())
      WHERE id = ? AND status = 'approved'`,
    [id],
  );
  return res.affectedRows || 0;
}

async function approveRestoreJob(id, adminUserId) {
  const [res] = await db.query(
    `UPDATE restore_jobs
        SET status = 'approved', approved_by = ?, mfa_verified_at = NOW()
      WHERE id = ? AND status IN ('temp_restored','validated','awaiting_approval')`,
    [adminUserId, id],
  );
  return res.affectedRows || 0;
}

async function findRestoreJob(id) {
  const [[row]] = await db.query(`SELECT * FROM restore_jobs WHERE id = ? LIMIT 1`, [id]);
  return mapRestoreJob(row);
}

async function findBackupFile(id) {
  const [[row]] = await db.query(
    `SELECT f.*, j.status AS job_status, j.job_type
       FROM backup_files f
       JOIN backup_jobs j ON j.id = f.backup_job_id
      WHERE f.id = ?
      LIMIT 1`,
    [id],
  );
  return row || null;
}

async function findLatestFullBackupBefore(targetTime) {
  const params = [];
  let timeWhere = '';
  if (targetTime) {
    timeWhere = 'AND (f.recoverable_at IS NULL OR f.recoverable_at <= ?)';
    params.push(targetTime);
  }
  const [[row]] = await db.query(
    `SELECT f.*
       FROM backup_files f
       JOIN backup_jobs j ON j.id = f.backup_job_id
      WHERE f.file_kind = 'mysql_full'
        AND j.status = 'success'
        ${timeWhere}
      ORDER BY COALESCE(f.recoverable_at, f.created_at) DESC, f.created_at DESC
      LIMIT 1`,
    params,
  );
  return row || null;
}

async function listBinlogsForReplay(startAt, stopAt) {
  const params = [];
  let where = `WHERE upload_status = 'success'`;
  if (startAt) {
    where += ` AND (last_event_at IS NULL OR last_event_at >= ?)`;
    params.push(startAt);
  }
  if (stopAt) {
    where += ` AND (first_event_at IS NULL OR first_event_at <= ?)`;
    params.push(stopAt);
  }
  const [rows] = await db.query(
    `SELECT * FROM binlog_files ${where} ORDER BY file_name ASC, uploaded_at ASC`,
    params,
  );
  return rows;
}

async function updateRestoreJob(id, fields = {}) {
  const sets = [];
  const values = [];
  const map = {
    status: 'status',
    tempDbName: 'temp_db_name',
    validationResult: 'validation_result',
    diffSummary: 'diff_summary',
    errorMessage: 'error_message',
    startedAt: 'started_at',
    finishedAt: 'finished_at',
  };
  for (const [key, col] of Object.entries(map)) {
    if (fields[key] === undefined) continue;
    sets.push(`${col} = ?`);
    values.push(['validationResult', 'diffSummary'].includes(key) ? JSON.stringify(fields[key]) : fields[key]);
  }
  if (!sets.length) return;
  values.push(id);
  await db.query(`UPDATE restore_jobs SET ${sets.join(', ')} WHERE id = ?`, values);
}

async function insertRestoreDrillReport(report) {
  await db.query(
    `INSERT INTO restore_drill_reports
      (id, backup_file_id, restore_job_id, status, temp_db_name, table_counts, duration_seconds,
       report_json, error_message, started_at, finished_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      report.id,
      report.backupFileId || null,
      report.restoreJobId || null,
      report.status || 'running',
      report.tempDbName || '',
      report.tableCounts ? JSON.stringify(report.tableCounts) : null,
      report.durationSeconds || null,
      report.reportJson ? JSON.stringify(report.reportJson) : null,
      report.errorMessage || '',
      report.startedAt || null,
      report.finishedAt || null,
    ],
  );
}

async function listDrillReports({ limit }) {
  const [rows] = await db.query(
    `SELECT r.*
       FROM restore_drill_reports r
       JOIN restore_jobs j ON j.id = r.restore_job_id
      WHERE JSON_UNQUOTE(JSON_EXTRACT(j.validation_result, '$.drill')) = 'true'
      ORDER BY r.created_at DESC
      LIMIT ?`,
    [limit],
  );
  return rows.map(mapDrill);
}

async function listAlerts({ limit, status }) {
  let where = 'WHERE 1=1';
  const params = [];
  if (status) {
    where += ' AND status = ?';
    params.push(status);
  }
  const [rows] = await db.query(
    `SELECT * FROM backup_alerts ${where} ORDER BY created_at DESC LIMIT ?`,
    [...params, limit],
  );
  return rows;
}

async function insertAlert(alert) {
  await db.query(
    `INSERT INTO backup_alerts
      (id, alert_type, severity, status, title, message, related_job_id, related_file_id)
     VALUES (?, ?, ?, 'open', ?, ?, ?, ?)`,
    [
      alert.id,
      alert.alertType,
      alert.severity || 'P1',
      alert.title,
      alert.message || '',
      alert.relatedJobId || null,
      alert.relatedFileId || null,
    ],
  );
}

async function getOverviewRows() {
  const [[full]] = await db.query(
    `SELECT f.*, j.job_type, j.status AS job_status
       FROM backup_files f
       JOIN backup_jobs j ON j.id = f.backup_job_id
      WHERE f.file_kind = 'mysql_full' AND j.status = 'success'
      ORDER BY f.created_at DESC
      LIMIT 1`,
  );
  const [[binlog]] = await db.query(
    `SELECT * FROM binlog_files WHERE upload_status = 'success' ORDER BY uploaded_at DESC LIMIT 1`,
  );
  const [[latestRecoverable]] = await db.query(
    `SELECT MAX(recoverable_at) AS latest_recoverable_at FROM backup_files WHERE recoverable_at IS NOT NULL`,
  );
  const [[counts]] = await db.query(
    `SELECT
       SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) AS open_alerts,
       SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed_jobs
       FROM (
         SELECT status FROM backup_alerts
         UNION ALL
         SELECT status FROM backup_jobs WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
       ) x`,
  );
  return { full: full || null, binlog: binlog || null, latestRecoverable: latestRecoverable || {}, counts: counts || {} };
}

async function getRecentJobs(limit = 8) {
  const [rows] = await db.query(`SELECT * FROM backup_jobs ORDER BY created_at DESC LIMIT ?`, [limit]);
  return rows.map(mapJob);
}

module.exports = {
  insertBackupJob,
  updateBackupJob,
  insertBackupFile,
  insertBinlogFile,
  listBackupFiles,
  listRestoreJobs,
  insertRestoreJob,
  approveRestoreJob,
  claimRestoreJobForSwitch,
  findRestoreJob,
  findBackupFile,
  findLatestFullBackupBefore,
  listBinlogsForReplay,
  updateRestoreJob,
  insertRestoreDrillReport,
  listDrillReports,
  listAlerts,
  insertAlert,
  getOverviewRows,
  getRecentJobs,
};

const path = require('path');
const { spawn } = require('child_process');
const { BusinessError } = require('../../../errors');
const { generateId } = require('../../../utils/helpers');
const { writeAuditLog } = require('../../../utils/auditLog');
const repo = require('../repository/backup.repository');

const SERVER_ROOT = path.resolve(__dirname, '../../../..');

function pageParams(query = {}) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, Number.parseInt(query.pageSize, 10) || 20));
  return { page, pageSize };
}

function normalizeDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function runDetachedScript(scriptRelativePath, args = [], env = {}) {
  const child = spawn(process.execPath, [path.join(SERVER_ROOT, scriptRelativePath), ...args], {
    cwd: SERVER_ROOT,
    detached: true,
    stdio: 'ignore',
    env: { ...process.env, ...env },
  });
  child.unref();
}

function classifyBackupAlertReason(message = '') {
  const text = String(message || '').toLowerCase();
  if (/low disk space|enospc|no space|disk/i.test(text)) return 'disk_space';
  if (/eacces|permission|access denied|denied|read.*dir|mysql.*dir/i.test(text)) return 'permission';
  if (/s3|bucket|object storage|upload/i.test(text)) return 'object_storage';
  if (/no successful full backup|no full backup/i.test(text)) return 'missing_full_backup';
  return 'generic';
}

async function emitBackupAlert(alert) {
  const id = generateId();
  const reason = classifyBackupAlertReason(alert.message);
  await repo.insertAlert({ id, ...alert });
  try {
    await require('./adminEvent.service').emitEvent({
      eventType: `backup.${alert.alertType}`,
      category: 'backup',
      severity: alert.severity || 'P1',
      title: alert.title,
      message: alert.message || '',
      entityType: 'backup',
      entityId: `${alert.alertType}:${reason}`,
      fingerprint: {
        eventType: `backup.${alert.alertType}`,
        entityType: 'backup',
        entityId: `${alert.alertType}:${reason}`,
      },
      payload: { ...alert, reason },
      source: 'backup_center',
    }, { operatorType: 'system' });
  } catch (err) {
    console.warn('[backup] admin event emit failed:', err?.message || err);
  }
}

async function getOverview() {
  const [{ full, binlog, latestRecoverable, counts }, recentJobs, alerts, drills] = await Promise.all([
    repo.getOverviewRows(),
    repo.getRecentJobs(8),
    repo.listAlerts({ limit: 8, status: 'open' }),
    repo.listDrillReports({ limit: 5 }),
  ]);

  const latestBinlogAt = binlog?.last_event_at || binlog?.uploaded_at || null;
  const binlogDelayMs = latestBinlogAt ? Date.now() - new Date(latestBinlogAt).getTime() : null;
  const binlogHealthy = binlogDelayMs != null && binlogDelayMs <= 5 * 60 * 1000;
  return {
    latestFullBackupAt: full?.created_at || null,
    latestFullBackup: full || null,
    latestIncrementalBackupAt: latestBinlogAt,
    latestRecoverableAt: latestRecoverable.latest_recoverable_at || latestBinlogAt || full?.recoverable_at || null,
    binlogHealthy,
    binlogDelaySeconds: binlogDelayMs == null ? null : Math.max(0, Math.round(binlogDelayMs / 1000)),
    openAlertCount: Number(counts.open_alerts || 0),
    failedJobCount7d: Number(counts.failed_jobs || 0),
    recentJobs,
    recentAlerts: alerts,
    recentDrills: drills,
    safeguards: {
      pitrEnabled: Boolean(binlog),
      s3Required: true,
      objectLockRequired: true,
      destructiveDeleteDisabled: true,
      restoreRequiresTempDatabase: true,
      restoreRequiresMfa: true,
    },
  };
}

async function listBackupFiles(query = {}) {
  const { page, pageSize } = pageParams(query);
  const { list, total } = await repo.listBackupFiles({
    page,
    pageSize,
    kind: query.kind || '',
    status: query.status || '',
  });
  return { list, total, page, pageSize };
}

async function createFullBackup({ req, userId, reason = 'manual' }) {
  const id = generateId();
  await repo.insertBackupJob({
    id,
    jobType: 'full',
    status: 'queued',
    triggerSource: 'manual',
    triggeredBy: userId,
    reason,
    metadata: { requestedFrom: 'admin_backup_center' },
  });
  await writeAuditLog({
    req,
    operatorId: userId,
    actionType: 'backup.full.create',
    objectType: 'backup_job',
    objectId: id,
    summary: 'manual full backup requested',
    result: 'success',
    after: { reason },
  });
  runDetachedScript('scripts/backup/backup-full.js', ['--job-id', id], { BACKUP_JOB_ID: id });
  return { id, status: 'queued' };
}

async function createRestoreJob({ req, userId, body }) {
  const restoreType = String(body?.restoreType || body?.restore_type || '').trim();
  const allowed = new Set(['site', 'point_in_time', 'table', 'order', 'user', 'pre_deploy_rollback']);
  if (!allowed.has(restoreType)) {
    throw new BusinessError(400, 'Invalid restore type');
  }
  const id = generateId();
  const tempDbName = `restore_tmp_${id.replace(/-/g, '').slice(0, 16)}`;
  const targetTime = normalizeDate(body?.targetTime || body?.target_time);
  await repo.insertRestoreJob({
    id,
    restoreType,
    status: 'queued',
    sourceBackupFileId: body?.sourceBackupFileId || body?.source_backup_file_id || null,
    targetTime,
    targetTable: body?.targetTable || body?.target_table || null,
    targetEntityId: body?.targetEntityId || body?.target_entity_id || null,
    tempDbName,
    requestedBy: userId,
    validationResult: {
      pending: true,
      note: 'Restore jobs are staged into a temporary database before any production switch or merge.',
    },
  });
  await writeAuditLog({
    req,
    operatorId: userId,
    actionType: 'backup.restore.request',
    objectType: 'restore_job',
    objectId: id,
    summary: `restore job requested: ${restoreType}`,
    result: 'success',
    after: { restoreType, tempDbName, targetTime },
  });
  runDetachedScript('scripts/backup/restore-to-temp.js', ['--restore-job-id', id], { RESTORE_JOB_ID: id });
  return await repo.findRestoreJob(id);
}

async function approveRestoreJob({ req, userId, restoreJobId }) {
  if (!req.user?.isSuperAdmin) {
    throw new BusinessError(403, 'Only super admin can approve restore');
  }
  const affected = await repo.approveRestoreJob(restoreJobId, userId);
  const job = await repo.findRestoreJob(restoreJobId);
  if (!affected || !job) {
    throw new BusinessError(404, 'Restore job not found or cannot be approved');
  }
  await writeAuditLog({
    req,
    operatorId: userId,
    actionType: 'backup.restore.approve',
    objectType: 'restore_job',
    objectId: restoreJobId,
    summary: 'restore job approved after MFA',
    result: 'success',
    after: { status: job.status, tempDbName: job.temp_db_name },
  });
  return job;
}

async function listRestoreJobs(query = {}) {
  const { page, pageSize } = pageParams(query);
  const { list, total } = await repo.listRestoreJobs({ page, pageSize });
  return { list, total, page, pageSize };
}

async function listDrillReports(query = {}) {
  const limit = Math.min(50, Math.max(1, Number.parseInt(query.limit, 10) || 20));
  return repo.listDrillReports({ limit });
}

async function listAlerts(query = {}) {
  const limit = Math.min(100, Math.max(1, Number.parseInt(query.limit, 10) || 20));
  return repo.listAlerts({ limit, status: query.status || '' });
}

module.exports = {
  emitBackupAlert,
  getOverview,
  listBackupFiles,
  createFullBackup,
  createRestoreJob,
  approveRestoreJob,
  listRestoreJobs,
  listDrillReports,
  listAlerts,
};

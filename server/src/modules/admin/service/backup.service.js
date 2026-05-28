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

function cleanOptionalText(value, maxLength = 255) {
  const text = String(value || '').trim();
  if (!text) return null;
  return text.slice(0, maxLength);
}

const IMPLEMENTED_RESTORE_TYPES = new Set(['site', 'point_in_time']);

function assertRestorePayload({ restoreType, targetTimeRaw, targetTime, targetTable, targetEntityId }) {
  if (!IMPLEMENTED_RESTORE_TYPES.has(restoreType)) {
    throw new BusinessError(400, '该恢复类型尚未实现，当前仅支持整站恢复与指定时间点恢复');
  }
  if (targetTimeRaw && !targetTime) {
    throw new BusinessError(400, '指定时间点格式不正确');
  }
  if (restoreType === 'point_in_time' && !targetTime) {
    throw new BusinessError(400, '请填写指定时间点');
  }
  if (restoreType === 'table') {
    if (!targetTable) throw new BusinessError(400, '请填写表名');
    if (!/^[A-Za-z0-9_]{1,128}$/.test(targetTable)) {
      throw new BusinessError(400, '表名只能包含字母、数字和下划线');
    }
  }
  if ((restoreType === 'order' || restoreType === 'user') && !targetEntityId) {
    throw new BusinessError(400, '请填写订单 / 用户编号');
  }
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
    throw new BusinessError(400, '恢复类型无效');
  }
  const targetTimeRaw = body?.targetTime || body?.target_time || '';
  const targetTime = normalizeDate(targetTimeRaw);
  const targetTable = cleanOptionalText(body?.targetTable || body?.target_table, 128);
  const targetEntityId = cleanOptionalText(body?.targetEntityId || body?.target_entity_id, 64);
  const sourceBackupFileId = cleanOptionalText(body?.sourceBackupFileId || body?.source_backup_file_id, 36);
  assertRestorePayload({ restoreType, targetTimeRaw, targetTime, targetTable, targetEntityId });

  const sourceFile = sourceBackupFileId
    ? await repo.findBackupFile(sourceBackupFileId)
    : await repo.findLatestFullBackupBefore(targetTime || new Date());
  if (!sourceFile) {
    throw new BusinessError(400, '暂无可用的成功全量备份，无法创建恢复任务');
  }
  if (sourceFile.file_kind !== 'mysql_full' || (sourceFile.job_status && sourceFile.job_status !== 'success')) {
    throw new BusinessError(400, '请选择成功的数据库全量备份文件');
  }

  const id = generateId();
  const tempDbName = `restore_tmp_${id.replace(/-/g, '').slice(0, 16)}`;
  await repo.insertRestoreJob({
    id,
    restoreType,
    status: 'queued',
    sourceBackupFileId: sourceBackupFileId || sourceFile.id,
    targetTime,
    targetTable,
    targetEntityId,
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
    throw new BusinessError(403, '仅超级管理员可确认恢复任务');
  }
  const existing = await repo.findRestoreJob(restoreJobId);
  if (!existing) {
    throw new BusinessError(404, '恢复任务不存在');
  }
  const approvableStatuses = new Set(['temp_restored', 'validated', 'awaiting_approval']);
  if (!approvableStatuses.has(existing.status)) {
    throw new BusinessError(400, '恢复任务尚未完成校验，暂不可确认');
  }
  const affected = await repo.approveRestoreJob(restoreJobId, userId);
  const job = await repo.findRestoreJob(restoreJobId);
  if (!affected || !job) {
    throw new BusinessError(404, '恢复任务不存在或无法确认');
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

async function switchRestoreJobToProduction({ req, userId, restoreJobId }) {
  if (!req.user?.isSuperAdmin) {
    throw new BusinessError(403, '仅超级管理员可执行生产切换');
  }
  if (process.env.RESTORE_SWITCH_ENABLED !== '1') {
    throw new BusinessError(400, '生产切换未启用，请先在服务器设置 RESTORE_SWITCH_ENABLED=1');
  }
  if (
    process.env.NODE_ENV === 'production'
    && process.env.RESTORE_SWITCH_ACK_DESTRUCTIVE !== '1'
  ) {
    throw new BusinessError(400, '生产切换缺少维护窗口确认，请设置 RESTORE_SWITCH_ACK_DESTRUCTIVE=1');
  }

  const existing = await repo.findRestoreJob(restoreJobId);
  if (!existing) {
    throw new BusinessError(404, '恢复任务不存在');
  }
  if (existing.status !== 'approved') {
    throw new BusinessError(400, '仅已确认的恢复任务可执行生产切换');
  }
  if (!['site', 'point_in_time'].includes(existing.restore_type)) {
    throw new BusinessError(400, '当前恢复类型不支持生产切换');
  }

  runDetachedScript(
    'scripts/backup/restore-switch-production.js',
    ['--restore-job-id', restoreJobId],
    { RESTORE_JOB_ID: restoreJobId },
  );

  await writeAuditLog({
    req,
    operatorId: userId,
    actionType: 'backup.restore.switch',
    objectType: 'restore_job',
    objectId: restoreJobId,
    summary: 'production database switch requested',
    result: 'success',
    after: { tempDbName: existing.temp_db_name, restoreType: existing.restore_type },
  });

  return {
    id: restoreJobId,
    status: 'merged',
    message: '已启动生产切换任务，请稍后刷新查看结果',
  };
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
  switchRestoreJobToProduction,
  listRestoreJobs,
  listDrillReports,
  listAlerts,
};

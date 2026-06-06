const path = require('path');
const fs = require('fs');
const fsp = require('fs/promises');
const { spawn } = require('child_process');
const { BusinessError } = require('../../../errors');
const { generateId } = require('../../../utils/helpers');
const { writeAuditLog } = require('../../../utils/auditLog');
const { getStorageHealthReport } = require('../../../utils/objectStorage');
const repo = require('../repository/backup.repository');

const SERVER_ROOT = path.resolve(__dirname, '../../../..');

function getBackupDir(...parts) {
  return path.join(process.env.BACKUP_LOCAL_DIR || path.join(SERVER_ROOT, 'backups'), ...parts);
}

async function ensureDir(dir) {
  await fsp.mkdir(dir, { recursive: true });
}

function defaultMinFreeBytes(extraBytes = 0) {
  const configured = Number(process.env.BACKUP_MIN_FREE_BYTES || 0);
  if (configured > 0) return configured + Number(extraBytes || 0);
  return 1024 * 1024 * 1024 + Number(extraBytes || 0);
}

async function findExistingParent(dirPath) {
  let current = path.resolve(dirPath);
  while (current && current !== path.dirname(current)) {
    try {
      const stat = await fsp.stat(current);
      if (stat.isDirectory()) return current;
    } catch {
      current = path.dirname(current);
    }
  }
  return current || path.parse(path.resolve(dirPath)).root;
}

async function getAvailableBytes(dirPath) {
  if (typeof fsp.statfs !== 'function') return null;
  const target = await findExistingParent(dirPath);
  const stat = await fsp.statfs(target);
  return Number(stat.bavail) * Number(stat.bsize);
}

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
const RESTORE_SWITCH_PRODUCTION_ACKS = [
  {
    key: 'RESTORE_SWITCH_ACK_DESTRUCTIVE',
    message: '生产切换缺少维护窗口确认，请设置 RESTORE_SWITCH_ACK_DESTRUCTIVE=1',
    isSatisfied: () => process.env.RESTORE_SWITCH_ACK_DESTRUCTIVE === '1',
  },
  {
    key: 'RESTORE_SWITCH_TRAFFIC_FROZEN',
    message: '生产切换前必须确认已冻结业务写入，请设置 RESTORE_SWITCH_TRAFFIC_FROZEN=1',
    isSatisfied: () => process.env.RESTORE_SWITCH_TRAFFIC_FROZEN === '1',
  },
  {
    key: 'RESTORE_SWITCH_PRE_BACKUP_DONE',
    message: '生产切换前必须确认已完成切换前备份，请设置 RESTORE_SWITCH_PRE_BACKUP_DONE=1；如需紧急跳过，需同时设置 RESTORE_SWITCH_SKIP_PRE_BACKUP=1 和 RESTORE_SWITCH_ACK_SKIP_PRE_BACKUP=1',
    isSatisfied: () => process.env.RESTORE_SWITCH_PRE_BACKUP_DONE === '1'
      || (process.env.RESTORE_SWITCH_SKIP_PRE_BACKUP === '1' && process.env.RESTORE_SWITCH_ACK_SKIP_PRE_BACKUP === '1'),
  },
];

function maskPath(value) {
  return value ? String(value) : '';
}

function makeCheck(key, label, status, message = '', meta = {}) {
  return { key, label, status, message, ...meta };
}

async function pathReadable(targetPath) {
  if (!targetPath) return false;
  try {
    await fsp.access(targetPath, fs.constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

async function pathWritable(targetPath) {
  if (!targetPath) return false;
  try {
    await ensureDir(targetPath);
    await fsp.access(targetPath, fs.constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

async function binaryCheck(envName, fallback, label) {
  const configured = String(process.env[envName] || '').trim();
  const command = configured || fallback;
  const looksLikePath = path.isAbsolute(command) || /[\\/]/.test(command);
  if (!looksLikePath) {
    return makeCheck(envName, label, 'warn', `${command} 将从 PATH 查找，当前未做实际执行校验`, { command });
  }
  const ok = await pathReadable(command);
  return ok
    ? makeCheck(envName, label, 'ok', '已配置且可读取', { command: maskPath(command) })
    : makeCheck(envName, label, 'fail', '已配置但文件不可读或不存在', { command: maskPath(command) });
}

async function getBackupHealth() {
  const checks = [];
  const backupDir = getBackupDir();
  const backupDirWritable = await pathWritable(backupDir);
  checks.push(backupDirWritable
    ? makeCheck('BACKUP_LOCAL_DIR', '本地备份目录', 'ok', '可写', { path: backupDir })
    : makeCheck('BACKUP_LOCAL_DIR', '本地备份目录', 'fail', '不可写', { path: backupDir }));

  const minFreeBytes = defaultMinFreeBytes(1024 * 1024 * 1024);
  const availableBytes = await getAvailableBytes(backupDir).catch(() => null);
  if (availableBytes == null) {
    checks.push(makeCheck('BACKUP_MIN_FREE_BYTES', '磁盘剩余空间', 'warn', '当前 Node 版本无法读取磁盘空间', { requiredBytes: minFreeBytes }));
  } else if (availableBytes >= minFreeBytes) {
    checks.push(makeCheck('BACKUP_MIN_FREE_BYTES', '磁盘剩余空间', 'ok', '空间足够', { availableBytes, requiredBytes: minFreeBytes }));
  } else {
    checks.push(makeCheck('BACKUP_MIN_FREE_BYTES', '磁盘剩余空间', 'fail', '空间不足', { availableBytes, requiredBytes: minFreeBytes }));
  }

  const encryptionKey = String(process.env.BACKUP_ENCRYPTION_KEY || '').trim();
  checks.push(encryptionKey
    ? makeCheck('BACKUP_ENCRYPTION_KEY', '备份加密密钥', 'ok', '已配置')
    : makeCheck('BACKUP_ENCRYPTION_KEY', '备份加密密钥', process.env.NODE_ENV === 'production' ? 'fail' : 'warn', '未配置，非生产环境会使用本地兜底密钥'));

  checks.push(String(process.env.DB_NAME || '').trim()
    ? makeCheck('DB_NAME', '数据库名称', 'ok', '已配置')
    : makeCheck('DB_NAME', '数据库名称', 'fail', '未配置，无法确认要备份哪个数据库'));

  const backupBucket = String(process.env.BACKUP_S3_BUCKET || '').trim();
  const allowLocalOnly = process.env.BACKUP_ALLOW_LOCAL_ONLY === '1';
  if (backupBucket) {
    checks.push(makeCheck('BACKUP_S3_BUCKET', '备份对象存储', 'ok', '已配置云端备份桶', { bucket: backupBucket }));
  } else if (allowLocalOnly) {
    checks.push(makeCheck('BACKUP_S3_BUCKET', '备份对象存储', 'warn', '当前允许本地备份，线上不建议长期这样运行'));
  } else {
    checks.push(makeCheck('BACKUP_S3_BUCKET', '备份对象存储', 'fail', '未配置云端备份桶，也未允许本地备份'));
  }

  const storage = getStorageHealthReport();
  checks.push(storage.healthy
    ? makeCheck('STORAGE_DRIVER', '业务文件存储', storage.mode === 's3' ? 'ok' : 'warn', storage.mode === 's3' ? '对象存储可用' : '未启用对象存储，业务上传会落到本地或数据库', { storage })
    : makeCheck('STORAGE_DRIVER', '业务文件存储', 'fail', `对象存储配置不完整：${(storage.missing || []).join(', ')}`, { storage }));

  checks.push(await binaryCheck('MYSQLDUMP_BIN', 'mysqldump', 'mysqldump'));
  checks.push(await binaryCheck('MYSQL_BIN', 'mysql', 'mysql 客户端'));
  checks.push(await binaryCheck('MYSQLBINLOG_BIN', 'mysqlbinlog', 'mysqlbinlog'));

  const binlogDir = String(process.env.MYSQL_BINLOG_DIR || '').trim();
  const binlogReadable = await pathReadable(binlogDir);
  if (!binlogDir) {
    checks.push(makeCheck('MYSQL_BINLOG_DIR', 'MySQL 增量日志目录', 'fail', '未配置，增量备份和指定时间点恢复不可用'));
  } else if (binlogReadable) {
    checks.push(makeCheck('MYSQL_BINLOG_DIR', 'MySQL 增量日志目录', 'ok', '可读取', { path: binlogDir }));
  } else {
    checks.push(makeCheck('MYSQL_BINLOG_DIR', 'MySQL 增量日志目录', 'fail', '目录不存在或不可读', { path: binlogDir }));
  }

  const failed = (key) => checks.some((item) => item.key === key && item.status === 'fail');
  const hasFatal = checks.some((item) => item.status === 'fail');
  const canRunFullBackup = backupDirWritable
    && !failed('BACKUP_ENCRYPTION_KEY')
    && !failed('BACKUP_S3_BUCKET')
    && !failed('MYSQLDUMP_BIN')
    && Boolean(process.env.DB_NAME);
  const canRunIncrementalBackup = canRunFullBackup && binlogReadable && !failed('MYSQLBINLOG_BIN');
  const canRunPointInTimeRestore = canRunIncrementalBackup && !failed('MYSQL_BIN');
  const canUseCloudBackup = Boolean(backupBucket);

  return {
    healthy: !hasFatal,
    canRunFullBackup,
    canRunIncrementalBackup,
    canRunPointInTimeRestore,
    canUseCloudBackup,
    localOnly: allowLocalOnly && !backupBucket,
    checkedAt: new Date().toISOString(),
    checks,
  };
}

function assertRestorePayload({ restoreType, targetTimeRaw, targetTime, targetTable, targetEntityId }) {
  if (!IMPLEMENTED_RESTORE_TYPES.has(restoreType)) {
    throw new BusinessError(400, '该恢复类型尚未实现，当前仅支持数据库整库恢复与指定时间点恢复');
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

function runScriptAndWait(scriptRelativePath, args = [], env = {}, timeoutMs = Number(process.env.BACKUP_WAIT_TIMEOUT_MS || 60 * 60 * 1000)) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(SERVER_ROOT, scriptRelativePath), ...args], {
      cwd: SERVER_ROOT,
      detached: false,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, ...env },
    });
    let stderr = '';
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      try { child.kill(); } catch { /* ignore */ }
      reject(new Error(`BACKUP_SCRIPT_TIMEOUT:${scriptRelativePath}`));
    }, Math.max(60_000, Number(timeoutMs) || 60 * 60 * 1000));

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
      if (stderr.length > 4000) stderr = stderr.slice(-4000);
    });
    child.stdout.on('data', () => {
      // Drain stdout so a verbose backup script cannot block on a full pipe.
    });
    child.on('error', (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(error);
    });
    child.on('close', (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (code === 0) {
        resolve({ code });
        return;
      }
      reject(new Error(`BACKUP_SCRIPT_FAILED:${code}:${stderr.slice(-1000)}`));
    });
  });
}

function assertProductionRestoreSwitchAcks() {
  if (process.env.NODE_ENV !== 'production') return;
  for (const ack of RESTORE_SWITCH_PRODUCTION_ACKS) {
    if (!ack.isSatisfied()) throw new BusinessError(400, ack.message);
  }
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

async function resolveBackupAlerts({ alertTypes = [], relatedJobId = null, relatedFileId = null, remark = 'backup check recovered' } = {}) {
  const types = Array.isArray(alertTypes) ? alertTypes.filter(Boolean) : [];
  if (!types.length) return { resolvedAlerts: 0, resolvedEvents: 0 };
  const resolvedAlerts = await repo.resolveAlerts({ alertTypes: types, relatedJobId, relatedFileId });
  let resolvedEvents = 0;
  try {
    const eventTypes = types.map((type) => `backup.${type}`);
    const adminEventRepo = require('../repository/adminEvent.repository');
    const adminEventService = require('./adminEvent.service');
    const records = await adminEventRepo.listActiveRecordsByTypes(eventTypes, 100);
    for (const record of records) {
      if (!record?.fingerprint) continue;
      const result = await adminEventService.autoResolveByFingerprint(record.fingerprint, {
        remark,
        metadata: { alertTypes: types, relatedJobId, relatedFileId },
      });
      if (result?.resolved) resolvedEvents += 1;
    }
  } catch (err) {
    console.warn('[backup] admin event auto resolve failed:', err?.message || err);
  }
  return { resolvedAlerts, resolvedEvents };
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

async function createPreCleanupBackup({ req, userId, reason = 'data_cleanup', metadata = {} }) {
  const id = generateId();
  await repo.insertBackupJob({
    id,
    jobType: 'pre_cleanup',
    status: 'queued',
    triggerSource: 'cleanup',
    triggeredBy: userId,
    reason,
    metadata: { requestedFrom: 'data_cleanup', ...metadata },
  });
  await writeAuditLog({
    req,
    operatorId: userId,
    actionType: 'backup.pre_cleanup.create',
    objectType: 'backup_job',
    objectId: id,
    summary: 'pre-cleanup full backup requested',
    result: 'success',
    after: { reason, ...metadata },
  });
  await runScriptAndWait('scripts/backup/backup-full.js', ['--job-id', id], {
    BACKUP_JOB_ID: id,
    BACKUP_KIND: 'pre_cleanup',
    BACKUP_TRIGGER_SOURCE: 'cleanup',
    BACKUP_REASON: reason,
  }, Number(process.env.DATA_CLEANUP_PRE_BACKUP_TIMEOUT_MS || process.env.BACKUP_WAIT_TIMEOUT_MS || 60 * 60 * 1000));

  const job = await repo.findBackupJob(id);
  if (!job || job.status !== 'success') {
    throw new Error(`PRE_CLEANUP_BACKUP_NOT_SUCCESS:${id}:${job?.status || 'missing'}`);
  }
  await repo.updateBackupJob(id, {
    metadata: { requestedFrom: 'data_cleanup', ...metadata, ...(job.metadata || {}) },
  });
  return { id, status: job.status, finished_at: job.finished_at || null };
}

async function createScriptBackupJob({ req, userId, reason = 'manual', jobType, scriptRelativePath, actionType, summary }) {
  const id = generateId();
  await repo.insertBackupJob({
    id,
    jobType,
    status: 'queued',
    triggerSource: 'manual',
    triggeredBy: userId,
    reason,
    metadata: { requestedFrom: 'admin_backup_center' },
  });
  await writeAuditLog({
    req,
    operatorId: userId,
    actionType,
    objectType: 'backup_job',
    objectId: id,
    summary,
    result: 'success',
    after: { reason },
  });
  runDetachedScript(scriptRelativePath, [], {
    BACKUP_JOB_ID: id,
    BACKUP_TRIGGER_SOURCE: 'manual',
    BACKUP_REASON: reason,
  });
  return { id, status: 'queued' };
}

async function createConfigBackup({ req, userId, reason = 'manual' }) {
  return createScriptBackupJob({
    req,
    userId,
    reason,
    jobType: 'config',
    scriptRelativePath: 'scripts/backup/backup-config.js',
    actionType: 'backup.config.create',
    summary: 'manual config backup requested',
  });
}

async function createUploadsBackup({ req, userId, reason = 'manual' }) {
  return createScriptBackupJob({
    req,
    userId,
    reason,
    jobType: 'uploads',
    scriptRelativePath: 'scripts/backup/backup-uploads.js',
    actionType: 'backup.uploads.create',
    summary: 'manual uploads backup requested',
  });
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
  if (restoreType === 'point_in_time') {
    const health = await getBackupHealth();
    if (!health.canRunPointInTimeRestore) {
      throw new BusinessError(400, '增量备份未就绪，当前不能创建指定时间点恢复任务');
    }
  }

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
  assertProductionRestoreSwitchAcks();

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
  resolveBackupAlerts,
  getBackupHealth,
  getOverview,
  listBackupFiles,
  createFullBackup,
  createPreCleanupBackup,
  createConfigBackup,
  createUploadsBackup,
  createRestoreJob,
  approveRestoreJob,
  switchRestoreJobToProduction,
  listRestoreJobs,
  listDrillReports,
  listAlerts,
};

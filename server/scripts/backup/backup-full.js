require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const path = require('path');
const { generateId } = require('../../src/utils/helpers');
const repo = require('../../src/modules/admin/repository/backup.repository');
const backupService = require('../../src/modules/admin/service/backup.service');
const {
  nowStamp,
  parseArgs,
  getBackupDir,
  ensureDir,
  gzipFile,
  encryptFile,
  sha256File,
  runCommand,
  uploadObject,
  fileStat,
  dbEnvArgs,
  removeFileQuietly,
  assertMinFreeBytes,
  defaultMinFreeBytes,
} = require('./backup-lib');

async function safeRepo(label, fn) {
  try {
    return await fn();
  } catch (err) {
    if (err?.code === 'ER_NO_SUCH_TABLE') {
      console.warn(`[backup-full] metadata table missing during ${label}; backup file flow will continue`);
      return null;
    }
    throw err;
  }
}

async function main() {
  const args = parseArgs();
  const jobId = args.jobId || process.env.BACKUP_JOB_ID || generateId();
  const backupKind = args.kind || process.env.BACKUP_KIND || 'full';
  if (!args.jobId && !process.env.BACKUP_JOB_ID) {
    const jobTypeMap = {
      long: 'long_term_full',
      pre_deploy: 'pre_deploy',
      pre_migration: 'pre_migration',
      pre_cleanup: 'pre_cleanup',
    };
    await safeRepo('insert job', () => repo.insertBackupJob({
      id: jobId,
      jobType: jobTypeMap[backupKind] || 'full',
      status: 'queued',
      triggerSource: process.env.BACKUP_TRIGGER_SOURCE || 'system',
      reason: process.env.BACKUP_REASON || '',
    }));
  }

  await safeRepo('mark running', () => repo.updateBackupJob(jobId, { status: 'running', startedAt: new Date() }));
  const stamp = nowStamp();
  const dir = getBackupDir('mysql-full', stamp.slice(0, 10));
  await ensureDir(dir);
  await assertMinFreeBytes(dir, defaultMinFreeBytes(1024 * 1024 * 1024), 'mysql full backup');

  const dbName = process.env.DB_NAME || 'click_send_shop';
  const sqlPath = path.join(dir, `${dbName}-${stamp}.sql`);
  const gzPath = `${sqlPath}.gz`;
  const encPath = `${gzPath}.enc`;
  const dumpArgs = [
    ...dbEnvArgs(),
    '--single-transaction',
    '--quick',
    '--routines',
    '--triggers',
    '--events',
    '--hex-blob',
    process.env.MYSQLDUMP_SET_GTID_PURGED || '--set-gtid-purged=AUTO',
    '--master-data=2',
    dbName,
  ];

  try {
    await runCommand(process.env.MYSQLDUMP_BIN || 'mysqldump', dumpArgs, {
      stdio: ['ignore', require('fs').openSync(sqlPath, 'w'), 'pipe'],
    });
    await gzipFile(sqlPath, gzPath);
    await removeFileQuietly(sqlPath);
    await encryptFile(gzPath, encPath);
    await removeFileQuietly(gzPath);
    const sha256 = await sha256File(encPath);
    const { sizeBytes } = await fileStat(encPath);
    const storageKey = `${process.env.BACKUP_S3_PREFIX || 'shop-backups'}/mysql/full/${stamp}/${path.basename(encPath)}`;
    const uploaded = await uploadObject(encPath, storageKey);
    if (!uploaded.skipped) {
      await uploadObject(`${encPath}.meta.json`, `${storageKey}.meta.json`);
    }
    if (!uploaded.skipped && process.env.BACKUP_KEEP_LOCAL_ENCRYPTED !== '1') {
      await removeFileQuietly(encPath);
      await removeFileQuietly(`${encPath}.meta.json`);
    }

    await safeRepo('insert file', () => repo.insertBackupFile({
      id: generateId(),
      backupJobId: jobId,
      fileKind: 'mysql_full',
      storageProvider: uploaded.skipped ? 'local' : 's3',
      bucket: uploaded.bucket,
      storageKey: uploaded.key,
      localPath: encPath,
      sizeBytes,
      sha256,
      encrypted: true,
      encryptionKeyId: process.env.BACKUP_ENCRYPTION_KEY_ID || 'default',
      compression: 'gzip',
      recoverableAt: new Date(),
      retentionTier: backupKind === 'long' ? 'long' : 'short',
      verifiedAt: new Date(),
    }));
    await safeRepo('mark success', () => repo.updateBackupJob(jobId, {
      status: 'success',
      finishedAt: new Date(),
      metadata: { storageKey, sizeBytes, sha256 },
    }));
  } catch (err) {
    await safeRepo('mark failed', () => repo.updateBackupJob(jobId, {
      status: 'failed',
      finishedAt: new Date(),
      errorMessage: String(err.message || err).slice(0, 1000),
    }));
    await backupService.emitBackupAlert({
      alertType: String(err.message || '').includes('S3') ? 's3_upload_failed' : 'full_failed',
      severity: 'P0',
      title: 'MySQL full backup failed',
      message: String(err.message || err),
      relatedJobId: jobId,
    }).catch((alertErr) => console.warn('[backup-full] alert failed:', alertErr?.message || alertErr));
    await removeFileQuietly(sqlPath);
    await removeFileQuietly(gzPath);
    throw err;
  }
}

main().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const path = require('path');
const { generateId } = require('../../src/utils/helpers');
const repo = require('../../src/modules/admin/repository/backup.repository');
const backupService = require('../../src/modules/admin/service/backup.service');
const {
  serverRoot,
  nowStamp,
  getBackupDir,
  ensureDir,
  runCommand,
  encryptFile,
  sha256File,
  uploadObject,
  fileStat,
  removeFileQuietly,
  assertMinFreeBytes,
  defaultMinFreeBytes,
} = require('./backup-lib');

let activeJobId = '';

async function main() {
  const jobId = process.env.BACKUP_JOB_ID || generateId();
  activeJobId = jobId;
  if (process.env.BACKUP_JOB_ID) {
    await repo.updateBackupJob(jobId, { status: 'running', startedAt: new Date() });
  } else {
    await repo.insertBackupJob({
      id: jobId,
      jobType: 'uploads',
      status: 'running',
      triggerSource: process.env.BACKUP_TRIGGER_SOURCE || 'system',
      reason: process.env.BACKUP_REASON || 'uploads snapshot',
      startedAt: new Date(),
    });
  }

  const stamp = nowStamp();
  const dir = getBackupDir('uploads', stamp.slice(0, 10));
  const uploadsRoot = process.env.BACKUP_UPLOADS_DIR || path.join(serverRoot, 'public/uploads');
  await ensureDir(dir);
  await ensureDir(uploadsRoot);
  await assertMinFreeBytes(dir, defaultMinFreeBytes(512 * 1024 * 1024), 'uploads backup');

  const archivePath = path.join(dir, `uploads-${stamp}.tar.gz`);
  const encPath = `${archivePath}.enc`;
  await runCommand(process.env.TAR_BIN || 'tar', ['-czf', archivePath, '-C', uploadsRoot, '.'], {
    timeoutMs: Number(process.env.BACKUP_UPLOADS_TIMEOUT_MS || process.env.BACKUP_COMMAND_TIMEOUT_MS || 30 * 60 * 1000),
  });
  await encryptFile(archivePath, encPath);
  await removeFileQuietly(archivePath);

  const sha256 = await sha256File(encPath);
  const { sizeBytes } = await fileStat(encPath);
  const storageKey = `${process.env.BACKUP_S3_PREFIX || 'shop-backups'}/uploads/${stamp}/${path.basename(encPath)}`;
  const uploaded = await uploadObject(encPath, storageKey);
  if (!uploaded.skipped) {
    await uploadObject(`${encPath}.meta.json`, `${storageKey}.meta.json`);
  }
  if (!uploaded.skipped && process.env.BACKUP_KEEP_LOCAL_ENCRYPTED !== '1') {
    await removeFileQuietly(encPath);
    await removeFileQuietly(`${encPath}.meta.json`);
  }

  await repo.insertBackupFile({
    id: generateId(),
    backupJobId: jobId,
    fileKind: 'uploads',
    storageProvider: uploaded.skipped ? 'local' : 's3',
    bucket: uploaded.bucket,
    storageKey: uploaded.skipped ? encPath : uploaded.key,
    localPath: encPath,
    sizeBytes,
    sha256,
    encrypted: true,
    encryptionKeyId: process.env.BACKUP_ENCRYPTION_KEY_ID || 'default',
    compression: 'tar.gz',
    retentionTier: 'short',
    verifiedAt: new Date(),
  });
  await repo.updateBackupJob(jobId, { status: 'success', finishedAt: new Date() });
  if (!uploaded.skipped) {
    await backupService.resolveBackupAlerts({
      alertTypes: ['s3_upload_failed'],
      remark: 'uploads backup uploaded successfully',
    });
  }
}

main().then(() => process.exit(0)).catch(async (err) => {
  console.error(err);
  if (activeJobId) {
    await repo.updateBackupJob(activeJobId, {
      status: 'failed',
      finishedAt: new Date(),
      errorMessage: String(err.message || err).slice(0, 1000),
    }).catch(() => {});
  }
  process.exit(1);
});

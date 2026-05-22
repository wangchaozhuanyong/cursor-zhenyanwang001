require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const path = require('path');
const fs = require('fs');
const { generateId } = require('../../src/utils/helpers');
const repo = require('../../src/modules/admin/repository/backup.repository');
const {
  repoRoot,
  serverRoot,
  nowStamp,
  getBackupDir,
  ensureDir,
  gzipFile,
  encryptFile,
  sha256File,
  uploadObject,
  fileStat,
} = require('./backup-lib');

async function main() {
  const jobId = process.env.BACKUP_JOB_ID || generateId();
  await repo.insertBackupJob({
    id: jobId,
    jobType: 'config',
    status: 'running',
    triggerSource: process.env.BACKUP_TRIGGER_SOURCE || 'system',
    reason: process.env.BACKUP_REASON || 'config snapshot',
    startedAt: new Date(),
  });
  const stamp = nowStamp();
  const dir = getBackupDir('config', stamp.slice(0, 10));
  await ensureDir(dir);
  const manifestPath = path.join(dir, `config-${stamp}.txt`);
  const candidates = [
    path.join(serverRoot, '.env'),
    path.join(serverRoot, 'ecosystem.config.cjs'),
    path.join(repoRoot, 'docker-compose.yml'),
    '/etc/nginx/nginx.conf',
  ];
  const chunks = [];
  for (const file of candidates) {
    if (!fs.existsSync(file)) continue;
    chunks.push(`\n===== ${file} =====\n`);
    chunks.push(fs.readFileSync(file, 'utf8'));
  }
  fs.writeFileSync(manifestPath, chunks.join('\n'), 'utf8');
  const gzPath = `${manifestPath}.gz`;
  const encPath = `${gzPath}.enc`;
  await gzipFile(manifestPath, gzPath);
  await encryptFile(gzPath, encPath);
  const sha256 = await sha256File(encPath);
  const { sizeBytes } = await fileStat(encPath);
  const storageKey = `${process.env.BACKUP_S3_PREFIX || 'shop-backups'}/config/${stamp}/${path.basename(encPath)}`;
  const uploaded = await uploadObject(encPath, storageKey);
  await repo.insertBackupFile({
    id: generateId(),
    backupJobId: jobId,
    fileKind: 'config',
    storageProvider: uploaded.skipped ? 'local' : 's3',
    bucket: uploaded.bucket,
    storageKey: uploaded.key,
    localPath: encPath,
    sizeBytes,
    sha256,
    encrypted: true,
    encryptionKeyId: process.env.BACKUP_ENCRYPTION_KEY_ID || 'default',
    compression: 'gzip',
    retentionTier: 'locked',
    verifiedAt: new Date(),
  });
  await repo.updateBackupJob(jobId, { status: 'success', finishedAt: new Date() });
}

main().then(() => process.exit(0)).catch(async (err) => {
  console.error(err);
  if (process.env.BACKUP_JOB_ID) {
    await repo.updateBackupJob(process.env.BACKUP_JOB_ID, {
      status: 'failed',
      finishedAt: new Date(),
      errorMessage: String(err.message || err).slice(0, 1000),
    }).catch(() => {});
  }
  process.exit(1);
});

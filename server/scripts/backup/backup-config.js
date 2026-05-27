require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
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
  removeFileQuietly,
  assertMinFreeBytes,
  defaultMinFreeBytes,
} = require('./backup-lib');

function sha256Text(text) {
  return crypto.createHash('sha256').update(String(text || '')).digest('hex');
}

function sha256Path(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function safeExec(command, args, options = {}) {
  try {
    return execFileSync(command, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], ...options }).trim();
  } catch {
    return '';
  }
}

function listFilesRecursively(rootDir) {
  const out = [];
  if (!fs.existsSync(rootDir)) return out;
  const stat = fs.statSync(rootDir);
  if (stat.isFile()) return [rootDir];
  for (const entry of fs.readdirSync(rootDir, { withFileTypes: true })) {
    const full = path.join(rootDir, entry.name);
    if (entry.isDirectory()) out.push(...listFilesRecursively(full));
    else if (entry.isFile()) out.push(full);
  }
  return out;
}

function buildDistHash(dir) {
  const files = listFilesRecursively(dir).sort();
  if (!files.length) return null;
  const hash = crypto.createHash('sha256');
  for (const file of files) {
    hash.update(path.relative(dir, file));
    hash.update('\0');
    hash.update(fs.readFileSync(file));
  }
  return hash.digest('hex');
}

function collectConfigSnapshot() {
  const candidates = [
    { label: 'server/.env', file: path.join(serverRoot, '.env') },
    { label: 'server/ecosystem.config.cjs', file: path.join(serverRoot, 'ecosystem.config.cjs') },
    { label: '~/.pm2/dump.pm2', file: path.join(process.env.HOME || process.env.USERPROFILE || '', '.pm2', 'dump.pm2') },
    { label: '/etc/nginx/nginx.conf', file: '/etc/nginx/nginx.conf' },
  ];
  const directories = [
    { label: '/etc/nginx/conf.d', dir: '/etc/nginx/conf.d' },
    { label: '/etc/nginx/sites-enabled', dir: '/etc/nginx/sites-enabled' },
    { label: '/etc/nginx/sites-available', dir: '/etc/nginx/sites-available' },
    { label: 'deploy', dir: path.join(repoRoot, 'deploy') },
    { label: 'release-history', dir: path.join(repoRoot, 'releases') },
  ];
  const metadata = {
    createdAt: new Date().toISOString(),
    gitCommit: safeExec('git', ['rev-parse', 'HEAD'], { cwd: repoRoot }) || null,
    gitBranch: safeExec('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: repoRoot }) || null,
    serverDistHash: buildDistHash(path.join(serverRoot, 'dist')),
    frontendDistHash: buildDistHash(path.join(repoRoot, 'click-send-shop-main', 'click-send-shop-main', 'dist')),
    files: [],
    missing: [],
  };
  const chunks = [`===== backup-config-manifest.json =====\n${JSON.stringify(metadata, null, 2)}\n`];

  for (const item of candidates) {
    if (!item.file || !fs.existsSync(item.file)) {
      metadata.missing.push(item.label);
      continue;
    }
    metadata.files.push({ label: item.label, path: item.file, sha256: sha256Path(item.file), sizeBytes: fs.statSync(item.file).size });
    chunks.push(`\n===== ${item.label} (${item.file}) =====\n`);
    chunks.push(fs.readFileSync(item.file, 'utf8'));
  }

  for (const item of directories) {
    const files = listFilesRecursively(item.dir);
    if (!files.length) {
      metadata.missing.push(item.label);
      continue;
    }
    for (const file of files.sort()) {
      const rel = path.relative(item.dir, file);
      metadata.files.push({ label: `${item.label}/${rel}`, path: file, sha256: sha256Path(file), sizeBytes: fs.statSync(file).size });
      chunks.push(`\n===== ${item.label}/${rel} (${file}) =====\n`);
      chunks.push(fs.readFileSync(file, 'utf8'));
    }
  }

  chunks[0] = `===== backup-config-manifest.json =====\n${JSON.stringify(metadata, null, 2)}\n`;
  return { text: chunks.join('\n'), metadata, manifestHash: sha256Text(JSON.stringify(metadata)) };
}

async function main() {
  const jobId = process.env.BACKUP_JOB_ID || generateId();
  if (!process.env.BACKUP_JOB_ID) {
    await repo.insertBackupJob({
      id: jobId,
      jobType: 'config',
      status: 'running',
      triggerSource: process.env.BACKUP_TRIGGER_SOURCE || 'system',
      reason: process.env.BACKUP_REASON || 'config snapshot',
      startedAt: new Date(),
    });
  } else {
    await repo.updateBackupJob(jobId, { status: 'running', startedAt: new Date() });
  }
  const stamp = nowStamp();
  const dir = getBackupDir('config', stamp.slice(0, 10));
  await ensureDir(dir);
  await assertMinFreeBytes(dir, defaultMinFreeBytes(256 * 1024 * 1024), 'config backup');
  const manifestPath = path.join(dir, `config-${stamp}.txt`);
  const snapshot = collectConfigSnapshot();
  fs.writeFileSync(manifestPath, snapshot.text, 'utf8');
  const gzPath = `${manifestPath}.gz`;
  const encPath = `${gzPath}.enc`;
  await gzipFile(manifestPath, gzPath);
  await removeFileQuietly(manifestPath);
  await encryptFile(gzPath, encPath);
  await removeFileQuietly(gzPath);
  const sha256 = await sha256File(encPath);
  const { sizeBytes } = await fileStat(encPath);
  const storageKey = `${process.env.BACKUP_S3_PREFIX || 'shop-backups'}/config/${stamp}/${path.basename(encPath)}`;
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
    verificationStatus: 'pending',
    verificationReport: {
      reason: '配置备份仅允许恢复演练生成恢复包和校验报告，不直接覆盖生产配置',
      missing: snapshot.metadata.missing,
    },
    manifestJson: snapshot.metadata,
  });
  await repo.updateBackupJob(jobId, { status: 'success', finishedAt: new Date(), metadata: { manifestHash: snapshot.manifestHash } });
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

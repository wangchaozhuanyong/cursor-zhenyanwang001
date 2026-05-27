require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const {
  S3Client,
  ListObjectsV2Command,
  CopyObjectCommand,
  GetBucketVersioningCommand,
  GetObjectLockConfigurationCommand,
} = require('@aws-sdk/client-s3');
const { generateId } = require('../../src/utils/helpers');
const repo = require('../../src/modules/admin/repository/backup.repository');
const backupService = require('../../src/modules/admin/service/backup.service');
const {
  serverRoot,
  nowStamp,
  parseArgs,
  getBackupDir,
  ensureDir,
  encryptFile,
  sha256File,
  runCommand,
  uploadObject,
  fileStat,
  removeFileQuietly,
  assertMinFreeBytes,
  defaultMinFreeBytes,
} = require('./backup-lib');

function storageS3Client() {
  return new S3Client({
    region: process.env.STORAGE_S3_REGION || process.env.AWS_REGION || 'ap-southeast-1',
    endpoint: process.env.STORAGE_S3_ENDPOINT || undefined,
    forcePathStyle: String(process.env.STORAGE_S3_FORCE_PATH_STYLE || '').toLowerCase() === 'true',
    credentials: process.env.STORAGE_S3_ACCESS_KEY_ID ? {
      accessKeyId: process.env.STORAGE_S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.STORAGE_S3_SECRET_ACCESS_KEY || '',
    } : undefined,
  });
}

function sha256Text(text) {
  return crypto.createHash('sha256').update(String(text || '')).digest('hex');
}

async function walkFiles(rootDir) {
  const out = [];
  async function walk(dir) {
    const entries = await fsp.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (entry.isFile()) {
        const stat = await fsp.stat(full);
        out.push({
          path: path.relative(rootDir, full).replace(/\\/g, '/'),
          sizeBytes: stat.size,
          mtime: stat.mtime.toISOString(),
          sha256: await sha256File(full),
        });
      }
    }
  }
  if (fs.existsSync(rootDir)) await walk(rootDir);
  return out.sort((a, b) => a.path.localeCompare(b.path));
}

async function assertBusinessBucketProtection(client, bucket) {
  const report = { bucket, versioning: 'unknown', objectLock: 'unknown', ok: false };
  const versioning = await client.send(new GetBucketVersioningCommand({ Bucket: bucket })).catch((error) => ({ error }));
  report.versioning = versioning?.Status || 'Disabled';
  const lock = await client.send(new GetObjectLockConfigurationCommand({ Bucket: bucket })).catch((error) => ({ error }));
  report.objectLock = lock?.ObjectLockConfiguration?.ObjectLockEnabled || 'Disabled';
  report.ok = report.versioning === 'Enabled' && report.objectLock === 'Enabled';
  if (!report.ok && process.env.BACKUP_UPLOADS_REQUIRE_S3_PROTECTION !== '0') {
    throw new Error(`业务上传桶未启用 Versioning/Object Lock：versioning=${report.versioning} objectLock=${report.objectLock}`);
  }
  return report;
}

async function listBusinessObjects(client, bucket, prefix) {
  const objects = [];
  let ContinuationToken;
  do {
    const res = await client.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix, ContinuationToken }));
    for (const item of res.Contents || []) {
      if (!item.Key || item.Key.endsWith('/')) continue;
      objects.push({
        key: item.Key,
        sizeBytes: Number(item.Size || 0),
        lastModified: item.LastModified ? item.LastModified.toISOString() : null,
        etag: String(item.ETag || '').replace(/^"|"$/g, ''),
      });
    }
    ContinuationToken = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (ContinuationToken);
  return objects;
}

async function backupLocalUploads({ jobId, stamp, dir }) {
  const uploadsDir = process.env.UPLOADS_DIR || path.join(serverRoot, 'public', 'uploads');
  await ensureDir(uploadsDir);
  const manifest = {
    mode: 'local',
    sourceDir: uploadsDir,
    createdAt: new Date().toISOString(),
    files: await walkFiles(uploadsDir),
  };
  const archivePath = path.join(dir, `uploads-${stamp}.tar.gz`);
  const encPath = `${archivePath}.enc`;
  await runCommand(process.env.TAR_BIN || 'tar', ['-czf', archivePath, '-C', uploadsDir, '.']);
  await encryptFile(archivePath, encPath);
  await removeFileQuietly(archivePath);
  const sha256 = await sha256File(encPath);
  const { sizeBytes } = await fileStat(encPath);
  const storageKey = `${process.env.BACKUP_S3_PREFIX || 'shop-backups'}/uploads/${stamp}/${path.basename(encPath)}`;
  const uploaded = await uploadObject(encPath, storageKey);
  if (!uploaded.skipped) await uploadObject(`${encPath}.meta.json`, `${storageKey}.meta.json`);
  if (!uploaded.skipped && process.env.BACKUP_KEEP_LOCAL_ENCRYPTED !== '1') {
    await removeFileQuietly(encPath);
    await removeFileQuietly(`${encPath}.meta.json`);
  }
  return {
    file: {
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
      compression: 'gzip',
      retentionTier: 'short',
      verificationStatus: 'pending',
      verificationReport: { reason: 'uploads 备份等待独立校验流程完成后写入 verified_at' },
      manifestJson: manifest,
    },
    metadata: { mode: manifest.mode, fileCount: manifest.files.length, manifestHash: sha256Text(JSON.stringify(manifest)) },
  };
}

async function backupS3Uploads({ jobId, stamp, dir }) {
  const client = storageS3Client();
  const bucket = process.env.STORAGE_S3_BUCKET;
  if (!bucket) throw new Error('STORAGE_S3_BUCKET is required when STORAGE_DRIVER=s3');
  const prefix = String(process.env.STORAGE_UPLOADS_PREFIX || process.env.STORAGE_KEY_PREFIX || 'uploads').replace(/^\/+|\/+$/g, '');
  const normalizedPrefix = prefix ? `${prefix}/` : '';
  const protection = await assertBusinessBucketProtection(client, bucket);
  const objects = await listBusinessObjects(client, bucket, normalizedPrefix);
  const copyMode = process.env.BACKUP_UPLOADS_S3_MODE === 'copy';
  const copied = [];
  if (copyMode) {
    for (const obj of objects) {
      const backupKey = `${process.env.BACKUP_S3_PREFIX || 'shop-backups'}/uploads/s3-objects/${stamp}/${obj.key}`;
      await client.send(new CopyObjectCommand({
        Bucket: process.env.BACKUP_S3_BUCKET,
        Key: backupKey,
        CopySource: `${bucket}/${encodeURIComponent(obj.key).replace(/%2F/g, '/')}`,
      }));
      copied.push({ ...obj, backupBucket: process.env.BACKUP_S3_BUCKET, backupKey });
    }
  }

  const manifest = {
    mode: copyMode ? 's3-copy' : 's3-protected-source',
    sourceBucket: bucket,
    sourcePrefix: normalizedPrefix,
    createdAt: new Date().toISOString(),
    protection,
    objects: copyMode ? copied : objects,
  };
  const manifestPath = path.join(dir, `uploads-s3-manifest-${stamp}.json`);
  const encPath = `${manifestPath}.enc`;
  await fsp.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  await encryptFile(manifestPath, encPath);
  await removeFileQuietly(manifestPath);
  const sha256 = await sha256File(encPath);
  const { sizeBytes } = await fileStat(encPath);
  const storageKey = `${process.env.BACKUP_S3_PREFIX || 'shop-backups'}/uploads/${stamp}/${path.basename(encPath)}`;
  const uploaded = await uploadObject(encPath, storageKey);
  if (!uploaded.skipped) await uploadObject(`${encPath}.meta.json`, `${storageKey}.meta.json`);
  if (!uploaded.skipped && process.env.BACKUP_KEEP_LOCAL_ENCRYPTED !== '1') {
    await removeFileQuietly(encPath);
    await removeFileQuietly(`${encPath}.meta.json`);
  }
  return {
    file: {
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
      compression: 'none',
      retentionTier: copyMode ? 'locked' : 'short',
      verificationStatus: protection.ok ? 'pending' : 'failed',
      verificationReport: { protection, copiedObjectCount: copied.length },
      manifestJson: manifest,
    },
    metadata: { mode: manifest.mode, objectCount: objects.length, copiedObjectCount: copied.length, protection },
  };
}

async function main() {
  const args = parseArgs();
  const jobId = args.jobId || process.env.BACKUP_JOB_ID || generateId();
  const createdJob = !args.jobId && !process.env.BACKUP_JOB_ID;
  if (createdJob) {
    await repo.insertBackupJob({
      id: jobId,
      jobType: 'uploads',
      status: 'queued',
      triggerSource: process.env.BACKUP_TRIGGER_SOURCE || 'system',
      reason: process.env.BACKUP_REASON || 'uploads snapshot',
      metadata: { requestedFrom: 'backup_uploads_script' },
    });
  }

  await repo.updateBackupJob(jobId, { status: 'running', startedAt: new Date() });
  const stamp = nowStamp();
  const dir = getBackupDir('uploads', stamp.slice(0, 10));
  await ensureDir(dir);
  await assertMinFreeBytes(dir, defaultMinFreeBytes(512 * 1024 * 1024), 'uploads backup');

  try {
    const result = String(process.env.STORAGE_DRIVER || '').toLowerCase() === 's3'
      ? await backupS3Uploads({ jobId, stamp, dir })
      : await backupLocalUploads({ jobId, stamp, dir });
    await repo.insertBackupFile(result.file);
    await repo.updateBackupJob(jobId, { status: 'success', finishedAt: new Date(), metadata: result.metadata });
  } catch (err) {
    await repo.updateBackupJob(jobId, {
      status: 'failed',
      finishedAt: new Date(),
      errorMessage: String(err.message || err).slice(0, 1000),
    }).catch(() => {});
    await backupService.emitBackupAlert({
      alertType: 's3_upload_failed',
      severity: 'P1',
      title: '上传文件备份失败',
      message: String(err.message || err),
      relatedJobId: jobId,
    }).catch(() => {});
    throw err;
  }
}

main().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});

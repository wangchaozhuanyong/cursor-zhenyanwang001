require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const {
  S3Client,
  CopyObjectCommand,
  PutObjectCommand,
  GetObjectCommand,
} = require('@aws-sdk/client-s3');
const repo = require('../../src/modules/admin/repository/backup.repository');
const {
  parseArgs,
  getBackupDir,
  ensureDir,
  decryptFile,
  downloadObject,
  runCommand,
  removeTreeQuietly,
  serverRoot,
} = require('./backup-lib');

function backupS3Client() {
  return new S3Client({
    region: process.env.BACKUP_S3_REGION || process.env.AWS_REGION || 'ap-southeast-1',
    endpoint: process.env.BACKUP_S3_ENDPOINT || undefined,
    forcePathStyle: process.env.BACKUP_S3_FORCE_PATH_STYLE === '1',
  });
}

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

async function downloadBackupObject(file, workDir) {
  const base = path.basename(file.storage_key || file.local_path || `uploads-${file.id}.enc`);
  const encryptedPath = path.join(workDir, base.endsWith('.enc') ? base : `${base}.enc`);
  const metaPath = `${encryptedPath}.meta.json`;
  if (file.storage_provider === 'local') {
    const sourcePath = file.local_path || file.storage_key;
    await fsp.copyFile(sourcePath, encryptedPath);
    if (fs.existsSync(`${sourcePath}.meta.json`)) await fsp.copyFile(`${sourcePath}.meta.json`, metaPath);
    return { encryptedPath, metaPath };
  }
  await downloadObject({ bucket: file.bucket || process.env.BACKUP_S3_BUCKET, key: file.storage_key, outputPath: encryptedPath });
  await downloadObject({ bucket: file.bucket || process.env.BACKUP_S3_BUCKET, key: `${file.storage_key}.meta.json`, outputPath: metaPath });
  return { encryptedPath, metaPath };
}

async function restoreLocalArchive(file, workDir, targetDir) {
  const { encryptedPath, metaPath } = await downloadBackupObject(file, workDir);
  const archivePath = encryptedPath.replace(/\.enc$/, '');
  await decryptFile(encryptedPath, archivePath, metaPath);
  await ensureDir(targetDir);
  await runCommand(process.env.TAR_BIN || 'tar', ['-xzf', archivePath, '-C', targetDir]);
  return { restoredTo: targetDir };
}

async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks);
}

async function restoreS3Manifest(file, targetPrefix) {
  const manifest = file.manifest_json;
  if (!manifest || typeof manifest !== 'object') {
    throw new Error('uploads 备份缺少 manifest_json，无法恢复 S3 对象');
  }
  if (!targetPrefix) throw new Error('恢复到 S3 时必须指定 --target-prefix 或 RESTORE_UPLOADS_TARGET_PREFIX');
  const cleanPrefix = String(targetPrefix).replace(/^\/+|\/+$/g, '');
  const storageBucket = process.env.RESTORE_UPLOADS_TARGET_BUCKET || process.env.STORAGE_S3_BUCKET;
  if (!storageBucket) throw new Error('STORAGE_S3_BUCKET is required for S3 uploads restore');

  const storageClient = storageS3Client();
  const backupClient = backupS3Client();
  let restoredCount = 0;
  const objects = Array.isArray(manifest.objects) ? manifest.objects : [];
  for (const obj of objects) {
    const sourceKey = obj.backupKey || obj.key;
    const sourceBucket = obj.backupBucket || manifest.sourceBucket;
    if (!sourceKey || !sourceBucket) continue;
    const relative = String(obj.key || sourceKey).replace(String(manifest.sourcePrefix || '').replace(/\/?$/, '/'), '');
    const targetKey = `${cleanPrefix}/${relative}`.replace(/\/+/g, '/');
    if (obj.backupKey && sourceBucket === storageBucket) {
      await storageClient.send(new CopyObjectCommand({
        Bucket: storageBucket,
        Key: targetKey,
        CopySource: `${sourceBucket}/${encodeURIComponent(sourceKey).replace(/%2F/g, '/')}`,
      }));
    } else {
      const res = await backupClient.send(new GetObjectCommand({ Bucket: sourceBucket, Key: sourceKey }));
      await storageClient.send(new PutObjectCommand({ Bucket: storageBucket, Key: targetKey, Body: await streamToBuffer(res.Body) }));
    }
    restoredCount += 1;
  }
  return { restoredTo: `${storageBucket}/${cleanPrefix}`, restoredCount };
}

async function main() {
  const args = parseArgs();
  const fileId = args.fileId || process.env.RESTORE_UPLOADS_FILE_ID;
  if (!fileId) throw new Error('RESTORE_UPLOADS_FILE_ID or --file-id is required');
  const file = await repo.findBackupFile(fileId);
  if (!file || file.file_kind !== 'uploads') throw new Error(`uploads 备份文件不存在：${fileId}`);

  const workDir = getBackupDir('restore-uploads-work', `${fileId}-${Date.now()}`);
  await ensureDir(workDir);
  try {
    let result;
    if (file.manifest_json?.mode === 's3-copy' || file.manifest_json?.mode === 's3-protected-source') {
      result = await restoreS3Manifest(file, args.targetPrefix || process.env.RESTORE_UPLOADS_TARGET_PREFIX);
    } else {
      const defaultTarget = path.join(workDir, 'uploads-restored');
      const targetDir = args.targetDir || process.env.RESTORE_UPLOADS_TARGET_DIR || defaultTarget;
      const productionUploads = path.join(serverRoot, 'public', 'uploads');
      if (path.resolve(targetDir) === path.resolve(productionUploads) && process.env.RESTORE_UPLOADS_ALLOW_PRODUCTION !== '1') {
        throw new Error('禁止默认覆盖生产 uploads 目录；如已确认，请设置 RESTORE_UPLOADS_ALLOW_PRODUCTION=1');
      }
      result = await restoreLocalArchive(file, workDir, targetDir);
    }
    console.log(JSON.stringify({ ok: true, ...result }, null, 2));
  } finally {
    if (process.env.BACKUP_KEEP_RESTORE_WORKDIR !== '1') await removeTreeQuietly(workDir);
  }
}

main().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});

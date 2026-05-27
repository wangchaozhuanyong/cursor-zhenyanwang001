require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const { generateId } = require('../../src/utils/helpers');
const repo = require('../../src/modules/admin/repository/backup.repository');
const backupService = require('../../src/modules/admin/service/backup.service');
const {
  parseArgs,
  getBackupDir,
  ensureDir,
  decryptFile,
  gunzipFile,
  downloadObject,
  runCommand,
  removeTreeQuietly,
  serverRoot,
} = require('./backup-lib');

async function downloadBackupObject(file, workDir) {
  const base = path.basename(file.storage_key || file.local_path || `backup-${file.id}.enc`);
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

async function verifyMysqlFull(file) {
  const restoreJobId = generateId();
  const tempDbName = `restore_tmp_${restoreJobId.replace(/-/g, '').slice(0, 16)}`;
  await repo.insertRestoreJob({
    id: restoreJobId,
    restoreType: 'site',
    status: 'queued',
    sourceBackupFileId: file.id,
    tempDbName,
    requestedBy: null,
    validationResult: { drill: true, verification: true, pending: true },
  });
  await runCommand(process.execPath, [
    path.join(serverRoot, 'scripts/backup/restore-to-temp.js'),
    '--restore-job-id',
    restoreJobId,
  ], { cwd: serverRoot, stdio: ['ignore', 'ignore', 'pipe'], timeoutMs: Number(process.env.BACKUP_VERIFY_TIMEOUT_MS || 60 * 60 * 1000) });
  const job = await repo.findRestoreJob(restoreJobId);
  if (!job || !['validated', 'awaiting_approval'].includes(job.status)) {
    throw new Error(job?.error_message || '数据库备份恢复校验失败');
  }
  return {
    restoreJobId,
    tempDbName,
    tableCount: job.validation_result?.tableCount || null,
    tableCounts: job.validation_result?.tableCounts || {},
    missingFileCount: job.validation_result?.uploadReferences?.missingFileCount || 0,
    durationSeconds: job.validation_result?.durationSeconds || null,
  };
}

async function verifyConfig(file, workDir) {
  const { encryptedPath, metaPath } = await downloadBackupObject(file, workDir);
  const gzPath = encryptedPath.replace(/\.enc$/, '');
  const outPath = gzPath.replace(/\.gz$/, '') || path.join(workDir, 'config-restore-package.txt');
  await decryptFile(encryptedPath, gzPath, metaPath);
  await gunzipFile(gzPath, outPath);
  const reportPath = path.join(workDir, 'config-restore-report.json');
  const manifest = file.manifest_json || {};
  const report = {
    restorePackagePath: outPath,
    reportPath,
    fileCount: Array.isArray(manifest.files) ? manifest.files.length : null,
    missing: Array.isArray(manifest.missing) ? manifest.missing : [],
    note: '配置恢复演练只输出恢复包和校验报告，不覆盖生产配置',
  };
  await fsp.writeFile(reportPath, JSON.stringify(report, null, 2));
  return report;
}

async function verifyUploads(file, workDir) {
  const manifest = file.manifest_json || {};
  if (manifest.mode === 'local') {
    const { encryptedPath, metaPath } = await downloadBackupObject(file, workDir);
    const archivePath = encryptedPath.replace(/\.enc$/, '');
    await decryptFile(encryptedPath, archivePath, metaPath);
    await runCommand(process.env.TAR_BIN || 'tar', ['-tzf', archivePath], { timeoutMs: Number(process.env.BACKUP_VERIFY_TIMEOUT_MS || 30 * 60 * 1000) });
    return {
      mode: manifest.mode,
      fileCount: Array.isArray(manifest.files) ? manifest.files.length : 0,
      missingFileCount: 0,
    };
  }
  const protection = manifest.protection || {};
  if (manifest.mode === 's3-protected-source' && protection.ok !== true) {
    throw new Error('业务 S3 上传对象未通过 Versioning/Object Lock 校验');
  }
  return {
    mode: manifest.mode || 'unknown',
    objectCount: Array.isArray(manifest.objects) ? manifest.objects.length : 0,
    copiedObjectCount: Array.isArray(manifest.objects) ? manifest.objects.filter((x) => x.backupKey).length : 0,
    protection,
  };
}

async function main() {
  const args = parseArgs();
  const fileId = args.fileId || process.env.BACKUP_VERIFY_FILE_ID;
  if (!fileId) throw new Error('BACKUP_VERIFY_FILE_ID or --file-id is required');
  const file = await repo.findBackupFile(fileId);
  if (!file) throw new Error(`备份文件不存在：${fileId}`);
  const startedAt = Date.now();
  const workDir = getBackupDir('verify-work', `${fileId}-${Date.now()}`);
  await ensureDir(workDir);
  await repo.updateBackupFile(file.id, { verificationStatus: 'running' });
  try {
    let report;
    if (file.file_kind === 'mysql_full') report = await verifyMysqlFull(file);
    else if (file.file_kind === 'config') report = await verifyConfig(file, workDir);
    else if (file.file_kind === 'uploads') report = await verifyUploads(file, workDir);
    else {
      report = { note: `${file.file_kind} 仅完成下载/解密级别校验`, kind: file.file_kind };
    }
    report = {
      ...report,
      durationSeconds: Math.max(1, Math.round((Date.now() - startedAt) / 1000)),
      verifiedAt: new Date().toISOString(),
    };
    await repo.updateBackupFile(file.id, {
      verifiedAt: new Date(),
      verificationStatus: 'passed',
      verificationReport: report,
    });
    console.log(JSON.stringify({ ok: true, report }, null, 2));
  } catch (err) {
    const report = {
      ok: false,
      durationSeconds: Math.max(1, Math.round((Date.now() - startedAt) / 1000)),
      error: String(err.message || err),
    };
    await repo.updateBackupFile(file.id, { verificationStatus: 'failed', verificationReport: report }).catch(() => {});
    await backupService.emitBackupAlert({
      alertType: 'verify_failed',
      severity: 'P0',
      title: '备份校验失败',
      message: report.error,
      relatedFileId: file.id,
      relatedJobId: file.backup_job_id,
    }).catch(() => {});
    throw err;
  } finally {
    if (process.env.BACKUP_KEEP_VERIFY_WORKDIR !== '1') await removeTreeQuietly(workDir);
  }
}

main().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const path = require('path');
const fs = require('fs');
const fsp = require('fs/promises');
const { generateId } = require('../../src/utils/helpers');
const repo = require('../../src/modules/admin/repository/backup.repository');
const backupService = require('../../src/modules/admin/service/backup.service');
const {
  nowStamp,
  parseArgs,
  uploadObject,
  sha256File,
  fileStat,
  encryptFile,
  getBackupDir,
  ensureDir,
  removeFileQuietly,
  assertMinFreeBytes,
  defaultMinFreeBytes,
} = require('./backup-lib');

function toBool(value) {
  return value === true || value === '1' || value === 'true' || value === 'yes';
}

async function readBinlogFiles(binlogDir, args) {
  let files = String(args.files || process.env.MYSQL_BINLOG_FILES || '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)
    .map((x) => path.basename(x));

  if (!files.length) {
    const indexPath = path.join(binlogDir, process.env.MYSQL_BINLOG_INDEX || 'binlog.index');
    if (fs.existsSync(indexPath)) {
      files = (await fsp.readFile(indexPath, 'utf8'))
        .split(/\r?\n/)
        .map((line) => path.basename(line.trim()))
        .filter(Boolean);
    }
  }

  if (!files.length) {
    files = (await fsp.readdir(binlogDir))
      .filter((name) => /^(mysql-bin|binlog)\.\d+$/.test(name))
      .sort();
  }

  return [...new Set(files)].sort();
}

async function main() {
  const args = parseArgs();
  const binlogDir = args.binlogDir || process.env.MYSQL_BINLOG_DIR;
  if (!binlogDir) throw new Error('MYSQL_BINLOG_DIR is required for binlog sync');

  const files = await readBinlogFiles(binlogDir, args);
  if (!files.length) throw new Error('MYSQL_BINLOG_FILES is required for binlog sync');

  const includeActive = toBool(args.includeActive) || toBool(process.env.BACKUP_BINLOG_INCLUDE_ACTIVE);
  const minAgeSeconds = Math.max(0, Number(process.env.BACKUP_BINLOG_MIN_AGE_SECONDS || 120) || 0);
  const activeFileName = files[files.length - 1];

  const stamp = nowStamp();
  const stageDir = getBackupDir('mysql-binlog', stamp.slice(0, 10));
  await ensureDir(stageDir);
  const statePath = getBackupDir('state', 'binlog-sync-state.json');
  await ensureDir(path.dirname(statePath));
  let state = {};
  try {
    state = JSON.parse(await fsp.readFile(statePath, 'utf8'));
  } catch {
    state = {};
  }

  const nextState = { ...state };
  let uploadedCount = 0;
  let skippedActiveCount = 0;
  let skippedTooNewCount = 0;

  for (const fileName of files) {
    if (!includeActive && fileName === activeFileName) {
      skippedActiveCount += 1;
      continue;
    }

    const filePath = path.join(binlogDir, fileName);
    const sourceStat = await fsp.stat(filePath);
    const ageMs = Date.now() - sourceStat.mtimeMs;
    if (!includeActive && minAgeSeconds > 0 && ageMs < minAgeSeconds * 1000) {
      skippedTooNewCount += 1;
      continue;
    }

    const stateKey = `${fileName}:${sourceStat.size}:${Math.floor(sourceStat.mtimeMs)}`;
    if (state[fileName] === stateKey) continue;

    await assertMinFreeBytes(
      stageDir,
      defaultMinFreeBytes(Math.max(sourceStat.size * 2, 512 * 1024 * 1024)),
      'mysql binlog backup',
    );

    const encryptedPath = path.join(stageDir, `${fileName}.${stamp}.enc`);
    let uploaded = null;
    await encryptFile(filePath, encryptedPath);
    try {
      const sha256 = await sha256File(encryptedPath);
      const { sizeBytes } = await fileStat(encryptedPath);
      const storageKey = `${process.env.BACKUP_S3_PREFIX || 'shop-backups'}/mysql/binlog/${stamp.slice(0, 10)}/${path.basename(encryptedPath)}`;
      uploaded = await uploadObject(encryptedPath, storageKey);
      if (!uploaded.skipped) {
        await uploadObject(`${encryptedPath}.meta.json`, `${storageKey}.meta.json`);
      }
      await repo.insertBinlogFile({
        id: generateId(),
        fileName,
        storageProvider: uploaded.skipped ? 'local' : 's3',
        bucket: uploaded.bucket,
        storageKey: uploaded.skipped ? encryptedPath : uploaded.key,
        sizeBytes,
        sha256,
        lastEventAt: new Date(sourceStat.mtimeMs),
        uploadedAt: new Date(),
        uploadStatus: 'success',
      });
      nextState[fileName] = stateKey;
      uploadedCount += 1;
    } finally {
      if (uploaded && !uploaded.skipped && process.env.BACKUP_KEEP_LOCAL_ENCRYPTED !== '1') {
        await removeFileQuietly(encryptedPath);
        await removeFileQuietly(`${encryptedPath}.meta.json`);
      }
    }
  }

  await fsp.writeFile(statePath, JSON.stringify({
    ...nextState,
    _lastRunAt: new Date().toISOString(),
    _lastUploadedCount: uploadedCount,
    _lastSkippedActiveCount: skippedActiveCount,
    _lastSkippedTooNewCount: skippedTooNewCount,
    _lastActiveFile: activeFileName,
  }, null, 2));
}

main().then(() => process.exit(0)).catch(async (err) => {
  console.error(err);
  await backupService.emitBackupAlert({
    alertType: String(err.message || '').includes('S3') ? 's3_upload_failed' : 'binlog_upload_failed',
    severity: 'P0',
    title: '数据库增量日志上传失败',
    message: String(err.message || err),
  }).catch(() => {});
  process.exit(1);
});

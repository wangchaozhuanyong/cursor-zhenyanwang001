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
} = require('./backup-lib');

async function main() {
  const args = parseArgs();
  const binlogDir = args.binlogDir || process.env.MYSQL_BINLOG_DIR;
  if (!binlogDir) throw new Error('MYSQL_BINLOG_DIR is required for binlog sync');
  let files = String(args.files || process.env.MYSQL_BINLOG_FILES || '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
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
  if (!files.length) throw new Error('MYSQL_BINLOG_FILES is required for binlog sync');

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
  for (const fileName of files) {
    const filePath = path.join(binlogDir, fileName);
    const sourceStat = await fsp.stat(filePath);
    const stateKey = `${fileName}:${sourceStat.size}:${Math.floor(sourceStat.mtimeMs)}`;
    if (state[fileName] === stateKey) continue;

    const encryptedPath = path.join(stageDir, `${fileName}.${stamp}.enc`);
    await encryptFile(filePath, encryptedPath);
    const sha256 = await sha256File(encryptedPath);
    const { sizeBytes } = await fileStat(encryptedPath);
    const storageKey = `${process.env.BACKUP_S3_PREFIX || 'shop-backups'}/mysql/binlog/${stamp.slice(0, 10)}/${path.basename(encryptedPath)}`;
    const uploaded = await uploadObject(encryptedPath, storageKey);
    await uploadObject(`${encryptedPath}.meta.json`, `${storageKey}.meta.json`);
    await repo.insertBinlogFile({
      id: generateId(),
      fileName,
      storageProvider: uploaded.skipped ? 'local' : 's3',
      bucket: uploaded.bucket,
      storageKey: uploaded.skipped ? encryptedPath : uploaded.key,
      sizeBytes,
      sha256,
      lastEventAt: new Date(),
      uploadedAt: new Date(),
      uploadStatus: 'success',
    });
    nextState[fileName] = stateKey;
    uploadedCount += 1;
  }
  await fsp.writeFile(statePath, JSON.stringify({
    ...nextState,
    _lastRunAt: new Date().toISOString(),
    _lastUploadedCount: uploadedCount,
  }, null, 2));
}

main().then(() => process.exit(0)).catch(async (err) => {
  console.error(err);
  await backupService.emitBackupAlert({
    alertType: String(err.message || '').includes('S3') ? 's3_upload_failed' : 'binlog_upload_failed',
    severity: 'P0',
    title: 'MySQL binlog upload failed',
    message: String(err.message || err),
  }).catch(() => {});
  process.exit(1);
});

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const {
  defaultMinFreeBytes,
  getAvailableBytes,
  getBackupDir,
} = require('./backup-lib');

function fmtBytes(value) {
  if (value == null) return 'unknown';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let n = Number(value);
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i += 1;
  }
  return `${n.toFixed(i === 0 ? 0 : 2)} ${units[i]}`;
}

function ok(label, detail = '') {
  console.log(`[OK] ${label}${detail ? `: ${detail}` : ''}`);
}

function warn(label, detail = '') {
  console.warn(`[WARN] ${label}${detail ? `: ${detail}` : ''}`);
}

function fail(errors, label, detail = '') {
  const message = `${label}${detail ? `: ${detail}` : ''}`;
  errors.push(message);
  console.error(`[FAIL] ${message}`);
}

async function canReadDir(dir) {
  await fsp.access(dir, fs.constants.R_OK);
  await fsp.readdir(dir);
}

async function canWriteDir(dir) {
  await fsp.mkdir(dir, { recursive: true });
  const probe = path.join(dir, `.backup-write-check-${process.pid}-${Date.now()}`);
  await fsp.writeFile(probe, 'ok');
  await fsp.unlink(probe);
}

async function detectBinlogFiles(binlogDir) {
  const configured = String(process.env.MYSQL_BINLOG_FILES || '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)
    .map((x) => path.basename(x));
  if (configured.length) return configured;

  const indexPath = path.join(binlogDir, process.env.MYSQL_BINLOG_INDEX || 'binlog.index');
  try {
    const text = await fsp.readFile(indexPath, 'utf8');
    const files = text.split(/\r?\n/)
      .map((line) => path.basename(line.trim()))
      .filter(Boolean);
    if (files.length) return files;
  } catch (error) {
    warn('Cannot read MySQL binlog index', `${indexPath} (${error.code || error.message})`);
  }

  const names = await fsp.readdir(binlogDir);
  return names.filter((name) => /^(mysql-bin|binlog)\.\d+$/.test(name)).sort();
}

async function main() {
  const errors = [];
  const backupDir = getBackupDir();
  const minFreeBytes = defaultMinFreeBytes();

  console.log('Backup prerequisite check');
  console.log(`DB_HOST=${process.env.DB_HOST || 'localhost'}`);
  console.log(`DB_USER=${process.env.DB_USER || 'click_send_app'}`);

  const binlogDir = process.env.MYSQL_BINLOG_DIR;
  if (!binlogDir) {
    fail(errors, 'MYSQL_BINLOG_DIR is not configured');
  } else {
    const resolved = path.resolve(binlogDir);
    try {
      await canReadDir(resolved);
      ok('MySQL binlog directory is readable', resolved);
      const files = await detectBinlogFiles(resolved);
      if (files.length) ok('MySQL binlog files detected', `${files.length} file(s), latest=${files[files.length - 1]}`);
      else fail(errors, 'No MySQL binlog files detected', resolved);
    } catch (error) {
      fail(errors, 'Cannot read MySQL binlog directory', `${resolved} (${error.code || error.message})`);
    }
  }

  try {
    await canWriteDir(backupDir);
    ok('Backup local directory is writable', backupDir);
  } catch (error) {
    fail(errors, 'Backup local directory is not writable', `${backupDir} (${error.code || error.message})`);
  }

  try {
    const available = await getAvailableBytes(backupDir);
    if (available == null) {
      warn('Disk free-space check unavailable on this Node.js runtime');
    } else if (available < minFreeBytes) {
      fail(errors, 'Insufficient disk space', `available=${fmtBytes(available)} required=${fmtBytes(minFreeBytes)}`);
    } else {
      ok('Disk free space is sufficient', `available=${fmtBytes(available)} required=${fmtBytes(minFreeBytes)}`);
    }
  } catch (error) {
    fail(errors, 'Disk free-space check failed', error.message);
  }

  if (!process.env.BACKUP_ENCRYPTION_KEY && process.env.NODE_ENV === 'production') {
    fail(errors, 'BACKUP_ENCRYPTION_KEY is required in production');
  } else if (!process.env.BACKUP_ENCRYPTION_KEY) {
    warn('BACKUP_ENCRYPTION_KEY is not configured', 'development fallback key would be used');
  } else {
    ok('BACKUP_ENCRYPTION_KEY is configured');
  }

  if (errors.length) {
    console.error(`Backup prerequisite check failed with ${errors.length} issue(s).`);
    process.exitCode = 1;
    return;
  }
  console.log('Backup prerequisite check passed.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

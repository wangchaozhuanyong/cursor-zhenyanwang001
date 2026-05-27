require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const mysql = require('mysql2/promise');
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const repo = require('../../src/modules/admin/repository/backup.repository');
const { runCommand } = require('./backup-lib');
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

async function checkBinary(errors, label, command) {
  try {
    await runCommand(command, ['--version'], { stdio: ['ignore', 'ignore', 'pipe'], timeoutMs: 10_000 });
    ok(`${label} exists`, command);
  } catch (error) {
    fail(errors, `${label} is not available`, `${command} (${error.message})`);
  }
}

async function checkDbConnection(errors) {
  try {
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER || 'click_send_app',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'click_send_shop',
    });
    await conn.query('SELECT 1');
    await conn.end();
    ok('Database connection is healthy');
  } catch (error) {
    fail(errors, 'Database connection failed', error.message);
  }
}

async function checkBackupS3Writable(errors) {
  const bucket = process.env.BACKUP_S3_BUCKET;
  if (!bucket) {
    fail(errors, 'BACKUP_S3_BUCKET is not configured');
    return;
  }
  const client = new S3Client({
    region: process.env.BACKUP_S3_REGION || process.env.AWS_REGION || 'ap-southeast-1',
    endpoint: process.env.BACKUP_S3_ENDPOINT || undefined,
    forcePathStyle: process.env.BACKUP_S3_FORCE_PATH_STYLE === '1',
  });
  const key = `${process.env.BACKUP_S3_PREFIX || 'shop-backups'}/healthchecks/backup-check-${process.pid}-${Date.now()}.txt`;
  try {
    await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: 'ok' }));
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key })).catch(() => {});
    ok('BACKUP_S3_BUCKET is writable', bucket);
  } catch (error) {
    fail(errors, 'BACKUP_S3_BUCKET is not writable', `${bucket} (${error.message})`);
  }
}

async function checkSystemdTimer(errors, name) {
  if (process.platform === 'win32') {
    warn(`${name} systemd timer check skipped`, 'not a Linux runtime');
    return;
  }
  try {
    await runCommand('systemctl', ['is-enabled', name], { stdio: ['ignore', 'ignore', 'pipe'], timeoutMs: 10_000 });
    ok('systemd timer is enabled', name);
  } catch (error) {
    fail(errors, 'systemd timer is not enabled', `${name} (${error.message})`);
  }
}

async function checkRecentBackupAndDrill(errors) {
  try {
    const latestFull = await repo.getLatestBackupFileByKind('mysql_full');
    if (!latestFull) {
      fail(errors, 'No recent successful full backup');
    } else {
      ok('Latest successful full backup found', latestFull.created_at || latestFull.recoverable_at || latestFull.id);
    }
    const drills = await repo.listDrillReports({ limit: 1 });
    const latestDrill = drills[0];
    if (!latestDrill) {
      fail(errors, 'No restore drill report found');
    } else if (latestDrill.status !== 'success') {
      fail(errors, 'Latest restore drill is not successful', latestDrill.error_message || latestDrill.status);
    } else {
      ok('Latest restore drill succeeded', latestDrill.created_at);
    }
  } catch (error) {
    warn('Cannot inspect recent backup/drill metadata', error.message);
  }
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

  await checkBinary(errors, 'mysqldump', process.env.MYSQLDUMP_BIN || 'mysqldump');
  await checkBinary(errors, 'mysql', process.env.MYSQL_BIN || 'mysql');
  await checkBinary(errors, 'mysqlbinlog', process.env.MYSQLBINLOG_BIN || 'mysqlbinlog');
  await checkDbConnection(errors);

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

  await checkBackupS3Writable(errors);
  await checkSystemdTimer(errors, process.env.BACKUP_FULL_TIMER || 'click-send-backup-full.timer');
  await checkSystemdTimer(errors, process.env.BACKUP_DRILL_TIMER || 'click-send-restore-drill.timer');
  await checkRecentBackupAndDrill(errors);

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

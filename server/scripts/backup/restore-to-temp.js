require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const mysql = require('mysql2/promise');
const { generateId } = require('../../src/utils/helpers');
const repo = require('../../src/modules/admin/repository/backup.repository');
const backupService = require('../../src/modules/admin/service/backup.service');
const {
  parseArgs,
  nowStamp,
  getBackupDir,
  ensureDir,
  decryptFile,
  gunzipFile,
  downloadObject,
  runCommand,
  dbAdminArgs,
  removeTreeQuietly,
} = require('./backup-lib');

const CRITICAL_TABLES = [
  'users',
  'orders',
  'order_items',
  'products',
  'payments',
  'payment_orders',
  'inventory_stock_records',
];

function assertTempDbName(name) {
  if (!/^restore_tmp_[a-zA-Z0-9_]{8,64}$/.test(String(name || ''))) {
    throw new Error(`Unsafe temporary database name: ${name}`);
  }
}

function mysqlConnOptions(database) {
  return {
    host: process.env.RESTORE_DB_HOST || process.env.DB_HOST || 'localhost',
    port: Number(process.env.RESTORE_DB_PORT || process.env.DB_PORT || 3306),
    user: process.env.RESTORE_DB_USER || process.env.DB_USER || 'click_send_app',
    password: process.env.RESTORE_DB_PASSWORD || process.env.DB_PASSWORD || '',
    database,
    multipleStatements: false,
  };
}

async function withAdminConnection(fn) {
  const conn = await mysql.createConnection(mysqlConnOptions(undefined));
  try {
    return await fn(conn);
  } finally {
    await conn.end();
  }
}

async function downloadBackupObject(file, outDir) {
  const base = path.basename(file.storage_key || file.local_path || `backup-${file.id}.enc`);
  const encryptedPath = path.join(outDir, base.endsWith('.enc') ? base : `${base}.enc`);
  const metaPath = `${encryptedPath}.meta.json`;

  if (file.storage_provider === 'local') {
    const sourcePath = file.local_path || file.storage_key;
    if (!sourcePath) throw new Error('Local backup file has no local path');
    await fsp.copyFile(sourcePath, encryptedPath);
    if (fs.existsSync(`${sourcePath}.meta.json`)) {
      await fsp.copyFile(`${sourcePath}.meta.json`, metaPath);
    }
    return { encryptedPath, metaPath };
  }

  await downloadObject({ bucket: file.bucket || process.env.BACKUP_S3_BUCKET, key: file.storage_key, outputPath: encryptedPath });
  await downloadObject({
    bucket: file.bucket || process.env.BACKUP_S3_BUCKET,
    key: `${file.storage_key}.meta.json`,
    outputPath: metaPath,
  });
  return { encryptedPath, metaPath };
}

async function materializeFullBackup(file, outDir) {
  const { encryptedPath, metaPath } = await downloadBackupObject(file, outDir);
  const gzPath = encryptedPath.replace(/\.enc$/, '');
  const sqlPath = gzPath.replace(/\.gz$/, '');
  await decryptFile(encryptedPath, gzPath, metaPath);
  await gunzipFile(gzPath, sqlPath);
  return sqlPath;
}

async function materializeBinlog(file, outDir) {
  const { encryptedPath, metaPath } = await downloadBackupObject(file, outDir);
  if (!encryptedPath.endsWith('.enc')) return encryptedPath;
  const rawPath = path.join(outDir, file.file_name || path.basename(encryptedPath).replace(/\.enc$/, ''));
  await decryptFile(encryptedPath, rawPath, metaPath);
  return rawPath;
}

async function prepareTempDatabase(tempDbName) {
  assertTempDbName(tempDbName);
  await withAdminConnection(async (conn) => {
    await conn.query(`DROP DATABASE IF EXISTS \`${tempDbName}\``);
    await conn.query(`CREATE DATABASE \`${tempDbName}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  });
}

async function dropTempDatabase(tempDbName) {
  assertTempDbName(tempDbName);
  await withAdminConnection(async (conn) => {
    await conn.query(`DROP DATABASE IF EXISTS \`${tempDbName}\``);
  });
}

async function importSql(sqlPath, tempDbName) {
  await runCommand(process.env.MYSQL_BIN || 'mysql', [...dbAdminArgs(), tempDbName], {
    stdio: [fs.openSync(sqlPath, 'r'), 'ignore', 'pipe'],
  });
}

function mysqlbinlogArgs(targetTime, files, tempDbName) {
  const args = [];
  if (targetTime) {
    const stop = new Date(targetTime).toISOString().slice(0, 19).replace('T', ' ');
    args.push(`--stop-datetime=${stop}`);
  }
  const sourceDbName = process.env.DB_NAME;
  if (sourceDbName && tempDbName) {
    args.push(`--rewrite-db=${sourceDbName}->${tempDbName}`);
  }
  args.push(...files);
  return args;
}

async function replayBinlogs(binlogPaths, tempDbName, targetTime) {
  if (!binlogPaths.length) return;
  await new Promise((resolve, reject) => {
    const mysqlbinlog = require('child_process').spawn(
      process.env.MYSQLBINLOG_BIN || 'mysqlbinlog',
      mysqlbinlogArgs(targetTime, binlogPaths, tempDbName),
      { shell: process.platform === 'win32' },
    );
    const mysqlProc = require('child_process').spawn(
      process.env.MYSQL_BIN || 'mysql',
      [...dbAdminArgs(), tempDbName],
      { shell: process.platform === 'win32' },
    );
    let errText = '';
    let binlogCode = null;
    let mysqlCode = null;
    let settled = false;
    const finish = () => {
      if (settled || binlogCode === null || mysqlCode === null) return;
      settled = true;
      if (binlogCode === 0 && mysqlCode === 0) resolve();
      else reject(new Error(`binlog replay failed mysqlbinlog=${binlogCode} mysql=${mysqlCode}: ${errText.slice(-2000)}`));
    };
    mysqlbinlog.stderr.on('data', (chunk) => { errText += chunk.toString(); });
    mysqlProc.stderr.on('data', (chunk) => { errText += chunk.toString(); });
    mysqlbinlog.stdout.pipe(mysqlProc.stdin);
    mysqlbinlog.on('error', reject);
    mysqlProc.on('error', reject);
    mysqlbinlog.on('close', (code) => { binlogCode = code; finish(); });
    mysqlProc.on('close', (code) => { mysqlCode = code; finish(); });
  });
}

async function validateTempDatabase(tempDbName) {
  const conn = await mysql.createConnection(mysqlConnOptions(tempDbName));
  try {
    const [tableRows] = await conn.query(`SHOW TABLES`);
    const tableNames = new Set(tableRows.map((row) => String(Object.values(row)[0])));
    const counts = {};
    for (const table of CRITICAL_TABLES) {
      if (!tableNames.has(table)) {
        counts[table] = { exists: false, count: null };
        continue;
      }
      const [[row]] = await conn.query(`SELECT COUNT(*) AS total FROM \`${table}\``);
      counts[table] = { exists: true, count: Number(row.total || 0) };
    }
    const missingCore = ['users', 'orders', 'products'].filter((table) => !counts[table]?.exists);
    return {
      ok: missingCore.length === 0,
      missingCore,
      tableCounts: counts,
      checkedAt: new Date().toISOString(),
    };
  } finally {
    await conn.end();
  }
}

async function main() {
  const args = parseArgs();
  const restoreJobId = args.restoreJobId || process.env.RESTORE_JOB_ID;
  if (!restoreJobId) throw new Error('RESTORE_JOB_ID is required');

  const startedAt = new Date();
  const workDir = getBackupDir('restore-work', `${restoreJobId}-${nowStamp()}`);
  await ensureDir(workDir);

  const job = await repo.findRestoreJob(restoreJobId);
  if (!job) throw new Error(`Restore job not found: ${restoreJobId}`);
  const isDrillJob = job.validation_result?.drill === true;
  const tempDbName = job.temp_db_name || `restore_tmp_${restoreJobId.replace(/-/g, '').slice(0, 16)}`;
  assertTempDbName(tempDbName);

  await repo.updateRestoreJob(restoreJobId, { status: 'running', startedAt, tempDbName });

  try {
    const targetTime = job.target_time || new Date();
    const sourceFile = job.source_backup_file_id
      ? await repo.findBackupFile(job.source_backup_file_id)
      : await repo.findLatestFullBackupBefore(targetTime);
    if (!sourceFile) throw new Error('No full backup file is available for restore');

    await prepareTempDatabase(tempDbName);
    const sqlPath = await materializeFullBackup(sourceFile, workDir);
    await importSql(sqlPath, tempDbName);
    await repo.updateRestoreJob(restoreJobId, { status: 'temp_restored' });

    let binlogRows = [];
    if (job.restore_type === 'point_in_time' || job.target_time) {
      binlogRows = await repo.listBinlogsForReplay(sourceFile.recoverable_at || sourceFile.created_at, targetTime);
      const binlogPaths = [];
      for (const binlog of binlogRows) {
        binlogPaths.push(await materializeBinlog(binlog, workDir));
      }
      await replayBinlogs(binlogPaths, tempDbName, targetTime);
    }

    const validation = await validateTempDatabase(tempDbName);
    const finishedAt = new Date();
    const status = validation.ok ? (isDrillJob ? 'validated' : 'awaiting_approval') : 'failed';
    await repo.updateRestoreJob(restoreJobId, {
      status,
      finishedAt,
      validationResult: {
        ...validation,
        drill: isDrillJob || undefined,
        sourceBackupFileId: sourceFile.id,
        replayedBinlogCount: binlogRows.length,
        targetTime,
        workDir,
      },
      errorMessage: validation.ok ? '' : `Missing core tables: ${validation.missingCore.join(', ')}`,
    });
    if (isDrillJob) {
      await repo.insertRestoreDrillReport({
        id: generateId(),
        backupFileId: sourceFile.id,
        restoreJobId,
        status: validation.ok ? 'success' : 'failed',
        tempDbName,
        tableCounts: validation.tableCounts,
        durationSeconds: Math.max(1, Math.round((finishedAt.getTime() - startedAt.getTime()) / 1000)),
        reportJson: validation,
        errorMessage: validation.ok ? '' : `Missing core tables: ${validation.missingCore.join(', ')}`,
        startedAt,
        finishedAt,
      });
    }
    if (!validation.ok) {
      await backupService.emitBackupAlert({
        alertType: 'restore_failed',
        severity: 'P0',
        title: '恢复校验失败',
        message: `Restore job ${restoreJobId} failed validation`,
        relatedJobId: restoreJobId,
        relatedFileId: sourceFile.id,
      });
      if (isDrillJob) {
        await backupService.emitBackupAlert({
          alertType: 'restore_drill_failed',
          severity: 'P0',
          title: '恢复演练失败',
          message: `Restore drill ${restoreJobId} failed validation`,
          relatedJobId: restoreJobId,
          relatedFileId: sourceFile.id,
        });
      }
      process.exit(2);
    }

    await backupService.resolveBackupAlerts({
      alertTypes: isDrillJob ? ['restore_failed', 'restore_drill_failed'] : ['restore_failed'],
      relatedJobId: isDrillJob ? null : restoreJobId,
      remark: isDrillJob ? 'restore drill completed successfully' : 'restore to temp completed successfully',
    });

    const drillJob = isDrillJob;
    if (drillJob && process.env.BACKUP_KEEP_RESTORE_DRILL_DB !== '1') {
      await dropTempDatabase(tempDbName);
    }
    if (process.env.BACKUP_KEEP_RESTORE_WORKDIR !== '1') {
      await removeTreeQuietly(workDir);
    }
  } catch (err) {
    const finishedAt = new Date();
    await repo.updateRestoreJob(restoreJobId, {
      status: 'failed',
      finishedAt,
      errorMessage: String(err.message || err).slice(0, 1000),
    }).catch(() => {});
    await backupService.emitBackupAlert({
      alertType: 'restore_failed',
      severity: 'P0',
      title: '恢复到临时库失败',
      message: String(err.message || err),
      relatedJobId: restoreJobId,
    }).catch(() => {});
    const failedJob = await repo.findRestoreJob(restoreJobId).catch(() => null);
    if (failedJob?.validation_result?.drill === true) {
      await backupService.emitBackupAlert({
        alertType: 'restore_drill_failed',
        severity: 'P0',
        title: '恢复演练失败',
        message: String(err.message || err),
        relatedJobId: restoreJobId,
      }).catch(() => {});
    }
    throw err;
  }
}

main().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});

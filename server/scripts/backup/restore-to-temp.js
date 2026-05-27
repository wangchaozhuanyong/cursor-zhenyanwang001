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

function mysqlbinlogArgs(targetTime, files, tempDbName, startPosition) {
  const args = [];
  if (startPosition) {
    args.push(`--start-position=${startPosition}`);
  }
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

async function replayBinlogsFromBackup(binlogRows, workDir, tempDbName, targetTime, sourceFile) {
  if (!binlogRows.length) {
    const recoverableAt = sourceFile.recoverable_at || sourceFile.created_at;
    if (targetTime && recoverableAt && new Date(targetTime).getTime() > new Date(recoverableAt).getTime()) {
      throw new Error('指定时间点恢复失败：未找到覆盖目标时间的增量日志');
    }
    return [];
  }
  const sourceBinlogFile = sourceFile.binlog_file || '';
  const startPosition = sourceFile.binlog_position || null;
  const selectedRows = sourceBinlogFile
    ? binlogRows.filter((row) => String(row.file_name || '') >= sourceBinlogFile)
    : binlogRows;
  if (sourceBinlogFile && !selectedRows.some((row) => row.file_name === sourceBinlogFile)) {
    throw new Error(`指定时间点恢复失败：缺少全量备份对应的 binlog 文件 ${sourceBinlogFile}`);
  }
  const latest = selectedRows
    .map((row) => row.last_event_at)
    .filter(Boolean)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];
  if (targetTime && latest && new Date(latest).getTime() < new Date(targetTime).getTime()) {
    throw new Error(`指定时间点恢复失败：增量日志只覆盖到 ${new Date(latest).toISOString()}`);
  }

  const firstRows = sourceBinlogFile ? selectedRows.filter((row) => row.file_name === sourceBinlogFile) : [];
  const restRows = sourceBinlogFile ? selectedRows.filter((row) => row.file_name !== sourceBinlogFile) : selectedRows;
  if (firstRows.length) {
    const firstPaths = [];
    for (const row of firstRows) firstPaths.push(await materializeBinlog(row, workDir));
    await new Promise((resolve, reject) => {
      const mysqlbinlog = require('child_process').spawn(
        process.env.MYSQLBINLOG_BIN || 'mysqlbinlog',
        mysqlbinlogArgs(targetTime, firstPaths, tempDbName, startPosition),
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
  const restPaths = [];
  for (const row of restRows) restPaths.push(await materializeBinlog(row, workDir));
  await replayBinlogs(restPaths, tempDbName, targetTime);
  return selectedRows;
}

async function validateUploadReferences(conn, tempDbName) {
  const [columns] = await conn.query(
    `SELECT TABLE_NAME AS tableName, COLUMN_NAME AS columnName
       FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = ?
        AND DATA_TYPE IN ('varchar','text','mediumtext','longtext','json')
        AND (COLUMN_NAME LIKE '%image%' OR COLUMN_NAME LIKE '%cover%' OR COLUMN_NAME LIKE '%url%' OR COLUMN_NAME LIKE '%media%')`,
    [tempDbName],
  );
  const uploadsDir = process.env.UPLOADS_DIR || path.join(__dirname, '../../public/uploads');
  let referenceCount = 0;
  let missingFileCount = 0;
  const missingSamples = [];
  for (const col of columns) {
    const table = String(col.tableName || '');
    const column = String(col.columnName || '');
    if (!/^[A-Za-z0-9_]+$/.test(table) || !/^[A-Za-z0-9_]+$/.test(column)) continue;
    const [rows] = await conn.query(
      `SELECT \`${column}\` AS value FROM \`${table}\` WHERE \`${column}\` LIKE '%/uploads/%' LIMIT 500`,
    );
    for (const row of rows) {
      const matches = String(row.value || '').match(/\/uploads\/[^"',\s)]+/g) || [];
      for (const ref of matches) {
        referenceCount += 1;
        const relative = decodeURIComponent(ref.replace(/^\/uploads\//, '')).replace(/^[/\\]+/, '');
        if (String(process.env.STORAGE_DRIVER || '').toLowerCase() !== 's3') {
          const full = path.join(uploadsDir, relative);
          if (!fs.existsSync(full)) {
            missingFileCount += 1;
            if (missingSamples.length < 20) missingSamples.push(ref);
          }
        }
      }
    }
  }
  return { referenceCount, missingFileCount, missingSamples };
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
    const uploadReferences = await validateUploadReferences(conn, tempDbName);
    return {
      ok: missingCore.length === 0,
      missingCore,
      tableCounts: counts,
      tableCount: tableRows.length,
      uploadReferences,
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
      binlogRows = await replayBinlogsFromBackup(binlogRows, workDir, tempDbName, targetTime, sourceFile);
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
        replayStart: {
          binlogFile: sourceFile.binlog_file || null,
          binlogPosition: sourceFile.binlog_position || null,
          gtidSet: sourceFile.gtid_set || null,
        },
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
      process.exit(2);
    }

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
    throw err;
  }
}

main().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});

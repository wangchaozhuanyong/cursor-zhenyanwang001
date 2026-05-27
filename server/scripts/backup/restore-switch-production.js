require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const path = require('path');
const mysql = require('mysql2/promise');
const { generateId } = require('../../src/utils/helpers');
const repo = require('../../src/modules/admin/repository/backup.repository');
const backupService = require('../../src/modules/admin/service/backup.service');
const { parseArgs, dbAdminArgs, runCommand, serverRoot } = require('./backup-lib');

function assertTempDbName(name) {
  if (!/^restore_tmp_[a-zA-Z0-9_]{8,64}$/.test(String(name || ''))) {
    throw new Error(`不安全的临时库名称：${name}`);
  }
}

function mysqlAdminOptions(database) {
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
  const conn = await mysql.createConnection(mysqlAdminOptions(undefined));
  try {
    return await fn(conn);
  } finally {
    await conn.end();
  }
}

async function databaseExists(dbName) {
  const [[row]] = await withAdminConnection(async (conn) => conn.query(
    `SELECT SCHEMA_NAME AS name FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = ? LIMIT 1`,
    [dbName],
  ));
  return Boolean(row?.name);
}

async function dropDatabase(dbName) {
  await withAdminConnection(async (conn) => {
    await conn.query(`DROP DATABASE IF EXISTS \`${dbName}\``);
  });
}

function isMaintenanceModeEnabled() {
  return process.env.MAINTENANCE_MODE === '1'
    || process.env.RESTORE_MAINTENANCE_MODE === '1'
    || process.env.SITE_MAINTENANCE_MODE === '1';
}

async function tableExists(conn, tableName) {
  const [[row]] = await conn.query(
    `SELECT COUNT(*) AS total FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    [tableName],
  );
  return Number(row?.total || 0) > 0;
}

async function assertNoRecentWrites(prodDbName) {
  const quietSeconds = Math.max(30, Number(process.env.RESTORE_SWITCH_QUIET_SECONDS || 300) || 300);
  const checks = [];
  const conn = await mysql.createConnection(mysqlAdminOptions(prodDbName));
  try {
    if (await tableExists(conn, 'orders')) {
      const [[row]] = await conn.query(
        `SELECT COUNT(*) AS total FROM orders WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? SECOND) OR updated_at >= DATE_SUB(NOW(), INTERVAL ? SECOND)`,
        [quietSeconds, quietSeconds],
      );
      checks.push({ name: 'orders_recent_writes', count: Number(row?.total || 0) });
    }
    if (await tableExists(conn, 'payment_orders')) {
      const [[row]] = await conn.query(
        `SELECT COUNT(*) AS total FROM payment_orders WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? SECOND) OR updated_at >= DATE_SUB(NOW(), INTERVAL ? SECOND)`,
        [quietSeconds, quietSeconds],
      );
      checks.push({ name: 'payment_orders_recent_writes', count: Number(row?.total || 0) });
    }
    if (await tableExists(conn, 'payment_events')) {
      const [[row]] = await conn.query(
        `SELECT COUNT(*) AS total FROM payment_events WHERE processing_result IN ('pending','processing') OR created_at >= DATE_SUB(NOW(), INTERVAL ? SECOND)`,
        [quietSeconds],
      );
      checks.push({ name: 'payment_events_pending_or_recent', count: Number(row?.total || 0) });
    }
  } finally {
    await conn.end();
  }
  const blockers = checks.filter((item) => item.count > 0);
  if (blockers.length) {
    throw new Error(`生产切换拒绝：仍检测到后台任务/支付回调/订单写入风险 ${JSON.stringify(blockers)}`);
  }
  return { quietSeconds, checks };
}

async function createPreRestoreSwitchBackup(restoreJobId) {
  const backupJobId = generateId();
  await repo.insertBackupJob({
    id: backupJobId,
    jobType: 'pre_restore_switch',
    status: 'queued',
    triggerSource: 'system',
    reason: `pre restore switch backup for ${restoreJobId}`,
    metadata: { restoreJobId },
  });
  await runCommand(process.execPath, [
    path.join(serverRoot, 'scripts/backup/backup-full.js'),
    '--job-id',
    backupJobId,
    '--kind',
    'pre_restore_switch',
  ], {
    cwd: serverRoot,
    stdio: ['ignore', 'ignore', 'pipe'],
    env: { ...process.env, BACKUP_JOB_ID: backupJobId, BACKUP_KIND: 'pre_restore_switch' },
    timeoutMs: Number(process.env.RESTORE_PRE_SWITCH_BACKUP_TIMEOUT_MS || 60 * 60 * 1000),
  });
  return backupJobId;
}

async function replaceProductionFromTemp(tempDbName, prodDbName) {
  const fsp = require('fs/promises');
  const os = require('os');
  const path = require('path');
  const sqlPath = path.join(os.tmpdir(), `restore-switch-${Date.now()}.sql`);

  await runCommand(process.env.MYSQLDUMP_BIN || 'mysqldump', [
    ...dbAdminArgs(),
    '--single-transaction',
    '--quick',
    '--routines',
    '--triggers',
    '--add-drop-table',
    '--hex-blob',
    '--no-tablespaces',
    tempDbName,
  ], {
    stdio: ['ignore', require('fs').openSync(sqlPath, 'w'), 'pipe'],
    timeoutMs: Number(process.env.RESTORE_SWITCH_TIMEOUT_MS || 60 * 60 * 1000),
  });

  await runCommand(process.env.MYSQL_BIN || 'mysql', [
    `--host=${process.env.DB_HOST || 'localhost'}`,
    `--port=${process.env.DB_PORT || '3306'}`,
    `--user=${process.env.DB_USER || 'click_send_app'}`,
    ...(process.env.DB_PASSWORD ? [`--password=${process.env.DB_PASSWORD}`] : []),
    prodDbName,
  ], {
    stdio: [require('fs').openSync(sqlPath, 'r'), 'ignore', 'pipe'],
    timeoutMs: Number(process.env.RESTORE_SWITCH_TIMEOUT_MS || 60 * 60 * 1000),
  });

  await fsp.rm(sqlPath, { force: true }).catch(() => {});
}

async function validateProductionCoreTables(prodDbName) {
  const conn = await mysql.createConnection(mysqlAdminOptions(prodDbName));
  try {
    for (const table of ['users', 'orders', 'products']) {
      const [[row]] = await conn.query(
        `SELECT COUNT(*) AS total FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
        [prodDbName, table],
      );
      if (!Number(row?.total)) {
        throw new Error(`生产库缺少核心表：${table}`);
      }
    }
  } finally {
    await conn.end();
  }
}

async function main() {
  if (process.env.RESTORE_SWITCH_ENABLED !== '1') {
    throw new Error('未启用生产切换，请在环境变量中设置 RESTORE_SWITCH_ENABLED=1');
  }
  if (!isMaintenanceModeEnabled()) {
    throw new Error('生产切换拒绝：必须先开启维护模式（MAINTENANCE_MODE=1 或 RESTORE_MAINTENANCE_MODE=1）');
  }

  const args = parseArgs();
  const restoreJobId = args.restoreJobId || process.env.RESTORE_JOB_ID;
  if (!restoreJobId) throw new Error('RESTORE_JOB_ID is required');

  const job = await repo.findRestoreJob(restoreJobId);
  if (!job) throw new Error(`恢复任务不存在：${restoreJobId}`);
  if (job.status !== 'approved') {
    throw new Error(`恢复任务状态为 ${job.status}，仅 approved 状态可执行生产切换`);
  }
  if (!['site', 'point_in_time'].includes(job.restore_type)) {
    throw new Error(`恢复类型 ${job.restore_type} 不支持生产切换`);
  }

  const tempDbName = job.temp_db_name;
  const prodDbName = process.env.DB_NAME || 'click_send_shop';
  assertTempDbName(tempDbName);
  if (tempDbName === prodDbName) {
    throw new Error('临时库名称不能与生产库相同');
  }
  if (!(await databaseExists(tempDbName))) {
    throw new Error(`临时库不存在：${tempDbName}`);
  }
  const quietReport = await assertNoRecentWrites(prodDbName);
  const rollbackBackupJobId = await createPreRestoreSwitchBackup(restoreJobId);
  await repo.updateRestoreJob(restoreJobId, {
    operatorIp: process.env.RESTORE_OPERATOR_IP || null,
    rollbackBackupJobId,
    restoreSource: job.source_backup_file_id || '',
    targetDatabase: prodDbName,
    diffSummary: {
      ...(job.diff_summary || {}),
      preSwitch: {
        rollbackBackupJobId,
        quietReport,
        checkedAt: new Date().toISOString(),
      },
    },
  });
  if (process.env.RESTORE_SWITCH_ALLOW_DIRECT_IMPORT !== '1') {
    const message = `生产切换已完成前置保护备份 ${rollbackBackupJobId}，但拒绝直接覆盖生产库；请配置受控切换策略或显式设置 RESTORE_SWITCH_ALLOW_DIRECT_IMPORT=1`;
    await repo.updateRestoreJob(restoreJobId, { errorMessage: message }).catch(() => {});
    await backupService.emitBackupAlert({
      alertType: 'restore_failed',
      severity: 'P1',
      title: '生产库切换被安全策略拦截',
      message,
      relatedJobId: restoreJobId,
    }).catch(() => {});
    throw new Error(message);
  }

  const locked = await repo.claimRestoreJobForSwitch(restoreJobId);
  if (!locked) {
    throw new Error('恢复任务已被切换或状态已变化');
  }

  const startedAt = new Date();
  try {
    await replaceProductionFromTemp(tempDbName, prodDbName);
    await validateProductionCoreTables(prodDbName);
    await dropDatabase(tempDbName);

    const finishedAt = new Date();
    await repo.updateRestoreJob(restoreJobId, {
      status: 'switched',
      finishedAt,
      errorMessage: '',
      diffSummary: {
        productionDb: prodDbName,
        tempDbName,
        rollbackBackupJobId,
        rollbackCommand: `RESTORE_JOB_ID=${restoreJobId} BACKUP_FILE_ID=<${rollbackBackupJobId} 对应文件> npm run restore:temp`,
        switchedAt: finishedAt.toISOString(),
        durationSeconds: Math.max(1, Math.round((finishedAt.getTime() - startedAt.getTime()) / 1000)),
      },
    });
  } catch (err) {
    const message = String(err.message || err).slice(0, 1000);
    await repo.updateRestoreJob(restoreJobId, {
      status: 'failed',
      finishedAt: new Date(),
      errorMessage: message,
    }).catch(() => {});
    await backupService.emitBackupAlert({
      alertType: 'restore_failed',
      severity: 'P0',
      title: '生产库切换失败',
      message,
      relatedJobId: restoreJobId,
    }).catch(() => {});
    throw err;
  }
}

main().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});

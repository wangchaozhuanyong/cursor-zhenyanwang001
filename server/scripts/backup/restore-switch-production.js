require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mysql = require('mysql2/promise');
const repo = require('../../src/modules/admin/repository/backup.repository');
const backupService = require('../../src/modules/admin/service/backup.service');
const { parseArgs, dbAdminArgs, runCommand } = require('./backup-lib');

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
  if (
    process.env.NODE_ENV === 'production'
    && process.env.RESTORE_SWITCH_ACK_DESTRUCTIVE !== '1'
  ) {
    throw new Error('生产切换缺少维护窗口确认，请设置 RESTORE_SWITCH_ACK_DESTRUCTIVE=1');
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

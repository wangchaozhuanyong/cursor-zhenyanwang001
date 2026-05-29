const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

function snapshotEnv(keys) {
  const saved = {};
  for (const key of keys) saved[key] = process.env[key];
  return () => {
    for (const key of keys) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  };
}

function loadBackupServiceWithRepoMock(repo) {
  const servicePath = require.resolve('../src/modules/admin/service/backup.service');
  const repoPath = require.resolve('../src/modules/admin/repository/backup.repository');
  const eventRepoPath = require.resolve('../src/modules/admin/repository/adminEvent.repository');
  const eventServicePath = require.resolve('../src/modules/admin/service/adminEvent.service');
  delete require.cache[servicePath];
  require.cache[repoPath] = { id: repoPath, filename: repoPath, loaded: true, exports: repo };
  require.cache[eventRepoPath] = {
    id: eventRepoPath,
    filename: eventRepoPath,
    loaded: true,
    exports: {
      async listActiveRecordsByTypes() {
        return [{ id: 'event-1', fingerprint: 'f'.repeat(64) }];
      },
    },
  };
  require.cache[eventServicePath] = {
    id: eventServicePath,
    filename: eventServicePath,
    loaded: true,
    exports: {
      async autoResolveByFingerprint() {
        return { resolved: true };
      },
    },
  };
  return require(servicePath);
}

describe('backup service exports', () => {
  test('exports restore lifecycle handlers', () => {
    const service = require('../src/modules/admin/service/backup.service');
    assert.equal(typeof service.getOverview, 'function');
    assert.equal(typeof service.createFullBackup, 'function');
    assert.equal(typeof service.createRestoreJob, 'function');
    assert.equal(typeof service.approveRestoreJob, 'function');
    assert.equal(typeof service.switchRestoreJobToProduction, 'function');
    assert.equal(typeof service.listRestoreJobs, 'function');
    assert.equal(typeof service.getBackupHealth, 'function');
    assert.equal(typeof service.createConfigBackup, 'function');
    assert.equal(typeof service.createUploadsBackup, 'function');
  });

  test('reports point-in-time restore as unavailable without binlog directory', async () => {
    const restoreEnv = snapshotEnv([
      'DB_NAME',
      'BACKUP_ALLOW_LOCAL_ONLY',
      'BACKUP_ENCRYPTION_KEY',
      'MYSQLDUMP_BIN',
      'MYSQL_BIN',
      'MYSQLBINLOG_BIN',
      'MYSQL_BINLOG_DIR',
    ]);
    process.env.DB_NAME = 'click_send_shop';
    process.env.BACKUP_ALLOW_LOCAL_ONLY = '1';
    process.env.BACKUP_ENCRYPTION_KEY = 'unit-test-key';
    process.env.MYSQLDUMP_BIN = 'mysqldump';
    process.env.MYSQL_BIN = 'mysql';
    process.env.MYSQLBINLOG_BIN = 'mysqlbinlog';
    delete process.env.MYSQL_BINLOG_DIR;
    try {
      const service = require('../src/modules/admin/service/backup.service');
      const health = await service.getBackupHealth();
      assert.equal(health.canRunPointInTimeRestore, false);
      assert.ok(health.checks.some((item) => item.key === 'MYSQL_BINLOG_DIR' && item.status === 'fail'));
    } finally {
      restoreEnv();
    }
  });

  test('blocks point-in-time restore when incremental backup is not ready', async () => {
    const restoreEnv = snapshotEnv([
      'DB_NAME',
      'BACKUP_ALLOW_LOCAL_ONLY',
      'BACKUP_ENCRYPTION_KEY',
      'MYSQLDUMP_BIN',
      'MYSQL_BIN',
      'MYSQLBINLOG_BIN',
      'MYSQL_BINLOG_DIR',
    ]);
    process.env.DB_NAME = 'click_send_shop';
    process.env.BACKUP_ALLOW_LOCAL_ONLY = '1';
    process.env.BACKUP_ENCRYPTION_KEY = 'unit-test-key';
    process.env.MYSQLDUMP_BIN = 'mysqldump';
    process.env.MYSQL_BIN = 'mysql';
    process.env.MYSQLBINLOG_BIN = 'mysqlbinlog';
    delete process.env.MYSQL_BINLOG_DIR;
    try {
      const service = loadBackupServiceWithRepoMock({
        async findLatestFullBackupBefore() {
          throw new Error('should not reach backup lookup');
        },
      });
      await assert.rejects(
        () => service.createRestoreJob({
          req: { user: { id: 'admin-1', isSuperAdmin: true } },
          userId: 'admin-1',
          body: { restoreType: 'point_in_time', targetTime: new Date().toISOString() },
        }),
        /增量备份未就绪/,
      );
    } finally {
      restoreEnv();
    }
  });

  test('resolves backup alerts and matching admin events', async () => {
    let resolvedArgs = null;
    const service = loadBackupServiceWithRepoMock({
      async resolveAlerts(args) {
        resolvedArgs = args;
        return 2;
      },
    });
    const result = await service.resolveBackupAlerts({ alertTypes: ['full_failed'] });
    assert.deepEqual(resolvedArgs.alertTypes, ['full_failed']);
    assert.equal(result.resolvedAlerts, 2);
    assert.equal(result.resolvedEvents, 1);
  });
});

/**
 * 用法（在 server 目录）：
 *   node scripts/migrate-cli.js        # 默认：执行 pending up
 *   node scripts/migrate-cli.js up
 *   node scripts/migrate-cli.js down   # 回滚最近一条（down 脚本需存在且可执行）
 *   node scripts/migrate-cli.js status
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { spawnSync } = require('child_process');
const path = require('path');
const {
  runPendingMigrations,
  runNamedMigrations,
  runLastMigrationDown,
  migrationStatus,
} = require('../src/db/migrateRunner');

const cmd = process.argv[2] || 'up';
const targetNames = process.argv
  .slice(3)
  .flatMap((value) => String(value || '').split(','))
  .map((value) => value.trim())
  .filter(Boolean);

function runPreMigrationBackup() {
  if (cmd === 'status') return;
  if (process.env.BACKUP_BEFORE_MIGRATION !== '1') return;
  const script = path.join(__dirname, 'backup', 'backup-full.js');
  const timeoutMs = Number(process.env.PRE_MIGRATION_BACKUP_TIMEOUT_MS || 10 * 60 * 1000);
  const targetLabel = targetNames.length ? ` ${targetNames.join(',')}` : '';
  const result = spawnSync(process.execPath, [script], {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
    timeout: Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : undefined,
    env: {
      ...process.env,
      BACKUP_KIND: 'pre_migration',
      BACKUP_TRIGGER_SOURCE: 'migration',
      BACKUP_REASON: `before npm run migrate ${cmd}${targetLabel}`,
      BACKUP_INCLUDE_MASTER_DATA: process.env.BACKUP_INCLUDE_MASTER_DATA || '0',
      MYSQLDUMP_LOCK_TABLES: process.env.MYSQLDUMP_LOCK_TABLES || '0',
    },
  });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error('Pre-migration backup failed; migration aborted');
  }
}

(async () => {
  runPreMigrationBackup();
  if (cmd === 'down') {
    await runLastMigrationDown();
  } else if (cmd === 'status') {
    await migrationStatus();
  } else if (cmd === 'up-one') {
    await runNamedMigrations(targetNames);
  } else if (cmd === 'up' && targetNames.length) {
    await runNamedMigrations(targetNames);
  } else if (cmd === 'up') {
    await runPendingMigrations();
  } else {
    throw new Error(`Unknown migration command: ${cmd}`);
  }
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

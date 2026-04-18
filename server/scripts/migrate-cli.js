/**
 * 用法（在 server 目录）：
 *   node scripts/migrate-cli.js        # 默认：执行 pending up
 *   node scripts/migrate-cli.js up
 *   node scripts/migrate-cli.js down   # 回滚最近一条（down 脚本需存在且可执行）
 *   node scripts/migrate-cli.js status
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const {
  runPendingMigrations,
  runLastMigrationDown,
  migrationStatus,
} = require('../src/db/migrateRunner');

const cmd = process.argv[2] || 'up';

(async () => {
  if (cmd === 'down') {
    await runLastMigrationDown();
  } else if (cmd === 'status') {
    await migrationStatus();
  } else {
    await runPendingMigrations();
  }
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

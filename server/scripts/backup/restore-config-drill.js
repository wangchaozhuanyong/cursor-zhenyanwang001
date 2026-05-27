require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const path = require('path');
const repo = require('../../src/modules/admin/repository/backup.repository');
const { parseArgs, runCommand, serverRoot } = require('./backup-lib');

async function main() {
  const args = parseArgs();
  const fileId = args.fileId || process.env.RESTORE_CONFIG_FILE_ID;
  const file = fileId ? await repo.findBackupFile(fileId) : await repo.getLatestBackupFileByKind('config');
  if (!file || file.file_kind !== 'config') throw new Error('未找到可用于配置恢复演练的配置备份');
  await runCommand(process.execPath, [
    path.join(serverRoot, 'scripts/backup/verify-backup.js'),
    '--file-id',
    file.id,
  ], {
    cwd: serverRoot,
    stdio: ['ignore', 'inherit', 'pipe'],
    env: { ...process.env, BACKUP_VERIFY_FILE_ID: file.id },
    timeoutMs: Number(process.env.CONFIG_RESTORE_DRILL_TIMEOUT_MS || 30 * 60 * 1000),
  });
}

main().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});

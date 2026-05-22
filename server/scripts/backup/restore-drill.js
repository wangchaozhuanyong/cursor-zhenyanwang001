require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const path = require('path');
const { generateId } = require('../../src/utils/helpers');
const repo = require('../../src/modules/admin/repository/backup.repository');
const backupService = require('../../src/modules/admin/service/backup.service');
const { runCommand, serverRoot } = require('./backup-lib');

async function main() {
  const targetTime = new Date();
  const sourceFile = await repo.findLatestFullBackupBefore(targetTime);
  if (!sourceFile) throw new Error('No successful full backup is available for restore drill');

  const restoreJobId = generateId();
  const tempDbName = `restore_tmp_${restoreJobId.replace(/-/g, '').slice(0, 16)}`;
  await repo.insertRestoreJob({
    id: restoreJobId,
    restoreType: 'site',
    status: 'queued',
    sourceBackupFileId: sourceFile.id,
    tempDbName,
    requestedBy: null,
    validationResult: { drill: true, pending: true },
  });

  try {
    await runCommand(process.execPath, [
      path.join(serverRoot, 'scripts/backup/restore-to-temp.js'),
      '--restore-job-id',
      restoreJobId,
    ], { cwd: serverRoot, stdio: ['ignore', 'ignore', 'pipe'] });
  } catch (err) {
    await backupService.emitBackupAlert({
      alertType: 'restore_drill_failed',
      severity: 'P0',
      title: 'Automatic restore drill failed',
      message: String(err.message || err),
      relatedJobId: restoreJobId,
      relatedFileId: sourceFile.id,
    }).catch(() => {});
    throw err;
  }
}

main().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});

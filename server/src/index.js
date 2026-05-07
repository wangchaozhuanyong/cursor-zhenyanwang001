require('dotenv').config();
const { validateEnv } = require('./config/validateEnv');
validateEnv();

const app = require('./app');
const { runPendingMigrations } = require('./db/migrateRunner');
const { startCleanupScheduler } = require('./modules/admin/adminExport.service');
const { startNotificationScheduler } = require('./modules/admin/adminNotification.service');
const { getStorageHealthReport } = require('./utils/objectStorage');

const PORT = process.env.PORT || 3000;

runPendingMigrations()
  .then(() => {
    const storage = getStorageHealthReport();
    if (storage.mode === 's3') {
      console.log('[Storage] driver=s3');
      console.log(`[Storage] healthy=${storage.healthy} bucket=${storage.bucket} region=${storage.region}`);
      console.log(`[Storage] endpoint=${storage.endpoint}`);
      console.log(`[Storage] publicBaseUrl=${storage.publicBaseUrl} keyPrefix=${storage.keyPrefix}`);
      console.log(`[Storage] forcePathStyle=${storage.forcePathStyle}`);
      console.log(`[Storage] accessKeyId=${storage.accessKeyIdMasked} secret=${storage.secretKeyMasked}`);
      if (!storage.healthy) {
        console.warn(`[Storage] missing required env: ${storage.missing.join(', ')}`);
      }
    } else {
      console.log(`[Storage] driver=${storage.driver} mode=${storage.mode}`);
      console.log(`[Storage] ${storage.note}`);
    }

    startCleanupScheduler();
    startNotificationScheduler();
    app.listen(PORT, () => {
      console.log(`✅ Server running → http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });

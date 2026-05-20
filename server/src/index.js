// @ts-nocheck
require('dotenv').config();
const { validateEnv } = require('./config/validateEnv');
validateEnv();

const app = require('./app');
const { runPendingMigrations } = require('./db/migrateRunner');
const { startCleanupScheduler } = require('./modules/admin/service/adminExport.service');
const { startNotificationScheduler } = require('./modules/admin/service/adminNotification.service');
const { startAutoConfirmReceiveScheduler } = require('./modules/order/service/orderAutoConfirm.service');
const { startPaymentTimeoutScheduler } = require('./modules/order/service/orderPaymentTimeout.service');
const { startMyInvoisRetryScheduler } = require('./modules/myinvois/service/myinvois.service');
const { getStorageHealthReport } = require('./utils/objectStorage');
const { ensureDefaultLegalContentPages } = require('./modules/admin/service/adminExtended.service');

const PORT = process.env.PORT || 3000;
const RUN_MIGRATIONS_ON_BOOT = process.env.RUN_MIGRATIONS_ON_BOOT === '1';

const bootPromise = RUN_MIGRATIONS_ON_BOOT
  ? runPendingMigrations()
  : Promise.resolve();

bootPromise
  .then(async () => {
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

    await ensureDefaultLegalContentPages();
    console.log('[CMS] ensured default legal content pages');

    startCleanupScheduler();
    startNotificationScheduler();
    startAutoConfirmReceiveScheduler();
    startPaymentTimeoutScheduler();
    startMyInvoisRetryScheduler();
    app.listen(PORT, () => {
      if (process.env.NODE_ENV === 'production') {
        console.log(`鉁?Server listening (production), PORT=${PORT}`);
      } else {
        console.log(`鉁?Server running 鈫?http://localhost:${PORT}`);
      }
    });
  })
  .catch((err) => {
    console.error('Startup precheck failed:', err);
    process.exit(1);
  });



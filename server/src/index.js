// @ts-nocheck
require('dotenv').config();
const { validateEnv } = require('./config/validateEnv');
validateEnv();

const app = require('./app');
const { prepareDatabaseForRuntime } = require('./db/schemaStartup');
const { startCleanupScheduler } = require('./modules/admin/service/adminExport.service');
const { startNotificationScheduler } = require('./modules/admin/service/adminNotification.service');
const { startAutoConfirmReceiveScheduler } = require('./modules/order/service/orderAutoConfirm.service');
const { startPaymentTimeoutScheduler } = require('./modules/order/service/orderPaymentTimeout.service');
const { startMyInvoisRetryScheduler } = require('./modules/myinvois/service/myinvois.service');
const { getStorageHealthReport } = require('./utils/objectStorage');
const { ensureDefaultLegalContentPages } = require('./modules/admin/service/adminExtended.service');
const { getInstanceInfo, instanceLogPrefix } = require('./config/instance');

const PORT = process.env.PORT || 3000;
/** 默认启动时自动迁移；仅当 RUN_MIGRATIONS_ON_BOOT=0 时关闭（避免代码已更新而库结构落后导致管理端 500） */
const RUN_MIGRATIONS_ON_BOOT = process.env.RUN_MIGRATIONS_ON_BOOT !== '0';

const bootPromise = prepareDatabaseForRuntime({ runMigrations: RUN_MIGRATIONS_ON_BOOT });

bootPromise
  .then(async () => {
    const instance = getInstanceInfo();
    console.log(`${instanceLogPrefix('Instance')} SITE_CODE=${instance.siteCode || '(unset)'}`);
    console.log(`${instanceLogPrefix('Instance')} SITE_NAME=${instance.siteName || '(unset)'}`);
    console.log(`${instanceLogPrefix('Instance')} PUBLIC_APP_URL=${instance.publicAppUrl || '(unset)'}`);
    console.log(`${instanceLogPrefix('Instance')} DB_NAME=${instance.dbName || '(unset)'}`);
    console.log(`${instanceLogPrefix('Instance')} STORAGE_KEY_PREFIX=${instance.storageKeyPrefix || '(unset)'}`);
    console.log(`${instanceLogPrefix('Instance')} REDIS_KEY_PREFIX=${instance.redisKeyPrefix || '(unset)'}`);

    const storage = getStorageHealthReport();
    if (storage.mode === 's3') {
      console.log(`${instanceLogPrefix('Storage')} driver=s3`);
      console.log(`${instanceLogPrefix('Storage')} healthy=${storage.healthy} bucket=${storage.bucket} region=${storage.region}`);
      console.log(`${instanceLogPrefix('Storage')} endpoint=${storage.endpoint}`);
      console.log(`${instanceLogPrefix('Storage')} publicBaseUrl=${storage.publicBaseUrl} keyPrefix=${storage.keyPrefix}`);
      console.log(`${instanceLogPrefix('Storage')} forcePathStyle=${storage.forcePathStyle}`);
      console.log(`${instanceLogPrefix('Storage')} accessKeyId=${storage.accessKeyIdMasked} secret=${storage.secretKeyMasked}`);
      if (!storage.healthy) {
        console.warn(`${instanceLogPrefix('Storage')} missing required env: ${storage.missing.join(', ')}`);
      }
    } else {
      console.log(`${instanceLogPrefix('Storage')} driver=${storage.driver} mode=${storage.mode}`);
      console.log(`${instanceLogPrefix('Storage')} ${storage.note}`);
    }

    await ensureDefaultLegalContentPages();
    console.log(`${instanceLogPrefix('CMS')} ensured default legal content pages`);

    startCleanupScheduler();
    startNotificationScheduler();
    startAutoConfirmReceiveScheduler();
    startPaymentTimeoutScheduler();
    startMyInvoisRetryScheduler();
    app.listen(PORT, () => {
      if (process.env.NODE_ENV === 'production') {
        console.log(`${instanceLogPrefix('Server')} listening (production), PORT=${PORT}`);
      } else {
        console.log(`${instanceLogPrefix('Server')} running http://localhost:${PORT}`);
      }
    });
  })
  .catch((err) => {
    console.error(`${instanceLogPrefix('Startup')} precheck failed:`, err);
    process.exit(1);
  });



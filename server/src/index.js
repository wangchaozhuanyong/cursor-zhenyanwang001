// @ts-nocheck
require('dotenv').config();
const { validateEnv } = require('./config/validateEnv');
validateEnv();

const app = require('./app');
const { prepareDatabaseForRuntime } = require('./db/schemaStartup');
const { startNotificationScheduler } = require('./modules/admin/service/adminNotification.service');
const { startEscalationScheduler: startAdminEventEscalationScheduler } = require('./modules/admin/service/adminEvent.service');
const { startDailyInventorySnapshotScheduler } = require('./modules/admin/service/adminReplenishment.service');
const { startAutoConfirmReceiveScheduler } = require('./modules/order/service/orderAutoConfirm.service');
const { startPaymentTimeoutScheduler } = require('./modules/order/service/orderPaymentTimeout.service');
const { startOrderTimeoutEventScheduler } = require('./modules/order/service/orderEventTimeout.service');
const { startMyInvoisRetryScheduler } = require('./modules/myinvois/service/myinvois.service');
const {
  startMonitoringScheduler,
  startMonitoringSchedulerInline,
} = require('./modules/monitoring/service/monitoringScheduler.service');
const { startDataRetentionScheduler } = require('./modules/dataRetention/service/dataRetention.service');
const { startPointsExpireScheduler } = require('./modules/loyalty/service/pointsExpireScheduler.service');
const { startCouponExpireScheduler } = require('./modules/user/service/couponExpireScheduler.service');
const { getRedisUrl, pingRedis } = require('./config/redis');
const { getStorageHealthReport } = require('./utils/objectStorage');
const { ensureDefaultLegalContentPages } = require('./modules/admin/service/adminExtended.service');
const { getInstanceInfo, instanceLogPrefix } = require('./config/instance');

const PORT = process.env.PORT || 3000;
/** 默认启动时自动迁移；仅当 RUN_MIGRATIONS_ON_BOOT=0 时关闭（避免代码已更新而库结构落后导致管理端 500） */
const RUN_MIGRATIONS_ON_BOOT = process.env.RUN_MIGRATIONS_ON_BOOT !== '0';

function emitSystemEvent(event) {
  try {
    void require('./modules/admin/service/adminEvent.service').emitEvent(event, {
      operatorType: 'system',
      source: event.source || 'server_startup',
    });
  } catch {
    // Startup diagnostics are best-effort.
  }
}

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
        emitSystemEvent({
          eventType: 'system.storage_unhealthy',
          category: 'system',
          severity: 'P1',
          title: '存储服务异常',
          message: `对象存储配置不完整：${storage.missing.join(', ')}`,
          entityType: 'system',
          entityId: 'storage',
          fingerprint: { eventType: 'system.storage_unhealthy', entityType: 'system', entityId: 'storage' },
          payload: storage,
          source: 'server_startup',
        });
      }
    } else {
      console.log(`${instanceLogPrefix('Storage')} driver=${storage.driver} mode=${storage.mode}`);
      console.log(`${instanceLogPrefix('Storage')} ${storage.note}`);
    }

    await ensureDefaultLegalContentPages();
    console.log(`${instanceLogPrefix('CMS')} ensured default legal content pages`);

    startDataRetentionScheduler();
    startPointsExpireScheduler();
    startCouponExpireScheduler();
    startDailyInventorySnapshotScheduler();
    startNotificationScheduler();
    startAdminEventEscalationScheduler();
    startAutoConfirmReceiveScheduler();
    startPaymentTimeoutScheduler();
    startOrderTimeoutEventScheduler();
    startMyInvoisRetryScheduler();
    if (process.env.MONITORING_SCHEDULER_DISABLED !== '1') {
      const redisConfigured = Boolean(getRedisUrl() || process.env.REDIS_ENABLED === '1');
      if (!redisConfigured) {
        const allowInline = process.env.MONITORING_INLINE_SCHEDULER === '1'
          || process.env.NODE_ENV !== 'production';
        if (allowInline) {
          startMonitoringSchedulerInline();
          console.log(`${instanceLogPrefix('Monitoring')} scheduler started (inline, no Redis)`);
        } else {
          console.log(`${instanceLogPrefix('Monitoring')} scheduler skipped: Redis not configured`);
        }
      } else {
        try {
          const redisPing = await pingRedis();
          if (redisPing.ok) {
            startMonitoringScheduler();
            console.log(`${instanceLogPrefix('Monitoring')} scheduler started (Redis ok)`);
          } else {
            console.warn(`${instanceLogPrefix('Monitoring')} scheduler skipped: Redis ping failed`);
            emitSystemEvent({
              eventType: 'system.redis_unavailable',
              category: 'system',
              severity: 'P1',
              title: 'Redis 不可用',
              message: 'Redis ping 失败，监控调度器已跳过启动',
              entityType: 'system',
              entityId: 'redis',
              fingerprint: { eventType: 'system.redis_unavailable', entityType: 'system', entityId: 'redis' },
              payload: redisPing,
              source: 'server_startup',
            });
          }
        } catch (err) {
          console.warn(`${instanceLogPrefix('Monitoring')} scheduler skipped: ${err.message}`);
        }
      }
    }
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


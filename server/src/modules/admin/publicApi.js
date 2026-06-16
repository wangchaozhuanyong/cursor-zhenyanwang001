const triggerApi = require('./notificationTriggerApi');
const homeOpsService = require('./service/adminHomeOps.service');
const adminEventService = require('./service/adminEvent.service');
const adminEventBus = require('./service/adminEventBus.service');
const adminEventRepo = require('./repository/adminEvent.repository');
const adminSiteSettingsRepo = require('./repository/adminSiteSettings.repository');
const adminUserSecurityRepo = require('./repository/adminUserSecurity.repository');
const adminCouponCampaignRepo = require('./repository/adminCouponCampaign.repository');
const backupService = require('./service/backup.service');

module.exports = {
  isNotificationTriggerEnabled: triggerApi.isNotificationTriggerEnabled,
  getResolvedTriggerCopy: triggerApi.getResolvedTriggerCopy,
  getPublicHomeOps: homeOpsService.getPublicHomeOps,
  emitEvent: adminEventService.emitEvent,
  autoResolveEventByFingerprint: adminEventService.autoResolveByFingerprint,
  publishAdminEvent: adminEventBus.publishAdminEvent,
  listActiveEventRecordsByTypes: adminEventRepo.listActiveRecordsByTypes,
  selectSiteSettingValue: adminSiteSettingsRepo.selectSettingValue,
  upsertSiteSetting: adminSiteSettingsRepo.upsertSetting,
  isUserSecurityIpBlocked: adminUserSecurityRepo.isIpBlocked,
  isUserSecurityDeviceBlocked: adminUserSecurityRepo.isDeviceBlocked,
  insertUserSecurityEvent: adminUserSecurityRepo.insertSecurityEvent,
  selectPublicCouponCampaignsByPosition: adminCouponCampaignRepo.selectPublicCampaignsByPosition,
  isCouponCampaignClaimAllowed: adminCouponCampaignRepo.isCouponCampaignClaimAllowed,
  resolveCouponCampaignClaim: adminCouponCampaignRepo.resolveCouponCampaignClaim,
  selectCouponCampaignCouponIds: adminCouponCampaignRepo.selectCouponIdsByCampaignId,
  createPreCleanupBackup: backupService.createPreCleanupBackup,
};

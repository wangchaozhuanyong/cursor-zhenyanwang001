const triggerApi = require('./notificationTriggerApi');
const homeOpsService = require('./service/adminHomeOps.service');
const adminEventService = require('./service/adminEvent.service');
const adminEventBus = require('./service/adminEventBus.service');
const adminSiteSettingsService = require('./service/adminSiteSettings.service');
const adminUserSecurityService = require('./service/adminUserSecurity.service');
const adminCouponCampaignService = require('./service/adminCouponCampaign.service');
const backupService = require('./service/backup.service');

module.exports = {
  isNotificationTriggerEnabled: triggerApi.isNotificationTriggerEnabled,
  getResolvedTriggerCopy: triggerApi.getResolvedTriggerCopy,
  getPublicHomeOps: homeOpsService.getPublicHomeOps,
  emitEvent: adminEventService.emitEvent,
  autoResolveEventByFingerprint: adminEventService.autoResolveByFingerprint,
  publishAdminEvent: adminEventBus.publishAdminEvent,
  listActiveEventRecordsByTypes: adminEventService.listActiveEventRecordsByTypes,
  selectSiteSettingValue: adminSiteSettingsService.selectSiteSettingValue,
  upsertSiteSetting: adminSiteSettingsService.upsertSiteSetting,
  isUserSecurityIpBlocked: adminUserSecurityService.isUserSecurityIpBlocked,
  isUserSecurityDeviceBlocked: adminUserSecurityService.isUserSecurityDeviceBlocked,
  insertUserSecurityEvent: adminUserSecurityService.insertUserSecurityEvent,
  selectPublicCouponCampaignsByPosition: adminCouponCampaignService.selectPublicCouponCampaignsByPosition,
  isCouponCampaignClaimAllowed: adminCouponCampaignService.isCouponCampaignClaimAllowed,
  resolveCouponCampaignClaim: adminCouponCampaignService.resolveCouponCampaignClaim,
  selectCouponCampaignCouponIds: adminCouponCampaignService.selectCouponCampaignCouponIds,
  createPreCleanupBackup: backupService.createPreCleanupBackup,
};

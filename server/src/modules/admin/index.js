/**
 * Admin 鍩燂細绠＄悊绔?API
 */
const { Router } = require('express');
const triggerApi = require('./notificationTriggerApi');
const homeOpsService = require('./service/adminHomeOps.service');
const adminEventService = require('./service/adminEvent.service');
const adminEventBus = require('./service/adminEventBus.service');
const adminEventRepo = require('./repository/adminEvent.repository');
const adminSiteSettingsRepo = require('./repository/adminSiteSettings.repository');
const adminUserSecurityRepo = require('./repository/adminUserSecurity.repository');
const adminCouponCampaignRepo = require('./repository/adminCouponCampaign.repository');

const router = Router();

/** 椤诲湪鎸傝浇瀛愯矾鐢变箣鍓嶆敞鍐岋紝閬垮厤 product 鈫?admin 寰幆渚濊禆鏃?api 灏氭湭灏辩华 */
/** @type {any} */ (router).api = {
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
  selectCouponCampaignCouponIds: adminCouponCampaignRepo.selectCouponIdsByCampaignId,
};

router.use('/admin', require('./routes/admin.routes'));

module.exports = router;

/**
 * Admin 鍩燂細绠＄悊绔?API
 */
const { Router } = require('express');
const triggerApi = require('./notificationTriggerApi');
const homeOpsService = require('./service/adminHomeOps.service');

const router = Router();

/** 椤诲湪鎸傝浇瀛愯矾鐢变箣鍓嶆敞鍐岋紝閬垮厤 product 鈫?admin 寰幆渚濊禆鏃?api 灏氭湭灏辩华 */
/** @type {any} */ (router).api = {
  isNotificationTriggerEnabled: triggerApi.isNotificationTriggerEnabled,
  getResolvedTriggerCopy: triggerApi.getResolvedTriggerCopy,
  getPublicHomeOps: homeOpsService.getPublicHomeOps,
};

router.use('/admin', require('./routes/admin.routes'));

module.exports = router;


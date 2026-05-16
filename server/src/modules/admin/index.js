/**
 * Admin 域：管理端 API
 */
const { Router } = require('express');
const triggerApi = require('./notificationTriggerApi');
const homeOpsService = require('./adminHomeOps.service');

const router = Router();
router.use('/admin', require('./admin.routes'));

/** 其他业务域仅允许通过此处暴露的方法调用 admin 能力，禁止直依赖内部文件 */
/** @type {any} */ (router).api = {
  isNotificationTriggerEnabled: triggerApi.isNotificationTriggerEnabled,
  getPublicHomeOps: homeOpsService.getPublicHomeOps,
};

module.exports = router;

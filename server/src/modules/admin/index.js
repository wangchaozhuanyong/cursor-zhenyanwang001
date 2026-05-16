/**
 * Admin 域：管理端 API
 */
const { Router } = require('express');
const triggerApi = require('./notificationTriggerApi');
const homeOpsService = require('./adminHomeOps.service');

const router = Router();

/** 须在挂载子路由之前注册，避免 product → admin 循环依赖时 api 尚未就绪 */
/** @type {any} */ (router).api = {
  isNotificationTriggerEnabled: triggerApi.isNotificationTriggerEnabled,
  getResolvedTriggerCopy: triggerApi.getResolvedTriggerCopy,
  getPublicHomeOps: homeOpsService.getPublicHomeOps,
};

router.use('/admin', require('./admin.routes'));

module.exports = router;

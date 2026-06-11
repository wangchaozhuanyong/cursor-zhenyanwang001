/**
 * Admin 路由聚合
 *
 * 仅做：声明路径 + 中间件 + 调用对应业务 controller
 * 不做：业务规则和 SQL；所有 controller 已按业务域拆分到 ./controller/*`r
 *
 * 依赖：
 *   middleware/adminAuth     - 鉴权 + RBAC 权限
 *   middleware/rateLimiters  - 用户查询限流
 *   middleware/paginationCap - 列表 limit 上限保护
 */
const { Router } = require('express');
const multer = require('multer');
const adminAuth = require('../../../middleware/adminAuth');
const requirePermission = adminAuth.requirePermission;
const requireAnyPermission = adminAuth.requireAnyPermission;
const requireSensitiveAction = adminAuth.requireSensitiveAction;
const { adminSecurityAudit } = require('../../../middleware/adminSecurityAudit');
const { highCostApiLimiter, userQueryLimiter } = require('../../../middleware/rateLimiters');
const { paginationCap } = require('../../../middleware/paginationCap');
const { validate } = require('../../../middleware/validate');
const { requireSiteCapability } = require('../../../middleware/siteCapabilityGuard');
const { ensureAdminSchemaReady } = require('../../../middleware/schemaReadiness');

const authCtrl = require('../controller/adminAuth.controller');
const dashboardCtrl = require('../controller/adminDashboard.controller');
const productCtrl = require('../controller/adminProduct.controller');
const orderCtrl = require('../controller/adminOrder.controller');
const orderEventCtrl = require('../controller/adminOrderEvent.controller');
const adminEventCtrl = require('../controller/adminEvent.controller');
const checkoutAbandonmentCtrl = require('../controller/adminCheckoutAbandonment.controller');
const userCtrl = require('../controller/adminUser.controller');
const userSecurityCtrl = require('../controller/adminUserSecurity.controller');
const categoryCtrl = require('../controller/adminCategory.controller');
const couponCtrl = require('../controller/adminCoupon.controller');
const couponCampaignCtrl = require('../controller/adminCouponCampaign.controller');
const returnCtrl = require('../controller/adminReturn.controller');
const reviewCtrl = require('../controller/adminReview.controller');
const feedbackCtrl = require('../controller/adminFeedback.controller');
const bannerCtrl = require('../controller/adminBanner.controller');
const notificationCtrl = require('../controller/adminNotification.controller');
const inviteCtrl = require('../controller/adminInvite.controller');
const rewardCtrl = require('../controller/adminReward.controller');
const pointsCtrl = require('../controller/adminPoints.controller');
const logCtrl = require('../controller/adminLog.controller');
const rbacCtrl = require('../controller/adminRbac.controller');
const shippingCtrl = require('../controller/adminShipping.controller');
const reportCtrl = require('../controller/adminReport.controller');
const settingsCtrl = require('../controller/adminSettings.controller');
const themeCtrl = require('../controller/adminTheme.controller');
const exportCtrl = require('../controller/adminExport.controller');
const recycleBinCtrl = require('../controller/adminRecycleBin.controller');
const adminPayCtrl = require('../controller/adminPayments.controller');
const telegramCtrl = require('../controller/adminTelegram.controller');
const logisticsCtrl = require('../controller/adminLogistics.controller');
const inventoryCtrl = require('../controller/adminInventory.controller');
const activityCtrl = require('../controller/adminActivity.controller');
const homeOpsCtrl = require('../controller/adminHomeOps.controller');
const memberLevelCtrl = require('../controller/adminMemberLevel.controller');
const backupCtrl = require('../controller/adminBackup.controller');
const paySchemas = require('../../payment/payments.schemas');
const productSchemas = require('../schemas/adminProduct.schemas');
const adminOrderSchemas = require('../schemas/adminOrder.schemas');
const adminFeedbackSchemas = require('../schemas/adminFeedback.schemas');
const adminUploadCtrl = require('../controller/adminUpload.controller');
const { getSensitiveActionClass } = require('../adminHighRiskRoutes');

const uploadCsv = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

const router = Router();

/* ---- Auth & Account ---- */
router.post('/auth/login', authCtrl.login);
router.post('/auth/refresh', authCtrl.refresh);
router.post('/auth/mfa/verify', authCtrl.verifyMfa);
router.post('/auth/mfa/reverify', adminAuth, authCtrl.reverifyMfa);
router.post('/auth/passkeys/login/options', authCtrl.beginPasskeyLogin);
router.post('/auth/passkeys/login/verify', authCtrl.finishPasskeyLogin);
router.post('/auth/passkeys/register/options', adminAuth, authCtrl.beginPasskeyRegistration);
router.post('/auth/passkeys/register/verify', adminAuth, authCtrl.finishPasskeyRegistration);
router.post('/auth/passkeys/step-up/options', adminAuth, authCtrl.beginPasskeyStepUp);
router.post('/auth/passkeys/step-up/verify', adminAuth, authCtrl.finishPasskeyStepUp);
router.get('/auth/csrf', authCtrl.csrf);
router.post('/auth/logout', adminAuth, authCtrl.logout);
router.get('/account/profile', adminAuth, authCtrl.getProfile);
router.put('/account/profile', adminAuth, authCtrl.updateProfile);
router.put('/account/password', adminAuth, authCtrl.changePassword);
router.get('/account/order-voice', adminAuth, authCtrl.getOrderVoiceSettings);
router.put('/account/order-voice', adminAuth, authCtrl.updateOrderVoiceSettings);

/** 登录/刷新之后：关键迁移未完成时返回 503 指引，避免笼统的「服务器内部错误」 */
router.use((req, res, next) => {
  if (/^\/auth\/(login|refresh)$/.test(req.path)) return next();
  return ensureAdminSchemaReady(req, res, next);
});

router.use((req, res, next) => {
  if (/^\/auth\//.test(req.path)) return next();
  const actionClass = getSensitiveActionClass(req);
  if (!actionClass) return next();
  return adminAuth(req, res, (err) => {
    if (err) return next(err);
    return requireSensitiveAction(actionClass)(req, res, next);
  });
});

router.use(adminSecurityAudit);

router.use([
  '/event-center/events/export',
  '/event-center/events/batch',
  '/backups/full',
  '/backups/config',
  '/backups/uploads',
  '/restore/jobs',
  '/products/export',
  '/products/import',
  '/products/batch-status',
  '/products/batch-delete',
  '/orders/export',
  '/orders/batch-ship',
  '/inventory/replenishment-alerts/generate',
  '/inventory/replenishment-runs/preview',
  '/inventory/replenishment-profiles/batch',
  '/inventory/daily-snapshots/generate',
  '/inventory/export',
  '/inventory/records/export',
  '/inventory/batch-warning-threshold',
  '/inventory/batch-adjust',
  '/activities/products/options',
  '/member-levels/recalculate',
  '/users/export',
  '/users/tags/batch',
  '/coupons/:id/issue-by-tag',
  '/reviews/batch-hide',
  '/reviews/batch-delete',
  '/notifications/resolve-users',
  '/notifications/audience-estimate',
  '/notifications/:id/recipients/export',
  '/points/expire-run',
  '/reports',
  '/exports',
  '/user-security/risk-ips/block',
  '/user-security/risk-ips/unblock',
  '/user-security/risk-devices/block',
  '/user-security/risk-devices/unblock',
  '/user-security/users/:id/revoke-sessions',
  '/user-security/users/:id/unprotect',
], highCostApiLimiter);

/* ---- RBAC ---- */
router.get('/rbac/me', adminAuth, authCtrl.getRbacMe);
router.get('/rbac/permissions', adminAuth, requirePermission('role.manage'), rbacCtrl.listPermissions);
router.get('/rbac/roles', adminAuth, requirePermission('role.manage'), rbacCtrl.listRoles);
router.get('/rbac/admin-users', adminAuth, requirePermission('role.manage'), rbacCtrl.listAdminUsers);
router.get('/rbac/mfa-policy', adminAuth, requirePermission('role.manage'), rbacCtrl.getAdminMfaPolicy);
router.put('/rbac/mfa-policy', adminAuth, requirePermission('role.manage'), rbacCtrl.updateAdminMfaPolicy);
router.get('/rbac/users/:userId/roles', adminAuth, requirePermission('role.manage'), rbacCtrl.getUserRoles);
router.put('/rbac/users/:userId/roles', adminAuth, requirePermission('role.manage'), rbacCtrl.setUserRoles);
router.post('/rbac/roles', adminAuth, requirePermission('role.manage'), rbacCtrl.createRole);
router.put('/rbac/roles/:roleId', adminAuth, requirePermission('role.manage'), rbacCtrl.updateRole);
router.delete('/rbac/roles/:roleId', adminAuth, requirePermission('role.manage'), rbacCtrl.removeRole);
router.post('/rbac/admin-users', adminAuth, requirePermission('role.manage'), rbacCtrl.createAdminUser);
router.get('/rbac/admin-users/:userId/security', adminAuth, requirePermission('role.manage'), rbacCtrl.getAdminUserSecurity);
router.put('/rbac/admin-users/:userId/security/mfa-required', adminAuth, requirePermission('role.manage'), rbacCtrl.setAdminUserMfaRequired);
router.post('/rbac/admin-users/:userId/security/mfa-reset', adminAuth, requirePermission('role.manage'), rbacCtrl.resetAdminUserMfa);
router.post('/rbac/admin-users/:userId/security/trusted-devices/revoke', adminAuth, requirePermission('role.manage'), rbacCtrl.revokeAdminTrustedDevices);
router.post('/rbac/admin-users/:userId/security/trusted-devices/:deviceId/revoke', adminAuth, requirePermission('role.manage'), rbacCtrl.revokeAdminTrustedDevice);
router.put('/rbac/admin-users/:userId/toggle', adminAuth, requirePermission('role.manage'), rbacCtrl.toggleAdminUser);
router.put('/rbac/admin-users/:userId/reset-password', adminAuth, requirePermission('role.manage'), rbacCtrl.resetAdminPassword);
router.delete('/rbac/admin-users/:userId', adminAuth, requirePermission('role.manage'), rbacCtrl.removeAdminUser);
/** 与 DELETE 等价：部分 CDN / 反代未放行 DELETE 时使用 POST */
router.post('/rbac/admin-users/:userId/delete', adminAuth, requirePermission('role.manage'), rbacCtrl.removeAdminUser);

/* ---- Dashboard ---- */
router.get('/events', adminAuth, adminEventCtrl.stream);
router.get('/event-center/events', adminAuth, requireAnyPermission(['event.view', 'event.manage']), adminEventCtrl.list);
router.get('/event-center/summary', adminAuth, requireAnyPermission(['event.view', 'event.manage']), adminEventCtrl.summary);
router.get('/event-center/boss-metrics', adminAuth, requireAnyPermission(['event.view', 'event.manage']), adminEventCtrl.bossMetrics);
router.get('/event-center/rules', adminAuth, requireAnyPermission(['event.rule.manage', 'event.manage']), adminEventCtrl.rules);
router.patch('/event-center/rules/:eventType', adminAuth, requirePermission('event.rule.manage'), adminEventCtrl.updateRule);
router.get('/event-center/events/export', adminAuth, requirePermission('event.manage'), adminEventCtrl.exportEvents);
router.post('/event-center/events/batch/read', adminAuth, requireAnyPermission(['event.view', 'event.manage']), adminEventCtrl.batchRead);
router.post('/event-center/events/batch/acknowledge', adminAuth, requirePermission('event.manage'), adminEventCtrl.batchAcknowledge);
router.post('/event-center/events/batch/ignore', adminAuth, requirePermission('event.manage'), adminEventCtrl.batchIgnore);
router.post('/event-center/events/batch/resolve', adminAuth, requirePermission('event.manage'), adminEventCtrl.batchResolve);
router.post('/event-center/events/batch/complete', adminAuth, requirePermission('event.manage'), adminEventCtrl.batchResolve);
router.post('/event-center/events/batch/assign', adminAuth, requirePermission('event.manage'), adminEventCtrl.batchAssign);
router.get('/event-center/events/:id', adminAuth, requireAnyPermission(['event.view', 'event.manage']), adminEventCtrl.detail);
router.get('/event-center/events/:id/actions', adminAuth, requireAnyPermission(['event.view', 'event.manage']), adminEventCtrl.actions);
router.put('/event-center/events/:id/read', adminAuth, requireAnyPermission(['event.view', 'event.manage']), adminEventCtrl.markRead);
router.put('/event-center/events/:id/hide', adminAuth, requireAnyPermission(['event.view', 'event.manage']), adminEventCtrl.hide);
router.put('/event-center/events/:id/sound-played', adminAuth, requireAnyPermission(['event.view', 'event.manage']), adminEventCtrl.markSoundPlayed);
router.put('/event-center/events/:id/popup-seen', adminAuth, requireAnyPermission(['event.view', 'event.manage']), adminEventCtrl.markPopupSeen);
router.put('/event-center/events/:id/acknowledge', adminAuth, requirePermission('event.manage'), adminEventCtrl.acknowledge);
router.put('/event-center/events/:id/in-progress', adminAuth, requirePermission('event.manage'), adminEventCtrl.startProgress);
router.put('/event-center/events/:id/resolve', adminAuth, requirePermission('event.manage'), adminEventCtrl.resolve);
router.put('/event-center/events/:id/ignore', adminAuth, requirePermission('event.manage'), adminEventCtrl.ignore);
router.put('/event-center/events/:id/assign', adminAuth, requirePermission('event.manage'), adminEventCtrl.assign);
router.get('/dashboard/stats', adminAuth, requirePermission('dashboard.view'), dashboardCtrl.getStats);

/* ---- Client user security ---- */
router.get('/user-security/overview', adminAuth, requireAnyPermission(['user.view', 'event.view', 'event.manage']), userSecurityCtrl.overview);
router.get('/user-security/login-attempts', adminAuth, requireAnyPermission(['user.view', 'event.view', 'event.manage']), userSecurityCtrl.loginAttempts);
router.get('/user-security/events', adminAuth, requireAnyPermission(['user.view', 'event.view', 'event.manage']), userSecurityCtrl.events);
router.get('/user-security/risk-ips', adminAuth, requireAnyPermission(['user.view', 'event.view', 'event.manage']), userSecurityCtrl.riskIps);
router.post('/user-security/risk-ips/block', adminAuth, requirePermission('event.manage'), userSecurityCtrl.blockIp);
router.post('/user-security/risk-ips/unblock', adminAuth, requirePermission('event.manage'), userSecurityCtrl.unblockIp);
router.get('/user-security/risk-devices', adminAuth, requireAnyPermission(['user.view', 'event.view', 'event.manage']), userSecurityCtrl.riskDevices);
router.post('/user-security/risk-devices/block', adminAuth, requirePermission('event.manage'), userSecurityCtrl.blockDevice);
router.post('/user-security/risk-devices/unblock', adminAuth, requirePermission('event.manage'), userSecurityCtrl.unblockDevice);
router.get('/user-security/users/:id/sessions', adminAuth, requireAnyPermission(['user.view', 'event.view', 'event.manage']), userSecurityCtrl.userSessions);
router.post('/user-security/users/:id/revoke-sessions', adminAuth, requirePermission('event.manage'), userSecurityCtrl.revokeUserSessions);
router.post('/user-security/users/:id/unprotect', adminAuth, requirePermission('event.manage'), userSecurityCtrl.unprotectUser);

/* ---- Data safety / Backup & Restore ---- */
router.get('/backups/overview', adminAuth, requirePermission('backup.view'), backupCtrl.overview);
router.get('/backups/health', adminAuth, requirePermission('backup.view'), backupCtrl.health);
router.get('/backups/files', adminAuth, requirePermission('backup.view'), backupCtrl.listFiles);
router.post('/backups/full', adminAuth, requirePermission('backup.create'), backupCtrl.createFullBackup);
router.post('/backups/config', adminAuth, requirePermission('backup.create'), backupCtrl.createConfigBackup);
router.post('/backups/uploads', adminAuth, requirePermission('backup.create'), backupCtrl.createUploadsBackup);
router.get('/backups/alerts', adminAuth, requirePermission('backup.view'), backupCtrl.listAlerts);
router.get('/restore/jobs', adminAuth, requireAnyPermission(['backup.view', 'backup.restore.request']), backupCtrl.listRestoreJobs);
router.post('/restore/jobs', adminAuth, requirePermission('backup.restore.request'), backupCtrl.createRestoreJob);
router.post(
  '/restore/jobs/:id/approve',
  adminAuth,
  requirePermission('backup.restore.approve'),
  backupCtrl.approveRestoreJob,
);
router.post(
  '/restore/jobs/:id/switch',
  adminAuth,
  requirePermission('backup.restore.approve'),
  backupCtrl.switchRestoreJob,
);
router.get('/restore/drills', adminAuth, requirePermission('backup.view'), backupCtrl.listDrillReports);

/* ---- Products ---- */
router.get(
  '/products/export',
  adminAuth,
  requirePermission('product.view'),
  validate({ query: productSchemas.adminProductListQuerySchema }),
  productCtrl.exportCsv,
);
router.post('/products/import/preview', adminAuth, requirePermission('product.manage'), uploadCsv.single('file'), productCtrl.previewImport);
router.post('/products/import', adminAuth, requirePermission('product.manage'), uploadCsv.single('file'), productCtrl.importCsv);
router.get(
  '/products',
  adminAuth,
  requirePermission('product.view'),
  validate({ query: productSchemas.adminProductListQuerySchema }),
  productCtrl.list,
);
router.get(
  '/products/:id',
  adminAuth,
  requirePermission('product.view'),
  validate({ params: productSchemas.adminProductIdParamsSchema }),
  productCtrl.getById,
);
router.post(
  '/products',
  adminAuth,
  requirePermission('product.manage'),
  validate({ body: productSchemas.adminProductCreateBodySchema }),
  productCtrl.create,
);
router.put(
  '/products/:id',
  adminAuth,
  requirePermission('product.manage'),
  validate({ params: productSchemas.adminProductIdParamsSchema, body: productSchemas.adminProductUpdateBodySchema }),
  productCtrl.update,
);
router.put(
  '/products/:id/tags',
  adminAuth,
  requirePermission('product.manage'),
  validate({ params: productSchemas.adminProductIdParamsSchema, body: productSchemas.adminProductTagsBodySchema }),
  productCtrl.updateProductTags,
);
router.patch(
  '/products/:id/status',
  adminAuth,
  requirePermission('product.manage'),
  validate({ params: productSchemas.adminProductIdParamsSchema, body: productSchemas.adminProductPatchStatusBodySchema }),
  productCtrl.patchStatus,
);
router.delete(
  '/products/:id',
  adminAuth,
  requirePermission('product.manage'),
  validate({ params: productSchemas.adminProductIdParamsSchema }),
  productCtrl.remove,
);
router.post(
  '/products/batch-status',
  adminAuth,
  requirePermission('product.manage'),
  validate({ body: productSchemas.adminProductBatchStatusBodySchema }),
  productCtrl.batchUpdateStatus,
);
router.post(
  '/products/batch-delete',
  adminAuth,
  requirePermission('product.manage'),
  validate({ body: productSchemas.adminProductBatchDeleteBodySchema }),
  productCtrl.batchDelete,
);
/** 管理端图片上传：要求具备商品、轮播图或站点配置权限，避免低权限账号滥用上传通道 */
const uploadPermission = requireAnyPermission(['product.manage', 'settings.manage', 'banner.manage']);
router.post('/upload/ticket', adminAuth, uploadPermission, adminUploadCtrl.createTicket);
router.post('/upload/complete', adminAuth, uploadPermission, adminUploadCtrl.completeUpload);
router.post('/upload', adminAuth, uploadPermission, adminUploadCtrl.uploadMiddleware, adminUploadCtrl.uploadFile);
router.post('/upload/multiple', adminAuth, uploadPermission, adminUploadCtrl.uploadMultiple, adminUploadCtrl.uploadFiles);

/* ---- Product Tags ---- */
router.get('/product-tags', adminAuth, requireAnyPermission(['tag.manage', 'product.manage']), productCtrl.listTags);
router.post('/product-tags', adminAuth, requirePermission('tag.manage'), productCtrl.createTag);
router.put('/product-tags/:id', adminAuth, requirePermission('tag.manage'), productCtrl.updateTag);
router.delete('/product-tags/:id', adminAuth, requirePermission('tag.manage'), productCtrl.removeTag);

/* ---- Payments（支付管理）---- */
const onlinePaymentFeature = requireSiteCapability('onlinePaymentEnabled', '本站未启用在线支付');
router.get('/payments/channels', adminAuth, onlinePaymentFeature, requirePermission('payment.manage'), adminPayCtrl.listChannels);
router.put(
  '/payments/channels/:id',
  adminAuth,
  onlinePaymentFeature,
  requirePermission('payment.manage'),
  validate({ params: paySchemas.adminChannelIdParamSchema, body: paySchemas.updateChannelBodySchema }),
  adminPayCtrl.updateChannel,
);
router.get(
  '/payments/orders',
  adminAuth,
  onlinePaymentFeature,
  requirePermission('payment.manage'),
  validate({ query: paySchemas.listAdminQuerySchema }),
  adminPayCtrl.listPaymentOrders,
);
router.get(
  '/payments/events',
  adminAuth,
  onlinePaymentFeature,
  requirePermission('payment.manage'),
  validate({ query: paySchemas.listAdminQuerySchema }),
  adminPayCtrl.listPaymentEvents,
);
router.post(
  '/payments/orders/:orderId/mark-paid',
  adminAuth,
  onlinePaymentFeature,
  requirePermission('payment.manage'),
  validate({ params: paySchemas.adminOrderIdParamSchema, body: paySchemas.markPaidBodySchema }),
  adminPayCtrl.markOrderPaid,
);
router.post(
  '/payments/orders/:orderId/refund',
  adminAuth,
  onlinePaymentFeature,
  requirePermission('payment.manage'),
  validate({ params: paySchemas.adminOrderIdParamSchema, body: paySchemas.refundBodySchema }),
  adminPayCtrl.recordRefund,
);
router.post(
  '/payments/events/:eventId/replay',
  adminAuth,
  onlinePaymentFeature,
  requirePermission('payment.manage'),
  validate({ params: paySchemas.adminEventIdParamSchema }),
  adminPayCtrl.replayEvent,
);
router.get(
  '/payments/reconciliations',
  adminAuth,
  onlinePaymentFeature,
  requirePermission('payment.manage'),
  validate({ query: paySchemas.listAdminQuerySchema }),
  adminPayCtrl.listReconciliations,
);
router.post(
  '/payments/reconciliations',
  adminAuth,
  onlinePaymentFeature,
  requirePermission('payment.manage'),
  validate({ body: paySchemas.createReconciliationBodySchema }),
  adminPayCtrl.createReconciliation,
);

/* ---- Orders ---- */
router.get('/order-events/recent', adminAuth, requirePermission('order.view'), orderEventCtrl.recent);
router.get('/orders/export', adminAuth, requirePermission('order.view'), orderCtrl.exportCsv);
router.get('/orders/summary', adminAuth, requirePermission('order.view'), orderCtrl.summary);
router.get('/checkout-abandonments/reminders/due', adminAuth, requirePermission('order.view'), checkoutAbandonmentCtrl.listDueReminders);
router.post('/checkout-abandonments/:id/reminders/sent', adminAuth, requirePermission('order.update'), checkoutAbandonmentCtrl.markReminderSent);
router.get('/checkout-abandonments', adminAuth, requirePermission('order.view'), checkoutAbandonmentCtrl.list);
router.get('/orders', adminAuth, requirePermission('order.view'), orderCtrl.list);
router.get('/orders/pending-shipments', adminAuth, requirePermission('order.ship'), orderCtrl.listPendingShipments);
router.get('/orders/:id', adminAuth, requirePermission('order.view'), orderCtrl.getById);
router.post(
  '/orders/:id/shortage-adjustment/preview',
  adminAuth,
  requirePermission('order.update'),
  validate({
    params: adminOrderSchemas.adminOrderIdParamsSchema,
    body: adminOrderSchemas.adminShortageAdjustmentBodySchema,
  }),
  orderCtrl.previewShortageAdjustment,
);
router.post(
  '/orders/:id/shortage-adjustment/apply',
  adminAuth,
  requirePermission('order.update'),
  validate({
    params: adminOrderSchemas.adminOrderIdParamsSchema,
    body: adminOrderSchemas.adminShortageAdjustmentBodySchema,
  }),
  orderCtrl.applyShortageAdjustment,
);
router.put(
  '/orders/:id/status',
  adminAuth,
  requirePermission('order.update'),
  validate({
    params: adminOrderSchemas.adminOrderIdParamsSchema,
    body: adminOrderSchemas.adminUpdateOrderStatusBodySchema,
  }),
  orderCtrl.updateStatus,
);
router.put(
  '/orders/:id/ship',
  adminAuth,
  requirePermission('order.ship'),
  validate({
    params: adminOrderSchemas.adminOrderIdParamsSchema,
    body: adminOrderSchemas.adminShipOrderBodySchema,
  }),
  orderCtrl.ship,
);
router.post(
  '/orders/batch-ship',
  adminAuth,
  requirePermission('order.ship'),
  validate({ body: adminOrderSchemas.adminBatchShipBodySchema }),
  orderCtrl.batchShip,
);
router.post('/orders/:id/logistics/refresh', adminAuth, requirePermission('order.ship'), logisticsCtrl.refreshOrderTracking);

/* ---- Inventory Center（SKU 维度）---- */
const inventoryFeature = requireSiteCapability('inventoryEnabled', '本站未启用库存功能');
router.get('/inventory/summary', adminAuth, inventoryFeature, requirePermission('inventory.manage'), inventoryCtrl.summary);
router.get('/inventory/skus', adminAuth, inventoryFeature, requirePermission('inventory.manage'), inventoryCtrl.listSkus);
router.get('/inventory/records', adminAuth, inventoryFeature, requirePermission('inventory.manage'), inventoryCtrl.listRecords);
router.get('/inventory/replenishment-alerts', adminAuth, inventoryFeature, requirePermission('inventory.manage'), inventoryCtrl.listReplenishmentAlerts);
router.post('/inventory/replenishment-alerts/generate', adminAuth, inventoryFeature, requirePermission('inventory.manage'), inventoryCtrl.generateReplenishmentAlerts);
router.post('/inventory/replenishment-alerts/:id/create-purchase-order', adminAuth, inventoryFeature, requirePermission('inventory.manage'), inventoryCtrl.createPurchaseOrderFromAlert);
router.post('/inventory/replenishment-runs/preview', adminAuth, inventoryFeature, requirePermission('inventory.manage'), inventoryCtrl.createSmartReplenishmentPreview);
router.get('/inventory/replenishment-profiles', adminAuth, inventoryFeature, requirePermission('inventory.manage'), inventoryCtrl.listReplenishmentProfiles);
router.post('/inventory/replenishment-profiles/batch', adminAuth, inventoryFeature, requirePermission('inventory.manage'), inventoryCtrl.saveReplenishmentProfiles);
router.post('/inventory/replenishment-runs/:id/apply', adminAuth, inventoryFeature, requirePermission('inventory.manage'), inventoryCtrl.applySmartReplenishmentRun);
router.post('/inventory/replenishment-runs/:id/create-purchase-order', adminAuth, inventoryFeature, requirePermission('inventory.manage'), inventoryCtrl.createPurchaseOrderFromSmartRun);
router.post('/inventory/replenishment-runs/:id/execute-unpack', adminAuth, inventoryFeature, requirePermission('inventory.manage'), inventoryCtrl.executeUnpackForSmartRun);
router.post('/inventory/daily-snapshots/generate', adminAuth, inventoryFeature, requirePermission('inventory.manage'), inventoryCtrl.generateDailyInventorySnapshot);
router.get('/purchase-orders', adminAuth, inventoryFeature, requirePermission('inventory.manage'), inventoryCtrl.listPurchaseOrders);
router.get('/purchase-orders/:id', adminAuth, inventoryFeature, requirePermission('inventory.manage'), inventoryCtrl.getPurchaseOrder);
router.post('/purchase-orders/:id/receive', adminAuth, inventoryFeature, requirePermission('inventory.manage'), inventoryCtrl.receivePurchaseOrder);
router.get('/inventory/pack-rules', adminAuth, inventoryFeature, requirePermission('inventory.manage'), inventoryCtrl.listPackRules);
router.post('/inventory/pack-rules', adminAuth, inventoryFeature, requirePermission('inventory.manage'), inventoryCtrl.createPackRule);
router.patch('/inventory/pack-rules/:id', adminAuth, inventoryFeature, requirePermission('inventory.manage'), inventoryCtrl.updatePackRule);
router.delete('/inventory/pack-rules/:id', adminAuth, inventoryFeature, requirePermission('inventory.manage'), inventoryCtrl.deletePackRule);
router.post('/inventory/conversions/unpack', adminAuth, inventoryFeature, requirePermission('inventory.manage'), inventoryCtrl.unpack);
router.post('/inventory/conversions/assemble', adminAuth, inventoryFeature, requirePermission('inventory.manage'), inventoryCtrl.assemble);
router.get('/inventory/conversions', adminAuth, inventoryFeature, requirePermission('inventory.manage'), inventoryCtrl.listConversions);
router.get('/inventory/conversions/:id', adminAuth, inventoryFeature, requirePermission('inventory.manage'), inventoryCtrl.getConversion);
router.get('/inventory/export', adminAuth, inventoryFeature, requirePermission('inventory.manage'), inventoryCtrl.exportSkusCsv);
router.get('/inventory/records/export', adminAuth, inventoryFeature, requirePermission('inventory.manage'), inventoryCtrl.exportRecordsCsv);
router.post('/inventory/batch-warning-threshold', adminAuth, inventoryFeature, requirePermission('inventory.manage'), inventoryCtrl.batchWarningThreshold);
router.post('/inventory/batch-adjust', adminAuth, inventoryFeature, requirePermission('inventory.manage'), inventoryCtrl.batchAdjust);
router.post('/inventory/skus/:variantId/adjust', adminAuth, inventoryFeature, requirePermission('inventory.manage'), inventoryCtrl.adjustSkuStock);
router.patch('/inventory/skus/:variantId/warning-threshold', adminAuth, inventoryFeature, requirePermission('inventory.manage'), inventoryCtrl.updateSkuWarningThreshold);
router.post(
  '/inventory/products/:productId/adjust',
  adminAuth,
  inventoryFeature,
  requirePermission('inventory.manage'),
  inventoryCtrl.adjustProductStockCompat,
);

/* ---- Marketing Activities ---- */
router.get('/activities', adminAuth, requirePermission('activity.manage'), activityCtrl.list);
router.get('/activities/products/options', adminAuth, requirePermission('activity.manage'), activityCtrl.searchProducts);
router.post('/activities', adminAuth, requirePermission('activity.manage'), activityCtrl.create);
router.post('/activities/validate', adminAuth, requirePermission('activity.manage'), activityCtrl.validateBeforePublish);
router.get('/activities/:id', adminAuth, requirePermission('activity.manage'), activityCtrl.getById);
router.put('/activities/:id', adminAuth, requirePermission('activity.manage'), activityCtrl.update);
router.post('/activities/:id/validate', adminAuth, requirePermission('activity.manage'), activityCtrl.validateBeforePublish);
router.patch('/activities/:id/status', adminAuth, requirePermission('activity.manage'), activityCtrl.updateStatus);
router.delete('/activities/:id', adminAuth, requirePermission('activity.manage'), activityCtrl.remove);

/* ---- Home Ops（首页导航 / 公告）---- */
router.get('/home-ops/settings', adminAuth, requirePermission('home_ops.manage'), homeOpsCtrl.getSettings);
router.put('/home-ops/settings', adminAuth, requirePermission('home_ops.manage'), homeOpsCtrl.updateSettings);
router.get('/home-ops/nav-items', adminAuth, requirePermission('home_ops.manage'), homeOpsCtrl.listNavItems);
router.get('/home-ops/support-channels', adminAuth, requirePermission('home_ops.manage'), homeOpsCtrl.listSupportChannels);
router.post('/home-ops/nav-items', adminAuth, requirePermission('home_ops.manage'), homeOpsCtrl.createNavItem);
router.put('/home-ops/nav-items/sort', adminAuth, requirePermission('home_ops.manage'), homeOpsCtrl.sortNavItems);
router.put('/home-ops/nav-items/:id', adminAuth, requirePermission('home_ops.manage'), homeOpsCtrl.updateNavItem);
router.delete('/home-ops/nav-items/:id', adminAuth, requirePermission('home_ops.manage'), homeOpsCtrl.deleteNavItem);

/* ---- Member Levels ---- */
const memberLevelFeature = requireSiteCapability('memberLevelEnabled', '本站未启用会员等级功能');
router.get('/member-levels', adminAuth, memberLevelFeature, requireAnyPermission(['user.view', 'member_level.manage']), memberLevelCtrl.list);
router.post('/member-levels', adminAuth, memberLevelFeature, requirePermission('member_level.manage'), memberLevelCtrl.create);
router.put('/member-levels/:id', adminAuth, memberLevelFeature, requirePermission('member_level.manage'), memberLevelCtrl.update);
router.delete('/member-levels/:id', adminAuth, memberLevelFeature, requirePermission('member_level.manage'), memberLevelCtrl.remove);
router.post('/member-levels/recalculate', adminAuth, memberLevelFeature, requirePermission('member_level.manage'), memberLevelCtrl.recalcAllUserLevels);
router.post('/member-levels/recalculate/:userId', adminAuth, memberLevelFeature, requirePermission('member_level.manage'), memberLevelCtrl.recalcUserLevel);
router.put('/users/:userId/member-level', adminAuth, memberLevelFeature, requirePermission('member_level.manage'), memberLevelCtrl.assignUserLevel);
router.delete('/users/:userId/member-level-lock', adminAuth, memberLevelFeature, requirePermission('member_level.manage'), memberLevelCtrl.unlockUserLevel);

/* ---- Users ---- */
router.get('/users/export', adminAuth, requirePermission('user.view'), userCtrl.exportCsv);
router.get('/users', adminAuth, requirePermission('user.view'), userQueryLimiter, paginationCap({ max: 100, mode: 'clamp' }), userCtrl.list);
router.get('/user-tags', adminAuth, requirePermission('user.view'), userQueryLimiter, userCtrl.listTags);
router.post('/user-tags', adminAuth, requirePermission('user.update'), userCtrl.createTag);
router.put('/user-tags/:tagId', adminAuth, requirePermission('user.update'), userCtrl.updateTag);
router.get('/user-tags/:tagId/impact', adminAuth, requirePermission('user.view'), userCtrl.tagImpact);
router.delete('/user-tags/:tagId', adminAuth, requirePermission('user.update'), userCtrl.deleteTag);
router.put('/users/:id/tags', adminAuth, requirePermission('user.update'), userCtrl.setTags);
router.put('/users/tags/batch', adminAuth, requirePermission('user.update'), userCtrl.batchSetTag);
router.post('/users/:id/reset-password', adminAuth, requirePermission('user.update'), userCtrl.resetPassword);
router.post('/users/:id/unbind-wechat', adminAuth, requirePermission('user.update'), userCtrl.unbindWechat);
router.get('/users/:id', adminAuth, requirePermission('user.view'), userQueryLimiter, userCtrl.getById);
router.put('/users/:id', adminAuth, requirePermission('user.update'), userCtrl.update);
router.put('/users/:id/account-status', adminAuth, requirePermission('user.update'), userCtrl.updateAccountStatus);
router.put('/users/:id/restrictions', adminAuth, requirePermission('user.update'), userCtrl.updateRestrictions);
router.get('/users/:id/status-overview', adminAuth, requirePermission('user.view'), userCtrl.getStatusOverview);
router.put('/users/:id/subordinate', adminAuth, requirePermission('user.update'), userCtrl.updateSubordinate);
router.put('/users/:userId/points', adminAuth, requireSiteCapability('pointsEnabled', '本站未启用积分功能'), requirePermission('user.points'), userCtrl.adjustPoints);

/* ---- User feedback ---- */
router.get('/feedback', adminAuth, requirePermission('user.view'), userQueryLimiter, paginationCap({ max: 100, mode: 'clamp' }), validate({ query: adminFeedbackSchemas.adminFeedbackListQuerySchema }), feedbackCtrl.list);
router.patch('/feedback/:id', adminAuth, requirePermission('user.update'), validate({ params: adminFeedbackSchemas.feedbackIdParamSchema, body: adminFeedbackSchemas.updateAdminFeedbackBodySchema }), feedbackCtrl.update);

/* ---- Categories ---- */
router.get('/categories', adminAuth, requirePermission('category.manage'), categoryCtrl.list);
router.post('/categories', adminAuth, requirePermission('category.manage'), categoryCtrl.create);
router.put('/categories/sort', adminAuth, requirePermission('category.manage'), categoryCtrl.sort);
router.put('/categories/:id', adminAuth, requirePermission('category.manage'), categoryCtrl.update);
router.delete('/categories/:id', adminAuth, requirePermission('category.manage'), categoryCtrl.remove);

/* ---- Coupons ---- */
const couponFeature = requireSiteCapability('couponEnabled', '本站未启用优惠券功能');
router.get('/coupons', adminAuth, couponFeature, requirePermission('coupon.view'), couponCtrl.list);
router.post('/coupons', adminAuth, couponFeature, requirePermission('coupon.manage'), couponCtrl.create);
router.put('/coupons/:id', adminAuth, couponFeature, requirePermission('coupon.manage'), couponCtrl.update);
router.delete('/coupons/:id', adminAuth, couponFeature, requirePermission('coupon.manage'), couponCtrl.remove);
router.post('/coupons/:id/pause-claim', adminAuth, couponFeature, requirePermission('coupon.manage'), couponCtrl.pauseClaim);
router.post('/coupons/:id/disable-use', adminAuth, couponFeature, requirePermission('coupon.manage'), couponCtrl.disableUse);
router.post('/coupons/:id/archive', adminAuth, couponFeature, requirePermission('coupon.manage'), couponCtrl.archive);
router.post('/coupons/:id/invalidate-user-coupons', adminAuth, couponFeature, requirePermission('coupon.manage'), couponCtrl.invalidateUserCoupons);
router.post('/coupons/:id/issue-by-tag', adminAuth, couponFeature, requirePermission('coupon.manage'), couponCtrl.issueByTag);
router.get('/coupon-campaigns', adminAuth, couponFeature, requirePermission('coupon.view'), couponCampaignCtrl.list);
router.post('/coupon-campaigns', adminAuth, couponFeature, requirePermission('coupon.manage'), couponCampaignCtrl.create);
router.get('/coupon-campaigns/:id', adminAuth, couponFeature, requirePermission('coupon.view'), couponCampaignCtrl.getById);
router.put('/coupon-campaigns/:id', adminAuth, couponFeature, requirePermission('coupon.manage'), couponCampaignCtrl.update);
router.patch('/coupon-campaigns/:id/status', adminAuth, couponFeature, requirePermission('coupon.manage'), couponCampaignCtrl.updateStatus);
router.delete('/coupon-campaigns/:id', adminAuth, couponFeature, requirePermission('coupon.manage'), couponCampaignCtrl.remove);
router.get('/coupon-records', adminAuth, couponFeature, requirePermission('coupon.view'), couponCtrl.listAllRecords);
router.get('/coupons/:couponId/records', adminAuth, couponFeature, requirePermission('coupon.view'), couponCtrl.listRecordsByCoupon);

/* ---- Returns ---- */
router.get('/returns', adminAuth, requirePermission('return.view'), returnCtrl.list);
router.get('/returns/:id', adminAuth, requirePermission('return.view'), returnCtrl.getById);
router.put('/returns/:id', adminAuth, requirePermission('return.handle'), returnCtrl.updateStatus);
router.put('/returns/:id/approve', adminAuth, requirePermission('return.handle'), returnCtrl.approve);
router.put('/returns/:id/reject', adminAuth, requirePermission('return.handle'), returnCtrl.reject);

/* ---- Reviews ---- */
const reviewView = requireAnyPermission(['review.view', 'review.manage']);
const reviewReply = requireAnyPermission(['review.reply', 'review.manage']);
const reviewModerate = requireAnyPermission(['review.moderate', 'review.manage']);
const reviewFeature = requireAnyPermission(['review.feature', 'review.manage']);
const reviewDelete = requireAnyPermission(['review.delete', 'review.manage']);

const reviewFeatureEnabled = requireSiteCapability('reviewEnabled', '本站未启用评价功能');
router.get('/reviews', adminAuth, reviewFeatureEnabled, reviewView, reviewCtrl.list);
router.get('/reviews/:id', adminAuth, reviewFeatureEnabled, reviewView, reviewCtrl.getDetail);
router.put('/reviews/:id/toggle', adminAuth, reviewFeatureEnabled, reviewModerate, reviewCtrl.toggleVisibility);
router.put('/reviews/:id/approve', adminAuth, reviewFeatureEnabled, reviewModerate, reviewCtrl.approve);
router.put('/reviews/:id/reject', adminAuth, reviewFeatureEnabled, reviewModerate, reviewCtrl.reject);
router.put('/reviews/:id/feature', adminAuth, reviewFeatureEnabled, reviewFeature, reviewCtrl.toggleFeatured);
router.put('/reviews/:id/reply', adminAuth, reviewFeatureEnabled, reviewReply, reviewCtrl.reply);
router.put('/reviews/:id/complaint', adminAuth, reviewFeatureEnabled, reviewModerate, reviewCtrl.updateComplaint);
router.delete('/reviews/:id', adminAuth, reviewFeatureEnabled, reviewDelete, reviewCtrl.remove);
router.put('/reviews/:id/restore', adminAuth, reviewFeatureEnabled, reviewDelete, reviewCtrl.restore);
router.delete('/reviews/:id/permanent', adminAuth, reviewFeatureEnabled, reviewDelete, reviewCtrl.permanentDelete);
router.post('/reviews/batch-hide', adminAuth, reviewFeatureEnabled, reviewModerate, reviewCtrl.batchHide);
router.post('/reviews/batch-delete', adminAuth, reviewFeatureEnabled, reviewDelete, reviewCtrl.batchDelete);

/* ---- Banners ---- */
router.get('/banners', adminAuth, requirePermission('banner.manage'), bannerCtrl.list);
router.post('/banners', adminAuth, requirePermission('banner.manage'), bannerCtrl.create);
router.put('/banners/:id', adminAuth, requirePermission('banner.manage'), bannerCtrl.update);
router.delete('/banners/:id', adminAuth, requirePermission('banner.manage'), bannerCtrl.remove);

/* ---- Notifications ---- */
router.get('/notifications', adminAuth, requireAnyPermission(['notification.view', 'notification.manage']), notificationCtrl.list);
router.get('/notifications/summary', adminAuth, requireAnyPermission(['notification.view', 'notification.manage']), notificationCtrl.summary);
router.get('/notifications/templates', adminAuth, requireAnyPermission(['notification.template', 'notification.manage']), notificationCtrl.templates);
router.get('/notifications/trigger-settings', adminAuth, requireAnyPermission(['notification.trigger', 'notification.manage']), notificationCtrl.triggerSettings);
router.get('/notifications/user-candidates', adminAuth, requireAnyPermission(['notification.create', 'notification.send', 'notification.manage']), notificationCtrl.userCandidates);
router.post('/notifications/resolve-users', adminAuth, requireAnyPermission(['notification.create', 'notification.send', 'notification.manage']), notificationCtrl.resolveUsers);
router.post('/notifications/audience-estimate', adminAuth, requireAnyPermission(['notification.create', 'notification.send', 'notification.manage']), notificationCtrl.estimateAudience);
router.put('/notifications/trigger-settings', adminAuth, requireAnyPermission(['notification.trigger', 'notification.manage']), notificationCtrl.updateTriggerSettings);
router.post('/notifications/trigger-settings/preview', adminAuth, requireAnyPermission(['notification.trigger', 'notification.manage']), notificationCtrl.previewTriggerRule);
router.post('/notifications/trigger-settings/test-send', adminAuth, requireAnyPermission(['notification.trigger', 'notification.manage']), notificationCtrl.testSendTriggerRule);
router.post('/notifications', adminAuth, requireAnyPermission(['notification.send', 'notification.manage']), notificationCtrl.send);
router.post('/notifications/drafts', adminAuth, requireAnyPermission(['notification.create', 'notification.manage']), notificationCtrl.draft);
router.get('/notifications/:id', adminAuth, requireAnyPermission(['notification.view', 'notification.manage']), notificationCtrl.detail);
router.get('/notifications/:id/recipients/export', adminAuth, requireAnyPermission(['notification.view', 'notification.manage']), notificationCtrl.exportRecipientsCsv);
router.put('/notifications/:id/publish', adminAuth, requireAnyPermission(['notification.send', 'notification.manage']), notificationCtrl.publish);
router.delete('/notifications/:id', adminAuth, requireAnyPermission(['notification.manage', 'notification.create']), notificationCtrl.remove);
router.delete('/notifications/:id/draft', adminAuth, requireAnyPermission(['notification.create', 'notification.manage']), notificationCtrl.deleteDraft);
router.put('/notifications/:id/cancel', adminAuth, requireAnyPermission(['notification.send', 'notification.manage']), notificationCtrl.cancelScheduled);
router.put('/notifications/:id/revoke', adminAuth, requireAnyPermission(['notification.revoke', 'notification.manage']), notificationCtrl.revokeSent);

/* ---- Invites ---- */
router.get('/invites', adminAuth, requirePermission('invite.view'), inviteCtrl.list);
router.get('/rewards/records', adminAuth, requirePermission('referral.manage'), rewardCtrl.listRecords);

/* ---- Settings: referral / points / site / content ---- */
router.get('/referral-rules', adminAuth, requirePermission('referral.manage'), settingsCtrl.listReferral);
router.put('/referral-rules/:id', adminAuth, requirePermission('referral.manage'), settingsCtrl.updateReferral);
router.get('/rewards/settings', adminAuth, requirePermission('referral.manage'), settingsCtrl.getRewardSettings);
router.put('/rewards/settings', adminAuth, requirePermission('referral.manage'), settingsCtrl.updateRewardSettings);
const pointsFeature = requireSiteCapability('pointsEnabled', '本站未启用积分功能');
router.get('/points/rules', adminAuth, pointsFeature, requirePermission('points.manage'), settingsCtrl.listPoints);
router.put('/points/rules/:id', adminAuth, pointsFeature, requirePermission('points.manage'), settingsCtrl.updatePoints);
router.get('/points/settings', adminAuth, pointsFeature, requirePermission('points.manage'), pointsCtrl.getSettings);
router.put('/points/settings', adminAuth, pointsFeature, requirePermission('points.manage'), pointsCtrl.updateSettings);
router.get('/points/product-rules', adminAuth, pointsFeature, requirePermission('points.manage'), pointsCtrl.listProductRules);
router.post('/points/product-rules', adminAuth, pointsFeature, requirePermission('points.manage'), pointsCtrl.createProductRule);
router.put('/points/product-rules/:id', adminAuth, pointsFeature, requirePermission('points.manage'), pointsCtrl.updateProductRule);
router.delete('/points/product-rules/:id', adminAuth, pointsFeature, requirePermission('points.manage'), pointsCtrl.deleteProductRule);
router.get('/points/records', adminAuth, pointsFeature, requirePermission('points.manage'), pointsCtrl.listRecords);
router.post('/points/expire-run', adminAuth, pointsFeature, requirePermission('points.manage'), pointsCtrl.runPointsExpireJob);
const pointsGiftCtrl = require('../controller/adminPointsGift.controller');
router.get('/points/gift-items', adminAuth, pointsFeature, requirePermission('points.manage'), pointsGiftCtrl.listGiftItems);
router.post('/points/gift-items', adminAuth, pointsFeature, requirePermission('points.manage'), pointsGiftCtrl.createGiftItem);
router.put('/points/gift-items/:id', adminAuth, pointsFeature, requirePermission('points.manage'), pointsGiftCtrl.updateGiftItem);
router.delete('/points/gift-items/:id', adminAuth, pointsFeature, requirePermission('points.manage'), pointsGiftCtrl.deleteGiftItem);
router.get('/points/gift-redemptions', adminAuth, pointsFeature, requirePermission('points.manage'), pointsGiftCtrl.listRedemptions);
router.get('/settings', adminAuth, requirePermission('settings.manage'), settingsCtrl.getSite);
router.put('/settings', adminAuth, requirePermission('settings.manage'), settingsCtrl.updateSite);
router.get('/settings/features', adminAuth, requirePermission('settings.manage'), settingsCtrl.getFeatures);
router.put('/settings/features', adminAuth, requirePermission('settings.manage'), settingsCtrl.updateFeatures);
router.get('/telegram/status', adminAuth, requirePermission('settings.manage'), telegramCtrl.getStatus);
router.get('/telegram/settings', adminAuth, requirePermission('settings.manage'), telegramCtrl.getSettings);
router.put('/telegram/settings', adminAuth, requirePermission('settings.manage'), telegramCtrl.updateSettings);
router.post('/telegram/preview', adminAuth, requirePermission('settings.manage'), telegramCtrl.previewMessage);
router.get('/telegram/logs', adminAuth, requirePermission('settings.manage'), telegramCtrl.listLogs);
router.post('/telegram/test', adminAuth, requirePermission('settings.manage'), telegramCtrl.testSend);
router.post(
  '/settings/assets/:key',
  adminAuth,
  requirePermission('settings.manage'),
  settingsCtrl.uploadSiteAssetMiddleware,
  settingsCtrl.uploadSiteAsset,
);
router.put('/system/theme', adminAuth, requirePermission('settings.manage'), themeCtrl.updateTheme);
router.put('/system/theme/skins', adminAuth, requirePermission('settings.manage'), themeCtrl.updateThemeSkins);
router.get('/content', adminAuth, requirePermission('content.manage'), settingsCtrl.listContent);
router.post('/content', adminAuth, requirePermission('content.manage'), settingsCtrl.createContent);
router.put('/content/:id', adminAuth, requirePermission('content.manage'), settingsCtrl.updateContent);

/* ---- Shipping ---- */
const shippingFeature = requireSiteCapability('shippingEnabled', '本站未启用配送功能');
router.get('/shipping/templates', adminAuth, shippingFeature, requirePermission('shipping.manage'), shippingCtrl.listTemplates);
router.post('/shipping/templates', adminAuth, shippingFeature, requirePermission('shipping.manage'), shippingCtrl.createTemplate);
router.put('/shipping/templates/:id', adminAuth, shippingFeature, requirePermission('shipping.manage'), shippingCtrl.updateTemplate);
router.delete('/shipping/templates/:id', adminAuth, shippingFeature, requirePermission('shipping.manage'), shippingCtrl.removeTemplate);
router.get('/shipping/settings', adminAuth, shippingFeature, requirePermission('shipping.manage'), shippingCtrl.getSettings);
router.put('/shipping/settings', adminAuth, shippingFeature, requirePermission('shipping.manage'), shippingCtrl.updateSettings);

/* ---- Reports / 数据中心 ---- */
router.get('/reports/export', adminAuth, requirePermission('report.export'), reportCtrl.exportByType);
router.get('/reports/overview', adminAuth, requirePermission('report.view'), reportCtrl.getOverview);
router.get('/reports/sales/daily', adminAuth, requirePermission('report.view'), reportCtrl.getSalesDaily);
router.get('/reports/sales/monthly', adminAuth, requirePermission('report.view'), reportCtrl.getSalesMonthly);
router.get('/reports/profit/daily', adminAuth, requirePermission('report.view'), reportCtrl.getProfitDaily);
router.get('/reports/profit/monthly', adminAuth, requirePermission('report.view'), reportCtrl.getProfitMonthly);
router.get('/reports/profit/export', adminAuth, requirePermission('report.export'), reportCtrl.exportProfit);
router.get('/reports/products/analysis', adminAuth, requirePermission('report.view'), reportCtrl.getProductsAnalysis);
router.get('/reports/categories/analysis', adminAuth, requirePermission('report.view'), reportCtrl.getCategoriesAnalysis);
router.get('/reports/orders/analysis', adminAuth, requirePermission('report.view'), reportCtrl.getOrdersAnalysis);
router.get('/reports/customers/analysis', adminAuth, requirePermission('report.view'), reportCtrl.getCustomersAnalysis);
router.get('/reports/activities/analysis', adminAuth, requirePermission('report.view'), reportCtrl.getActivitiesAnalysis);
router.get('/reports/coupons/analysis', adminAuth, couponFeature, requirePermission('report.view'), reportCtrl.getCouponsAnalysis);
router.get('/reports/inventory/analysis', adminAuth, inventoryFeature, requirePermission('report.view'), reportCtrl.getInventoryAnalysis);
router.get('/reports/search/analysis', adminAuth, requirePermission('report.view'), reportCtrl.getSearchAnalysis);
router.get('/reports/traffic', adminAuth, requireSiteCapability('trafficAnalyticsEnabled', '流量分析功能已关闭'), requirePermission('report.view'), reportCtrl.getTrafficAnalysis);

// 兼容旧接口
router.get('/reports/sales/export', adminAuth, requirePermission('report.export'), reportCtrl.exportByType);
router.get('/reports/users/export', adminAuth, requirePermission('report.export'), reportCtrl.exportByType);
router.get('/reports/products/export', adminAuth, requirePermission('report.export'), reportCtrl.exportByType);
router.get('/reports/sales', adminAuth, requirePermission('report.view'), reportCtrl.getSalesDaily);
router.get('/reports/users', adminAuth, requirePermission('report.view'), reportCtrl.getCustomersAnalysis);
router.get('/reports/products', adminAuth, requirePermission('report.view'), reportCtrl.getProductsAnalysis);
router.get('/reports/home-engagement', adminAuth, requirePermission('report.view'), reportCtrl.getOverview);

router.get('/expenses', adminAuth, requirePermission('report.view'), reportCtrl.listOperatingExpenses);
router.post('/expenses', adminAuth, requirePermission('report.view'), reportCtrl.createOperatingExpense);
router.put('/expenses/:id', adminAuth, requirePermission('report.view'), reportCtrl.updateOperatingExpense);
router.delete('/expenses/:id', adminAuth, requirePermission('report.view'), reportCtrl.deleteOperatingExpense);

/* ---- Export Center ---- */
router.post('/exports', adminAuth, requirePermission('report.export'), exportCtrl.create);
router.get('/exports', adminAuth, requirePermission('report.export'), exportCtrl.list);
router.get('/exports/:id/download', adminAuth, requirePermission('report.export'), exportCtrl.download);

/* ---- Recycle Bin ---- */
router.get('/recycle-bin', adminAuth, requirePermission('recycle_bin.manage'), recycleBinCtrl.list);
router.put('/recycle-bin/:id/restore', adminAuth, requirePermission('recycle_bin.manage'), recycleBinCtrl.restore);
router.post('/recycle-bin/:id/permanent-delete', adminAuth, requirePermission('recycle_bin.manage'), recycleBinCtrl.permanentDelete);

/* ---- Logs ---- */
router.get('/audit-logs', adminAuth, requirePermission('audit.view'), logCtrl.listAuditLogs);
router.get('/security/alerts', adminAuth, requirePermission('audit.view'), logCtrl.listSecurityAlerts);

module.exports = router;

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
const adminAuth = require('../../middleware/adminAuth');
const requirePermission = adminAuth.requirePermission;
const requireAnyPermission = adminAuth.requireAnyPermission;
const { userQueryLimiter } = require('../../middleware/rateLimiters');
const { paginationCap } = require('../../middleware/paginationCap');
const { validate } = require('../../middleware/validate');

const authCtrl = require('./controller/adminAuth.controller');
const dashboardCtrl = require('./controller/adminDashboard.controller');
const productCtrl = require('./controller/adminProduct.controller');
const orderCtrl = require('./controller/adminOrder.controller');
const checkoutAbandonmentCtrl = require('./controller/adminCheckoutAbandonment.controller');
const userCtrl = require('./controller/adminUser.controller');
const categoryCtrl = require('./controller/adminCategory.controller');
const couponCtrl = require('./controller/adminCoupon.controller');
const returnCtrl = require('./controller/adminReturn.controller');
const reviewCtrl = require('./controller/adminReview.controller');
const bannerCtrl = require('./controller/adminBanner.controller');
const notificationCtrl = require('./controller/adminNotification.controller');
const inviteCtrl = require('./controller/adminInvite.controller');
const rewardCtrl = require('./controller/adminReward.controller');
const pointsCtrl = require('./controller/adminPoints.controller');
const logCtrl = require('./controller/adminLog.controller');
const rbacCtrl = require('./controller/adminRbac.controller');
const shippingCtrl = require('./controller/adminShipping.controller');
const reportCtrl = require('./controller/adminReport.controller');
const settingsCtrl = require('./controller/adminSettings.controller');
const themeCtrl = require('./controller/adminTheme.controller');
const exportCtrl = require('./controller/adminExport.controller');
const recycleBinCtrl = require('./controller/adminRecycleBin.controller');
const adminPayCtrl = require('../payment/adminPayments.controller');
const logisticsCtrl = require('../logistics/logistics.controller');
const inventoryCtrl = require('./controller/adminInventory.controller');
const activityCtrl = require('./controller/adminActivity.controller');
const homeOpsCtrl = require('./controller/adminHomeOps.controller');
const memberLevelCtrl = require('./controller/adminMemberLevel.controller');
const paySchemas = require('../payment/payments.schemas');
const productSchemas = require('./schemas/adminProduct.schemas');
const userUploadCtrl = require('../user/upload.controller');

const uploadCsv = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

const router = Router();

/* ---- Auth & Account ---- */
router.post('/auth/login', authCtrl.login);
router.post('/auth/refresh', authCtrl.refresh);
router.post('/auth/logout', adminAuth, authCtrl.logout);
router.get('/account/profile', adminAuth, authCtrl.getProfile);
router.put('/account/profile', adminAuth, authCtrl.updateProfile);
router.put('/account/password', adminAuth, authCtrl.changePassword);

/* ---- RBAC ---- */
router.get('/rbac/me', adminAuth, authCtrl.getRbacMe);
router.get('/rbac/permissions', adminAuth, requirePermission('role.manage'), rbacCtrl.listPermissions);
router.get('/rbac/roles', adminAuth, requirePermission('role.manage'), rbacCtrl.listRoles);
router.get('/rbac/admin-users', adminAuth, requirePermission('role.manage'), rbacCtrl.listAdminUsers);
router.get('/rbac/users/:userId/roles', adminAuth, requirePermission('role.manage'), rbacCtrl.getUserRoles);
router.put('/rbac/users/:userId/roles', adminAuth, requirePermission('role.manage'), rbacCtrl.setUserRoles);
router.post('/rbac/roles', adminAuth, requirePermission('role.manage'), rbacCtrl.createRole);
router.put('/rbac/roles/:roleId', adminAuth, requirePermission('role.manage'), rbacCtrl.updateRole);
router.delete('/rbac/roles/:roleId', adminAuth, requirePermission('role.manage'), rbacCtrl.removeRole);
router.post('/rbac/admin-users', adminAuth, requirePermission('role.manage'), rbacCtrl.createAdminUser);
router.put('/rbac/admin-users/:userId/toggle', adminAuth, requirePermission('role.manage'), rbacCtrl.toggleAdminUser);
router.put('/rbac/admin-users/:userId/reset-password', adminAuth, requirePermission('role.manage'), rbacCtrl.resetAdminPassword);
router.delete('/rbac/admin-users/:userId', adminAuth, requirePermission('role.manage'), rbacCtrl.removeAdminUser);
/** 与 DELETE 等价：部分 CDN / 反代未放行 DELETE 时使用 POST */
router.post('/rbac/admin-users/:userId/delete', adminAuth, requirePermission('role.manage'), rbacCtrl.removeAdminUser);

/* ---- Dashboard ---- */
router.get('/dashboard/stats', adminAuth, requirePermission('dashboard.view'), dashboardCtrl.getStats);
router.get('/dashboard/chart', adminAuth, requirePermission('dashboard.view'), dashboardCtrl.getChart);

/* ---- Products ---- */
router.get(
  '/products/export',
  adminAuth,
  requirePermission('product.view'),
  validate({ query: productSchemas.adminProductListQuerySchema }),
  productCtrl.exportCsv,
);
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
/** 管理端图片上传：已登录管理员即可（避免仅 banner/settings 权限角色无法上传） */
const userUploadPresignCtrl = require('../user/uploadPresign.controller');
router.post('/upload/ticket', adminAuth, userUploadPresignCtrl.createTicket);
router.post('/upload/complete', adminAuth, userUploadPresignCtrl.completeUpload);
router.post('/upload', adminAuth, userUploadCtrl.uploadMiddleware, userUploadCtrl.uploadFile);
router.post('/upload/multiple', adminAuth, userUploadCtrl.uploadMultiple, userUploadCtrl.uploadFiles);

/* ---- Product Tags ---- */
router.get('/product-tags', adminAuth, requireAnyPermission(['tag.manage', 'product.manage']), productCtrl.listTags);
router.post('/product-tags', adminAuth, requirePermission('tag.manage'), productCtrl.createTag);
router.put('/product-tags/:id', adminAuth, requirePermission('tag.manage'), productCtrl.updateTag);
router.delete('/product-tags/:id', adminAuth, requirePermission('tag.manage'), productCtrl.removeTag);

/* ---- Payments（支付管理）---- */
router.get('/payments/channels', adminAuth, requirePermission('payment.manage'), adminPayCtrl.listChannels);
router.put(
  '/payments/channels/:id',
  adminAuth,
  requirePermission('payment.manage'),
  validate({ params: paySchemas.adminChannelIdParamSchema, body: paySchemas.updateChannelBodySchema }),
  adminPayCtrl.updateChannel,
);
router.get(
  '/payments/orders',
  adminAuth,
  requirePermission('payment.manage'),
  validate({ query: paySchemas.listAdminQuerySchema }),
  adminPayCtrl.listPaymentOrders,
);
router.get(
  '/payments/events',
  adminAuth,
  requirePermission('payment.manage'),
  validate({ query: paySchemas.listAdminQuerySchema }),
  adminPayCtrl.listPaymentEvents,
);
router.post(
  '/payments/orders/:orderId/mark-paid',
  adminAuth,
  requirePermission('payment.manage'),
  validate({ params: paySchemas.adminOrderIdParamSchema, body: paySchemas.markPaidBodySchema }),
  adminPayCtrl.markOrderPaid,
);
router.post(
  '/payments/orders/:orderId/refund',
  adminAuth,
  requirePermission('payment.manage'),
  validate({ params: paySchemas.adminOrderIdParamSchema, body: paySchemas.refundBodySchema }),
  adminPayCtrl.recordRefund,
);
router.post(
  '/payments/events/:eventId/replay',
  adminAuth,
  requirePermission('payment.manage'),
  validate({ params: paySchemas.adminEventIdParamSchema }),
  adminPayCtrl.replayEvent,
);
router.get(
  '/payments/reconciliations',
  adminAuth,
  requirePermission('payment.manage'),
  validate({ query: paySchemas.listAdminQuerySchema }),
  adminPayCtrl.listReconciliations,
);
router.post(
  '/payments/reconciliations',
  adminAuth,
  requirePermission('payment.manage'),
  validate({ body: paySchemas.createReconciliationBodySchema }),
  adminPayCtrl.createReconciliation,
);

/* ---- Orders ---- */
router.get('/orders/export', adminAuth, requirePermission('order.view'), orderCtrl.exportCsv);
router.get('/checkout-abandonments/reminders/due', adminAuth, requirePermission('order.view'), checkoutAbandonmentCtrl.listDueReminders);
router.post('/checkout-abandonments/:id/reminders/sent', adminAuth, requirePermission('order.update'), checkoutAbandonmentCtrl.markReminderSent);
router.get('/checkout-abandonments', adminAuth, requirePermission('order.view'), checkoutAbandonmentCtrl.list);
router.get('/orders', adminAuth, requirePermission('order.view'), orderCtrl.list);
router.get('/orders/pending-shipments', adminAuth, requirePermission('order.ship'), orderCtrl.listPendingShipments);
router.get('/orders/:id', adminAuth, requirePermission('order.view'), orderCtrl.getById);
router.put('/orders/:id/status', adminAuth, requirePermission('order.update'), orderCtrl.updateStatus);
router.put('/orders/:id/ship', adminAuth, requirePermission('order.ship'), orderCtrl.ship);
router.post('/orders/batch-ship', adminAuth, requirePermission('order.ship'), orderCtrl.batchShip);
router.post('/orders/:id/logistics/refresh', adminAuth, requirePermission('order.ship'), logisticsCtrl.refreshOrderTracking);

/* ---- Inventory Center（SKU 维度）---- */
router.get('/inventory/summary', adminAuth, requirePermission('inventory.manage'), inventoryCtrl.summary);
router.get('/inventory/skus', adminAuth, requirePermission('inventory.manage'), inventoryCtrl.listSkus);
router.get('/inventory/records', adminAuth, requirePermission('inventory.manage'), inventoryCtrl.listRecords);
router.get('/inventory/export', adminAuth, requirePermission('inventory.manage'), inventoryCtrl.exportSkusCsv);
router.get('/inventory/records/export', adminAuth, requirePermission('inventory.manage'), inventoryCtrl.exportRecordsCsv);
router.post('/inventory/batch-warning-threshold', adminAuth, requirePermission('inventory.manage'), inventoryCtrl.batchWarningThreshold);
router.post('/inventory/batch-adjust', adminAuth, requirePermission('inventory.manage'), inventoryCtrl.batchAdjust);
router.post('/inventory/skus/:variantId/adjust', adminAuth, requirePermission('inventory.manage'), inventoryCtrl.adjustSkuStock);
router.patch('/inventory/skus/:variantId/warning-threshold', adminAuth, requirePermission('inventory.manage'), inventoryCtrl.updateSkuWarningThreshold);
router.post(
  '/inventory/products/:productId/adjust',
  adminAuth,
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
router.post('/home-ops/nav-items', adminAuth, requirePermission('home_ops.manage'), homeOpsCtrl.createNavItem);
router.put('/home-ops/nav-items/:id', adminAuth, requirePermission('home_ops.manage'), homeOpsCtrl.updateNavItem);
router.delete('/home-ops/nav-items/:id', adminAuth, requirePermission('home_ops.manage'), homeOpsCtrl.deleteNavItem);

/* ---- Member Levels ---- */
router.get('/member-levels', adminAuth, requirePermission('member_level.manage'), memberLevelCtrl.list);
router.post('/member-levels', adminAuth, requirePermission('member_level.manage'), memberLevelCtrl.create);
router.put('/member-levels/:id', adminAuth, requirePermission('member_level.manage'), memberLevelCtrl.update);
router.delete('/member-levels/:id', adminAuth, requirePermission('member_level.manage'), memberLevelCtrl.remove);
router.post('/member-levels/recalculate', adminAuth, requirePermission('member_level.manage'), memberLevelCtrl.recalcAllUserLevels);
router.post('/member-levels/recalculate/:userId', adminAuth, requirePermission('member_level.manage'), memberLevelCtrl.recalcUserLevel);
router.put('/users/:userId/member-level', adminAuth, requirePermission('member_level.manage'), memberLevelCtrl.assignUserLevel);

/* ---- Users ---- */
router.get('/users/export', adminAuth, requirePermission('user.view'), userCtrl.exportCsv);
router.get('/users', adminAuth, requirePermission('user.view'), userQueryLimiter, paginationCap({ max: 100, mode: 'clamp' }), userCtrl.list);
router.get('/user-tags', adminAuth, requirePermission('user.view'), userQueryLimiter, userCtrl.listTags);
router.post('/user-tags', adminAuth, requirePermission('user.update'), userCtrl.createTag);
router.put('/user-tags/:tagId', adminAuth, requirePermission('user.update'), userCtrl.updateTag);
router.delete('/user-tags/:tagId', adminAuth, requirePermission('user.update'), userCtrl.deleteTag);
router.put('/users/:id/tags', adminAuth, requirePermission('user.update'), userCtrl.setTags);
router.post('/users/:id/reset-password', adminAuth, requirePermission('user.update'), userCtrl.resetPassword);
router.post('/users/:id/unbind-wechat', adminAuth, requirePermission('user.update'), userCtrl.unbindWechat);
router.get('/users/:id', adminAuth, requirePermission('user.view'), userQueryLimiter, userCtrl.getById);
router.put('/users/:id', adminAuth, requirePermission('user.update'), userCtrl.update);
router.put('/users/:id/status', adminAuth, requirePermission('user.update'), userCtrl.updateStatus);
router.put('/users/:id/subordinate', adminAuth, requirePermission('user.update'), userCtrl.updateSubordinate);
router.put('/users/:userId/points', adminAuth, requirePermission('user.points'), userCtrl.adjustPoints);

/* ---- Categories ---- */
router.get('/categories', adminAuth, requirePermission('category.manage'), categoryCtrl.list);
router.post('/categories', adminAuth, requirePermission('category.manage'), categoryCtrl.create);
router.put('/categories/sort', adminAuth, requirePermission('category.manage'), categoryCtrl.sort);
router.put('/categories/:id', adminAuth, requirePermission('category.manage'), categoryCtrl.update);
router.delete('/categories/:id', adminAuth, requirePermission('category.manage'), categoryCtrl.remove);

/* ---- Coupons ---- */
router.get('/coupons', adminAuth, requirePermission('coupon.view'), couponCtrl.list);
router.post('/coupons', adminAuth, requirePermission('coupon.manage'), couponCtrl.create);
router.put('/coupons/:id', adminAuth, requirePermission('coupon.manage'), couponCtrl.update);
router.delete('/coupons/:id', adminAuth, requirePermission('coupon.manage'), couponCtrl.remove);
router.get('/coupon-records', adminAuth, requirePermission('coupon.view'), couponCtrl.listAllRecords);
router.get('/coupons/:couponId/records', adminAuth, requirePermission('coupon.view'), couponCtrl.listRecordsByCoupon);

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

router.get('/reviews', adminAuth, reviewView, reviewCtrl.list);
router.get('/reviews/:id', adminAuth, reviewView, reviewCtrl.getDetail);
router.put('/reviews/:id/toggle', adminAuth, reviewModerate, reviewCtrl.toggleVisibility);
router.put('/reviews/:id/approve', adminAuth, reviewModerate, reviewCtrl.approve);
router.put('/reviews/:id/reject', adminAuth, reviewModerate, reviewCtrl.reject);
router.put('/reviews/:id/feature', adminAuth, reviewFeature, reviewCtrl.toggleFeatured);
router.put('/reviews/:id/reply', adminAuth, reviewReply, reviewCtrl.reply);
router.put('/reviews/:id/complaint', adminAuth, reviewModerate, reviewCtrl.updateComplaint);
router.delete('/reviews/:id', adminAuth, reviewDelete, reviewCtrl.remove);
router.put('/reviews/:id/restore', adminAuth, reviewDelete, reviewCtrl.restore);
router.delete('/reviews/:id/permanent', adminAuth, reviewDelete, reviewCtrl.permanentDelete);
router.post('/reviews/batch-hide', adminAuth, reviewModerate, reviewCtrl.batchHide);
router.post('/reviews/batch-delete', adminAuth, reviewDelete, reviewCtrl.batchDelete);

/* ---- Banners ---- */
router.get('/banners', adminAuth, requirePermission('banner.manage'), bannerCtrl.list);
router.post('/banners', adminAuth, requirePermission('banner.manage'), bannerCtrl.create);
router.put('/banners/:id', adminAuth, requirePermission('banner.manage'), bannerCtrl.update);
router.delete('/banners/:id', adminAuth, requirePermission('banner.manage'), bannerCtrl.remove);

/* ---- Notifications ---- */
router.get('/notifications', adminAuth, requireAnyPermission(['notification.view', 'notification.manage']), notificationCtrl.list);
router.get('/notifications/summary', adminAuth, requireAnyPermission(['notification.view', 'notification.manage']), notificationCtrl.summary);
router.get('/notifications/user-candidates', adminAuth, requireAnyPermission(['notification.create', 'notification.send', 'notification.manage']), notificationCtrl.userCandidates);
router.post('/notifications', adminAuth, requireAnyPermission(['notification.send', 'notification.manage']), notificationCtrl.send);
router.post('/notifications/drafts', adminAuth, requireAnyPermission(['notification.create', 'notification.manage']), notificationCtrl.draft);
router.put('/notifications/:id/publish', adminAuth, requireAnyPermission(['notification.send', 'notification.manage']), notificationCtrl.publish);
router.get('/notifications/templates', adminAuth, requireAnyPermission(['notification.template', 'notification.manage']), notificationCtrl.templates);
router.get('/notifications/trigger-settings', adminAuth, requireAnyPermission(['notification.trigger', 'notification.manage']), notificationCtrl.triggerSettings);
router.put('/notifications/trigger-settings', adminAuth, requireAnyPermission(['notification.trigger', 'notification.manage']), notificationCtrl.updateTriggerSettings);
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
router.get('/points/rules', adminAuth, requirePermission('points.manage'), settingsCtrl.listPoints);
router.put('/points/rules/:id', adminAuth, requirePermission('points.manage'), settingsCtrl.updatePoints);
router.get('/points/records', adminAuth, requirePermission('points.manage'), pointsCtrl.listRecords);
router.get('/settings', adminAuth, requirePermission('settings.manage'), settingsCtrl.getSite);
router.put('/settings', adminAuth, requirePermission('settings.manage'), settingsCtrl.updateSite);
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
router.put('/content/:id', adminAuth, requirePermission('content.manage'), settingsCtrl.updateContent);

/* ---- Shipping ---- */
router.get('/shipping/templates', adminAuth, requirePermission('shipping.manage'), shippingCtrl.listTemplates);
router.post('/shipping/templates', adminAuth, requirePermission('shipping.manage'), shippingCtrl.createTemplate);
router.put('/shipping/templates/:id', adminAuth, requirePermission('shipping.manage'), shippingCtrl.updateTemplate);
router.delete('/shipping/templates/:id', adminAuth, requirePermission('shipping.manage'), shippingCtrl.removeTemplate);
router.get('/shipping/settings', adminAuth, requirePermission('shipping.manage'), shippingCtrl.getSettings);
router.put('/shipping/settings', adminAuth, requirePermission('shipping.manage'), shippingCtrl.updateSettings);

/* ---- Reports / 数据中心 ---- */
router.get('/reports/export', adminAuth, requirePermission('report.export'), reportCtrl.exportByType);
router.get('/reports/overview', adminAuth, requirePermission('report.view'), reportCtrl.getOverview);
router.get('/reports/sales/daily', adminAuth, requirePermission('report.view'), reportCtrl.getSalesDaily);
router.get('/reports/sales/monthly', adminAuth, requirePermission('report.view'), reportCtrl.getSalesMonthly);
router.get('/reports/products/analysis', adminAuth, requirePermission('report.view'), reportCtrl.getProductsAnalysis);
router.get('/reports/categories/analysis', adminAuth, requirePermission('report.view'), reportCtrl.getCategoriesAnalysis);
router.get('/reports/orders/analysis', adminAuth, requirePermission('report.view'), reportCtrl.getOrdersAnalysis);
router.get('/reports/customers/analysis', adminAuth, requirePermission('report.view'), reportCtrl.getCustomersAnalysis);
router.get('/reports/activities/analysis', adminAuth, requirePermission('report.view'), reportCtrl.getActivitiesAnalysis);
router.get('/reports/coupons/analysis', adminAuth, requirePermission('report.view'), reportCtrl.getCouponsAnalysis);
router.get('/reports/inventory/analysis', adminAuth, requirePermission('report.view'), reportCtrl.getInventoryAnalysis);
router.get('/reports/search/analysis', adminAuth, requirePermission('report.view'), reportCtrl.getSearchAnalysis);

// 兼容旧接口
router.get('/reports/sales/export', adminAuth, requirePermission('report.export'), reportCtrl.exportByType);
router.get('/reports/users/export', adminAuth, requirePermission('report.export'), reportCtrl.exportByType);
router.get('/reports/products/export', adminAuth, requirePermission('report.export'), reportCtrl.exportByType);
router.get('/reports/sales', adminAuth, requirePermission('report.view'), reportCtrl.getSalesDaily);
router.get('/reports/users', adminAuth, requirePermission('report.view'), reportCtrl.getCustomersAnalysis);
router.get('/reports/products', adminAuth, requirePermission('report.view'), reportCtrl.getProductsAnalysis);
router.get('/reports/home-engagement', adminAuth, requirePermission('report.view'), reportCtrl.getOverview);

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
router.get('/logs', adminAuth, requirePermission('admin_log.view'), logCtrl.listAdminLogs);

module.exports = router;

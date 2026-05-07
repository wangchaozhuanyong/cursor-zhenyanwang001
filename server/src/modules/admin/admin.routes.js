/**
 * Admin 路由聚合
 *
 * 仅做：声明路径 + 中间件 + 调用对应域 controller。
 * 不做：业务规则、SQL；所有 controller 都已按业务域拆到 `./controller/*`。
 *
 * 依赖：
 *   middleware/adminAuth     — 鉴权 + RBAC 权限
 *   middleware/rateLimiters  — 用户查询限流
 *   middleware/paginationCap — 列表 limit 上限保护
 */
const { Router } = require('express');
const multer = require('multer');
const adminAuth = require('../../middleware/adminAuth');
const requirePermission = adminAuth.requirePermission;
const { userQueryLimiter } = require('../../middleware/rateLimiters');
const { paginationCap } = require('../../middleware/paginationCap');

const authCtrl = require('./controller/adminAuth.controller');
const dashboardCtrl = require('./controller/adminDashboard.controller');
const productCtrl = require('./controller/adminProduct.controller');
const orderCtrl = require('./controller/adminOrder.controller');
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

const uploadCsv = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

const router = Router();

/* ── Auth & Account ── */
router.post('/auth/login', authCtrl.login);
router.post('/auth/logout', adminAuth, authCtrl.logout);
router.get('/account/profile', adminAuth, authCtrl.getProfile);
router.put('/account/profile', adminAuth, authCtrl.updateProfile);
router.put('/account/password', adminAuth, authCtrl.changePassword);

/* ── RBAC ── */
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

/* ── Dashboard ── */
router.get('/dashboard/stats', adminAuth, requirePermission('dashboard.view'), dashboardCtrl.getStats);
router.get('/dashboard/chart', adminAuth, requirePermission('dashboard.view'), dashboardCtrl.getChart);

/* ── Products ── */
router.get('/products/export', adminAuth, requirePermission('product.view'), productCtrl.exportCsv);
router.post('/products/import', adminAuth, requirePermission('product.manage'), uploadCsv.single('file'), productCtrl.importCsv);
router.get('/products', adminAuth, requirePermission('product.view'), productCtrl.list);
router.get('/products/:id', adminAuth, requirePermission('product.view'), productCtrl.getById);
router.post('/products', adminAuth, requirePermission('product.manage'), productCtrl.create);
router.put('/products/:id', adminAuth, requirePermission('product.manage'), productCtrl.update);
router.delete('/products/:id', adminAuth, requirePermission('product.manage'), productCtrl.remove);
router.post('/products/batch-status', adminAuth, requirePermission('product.manage'), productCtrl.batchUpdateStatus);

/* ── Product Tags ── */
router.get('/product-tags', adminAuth, requirePermission('tag.manage'), productCtrl.listTags);
router.post('/product-tags', adminAuth, requirePermission('tag.manage'), productCtrl.createTag);
router.delete('/product-tags/:id', adminAuth, requirePermission('tag.manage'), productCtrl.removeTag);

/* ── Orders ── */
router.get('/orders/export', adminAuth, requirePermission('order.view'), orderCtrl.exportCsv);
router.get('/orders', adminAuth, requirePermission('order.view'), orderCtrl.list);
router.get('/orders/:id', adminAuth, requirePermission('order.view'), orderCtrl.getById);
router.put('/orders/:id/status', adminAuth, requirePermission('order.update'), orderCtrl.updateStatus);
router.put('/orders/:id/ship', adminAuth, requirePermission('order.ship'), orderCtrl.ship);

/* ── Users ── */
router.get('/users/export', adminAuth, requirePermission('user.view'), userCtrl.exportCsv);
router.get('/users', adminAuth, requirePermission('user.view'), userQueryLimiter, paginationCap({ max: 100, mode: 'clamp' }), userCtrl.list);
router.get('/users/:id', adminAuth, requirePermission('user.view'), userQueryLimiter, userCtrl.getById);
router.put('/users/:id', adminAuth, requirePermission('user.update'), userCtrl.update);
router.put('/users/:id/subordinate', adminAuth, requirePermission('user.update'), userCtrl.updateSubordinate);
router.put('/users/:userId/points', adminAuth, requirePermission('user.points'), userCtrl.adjustPoints);

/* ── Categories ── */
router.get('/categories', adminAuth, requirePermission('category.manage'), categoryCtrl.list);
router.post('/categories', adminAuth, requirePermission('category.manage'), categoryCtrl.create);
router.put('/categories/:id', adminAuth, requirePermission('category.manage'), categoryCtrl.update);
router.delete('/categories/:id', adminAuth, requirePermission('category.manage'), categoryCtrl.remove);

/* ── Coupons ── */
router.get('/coupons', adminAuth, requirePermission('coupon.view'), couponCtrl.list);
router.post('/coupons', adminAuth, requirePermission('coupon.manage'), couponCtrl.create);
router.put('/coupons/:id', adminAuth, requirePermission('coupon.manage'), couponCtrl.update);
router.delete('/coupons/:id', adminAuth, requirePermission('coupon.manage'), couponCtrl.remove);
router.get('/coupon-records', adminAuth, requirePermission('coupon.view'), couponCtrl.listAllRecords);
router.get('/coupons/:couponId/records', adminAuth, requirePermission('coupon.view'), couponCtrl.listRecordsByCoupon);

/* ── Returns ── */
router.get('/returns', adminAuth, requirePermission('return.view'), returnCtrl.list);
router.get('/returns/:id', adminAuth, requirePermission('return.view'), returnCtrl.getById);
router.put('/returns/:id', adminAuth, requirePermission('return.handle'), returnCtrl.updateStatus);
router.put('/returns/:id/approve', adminAuth, requirePermission('return.handle'), returnCtrl.approve);
router.put('/returns/:id/reject', adminAuth, requirePermission('return.handle'), returnCtrl.reject);

/* ── Reviews ── */
router.get('/reviews', adminAuth, requirePermission('review.manage'), reviewCtrl.list);
router.put('/reviews/:id/toggle', adminAuth, requirePermission('review.manage'), reviewCtrl.toggleVisibility);
router.put('/reviews/:id/feature', adminAuth, requirePermission('review.manage'), reviewCtrl.toggleFeatured);
router.put('/reviews/:id/reply', adminAuth, requirePermission('review.manage'), reviewCtrl.reply);
router.delete('/reviews/:id', adminAuth, requirePermission('review.manage'), reviewCtrl.remove);
router.put('/reviews/:id/restore', adminAuth, requirePermission('review.manage'), reviewCtrl.restore);
router.delete('/reviews/:id/permanent', adminAuth, requirePermission('review.manage'), reviewCtrl.permanentDelete);
router.post('/reviews/batch-hide', adminAuth, requirePermission('review.manage'), reviewCtrl.batchHide);
router.post('/reviews/batch-delete', adminAuth, requirePermission('review.manage'), reviewCtrl.batchDelete);

/* ── Banners ── */
router.get('/banners', adminAuth, requirePermission('banner.manage'), bannerCtrl.list);
router.post('/banners', adminAuth, requirePermission('banner.manage'), bannerCtrl.create);
router.put('/banners/:id', adminAuth, requirePermission('banner.manage'), bannerCtrl.update);
router.delete('/banners/:id', adminAuth, requirePermission('banner.manage'), bannerCtrl.remove);

/* ── Notifications ── */
router.get('/notifications', adminAuth, requirePermission('notification.manage'), notificationCtrl.list);
router.post('/notifications', adminAuth, requirePermission('notification.manage'), notificationCtrl.send);
router.post('/notifications/drafts', adminAuth, requirePermission('notification.manage'), notificationCtrl.draft);
router.put('/notifications/:id/publish', adminAuth, requirePermission('notification.manage'), notificationCtrl.publish);
router.get('/notifications/templates', adminAuth, requirePermission('notification.manage'), notificationCtrl.templates);
router.get('/notifications/trigger-settings', adminAuth, requirePermission('notification.manage'), notificationCtrl.triggerSettings);
router.put('/notifications/trigger-settings', adminAuth, requirePermission('notification.manage'), notificationCtrl.updateTriggerSettings);
router.delete('/notifications/:id', adminAuth, requirePermission('notification.manage'), notificationCtrl.remove);

/* ── Invites ── */
router.get('/invites', adminAuth, requirePermission('invite.view'), inviteCtrl.list);
router.get('/rewards/records', adminAuth, requirePermission('referral.manage'), rewardCtrl.listRecords);

/* ── Settings: referral / points / site / content ── */
router.get('/referral-rules', adminAuth, requirePermission('referral.manage'), settingsCtrl.listReferral);
router.put('/referral-rules/:id', adminAuth, requirePermission('referral.manage'), settingsCtrl.updateReferral);
router.get('/points/rules', adminAuth, requirePermission('points.manage'), settingsCtrl.listPoints);
router.put('/points/rules/:id', adminAuth, requirePermission('points.manage'), settingsCtrl.updatePoints);
router.get('/points/records', adminAuth, requirePermission('points.manage'), pointsCtrl.listRecords);
router.get('/settings', adminAuth, requirePermission('settings.manage'), settingsCtrl.getSite);
router.put('/settings', adminAuth, requirePermission('settings.manage'), settingsCtrl.updateSite);
router.put('/system/theme', adminAuth, requirePermission('settings.manage'), themeCtrl.updateTheme);
router.put('/system/theme/skins', adminAuth, requirePermission('settings.manage'), themeCtrl.updateThemeSkins);
router.get('/content', adminAuth, requirePermission('content.manage'), settingsCtrl.listContent);
router.put('/content/:id', adminAuth, requirePermission('content.manage'), settingsCtrl.updateContent);

/* ── Shipping ── */
router.get('/shipping/templates', adminAuth, requirePermission('shipping.manage'), shippingCtrl.listTemplates);
router.post('/shipping/templates', adminAuth, requirePermission('shipping.manage'), shippingCtrl.createTemplate);
router.put('/shipping/templates/:id', adminAuth, requirePermission('shipping.manage'), shippingCtrl.updateTemplate);
router.delete('/shipping/templates/:id', adminAuth, requirePermission('shipping.manage'), shippingCtrl.removeTemplate);
router.get('/shipping/settings', adminAuth, requirePermission('shipping.manage'), shippingCtrl.getSettings);
router.put('/shipping/settings', adminAuth, requirePermission('shipping.manage'), shippingCtrl.updateSettings);

/* ── Reports ── */
router.get('/reports/sales/export', adminAuth, requirePermission('report.export'), reportCtrl.exportSales);
router.get('/reports/users/export', adminAuth, requirePermission('report.export'), reportCtrl.exportUsers);
router.get('/reports/products/export', adminAuth, requirePermission('report.export'), reportCtrl.exportProducts);
router.get('/reports/sales', adminAuth, requirePermission('report.view'), reportCtrl.getSales);
router.get('/reports/users', adminAuth, requirePermission('report.view'), reportCtrl.getUsers);
router.get('/reports/products', adminAuth, requirePermission('report.view'), reportCtrl.getProducts);

/* ── Export Center ── */
router.post('/exports', adminAuth, requirePermission('report.export'), exportCtrl.create);
router.get('/exports', adminAuth, requirePermission('report.export'), exportCtrl.list);
router.get('/exports/:id/download', adminAuth, requirePermission('report.export'), exportCtrl.download);

/* ── Recycle Bin ── */
router.get('/recycle-bin', adminAuth, requirePermission('recycle_bin.manage'), recycleBinCtrl.list);
router.put('/recycle-bin/:id/restore', adminAuth, requirePermission('recycle_bin.manage'), recycleBinCtrl.restore);
router.post('/recycle-bin/:id/permanent-delete', adminAuth, requirePermission('recycle_bin.manage'), recycleBinCtrl.permanentDelete);

/* ── Logs ── */
router.get('/audit-logs', adminAuth, requirePermission('audit.view'), logCtrl.listAuditLogs);
router.get('/logs', adminAuth, requirePermission('admin_log.view'), logCtrl.listAdminLogs);

module.exports = router;

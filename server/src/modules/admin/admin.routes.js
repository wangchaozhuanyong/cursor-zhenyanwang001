const { Router } = require('express');
const multer = require('multer');
const ctrl = require('./admin.controller');
const adminAuth = require('../../middleware/adminAuth');
const requirePermission = adminAuth.requirePermission;

const uploadCsv = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

const router = Router();

router.post('/auth/login', ctrl.adminLogin);
router.post('/auth/logout', adminAuth, ctrl.adminLogout);

router.get('/rbac/me', adminAuth, ctrl.getRbacMe);
router.get('/rbac/permissions', adminAuth, requirePermission('role.manage'), ctrl.listRbacPermissions);
router.get('/rbac/roles', adminAuth, requirePermission('role.manage'), ctrl.listRbacRoles);
router.get('/rbac/admin-users', adminAuth, requirePermission('role.manage'), ctrl.listRbacAdminUsers);
router.get('/rbac/users/:userId/roles', adminAuth, requirePermission('role.manage'), ctrl.getRbacUserRoles);
router.put('/rbac/users/:userId/roles', adminAuth, requirePermission('role.manage'), ctrl.setRbacUserRoles);
router.post('/rbac/roles', adminAuth, requirePermission('role.manage'), ctrl.createRbacRole);
router.put('/rbac/roles/:roleId', adminAuth, requirePermission('role.manage'), ctrl.updateRbacRole);
router.delete('/rbac/roles/:roleId', adminAuth, requirePermission('role.manage'), ctrl.deleteRbacRole);

router.post('/rbac/admin-users', adminAuth, requirePermission('role.manage'), ctrl.createAdminUser);
router.put('/rbac/admin-users/:userId/toggle', adminAuth, requirePermission('role.manage'), ctrl.toggleAdminUser);
router.put('/rbac/admin-users/:userId/reset-password', adminAuth, requirePermission('role.manage'), ctrl.resetAdminPassword);
router.delete('/rbac/admin-users/:userId', adminAuth, requirePermission('role.manage'), ctrl.deleteAdminUser);

router.get('/account/profile', adminAuth, ctrl.getAdminProfile);
router.put('/account/profile', adminAuth, ctrl.updateAdminProfile);
router.put('/account/password', adminAuth, ctrl.changeAdminPassword);

router.get('/dashboard/stats', adminAuth, requirePermission('dashboard.view'), ctrl.getStats);
router.get('/dashboard/chart', adminAuth, requirePermission('dashboard.view'), ctrl.getChart);

router.get('/products/export', adminAuth, requirePermission('product.view'), ctrl.exportProducts);
router.post('/products/import', adminAuth, requirePermission('product.manage'), uploadCsv.single('file'), ctrl.importProducts);
router.get('/products', adminAuth, requirePermission('product.view'), ctrl.getProducts);
router.get('/products/:id', adminAuth, requirePermission('product.view'), ctrl.getProductById);
router.post('/products', adminAuth, requirePermission('product.manage'), ctrl.createProduct);
router.put('/products/:id', adminAuth, requirePermission('product.manage'), ctrl.updateProduct);
router.delete('/products/:id', adminAuth, requirePermission('product.manage'), ctrl.deleteProduct);
router.post('/products/batch-status', adminAuth, requirePermission('product.manage'), ctrl.batchUpdateProductStatus);

router.get('/product-tags', adminAuth, requirePermission('tag.manage'), ctrl.getProductTags);
router.post('/product-tags', adminAuth, requirePermission('tag.manage'), ctrl.createProductTag);
router.delete('/product-tags/:id', adminAuth, requirePermission('tag.manage'), ctrl.deleteProductTag);

router.get('/orders/export', adminAuth, requirePermission('order.view'), ctrl.exportOrders);
router.get('/orders', adminAuth, requirePermission('order.view'), ctrl.getOrders);
router.get('/orders/:id', adminAuth, requirePermission('order.view'), ctrl.getOrderById);
router.put('/orders/:id/status', adminAuth, requirePermission('order.update'), ctrl.updateOrderStatus);
router.put('/orders/:id/ship', adminAuth, requirePermission('order.ship'), ctrl.shipOrder);

router.get('/users/export', adminAuth, requirePermission('user.view'), ctrl.exportUsers);
router.get('/users', adminAuth, requirePermission('user.view'), ctrl.getUsers);
router.get('/users/:id', adminAuth, requirePermission('user.view'), ctrl.getUserById);
router.put('/users/:id', adminAuth, requirePermission('user.update'), ctrl.updateUser);
router.put('/users/:id/subordinate', adminAuth, requirePermission('user.update'), ctrl.updateSubordinate);
router.put('/users/:userId/points', adminAuth, requirePermission('user.points'), ctrl.adjustUserPoints);

router.get('/categories', adminAuth, requirePermission('category.manage'), ctrl.getCategories);
router.post('/categories', adminAuth, requirePermission('category.manage'), ctrl.createCategory);
router.put('/categories/:id', adminAuth, requirePermission('category.manage'), ctrl.updateCategory);
router.delete('/categories/:id', adminAuth, requirePermission('category.manage'), ctrl.deleteCategory);

router.get('/coupons', adminAuth, requirePermission('coupon.view'), ctrl.getCoupons);
router.post('/coupons', adminAuth, requirePermission('coupon.manage'), ctrl.createCoupon);
router.put('/coupons/:id', adminAuth, requirePermission('coupon.manage'), ctrl.updateCoupon);
router.delete('/coupons/:id', adminAuth, requirePermission('coupon.manage'), ctrl.deleteCoupon);
router.get('/coupon-records', adminAuth, requirePermission('coupon.view'), ctrl.getAllCouponRecords);
router.get('/coupons/:couponId/records', adminAuth, requirePermission('coupon.view'), ctrl.getCouponRecords);

router.get('/returns', adminAuth, requirePermission('return.view'), ctrl.getReturns);
router.get('/returns/:id', adminAuth, requirePermission('return.view'), ctrl.getReturnById);
router.put('/returns/:id', adminAuth, requirePermission('return.handle'), ctrl.updateReturnStatus);
router.put('/returns/:id/approve', adminAuth, requirePermission('return.handle'), ctrl.approveReturn);
router.put('/returns/:id/reject', adminAuth, requirePermission('return.handle'), ctrl.rejectReturn);

router.get('/reviews', adminAuth, requirePermission('review.manage'), ctrl.getReviews);
router.put('/reviews/:id/toggle', adminAuth, requirePermission('review.manage'), ctrl.toggleReviewVisibility);
router.put('/reviews/:id/reply', adminAuth, requirePermission('review.manage'), ctrl.replyReview);
router.delete('/reviews/:id', adminAuth, requirePermission('review.manage'), ctrl.deleteReview);
router.put('/reviews/:id/restore', adminAuth, requirePermission('review.manage'), ctrl.restoreReview);
router.delete('/reviews/:id/permanent', adminAuth, requirePermission('review.manage'), ctrl.permanentDeleteReview);
router.post('/reviews/batch-hide', adminAuth, requirePermission('review.manage'), ctrl.batchHideReviews);
router.post('/reviews/batch-delete', adminAuth, requirePermission('review.manage'), ctrl.batchDeleteReviews);

router.get('/banners', adminAuth, requirePermission('banner.manage'), ctrl.getBanners);
router.post('/banners', adminAuth, requirePermission('banner.manage'), ctrl.createBanner);
router.put('/banners/:id', adminAuth, requirePermission('banner.manage'), ctrl.updateBanner);
router.delete('/banners/:id', adminAuth, requirePermission('banner.manage'), ctrl.deleteBanner);

router.get('/notifications', adminAuth, requirePermission('notification.manage'), ctrl.getNotifications);
router.post('/notifications', adminAuth, requirePermission('notification.manage'), ctrl.sendNotification);
router.delete('/notifications/:id', adminAuth, requirePermission('notification.manage'), ctrl.deleteNotification);

router.get('/invites', adminAuth, requirePermission('invite.view'), ctrl.getInvites);

router.get('/referral-rules', adminAuth, requirePermission('referral.manage'), ctrl.getReferralRules);
router.put('/referral-rules/:id', adminAuth, requirePermission('referral.manage'), ctrl.updateReferralRule);

router.get('/points/rules', adminAuth, requirePermission('points.manage'), ctrl.getPointsRules);
router.put('/points/rules/:id', adminAuth, requirePermission('points.manage'), ctrl.updatePointsRule);

router.get('/shipping/templates', adminAuth, requirePermission('shipping.manage'), ctrl.getShippingTemplates);
router.post('/shipping/templates', adminAuth, requirePermission('shipping.manage'), ctrl.createShippingTemplate);
router.put('/shipping/templates/:id', adminAuth, requirePermission('shipping.manage'), ctrl.updateShippingTemplate);
router.delete('/shipping/templates/:id', adminAuth, requirePermission('shipping.manage'), ctrl.deleteShippingTemplate);
router.get('/shipping/settings', adminAuth, requirePermission('shipping.manage'), ctrl.getShippingSettings);
router.put('/shipping/settings', adminAuth, requirePermission('shipping.manage'), ctrl.updateShippingSettings);

router.get('/reports/sales/export', adminAuth, requirePermission('report.export'), ctrl.exportSalesReport);
router.get('/reports/users/export', adminAuth, requirePermission('report.export'), ctrl.exportUserReport);
router.get('/reports/products/export', adminAuth, requirePermission('report.export'), ctrl.exportProductReport);
router.get('/reports/sales', adminAuth, requirePermission('report.view'), ctrl.getSalesReport);
router.get('/reports/users', adminAuth, requirePermission('report.view'), ctrl.getUserReport);
router.get('/reports/products', adminAuth, requirePermission('report.view'), ctrl.getProductReport);

router.get('/settings', adminAuth, requirePermission('settings.manage'), ctrl.getSiteSettings);
router.put('/settings', adminAuth, requirePermission('settings.manage'), ctrl.updateSiteSettings);

router.get('/content', adminAuth, requirePermission('content.manage'), ctrl.getContentPages);
router.put('/content/:id', adminAuth, requirePermission('content.manage'), ctrl.updateContentPage);

router.post('/exports', adminAuth, requirePermission('report.export'), ctrl.createExportTask);
router.get('/exports', adminAuth, requirePermission('report.export'), ctrl.listExportTasks);
router.get('/exports/:id/download', adminAuth, requirePermission('report.export'), ctrl.downloadExportFile);

router.get('/recycle-bin', adminAuth, requirePermission('recycle_bin.manage'), ctrl.getRecycleBin);
router.put('/recycle-bin/:id/restore', adminAuth, requirePermission('recycle_bin.manage'), ctrl.restoreRecycleBinItem);
router.post('/recycle-bin/:id/permanent-delete', adminAuth, requirePermission('recycle_bin.manage'), ctrl.permanentDeleteRecycleBinItem);

router.get('/audit-logs', adminAuth, requirePermission('audit.view'), ctrl.getAuditLogs);
router.get('/logs', adminAuth, requirePermission('admin_log.view'), ctrl.getLogs);

module.exports = router;

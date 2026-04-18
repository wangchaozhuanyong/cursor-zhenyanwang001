const adminExtended = require('./adminExtended.service');
const adminAuthService = require('./adminAuth.service');
const adminDashboardService = require('./adminDashboard.service');
const adminProductService = require('./adminProduct.service');
const adminOrderService = require('./adminOrder.service');
const adminUserService = require('./adminUser.service');
const adminCategoryService = require('./adminCategory.service');
const adminCouponService = require('./adminCoupon.service');
const adminLogService = require('./adminLog.service');
const auditLogService = require('./auditLog.service');
const adminInviteService = require('./adminInvite.service');
const adminAccountService = require('./adminAccount.service');
const rbacService = require('./rbac.service');
const adminReportService = require('./adminReport.service');
const adminSiteSettingsService = require('./adminSiteSettings.service');
const adminNotificationService = require('./adminNotification.service');
const adminReviewService = require('./adminReview.service');
const adminRecycleBinService = require('./adminRecycleBin.service');
const adminExportService = require('./adminExport.service');
const { asyncRoute } = require('../../middleware/asyncRoute');

// ─── Admin Login (requires admin role) ───
exports.adminLogin = asyncRoute(async (req, res) => {
  const result = await adminAuthService.login(req.body, req);
  res.success(result.data, result.message);
});

exports.adminLogout = asyncRoute(async (req, res) => {
  const result = await adminAuthService.logout(req.user?.id, req);
  res.success(result.data, result.message);
});

// ─── Dashboard ───
exports.getStats = asyncRoute(async (_req, res) => {
  const data = await adminDashboardService.getStats();
  res.success(data);
});

exports.getChart = asyncRoute(async (_req, res) => {
  const rows = await adminDashboardService.getChart();
  res.success(rows);
});

// ─── Products CRUD ───
exports.getProducts = asyncRoute(async (req, res) => {
  const result = await adminProductService.listProducts(req.query);
  res.paginate(result.list, result.total, result.page, result.pageSize);
});

exports.exportProducts = asyncRoute(async (req, res) => {
  const { csv, filename } = await adminProductService.exportProductsCsv(req.query);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
  res.send(`\uFEFF${csv}`);
});

exports.importProducts = asyncRoute(async (req, res) => {
  if (!req.file || !req.file.buffer) return res.fail(400, '请上传 CSV 文件');
  const text = req.file.buffer.toString('utf8');
  const result = await adminProductService.importProductsCsv(text, req.user?.id);
  res.success(result.data, result.message);
});

exports.getProductById = asyncRoute(async (req, res) => {
  const result = await adminProductService.getProductById(req.params.id);
  res.success(result.data);
});

exports.createProduct = asyncRoute(async (req, res) => {
  const result = await adminProductService.createProduct(req.body, req.user?.id, req);
  res.success(result.data, result.message);
});

exports.updateProduct = asyncRoute(async (req, res) => {
  const result = await adminProductService.updateProduct(req.params.id, req.body, req.user?.id, req);
  res.success(result.data, result.message);
});

exports.deleteProduct = asyncRoute(async (req, res) => {
  const result = await adminProductService.deleteProduct(req.params.id, req.user?.id, req);
  res.success(result.data, result.message);
});

exports.batchUpdateProductStatus = asyncRoute(async (req, res) => {
  const { ids, status } = req.body;
  const result = await adminProductService.batchUpdateStatus(ids, status, req.user?.id, req);
  if (result.error) return res.fail(result.error.code, result.error.message);
  res.success(null, result.message);
});

// ─── Orders ───
exports.getOrders = asyncRoute(async (req, res) => {
  const result = await adminOrderService.listOrders(req.query);
  res.paginate(result.list, result.total, result.page, result.pageSize);
});

exports.exportOrders = asyncRoute(async (req, res) => {
  const { csv, filename } = await adminOrderService.exportOrdersCsv(req.query);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
  res.send(`\uFEFF${csv}`);
});

exports.getOrderById = asyncRoute(async (req, res) => {
  const result = await adminOrderService.getOrderById(req.params.id);
  res.success(result.data);
});

exports.updateOrderStatus = asyncRoute(async (req, res) => {
  const result = await adminOrderService.updateOrderStatus(req.params.id, req.body, req.user?.id, req);
  res.success(result.data, result.message);
});

// ─── Users ───
exports.getUsers = asyncRoute(async (req, res) => {
  const result = await adminUserService.listUsers(req.query);
  res.paginate(result.list, result.total, result.page, result.pageSize);
});

exports.exportUsers = asyncRoute(async (req, res) => {
  const { csv, filename } = await adminUserService.exportUsersCsv(req.query);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
  res.send(`\uFEFF${csv}`);
});

exports.getUserById = asyncRoute(async (req, res) => {
  const result = await adminUserService.getUserById(req.params.id);
  res.success(result.data);
});

// ─── Categories CRUD ───
exports.getCategories = asyncRoute(async (_req, res) => {
  const result = await adminCategoryService.listCategories();
  res.success(result.data);
});

exports.createCategory = asyncRoute(async (req, res) => {
  const result = await adminCategoryService.createCategory(req.body, req.user?.id, req);
  res.success(result.data, result.message);
});

exports.updateCategory = asyncRoute(async (req, res) => {
  const result = await adminCategoryService.updateCategory(req.params.id, req.body, req.user?.id, req);
  res.success(result.data, result.message);
});

exports.deleteCategory = asyncRoute(async (req, res) => {
  const result = await adminCategoryService.deleteCategory(req.params.id, req.user?.id, req);
  res.success(result.data, result.message);
});

// ─── Coupons ───
exports.getCoupons = asyncRoute(async (req, res) => {
  const result = await adminCouponService.listCoupons(req.query);
  res.paginate(result.list, result.total, result.page, result.pageSize);
});

exports.createCoupon = asyncRoute(async (req, res) => {
  const result = await adminCouponService.createCoupon(req.body, req.user?.id, req);
  res.success(result.data, result.message);
});

exports.deleteCoupon = asyncRoute(async (req, res) => {
  const result = await adminCouponService.deleteCoupon(req.params.id, req.user?.id, req);
  res.success(result.data, result.message);
});

// ─── Returns ───
exports.getReturns = asyncRoute(async (req, res) => {
  const { list, total, page, pageSize } = await adminExtended.listReturns(req.query);
  res.paginate(list, total, page, pageSize);
});

exports.updateReturnStatus = asyncRoute(async (req, res) => {
  const result = await adminExtended.updateReturnStatus(req.params.id, req.body, req.user?.id, req);
  if (result.error) return res.fail(result.error.code, result.error.message);
  res.success(null, result.message);
});

// ─── Banners CRUD ───
exports.getBanners = asyncRoute(async (_req, res) => {
  const rows = await adminExtended.listBanners();
  res.success(rows);
});

exports.createBanner = asyncRoute(async (req, res) => {
  const result = await adminExtended.createBanner(req.body, req.user?.id, req);
  if (result.error) return res.fail(result.error.code, result.error.message);
  res.success(result.data, result.message);
});

exports.updateBanner = asyncRoute(async (req, res) => {
  const result = await adminExtended.updateBanner(req.params.id, req.body, req.user?.id, req);
  if (result.error) return res.fail(result.error.code, result.error.message);
  res.success(null, result.message);
});

exports.deleteBanner = asyncRoute(async (req, res) => {
  const result = await adminExtended.deleteBanner(req.params.id, req.user?.id, req);
  res.success(null, result.message);
});

// ─── Notifications ───
exports.getNotifications = asyncRoute(async (req, res) => {
  const result = await adminNotificationService.listNotifications(req.query);
  res.paginate(result.list, result.total, result.page, result.pageSize);
});

exports.sendNotification = asyncRoute(async (req, res) => {
  const result = await adminNotificationService.sendNotification(req.body, req.user?.id, req);
  res.success(result.data, result.message);
});

exports.deleteNotification = asyncRoute(async (req, res) => {
  const result = await adminNotificationService.deleteNotification(req.params.id, req.user?.id, req);
  res.success(result.data, result.message);
});

// ─── Invites ───
exports.getInvites = asyncRoute(async (req, res) => {
  const result = await adminInviteService.listInvites(req.query);
  res.paginate(result.list, result.total, result.page, result.pageSize);
});

// ─── Logs (access logs from orders/activity) ───
exports.getLogs = asyncRoute(async (req, res) => {
  const result = await adminLogService.listLogs(req.query);
  res.paginate(result.list, result.total, result.page, result.pageSize);
});

exports.getAuditLogs = asyncRoute(async (req, res) => {
  const result = await auditLogService.listAuditLogs(req.query);
  res.paginate(result.list, result.total, result.page, result.pageSize);
});

// ─── Admin Account ───
exports.getAdminProfile = asyncRoute(async (req, res) => {
  const result = await adminAccountService.getProfile(req.user.id);
  res.success({
    ...result.data,
    permissions: req.user.permissions,
    isSuperAdmin: req.user.isSuperAdmin,
    roleCodes: req.user.roleCodes,
  });
});

exports.getRbacMe = asyncRoute(async (req, res) => {
  res.success({
    permissions: req.user.permissions,
    isSuperAdmin: req.user.isSuperAdmin,
    roleCodes: req.user.roleCodes,
  });
});

exports.listRbacPermissions = asyncRoute(async (_req, res) => {
  const result = await rbacService.listPermissions();
  res.success(result.data);
});

exports.listRbacRoles = asyncRoute(async (_req, res) => {
  const result = await rbacService.listRoles();
  res.success(result.data);
});

exports.listRbacAdminUsers = asyncRoute(async (_req, res) => {
  const result = await rbacService.listAdminUsers();
  res.success(result.data);
});

exports.getRbacUserRoles = asyncRoute(async (req, res) => {
  const result = await rbacService.getUserRoles(req.params.userId);
  res.success(result.data);
});

exports.setRbacUserRoles = asyncRoute(async (req, res) => {
  const result = await rbacService.setUserRoles(req.user, req.params.userId, req.body?.roleIds, req);
  res.success(result.data, result.message);
});

exports.createRbacRole = asyncRoute(async (req, res) => {
  const result = await rbacService.createRole(req.body, req.user, req);
  res.success(result.data, result.message);
});

exports.updateRbacRole = asyncRoute(async (req, res) => {
  const result = await rbacService.updateRole(req.params.roleId, req.body, req.user, req);
  res.success(result.data, result.message);
});

exports.deleteRbacRole = asyncRoute(async (req, res) => {
  const result = await rbacService.deleteRole(req.params.roleId, req.user, req);
  res.success(result.data, result.message);
});

exports.createAdminUser = asyncRoute(async (req, res) => {
  const result = await rbacService.createAdminUser(req.body, req.user, req);
  res.success(result.data, result.message);
});

exports.toggleAdminUser = asyncRoute(async (req, res) => {
  const result = await rbacService.toggleAdminUser(req.params.userId, req.body.enabled, req.user, req);
  res.success(result.data, result.message);
});

exports.resetAdminPassword = asyncRoute(async (req, res) => {
  const result = await rbacService.resetAdminPassword(req.params.userId, req.body, req.user, req);
  res.success(result.data, result.message);
});

exports.deleteAdminUser = asyncRoute(async (req, res) => {
  const result = await rbacService.deleteAdminUser(req.params.userId, req.user, req);
  res.success(result.data, result.message);
});

exports.updateAdminProfile = asyncRoute(async (req, res) => {
  const result = await adminAccountService.updateProfile(req.user.id, req.body);
  res.success(result.data, result.message);
});

exports.changeAdminPassword = asyncRoute(async (req, res) => {
  const result = await adminAccountService.changePassword(req.user.id, req.body);
  res.success(result.data, result.message);
});

// ─── Admin User Update ───
exports.updateUser = asyncRoute(async (req, res) => {
  const result = await adminUserService.updateUser(req.params.id, req.body);
  res.success(result.data, result.message);
});

exports.updateSubordinate = asyncRoute(async (req, res) => {
  const result = await adminUserService.updateSubordinate(req.params.id, req.body);
  res.success(result.data, result.message);
});

exports.adjustUserPoints = asyncRoute(async (req, res) => {
  const result = await adminUserService.adjustUserPoints(req.params.userId, req.body, req.user?.id, req);
  res.success(result.data, result.message);
});

// ─── Update Coupon ───
exports.updateCoupon = asyncRoute(async (req, res) => {
  const result = await adminCouponService.updateCoupon(req.params.id, req.body, req.user?.id, req);
  res.success(result.data, result.message);
});

// ─── All Coupon Records (across all coupons) ───
exports.getAllCouponRecords = asyncRoute(async (req, res) => {
  const result = await adminCouponService.getAllCouponRecords(req.query);
  res.paginate(result.list, result.total, result.page, result.pageSize);
});

// ─── Coupon Records (per coupon) ───
exports.getCouponRecords = asyncRoute(async (req, res) => {
  const result = await adminCouponService.getCouponRecords(req.params.couponId, req.query);
  res.paginate(result.list, result.total, result.page, result.pageSize);
});

// ─── Product Tags ───
exports.getProductTags = asyncRoute(async (_req, res) => {
  const rows = await adminExtended.listProductTags();
  res.success(rows);
});

exports.createProductTag = asyncRoute(async (req, res) => {
  const result = await adminExtended.createProductTag(req.body, req.user?.id, req);
  if (result.error) return res.fail(result.error.code, result.error.message);
  res.success(result.data, result.message);
});

exports.deleteProductTag = asyncRoute(async (req, res) => {
  const result = await adminExtended.deleteProductTag(req.params.id, req.user?.id, req);
  res.success(null, result.message);
});

// ─── Ship Order ───
exports.shipOrder = asyncRoute(async (req, res) => {
  const result = await adminOrderService.shipOrder(req.params.id, req.body, req.user?.id, req);
  res.success(result.data, result.message);
});

// ─── Return Detail + Approve/Reject ───
exports.getReturnById = asyncRoute(async (req, res) => {
  const result = await adminExtended.getReturnById(req.params.id);
  if (result.error) return res.fail(result.error.code, result.error.message);
  res.success(result.data);
});

exports.approveReturn = asyncRoute(async (req, res) => {
  const result = await adminExtended.approveReturn(req.params.id, req.body, req.user?.id, req);
  if (result.error) return res.fail(result.error.code, result.error.message);
  res.success(null, result.message);
});

exports.rejectReturn = asyncRoute(async (req, res) => {
  const result = await adminExtended.rejectReturn(req.params.id, req.body, req.user?.id, req);
  if (result.error) return res.fail(result.error.code, result.error.message);
  res.success(null, result.message);
});

// ─── Shipping Templates (Admin) ───
exports.getShippingTemplates = asyncRoute(async (_req, res) => {
  const list = await adminExtended.listShippingTemplates();
  res.success(list);
});

exports.createShippingTemplate = asyncRoute(async (req, res) => {
  const result = await adminExtended.createShippingTemplate(req.body, req.user?.id, req);
  if (result.error) return res.fail(result.error.code, result.error.message);
  res.success(result.data, result.message);
});

exports.updateShippingTemplate = asyncRoute(async (req, res) => {
  const result = await adminExtended.updateShippingTemplate(req.params.id, req.body, req.user?.id, req);
  if (result.error) return res.fail(result.error.code, result.error.message);
  res.success(null, result.message);
});

exports.deleteShippingTemplate = asyncRoute(async (req, res) => {
  const result = await adminExtended.deleteShippingTemplate(req.params.id, req.user?.id, req);
  res.success(null, result.message);
});

exports.getShippingSettings = asyncRoute(async (_req, res) => {
  const result = await adminSiteSettingsService.getShippingSettings();
  res.success(result.data);
});

exports.updateShippingSettings = asyncRoute(async (req, res) => {
  const result = await adminSiteSettingsService.updateShippingSettings(req.body, req.user?.id, req);
  res.success(result.data, result.message);
});

// ─── Reports（独立 Service / Repository，销售口径见 adminReport.repository）───
exports.getSalesReport = asyncRoute(async (req, res) => {
  const data = await adminReportService.getSalesReport(req.query);
  res.success(data);
});

exports.getUserReport = asyncRoute(async (req, res) => {
  const data = await adminReportService.getUserReport(req.query);
  res.success(data);
});

exports.getProductReport = asyncRoute(async (_req, res) => {
  const data = await adminReportService.getProductReport();
  res.success(data);
});

exports.exportSalesReport = asyncRoute(async (req, res) => {
  const { csv, filename } = await adminReportService.exportSalesReportCsv(req.query);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
});

exports.exportUserReport = asyncRoute(async (req, res) => {
  const { csv, filename } = await adminReportService.exportUserReportCsv(req.query);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
});

exports.exportProductReport = asyncRoute(async (_req, res) => {
  const { csv, filename } = await adminReportService.exportProductReportCsv();
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
});

// ─── Reviews (Admin) ───
exports.getReviews = asyncRoute(async (req, res) => {
  const result = await adminReviewService.listReviews(req.query);
  res.paginate(result.list, result.total, result.page, result.pageSize);
});

exports.toggleReviewVisibility = asyncRoute(async (req, res) => {
  const result = await adminReviewService.toggleVisibility(req.params.id, req.user?.id, req);
  if (result.error) return res.fail(result.error.code, result.error.message);
  res.success(null, result.message);
});

exports.replyReview = asyncRoute(async (req, res) => {
  const result = await adminReviewService.replyReview(req.params.id, req.body, req.user?.id, req);
  if (result.error) return res.fail(result.error.code, result.error.message);
  res.success(null, result.message);
});

exports.deleteReview = asyncRoute(async (req, res) => {
  const result = await adminReviewService.deleteReview(req.params.id, req.user?.id, req);
  if (result.error) return res.fail(result.error.code, result.error.message);
  res.success(null, result.message);
});

exports.restoreReview = asyncRoute(async (req, res) => {
  const result = await adminReviewService.restoreReview(req.params.id, req.user?.id, req);
  if (result.error) return res.fail(result.error.code, result.error.message);
  res.success(null, result.message);
});

exports.permanentDeleteReview = asyncRoute(async (req, res) => {
  const result = await adminReviewService.permanentDelete(req.params.id, req.user?.id, req);
  if (result.error) return res.fail(result.error.code, result.error.message);
  res.success(null, result.message);
});

exports.batchHideReviews = asyncRoute(async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) return res.fail(400, '请选择评论');
  const result = await adminReviewService.batchHide(ids, req.user?.id, req);
  res.success(null, result.message);
});

exports.batchDeleteReviews = asyncRoute(async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) return res.fail(400, '请选择评论');
  const result = await adminReviewService.batchDelete(ids, req.user?.id, req);
  res.success(null, result.message);
});

// ─── Export Center ───
exports.createExportTask = asyncRoute(async (req, res) => {
  const { type, params } = req.body;
  const result = await adminExportService.createExportTask(type, params, req.user?.id);
  if (result.error) return res.fail(result.error.code, result.error.message);
  res.success(result.data, result.message);
});

exports.listExportTasks = asyncRoute(async (_req, res) => {
  const list = await adminExportService.listExportTasks();
  res.success(list);
});

exports.downloadExportFile = asyncRoute(async (req, res) => {
  const result = await adminExportService.downloadExportFile(req.params.id);
  if (result.error) return res.fail(result.error.code, result.error.message);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(result.fileName)}"`);
  const fs = require('fs');
  const stream = fs.createReadStream(result.filePath);
  stream.pipe(res);
});

// ─── Recycle Bin ───
exports.getRecycleBin = asyncRoute(async (req, res) => {
  const list = await adminRecycleBinService.listRecycleBin(req.query);
  res.success(list);
});

exports.restoreRecycleBinItem = asyncRoute(async (req, res) => {
  const { type } = req.body;
  const result = await adminRecycleBinService.restoreItem(type, req.params.id, req.user?.id, req);
  if (result.error) return res.fail(result.error.code, result.error.message);
  res.success(null, result.message);
});

exports.permanentDeleteRecycleBinItem = asyncRoute(async (req, res) => {
  const { type } = req.body;
  const result = await adminRecycleBinService.permanentDelete(type, req.params.id, req.user?.id, req);
  if (result.error) return res.fail(result.error.code, result.error.message);
  res.success(null, result.message);
});

// ─── Points Rules ───
exports.getPointsRules = asyncRoute(async (_req, res) => {
  const list = await adminExtended.listPointsRules();
  res.success(list);
});

exports.updatePointsRule = asyncRoute(async (req, res) => {
  const result = await adminExtended.updatePointsRule(req.params.id, req.body, req.user?.id, req);
  if (result.error) return res.fail(result.error.code, result.error.message);
  res.success(null, result.message);
});

// ─── Referral Rules ───
exports.getReferralRules = asyncRoute(async (_req, res) => {
  const list = await adminExtended.listReferralRules();
  res.success(list);
});

exports.updateReferralRule = asyncRoute(async (req, res) => {
  const result = await adminExtended.updateReferralRule(req.params.id, req.body, req.user?.id, req);
  if (result.error) return res.fail(result.error.code, result.error.message);
  res.success(null, result.message);
});

// ─── Site Settings ───
exports.getSiteSettings = asyncRoute(async (_req, res) => {
  const result = await adminSiteSettingsService.getSiteSettings();
  res.success(result.data);
});

exports.updateSiteSettings = asyncRoute(async (req, res) => {
  const result = await adminSiteSettingsService.updateSiteSettings(req.body, req.user?.id, req);
  res.success(result.data, result.message);
});

// ─── Content Pages ───
exports.getContentPages = asyncRoute(async (_req, res) => {
  const list = await adminExtended.listContentPages();
  res.success(list);
});

exports.updateContentPage = asyncRoute(async (req, res) => {
  const result = await adminExtended.updateContentPage(req.params.id, req.body, req.user?.id, req);
  if (result.error) return res.fail(result.error.code, result.error.message);
  res.success(null, result.message);
});

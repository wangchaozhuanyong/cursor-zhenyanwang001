import { lazy, type ComponentType, type LazyExoticComponent } from "react";
import { suppressAppVersionRecovery } from "@/lib/appVersionRecovery";
import { shouldSkipRoutePreload } from "@/utils/routePreloadPolicy";

const ADMIN_PRELOAD_RECOVERY_SUPPRESS_MS = 2_500;

type PreloadableAdminLazy<T extends ComponentType<any>> = LazyExoticComponent<T> & {
  preload?: () => Promise<unknown>;
};
type AdminLazyComponent = PreloadableAdminLazy<ComponentType<any>>;

function lazyWithPreload<T extends ComponentType<any>>(factory: () => Promise<{ default: T }>) {
  const Component = lazy(factory) as PreloadableAdminLazy<T>;
  Component.preload = factory;
  return Component;
}

function normalizeAdminRoutePath(to: string) {
  try {
    const url = new URL(to, window.location.origin);
    return url.pathname.replace(/\/+$/, "") || "/admin";
  } catch {
    return to.split("?")[0].replace(/\/+$/, "") || "/admin";
  }
}

function preloadComponent(component: AdminLazyComponent | undefined) {
  if (!component?.preload) return undefined;

  suppressAppVersionRecovery(ADMIN_PRELOAD_RECOVERY_SUPPRESS_MS);
  return component.preload();
}

export const AdminLogin = lazyWithPreload(() => import("@/modules/admin/pages/auth/AdminLogin"));
export const AdminAccount = lazyWithPreload(() => import("@/modules/admin/pages/auth/AdminAccount"));
export const AdminAccounts = lazyWithPreload(() => import("@/modules/admin/pages/auth/AdminAccounts"));

export const Dashboard = lazyWithPreload(() => import("@/modules/admin/pages/dashboard/Dashboard"));

export const AdminProducts = lazyWithPreload(() => import("@/modules/admin/pages/product/AdminProducts"));
export const AdminProductForm = lazyWithPreload(() => import("@/modules/admin/pages/product/AdminProductForm"));
export const AdminCategories = lazyWithPreload(() => import("@/modules/admin/pages/product/AdminCategories"));
export const AdminInventory = lazyWithPreload(() => import("@/modules/admin/pages/product/AdminInventory"));
export const AdminProductTags = lazyWithPreload(() => import("@/modules/admin/pages/product/AdminProductTags"));
export const AdminBanners = lazyWithPreload(() => import("@/modules/admin/pages/product/AdminBanners"));

export const AdminOrders = lazyWithPreload(() => import("@/modules/admin/pages/order/AdminOrders"));
export const AdminCheckoutAbandonments = lazyWithPreload(() => import("@/modules/admin/pages/order/AdminCheckoutAbandonments"));
export const AdminOrderDetail = lazyWithPreload(() => import("@/modules/admin/pages/order/AdminOrderDetail"));
export const AdminReturns = lazyWithPreload(() => import("@/modules/admin/pages/order/AdminReturns"));
export const AdminShipping = lazyWithPreload(() => import("@/modules/admin/pages/order/AdminShipping"));

export const AdminUsers = lazyWithPreload(() => import("@/modules/admin/pages/user/AdminUsers"));
export const AdminUserDetail = lazyWithPreload(() => import("@/modules/admin/pages/user/AdminUserDetail"));
export const AdminUserSecurity = lazyWithPreload(() => import("@/modules/admin/pages/user/AdminUserSecurity"));
export const AdminUserFavorites = lazyWithPreload(() => import("@/modules/admin/pages/user/AdminUserFavorites"));
export const AdminUserHistory = lazyWithPreload(() => import("@/modules/admin/pages/user/AdminUserHistory"));
export const AdminPrivacyRequests = lazyWithPreload(() => import("@/modules/admin/pages/user/AdminPrivacyRequests"));
export const AdminFeedback = lazyWithPreload(() => import("@/modules/admin/pages/user/AdminFeedback"));
export const AdminMemberLevels = lazyWithPreload(() => import("@/modules/admin/pages/user/AdminMemberLevels"));
export const AdminInvites = lazyWithPreload(() => import("@/modules/admin/pages/user/AdminInvites"));

export const AdminCoupons = lazyWithPreload(() => import("@/modules/admin/pages/coupon/AdminCoupons"));
export const AdminCouponForm = lazyWithPreload(() => import("@/modules/admin/pages/coupon/AdminCouponForm"));
export const AdminCouponRecords = lazyWithPreload(() => import("@/modules/admin/pages/coupon/AdminCouponRecords"));
export const AdminCouponCampaigns = lazyWithPreload(() => import("@/modules/admin/pages/coupon/AdminCouponCampaigns"));
export const AdminCouponCampaignForm = lazyWithPreload(() => import("@/modules/admin/pages/coupon/AdminCouponCampaignForm"));
export const AdminActivities = lazyWithPreload(() => import("@/modules/admin/pages/marketing/AdminActivities"));
export const AdminMarketingDashboard = lazyWithPreload(() => import("@/modules/admin/pages/marketing/AdminMarketingDashboard"));
export const AdminActivityForm = lazyWithPreload(() => import("@/modules/admin/pages/marketing/AdminActivityForm"));
export const AdminMarketingPoints = lazyWithPreload(() => import("@/modules/admin/pages/marketing/AdminMarketingPoints"));
export const AdminMarketingRewards = lazyWithPreload(() => import("@/modules/admin/pages/marketing/AdminMarketingRewards"));

export const AdminReviews = lazyWithPreload(() => import("@/modules/admin/pages/review/AdminReviews"));
export const AdminNotifications = lazyWithPreload(() => import("@/modules/admin/pages/notification/AdminNotifications"));
export const AdminNotificationDetail = lazyWithPreload(() => import("@/modules/admin/pages/notification/AdminNotificationDetail"));
export const AdminEventCenter = lazyWithPreload(() => import("@/modules/admin/pages/event/AdminEventCenter"));

export const AdminReports = lazyWithPreload(() => import("@/modules/admin/pages/report/AdminReports"));
export const AdminReportOverview = lazyWithPreload(() => import("@/modules/admin/pages/report/AdminReportOverview"));
export const AdminSalesDailyReport = lazyWithPreload(() => import("@/modules/admin/pages/report/AdminSalesDailyReport"));
export const AdminSalesMonthlyReport = lazyWithPreload(() => import("@/modules/admin/pages/report/AdminSalesMonthlyReport"));
export const AdminProfitDailyReport = lazyWithPreload(() => import("@/modules/admin/pages/report/AdminProfitDailyReport"));
export const AdminOperatingExpenses = lazyWithPreload(() => import("@/modules/admin/pages/report/AdminOperatingExpenses"));
export const AdminProductAnalysisReport = lazyWithPreload(() => import("@/modules/admin/pages/report/AdminProductAnalysisReport"));
export const AdminCategoryAnalysisReport = lazyWithPreload(() => import("@/modules/admin/pages/report/AdminCategoryAnalysisReport"));
export const AdminOrderAnalysisReport = lazyWithPreload(() => import("@/modules/admin/pages/report/AdminOrderAnalysisReport"));
export const AdminCustomerAnalysisReport = lazyWithPreload(() => import("@/modules/admin/pages/report/AdminCustomerAnalysisReport"));
export const AdminActivityAnalysisReport = lazyWithPreload(() => import("@/modules/admin/pages/report/AdminActivityAnalysisReport"));
export const AdminPromotionConversionReport = lazyWithPreload(() => import("@/modules/admin/pages/report/AdminPromotionConversionReport"));
export const AdminCouponAnalysisReport = lazyWithPreload(() => import("@/modules/admin/pages/report/AdminCouponAnalysisReport"));
export const AdminDiscountCostReport = lazyWithPreload(() => import("@/modules/admin/pages/report/AdminDiscountCostReport"));
export const AdminPaymentFailureReport = lazyWithPreload(() => import("@/modules/admin/pages/report/AdminPaymentFailureReport"));
export const AdminInventoryAnalysisReport = lazyWithPreload(() => import("@/modules/admin/pages/report/AdminInventoryAnalysisReport"));
export const AdminInventoryOccupancyReport = lazyWithPreload(() => import("@/modules/admin/pages/report/AdminInventoryOccupancyReport"));
export const AdminOrderCancelReasonReport = lazyWithPreload(() => import("@/modules/admin/pages/report/AdminOrderCancelReasonReport"));
export const AdminSearchAnalysisReport = lazyWithPreload(() => import("@/modules/admin/pages/report/AdminSearchAnalysisReport"));
export const AdminTrafficAnalysisReport = lazyWithPreload(() => import("@/modules/admin/pages/report/AdminTrafficAnalysisReport"));
export const AdminExportCenter = lazyWithPreload(() => import("@/modules/admin/pages/report/AdminExportCenter"));

export const AdminSiteSettings = lazyWithPreload(() => import("@/modules/admin/pages/settings/site/SiteSettingsPage"));
export const AdminFeatureSettings = lazyWithPreload(() => import("@/modules/admin/pages/settings/AdminFeatureSettings"));
export const AdminSupportDownload = lazyWithPreload(() => import("@/modules/admin/pages/settings/AdminSupportDownload"));
export const AdminTelegramSettings = lazyWithPreload(() => import("@/modules/admin/pages/settings/AdminTelegramSettings"));
export const AdminThemeSettings = lazyWithPreload(() => import("@/modules/admin/pages/settings/AdminThemeSettings"));
export const AdminContent = lazyWithPreload(() => import("@/modules/admin/pages/settings/AdminContent"));
export const AdminHomeOps = lazyWithPreload(() => import("@/modules/admin/pages/settings/AdminHomeOps"));
export const AdminMyInvois = lazyWithPreload(() => import("@/modules/admin/pages/settings/AdminMyInvois"));

export const AdminRoles = lazyWithPreload(() => import("@/modules/admin/pages/rbac/AdminRoles"));

export const AdminLogs = lazyWithPreload(() => import("@/modules/admin/pages/system/AdminLogs"));
export const AdminRecycleBin = lazyWithPreload(() => import("@/modules/admin/pages/system/AdminRecycleBin"));
export const AdminDataRetention = lazyWithPreload(() => import("@/modules/admin/pages/system/AdminDataRetention"));
export const AdminBackupCenter = lazyWithPreload(() => import("@/modules/admin/pages/system/AdminBackupCenter"));

export const AdminPaymentChannels = lazyWithPreload(() => import("@/modules/admin/pages/payment/AdminPaymentChannels"));
export const AdminPaymentOrders = lazyWithPreload(() => import("@/modules/admin/pages/payment/AdminPaymentOrders"));
export const AdminPaymentEvents = lazyWithPreload(() => import("@/modules/admin/pages/payment/AdminPaymentEvents"));
export const AdminPaymentReconciliations = lazyWithPreload(() => import("@/modules/admin/pages/payment/AdminPaymentReconciliations"));

export const AdminMonitoringOverview = lazyWithPreload(() => import("@/modules/admin/pages/monitoring/AdminMonitoringOverview"));
export const AdminMonitoringAnomalies = lazyWithPreload(() => import("@/modules/admin/pages/monitoring/AdminMonitoringAnomalies"));
export const AdminMonitoringAnomalyDetail = lazyWithPreload(() => import("@/modules/admin/pages/monitoring/AdminMonitoringAnomalyDetail"));
export const AdminMonitoringRepairTasks = lazyWithPreload(() => import("@/modules/admin/pages/monitoring/AdminMonitoringRepairTasks"));
export const AdminMonitoringRules = lazyWithPreload(() => import("@/modules/admin/pages/monitoring/AdminMonitoringRules"));
export const AdminMonitoringRuns = lazyWithPreload(() => import("@/modules/admin/pages/monitoring/AdminMonitoringRuns"));

const ADMIN_EXACT_ROUTE_PRELOADERS = new Map<string, AdminLazyComponent>([
  ["/admin/login", AdminLogin],
  ["/admin", Dashboard],
  ["/admin/dashboard", Dashboard],
  ["/admin/account", AdminAccount],
  ["/admin/products", AdminProducts],
  ["/admin/products/new", AdminProductForm],
  ["/admin/categories", AdminCategories],
  ["/admin/inventory", AdminInventory],
  ["/admin/replenishment", AdminInventory],
  ["/admin/tags", AdminProductTags],
  ["/admin/orders", AdminOrders],
  ["/admin/orders/unfinished", AdminCheckoutAbandonments],
  ["/admin/payments/channels", AdminPaymentChannels],
  ["/admin/payments/orders", AdminPaymentOrders],
  ["/admin/payments/events", AdminPaymentEvents],
  ["/admin/payments/reconciliations", AdminPaymentReconciliations],
  ["/admin/users", AdminUsers],
  ["/admin/user-favorites", AdminUserFavorites],
  ["/admin/user-history", AdminUserHistory],
  ["/admin/privacy-requests", AdminPrivacyRequests],
  ["/admin/feedback", AdminFeedback],
  ["/admin/user-security", AdminUserSecurity],
  ["/admin/member-levels", AdminMemberLevels],
  ["/admin/settings/site", AdminSiteSettings],
  ["/admin/settings/features", AdminFeatureSettings],
  ["/admin/settings/telegram", AdminTelegramSettings],
  ["/admin/support-download", AdminSupportDownload],
  ["/admin/settings/theme", AdminThemeSettings],
  ["/admin/home-ops", AdminHomeOps],
  ["/admin/myinvois", AdminMyInvois],
  ["/admin/settings/shipping", AdminShipping],
  ["/admin/settings/roles", AdminRoles],
  ["/admin/marketing", AdminMarketingDashboard],
  ["/admin/marketing/activities", AdminActivities],
  ["/admin/marketing/activities/new", AdminActivityForm],
  ["/admin/marketing/coupons", AdminCoupons],
  ["/admin/marketing/coupons/new", AdminCouponForm],
  ["/admin/marketing/coupons/records", AdminCouponRecords],
  ["/admin/marketing/coupon-campaigns", AdminCouponCampaigns],
  ["/admin/marketing/coupon-campaigns/new", AdminCouponCampaignForm],
  ["/admin/marketing/points", AdminMarketingPoints],
  ["/admin/marketing/rewards", AdminMarketingRewards],
  ["/admin/marketing/invites", AdminInvites],
  ["/admin/reviews", AdminReviews],
  ["/admin/returns", AdminReturns],
  ["/admin/event-center", AdminEventCenter],
  ["/admin/notifications", AdminNotifications],
  ["/admin/monitoring", AdminMonitoringOverview],
  ["/admin/monitoring/anomalies", AdminMonitoringAnomalies],
  ["/admin/monitoring/repair-tasks", AdminMonitoringRepairTasks],
  ["/admin/monitoring/rules", AdminMonitoringRules],
  ["/admin/monitoring/runs", AdminMonitoringRuns],
  ["/admin/banners", AdminBanners],
  ["/admin/accounts", AdminAccounts],
  ["/admin/reports", AdminReports],
  ["/admin/reports/overview", AdminReportOverview],
  ["/admin/reports/daily", AdminSalesDailyReport],
  ["/admin/reports/monthly", AdminSalesMonthlyReport],
  ["/admin/reports/profit", AdminProfitDailyReport],
  ["/admin/reports/profit/daily", AdminProfitDailyReport],
  ["/admin/reports/profit/monthly", AdminProfitDailyReport],
  ["/admin/reports/expenses", AdminOperatingExpenses],
  ["/admin/reports/products", AdminProductAnalysisReport],
  ["/admin/reports/categories", AdminCategoryAnalysisReport],
  ["/admin/reports/inventory", AdminInventoryAnalysisReport],
  ["/admin/reports/inventory/occupancy", AdminInventoryOccupancyReport],
  ["/admin/reports/orders", AdminOrderAnalysisReport],
  ["/admin/reports/orders/cancel-reasons", AdminOrderCancelReasonReport],
  ["/admin/reports/payments/failures", AdminPaymentFailureReport],
  ["/admin/reports/customers", AdminCustomerAnalysisReport],
  ["/admin/reports/activities", AdminActivityAnalysisReport],
  ["/admin/reports/promotions/conversion", AdminPromotionConversionReport],
  ["/admin/reports/coupons", AdminCouponAnalysisReport],
  ["/admin/reports/discounts/cost", AdminDiscountCostReport],
  ["/admin/reports/search", AdminSearchAnalysisReport],
  ["/admin/reports/traffic", AdminTrafficAnalysisReport],
  ["/admin/exports", AdminExportCenter],
  ["/admin/recycle-bin", AdminRecycleBin],
  ["/admin/data-retention", AdminDataRetention],
  ["/admin/backups", AdminBackupCenter],
  ["/admin/audit-logs", AdminLogs],
  ["/admin/content", AdminContent],
]);

const ADMIN_PATTERN_ROUTE_PRELOADERS: Array<[RegExp, AdminLazyComponent]> = [
  [/^\/admin\/products\/[^/]+$/, AdminProductForm],
  [/^\/admin\/orders\/[^/]+$/, AdminOrderDetail],
  [/^\/admin\/users\/[^/]+$/, AdminUserDetail],
  [/^\/admin\/notifications\/[^/]+$/, AdminNotificationDetail],
  [/^\/admin\/marketing\/activities\/[^/]+\/edit$/, AdminActivityForm],
  [/^\/admin\/marketing\/coupons\/[^/]+$/, AdminCouponForm],
  [/^\/admin\/marketing\/coupon-campaigns\/[^/]+$/, AdminCouponCampaignForm],
  [/^\/admin\/monitoring\/anomalies\/[^/]+$/, AdminMonitoringAnomalyDetail],
];

const adminRoutePreloadCache = new Map<string, Promise<unknown>>();

export function preloadAdminRoute(to: string): Promise<unknown> | undefined {
  if (shouldSkipRoutePreload("intent")) return undefined;

  const pathname = normalizeAdminRoutePath(to);
  const component =
    ADMIN_EXACT_ROUTE_PRELOADERS.get(pathname)
    ?? ADMIN_PATTERN_ROUTE_PRELOADERS.find(([pattern]) => pattern.test(pathname))?.[1];
  if (!component?.preload) return undefined;

  const cached = adminRoutePreloadCache.get(pathname);
  if (cached) return cached;

  const preload = preloadComponent(component)
    ?.catch(() => {
      adminRoutePreloadCache.delete(pathname);
      return undefined;
    })
    ?? Promise.resolve(undefined);
  adminRoutePreloadCache.set(pathname, preload);
  return preload;
}

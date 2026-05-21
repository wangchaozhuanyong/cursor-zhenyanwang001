import { lazy, type ComponentType } from "react";

export type PreloadableLazy<T extends React.ComponentType<never>> = T & { preload?: () => Promise<unknown> };
export function lazyWithPreload<T extends React.ComponentType<never>>(factory: () => Promise<{ default: T }>) {
  const Component = lazy(factory) as PreloadableLazy<T>;
  Component.preload = factory;
  return Component;
}

/* ---------- Public（前台）页面，按业务域组织 ---------- */
export const MemberHome = lazyWithPreload(() => import("@/modules/public/pages/home/MemberHome"));
export const GuestHome = lazyWithPreload(() => import("@/modules/public/pages/home/GuestHome"));
export const Login = lazy(() => import("@/modules/public/pages/auth/Login"));
export const BindWechatPhone = lazy(() => import("@/modules/public/pages/auth/BindWechatPhone"));

export const Categories = lazyWithPreload(() => import("@/modules/public/pages/product/Categories"));
export const ProductDetail = lazy(() => import("@/modules/public/pages/product/ProductDetail"));
export const NewArrivals = lazyWithPreload(() => import("@/modules/public/pages/product/NewArrivals"));
export const Search = lazy(() => import("@/modules/public/pages/product/Search"));

export const Cart = lazyWithPreload(() => import("@/modules/public/pages/cart/Cart"));

export const Checkout = lazy(() => import("@/modules/public/pages/order/Checkout"));
export const Orders = lazyWithPreload(() => import("@/modules/public/pages/order/Orders"));
export const OrderDetail = lazy(() => import("@/modules/public/pages/order/OrderDetail"));
export const Returns = lazy(() => import("@/modules/public/pages/order/Returns"));
export const PendingReviews = lazy(() => import("@/modules/public/pages/review/PendingReviews"));

export const Profile = lazyWithPreload(() => import("@/modules/public/pages/user/Profile"));
export const Settings = lazy(() => import("@/modules/public/pages/user/Settings"));
export const AddressManage = lazy(() => import("@/modules/public/pages/user/AddressManage"));
export const Favorites = lazy(() => import("@/modules/public/pages/user/Favorites"));
export const History = lazy(() => import("@/modules/public/pages/user/History"));
export const Notifications = lazy(() => import("@/modules/public/pages/user/Notifications"));
export const Coupons = lazy(() => import("@/modules/public/pages/user/Coupons"));
export const Points = lazy(() => import("@/modules/public/pages/user/Points"));
export const Rewards = lazy(() => import("@/modules/public/pages/user/Rewards"));
export const Invite = lazy(() => import("@/modules/public/pages/user/Invite"));

export const Help = lazy(() => import("@/modules/public/pages/content/Help"));
export const About = lazy(() => import("@/modules/public/pages/content/About"));
export const ContentCmsPage = lazy(() => import("@/modules/public/pages/content/ContentCmsPage"));
export const SupportDownload = lazy(() => import("@/modules/public/pages/content/SupportDownload"));

export const NotFound = lazy(() => import("@/modules/public/pages/error/NotFound"));

/* ---------- Admin（后台）页面，按业务域组织 ---------- */
export const AdminLogin = lazy(() => import("@/modules/admin/pages/auth/AdminLogin"));
export const AdminAccount = lazy(() => import("@/modules/admin/pages/auth/AdminAccount"));
export const AdminAccounts = lazy(() => import("@/modules/admin/pages/auth/AdminAccounts"));

export const Dashboard = lazy(() => import("@/modules/admin/pages/dashboard/Dashboard"));

export const AdminProducts = lazy(() => import("@/modules/admin/pages/product/AdminProducts"));
export const AdminProductForm = lazy(() => import("@/modules/admin/pages/product/AdminProductForm"));
export const AdminCategories = lazy(() => import("@/modules/admin/pages/product/AdminCategories"));
export const AdminInventory = lazy(() => import("@/modules/admin/pages/product/AdminInventory"));
export const AdminProductTags = lazy(() => import("@/modules/admin/pages/product/AdminProductTags"));
export const AdminBanners = lazy(() => import("@/modules/admin/pages/product/AdminBanners"));

export const AdminOrders = lazy(() => import("@/modules/admin/pages/order/AdminOrders"));
export const AdminCheckoutAbandonments = lazy(() => import("@/modules/admin/pages/order/AdminCheckoutAbandonments"));
export const AdminOrderDetail = lazy(() => import("@/modules/admin/pages/order/AdminOrderDetail"));
export const AdminReturns = lazy(() => import("@/modules/admin/pages/order/AdminReturns"));
export const AdminShipping = lazy(() => import("@/modules/admin/pages/order/AdminShipping"));

export const AdminUsers = lazy(() => import("@/modules/admin/pages/user/AdminUsers"));
export const AdminUserDetail = lazy(() => import("@/modules/admin/pages/user/AdminUserDetail"));
export const AdminMemberLevels = lazy(() => import("@/modules/admin/pages/user/AdminMemberLevels"));
export const AdminInvites = lazy(() => import("@/modules/admin/pages/user/AdminInvites"));

export const AdminCoupons = lazy(() => import("@/modules/admin/pages/coupon/AdminCoupons"));
export const AdminCouponForm = lazy(() => import("@/modules/admin/pages/coupon/AdminCouponForm"));
export const AdminCouponRecords = lazy(() => import("@/modules/admin/pages/coupon/AdminCouponRecords"));
export const AdminActivities = lazy(() => import("@/modules/admin/pages/marketing/AdminActivities"));
export const AdminMarketingDashboard = lazy(() => import("@/modules/admin/pages/marketing/AdminMarketingDashboard"));
export const AdminActivityForm = lazy(() => import("@/modules/admin/pages/marketing/AdminActivityForm"));
export const AdminMarketingPoints = lazy(() => import("@/modules/admin/pages/marketing/AdminMarketingPoints"));
export const AdminMarketingRewards = lazy(() => import("@/modules/admin/pages/marketing/AdminMarketingRewards"));

export const AdminReviews = lazy(() => import("@/modules/admin/pages/review/AdminReviews"));
export const AdminNotifications = lazy(() => import("@/modules/admin/pages/notification/AdminNotifications"));
export const AdminNotificationDetail = lazy(() => import("@/modules/admin/pages/notification/AdminNotificationDetail"));

export const AdminReports = lazy(() => import("@/modules/admin/pages/report/AdminReports"));
export const AdminReportOverview = lazy(() => import("@/modules/admin/pages/report/AdminReportOverview"));
export const AdminSalesDailyReport = lazy(() => import("@/modules/admin/pages/report/AdminSalesDailyReport"));
export const AdminSalesMonthlyReport = lazy(() => import("@/modules/admin/pages/report/AdminSalesMonthlyReport"));
export const AdminProfitDailyReport = lazy(() => import("@/modules/admin/pages/report/AdminProfitDailyReport"));
export const AdminOperatingExpenses = lazy(() => import("@/modules/admin/pages/report/AdminOperatingExpenses"));
export const AdminProductAnalysisReport = lazy(() => import("@/modules/admin/pages/report/AdminProductAnalysisReport"));
export const AdminCategoryAnalysisReport = lazy(() => import("@/modules/admin/pages/report/AdminCategoryAnalysisReport"));
export const AdminOrderAnalysisReport = lazy(() => import("@/modules/admin/pages/report/AdminOrderAnalysisReport"));
export const AdminCustomerAnalysisReport = lazy(() => import("@/modules/admin/pages/report/AdminCustomerAnalysisReport"));
export const AdminActivityAnalysisReport = lazy(() => import("@/modules/admin/pages/report/AdminActivityAnalysisReport"));
export const AdminCouponAnalysisReport = lazy(() => import("@/modules/admin/pages/report/AdminCouponAnalysisReport"));
export const AdminInventoryAnalysisReport = lazy(() => import("@/modules/admin/pages/report/AdminInventoryAnalysisReport"));
export const AdminSearchAnalysisReport = lazy(() => import("@/modules/admin/pages/report/AdminSearchAnalysisReport"));
export const AdminTrafficAnalysisReport = lazy(() => import("@/modules/admin/pages/report/AdminTrafficAnalysisReport"));
export const AdminExportCenter = lazy(() => import("@/modules/admin/pages/report/AdminExportCenter"));

export const AdminSiteSettings = lazy(() => import("@/modules/admin/pages/settings/AdminSiteSettings"));
export const AdminFeatureSettings = lazy(() => import("@/modules/admin/pages/settings/AdminFeatureSettings"));
export const AdminSupportDownload = lazy(() => import("@/modules/admin/pages/settings/AdminSupportDownload"));
export const AdminTelegramSettings = lazy(() => import("@/modules/admin/pages/settings/AdminTelegramSettings"));
export const AdminThemeSettings = lazy(() => import("@/modules/admin/pages/settings/AdminThemeSettings"));
export const AdminContent = lazy(() => import("@/modules/admin/pages/settings/AdminContent"));
export const AdminHomeOps = lazy(() => import("@/modules/admin/pages/settings/AdminHomeOps"));

export const AdminRoles = lazy(() => import("@/modules/admin/pages/rbac/AdminRoles"));

export const AdminLogs = lazy(() => import("@/modules/admin/pages/system/AdminLogs"));
export const AdminRecycleBin = lazy(() => import("@/modules/admin/pages/system/AdminRecycleBin"));

export const AdminPaymentChannels = lazy(() => import("@/modules/admin/pages/payment/AdminPaymentChannels"));
export const AdminPaymentOrders = lazy(() => import("@/modules/admin/pages/payment/AdminPaymentOrders"));
export const AdminPaymentEvents = lazy(() => import("@/modules/admin/pages/payment/AdminPaymentEvents"));
export const AdminPaymentReconciliations = lazy(() => import("@/modules/admin/pages/payment/AdminPaymentReconciliations"));

export const AdminMonitoringOverview = lazy(() => import("@/modules/admin/pages/monitoring/AdminMonitoringOverview"));
export const AdminMonitoringAnomalies = lazy(() => import("@/modules/admin/pages/monitoring/AdminMonitoringAnomalies"));
export const AdminMonitoringAnomalyDetail = lazy(() => import("@/modules/admin/pages/monitoring/AdminMonitoringAnomalyDetail"));
export const AdminMonitoringRepairTasks = lazy(() => import("@/modules/admin/pages/monitoring/AdminMonitoringRepairTasks"));
export const AdminMonitoringRules = lazy(() => import("@/modules/admin/pages/monitoring/AdminMonitoringRules"));
export const AdminMonitoringRuns = lazy(() => import("@/modules/admin/pages/monitoring/AdminMonitoringRuns"));

import { lazy, Suspense, useEffect, useLayoutEffect, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TopProgressBar } from "@/components/ui/top-progress-bar";
import AppRouteFallback from "@/components/AppRouteFallback";
import CookieConsentBanner from "@/components/CookieConsentBanner";
import TrackingManager from "@/components/TrackingManager";
import RouteAnalyticsTracker from "@/components/RouteAnalyticsTracker";
import PwaInstallPrompt from "@/components/PwaInstallPrompt";
import PwaUpdateToast from "@/components/PwaUpdateToast";
import RouteSeoGuard from "@/components/RouteSeoGuard";

import AdminLayout from "./layouts/AdminLayout";
import { LegacyCouponRedirect } from "@/routes/adminLegacyRedirects";
import FrontLayout from "./layouts/FrontLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import ErrorBoundary from "./components/ErrorBoundary";
import { useAuthStore } from "@/stores/useAuthStore";
import { isLoggedIn } from "@/utils/token";
import {
  DEFAULT_APPLE_TOUCH_ICON,
  DEFAULT_FAVICON_ICO,
  DEFAULT_FAVICON_PNG,
  DEFAULT_FAVICON_SVG,
  DEFAULT_FAVICON_WEBP,
} from "@/constants/siteBrand";
import { useSiteInfo } from "@/hooks/useSiteInfo";
import { syncLockedInviteCodeBySearch } from "@/utils/inviteReferral";
import { useThemeRuntime } from "@/contexts/ThemeRuntimeProvider";
import { StoreOutletFallback } from "@/components/AppRouteFallback";
import { useAdminTOptional } from "@/hooks/useAdminT";
import { AdminI18nProvider } from "@/contexts/AdminI18nProvider";
import { useLoyaltyVisibility } from "@/hooks/useLoyaltyVisibility";

type PreloadableLazy<T extends React.ComponentType<never>> = T & { preload?: () => Promise<unknown> };
function lazyWithPreload<T extends React.ComponentType<never>>(factory: () => Promise<{ default: T }>) {
  const Component = lazy(factory) as PreloadableLazy<T>;
  Component.preload = factory;
  return Component;
}

/* ---------- Public（前台）页面，按业务域组织 ---------- */
const MemberHome = lazyWithPreload(() => import("@/modules/public/pages/home/MemberHome"));
const GuestHome = lazyWithPreload(() => import("@/modules/public/pages/home/GuestHome"));
const Login = lazy(() => import("@/modules/public/pages/auth/Login"));
const BindWechatPhone = lazy(() => import("@/modules/public/pages/auth/BindWechatPhone"));

const Categories = lazyWithPreload(() => import("@/modules/public/pages/product/Categories"));
const ProductDetail = lazy(() => import("@/modules/public/pages/product/ProductDetail"));
const NewArrivals = lazyWithPreload(() => import("@/modules/public/pages/product/NewArrivals"));
const Search = lazy(() => import("@/modules/public/pages/product/Search"));

const Cart = lazyWithPreload(() => import("@/modules/public/pages/cart/Cart"));

const Checkout = lazy(() => import("@/modules/public/pages/order/Checkout"));
const Orders = lazyWithPreload(() => import("@/modules/public/pages/order/Orders"));
const OrderDetail = lazy(() => import("@/modules/public/pages/order/OrderDetail"));
const Returns = lazy(() => import("@/modules/public/pages/order/Returns"));
const PendingReviews = lazy(() => import("@/modules/public/pages/review/PendingReviews"));

const Profile = lazyWithPreload(() => import("@/modules/public/pages/user/Profile"));
const Settings = lazy(() => import("@/modules/public/pages/user/Settings"));
const AddressManage = lazy(() => import("@/modules/public/pages/user/AddressManage"));
const Favorites = lazy(() => import("@/modules/public/pages/user/Favorites"));
const History = lazy(() => import("@/modules/public/pages/user/History"));
const Notifications = lazy(() => import("@/modules/public/pages/user/Notifications"));
const Coupons = lazy(() => import("@/modules/public/pages/user/Coupons"));
const Points = lazy(() => import("@/modules/public/pages/user/Points"));
const Rewards = lazy(() => import("@/modules/public/pages/user/Rewards"));
const Invite = lazy(() => import("@/modules/public/pages/user/Invite"));

const Help = lazy(() => import("@/modules/public/pages/content/Help"));
const About = lazy(() => import("@/modules/public/pages/content/About"));
const ContentCmsPage = lazy(() => import("@/modules/public/pages/content/ContentCmsPage"));
const SupportDownload = lazy(() => import("@/modules/public/pages/content/SupportDownload"));

const NotFound = lazy(() => import("@/modules/public/pages/error/NotFound"));

/* ---------- Admin（后台）页面，按业务域组织 ---------- */
const AdminLogin = lazy(() => import("@/modules/admin/pages/auth/AdminLogin"));
const AdminAccount = lazy(() => import("@/modules/admin/pages/auth/AdminAccount"));
const AdminAccounts = lazy(() => import("@/modules/admin/pages/auth/AdminAccounts"));

const Dashboard = lazy(() => import("@/modules/admin/pages/dashboard/Dashboard"));

const AdminProducts = lazy(() => import("@/modules/admin/pages/product/AdminProducts"));
const AdminProductForm = lazy(() => import("@/modules/admin/pages/product/AdminProductForm"));
const AdminCategories = lazy(() => import("@/modules/admin/pages/product/AdminCategories"));
const AdminInventory = lazy(() => import("@/modules/admin/pages/product/AdminInventory"));
const AdminProductTags = lazy(() => import("@/modules/admin/pages/product/AdminProductTags"));
const AdminBanners = lazy(() => import("@/modules/admin/pages/product/AdminBanners"));

const AdminOrders = lazy(() => import("@/modules/admin/pages/order/AdminOrders"));
const AdminCheckoutAbandonments = lazy(() => import("@/modules/admin/pages/order/AdminCheckoutAbandonments"));
const AdminOrderDetail = lazy(() => import("@/modules/admin/pages/order/AdminOrderDetail"));
const AdminReturns = lazy(() => import("@/modules/admin/pages/order/AdminReturns"));
const AdminShipping = lazy(() => import("@/modules/admin/pages/order/AdminShipping"));

const AdminUsers = lazy(() => import("@/modules/admin/pages/user/AdminUsers"));
const AdminUserDetail = lazy(() => import("@/modules/admin/pages/user/AdminUserDetail"));
const AdminMemberLevels = lazy(() => import("@/modules/admin/pages/user/AdminMemberLevels"));
const AdminInvites = lazy(() => import("@/modules/admin/pages/user/AdminInvites"));

const AdminCoupons = lazy(() => import("@/modules/admin/pages/coupon/AdminCoupons"));
const AdminCouponForm = lazy(() => import("@/modules/admin/pages/coupon/AdminCouponForm"));
const AdminCouponRecords = lazy(() => import("@/modules/admin/pages/coupon/AdminCouponRecords"));
const AdminActivities = lazy(() => import("@/modules/admin/pages/marketing/AdminActivities"));
const AdminMarketingDashboard = lazy(() => import("@/modules/admin/pages/marketing/AdminMarketingDashboard"));
const AdminActivityForm = lazy(() => import("@/modules/admin/pages/marketing/AdminActivityForm"));
const AdminMarketingPoints = lazy(() => import("@/modules/admin/pages/marketing/AdminMarketingPoints"));
const AdminMarketingRewards = lazy(() => import("@/modules/admin/pages/marketing/AdminMarketingRewards"));

const AdminReviews = lazy(() => import("@/modules/admin/pages/review/AdminReviews"));
const AdminNotifications = lazy(() => import("@/modules/admin/pages/notification/AdminNotifications"));
const AdminNotificationDetail = lazy(() => import("@/modules/admin/pages/notification/AdminNotificationDetail"));

const AdminReports = lazy(() => import("@/modules/admin/pages/report/AdminReports"));
const AdminReportOverview = lazy(() => import("@/modules/admin/pages/report/AdminReportOverview"));
const AdminSalesDailyReport = lazy(() => import("@/modules/admin/pages/report/AdminSalesDailyReport"));
const AdminSalesMonthlyReport = lazy(() => import("@/modules/admin/pages/report/AdminSalesMonthlyReport"));
const AdminProductAnalysisReport = lazy(() => import("@/modules/admin/pages/report/AdminProductAnalysisReport"));
const AdminCategoryAnalysisReport = lazy(() => import("@/modules/admin/pages/report/AdminCategoryAnalysisReport"));
const AdminOrderAnalysisReport = lazy(() => import("@/modules/admin/pages/report/AdminOrderAnalysisReport"));
const AdminCustomerAnalysisReport = lazy(() => import("@/modules/admin/pages/report/AdminCustomerAnalysisReport"));
const AdminActivityAnalysisReport = lazy(() => import("@/modules/admin/pages/report/AdminActivityAnalysisReport"));
const AdminCouponAnalysisReport = lazy(() => import("@/modules/admin/pages/report/AdminCouponAnalysisReport"));
const AdminInventoryAnalysisReport = lazy(() => import("@/modules/admin/pages/report/AdminInventoryAnalysisReport"));
const AdminSearchAnalysisReport = lazy(() => import("@/modules/admin/pages/report/AdminSearchAnalysisReport"));
const AdminTrafficAnalysisReport = lazy(() => import("@/modules/admin/pages/report/AdminTrafficAnalysisReport"));
const AdminExportCenter = lazy(() => import("@/modules/admin/pages/report/AdminExportCenter"));

const AdminSiteSettings = lazy(() => import("@/modules/admin/pages/settings/AdminSiteSettings"));
const AdminSupportDownload = lazy(() => import("@/modules/admin/pages/settings/AdminSupportDownload"));
const AdminThemeSettings = lazy(() => import("@/modules/admin/pages/settings/AdminThemeSettings"));
const AdminContent = lazy(() => import("@/modules/admin/pages/settings/AdminContent"));
const AdminHomeOps = lazy(() => import("@/modules/admin/pages/settings/AdminHomeOps"));

const AdminRoles = lazy(() => import("@/modules/admin/pages/rbac/AdminRoles"));

const AdminLogs = lazy(() => import("@/modules/admin/pages/system/AdminLogs"));
const AdminRecycleBin = lazy(() => import("@/modules/admin/pages/system/AdminRecycleBin"));

const AdminPaymentChannels = lazy(() => import("@/modules/admin/pages/payment/AdminPaymentChannels"));
const AdminPaymentOrders = lazy(() => import("@/modules/admin/pages/payment/AdminPaymentOrders"));
const AdminPaymentEvents = lazy(() => import("@/modules/admin/pages/payment/AdminPaymentEvents"));
const AdminPaymentReconciliations = lazy(() => import("@/modules/admin/pages/payment/AdminPaymentReconciliations"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

/** 持久化的 isAuthenticated 与登录标记可能不一致（清缓存、多标签页等），启动时与 token 标记对齐 */
function AuthTokenSync() {
  useLayoutEffect(() => {
    useAuthStore.setState({ isAuthenticated: isLoggedIn() });
  }, []);
  return null;
}

function SiteIdentitySync() {
  const siteInfo = useSiteInfo();

  useLayoutEffect(() => {
    const raw = (siteInfo.faviconUrl || "").trim();
    const custom =
      raw && !raw.startsWith("data:") && !/lovable/i.test(raw) ? raw : "";

    const iconTargets: Array<{ rel: string; href: string; type?: string; sizes?: string }> = custom
      ? [
          { rel: "icon", href: custom },
          { rel: "apple-touch-icon", href: "/api/pwa/apple-touch-icon.png" },
        ]
      : [
          { rel: "icon", href: DEFAULT_FAVICON_ICO, sizes: "any" },
          { rel: "icon", href: DEFAULT_FAVICON_SVG, type: "image/svg+xml" },
          { rel: "icon", href: DEFAULT_FAVICON_PNG, type: "image/png", sizes: "32x32" },
          { rel: "icon", href: DEFAULT_FAVICON_WEBP, type: "image/webp" },
          { rel: "shortcut icon", href: DEFAULT_FAVICON_ICO },
          { rel: "apple-touch-icon", href: DEFAULT_APPLE_TOUCH_ICON },
        ];

    document
      .querySelectorAll<HTMLLinkElement>(
        "link[rel='icon'], link[rel='shortcut icon'], link[rel='apple-touch-icon']",
      )
      .forEach((el) => el.remove());

    iconTargets.forEach(({ rel, href, type, sizes }) => {
      const link = document.createElement("link");
      link.rel = rel;
      link.href = href;
      if (type) link.type = type;
      if (sizes) link.sizes = sizes;
      document.head.appendChild(link);
    });
  }, [siteInfo.faviconUrl]);

  return null;
}

function ReferralInviteSync() {
  const location = useLocation();
  useEffect(() => {
    syncLockedInviteCodeBySearch(location.search);
  }, [location.search]);
  return null;
}

function AdminI18nScope({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  if (!pathname.startsWith("/admin")) return <>{children}</>;
  return <AdminI18nProvider>{children}</AdminI18nProvider>;
}

function AdminTitleSync() {
  const location = useLocation();
  const siteInfo = useSiteInfo();
  const { t } = useAdminTOptional();

  useEffect(() => {
    if (!location.pathname.startsWith("/admin")) return;
    const siteName = (siteInfo.siteName || "大马通").trim();
    const seoTitle = (siteInfo.seoTitle || "").trim();
    const routeTitleMap: Array<{ test: (path: string) => boolean; titleKey: string }> = [
      { test: (p) => p === "/admin" || p === "/admin/", titleKey: "routeTitles.admin" },
      { test: (p) => p === "/admin/account", titleKey: "routeTitles.account" },
      { test: (p) => p === "/admin/products/new", titleKey: "routeTitles.productNewFull" },
      { test: (p) => /^\/admin\/products\/[^/]+$/.test(p), titleKey: "routeTitles.productEditFull" },
      {
        test: (p) => /^\/admin\/orders\/[^/]+$/.test(p) && !p.startsWith("/admin/orders/unfinished"),
        titleKey: "routeTitles.orderDetailFull",
      },
      { test: (p) => /^\/admin\/users\/[^/]+$/.test(p), titleKey: "routeTitles.userDetailFull" },
      { test: (p) => /^\/admin\/notifications\/[^/]+$/.test(p), titleKey: "routeTitles.notificationDetailFull" },
      { test: (p) => p === "/admin/marketing/coupons/new", titleKey: "routeTitles.couponNewFull" },
      {
        test: (p) => /^\/admin\/marketing\/coupons\/[^/]+$/.test(p) && p !== "/admin/marketing/coupons/records",
        titleKey: "routeTitles.couponEditFull",
      },
      { test: (p) => p.startsWith("/admin/settings/site"), titleKey: "routeTitles.siteSettings" },
      { test: (p) => p.startsWith("/admin/settings/theme"), titleKey: "routeTitles.theme" },
      { test: (p) => p.startsWith("/admin/home-ops"), titleKey: "routeTitles.homeOps" },
      { test: (p) => p.startsWith("/admin/support-download"), titleKey: "routeTitles.supportDownload" },
      { test: (p) => p.startsWith("/admin/banners"), titleKey: "routeTitles.banners" },
      { test: (p) => p.startsWith("/admin/content"), titleKey: "routeTitles.content" },
      { test: (p) => p.startsWith("/admin/payments"), titleKey: "routeTitles.payments" },
      { test: (p) => p.startsWith("/admin/returns"), titleKey: "routeTitles.returns" },
      { test: (p) => p.startsWith("/admin/reviews"), titleKey: "routeTitles.reviews" },
      { test: (p) => p.startsWith("/admin/accounts") || p.startsWith("/admin/settings/roles"), titleKey: "routeTitles.staff" },
      { test: (p) => p === "/admin/marketing", titleKey: "routeTitles.marketing" },
      { test: (p) => p === "/admin/marketing/activities/new", titleKey: "routeTitles.marketingNewFull" },
      { test: (p) => /^\/admin\/marketing\/activities\/[^/]+\/edit$/.test(p), titleKey: "routeTitles.marketingEditFull" },
      { test: (p) => p.startsWith("/admin/marketing/activities"), titleKey: "routeTitles.marketingActivities" },
      { test: (p) => p.startsWith("/admin/marketing/coupons/records"), titleKey: "routeTitles.couponRecords" },
      { test: (p) => p.startsWith("/admin/marketing/coupons"), titleKey: "routeTitles.coupons" },
      { test: (p) => p.startsWith("/admin/marketing/points"), titleKey: "routeTitles.points" },
      { test: (p) => p.startsWith("/admin/marketing/rewards"), titleKey: "routeTitles.rewards" },
      { test: (p) => p.startsWith("/admin/marketing/invites"), titleKey: "routeTitles.invites" },
      { test: (p) => p.startsWith("/admin/users"), titleKey: "routeTitles.users" },
      { test: (p) => p.startsWith("/admin/member-levels"), titleKey: "routeTitles.memberLevels" },
      { test: (p) => p.startsWith("/admin/orders/unfinished"), titleKey: "routeTitles.unfinishedOrders" },
      { test: (p) => p.startsWith("/admin/orders"), titleKey: "routeTitles.orders" },
      { test: (p) => p.startsWith("/admin/products") || p.startsWith("/admin/categories") || p.startsWith("/admin/inventory") || p.startsWith("/admin/tags"), titleKey: "routeTitles.products" },
      { test: (p) => p.startsWith("/admin/reports/traffic"), titleKey: "routeTitles.traffic" },
      { test: (p) => p.startsWith("/admin/reports"), titleKey: "routeTitles.reports" },
      { test: (p) => p.startsWith("/admin/exports"), titleKey: "routeTitles.exports" },
      { test: (p) => p.startsWith("/admin/logs"), titleKey: "routeTitles.auditLogs" },
      { test: (p) => p.startsWith("/admin/recycle-bin"), titleKey: "routeTitles.recycleBin" },
      { test: (p) => p.startsWith("/admin/notifications"), titleKey: "routeTitles.notifications" },
    ];
    const match = routeTitleMap.find((item) => item.test(location.pathname));
    const pageTitle = t(match?.titleKey ?? "routeTitles.admin");
    document.title = `${pageTitle} | ${siteName || seoTitle || "大马通"}`;
  }, [location.pathname, siteInfo.siteName, siteInfo.seoTitle, t]);

  return null;
}

function AppScopeSync() {
  const location = useLocation();
  useEffect(() => {
    const isAdmin = location.pathname.startsWith("/admin");
    const scope = isAdmin ? "admin" : "store";
    document.documentElement.setAttribute("data-app-scope", scope);
    window.dispatchEvent(new CustomEvent("app:scope-changed", { detail: { scope } }));
  }, [location.pathname]);
  return null;
}

function HomeRoute() {
  const { themeReady } = useThemeRuntime();
  if (!themeReady) return <StoreOutletFallback />;
  return isLoggedIn() ? <MemberHome /> : <GuestHome />;
}

function RoutePreloadOnIdle() {
  useEffect(() => {
    const run = () => {
      Categories.preload?.();
      NewArrivals.preload?.();
      Cart.preload?.();
      Profile.preload?.();
      if (isLoggedIn()) Orders.preload?.();
    };
    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      const id = (window as Window & { requestIdleCallback: (cb: () => void) => number }).requestIdleCallback(run);
      return () => {
        const cancel = (window as Window & { cancelIdleCallback?: (id: number) => void }).cancelIdleCallback;
        if (cancel) cancel(id);
      };
    }
    const timer = window.setTimeout(run, 300);
    return () => window.clearTimeout(timer);
  }, []);
  return null;
}

function LoyaltyRouteGuard({
  feature,
  children,
}: {
  feature: "points" | "reward" | "referral";
  children: ReactNode;
}) {
  const { config, loading } = useLoyaltyVisibility();
  const enabled =
    feature === "points"
      ? Boolean(config?.points?.displayEnabled)
      : feature === "reward"
        ? Boolean(config?.reward?.displayEnabled)
        : Boolean(config?.reward?.referralEnabled);
  if (loading) return <AppRouteFallback />;
  if (!enabled) return <Navigate to="/profile" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const location = useLocation();
  return (
    <ErrorBoundary resetKey={location.pathname}>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Sonner />
          <TopProgressBar />
          <RoutePreloadOnIdle />
          <AuthTokenSync />
          <SiteIdentitySync />
          <ReferralInviteSync />
          <AppScopeSync />
          <AdminI18nScope>
          <AdminTitleSync />
          <TrackingManager />
          <RouteAnalyticsTracker />
          <RouteSeoGuard />
          <PwaInstallPrompt />
          <PwaUpdateToast />
          <Suspense fallback={<AppRouteFallback />}>
            <Routes>
              {/* Pages with bottom nav */}
              <Route element={<FrontLayout />}>
              <Route path="/" element={<HomeRoute />} />
              <Route path="/categories" element={<Categories />} />
              <Route path="/new-arrivals" element={<NewArrivals />} />
              <Route path="/support-download" element={<SupportDownload />} />
              <Route path="/search" element={<Search />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/favorites" element={<Favorites />} />
              <Route path="/profile" element={<Profile />} />
              </Route>

              {/* Public pages */}
              <Route path="/product/:id" element={<ProductDetail />} />
              <Route path="/login" element={<Login />} />
              <Route path="/login/bind-phone" element={<BindWechatPhone />} />
              <Route path="/help" element={<Help />} />
              <Route path="/about" element={<About />} />
              <Route path="/install" element={<SupportDownload />} />
              <Route path="/content/:slug" element={<ContentCmsPage />} />

              {/* Protected pages (require login) */}
              <Route path="/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
              <Route path="/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
              <Route path="/orders/:id" element={<ProtectedRoute><OrderDetail /></ProtectedRoute>} />
              <Route
                path="/invite"
                element={
                  <ProtectedRoute>
                    <LoyaltyRouteGuard feature="referral">
                      <Invite />
                    </LoyaltyRouteGuard>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/points"
                element={
                  <ProtectedRoute>
                    <LoyaltyRouteGuard feature="points">
                      <Points />
                    </LoyaltyRouteGuard>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/rewards"
                element={
                  <ProtectedRoute>
                    <LoyaltyRouteGuard feature="reward">
                      <Rewards />
                    </LoyaltyRouteGuard>
                  </ProtectedRoute>
                }
              />
              <Route path="/address" element={<ProtectedRoute><AddressManage /></ProtectedRoute>} />
              <Route path="/coupons" element={<ProtectedRoute><Coupons /></ProtectedRoute>} />
              <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
              <Route path="/returns" element={<ProtectedRoute><Returns /></ProtectedRoute>} />
              <Route path="/reviews/pending" element={<ProtectedRoute><PendingReviews /></ProtectedRoute>} />
              {/* 与购物车/收藏一致：未登录可读取本地持久化浏览记录 */}
              <Route path="/history" element={<History />} />

              {/* Admin routes */}
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<Dashboard />} />
                <Route path="products" element={<AdminProducts />} />
                <Route path="products/:id" element={<AdminProductForm />} />
                <Route path="categories" element={<AdminCategories />} />
                <Route path="inventory" element={<AdminInventory />} />
                <Route path="tags" element={<AdminProductTags />} />
                <Route path="orders" element={<AdminOrders />} />
                <Route path="orders/unfinished" element={<AdminCheckoutAbandonments />} />
                <Route path="orders/:id" element={<AdminOrderDetail />} />
                <Route path="payments/channels" element={<AdminPaymentChannels />} />
                <Route path="payments/orders" element={<AdminPaymentOrders />} />
                <Route path="payments/events" element={<AdminPaymentEvents />} />
                <Route path="payments/reconciliations" element={<AdminPaymentReconciliations />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="users/:id" element={<AdminUserDetail />} />
                <Route path="member-levels" element={<AdminMemberLevels />} />
                <Route path="invites" element={<Navigate to="/admin/marketing/invites" replace />} />
                <Route path="rewards" element={<Navigate to="/admin/marketing/rewards" replace />} />
                <Route path="points/records" element={<Navigate to="/admin/marketing/points" replace />} />
                <Route path="settings/points" element={<Navigate to="/admin/marketing/points" replace />} />
                <Route path="settings/referral" element={<Navigate to="/admin/marketing/rewards" replace />} />
                <Route path="settings/site" element={<AdminSiteSettings />} />
                <Route path="support-download" element={<AdminSupportDownload />} />
                <Route path="settings/theme" element={<AdminThemeSettings />} />
                <Route path="home-ops" element={<AdminHomeOps />} />
                <Route path="settings/shipping" element={<AdminShipping />} />
                <Route path="settings/roles" element={<AdminRoles />} />
                <Route path="coupons" element={<Navigate to="/admin/marketing/coupons" replace />} />
                <Route path="coupons/new" element={<Navigate to="/admin/marketing/coupons/new" replace />} />
                <Route path="coupons/records" element={<Navigate to="/admin/marketing/coupons/records" replace />} />
                <Route path="coupons/:id" element={<LegacyCouponRedirect />} />
                <Route path="marketing" element={<AdminMarketingDashboard />} />
                <Route path="marketing/activities" element={<AdminActivities />} />
                <Route path="marketing/activities/new" element={<AdminActivityForm />} />
                <Route path="marketing/activities/:id/edit" element={<AdminActivityForm />} />
                <Route path="marketing/coupons" element={<AdminCoupons />} />
                <Route path="marketing/coupons/new" element={<AdminCouponForm />} />
                <Route path="marketing/coupons/:id" element={<AdminCouponForm />} />
                <Route path="marketing/coupons/records" element={<AdminCouponRecords />} />
                <Route path="marketing/points" element={<AdminMarketingPoints />} />
                <Route path="marketing/rewards" element={<AdminMarketingRewards />} />
                <Route path="marketing/invites" element={<AdminInvites />} />
                <Route path="reviews" element={<AdminReviews />} />
                <Route path="returns" element={<AdminReturns />} />
                <Route path="notifications" element={<AdminNotifications />} />
                <Route path="notifications/:id" element={<AdminNotificationDetail />} />
                <Route path="account" element={<AdminAccount />} />
                <Route path="banners" element={<AdminBanners />} />
                <Route path="reports" element={<AdminReports />} />
                <Route path="reports/overview" element={<AdminReportOverview />} />
                <Route path="reports/daily" element={<AdminSalesDailyReport />} />
                <Route path="reports/monthly" element={<AdminSalesMonthlyReport />} />
                <Route path="reports/products" element={<AdminProductAnalysisReport />} />
                <Route path="reports/categories" element={<AdminCategoryAnalysisReport />} />
                <Route path="reports/orders" element={<AdminOrderAnalysisReport />} />
                <Route path="reports/customers" element={<AdminCustomerAnalysisReport />} />
                <Route path="reports/activities" element={<AdminActivityAnalysisReport />} />
                <Route path="reports/coupons" element={<AdminCouponAnalysisReport />} />
                <Route path="reports/inventory" element={<AdminInventoryAnalysisReport />} />
                <Route path="reports/search" element={<AdminSearchAnalysisReport />} />
                <Route path="reports/traffic" element={<AdminTrafficAnalysisReport />} />
                <Route path="accounts" element={<AdminAccounts />} />
                <Route path="recycle-bin" element={<AdminRecycleBin />} />
                <Route path="exports" element={<AdminExportCenter />} />
                <Route path="logs" element={<AdminLogs />} />
                <Route path="content" element={<AdminContent />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
          </AdminI18nScope>
          <CookieConsentBanner />
      </TooltipProvider>
    </QueryClientProvider>
    </ErrorBoundary>
  );
}

const App = () => (
  <BrowserRouter
    future={{
      v7_startTransition: true,
      v7_relativeSplatPath: true,
    }}
  >
    <AppRoutes />
  </BrowserRouter>
);

export default App;




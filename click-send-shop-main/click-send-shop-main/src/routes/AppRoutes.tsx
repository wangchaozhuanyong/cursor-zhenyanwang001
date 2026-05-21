import { Suspense, useEffect, useLayoutEffect, type ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TopProgressBar } from "@/components/ui/top-progress-bar";
import AppRouteFallback, { StoreOutletFallback } from "@/components/AppRouteFallback";
import CookieConsentBanner from "@/components/CookieConsentBanner";
import TrackingManager from "@/components/TrackingManager";
import RouteAnalyticsTracker from "@/components/RouteAnalyticsTracker";
import PwaUpdateToast from "@/components/PwaUpdateToast";
import RouteSeoGuard from "@/components/RouteSeoGuard";
import AgeGate from "@/components/compliance/AgeGate";
import LanguageGate from "@/components/LanguageGate";
import AdminLayout from "@/layouts/AdminLayout";
import { LegacyCouponRedirect } from "@/routes/adminLegacyRedirects";
import FrontLayout from "@/layouts/FrontLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import ErrorBoundary from "@/components/ErrorBoundary";
import { useAuthStore } from "@/stores/useAuthStore";
import { isLoggedIn, clearTokens } from "@/utils/token";
import * as authService from "@/services/authService";
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
import { useAdminTOptional } from "@/hooks/useAdminT";
import { AdminI18nProvider } from "@/contexts/AdminI18nProvider";
import { useLoyaltyVisibility } from "@/hooks/useLoyaltyVisibility";
import { useSiteCapabilities } from "@/hooks/useSiteCapabilities";
import { trackEvent } from "@/services/analyticsService";
import { isStandaloneApp } from "@/utils/pwa";
import { queryClient } from "@/lib/queryClient";
import {
  MemberHome, GuestHome, Login, BindWechatPhone,
  Categories, ProductDetail, NewArrivals, Search,
  Cart, Checkout, Orders, OrderDetail, Returns, PendingReviews,
  Profile, Settings, AddressManage, Favorites, History, Notifications, Coupons, Points, Rewards, Invite,
  Help, About, ContentCmsPage, SupportDownload, NotFound,
  AdminLogin, AdminAccount, AdminAccounts, Dashboard,
  AdminProducts, AdminProductForm, AdminCategories, AdminInventory, AdminProductTags, AdminBanners,
  AdminOrders, AdminCheckoutAbandonments, AdminOrderDetail, AdminReturns, AdminShipping,
  AdminUsers, AdminUserDetail, AdminMemberLevels, AdminInvites,
  AdminCoupons, AdminCouponForm, AdminCouponRecords, AdminActivities, AdminMarketingDashboard, AdminActivityForm, AdminMarketingPoints, AdminMarketingRewards,
  AdminReviews, AdminNotifications, AdminNotificationDetail,
  AdminReports, AdminReportOverview, AdminSalesDailyReport, AdminSalesMonthlyReport, AdminProfitDailyReport, AdminOperatingExpenses, AdminProductAnalysisReport, AdminCategoryAnalysisReport, AdminOrderAnalysisReport, AdminCustomerAnalysisReport, AdminActivityAnalysisReport, AdminCouponAnalysisReport, AdminInventoryAnalysisReport, AdminSearchAnalysisReport, AdminTrafficAnalysisReport, AdminExportCenter,
  AdminSiteSettings, AdminFeatureSettings, AdminSupportDownload, AdminTelegramSettings, AdminThemeSettings, AdminContent, AdminHomeOps,
  AdminRoles, AdminLogs, AdminRecycleBin,
  AdminPaymentChannels, AdminPaymentOrders, AdminPaymentEvents, AdminPaymentReconciliations,
  AdminMonitoringOverview, AdminMonitoringAnomalies, AdminMonitoringAnomalyDetail,
  AdminMonitoringRepairTasks, AdminMonitoringRules, AdminMonitoringRuns,
} from "@/routes/lazyPages";

/** 持久化的 isAuthenticated 与登录标记可能不一致（清缓存、多标签页等），启动时与 token 标记对齐 */
function AuthTokenSync() {
  useLayoutEffect(() => {
    const flagged = isLoggedIn();
    useAuthStore.setState({ isAuthenticated: flagged });
    if (!flagged) return;
    void authService.getProfile()
      .then(() => {
        useAuthStore.setState({ isAuthenticated: true });
      })
      .catch(() => {
        clearTokens();
        useAuthStore.setState({ isAuthenticated: false });
      });
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
          { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
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

function PwaStandaloneAnalytics() {
  useEffect(() => {
    if (!isStandaloneApp()) return;
    const key = "pwa_open_standalone_tracked";
    if (window.sessionStorage.getItem(key) === "1") return;
    window.sessionStorage.setItem(key, "1");
    void trackEvent({ event_type: "pwa_open_standalone", module: "pwa", page: window.location.pathname });
  }, []);
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
    const siteName = (siteInfo.siteName || "官方商城").trim();
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
      { test: (p) => p.startsWith("/admin/settings/features"), titleKey: "routeTitles.siteSettings" },
      { test: (p) => p.startsWith("/admin/settings/telegram"), titleKey: "routeTitles.telegram" },
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
      { test: (p) => p.startsWith("/admin/monitoring"), titleKey: "routeTitles.monitoring" },
    ];
    const match = routeTitleMap.find((item) => item.test(location.pathname));
    const rawTitleKey = match?.titleKey ?? "routeTitles.admin";
    const translatedTitle = t(rawTitleKey);
    const pageTitle = translatedTitle === rawTitleKey && rawTitleKey === "routeTitles.monitoring" ? "监控中心" : translatedTitle;
    document.title = `${pageTitle} | ${siteName || seoTitle || "官方商城"}`;
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
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!themeReady) return <StoreOutletFallback />;
  return isAuthenticated && isLoggedIn() ? <MemberHome /> : <GuestHome />;
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

function CapabilityRoute({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  if (!enabled) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export function AppRoutes() {
  const location = useLocation();
  const capabilities = useSiteCapabilities();
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
          <PwaStandaloneAnalytics />
          <AppScopeSync />
          <AdminI18nScope>
          <AdminTitleSync />
          <TrackingManager />
          <RouteAnalyticsTracker />
          <RouteSeoGuard />
          <PwaUpdateToast />
          <LanguageGate />
          <AgeGate />
          <Suspense fallback={<AppRouteFallback />}>
            <Routes>
              {/* Pages with bottom nav */}
              <Route element={<FrontLayout />}>
              <Route path="/" element={<HomeRoute />} />
              <Route path="/categories" element={<CapabilityRoute enabled={capabilities.mallEnabled}><Categories /></CapabilityRoute>} />
              <Route path="/new-arrivals" element={<CapabilityRoute enabled={capabilities.mallEnabled}><NewArrivals /></CapabilityRoute>} />
              <Route path="/support-download" element={<CapabilityRoute enabled={capabilities.customerServiceDownloadEnabled}><SupportDownload /></CapabilityRoute>} />
              <Route path="/search" element={<CapabilityRoute enabled={capabilities.mallEnabled}><Search /></CapabilityRoute>} />
              <Route path="/cart" element={<CapabilityRoute enabled={capabilities.mallEnabled}><Cart /></CapabilityRoute>} />
              <Route path="/favorites" element={<Favorites />} />
              <Route path="/profile" element={<Profile />} />
              </Route>

              {/* Public pages */}
              <Route path="/product/:id" element={<CapabilityRoute enabled={capabilities.mallEnabled}><ProductDetail /></CapabilityRoute>} />
              <Route path="/login" element={<Login />} />
              <Route path="/login/bind-phone" element={<BindWechatPhone />} />
              <Route path="/help" element={<Help />} />
              <Route path="/about" element={<About />} />
              <Route path="/install" element={capabilities.customerServiceDownloadEnabled ? <Navigate to="/support-download?tab=download" replace /> : <Navigate to="/" replace />} />
              <Route path="/content/:slug" element={<ContentCmsPage />} />

              {/* Protected pages (require login) */}
              <Route path="/checkout" element={<ProtectedRoute><CapabilityRoute enabled={capabilities.mallEnabled}><Checkout /></CapabilityRoute></ProtectedRoute>} />
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
                    <CapabilityRoute enabled={capabilities.pointsEnabled}>
                      <LoyaltyRouteGuard feature="points">
                        <Points />
                      </LoyaltyRouteGuard>
                    </CapabilityRoute>
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
              <Route path="/coupons" element={<ProtectedRoute><CapabilityRoute enabled={capabilities.couponEnabled}><Coupons /></CapabilityRoute></ProtectedRoute>} />
              <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
              <Route path="/returns" element={<ProtectedRoute><Returns /></ProtectedRoute>} />
              <Route path="/reviews/pending" element={<ProtectedRoute><CapabilityRoute enabled={capabilities.reviewEnabled}><PendingReviews /></CapabilityRoute></ProtectedRoute>} />
              {/* 与购物车/收藏一致：未登录可读取本地持久化浏览记录 */}
              <Route path="/history" element={<History />} />

              {/* Admin routes */}
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<Dashboard />} />
                <Route path="products" element={<AdminProducts />} />
                <Route path="products/:id" element={<AdminProductForm />} />
                <Route path="categories" element={<AdminCategories />} />
                <Route path="inventory" element={<CapabilityRoute enabled={capabilities.inventoryEnabled}><AdminInventory /></CapabilityRoute>} />
                <Route path="tags" element={<AdminProductTags />} />
                <Route path="orders" element={<AdminOrders />} />
                <Route path="orders/unfinished" element={<AdminCheckoutAbandonments />} />
                <Route path="orders/:id" element={<AdminOrderDetail />} />
                <Route path="payments/channels" element={<CapabilityRoute enabled={capabilities.onlinePaymentEnabled}><AdminPaymentChannels /></CapabilityRoute>} />
                <Route path="payments/orders" element={<CapabilityRoute enabled={capabilities.onlinePaymentEnabled}><AdminPaymentOrders /></CapabilityRoute>} />
                <Route path="payments/events" element={<CapabilityRoute enabled={capabilities.onlinePaymentEnabled}><AdminPaymentEvents /></CapabilityRoute>} />
                <Route path="payments/reconciliations" element={<CapabilityRoute enabled={capabilities.onlinePaymentEnabled}><AdminPaymentReconciliations /></CapabilityRoute>} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="users/:id" element={<AdminUserDetail />} />
                <Route path="member-levels" element={<CapabilityRoute enabled={capabilities.memberLevelEnabled}><AdminMemberLevels /></CapabilityRoute>} />
                <Route path="invites" element={<Navigate to="/admin/marketing/invites" replace />} />
                <Route path="rewards" element={<Navigate to="/admin/marketing/rewards" replace />} />
                <Route path="points/records" element={<Navigate to="/admin/marketing/points" replace />} />
                <Route path="settings/points" element={<Navigate to="/admin/marketing/points" replace />} />
                <Route path="settings/referral" element={<Navigate to="/admin/marketing/rewards" replace />} />
                <Route path="settings/site" element={<AdminSiteSettings />} />
                <Route path="settings/features" element={<AdminFeatureSettings />} />
                <Route path="settings/telegram" element={<AdminTelegramSettings />} />
                <Route path="support-download" element={<CapabilityRoute enabled={capabilities.customerServiceDownloadEnabled}><AdminSupportDownload /></CapabilityRoute>} />
                <Route path="settings/theme" element={<AdminThemeSettings />} />
                <Route path="home-ops" element={<AdminHomeOps />} />
                <Route path="settings/shipping" element={<CapabilityRoute enabled={capabilities.shippingEnabled}><AdminShipping /></CapabilityRoute>} />
                <Route path="settings/roles" element={<AdminRoles />} />
                <Route path="coupons" element={<Navigate to="/admin/marketing/coupons" replace />} />
                <Route path="coupons/new" element={<Navigate to="/admin/marketing/coupons/new" replace />} />
                <Route path="coupons/records" element={<Navigate to="/admin/marketing/coupons/records" replace />} />
                <Route path="coupons/:id" element={<LegacyCouponRedirect />} />
                <Route path="marketing" element={<AdminMarketingDashboard />} />
                <Route path="marketing/activities" element={<AdminActivities />} />
                <Route path="marketing/activities/new" element={<AdminActivityForm />} />
                <Route path="marketing/activities/:id/edit" element={<AdminActivityForm />} />
                <Route path="marketing/coupons" element={<CapabilityRoute enabled={capabilities.couponEnabled}><AdminCoupons /></CapabilityRoute>} />
                <Route path="marketing/coupons/new" element={<CapabilityRoute enabled={capabilities.couponEnabled}><AdminCouponForm /></CapabilityRoute>} />
                <Route path="marketing/coupons/:id" element={<CapabilityRoute enabled={capabilities.couponEnabled}><AdminCouponForm /></CapabilityRoute>} />
                <Route path="marketing/coupons/records" element={<CapabilityRoute enabled={capabilities.couponEnabled}><AdminCouponRecords /></CapabilityRoute>} />
                <Route path="marketing/points" element={<CapabilityRoute enabled={capabilities.pointsEnabled}><AdminMarketingPoints /></CapabilityRoute>} />
                <Route path="marketing/rewards" element={<AdminMarketingRewards />} />
                <Route path="marketing/invites" element={<AdminInvites />} />
                <Route path="reviews" element={<CapabilityRoute enabled={capabilities.reviewEnabled}><AdminReviews /></CapabilityRoute>} />
                <Route path="returns" element={<AdminReturns />} />
                <Route path="notifications" element={<AdminNotifications />} />
                <Route path="notifications/:id" element={<AdminNotificationDetail />} />
                <Route path="monitoring" element={<AdminMonitoringOverview />} />
                <Route path="monitoring/anomalies" element={<AdminMonitoringAnomalies />} />
                <Route path="monitoring/anomalies/:id" element={<AdminMonitoringAnomalyDetail />} />
                <Route path="monitoring/repair-tasks" element={<AdminMonitoringRepairTasks />} />
                <Route path="monitoring/rules" element={<AdminMonitoringRules />} />
                <Route path="monitoring/runs" element={<AdminMonitoringRuns />} />
                <Route path="account" element={<AdminAccount />} />
                <Route path="banners" element={<AdminBanners />} />
                <Route path="reports" element={<AdminReports />} />
                <Route path="reports/overview" element={<AdminReportOverview />} />
                <Route path="reports/daily" element={<AdminSalesDailyReport />} />
                <Route path="reports/monthly" element={<AdminSalesMonthlyReport />} />
                <Route path="reports/profit" element={<AdminProfitDailyReport />} />
                <Route path="reports/expenses" element={<AdminOperatingExpenses />} />
                <Route path="reports/products" element={<AdminProductAnalysisReport />} />
                <Route path="reports/categories" element={<AdminCategoryAnalysisReport />} />
                <Route path="reports/orders" element={<AdminOrderAnalysisReport />} />
                <Route path="reports/customers" element={<AdminCustomerAnalysisReport />} />
                <Route path="reports/activities" element={<AdminActivityAnalysisReport />} />
                <Route path="reports/coupons" element={<CapabilityRoute enabled={capabilities.couponEnabled}><AdminCouponAnalysisReport /></CapabilityRoute>} />
                <Route path="reports/inventory" element={<CapabilityRoute enabled={capabilities.inventoryEnabled}><AdminInventoryAnalysisReport /></CapabilityRoute>} />
                <Route path="reports/search" element={<AdminSearchAnalysisReport />} />
                <Route path="reports/traffic" element={<CapabilityRoute enabled={capabilities.trafficAnalyticsEnabled}><AdminTrafficAnalysisReport /></CapabilityRoute>} />
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

import { Suspense, useEffect, useLayoutEffect, type ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TopProgressBar } from "@/components/ui/top-progress-bar";
import AppRouteFallback from "@/components/AppRouteFallback";
import ErrorBoundary from "@/components/ErrorBoundary";
import AdminLayout from "@/layouts/AdminLayout";
import AdminRouteFallback from "@/modules/admin/pages/error/AdminRouteFallback";
import { AdminI18nProvider } from "@/contexts/AdminI18nProvider";
import AdminMfaStepUpHost from "@/components/admin/AdminMfaStepUpHost";
import ChinaBrowserCompatNotice from "@/components/ChinaBrowserCompatNotice";
import { useAdminTOptional } from "@/hooks/useAdminT";
import { useSiteInfo } from "@/hooks/useSiteInfo";
import { useSiteCapabilities } from "@/hooks/useSiteCapabilities";
import { queryClient } from "@/lib/queryClient";
import { ModalLayerProvider } from "@/modules/micro-interactions";
import { guessFaviconMime, resolveSiteFaviconUrl } from "@/utils/siteBrandAssets";
import AdminSessionSync from "@/components/admin/AdminSessionSync";
import {
  DEFAULT_APPLE_TOUCH_ICON,
  DEFAULT_FAVICON_ICO,
  DEFAULT_FAVICON_PNG,
  DEFAULT_FAVICON_SVG,
} from "@/constants/siteBrand";
import { LegacyCouponRedirect } from "@/routes/adminLegacyRedirects";
import { renderAdminReportRoutes } from "@/routes/adminReportRoutes";
import {
  AdminLogin, AdminAccount, AdminAccounts, Dashboard,
  AdminProducts, AdminProductForm, AdminCategories, AdminInventory, AdminProductTags, AdminBanners,
  AdminOrders, AdminCheckoutAbandonments, AdminOrderDetail, AdminReturns, AdminShipping,
  AdminUsers, AdminUserDetail, AdminUserSecurity, AdminMemberLevels, AdminInvites,
  AdminCoupons, AdminCouponForm, AdminCouponRecords, AdminCouponCampaigns, AdminCouponCampaignForm, AdminActivities, AdminMarketingDashboard, AdminActivityForm, AdminMarketingPoints, AdminMarketingRewards,
  AdminReviews, AdminNotifications, AdminNotificationDetail, AdminEventCenter,
  AdminSiteSettings, AdminFeatureSettings, AdminSupportDownload, AdminTelegramSettings, AdminThemeSettings, AdminContent, AdminHomeOps,
  AdminRoles, AdminLogs, AdminRecycleBin, AdminDataRetention, AdminBackupCenter,
  AdminPaymentChannels, AdminPaymentOrders, AdminPaymentEvents, AdminPaymentReconciliations,
  AdminMonitoringOverview, AdminMonitoringAnomalies, AdminMonitoringAnomalyDetail,
  AdminMonitoringRepairTasks, AdminMonitoringRules, AdminMonitoringRuns,
} from "@/routes/adminLazyPages";

function SiteIdentitySync() {
  const siteInfo = useSiteInfo();

  useLayoutEffect(() => {
    const raw = resolveSiteFaviconUrl(siteInfo);
    const custom = raw && !/lovable/i.test(raw) ? raw : "";
    const faviconType = custom ? guessFaviconMime(custom) : undefined;
    // 部分浏览器不会把 WebP 当作 favicon（即使能下载也可能不显示），这里用后端动态生成的 PNG 作为兜底。
    const needsPngFallback = faviconType === "image/webp";
    const pwaPngFallback = "/api/pwa/icon-192x192.png";
    const iconTargets: Array<{ rel: string; href: string; type?: string; sizes?: string }> = custom
      ? [
          ...(needsPngFallback
            ? [{ rel: "icon", href: pwaPngFallback, type: "image/png", sizes: "192x192" }]
            : []),
          { rel: "icon", href: custom, type: faviconType, sizes: faviconType === "image/png" ? "192x192" : undefined },
          { rel: "apple-touch-icon", href: custom, type: faviconType },
        ]
      : [
          { rel: "icon", href: DEFAULT_FAVICON_SVG, type: "image/svg+xml" },
          { rel: "icon", href: DEFAULT_FAVICON_PNG, type: "image/png", sizes: "32x32" },
          { rel: "shortcut icon", href: DEFAULT_FAVICON_ICO },
          { rel: "apple-touch-icon", href: DEFAULT_APPLE_TOUCH_ICON },
        ];

    document
      .querySelectorAll<HTMLLinkElement>("link[rel='icon'], link[rel='shortcut icon'], link[rel='apple-touch-icon']")
      .forEach((el) => el.remove());

    iconTargets.forEach(({ rel, href, type, sizes }) => {
      const link = document.createElement("link");
      link.rel = rel;
      link.href = href;
      if (type) link.type = type;
      if (sizes) link.sizes = sizes;
      document.head.appendChild(link);
    });
  }, [siteInfo]);

  return null;
}

function AppScopeSync() {
  useEffect(() => {
    document.documentElement.setAttribute("data-app-scope", "admin");
    window.dispatchEvent(new CustomEvent("app:scope-changed", { detail: { scope: "admin" } }));
  }, []);
  return null;
}

function AdminTitleSync() {
  const location = useLocation();
  const siteInfo = useSiteInfo();
  const { t, locale } = useAdminTOptional();

  useEffect(() => {
    const rawSiteName = (siteInfo.siteName || "大马通").trim();
    const siteName = locale === "en" && /[\u4e00-\u9fff]/.test(rawSiteName) ? "Official Shop" : rawSiteName;
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
      { test: (p) => p === "/admin/marketing/coupon-campaigns/new", titleKey: "routeTitles.coupons" },
      { test: (p) => /^\/admin\/marketing\/coupon-campaigns\/[^/]+$/.test(p), titleKey: "routeTitles.coupons" },
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
      { test: (p) => p.startsWith("/admin/user-security"), titleKey: "routeTitles.users" },
      { test: (p) => p.startsWith("/admin/users"), titleKey: "routeTitles.users" },
      { test: (p) => p.startsWith("/admin/member-levels"), titleKey: "routeTitles.memberLevels" },
      { test: (p) => p.startsWith("/admin/orders/unfinished"), titleKey: "routeTitles.unfinishedOrders" },
      { test: (p) => p.startsWith("/admin/orders"), titleKey: "routeTitles.orders" },
      { test: (p) => p.startsWith("/admin/products") || p.startsWith("/admin/categories") || p.startsWith("/admin/inventory") || p.startsWith("/admin/tags"), titleKey: "routeTitles.products" },
      { test: (p) => p.startsWith("/admin/reports/traffic"), titleKey: "routeTitles.traffic" },
      { test: (p) => p.startsWith("/admin/reports"), titleKey: "routeTitles.reports" },
      { test: (p) => p.startsWith("/admin/exports"), titleKey: "routeTitles.exports" },
      { test: (p) => p.startsWith("/admin/audit-logs"), titleKey: "routeTitles.auditLogs" },
      { test: (p) => p.startsWith("/admin/data-retention"), titleKey: "routeTitles.dataRetention" },
      { test: (p) => p.startsWith("/admin/backups"), titleKey: "routeTitles.dataSafety" },
      { test: (p) => p.startsWith("/admin/recycle-bin"), titleKey: "routeTitles.recycleBin" },
      { test: (p) => p.startsWith("/admin/notifications"), titleKey: "routeTitles.notifications" },
      { test: (p) => p.startsWith("/admin/event-center"), titleKey: "routeTitles.eventCenter" },
      { test: (p) => p.startsWith("/admin/monitoring"), titleKey: "routeTitles.monitoring" },
    ];
    const match = routeTitleMap.find((item) => item.test(location.pathname));
    const rawTitleKey = match?.titleKey ?? "routeTitles.admin";
    const translatedTitle = t(rawTitleKey);
    const pageTitle = translatedTitle === rawTitleKey ? "Admin" : translatedTitle;
    document.title = `${pageTitle} | ${siteName}`;
  }, [location.pathname, locale, siteInfo.siteName, t]);

  return null;
}

function CapabilityRoute({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  if (!enabled) return <AdminRouteFallback type="feature-disabled" />;
  return <>{children}</>;
}

export function AdminAppRoutes() {
  const location = useLocation();
  const capabilities = useSiteCapabilities();

  return (
    <ErrorBoundary resetKey={location.pathname}>
      <QueryClientProvider client={queryClient}>
        <ModalLayerProvider>
        <TooltipProvider>
          <AdminI18nProvider>
            <AdminSessionSync />
            <AdminMfaStepUpHost />
            <Sonner
              offset={{ top: "calc(max(0.75rem, env(safe-area-inset-top)) + 3.25rem)" }}
              mobileOffset={{ top: "calc(max(0.75rem, env(safe-area-inset-top)) + 3.25rem)" }}
            />
            <TopProgressBar />
            <SiteIdentitySync />
            <AppScopeSync />
            <AdminTitleSync />
            <ChinaBrowserCompatNotice />
            <Suspense fallback={<AppRouteFallback />}>
              <Routes>
                <Route path="/" element={<Navigate to="/admin/login" replace />} />
                <Route path="/login" element={<Navigate to="/admin/login" replace />} />
                <Route path="/admin/login" element={<AdminLogin />} />
                <Route path="/admin" element={<AdminLayout />}>
                  <Route index element={<Dashboard />} />
                  <Route path="products" element={<AdminProducts />} />
                  <Route path="products/:id" element={<AdminProductForm />} />
                  <Route path="categories" element={<AdminCategories />} />
                  <Route path="inventory" element={<CapabilityRoute enabled={capabilities.inventoryEnabled}><AdminInventory /></CapabilityRoute>} />
                  <Route path="replenishment" element={<CapabilityRoute enabled={capabilities.inventoryEnabled}><AdminInventory initialTab="smart" pageTitle="智能补货" pageHint="按 SKU 销量、可用库存、在途库存和上下限生成补货建议。" /></CapabilityRoute>} />
                  <Route path="tags" element={<AdminProductTags />} />
                  <Route path="orders" element={<AdminOrders />} />
                  <Route path="orders/unfinished" element={<AdminCheckoutAbandonments />} />
                  <Route path="orders/:id" element={<AdminOrderDetail />} />
                  <Route path="payments/channels" element={<CapabilityRoute enabled={capabilities.onlinePaymentEnabled}><AdminPaymentChannels /></CapabilityRoute>} />
                  <Route path="payments/orders" element={<CapabilityRoute enabled={capabilities.onlinePaymentEnabled}><AdminPaymentOrders /></CapabilityRoute>} />
                  <Route path="payments/events" element={<CapabilityRoute enabled={capabilities.onlinePaymentEnabled}><AdminPaymentEvents /></CapabilityRoute>} />
                  <Route path="payments/reconciliations" element={<CapabilityRoute enabled={capabilities.onlinePaymentEnabled}><AdminPaymentReconciliations /></CapabilityRoute>} />
                  <Route path="users" element={<AdminUsers />} />
                  <Route path="user-security" element={<AdminUserSecurity />} />
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
                  <Route path="marketing/coupon-campaigns" element={<CapabilityRoute enabled={capabilities.couponEnabled}><AdminCouponCampaigns /></CapabilityRoute>} />
                  <Route path="marketing/coupon-campaigns/new" element={<CapabilityRoute enabled={capabilities.couponEnabled}><AdminCouponCampaignForm /></CapabilityRoute>} />
                  <Route path="marketing/coupon-campaigns/:id" element={<CapabilityRoute enabled={capabilities.couponEnabled}><AdminCouponCampaignForm /></CapabilityRoute>} />
                  <Route path="marketing/points" element={<CapabilityRoute enabled={capabilities.pointsEnabled}><AdminMarketingPoints /></CapabilityRoute>} />
                  <Route path="marketing/rewards" element={<AdminMarketingRewards />} />
                  <Route path="marketing/invites" element={<AdminInvites />} />
                  <Route path="reviews" element={<CapabilityRoute enabled={capabilities.reviewEnabled}><AdminReviews /></CapabilityRoute>} />
                  <Route path="returns" element={<AdminReturns />} />
                  <Route path="event-center" element={<AdminEventCenter />} />
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
                  {renderAdminReportRoutes(capabilities)}
                  <Route path="accounts" element={<AdminAccounts />} />
                  <Route path="recycle-bin" element={<AdminRecycleBin />} />
                  <Route path="data-retention" element={<AdminDataRetention />} />
                  <Route path="backups" element={<AdminBackupCenter />} />
                  <Route path="audit-logs" element={<AdminLogs />} />
                  <Route path="content" element={<AdminContent />} />
                  <Route path="*" element={<AdminRouteFallback type="not-found" />} />
                </Route>
                <Route path="*" element={<AdminRouteFallback type="not-found" />} />
              </Routes>
            </Suspense>
          </AdminI18nProvider>
        </TooltipProvider>
        </ModalLayerProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

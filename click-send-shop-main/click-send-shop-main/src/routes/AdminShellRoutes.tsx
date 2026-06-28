import { useEffect, useLayoutEffect, type ReactNode } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import AdminMfaStepUpHost from "@/components/admin/AdminMfaStepUpHost";
import AdminSessionSync from "@/components/admin/AdminSessionSync";
import { AdminI18nProvider } from "@/contexts/AdminI18nProvider";
import AdminLayout from "@/layouts/AdminLayout";
import AdminRouteFallback from "@/modules/admin/pages/error/AdminRouteFallback";
import { useSiteCapabilities } from "@/hooks/useSiteCapabilities";
import { useSiteInfo, useSiteInfoLoaded } from "@/hooks/useSiteInfo";
import { useAdminTOptional } from "@/hooks/useAdminT";
import { getAdminRouteDocumentTitleKey } from "@/config/adminRouteRegistry";
import { buildSiteFaviconLinkTargets, rememberSiteFaviconUrl } from "@/utils/siteBrandAssets";
import {
  DEFAULT_APPLE_TOUCH_ICON,
  DEFAULT_FAVICON_ICO,
  DEFAULT_FAVICON_PNG,
  DEFAULT_FAVICON_SVG,
} from "@/constants/siteBrand";
import { LegacyCouponRedirect, LegacyDashboardRedirect } from "@/routes/adminLegacyRedirects";
import { renderAdminReportRoutes } from "@/routes/adminReportRoutes";
import {
  AdminAccount, AdminAccounts, Dashboard,
  AdminProducts, AdminProductForm, AdminCategories, AdminInventory, AdminProductTags, AdminBanners,
  AdminOrders, AdminCheckoutAbandonments, AdminOrderDetail, AdminReturns, AdminShipping,
  AdminUsers, AdminUserDetail, AdminUserSecurity, AdminUserFavorites, AdminUserHistory, AdminPrivacyRequests, AdminFeedback, AdminMemberLevels, AdminInvites,
  AdminCoupons, AdminCouponForm, AdminCouponRecords, AdminCouponCampaigns, AdminCouponCampaignForm, AdminActivities, AdminMarketingDashboard, AdminActivityForm, AdminMarketingPoints, AdminMarketingRewards,
  AdminReviews, AdminNotifications, AdminNotificationDetail, AdminEventCenter,
  AdminSiteSettings, AdminFeatureSettings, AdminSupportDownload, AdminTelegramSettings, AdminThemeSettings, AdminContent, AdminHomeOps, AdminMyInvois,
  AdminRoles, AdminLogs, AdminRecycleBin, AdminDataRetention, AdminBackupCenter,
  AdminPaymentChannels, AdminPaymentOrders, AdminPaymentEvents, AdminPaymentReconciliations,
  AdminMonitoringOverview, AdminMonitoringAnomalies, AdminMonitoringAnomalyDetail,
  AdminMonitoringRepairTasks, AdminMonitoringRules, AdminMonitoringRuns,
} from "@/routes/adminLazyPages";

function CapabilityRoute({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  if (!enabled) return <AdminRouteFallback type="feature-disabled" />;
  return <>{children}</>;
}

function AdminShellIdentitySync() {
  const siteInfo = useSiteInfo();
  const siteInfoLoaded = useSiteInfoLoaded();

  useLayoutEffect(() => {
    if (!siteInfoLoaded) return;
    const iconTargets = buildSiteFaviconLinkTargets(siteInfo, {
      svg: DEFAULT_FAVICON_SVG,
      png: DEFAULT_FAVICON_PNG,
      ico: DEFAULT_FAVICON_ICO,
      appleTouchIcon: DEFAULT_APPLE_TOUCH_ICON,
    });
    rememberSiteFaviconUrl(siteInfo);

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
  }, [siteInfo, siteInfoLoaded]);

  return null;
}

function AdminShellTitleSync() {
  const location = useLocation();
  const siteInfo = useSiteInfo();
  const { t, locale } = useAdminTOptional();

  useEffect(() => {
    const rawSiteName = (siteInfo.siteName || "\u5927\u9a6c\u901a").trim();
    const siteName = locale === "en" && /[\u4e00-\u9fff]/.test(rawSiteName) ? "Official Shop" : rawSiteName;
    const rawTitleKey = getAdminRouteDocumentTitleKey(location.pathname);
    const translatedTitle = t(rawTitleKey);
    const pageTitle = translatedTitle === rawTitleKey ? "Admin" : translatedTitle;
    document.title = `${pageTitle} | ${siteName}`;
  }, [location.pathname, locale, siteInfo.siteName, t]);

  return null;
}

function AdminShellRouteContent() {
  const capabilities = useSiteCapabilities();

  return (
    <>
      <AdminShellIdentitySync />
      <AdminShellTitleSync />
      <AdminSessionSync />
      <AdminMfaStepUpHost />
      <TooltipProvider>
        <Routes>
          <Route element={<AdminLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="dashboard" element={<LegacyDashboardRedirect />} />
            <Route path="products" element={<AdminProducts />} />
            <Route path="products/:id" element={<AdminProductForm />} />
            <Route path="categories" element={<AdminCategories />} />
            <Route path="inventory" element={<CapabilityRoute enabled={capabilities.inventoryEnabled}><AdminInventory /></CapabilityRoute>} />
            <Route path="replenishment" element={<CapabilityRoute enabled={capabilities.inventoryEnabled}><AdminInventory initialTab="smart" pageTitle={"\u667a\u80fd\u8865\u8d27"} pageHint={"\u6309 SKU \u9500\u91cf\u3001\u53ef\u7528\u5e93\u5b58\u3001\u5728\u9014\u5e93\u5b58\u548c\u4e0a\u4e0b\u9650\u751f\u6210\u8865\u8d27\u5efa\u8bae\u3002"} /></CapabilityRoute>} />
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
            <Route path="user-favorites" element={<AdminUserFavorites />} />
            <Route path="user-history" element={<AdminUserHistory />} />
            <Route path="privacy-requests" element={<AdminPrivacyRequests />} />
            <Route path="feedback" element={<AdminFeedback />} />
            <Route path="users/:id" element={<AdminUserDetail />} />
            <Route path="member-levels" element={<CapabilityRoute enabled={capabilities.memberLevelEnabled}><AdminMemberLevels /></CapabilityRoute>} />
            <Route path="invites" element={<Navigate to="/admin/marketing/invites" replace />} />
            <Route path="rewards" element={<Navigate to="/admin/marketing/rewards" replace />} />
            <Route path="points/records" element={<Navigate to="/admin/marketing/points" replace />} />
            <Route path="settings/points" element={<Navigate to="/admin/marketing/points" replace />} />
            <Route path="settings/referral" element={<Navigate to="/admin/marketing/rewards" replace />} />
            <Route path="settings/site" element={<AdminSiteSettings />} />
            <Route path="settings/features" element={<AdminFeatureSettings />} />
            <Route path="settings/telegram" element={<CapabilityRoute enabled={capabilities.telegramOrderNotifyEnabled}><AdminTelegramSettings /></CapabilityRoute>} />
            <Route path="support-download" element={<CapabilityRoute enabled={capabilities.customerServiceDownloadEnabled}><AdminSupportDownload /></CapabilityRoute>} />
            <Route path="settings/theme" element={<AdminThemeSettings />} />
            <Route path="home-ops" element={<AdminHomeOps />} />
            <Route path="myinvois" element={<AdminMyInvois />} />
            <Route path="settings/shipping" element={<CapabilityRoute enabled={capabilities.shippingEnabled}><AdminShipping /></CapabilityRoute>} />
            <Route path="settings/roles" element={<AdminRoles />} />
            <Route path="rbac/admin-users" element={<Navigate to="/admin/accounts" replace />} />
            <Route path="rbac/roles" element={<Navigate to="/admin/settings/roles" replace />} />
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
      </TooltipProvider>
    </>
  );
}

export default function AdminShellRoutes() {
  return (
    <AdminI18nProvider>
      <AdminShellRouteContent />
    </AdminI18nProvider>
  );
}

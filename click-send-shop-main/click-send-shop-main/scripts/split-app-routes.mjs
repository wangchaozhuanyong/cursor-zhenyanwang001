import fs from "fs";
import path from "path";

const root = path.resolve(import.meta.dirname, "..");
const appPath = path.join(root, "src/App.tsx");
const app = fs.readFileSync(appPath, "utf8");
const lines = app.split(/\r?\n/);
const lazyStart = lines.findIndex((l) => l.includes("type PreloadableLazy"));
const lazyEnd = lines.findIndex((l, i) => i > lazyStart && l.startsWith("const queryClient"));
const lazyBlock = lines.slice(lazyStart, lazyEnd).join("\n");
const lazyHeader = 'import { lazy, type ComponentType } from "react";\n\n';
const lazyBody = lazyBlock
  .replace("type PreloadableLazy", "export type PreloadableLazy")
  .replace("function lazyWithPreload", "export function lazyWithPreload")
  .replace(/^const ([A-Za-z0-9_]+) = /gm, "export const $1 = ");
const routesDir = path.join(root, "src/routes");
fs.mkdirSync(routesDir, { recursive: true });
fs.writeFileSync(path.join(routesDir, "lazyPages.ts"), `${lazyHeader}${lazyBody}\n`);

const imports = `import { Suspense, useEffect, useLayoutEffect, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
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
import LanguageGate from "@/components/LanguageGate";
import AdminLayout from "@/layouts/AdminLayout";
import { LegacyCouponRedirect } from "@/routes/adminLegacyRedirects";
import FrontLayout from "@/layouts/FrontLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import ErrorBoundary from "@/components/ErrorBoundary";
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
import { useAdminTOptional } from "@/hooks/useAdminT";
import { AdminI18nProvider } from "@/contexts/AdminI18nProvider";
import { useLoyaltyVisibility } from "@/hooks/useLoyaltyVisibility";
import { useSiteCapabilities } from "@/hooks/useSiteCapabilities";
import { trackEvent } from "@/services/analyticsService";
import { isStandaloneApp } from "@/utils/pwa";
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
  AdminReports, AdminReportOverview, AdminSalesDailyReport, AdminSalesMonthlyReport, AdminProductAnalysisReport, AdminCategoryAnalysisReport, AdminOrderAnalysisReport, AdminCustomerAnalysisReport, AdminActivityAnalysisReport, AdminCouponAnalysisReport, AdminInventoryAnalysisReport, AdminSearchAnalysisReport, AdminTrafficAnalysisReport, AdminExportCenter,
  AdminSiteSettings, AdminFeatureSettings, AdminSupportDownload, AdminTelegramSettings, AdminThemeSettings, AdminContent, AdminHomeOps,
  AdminRoles, AdminLogs, AdminRecycleBin,
  AdminPaymentChannels, AdminPaymentOrders, AdminPaymentEvents, AdminPaymentReconciliations,
} from "@/routes/lazyPages";
`;

const rest = lines.slice(lazyEnd).join("\n").replace("function AppRoutes", "export function AppRoutes");
fs.writeFileSync(path.join(routesDir, "AppRoutes.tsx"), `${imports}\n${rest}\n`);

const thin = `import { BrowserRouter } from "react-router-dom";
import { AppRoutes } from "@/routes/AppRoutes";

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
`;
fs.writeFileSync(appPath, thin);
console.log("split ok");

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
import RouteSeoGuard from "@/components/RouteSeoGuard";
import AgeGate from "@/components/compliance/AgeGate";
import LanguageGate from "@/components/LanguageGate";
import FrontLayout from "@/layouts/FrontLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import AuthSessionSync from "@/components/AuthSessionSync";
import ErrorBoundary from "@/components/ErrorBoundary";
import { useAuthStore } from "@/stores/useAuthStore";
import { isLoggedIn } from "@/utils/token";
import {
  DEFAULT_APPLE_TOUCH_ICON,
  DEFAULT_FAVICON_ICO,
  DEFAULT_FAVICON_PNG,
} from "@/constants/siteBrand";
import { useSiteInfo } from "@/hooks/useSiteInfo";
import { syncLockedInviteCodeBySearch } from "@/utils/inviteReferral";
import { isLoyaltyFeatureEnabled } from "@/utils/loyaltyFeatureVisibility";
import { useLoyaltyVisibility } from "@/hooks/useLoyaltyVisibility";
import { useSiteCapabilities } from "@/hooks/useSiteCapabilities";
import { trackEvent } from "@/services/analyticsService";
import { isStandaloneApp } from "@/utils/pwa";
import { queryClient } from "@/lib/queryClient";
import { resolveSiteFaviconUrl } from "@/utils/siteBrandAssets";
import {
  MemberHome, GuestHome, Login, BindWechatPhone,
  Categories, ProductDetail, NewArrivals, Search,
  Cart, Checkout, Orders, OrderDetail, Returns, PendingReviews,
  Profile, Settings, AddressManage, Favorites, History, Notifications, Coupons, Points, PointsGiftShop, Rewards, Invite,
  Help, About, ContentCmsPage, SupportDownload, NotFound,
} from "@/routes/publicLazyPages";

function SiteIdentitySync() {
  const siteInfo = useSiteInfo();

  useLayoutEffect(() => {
    const raw = resolveSiteFaviconUrl(siteInfo);
    const custom = raw && !raw.startsWith("data:") && !/lovable/i.test(raw) ? raw : "";
    const iconTargets: Array<{ rel: string; href: string; type?: string; sizes?: string }> = custom
      ? [
          { rel: "icon", href: custom },
          { rel: "apple-touch-icon", href: custom },
        ]
      : [
          { rel: "icon", href: DEFAULT_FAVICON_PNG, type: "image/png", sizes: "192x192" },
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
  }, [siteInfo.faviconUrl, siteInfo.logoUrl]);

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

function AppScopeSync() {
  useEffect(() => {
    document.documentElement.setAttribute("data-app-scope", "store");
    window.dispatchEvent(new CustomEvent("app:scope-changed", { detail: { scope: "store" } }));
  }, []);
  return null;
}

function HomeRoute() {
  const authHydrated = useAuthStore((s) => s.authHydrated);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!authHydrated) return <AppRouteFallback />;
  return isAuthenticated ? <MemberHome /> : <GuestHome />;
}

function RoutePreloadOnIdle() {
  useEffect(() => {
    const run = () => {
      GuestHome.preload?.();
      MemberHome.preload?.();
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

function LoyaltyRouteGuard({ feature, children }: { feature: "points" | "reward" | "referral"; children: ReactNode }) {
  const capabilities = useSiteCapabilities();
  const { config, loading } = useLoyaltyVisibility();
  const enabled = isLoyaltyFeatureEnabled(feature, capabilities, config);
  if (loading) return <AppRouteFallback />;
  if (!enabled) return <Navigate to="/profile" replace />;
  return <>{children}</>;
}

function CapabilityRoute({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  if (!enabled) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export function StoreAppRoutes() {
  const location = useLocation();
  const capabilities = useSiteCapabilities();

  return (
    <ErrorBoundary resetKey={location.pathname}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Sonner />
          <TopProgressBar />
          <RoutePreloadOnIdle />
          <AuthSessionSync />
          <SiteIdentitySync />
          <ReferralInviteSync />
          <PwaStandaloneAnalytics />
          <AppScopeSync />
          <TrackingManager />
          <RouteAnalyticsTracker />
          <RouteSeoGuard />
          {/* <PwaUpdateToast /> */}
          <LanguageGate />
          <AgeGate />
          <Suspense fallback={<AppRouteFallback />}>
            <Routes>
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

              <Route path="/product/:id" element={<CapabilityRoute enabled={capabilities.mallEnabled}><ProductDetail /></CapabilityRoute>} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Login />} />
              <Route path="/login/bind-phone" element={<BindWechatPhone />} />
              <Route path="/help" element={<Help />} />
              <Route path="/about" element={<About />} />
              <Route path="/install" element={capabilities.customerServiceDownloadEnabled ? <Navigate to="/support-download?tab=download" replace /> : <Navigate to="/" replace />} />
              <Route path="/content/:slug" element={<ContentCmsPage />} />

              <Route path="/checkout" element={<ProtectedRoute><CapabilityRoute enabled={capabilities.mallEnabled}><Checkout /></CapabilityRoute></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
              <Route path="/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
              <Route path="/orders/:id" element={<ProtectedRoute><OrderDetail /></ProtectedRoute>} />
              <Route path="/invite" element={<ProtectedRoute><LoyaltyRouteGuard feature="referral"><Invite /></LoyaltyRouteGuard></ProtectedRoute>} />
              <Route path="/points" element={<ProtectedRoute><CapabilityRoute enabled={capabilities.pointsEnabled}><LoyaltyRouteGuard feature="points"><Points /></LoyaltyRouteGuard></CapabilityRoute></ProtectedRoute>} />
              <Route path="/points/gifts" element={<ProtectedRoute><CapabilityRoute enabled={capabilities.pointsEnabled}><LoyaltyRouteGuard feature="points"><PointsGiftShop /></LoyaltyRouteGuard></CapabilityRoute></ProtectedRoute>} />
              <Route path="/rewards" element={<ProtectedRoute><LoyaltyRouteGuard feature="reward"><Rewards /></LoyaltyRouteGuard></ProtectedRoute>} />
              <Route path="/address" element={<ProtectedRoute><AddressManage /></ProtectedRoute>} />
              <Route path="/coupons" element={<ProtectedRoute><CapabilityRoute enabled={capabilities.couponEnabled}><Coupons /></CapabilityRoute></ProtectedRoute>} />
              <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
              <Route path="/returns" element={<ProtectedRoute><Returns /></ProtectedRoute>} />
              <Route path="/reviews/pending" element={<ProtectedRoute><CapabilityRoute enabled={capabilities.reviewEnabled}><PendingReviews /></CapabilityRoute></ProtectedRoute>} />
              <Route path="/history" element={<History />} />

              <Route path="/admin/*" element={<NotFound />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
          <CookieConsentBanner />
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

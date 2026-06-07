import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TopProgressBar } from "@/components/ui/top-progress-bar";
import AppRouteFallback, { StoreOutletFallback } from "@/components/AppRouteFallback";
import SilkPageLoader from "@/components/motion/SilkPageLoader";
import RouteSeoGuard from "@/components/RouteSeoGuard";
import RouteBackTracker from "@/components/RouteBackTracker";
import AgeGate from "@/components/compliance/AgeGate";
import LanguageGate from "@/components/LanguageGate";
import FrontLayout from "@/layouts/FrontLayout";
import FeatureUnavailable from "@/modules/public/pages/error/FeatureUnavailable";
import ProtectedRoute from "@/components/ProtectedRoute";
import AuthSessionSync from "@/components/AuthSessionSync";
import ErrorBoundary from "@/components/ErrorBoundary";
import { useAuthStore } from "@/stores/useAuthStore";
import {
  DEFAULT_APPLE_TOUCH_ICON,
  DEFAULT_FAVICON_ICO,
  DEFAULT_FAVICON_PNG,
  DEFAULT_FAVICON_SVG,
} from "@/constants/siteBrand";
import { useSiteInfo, useSiteInfoLoaded } from "@/hooks/useSiteInfo";
import { syncLockedInviteCodeBySearch } from "@/utils/inviteReferral";
import { isLoyaltyFeatureEnabled } from "@/utils/loyaltyFeatureVisibility";
import { useLoyaltyVisibility } from "@/hooks/useLoyaltyVisibility";
import { useSiteCapabilities } from "@/hooks/useSiteCapabilities";
import { DownloadConfirmProvider } from "@/components/DownloadConfirmProvider";
import { ModalLayerProvider } from "@/modules/micro-interactions/modal/ModalLayerProvider";
import { trackEventLazy } from "@/services/trackEventLazy";
import { detectPwaPlatform, isStandaloneApp } from "@/utils/pwa";
import { queryClient } from "@/lib/queryClient";
import { buildSiteFaviconLinkTargets, rememberSiteFaviconUrl } from "@/utils/siteBrandAssets";
import { POINTS_GIFT_REDEEM_CLIENT_ENABLED } from "@/constants/pointsClientFeatures";
import { isLoggedIn } from "@/utils/token";
import {
  MemberHome, GuestHome, Login, BindWechatPhone,
  Categories, ProductDetail, NewArrivals, Search,
  Cart, Checkout, Orders, OrderDetail, Returns, ReturnDetail, PendingReviews,
  Profile, Feedback, MemberBenefits, Settings, AddressManage, Favorites, History, Notifications, Coupons, Points, PointsGiftShop, Rewards, Invite,
  Help, About, ContentCmsPage, SupportDownload, TikTokLanding, NotFound,
} from "@/routes/publicLazyPages";

const CARD_EQUAL_MOBILE_FIX_STYLE_ID = "store-card-equal-mobile-fix";
const GLOBAL_WIDGET_DELAY_MS = 9000;
const PRIVACY_TRACKING_DELAY_MS = 1000;

const CookieConsentBanner = lazy(() => import("@/components/CookieConsentBanner"));
const TrackingManager = lazy(() => import("@/components/TrackingManager"));
const RouteAnalyticsTracker = lazy(() => import("@/components/RouteAnalyticsTracker"));
const ChinaBrowserCompatNotice = lazy(() => import("@/components/ChinaBrowserCompatNotice"));
const PwaUpdateToast = lazy(() => import("@/components/PwaUpdateToast"));

function SiteIdentitySync() {
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

function ReferralInviteSync() {
  const location = useLocation();
  useEffect(() => {
    syncLockedInviteCodeBySearch(location.search);
  }, [location.search]);
  return null;
}

function PwaStandaloneAnalytics() {
  const capabilities = useSiteCapabilities();
  useEffect(() => {
    if (!capabilities.trafficAnalyticsEnabled) return;
    if (!isStandaloneApp()) return;
    const key = "pwa_open_standalone_tracked";
    if (window.sessionStorage.getItem(key) === "1") return;
    window.sessionStorage.setItem(key, "1");
    return trackEventLazy(
      { event_type: "pwa_open_standalone", module: "pwa", page: window.location.pathname },
      { deferMs: GLOBAL_WIDGET_DELAY_MS },
    );
  }, [capabilities.trafficAnalyticsEnabled]);
  return null;
}

function AnalyticsCapabilitySync() {
  const capabilities = useSiteCapabilities();
  const analyticsLoadedRef = useRef(false);
  useEffect(() => {
    const enabled = Boolean(capabilities.trafficAnalyticsEnabled);
    if (!enabled && !analyticsLoadedRef.current) return;
    let cancelled = false;
    const sync = () => {
      void import("@/services/analyticsService").then(({ setTrafficAnalyticsEnabled }) => {
        if (cancelled) return;
        analyticsLoadedRef.current = true;
        setTrafficAnalyticsEnabled(enabled);
      });
    };
    const timeoutId = analyticsLoadedRef.current
      ? window.setTimeout(sync, 0)
      : window.setTimeout(sync, GLOBAL_WIDGET_DELAY_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [capabilities.trafficAnalyticsEnabled]);
  return null;
}

function DeferredGlobalMount({ children, delayMs = GLOBAL_WIDGET_DELAY_MS }: { children: ReactNode; delayMs?: number }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const timeoutId = window.setTimeout(() => setMounted(true), delayMs);
    return () => window.clearTimeout(timeoutId);
  }, [delayMs]);
  return mounted ? <>{children}</> : null;
}

function AppScopeSync() {
  useEffect(() => {
    const root = document.documentElement;
    const standaloneMedia = window.matchMedia("(display-mode: standalone)");

    const syncScope = () => {
      root.setAttribute("data-app-scope", "store");
      if (isStandaloneApp()) {
        root.setAttribute("data-pwa-standalone", "true");
        root.setAttribute("data-pwa-platform", detectPwaPlatform());
      } else {
        root.removeAttribute("data-pwa-standalone");
        root.removeAttribute("data-pwa-platform");
      }
      window.dispatchEvent(new CustomEvent("app:scope-changed", { detail: { scope: "store" } }));
    };

    syncScope();
    if (typeof standaloneMedia.addEventListener === "function") {
      standaloneMedia.addEventListener("change", syncScope);
    } else {
      standaloneMedia.addListener(syncScope);
    }
    window.addEventListener("pageshow", syncScope);

    return () => {
      if (typeof standaloneMedia.removeEventListener === "function") {
        standaloneMedia.removeEventListener("change", syncScope);
      } else {
        standaloneMedia.removeListener(syncScope);
      }
      window.removeEventListener("pageshow", syncScope);
    };
  }, []);
  return null;
}

function StoreCardOverlapFix() {
  useLayoutEffect(() => {
    if (typeof document === "undefined") return;

    let style = document.getElementById(CARD_EQUAL_MOBILE_FIX_STYLE_ID) as HTMLStyleElement | null;
    if (!style) {
      style = document.createElement("style");
      style.id = CARD_EQUAL_MOBILE_FIX_STYLE_ID;
      style.textContent = `
        @media (max-width: 767px) {
          html[data-app-scope="store"] .card-equal {
            padding: 18px !important;
          }

          html[data-app-scope="store"] .card-equal > span.absolute.right-4.top-4 {
            position: static !important;
            inset: auto !important;
            left: auto !important;
            top: auto !important;
            right: auto !important;
            bottom: auto !important;
            float: none !important;
            transform: none !important;
            display: block !important;
            width: fit-content !important;
            margin: 0 0 10px auto !important;
            font-size: 1.125rem !important;
            line-height: 1 !important;
            opacity: 0.14 !important;
            pointer-events: none !important;
          }

          html[data-app-scope="store"] .card-equal > div.mb-3.flex.items-start.gap-3 {
            padding-right: 0 !important;
            align-items: flex-start !important;
          }

          html[data-app-scope="store"] .card-equal .heading-safe {
            min-width: 0 !important;
            max-width: none !important;
          }

          html[data-app-scope="store"] .card-equal-body {
            padding-right: 0 !important;
          }
        }
      `;
      document.head.appendChild(style);
    }

    return () => {
      style?.remove();
    };
  }, []);

  return null;
}

function TikTokStandaloneRoutes() {
  const location = useLocation();

  useEffect(() => {
    document.documentElement.setAttribute("data-app-scope", "store");
    window.dispatchEvent(new CustomEvent("app:scope-changed", { detail: { scope: "store" } }));
  }, []);

  return (
    <ErrorBoundary resetKey={location.pathname}>
      <SiteIdentitySync />
      <Suspense fallback={<AppRouteFallback />}>
        <Routes>
          <Route path="/tiktok" element={<TikTokLanding />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}

function HomeRoute() {
  const authHydrated = useAuthStore((s) => s.authHydrated);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!authHydrated) {
    return isLoggedIn() ? <AppRouteFallback /> : <GuestHome />;
  }
  return isAuthenticated ? <MemberHome /> : <GuestHome />;
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
  if (!enabled) return <FeatureUnavailable />;
  return <>{children}</>;
}

export function StoreAppRoutes() {
  const location = useLocation();
  if (/^\/tiktok\/?$/.test(location.pathname)) return <TikTokStandaloneRoutes />;

  return <MainStoreRoutes />;
}

function MainStoreRoutes() {
  const location = useLocation();
  const capabilities = useSiteCapabilities();
  const routeFallback = location.pathname === "/" ? <SilkPageLoader variant="home" /> : <SilkPageLoader variant="page" />;

  return (
    <ErrorBoundary resetKey={location.pathname}>
      <QueryClientProvider client={queryClient}>
        <ModalLayerProvider>
        <DownloadConfirmProvider>
        <TooltipProvider>
          <Sonner />
          <TopProgressBar />
          <AuthSessionSync />
          <SiteIdentitySync />
          <ReferralInviteSync />
          <AnalyticsCapabilitySync />
          <PwaStandaloneAnalytics />
          <AppScopeSync />
          <RouteBackTracker />
          <RouteSeoGuard />
          <LanguageGate />
          <AgeGate />
          <StoreCardOverlapFix />
          <Suspense fallback={routeFallback}>
            <Routes>
              <Route path="/zh" element={<Navigate to="/" replace />} />
              <Route path="/en" element={<Navigate to="/" replace />} />

              <Route element={<FrontLayout />}>
                <Route path="/" element={<HomeRoute />} />
                <Route path="/categories" element={<CapabilityRoute enabled={capabilities.mallEnabled}><Categories /></CapabilityRoute>} />
                <Route path="/new-arrivals" element={<CapabilityRoute enabled={capabilities.mallEnabled}><NewArrivals /></CapabilityRoute>} />
                <Route path="/support-download" element={<CapabilityRoute enabled={capabilities.customerServiceDownloadEnabled}><SupportDownload /></CapabilityRoute>} />
                <Route path="/search" element={<CapabilityRoute enabled={capabilities.mallEnabled}><Search /></CapabilityRoute>} />
                <Route path="/cart" element={<CapabilityRoute enabled={capabilities.mallEnabled}><Cart /></CapabilityRoute>} />
                <Route path="/favorites" element={<Favorites />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/feedback" element={<Feedback />} />
                <Route path="/product/:id" element={<CapabilityRoute enabled={capabilities.mallEnabled}><ProductDetail /></CapabilityRoute>} />
              </Route>

              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Login />} />
              <Route path="/login/bind-phone" element={<BindWechatPhone />} />
              <Route path="/help" element={<Help />} />
              <Route path="/about" element={<About />} />
              <Route path="/install" element={capabilities.customerServiceDownloadEnabled ? <Navigate to="/support-download?tab=download" replace /> : <Navigate to="/" replace />} />
              <Route path="/content/:slug" element={<ContentCmsPage />} />

              <Route path="/checkout" element={<ProtectedRoute><CapabilityRoute enabled={capabilities.mallEnabled}><Checkout /></CapabilityRoute></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
              <Route path="/member/benefits" element={<ProtectedRoute><MemberBenefits /></ProtectedRoute>} />
              <Route path="/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
              <Route path="/orders/:id" element={<ProtectedRoute><OrderDetail /></ProtectedRoute>} />
              <Route path="/invite" element={<ProtectedRoute><LoyaltyRouteGuard feature="referral"><Invite /></LoyaltyRouteGuard></ProtectedRoute>} />
              <Route path="/points" element={<ProtectedRoute><CapabilityRoute enabled={capabilities.pointsEnabled}><LoyaltyRouteGuard feature="points"><Points /></LoyaltyRouteGuard></CapabilityRoute></ProtectedRoute>} />
              <Route
                path="/points/gifts"
                element={
                  POINTS_GIFT_REDEEM_CLIENT_ENABLED ? (
                    <ProtectedRoute>
                      <CapabilityRoute enabled={capabilities.pointsEnabled}>
                        <LoyaltyRouteGuard feature="points">
                          <PointsGiftShop />
                        </LoyaltyRouteGuard>
                      </CapabilityRoute>
                    </ProtectedRoute>
                  ) : (
                    <Navigate to="/points" replace />
                  )
                }
              />
              <Route path="/rewards" element={<ProtectedRoute><LoyaltyRouteGuard feature="reward"><Rewards /></LoyaltyRouteGuard></ProtectedRoute>} />
              <Route path="/address" element={<ProtectedRoute><AddressManage /></ProtectedRoute>} />
              <Route path="/coupons" element={<CapabilityRoute enabled={capabilities.couponEnabled}><Coupons /></CapabilityRoute>} />
              <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
              <Route path="/returns" element={<ProtectedRoute><Returns /></ProtectedRoute>} />
              <Route path="/returns/:id" element={<ProtectedRoute><ReturnDetail /></ProtectedRoute>} />
              <Route path="/reviews/pending" element={<ProtectedRoute><CapabilityRoute enabled={capabilities.reviewEnabled}><PendingReviews /></CapabilityRoute></ProtectedRoute>} />
              <Route path="/history" element={<History />} />

              <Route path="/admin/*" element={<NotFound />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
          <DeferredGlobalMount delayMs={PRIVACY_TRACKING_DELAY_MS}>
            <Suspense fallback={null}>
              <TrackingManager />
              <CookieConsentBanner />
            </Suspense>
          </DeferredGlobalMount>
          <DeferredGlobalMount>
            <Suspense fallback={null}>
              <PwaUpdateToast />
            </Suspense>
          </DeferredGlobalMount>
          <DeferredGlobalMount>
            <Suspense fallback={null}>
              {capabilities.trafficAnalyticsEnabled ? <RouteAnalyticsTracker /> : null}
              <ChinaBrowserCompatNotice />
            </Suspense>
          </DeferredGlobalMount>
        </TooltipProvider>
        </DownloadConfirmProvider>
        </ModalLayerProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

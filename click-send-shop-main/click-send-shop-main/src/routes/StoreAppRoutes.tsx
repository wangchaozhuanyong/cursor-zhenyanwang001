import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { Navigate, Outlet, Route, Routes, useLocation, useNavigationType, useParams } from "react-router-dom";
import { TopProgressBar } from "@/components/ui/top-progress-bar";
import AppRouteFallback, { DelayedRouteFallback, HomeShellSkeleton, StoreOutletFallback } from "@/components/AppRouteFallback";
import AppBootReady from "@/components/AppBootReady";
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
import { useSiteCapabilities, useSiteCapabilitiesReady } from "@/hooks/useSiteCapabilities";
import { DownloadConfirmProvider } from "@/components/DownloadConfirmProvider";
import { ModalLayerProvider } from "@/modules/micro-interactions/modal/ModalLayerProvider";
import { trackEventLazy } from "@/services/trackEventLazy";
import { detectPwaPlatform, isStandaloneApp } from "@/utils/pwa";
import { queryClient } from "@/lib/queryClient";
import { buildSiteFaviconLinkTargets, rememberSiteFaviconUrl } from "@/utils/siteBrandAssets";
import { POINTS_GIFT_REDEEM_CLIENT_ENABLED } from "@/constants/pointsClientFeatures";
import { scheduleIdleTask } from "@/utils/idleScheduler";
import { NEW_ARRIVAL_CATEGORY_PATH } from "@/constants/newArrivalNavigation";
import {
  getRememberedStoreScrollPosition,
  getStoreScrollKey,
  rememberStoreScrollPosition,
} from "@/utils/storeScrollRestoration";
import { logPerf, markPerfStart, observeLongTasksAndLcp } from "@/utils/performanceDebug";
import {
  isPublicLocale,
  stripPublicLocaleFromPath,
  stripPublicLocaleFromPathname,
  usePublicLocale,
} from "@/i18n/publicLocale";
import { PublicLocaleProvider } from "@/i18n/PublicLocaleProvider";
import {
  StoreHomeV2, Login, ForgotPassword, BindWechatPhone,
  Categories, ProductDetail, Search, Promotions, PromotionDetail,
  Cart, Checkout, PaymentResult, Orders, OrderDetail, OrderLogistics, Returns, ReturnDetail, PendingReviews,
  Profile, Feedback, MemberBenefits, Settings, AddressManage, Favorites, History, Notifications, Coupons, Points, PointsGiftShop, Rewards, Wallet, Invite,
  Help, About, ContentCmsPage, SupportDownload, Delivery, FeatureStatus, TikTokLanding, NotFound,
} from "@/routes/publicLazyPages";

const CARD_EQUAL_MOBILE_FIX_STYLE_ID = "store-card-equal-mobile-fix";
const GLOBAL_WIDGET_DELAY_MS = 9000;
const PRIVACY_TRACKING_DELAY_MS = 1000;
const ENABLE_LEGACY_CARD_OVERLAP_FIX = false;

const CookieConsentBanner = lazy(() => import("@/components/CookieConsentBanner"));
const TrackingManager = lazy(() => import("@/components/TrackingManager"));
const SonnerToaster = lazy(() => import("@/components/ui/sonner").then((module) => ({ default: module.Toaster })));
const RouteAnalyticsTracker = lazy(() => import("@/components/RouteAnalyticsTracker"));
const ChinaBrowserCompatNotice = lazy(() => import("@/components/ChinaBrowserCompatNotice"));
const PwaUpdateToast = lazy(() => import("@/components/PwaUpdateToast"));

function shouldDeferNonCriticalWidgets(pathname: string) {
  return !/^\/(cart|checkout|orders|payment|login)(\/|$)/.test(stripPublicLocaleFromPathname(pathname));
}

function shouldSuppressMarketingPopups(pathname: string) {
  return /^\/(checkout|cart|orders|payment)(\/|$)/.test(stripPublicLocaleFromPathname(pathname));
}

function StoreScrollRestoration() {
  const location = useLocation();
  const navigationType = useNavigationType();
  const scrollKey = getStoreScrollKey(location.pathname, location.search);
  const activeScrollKeyRef = useRef(scrollKey);
  const previousScrollKeyRef = useRef(scrollKey);
  const hasHandledInitialRouteRef = useRef(false);

  useLayoutEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
  }, []);

  useLayoutEffect(() => {
    const previousScrollKey = previousScrollKeyRef.current;
    activeScrollKeyRef.current = scrollKey;

    if (hasHandledInitialRouteRef.current && previousScrollKey === scrollKey) {
      return;
    }

    const shouldRestore = hasHandledInitialRouteRef.current && navigationType === "POP";
    const targetY = shouldRestore ? getRememberedStoreScrollPosition(scrollKey) ?? 0 : 0;
    const maxY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    window.scrollTo({ top: Math.min(targetY, maxY), left: 0, behavior: "auto" });
    previousScrollKeyRef.current = scrollKey;
    hasHandledInitialRouteRef.current = true;
  }, [navigationType, scrollKey]);

  useEffect(() => {
    let ticking = false;
    const save = () => {
      ticking = false;
      rememberStoreScrollPosition(activeScrollKeyRef.current);
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(save);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pagehide", save);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pagehide", save);
      rememberStoreScrollPosition(activeScrollKeyRef.current);
    };
  }, []);

  return null;
}

function StorePerformanceDiagnostics() {
  const location = useLocation();
  const routeStartRef = useRef(markPerfStart());

  useEffect(() => observeLongTasksAndLcp(), []);

  useEffect(() => {
    routeStartRef.current = markPerfStart();
    logPerf("route:start", { pathname: location.pathname, search: location.search });
    const frameId = window.requestAnimationFrame(() => {
      logPerf("route:mounted", {
        pathname: location.pathname,
        duration: Math.round((performance.now() - routeStartRef.current) * 10) / 10,
      });
    });
    const settledId = window.setTimeout(() => {
      logPerf("route:settled", {
        pathname: location.pathname,
        duration: Math.round((performance.now() - routeStartRef.current) * 10) / 10,
      });
    }, 600);
    return () => {
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(settledId);
    };
  }, [location.pathname, location.search]);

  return null;
}

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
    const cancelIdle = analyticsLoadedRef.current
      ? scheduleIdleTask("analytics-capability-sync-now", sync, { delayMs: 0, timeoutMs: 1200, jitterMs: 0 })
      : scheduleIdleTask("analytics-capability-sync", sync, {
        delayMs: GLOBAL_WIDGET_DELAY_MS,
        timeoutMs: 5000,
        jitterMs: 2500,
      });
    return () => {
      cancelled = true;
      cancelIdle();
    };
  }, [capabilities.trafficAnalyticsEnabled]);
  return null;
}

function DeferredGlobalMount({ children, delayMs = GLOBAL_WIDGET_DELAY_MS }: { children: ReactNode; delayMs?: number }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    return scheduleIdleTask("deferred-global-mount", () => setMounted(true), {
      delayMs,
      timeoutMs: 5000,
      jitterMs: 2500,
    });
  }, [delayMs]);
  return mounted ? <>{children}</> : null;
}

function AppScopeSync() {
  useLayoutEffect(() => {
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

  useLayoutEffect(() => {
    document.documentElement.setAttribute("data-app-scope", "store");
    window.dispatchEvent(new CustomEvent("app:scope-changed", { detail: { scope: "store" } }));
  }, []);

  return (
    <ErrorBoundary resetKey={`${location.pathname}${location.search}`}>
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
  if (!authHydrated) {
    return <HomeShellSkeleton />;
  }
  return <StoreHomeV2 />;
}

function LoyaltyRouteGuard({ feature, children }: { feature: "points" | "reward" | "referral"; children: ReactNode }) {
  const capabilities = useSiteCapabilities();
  const { localizedPath } = usePublicLocale();
  const { config, loading } = useLoyaltyVisibility();
  const enabled = isLoyaltyFeatureEnabled(feature, capabilities, config);
  if (loading) return <AppRouteFallback />;
  if (!enabled) return <Navigate to={localizedPath("/profile")} replace />;
  return <>{children}</>;
}

function CapabilityRoute({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  const ready = useSiteCapabilitiesReady();
  if (!ready) return <AppRouteFallback />;
  if (!enabled) return <FeatureUnavailable />;
  return <>{children}</>;
}

function LegacyDealsRedirect({ detail = false }: { detail?: boolean }) {
  const location = useLocation();
  const { slug = "" } = useParams();
  const { localizedPath } = usePublicLocale();
  const target = detail ? `/promotions/${slug}` : "/promotions";
  return <Navigate to={`${localizedPath(target)}${location.search}`} replace />;
}

function PublicLocaleRouteScope({ multilingualEnabled }: { multilingualEnabled: boolean }) {
  const location = useLocation();
  const ready = useSiteCapabilitiesReady();
  const { locale } = useParams();
  if (!isPublicLocale(locale)) return <NotFound />;
  if (!ready) return <AppRouteFallback />;
  if (!multilingualEnabled) {
    return <Navigate to={stripPublicLocaleFromPath(`${location.pathname}${location.search}${location.hash}`)} replace />;
  }
  return <Outlet />;
}

function publicRoutePath(path: string, localized: boolean) {
  return localized ? path.replace(/^\//, "") : path;
}

function publicNavigatePath(path: string, localized: boolean) {
  if (localized && path === "/") return ".";
  return localized ? path.replace(/^\//, "") : path;
}

function renderFrontLayoutRoutes(capabilities: ReturnType<typeof useSiteCapabilities>, localized = false) {
  const dealsEnabled = capabilities.mallEnabled && (capabilities.couponEnabled || capabilities.pointsEnabled);
  return (
    <Route element={<FrontLayout />}>
      {localized ? <Route index element={<HomeRoute />} /> : <Route path="/" element={<HomeRoute />} />}
      <Route path={publicRoutePath("/categories", localized)} element={<CapabilityRoute enabled={capabilities.mallEnabled}><Categories /></CapabilityRoute>} />
      <Route path={publicRoutePath("/new-arrivals", localized)} element={<CapabilityRoute enabled={capabilities.mallEnabled}><Navigate to={publicNavigatePath(NEW_ARRIVAL_CATEGORY_PATH, localized)} replace /></CapabilityRoute>} />
      <Route path={publicRoutePath("/support-download", localized)} element={<CapabilityRoute enabled={capabilities.customerServiceDownloadEnabled}><SupportDownload /></CapabilityRoute>} />
      <Route path={publicRoutePath("/search", localized)} element={<CapabilityRoute enabled={capabilities.mallEnabled}><Search /></CapabilityRoute>} />
      <Route path={publicRoutePath("/promotions", localized)} element={<CapabilityRoute enabled={dealsEnabled}><Promotions /></CapabilityRoute>} />
      <Route path={publicRoutePath("/promotions/:slug", localized)} element={<CapabilityRoute enabled={dealsEnabled}><PromotionDetail /></CapabilityRoute>} />
      <Route path={publicRoutePath("/deals", localized)} element={<LegacyDealsRedirect />} />
      <Route path={publicRoutePath("/deals/:slug", localized)} element={<LegacyDealsRedirect detail />} />
      <Route path={publicRoutePath("/cart", localized)} element={<CapabilityRoute enabled={capabilities.mallEnabled}><Cart /></CapabilityRoute>} />
      <Route path={publicRoutePath("/profile", localized)} element={<Profile />} />
      <Route path={publicRoutePath("/product/:id", localized)} element={<CapabilityRoute enabled={capabilities.mallEnabled}><ProductDetail /></CapabilityRoute>} />
    </Route>
  );
}

function renderStandalonePublicRoutes(capabilities: ReturnType<typeof useSiteCapabilities>, localized = false) {
  return (
    <>
      <Route path={publicRoutePath("/login", localized)} element={<Login />} />
      <Route path={publicRoutePath("/register", localized)} element={<Login />} />
      <Route path={publicRoutePath("/forgot", localized)} element={<ForgotPassword />} />
      <Route path={publicRoutePath("/forgot-password", localized)} element={<Navigate to={publicNavigatePath("/forgot", localized)} replace />} />
      <Route path={publicRoutePath("/login/bind-phone", localized)} element={<BindWechatPhone />} />
      <Route path={publicRoutePath("/help", localized)} element={<Help />} />
      <Route path={publicRoutePath("/about", localized)} element={<About />} />
      <Route path={publicRoutePath("/delivery", localized)} element={<Delivery />} />
      <Route path={publicRoutePath("/feature-status", localized)} element={<FeatureStatus />} />
      <Route path={publicRoutePath("/feedback", localized)} element={<Feedback />} />
      <Route path={publicRoutePath("/favorites", localized)} element={<Favorites />} />
      <Route
        path={publicRoutePath("/install", localized)}
        element={capabilities.customerServiceDownloadEnabled ? (
          <Navigate to={publicNavigatePath("/support-download?tab=download", localized)} replace />
        ) : (
          <Navigate to={publicNavigatePath("/", localized)} replace />
        )}
      />
      <Route path={publicRoutePath("/content/:slug", localized)} element={<ContentCmsPage />} />

      <Route path={publicRoutePath("/checkout", localized)} element={<ProtectedRoute><CapabilityRoute enabled={capabilities.mallEnabled}><Checkout /></CapabilityRoute></ProtectedRoute>} />
      <Route path={publicRoutePath("/payment/result", localized)} element={<CapabilityRoute enabled={capabilities.mallEnabled}><PaymentResult /></CapabilityRoute>} />
      <Route path={publicRoutePath("/settings", localized)} element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path={publicRoutePath("/member/benefits", localized)} element={<ProtectedRoute><MemberBenefits /></ProtectedRoute>} />
      <Route path={publicRoutePath("/member-benefits", localized)} element={<Navigate to={publicNavigatePath("/member/benefits", localized)} replace />} />
      <Route path={publicRoutePath("/orders", localized)} element={<ProtectedRoute><Orders /></ProtectedRoute>} />
      <Route path={publicRoutePath("/orders/:id/logistics", localized)} element={<ProtectedRoute><OrderLogistics /></ProtectedRoute>} />
      <Route path={publicRoutePath("/orders/:id", localized)} element={<ProtectedRoute><OrderDetail /></ProtectedRoute>} />
      <Route path={publicRoutePath("/invite", localized)} element={<ProtectedRoute><LoyaltyRouteGuard feature="referral"><Invite /></LoyaltyRouteGuard></ProtectedRoute>} />
      <Route path={publicRoutePath("/points", localized)} element={<ProtectedRoute><CapabilityRoute enabled={capabilities.pointsEnabled}><LoyaltyRouteGuard feature="points"><Points /></LoyaltyRouteGuard></CapabilityRoute></ProtectedRoute>} />
      <Route
        path={publicRoutePath("/points/gifts", localized)}
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
            <Navigate to={publicNavigatePath("/points", localized)} replace />
          )
        }
      />
      <Route path={publicRoutePath("/rewards", localized)} element={<ProtectedRoute><LoyaltyRouteGuard feature="reward"><Rewards /></LoyaltyRouteGuard></ProtectedRoute>} />
      <Route path={publicRoutePath("/wallet", localized)} element={<ProtectedRoute><Wallet /></ProtectedRoute>} />
      <Route path={publicRoutePath("/address", localized)} element={<ProtectedRoute><AddressManage /></ProtectedRoute>} />
      <Route path={publicRoutePath("/coupons", localized)} element={<CapabilityRoute enabled={capabilities.couponEnabled}><Coupons /></CapabilityRoute>} />
      <Route path={publicRoutePath("/notifications", localized)} element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
      <Route path={publicRoutePath("/returns", localized)} element={<ProtectedRoute><Returns /></ProtectedRoute>} />
      <Route path={publicRoutePath("/returns/:id", localized)} element={<ProtectedRoute><ReturnDetail /></ProtectedRoute>} />
      <Route path={publicRoutePath("/reviews/pending", localized)} element={<ProtectedRoute><CapabilityRoute enabled={capabilities.reviewEnabled}><PendingReviews /></CapabilityRoute></ProtectedRoute>} />
      <Route path={publicRoutePath("/history", localized)} element={<History />} />
    </>
  );
}

export function StoreAppRoutes() {
  const location = useLocation();
  if (/^\/tiktok\/?$/.test(location.pathname)) return <TikTokStandaloneRoutes />;

  return (
    <PublicLocaleProvider>
      <MainStoreRoutes />
    </PublicLocaleProvider>
  );
}

function MainStoreRoutes() {
  const location = useLocation();
  const capabilities = useSiteCapabilities();
  const suppressMarketingPopups = shouldSuppressMarketingPopups(location.pathname);
  const deferNonCriticalWidgets = shouldDeferNonCriticalWidgets(location.pathname);
  const nonCriticalWidgetDelayMs = deferNonCriticalWidgets ? GLOBAL_WIDGET_DELAY_MS : 3000;

  return (
    <ErrorBoundary resetKey={`${location.pathname}${location.search}`}>
      <QueryClientProvider client={queryClient}>
        <ModalLayerProvider>
        <DownloadConfirmProvider>
          <TopProgressBar />
          <AuthSessionSync />
          <SiteIdentitySync />
          <ReferralInviteSync />
          <StoreScrollRestoration />
          <StorePerformanceDiagnostics />
          <AnalyticsCapabilitySync />
          <PwaStandaloneAnalytics />
          <AppScopeSync />
          <RouteBackTracker />
          <RouteSeoGuard />
          <LanguageGate />
          <AgeGate />
          {ENABLE_LEGACY_CARD_OVERLAP_FIX ? <StoreCardOverlapFix /> : null}
          <Suspense fallback={<DelayedRouteFallback fallback={<StoreOutletFallback />} delayMs={180} />}>
            <AppBootReady />
            <Routes>
              {renderFrontLayoutRoutes(capabilities)}
              {renderStandalonePublicRoutes(capabilities)}

              <Route path="/:locale" element={<PublicLocaleRouteScope multilingualEnabled={capabilities.storefrontMultilingualEnabled} />}>
                {renderFrontLayoutRoutes(capabilities, true)}
                {renderStandalonePublicRoutes(capabilities, true)}
                <Route path="*" element={<NotFound />} />
              </Route>

              <Route path="/admin/*" element={<NotFound />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
          <DeferredGlobalMount delayMs={PRIVACY_TRACKING_DELAY_MS}>
            <Suspense fallback={null}>
              <SonnerToaster />
            </Suspense>
          </DeferredGlobalMount>
          <DeferredGlobalMount delayMs={nonCriticalWidgetDelayMs}>
            <Suspense fallback={null}>
              <TrackingManager />
            </Suspense>
          </DeferredGlobalMount>
          {!suppressMarketingPopups ? (
          <DeferredGlobalMount delayMs={nonCriticalWidgetDelayMs}>
            <Suspense fallback={null}>
              <CookieConsentBanner />
              <PwaUpdateToast />
            </Suspense>
          </DeferredGlobalMount>
          ) : null}
          <DeferredGlobalMount delayMs={nonCriticalWidgetDelayMs}>
            <Suspense fallback={null}>
              {capabilities.trafficAnalyticsEnabled ? <RouteAnalyticsTracker /> : null}
              <ChinaBrowserCompatNotice />
            </Suspense>
          </DeferredGlobalMount>
        </DownloadConfirmProvider>
        </ModalLayerProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

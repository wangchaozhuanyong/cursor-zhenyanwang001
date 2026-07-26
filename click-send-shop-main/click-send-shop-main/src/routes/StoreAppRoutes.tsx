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
import BottomNav from "@/components/BottomNav";
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
import { useSiteCapabilities, useSiteCapabilitiesReady } from "@/hooks/useSiteCapabilities";
import { DownloadConfirmProvider } from "@/components/DownloadConfirmProvider";
import { ModalLayerProvider } from "@/modules/micro-interactions/modal/ModalLayerProvider";
import { trackEventLazy } from "@/services/trackEventLazy";
import { detectPwaPlatform, isStandaloneApp } from "@/utils/pwa";
import { queryClient } from "@/lib/queryClient";
import { buildSiteFaviconLinkTargets, rememberSiteFaviconUrl } from "@/utils/siteBrandAssets";
import { STOREFRONT_NEXT_SCOPE } from "@/modules/storefront-v2/design/storefrontDesignContract";
import { scheduleIdleTask } from "@/utils/idleScheduler";
import { isStoreTabPath } from "@/utils/storeBottomInset";
import { NEW_ARRIVAL_CATEGORY_PATH } from "@/constants/newArrivalNavigation";
import { areClientDesignRoutesEnabled } from "@/utils/clientDesignRoutes";
import {
  getRememberedStoreScrollPosition,
  getStoreScrollKey,
  getStoreTabPathKey,
  rememberStoreTabPath,
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
  Cart,
  Categories,
  NotFound,
  ProductDetail,
  Profile,
  PromotionDetail,
  Promotions,
  Search,
  StoreHomeV2,
  SupportDownload,
  TikTokLanding,
} from "@/routes/publicFrontLazyPages";
import type { PublicStandaloneRouteKey } from "@/routes/PublicStandaloneRouteElement";
import { CapabilityRoute, type PublicRouteCapabilities } from "@/routes/publicCapabilityRoute";
import { publicNavigatePath, publicRoutePath } from "@/routes/publicRoutePaths";
import StorefrontMotionBoundary from "@/components/storefront-motion/StorefrontMotionBoundary";
import StorefrontProgressThread from "@/components/storefront-motion/StorefrontProgressThread";
import StorefrontRouteVeil from "@/components/storefront-motion/StorefrontRouteVeil";

const CARD_EQUAL_MOBILE_FIX_STYLE_ID = "sf-next-card-equal-mobile-fix";
const BACKGROUND_ANALYTICS_DELAY_MS = 18_000;
const BACKGROUND_TRACKING_DELAY_MS = 22_000;
const BACKGROUND_MARKETING_WIDGET_DELAY_MS = 28_000;
const BACKGROUND_COMPAT_NOTICE_DELAY_MS = 34_000;
const HIGH_INTENT_WIDGET_DELAY_MS = 3_000;
const ENABLE_LEGACY_CARD_OVERLAP_FIX = false;

const CookieConsentBanner = lazy(() => import("@/components/CookieConsentBanner"));
const TrackingManager = lazy(() => import("@/components/TrackingManager"));
const RouteAnalyticsTracker = lazy(() => import("@/components/RouteAnalyticsTracker"));
const ChinaBrowserCompatNotice = lazy(() => import("@/components/ChinaBrowserCompatNotice"));
const PwaUpdateToast = lazy(() => import("@/components/PwaUpdateToast"));
const PublicStandaloneRouteElement = lazy(() => import("@/routes/PublicStandaloneRouteElement"));

function shouldDeferNonCriticalWidgets(pathname: string) {
  return !/^\/(cart|checkout|orders|payment|login)(\/|$)/.test(stripPublicLocaleFromPathname(pathname));
}

function shouldSuppressMarketingPopups(pathname: string) {
  return /^\/(checkout|cart|orders|payment)(\/|$)/.test(stripPublicLocaleFromPathname(pathname));
}

function StorefrontBottomNavHost() {
  const location = useLocation();
  if (!isStoreTabPath(stripPublicLocaleFromPathname(location.pathname))) return null;
  return <BottomNav />;
}

function StoreScrollRestoration() {
  const location = useLocation();
  const navigationType = useNavigationType();
  const scrollKey = getStoreScrollKey(location.pathname, location.search);
  const activeScrollKeyRef = useRef(scrollKey);
  const previousScrollKeyRef = useRef(scrollKey);
  const previousPathnameRef = useRef(location.pathname);
  const hasHandledInitialRouteRef = useRef(false);

  useLayoutEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
  }, []);

  useLayoutEffect(() => {
    const previousScrollKey = previousScrollKeyRef.current;
    const previousPathname = previousPathnameRef.current;
    activeScrollKeyRef.current = scrollKey;

    if (hasHandledInitialRouteRef.current && previousScrollKey === scrollKey) {
      previousPathnameRef.current = location.pathname;
      return;
    }

    const previousTabKey = getStoreTabPathKey(previousPathname);
    const currentTabKey = getStoreTabPathKey(location.pathname);
    const isTabSwitch = Boolean(previousTabKey && currentTabKey && previousTabKey !== currentTabKey);
    const shouldRestore = hasHandledInitialRouteRef.current && (navigationType === "POP" || isTabSwitch);
    const targetY = shouldRestore ? getRememberedStoreScrollPosition(scrollKey) ?? 0 : 0;
    const maxY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    window.scrollTo({ top: Math.min(targetY, maxY), left: 0, behavior: "auto" });
    previousScrollKeyRef.current = scrollKey;
    previousPathnameRef.current = location.pathname;
    hasHandledInitialRouteRef.current = true;
  }, [location.pathname, navigationType, scrollKey]);

  useLayoutEffect(() => {
    rememberStoreTabPath(location.pathname, location.search, location.hash);
  }, [location.hash, location.pathname, location.search]);

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
      { deferMs: BACKGROUND_ANALYTICS_DELAY_MS },
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
        delayMs: BACKGROUND_ANALYTICS_DELAY_MS,
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

function DeferredGlobalMount({ children, delayMs = BACKGROUND_ANALYTICS_DELAY_MS }: { children: ReactNode; delayMs?: number }) {
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
      root.setAttribute("data-storefront-ui", STOREFRONT_NEXT_SCOPE);
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
    document.documentElement.setAttribute("data-storefront-ui", STOREFRONT_NEXT_SCOPE);
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
  if (!ready) return <DelayedRouteFallback fallback={<AppRouteFallback />} delayMs={180} />;
  if (!multilingualEnabled) {
    return <Navigate to={stripPublicLocaleFromPath(`${location.pathname}${location.search}${location.hash}`)} replace />;
  }
  return <Outlet />;
}

function renderFrontLayoutRoutes(capabilities: PublicRouteCapabilities, localized = false) {
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

function StandaloneRouteLoader({
  route,
  capabilities,
  localized = false,
}: {
  route: PublicStandaloneRouteKey;
  capabilities: PublicRouteCapabilities;
  localized?: boolean;
}) {
  return <PublicStandaloneRouteElement route={route} capabilities={capabilities} localized={localized} />;
}

function renderStandalonePublicRoutes(capabilities: PublicRouteCapabilities, localized = false) {
  const clientDesignRoutesEnabled = areClientDesignRoutesEnabled();
  const standaloneElement = (route: PublicStandaloneRouteKey) => (
    <StandaloneRouteLoader route={route} capabilities={capabilities} localized={localized} />
  );
  return (
    <>
      <Route path={publicRoutePath("/login", localized)} element={standaloneElement("login")} />
      <Route path={publicRoutePath("/register", localized)} element={standaloneElement("login")} />
      <Route path={publicRoutePath("/forgot", localized)} element={standaloneElement("forgot")} />
      <Route path={publicRoutePath("/forgot-password", localized)} element={standaloneElement("forgot")} />
      <Route path={publicRoutePath("/login/bind-phone", localized)} element={standaloneElement("bind-phone")} />
      <Route path={publicRoutePath("/help", localized)} element={standaloneElement("help")} />
      <Route path={publicRoutePath("/about", localized)} element={standaloneElement("about")} />
      <Route path={publicRoutePath("/delivery", localized)} element={standaloneElement("delivery")} />
      <Route path={publicRoutePath("/feature-status", localized)} element={standaloneElement("feature-status")} />
      {clientDesignRoutesEnabled ? (
        <>
          <Route path={publicRoutePath("/client-design/system", localized)} element={standaloneElement("client-design-system")} />
          <Route path={publicRoutePath("/client-design/coupon-detail", localized)} element={standaloneElement("client-design-coupon-detail")} />
          <Route path={publicRoutePath("/client-design/share-detail", localized)} element={standaloneElement("client-design-share-detail")} />
          <Route path={publicRoutePath("/client-design/states", localized)} element={standaloneElement("client-design-states")} />
        </>
      ) : null}
      <Route path={publicRoutePath("/feedback", localized)} element={standaloneElement("feedback")} />
      <Route path={publicRoutePath("/favorites", localized)} element={standaloneElement("favorites")} />
      <Route path={publicRoutePath("/install", localized)} element={standaloneElement("install")} />
      <Route path={publicRoutePath("/content/:slug", localized)} element={standaloneElement("content")} />

      <Route path={publicRoutePath("/checkout", localized)} element={standaloneElement("checkout")} />
      <Route path={publicRoutePath("/payment/result", localized)} element={standaloneElement("payment-result")} />
      <Route path={publicRoutePath("/settings", localized)} element={standaloneElement("settings")} />
      <Route path={publicRoutePath("/member/benefits", localized)} element={standaloneElement("member-benefits")} />
      <Route path={publicRoutePath("/member-benefits", localized)} element={<Navigate to={publicNavigatePath("/member/benefits", localized)} replace />} />
      <Route path={publicRoutePath("/orders", localized)} element={standaloneElement("orders")} />
      <Route path={publicRoutePath("/orders/:id/logistics", localized)} element={standaloneElement("order-logistics")} />
      <Route path={publicRoutePath("/orders/:id", localized)} element={standaloneElement("order-detail")} />
      <Route path={publicRoutePath("/invite", localized)} element={standaloneElement("invite")} />
      <Route path={publicRoutePath("/points", localized)} element={standaloneElement("points")} />
      <Route path={publicRoutePath("/points/gifts", localized)} element={standaloneElement("points-gifts")} />
      <Route path={publicRoutePath("/rewards", localized)} element={standaloneElement("rewards")} />
      <Route path={publicRoutePath("/wallet", localized)} element={standaloneElement("wallet")} />
      <Route path={publicRoutePath("/address", localized)} element={standaloneElement("address")} />
      <Route path={publicRoutePath("/coupons", localized)} element={standaloneElement("coupons")} />
      <Route path={publicRoutePath("/notifications", localized)} element={standaloneElement("notifications")} />
      <Route path={publicRoutePath("/returns", localized)} element={standaloneElement("returns")} />
      <Route path={publicRoutePath("/returns/:id", localized)} element={standaloneElement("return-detail")} />
      <Route path={publicRoutePath("/reviews/pending", localized)} element={standaloneElement("pending-reviews")} />
      <Route path={publicRoutePath("/history", localized)} element={standaloneElement("history")} />
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
  const trackingDelayMs = deferNonCriticalWidgets ? BACKGROUND_TRACKING_DELAY_MS : HIGH_INTENT_WIDGET_DELAY_MS;
  const marketingWidgetDelayMs = deferNonCriticalWidgets ? BACKGROUND_MARKETING_WIDGET_DELAY_MS : HIGH_INTENT_WIDGET_DELAY_MS;
  const analyticsDelayMs = deferNonCriticalWidgets ? BACKGROUND_ANALYTICS_DELAY_MS : HIGH_INTENT_WIDGET_DELAY_MS;
  const compatNoticeDelayMs = deferNonCriticalWidgets ? BACKGROUND_COMPAT_NOTICE_DELAY_MS : HIGH_INTENT_WIDGET_DELAY_MS;
  const routeFallbackKey = `${location.pathname}${location.search}`;
  const routeFallbackDelayMs = location.pathname.startsWith("/product/") ? 520 : 320;

  return (
    <ErrorBoundary resetKey={`${location.pathname}${location.search}`}>
      <QueryClientProvider client={queryClient}>
        <ModalLayerProvider>
            <DownloadConfirmProvider>
            <TopProgressBar />
            <StorefrontProgressThread />
            <StorefrontRouteVeil />
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
            <AppBootReady />
            <StorefrontMotionBoundary>
              <Suspense
                fallback={(
                  <DelayedRouteFallback
                    key={routeFallbackKey}
                    fallback={<StoreOutletFallback />}
                    delayMs={routeFallbackDelayMs}
                  />
                )}
              >
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
            </StorefrontMotionBoundary>
            <StorefrontBottomNavHost />
            <DeferredGlobalMount delayMs={trackingDelayMs}>
              <Suspense fallback={null}>
                <TrackingManager />
              </Suspense>
            </DeferredGlobalMount>
            {!suppressMarketingPopups ? (
              <DeferredGlobalMount delayMs={marketingWidgetDelayMs}>
                <Suspense fallback={null}>
                  <CookieConsentBanner />
                  <PwaUpdateToast />
                </Suspense>
              </DeferredGlobalMount>
            ) : null}
            <DeferredGlobalMount delayMs={analyticsDelayMs}>
              <Suspense fallback={null}>
                {capabilities.trafficAnalyticsEnabled ? <RouteAnalyticsTracker /> : null}
              </Suspense>
            </DeferredGlobalMount>
            <DeferredGlobalMount delayMs={compatNoticeDelayMs}>
              <Suspense fallback={null}>
                <ChinaBrowserCompatNotice />
              </Suspense>
            </DeferredGlobalMount>
          </DownloadConfirmProvider>
        </ModalLayerProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

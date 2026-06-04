import { lazy, Suspense, useEffect, useLayoutEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TopProgressBar } from "@/components/ui/top-progress-bar";
import AppRouteFallback from "@/components/AppRouteFallback";
import ErrorBoundary from "@/components/ErrorBoundary";
import AdminRouteFallback from "@/modules/admin/pages/error/AdminRouteFallback";
import { AdminI18nProvider } from "@/contexts/AdminI18nProvider";
import ChinaBrowserCompatNotice from "@/components/ChinaBrowserCompatNotice";
import RouteBackTracker from "@/components/RouteBackTracker";
import { useAdminTOptional } from "@/hooks/useAdminT";
import { useSiteInfo, useSiteInfoLoaded } from "@/hooks/useSiteInfo";
import { queryClient } from "@/lib/queryClient";
import { ModalLayerProvider } from "@/modules/micro-interactions/modal/ModalLayerProvider";
import { getAdminRouteDocumentTitleKey } from "@/config/adminRouteRegistry";
import { buildSiteFaviconLinkTargets, rememberSiteFaviconUrl } from "@/utils/siteBrandAssets";
import {
  DEFAULT_APPLE_TOUCH_ICON,
  DEFAULT_FAVICON_ICO,
  DEFAULT_FAVICON_PNG,
  DEFAULT_FAVICON_SVG,
} from "@/constants/siteBrand";

const AdminLogin = lazy(() => import("@/modules/admin/pages/auth/AdminLogin"));
const AdminShellRoutes = lazy(() => import("@/routes/AdminShellRoutes"));

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
    const rawSiteName = (siteInfo.siteName || "\u5927\u9a6c\u901a").trim();
    const siteName = locale === "en" && /[\u4e00-\u9fff]/.test(rawSiteName) ? "Official Shop" : rawSiteName;
    const rawTitleKey = getAdminRouteDocumentTitleKey(location.pathname);
    const translatedTitle = t(rawTitleKey);
    const pageTitle = translatedTitle === rawTitleKey ? "Admin" : translatedTitle;
    document.title = `${pageTitle} | ${siteName}`;
  }, [location.pathname, locale, siteInfo.siteName, t]);

  return null;
}

export function AdminAppRoutes() {
  const location = useLocation();

  return (
    <ErrorBoundary resetKey={location.pathname}>
      <QueryClientProvider client={queryClient}>
        <ModalLayerProvider>
          <AdminI18nProvider>
            <Sonner
              offset={{ top: "calc(max(0.75rem, env(safe-area-inset-top)) + 3.25rem)" }}
              mobileOffset={{ top: "calc(max(0.75rem, env(safe-area-inset-top)) + 3.25rem)" }}
            />
            <TopProgressBar />
            <SiteIdentitySync />
            <AppScopeSync />
            <AdminTitleSync />
            <RouteBackTracker />
            <ChinaBrowserCompatNotice />
            <Suspense fallback={<AppRouteFallback />}>
              <Routes>
                <Route path="/" element={<Navigate to="/admin/login" replace />} />
                <Route path="/login" element={<Navigate to="/admin/login" replace />} />
                <Route path="/admin/login" element={<AdminLogin />} />
                <Route path="/admin/*" element={<AdminShellRoutes />} />
                <Route path="*" element={<AdminRouteFallback type="not-found" />} />
              </Routes>
            </Suspense>
          </AdminI18nProvider>
        </ModalLayerProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

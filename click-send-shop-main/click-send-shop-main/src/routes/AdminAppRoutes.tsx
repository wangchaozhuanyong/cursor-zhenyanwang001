import { lazy, Suspense, useEffect, useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { TopProgressBar } from "@/components/ui/top-progress-bar";
import AppRouteFallback from "@/components/AppRouteFallback";
import ErrorBoundary from "@/components/ErrorBoundary";
import ChinaBrowserCompatNotice from "@/components/ChinaBrowserCompatNotice";
import RouteBackTracker from "@/components/RouteBackTracker";
import { useAdminLoginT } from "@/i18n/adminLogin";
import { queryClient } from "@/lib/queryClient";
import { ModalLayerProvider } from "@/modules/micro-interactions/modal/ModalLayerProvider";

const AdminLogin = lazy(() => import("@/modules/admin/pages/auth/AdminLogin"));
const AdminRouteFallback = lazy(() => import("@/modules/admin/pages/error/AdminRouteFallback"));
const AdminShellRoutes = lazy(() => import("@/routes/AdminShellRoutes"));
const AdminToastHost = lazy(() => import("@/components/ui/sonner").then((module) => ({ default: module.Toaster })));

type IdleWindow = Window & {
  requestIdleCallback?: (callback: () => void, options?: { timeout?: number }) => number;
  cancelIdleCallback?: (id: number) => void;
};

function AppScopeSync() {
  useEffect(() => {
    document.documentElement.setAttribute("data-app-scope", "admin");
    window.dispatchEvent(new CustomEvent("app:scope-changed", { detail: { scope: "admin" } }));
  }, []);
  return null;
}

function AdminLoginTitleSync() {
  const location = useLocation();
  const { t, locale } = useAdminLoginT();

  useEffect(() => {
    if (!location.pathname.startsWith("/admin/login") && location.pathname !== "/login") return;
    const siteName = locale === "en" ? "Official Shop" : "\u5927\u9a6c\u901a";
    document.title = `${t("login.title")} | ${siteName}`;
  }, [location.pathname, locale, t]);

  return null;
}

function AdminShellRouteElement() {
  return <AdminShellRoutes />;
}

function DeferredAdminToastHost() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const idleWindow = window as IdleWindow;
    const markReady = () => setReady(true);

    if (typeof idleWindow.requestIdleCallback === "function") {
      const id = idleWindow.requestIdleCallback(markReady, { timeout: 1200 });
      return () => idleWindow.cancelIdleCallback?.(id);
    }

    const id = window.setTimeout(markReady, 800);
    return () => window.clearTimeout(id);
  }, []);

  if (!ready) return null;

  return (
    <Suspense fallback={null}>
      <AdminToastHost
        offset={{ top: "calc(max(0.75rem, env(safe-area-inset-top)) + 3.25rem)" }}
        mobileOffset={{ top: "calc(max(0.75rem, env(safe-area-inset-top)) + 3.25rem)" }}
      />
    </Suspense>
  );
}

export function AdminAppRoutes() {
  const location = useLocation();

  return (
    <ErrorBoundary resetKey={location.pathname}>
      <QueryClientProvider client={queryClient}>
        <ModalLayerProvider>
          <DeferredAdminToastHost />
          <TopProgressBar />
          <AppScopeSync />
          <AdminLoginTitleSync />
          <RouteBackTracker />
          <ChinaBrowserCompatNotice />
          <Suspense fallback={<AppRouteFallback />}>
            <Routes>
              <Route path="/" element={<Navigate to="/admin/login" replace />} />
              <Route path="/login" element={<Navigate to="/admin/login" replace />} />
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/admin/*" element={<AdminShellRouteElement />} />
              <Route path="*" element={<AdminRouteFallback type="not-found" />} />
            </Routes>
          </Suspense>
        </ModalLayerProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

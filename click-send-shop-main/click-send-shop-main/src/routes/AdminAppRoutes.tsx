import { lazy, Suspense, useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TopProgressBar } from "@/components/ui/top-progress-bar";
import AppRouteFallback from "@/components/AppRouteFallback";
import ErrorBoundary from "@/components/ErrorBoundary";
import AdminRouteFallback from "@/modules/admin/pages/error/AdminRouteFallback";
import ChinaBrowserCompatNotice from "@/components/ChinaBrowserCompatNotice";
import RouteBackTracker from "@/components/RouteBackTracker";
import { useAdminLoginT } from "@/i18n/adminLogin";
import { queryClient } from "@/lib/queryClient";
import { ModalLayerProvider } from "@/modules/micro-interactions/modal/ModalLayerProvider";

const AdminLogin = lazy(() => import("@/modules/admin/pages/auth/AdminLogin"));
const AdminShellRoutes = lazy(() => import("@/routes/AdminShellRoutes"));

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

export function AdminAppRoutes() {
  const location = useLocation();

  return (
    <ErrorBoundary resetKey={location.pathname}>
      <QueryClientProvider client={queryClient}>
        <ModalLayerProvider>
          <Sonner
            offset={{ top: "calc(max(0.75rem, env(safe-area-inset-top)) + 3.25rem)" }}
            mobileOffset={{ top: "calc(max(0.75rem, env(safe-area-inset-top)) + 3.25rem)" }}
          />
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

import { lazy, Suspense } from "react";
import { BrowserRouter, useLocation } from "react-router-dom";
import AppRouteFallback, { StoreOutletFallback } from "@/components/AppRouteFallback";

const StoreAppRoutes = lazy(() => import("@/routes/StoreAppRoutes").then((module) => ({ default: module.StoreAppRoutes })));
const TikTokLanding = lazy(() => import("@/modules/public/pages/content/TikTokLanding"));

function StoreAppContent() {
  const location = useLocation();
  const isTikTokLanding = /^\/tiktok\/?$/.test(location.pathname);

  return (
    <Suspense fallback={isTikTokLanding ? <AppRouteFallback /> : <StoreOutletFallback />}>
      {isTikTokLanding ? <TikTokLanding /> : <StoreAppRoutes />}
    </Suspense>
  );
}

const StoreApp = () => (
  <BrowserRouter
    future={{
      v7_startTransition: true,
      v7_relativeSplatPath: true,
    }}
  >
    <StoreAppContent />
  </BrowserRouter>
);

export default StoreApp;

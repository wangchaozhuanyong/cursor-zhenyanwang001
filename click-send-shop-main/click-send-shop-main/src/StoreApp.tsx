import { lazy, Suspense } from "react";
import { BrowserRouter, useLocation } from "react-router-dom";
import AppRouteFallback, { DelayedRouteFallback, StoreOutletFallback } from "@/components/AppRouteFallback";
import { NavigationHistoryRecorder } from "@/components/NavigationHistoryRecorder";
import { StoreAppRoutes } from "@/routes/StoreAppRoutes";

const TikTokLanding = lazy(() => import("@/modules/public/pages/content/TikTokLanding"));

function StoreAppContent() {
  const location = useLocation();
  const isTikTokLanding = /^\/tiktok\/?$/.test(location.pathname);

  return (
    <Suspense fallback={isTikTokLanding ? <AppRouteFallback /> : <DelayedRouteFallback fallback={<StoreOutletFallback />} delayMs={180} />}>
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
    <NavigationHistoryRecorder />
    <StoreAppContent />
  </BrowserRouter>
);

export default StoreApp;

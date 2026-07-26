import { Suspense } from "react";
import { BrowserRouter, useLocation } from "react-router-dom";
import AppRouteFallback, { DelayedRouteFallback, StoreOutletFallback } from "@/components/AppRouteFallback";
import DeferredStoreToaster from "@/components/DeferredStoreToaster";
import { NavigationHistoryRecorder } from "@/components/NavigationHistoryRecorder";
import { StoreAppRoutes } from "@/routes/StoreAppRoutes";
import { lazyPublicRouteWithPreload } from "@/routes/lazyWithPreload";

const TikTokLanding = lazyPublicRouteWithPreload(() => import("@/modules/public/pages/content/TikTokLanding"));

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
    <DeferredStoreToaster />
  </BrowserRouter>
);

export default StoreApp;

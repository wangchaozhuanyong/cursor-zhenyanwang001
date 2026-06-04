import { lazy, Suspense, useLayoutEffect } from "react";
import { BrowserRouter, useLocation, useNavigationType } from "react-router-dom";
import AppRouteFallback from "@/components/AppRouteFallback";

const StoreAppRoutes = lazy(() => import("@/routes/StoreAppRoutes").then((module) => ({ default: module.StoreAppRoutes })));
const TikTokLanding = lazy(() => import("@/modules/public/pages/content/TikTokLanding"));

function StoreAppContent() {
  const location = useLocation();
  const navigationType = useNavigationType();
  const isTikTokLanding = /^\/tiktok\/?$/.test(location.pathname);

  useLayoutEffect(() => {
    if (navigationType === "POP") return;
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [location.pathname, navigationType]);

  return (
    <Suspense fallback={<AppRouteFallback />}>
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

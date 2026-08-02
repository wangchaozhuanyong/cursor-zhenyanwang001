import { installBrowserCompatShims, installChunkLoadRecovery } from "@/lib/browserBoot";
import { lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import "@/styles/store-tablet-visual.css";
import "@/styles/storefront-foundation.css";
import "@/styles/storefront-next.tokens.css";
import "@/styles/storefront-next.primitives-core.css";
import "@/styles/storefront-motion.css";
import "@/styles/fixed-storefront.css";
import { initPwaOfflineNavigation, markStoreSpaReady } from "@/lib/pwaOfflineNavigation";
import AppVersionReadyMarker from "@/components/AppVersionReadyMarker";
import AppBootReady from "@/components/AppBootReady";
import { NavigationHistoryRecorder } from "@/components/NavigationHistoryRecorder";
import { initPwaInstallPromptCapture } from "@/lib/pwaInstallPromptStore";
import { HomeShellSkeleton } from "@/components/AppRouteFallback";
import { lazyPublicRouteWithPreload } from "@/routes/lazyWithPreload";

const TikTokLanding = lazyPublicRouteWithPreload(() => import("@/modules/public/pages/content/TikTokLanding"));

const StoreShell = lazy(async () => {
  const { default: StoreApp } = await import("./StoreApp.tsx");

  return {
    default: function StoreShellComponent() {
      return (
        <>
          <AppVersionReadyMarker appName="storefront" onReady={markStoreSpaReady} />
          <StoreApp />
        </>
      );
    },
  };
});

const isTikTokLanding = /^\/tiktok\/?$/.test(window.location.pathname);

installBrowserCompatShims();
installChunkLoadRecovery("storefront");
initPwaInstallPromptCapture();
if (!isTikTokLanding) {
  initPwaOfflineNavigation();
}

createRoot(document.getElementById("root")!).render(
  <Suspense fallback={isTikTokLanding ? null : <HomeShellSkeleton />}>
    {isTikTokLanding ? (
      <>
        <AppVersionReadyMarker appName="storefront" onReady={markStoreSpaReady} />
        <AppBootReady />
        <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <NavigationHistoryRecorder />
          <TikTokLanding />
        </BrowserRouter>
      </>
    ) : (
      <StoreShell />
    )}
  </Suspense>,
);

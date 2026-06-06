import { installBrowserCompatShims, installChunkLoadRecovery } from "@/lib/browserBoot";
import { lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import "@/styles/store-tablet-visual.css";
import { initPwaOfflineNavigation, markStoreSpaReady } from "@/lib/pwaOfflineNavigation";
import SilkPageLoader from "@/components/motion/SilkPageLoader";
import AppVersionReadyMarker from "@/components/AppVersionReadyMarker";
import { initPwaInstallPromptCapture } from "@/lib/pwaInstallPromptStore";

const TikTokLanding = lazy(() => import("@/modules/public/pages/content/TikTokLanding"));

const StoreShell = lazy(async () => {
  const [{ default: StoreApp }, { ThemeRuntimeProvider }] = await Promise.all([
    import("./StoreApp.tsx"),
    import("@/contexts/ThemeRuntimeProvider"),
  ]);

  return {
    default: function StoreShellComponent() {
      return (
        <ThemeRuntimeProvider>
          <AppVersionReadyMarker appName="storefront" onReady={markStoreSpaReady} />
          <StoreApp />
        </ThemeRuntimeProvider>
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
  <Suspense fallback={<SilkPageLoader />}>
    {isTikTokLanding ? (
      <>
        <AppVersionReadyMarker appName="storefront" />
        <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <TikTokLanding />
        </BrowserRouter>
      </>
    ) : (
      <StoreShell />
    )}
  </Suspense>,
);

import { installBrowserCompatShims, installChunkLoadRecovery } from "@/lib/browserBoot";
import { lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import { initPwaOfflineNavigation, markStoreSpaReady } from "@/lib/pwaOfflineNavigation";

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
          <StoreApp />
        </ThemeRuntimeProvider>
      );
    },
  };
});

const isTikTokLanding = /^\/tiktok\/?$/.test(window.location.pathname);

installBrowserCompatShims();
installChunkLoadRecovery("storefront");
if (!isTikTokLanding) {
  initPwaOfflineNavigation();
}

createRoot(document.getElementById("root")!).render(
  <Suspense fallback={null}>
    {isTikTokLanding ? (
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <TikTokLanding />
      </BrowserRouter>
    ) : (
      <StoreShell />
    )}
  </Suspense>,
);

if (!isTikTokLanding) {
  markStoreSpaReady();
}

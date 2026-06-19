import { useCallback, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { startGlobalLoadingImmediate, stopGlobalLoading } from "@/lib/loadingProgress";
import { preloadAdminRoute } from "@/routes/adminLazyPages";

const ADMIN_ROUTE_INTENT_LOADING_TIMEOUT_MS = 3_500;

export function useAdminRouteIntentPreload() {
  const location = useLocation();
  const loadingTokenRef = useRef<symbol | null>(null);
  const fallbackTimerRef = useRef<number | null>(null);

  const stopIntentLoading = useCallback(() => {
    if (fallbackTimerRef.current !== null) {
      window.clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
    if (loadingTokenRef.current) {
      stopGlobalLoading(loadingTokenRef.current);
      loadingTokenRef.current = null;
    }
  }, []);

  const warmAdminRoute = useCallback(
    (to: string, options?: { showProgress?: boolean }) => {
      void preloadAdminRoute(to);
      if (!options?.showProgress) return;

      stopIntentLoading();
      loadingTokenRef.current = startGlobalLoadingImmediate();
      fallbackTimerRef.current = window.setTimeout(
        stopIntentLoading,
        ADMIN_ROUTE_INTENT_LOADING_TIMEOUT_MS,
      );
    },
    [stopIntentLoading],
  );

  useEffect(() => {
    stopIntentLoading();
  }, [location.pathname, location.search, stopIntentLoading]);

  useEffect(() => stopIntentLoading, [stopIntentLoading]);

  return warmAdminRoute;
}

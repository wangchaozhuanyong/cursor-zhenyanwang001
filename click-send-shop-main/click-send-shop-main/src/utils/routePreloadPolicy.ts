type NetworkInformationLike = {
  effectiveType?: string;
  saveData?: boolean;
};

type NavigatorWithConnection = Navigator & {
  connection?: NetworkInformationLike;
  mozConnection?: NetworkInformationLike;
  webkitConnection?: NetworkInformationLike;
  deviceMemory?: number;
  hardwareConcurrency?: number;
};

export type RoutePreloadPriority = "immediate" | "intent" | "idle";

const routePreloadCache = new WeakMap<() => Promise<unknown>, Promise<unknown>>();

function getNetworkInformation(): NetworkInformationLike | undefined {
  if (typeof navigator === "undefined") return undefined;
  const nav = navigator as NavigatorWithConnection;
  return nav.connection || nav.mozConnection || nav.webkitConnection;
}

function isConstrainedDevice(nav: NavigatorWithConnection | undefined) {
  if (!nav) return false;
  if (typeof nav.deviceMemory === "number" && nav.deviceMemory > 0 && nav.deviceMemory <= 2) return true;
  if (typeof nav.hardwareConcurrency === "number" && nav.hardwareConcurrency > 0 && nav.hardwareConcurrency <= 4) return true;
  return false;
}

function isSmallTouchViewport() {
  if (typeof navigator === "undefined" || typeof window === "undefined") return false;
  const minScreen = Math.min(window.screen?.width || window.innerWidth, window.screen?.height || window.innerHeight);
  const minViewport = Math.min(window.innerWidth || minScreen, window.innerHeight || minScreen);
  const compactEdge = Math.min(minScreen || minViewport, minViewport || minScreen);
  return navigator.maxTouchPoints > 0 && compactEdge > 0 && compactEdge <= 768;
}

export function shouldSkipRoutePreload(priority: RoutePreloadPriority = "intent") {
  if (priority !== "immediate" && typeof document !== "undefined" && document.visibilityState !== "visible") {
    return true;
  }

  const connection = getNetworkInformation();
  const nav = typeof navigator === "undefined" ? undefined : (navigator as NavigatorWithConnection);
  if (connection?.saveData) return true;
  if (priority === "idle" && isSmallTouchViewport()) return true;

  if (!connection) {
    if (isConstrainedDevice(nav)) {
      return priority !== "immediate";
    }
    return false;
  }

  const effectiveType = (connection.effectiveType || "").toLowerCase();
  if (effectiveType === "slow-2g" || effectiveType === "2g") return true;
  return priority !== "immediate" && priority !== "intent" && effectiveType === "3g";
}

export function preloadRoute(preload: (() => Promise<unknown>) | undefined, priority: RoutePreloadPriority = "intent") {
  if (!preload || shouldSkipRoutePreload(priority)) return undefined;
  const cached = routePreloadCache.get(preload);
  if (cached) return cached;
  const pending = preload().catch((error) => {
    routePreloadCache.delete(preload);
    throw error;
  });
  routePreloadCache.set(preload, pending);
  return pending;
}

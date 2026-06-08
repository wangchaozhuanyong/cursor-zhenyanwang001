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

export function shouldSkipRoutePreload(priority: RoutePreloadPriority = "intent") {
  if (priority !== "immediate" && typeof document !== "undefined" && document.visibilityState !== "visible") {
    return true;
  }

  const connection = getNetworkInformation();
  if (!connection) {
    if (priority === "idle") return false;
    const nav = typeof navigator === "undefined" ? undefined : (navigator as NavigatorWithConnection);
    if (typeof nav?.deviceMemory === "number" && nav.deviceMemory > 0 && nav.deviceMemory <= 2) return true;
    if (typeof nav?.hardwareConcurrency === "number" && nav.hardwareConcurrency > 0 && nav.hardwareConcurrency <= 4) {
      return priority !== "immediate";
    }
    return false;
  }
  if (connection.saveData) return true;

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

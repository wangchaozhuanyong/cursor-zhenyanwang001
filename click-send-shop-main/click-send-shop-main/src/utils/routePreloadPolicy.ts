type NetworkInformationLike = {
  effectiveType?: string;
  saveData?: boolean;
};

type NavigatorWithConnection = Navigator & {
  connection?: NetworkInformationLike;
  mozConnection?: NetworkInformationLike;
  webkitConnection?: NetworkInformationLike;
};

export type RoutePreloadPriority = "intent" | "idle";

const routePreloadCache = new WeakMap<() => Promise<unknown>, Promise<unknown>>();

function getNetworkInformation(): NetworkInformationLike | undefined {
  if (typeof navigator === "undefined") return undefined;
  const nav = navigator as NavigatorWithConnection;
  return nav.connection || nav.mozConnection || nav.webkitConnection;
}

export function shouldSkipRoutePreload(priority: RoutePreloadPriority = "intent") {
  const connection = getNetworkInformation();
  if (!connection) return false;
  if (connection.saveData) return true;

  const effectiveType = (connection.effectiveType || "").toLowerCase();
  if (effectiveType === "slow-2g" || effectiveType === "2g") return true;
  return priority === "idle" && effectiveType === "3g";
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

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
  return preload();
}

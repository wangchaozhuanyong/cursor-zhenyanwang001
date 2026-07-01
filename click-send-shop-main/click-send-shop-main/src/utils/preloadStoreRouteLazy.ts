import type { RoutePreloadPriority } from "@/utils/routePreloadPolicy";

export function preloadStoreRouteLazy(to: string, priority: RoutePreloadPriority = "intent") {
  return import("@/utils/storeRoutePreload")
    .then(({ preloadStoreRoute }) => preloadStoreRoute(to, priority))
    .catch(() => undefined);
}

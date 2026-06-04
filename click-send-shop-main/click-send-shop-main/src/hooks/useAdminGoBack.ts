import { useCallback } from "react";
import { useLocation } from "react-router-dom";
import { useAdminNavigation } from "@/hooks/useAdminNavigation";
import { buildRoutePath, isUsableBackRoute, normalizeInternalRoutePath, readRouteBack } from "@/utils/routeBackState";

type LocationState = { from?: string };

function isAdminRoute(path: string | undefined, currentPath: string): path is string {
  const normalized = normalizeInternalRoutePath(path);
  if (!normalized) return false;
  if (!normalized.startsWith("/admin")) return false;
  if (normalized.startsWith("/admin/login")) return false;
  return isUsableBackRoute(normalized, currentPath);
}

function normalizeAdminFallback(fallback: string, currentPath: string): string {
  const normalized = normalizeInternalRoutePath(fallback);
  if (isAdminRoute(normalized, currentPath)) return normalized;
  return "/admin";
}

export function resolveAdminBackTarget(input: {
  pathname: string;
  search?: string;
  hash?: string;
  stateFrom?: string;
  storedFrom?: string;
  fallback: string;
}): string {
  const currentPath = buildRoutePath({ pathname: input.pathname, search: input.search, hash: input.hash });
  const stateFrom = normalizeInternalRoutePath(input.stateFrom);
  const storedFrom = normalizeInternalRoutePath(input.storedFrom);

  if (isAdminRoute(stateFrom, currentPath)) return stateFrom;
  if (isAdminRoute(storedFrom, currentPath)) return storedFrom;
  return normalizeAdminFallback(input.fallback, currentPath);
}

export function useAdminGoBack(fallback: string) {
  const adminNavigate = useAdminNavigation();
  const location = useLocation();
  const currentPath = buildRoutePath(location);
  const locationKey = location.key;
  const locationState = location.state;
  const pathname = location.pathname;
  const search = location.search;
  const hash = location.hash;

  return useCallback(async () => {
    const target = resolveAdminBackTarget({
      pathname,
      search,
      hash,
      stateFrom: (locationState as LocationState | null)?.from,
      storedFrom: readRouteBack(locationKey, currentPath),
      fallback,
    });

    await adminNavigate(target, { replace: true });
  }, [adminNavigate, currentPath, fallback, hash, locationKey, locationState, pathname, search]);
}

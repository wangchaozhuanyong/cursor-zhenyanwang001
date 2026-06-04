import { useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { buildRoutePath, isUsableBackRoute, normalizeInternalRoutePath, readRouteBack } from "@/utils/routeBackState";

type LocationState = { from?: string };

/** 个人中心常见子页：无可用历史栈时默认回到个人中心 */
const PROFILE_HUB_PATHS = new Set([
  "/points",
  "/points/gifts",
  "/rewards",
  "/invite",
  "/address",
  "/coupons",
  "/notifications",
  "/settings",
  "/orders",
  "/returns",
  "/history",
  "/help",
  "/feedback",
  "/favorites",
  "/reviews/pending",
]);

function resolveBackFallback(pathname: string, explicit?: string, stateFrom?: string): string {
  if (explicit) return explicit;
  if (stateFrom?.startsWith("/")) return stateFrom;

  const path = pathname || "/";
  if (path.startsWith("/admin")) return "/admin";
  if (path.startsWith("/profile")) return "/profile";
  if (path.startsWith("/product/")) return "/";

  const base = path.split("?")[0];
  if (PROFILE_HUB_PATHS.has(base) || base.startsWith("/orders/")) return "/profile";

  return "/";
}

export type GoBackAction =
  | { kind: "history"; delta: number }
  | { kind: "path"; path: string; replace: true };

/** Pure resolver for back navigation; fallback is only used when history/state are unavailable. */
export function resolveGoBackAction(input: {
  pathname: string;
  search?: string;
  hash?: string;
  stateFrom?: string;
  storedFrom?: string;
  locationKey: string;
  fallback?: string;
  historyIndex?: number;
}): GoBackAction {
  const currentPath = buildRoutePath({ pathname: input.pathname, search: input.search, hash: input.hash });
  const normalizedCurrent = normalizeInternalRoutePath(currentPath);
  const stateFrom = normalizeInternalRoutePath(input.stateFrom);
  const storedFrom = normalizeInternalRoutePath(input.storedFrom);
  const canUseHistory = typeof input.historyIndex === "number"
    ? input.historyIndex > 0
    : input.locationKey !== "default";

  if (isUsableBackRoute(stateFrom, currentPath) && stateFrom !== normalizedCurrent) {
    return { kind: "path", path: stateFrom, replace: true };
  }

  if (isUsableBackRoute(storedFrom, currentPath) && storedFrom !== normalizedCurrent) {
    return { kind: "path", path: storedFrom, replace: true };
  }

  if (canUseHistory) {
    return { kind: "history", delta: -1 };
  }

  return {
    kind: "path",
    path: resolveBackFallback(input.pathname, input.fallback, stateFrom),
    replace: true,
  };
}

export function useGoBack(fallback?: string) {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = buildRoutePath(location);
  const locationKey = location.key;
  const locationState = location.state;
  const pathname = location.pathname;
  const search = location.search;
  const hash = location.hash;

  return useCallback(() => {
    const stateFrom = (locationState as LocationState | null)?.from;
    const storedFrom = readRouteBack(locationKey, currentPath);
    const action = resolveGoBackAction({
      pathname,
      search,
      hash,
      stateFrom,
      storedFrom,
      locationKey,
      fallback,
      historyIndex: typeof window !== "undefined" ? window.history.state?.idx : undefined,
    });

    if (action.kind === "history") {
      navigate(action.delta);
      return;
    }

    navigate(action.path, { replace: action.replace });
  }, [currentPath, fallback, hash, locationKey, locationState, navigate, pathname, search]);
}

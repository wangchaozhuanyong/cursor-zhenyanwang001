import { useLocation } from "react-router-dom";
import { useStableBack } from "@/hooks/useStableBack";
import { buildRoutePath, isUsableBackRoute, normalizeInternalRoutePath } from "@/utils/routeBackState";

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

function basePathOf(path?: string): string {
  return (path || "/").split(/[?#]/)[0] || "/";
}

function isProductDetailPath(path?: string): boolean {
  return basePathOf(path).startsWith("/product/");
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
  const currentBase = basePathOf(normalizedCurrent);
  const hasSearchProductBackLoop =
    currentBase === "/search" && (isProductDetailPath(stateFrom) || isProductDetailPath(storedFrom));
  const canUseHistory = typeof input.historyIndex === "number"
    ? input.historyIndex > 0
    : input.locationKey !== "default";

  if (isUsableBackRoute(stateFrom, currentPath) && stateFrom !== normalizedCurrent && !hasSearchProductBackLoop) {
    return { kind: "path", path: stateFrom, replace: true };
  }

  if (isUsableBackRoute(storedFrom, currentPath) && storedFrom !== normalizedCurrent && !hasSearchProductBackLoop) {
    return { kind: "path", path: storedFrom, replace: true };
  }

  if (canUseHistory && !hasSearchProductBackLoop) {
    return { kind: "history", delta: -1 };
  }

  return {
    kind: "path",
    path: resolveBackFallback(input.pathname, input.fallback, stateFrom),
    replace: true,
  };
}

export function useGoBack(fallback?: string) {
  const location = useLocation();
  const stateFrom = (location.state as LocationState | null)?.from;

  return useStableBack({
    fallbackPath: resolveBackFallback(location.pathname, fallback, stateFrom),
  });
}

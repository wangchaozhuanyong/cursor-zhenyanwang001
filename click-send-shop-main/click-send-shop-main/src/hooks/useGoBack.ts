import { useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";

type LocationState = { from?: string };

/** 个人中心常见子页：无可用历史栈时默认回到个人中心 */
const PROFILE_HUB_PATHS = new Set([
  "/points",
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
  stateFrom?: string;
  locationKey: string;
  fallback?: string;
}): GoBackAction {
  const stateFrom = input.stateFrom?.startsWith("/") ? input.stateFrom : undefined;

  if (stateFrom) {
    return { kind: "path", path: stateFrom, replace: true };
  }

  if (input.locationKey !== "default") {
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

  return useCallback(() => {
    const stateFrom = (location.state as LocationState | null)?.from;
    const action = resolveGoBackAction({
      pathname: location.pathname,
      stateFrom,
      locationKey: location.key,
      fallback,
    });

    if (action.kind === "history") {
      navigate(action.delta);
      return;
    }

    navigate(action.path, { replace: action.replace });
  }, [fallback, location.key, location.pathname, location.state, navigate]);
}

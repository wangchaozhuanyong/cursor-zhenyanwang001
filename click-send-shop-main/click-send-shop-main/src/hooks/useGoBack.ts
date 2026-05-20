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

  const base = path.split("?")[0];
  if (PROFILE_HUB_PATHS.has(base) || base.startsWith("/orders/")) return "/profile";

  return "/";
}

export function useGoBack(fallback?: string) {
  const navigate = useNavigate();
  const location = useLocation();

  return useCallback(() => {
    const stateFrom = (location.state as LocationState | null)?.from;
    const hasHistory = typeof window !== "undefined" && window.history.length > 1;

    if (fallback) {
      navigate(fallback, { replace: true });
      return;
    }

    if (stateFrom?.startsWith("/")) {
      navigate(stateFrom, { replace: true });
      return;
    }

    if (hasHistory) {
      navigate(-1);
      return;
    }

    const target = resolveBackFallback(location.pathname, undefined, stateFrom);
    navigate(target, { replace: true });
  }, [fallback, location.pathname, location.state, navigate]);
}

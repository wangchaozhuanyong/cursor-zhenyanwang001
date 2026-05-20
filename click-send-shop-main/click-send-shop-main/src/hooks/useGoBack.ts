import { useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export function useGoBack(fallback?: string) {
  const navigate = useNavigate();
  const location = useLocation();

  return useCallback(() => {
    const isStandalone =
      typeof window !== "undefined" &&
      (window.matchMedia?.("(display-mode: standalone)")?.matches ||
        (window.navigator as Navigator & { standalone?: boolean }).standalone === true);
    const hasHistory = typeof window !== "undefined" && window.history.length > 1;
    const sameOriginReferrer =
      typeof document !== "undefined" &&
      !!document.referrer &&
      (() => {
        try {
          return new URL(document.referrer).origin === window.location.origin;
        } catch {
          return false;
        }
      })();

    // PWA 独立窗口中，history 有时存在但不可回退，要求 referrer 同源再执行 -1
    if (hasHistory && (!isStandalone || sameOriginReferrer)) {
      navigate(-1);
      return;
    }

    if (fallback) {
      navigate(fallback, { replace: true });
      return;
    }

    const path = location.pathname || "/";
    const target = path.startsWith("/admin")
      ? "/admin"
      : path.startsWith("/profile")
        ? "/profile"
        : "/";
    navigate(target, { replace: true });
  }, [fallback, location.pathname, navigate]);
}

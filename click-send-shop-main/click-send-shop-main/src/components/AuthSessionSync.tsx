import { useLayoutEffect } from "react";
import { useAuthStore } from "@/stores/useAuthStore";
import { isLoggedIn } from "@/utils/token";
import { restoreSessionFromCookie } from "@/services/authService";

const AUTH_HYDRATE_TIMEOUT_MS = 8_000;

/** 启动时将持久化 isAuthenticated 与 Cookie 会话对齐 */
export default function AuthSessionSync() {
  useLayoutEffect(() => {
    let cancelled = false;
    const hydrateTimeout = window.setTimeout(() => {
      if (cancelled || useAuthStore.getState().authHydrated) return;
      useAuthStore.setState({ authHydrated: true });
    }, AUTH_HYDRATE_TIMEOUT_MS);

    const flagged = isLoggedIn();
    if (!flagged) {
      useAuthStore.setState({ isAuthenticated: false, authHydrated: true });
      window.clearTimeout(hydrateTimeout);
      return () => {
        cancelled = true;
        window.clearTimeout(hydrateTimeout);
      };
    }

    useAuthStore.setState({ isAuthenticated: flagged });
    void restoreSessionFromCookie()
      .then((ok) => {
        if (cancelled) return;
        useAuthStore.setState({ isAuthenticated: ok, authHydrated: true });
      })
      .catch(() => {
        if (cancelled) return;
        useAuthStore.setState({ isAuthenticated: false, authHydrated: true });
      })
      .finally(() => {
        window.clearTimeout(hydrateTimeout);
      });

    return () => {
      cancelled = true;
      window.clearTimeout(hydrateTimeout);
    };
  }, []);
  return null;
}

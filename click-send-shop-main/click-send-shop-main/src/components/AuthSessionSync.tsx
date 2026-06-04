import { useLayoutEffect } from "react";
import { useAuthStore } from "@/stores/useAuthStore";
import { isLoggedIn } from "@/utils/token";

const AUTH_HYDRATE_TIMEOUT_MS = 8_000;

function stripWechatLoginQuery(): void {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  if (!params.has("wechatLogin")) return;
  params.delete("wechatLogin");
  const qs = params.toString();
  const next = `${window.location.pathname}${qs ? `?${qs}` : ""}${window.location.hash}`;
  window.history.replaceState({}, "", next);
}

/** 启动时将持久化 isAuthenticated 与 Cookie 会话对齐 */
export default function AuthSessionSync() {
  useLayoutEffect(() => {
    let cancelled = false;
    const hydrateTimeout = window.setTimeout(() => {
      if (cancelled || useAuthStore.getState().authHydrated) return;
      useAuthStore.setState({ authHydrated: true });
    }, AUTH_HYDRATE_TIMEOUT_MS);

    const finishHydrate = (isAuthenticated: boolean) => {
      if (cancelled) return;
      useAuthStore.setState({ isAuthenticated, authHydrated: true });
      window.clearTimeout(hydrateTimeout);
    };

    const wechatLoginCallback = new URLSearchParams(window.location.search).get("wechatLogin") === "1";
    if (wechatLoginCallback) {
      void import("@/services/authService")
        .then((module) => module.establishSessionFromExistingCookies())
        .then(() => {
          finishHydrate(true);
          stripWechatLoginQuery();
        })
        .catch(() => {
          finishHydrate(false);
        });
      return () => {
        cancelled = true;
        window.clearTimeout(hydrateTimeout);
      };
    }

    const flagged = isLoggedIn();
    if (!flagged) {
      finishHydrate(false);
      return () => {
        cancelled = true;
        window.clearTimeout(hydrateTimeout);
      };
    }

    useAuthStore.setState({ isAuthenticated: flagged });
    void import("@/services/authService")
      .then((module) => module.restoreSessionFromCookie())
      .then((ok) => {
        finishHydrate(ok);
      })
      .catch(() => {
        finishHydrate(false);
      });

    return () => {
      cancelled = true;
      window.clearTimeout(hydrateTimeout);
    };
  }, []);
  return null;
}

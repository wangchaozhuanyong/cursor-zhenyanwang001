import { useLayoutEffect } from "react";
import { useAuthStore } from "@/stores/useAuthStore";
import { isLoggedIn, clearTokens } from "@/utils/token";
import * as authService from "@/services/authService";

/** 启动时将持久化 isAuthenticated 与登录标记、Cookie 会话对齐 */
export default function AuthSessionSync() {
  useLayoutEffect(() => {
    const flagged = isLoggedIn();
    if (!flagged) {
      useAuthStore.setState({ isAuthenticated: false, authHydrated: true });
      return;
    }
    useAuthStore.setState({ isAuthenticated: flagged });
    void authService
      .getProfile()
      .then(() => {
        useAuthStore.setState({ isAuthenticated: true, authHydrated: true });
      })
      .catch(() => {
        clearTokens();
        useAuthStore.setState({ isAuthenticated: false, authHydrated: true });
      });
  }, []);
  return null;
}

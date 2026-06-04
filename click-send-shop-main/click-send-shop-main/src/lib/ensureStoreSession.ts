import { useAuthStore } from "@/stores/useAuthStore";
import { isLoggedIn } from "@/utils/token";

export const STORE_SESSION_EXPIRED_MESSAGE = "登录已过期，请重新登录";

/**
 * 进入需登录页面前对齐 Cookie 会话与本地登录标记；失败时仅更新 auth store，不触发 request 全局登出。
 */
export async function ensureStoreSession(): Promise<boolean> {
  const flagged = isLoggedIn();
  const storeAuthenticated = useAuthStore.getState().isAuthenticated;
  if (!flagged && !storeAuthenticated) return false;

  const { restoreSessionFromCookie } = await import("@/services/authService");
  const ok = await restoreSessionFromCookie();
  if (!ok) {
    useAuthStore.setState({ isAuthenticated: false, authHydrated: true });
    return false;
  }
  useAuthStore.setState({ isAuthenticated: true, authHydrated: true });
  return true;
}

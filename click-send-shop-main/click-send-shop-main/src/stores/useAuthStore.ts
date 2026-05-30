import { create } from "zustand";
import { persist } from "zustand/middleware";
import * as authService from "@/services/authService";
import { useUserStore } from "@/stores/useUserStore";
import { useCartStore } from "@/stores/useCartStore";
import { useFavoritesStore } from "@/stores/useFavoritesStore";
import { useHistoryStore } from "@/stores/useHistoryStore";
import { useOrderStore } from "@/stores/useOrderStore";
import type {
  LoginParams,
  RegisterParams,
  OtpLoginParams,
  OAuthExchangeParams,
  WechatBindPhoneParams,
} from "@/types/auth";
import type { CartItem } from "@/types/cart";
import type { Product } from "@/types/product";
import type { FavoriteProduct } from "@/stores/useFavoritesStore";
import { registerAuthExpiredHandler } from "@/lib/authSessionBridge";

interface AuthState {
  isAuthenticated: boolean;
  /** 启动时与 Cookie/Profile 对齐完成前为 false，避免双源状态导致路由闪烁 */
  authHydrated: boolean;
  loading: boolean;
  error: string | null;

  login: (params: LoginParams) => Promise<void>;
  register: (params: RegisterParams) => Promise<void>;
  loginWithOtp: (params: OtpLoginParams) => Promise<void>;
  completeOAuthLogin: (params: OAuthExchangeParams) => Promise<void>;
  bindWechatPhone: (params: WechatBindPhoneParams) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

type LocalAuthSnapshots = {
  localCartSnapshot: CartItem[];
  localFavoriteIds: string[];
  localFavoriteProducts: FavoriteProduct[];
  localHistorySnapshot: Product[];
};

function captureLocalAuthSnapshots(): LocalAuthSnapshots {
  return {
    localCartSnapshot: [...useCartStore.getState().items],
    localFavoriteIds: [...useFavoritesStore.getState().favoriteIds],
    localFavoriteProducts: [...useFavoritesStore.getState().favoriteProducts],
    localHistorySnapshot: [...useHistoryStore.getState().history],
  };
}

/** Cookie 会话已确认后同步本地数据；非核心失败不抛出，避免触发全局登出 */
async function syncAfterAuthenticated({
  localCartSnapshot,
  localFavoriteIds,
  localFavoriteProducts,
  localHistorySnapshot,
}: LocalAuthSnapshots): Promise<void> {
  await Promise.allSettled([
    useCartStore.getState().mergeLocalThenSync(localCartSnapshot),
    useFavoritesStore.getState().mergeLocalThenSync(localFavoriteIds, localFavoriteProducts),
    useHistoryStore.getState().mergeLocalThenSync(localHistorySnapshot),
    useUserStore.getState().loadProfile(),
  ]);
}

function createAuthFlow<A extends unknown[]>(
  set: (partial: Partial<AuthState>) => void,
  runAuth: (...args: A) => Promise<unknown>,
  failureMessage: string,
) {
  return async (...args: A) => {
    const snapshots = captureLocalAuthSnapshots();
    set({ loading: true, error: null });
    try {
      await runAuth(...args);
      set({ isAuthenticated: true, authHydrated: true, loading: false });
      void syncAfterAuthenticated(snapshots);
    } catch (e) {
      set({
        loading: false,
        isAuthenticated: false,
        error: e instanceof Error ? e.message : failureMessage,
      });
      throw e;
    }
  };
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: authService.isAuthenticated(),
      authHydrated: false,
      loading: false,
      error: null,

      login: createAuthFlow(set, authService.login, "登录失败"),
      register: createAuthFlow(set, authService.register, "注册失败"),
      loginWithOtp: createAuthFlow(set, authService.loginWithOtp, "登录失败"),
      completeOAuthLogin: createAuthFlow(set, authService.exchangeOAuthTicket, "登录失败"),
      bindWechatPhone: createAuthFlow(set, authService.bindWechatPhone, "绑定失败"),

      logout: async () => {
        try { await authService.logout(); } catch { /* best-effort */ }
        useUserStore.getState().clearProfile();
        useCartStore.setState({ buyNowItem: null, selection: {} });
        useOrderStore.setState({ orders: [], currentOrder: null });
        set({ isAuthenticated: false, error: null });
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({ isAuthenticated: state.isAuthenticated }),
    },
  ),
);

registerAuthExpiredHandler(() => {
  useAuthStore.setState({ isAuthenticated: false, authHydrated: true });
});

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

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: authService.isAuthenticated(),
      authHydrated: false,
      loading: false,
      error: null,

      login: async (params) => {
        const localCartSnapshot: CartItem[] = [...useCartStore.getState().items];
        const localFavoriteIds = [...useFavoritesStore.getState().favoriteIds];
        const localFavoriteProducts = [...useFavoritesStore.getState().favoriteProducts];
        const localHistorySnapshot = [...useHistoryStore.getState().history];
        set({ loading: true, error: null });
        try {
          await authService.login(params);
          set({ isAuthenticated: true, authHydrated: true });
          await useCartStore.getState().mergeLocalThenSync(localCartSnapshot);
          await useFavoritesStore.getState().mergeLocalThenSync(localFavoriteIds, localFavoriteProducts);
          await useHistoryStore.getState().mergeLocalThenSync(localHistorySnapshot).catch(() => {});
          await useUserStore.getState().loadProfile();
          set({ loading: false });
        } catch (e) {
          set({
            loading: false,
            error: e instanceof Error ? e.message : "登录失败",
          });
          throw e;
        }
      },

      register: async (params) => {
        const localCartSnapshot: CartItem[] = [...useCartStore.getState().items];
        const localFavoriteIds = [...useFavoritesStore.getState().favoriteIds];
        const localFavoriteProducts = [...useFavoritesStore.getState().favoriteProducts];
        const localHistorySnapshot = [...useHistoryStore.getState().history];
        set({ loading: true, error: null });
        try {
          await authService.register(params);
          set({ isAuthenticated: true, authHydrated: true });
          await useCartStore.getState().mergeLocalThenSync(localCartSnapshot);
          await useFavoritesStore.getState().mergeLocalThenSync(localFavoriteIds, localFavoriteProducts);
          await useHistoryStore.getState().mergeLocalThenSync(localHistorySnapshot).catch(() => {});
          await useUserStore.getState().loadProfile();
          set({ loading: false });
        } catch (e) {
          set({
            loading: false,
            error: e instanceof Error ? e.message : "注册失败",
          });
          throw e;
        }
      },

      loginWithOtp: async (params) => {
        const localCartSnapshot: CartItem[] = [...useCartStore.getState().items];
        const localFavoriteIds = [...useFavoritesStore.getState().favoriteIds];
        const localFavoriteProducts = [...useFavoritesStore.getState().favoriteProducts];
        const localHistorySnapshot = [...useHistoryStore.getState().history];
        set({ loading: true, error: null });
        try {
          await authService.loginWithOtp(params);
          set({ isAuthenticated: true, authHydrated: true });
          await useCartStore.getState().mergeLocalThenSync(localCartSnapshot);
          await useFavoritesStore.getState().mergeLocalThenSync(localFavoriteIds, localFavoriteProducts);
          await useHistoryStore.getState().mergeLocalThenSync(localHistorySnapshot).catch(() => {});
          await useUserStore.getState().loadProfile();
          set({ loading: false });
        } catch (e) {
          set({
            loading: false,
            error: e instanceof Error ? e.message : "登录失败",
          });
          throw e;
        }
      },

      completeOAuthLogin: async (params) => {
        const localCartSnapshot: CartItem[] = [...useCartStore.getState().items];
        const localFavoriteIds = [...useFavoritesStore.getState().favoriteIds];
        const localFavoriteProducts = [...useFavoritesStore.getState().favoriteProducts];
        const localHistorySnapshot = [...useHistoryStore.getState().history];
        set({ loading: true, error: null });
        try {
          await authService.exchangeOAuthTicket(params);
          set({ isAuthenticated: true, authHydrated: true });
          await useCartStore.getState().mergeLocalThenSync(localCartSnapshot);
          await useFavoritesStore.getState().mergeLocalThenSync(localFavoriteIds, localFavoriteProducts);
          await useHistoryStore.getState().mergeLocalThenSync(localHistorySnapshot).catch(() => {});
          await useUserStore.getState().loadProfile();
          set({ loading: false });
        } catch (e) {
          set({
            loading: false,
            error: e instanceof Error ? e.message : "登录失败",
          });
          throw e;
        }
      },

      bindWechatPhone: async (params) => {
        const localCartSnapshot: CartItem[] = [...useCartStore.getState().items];
        const localFavoriteIds = [...useFavoritesStore.getState().favoriteIds];
        const localFavoriteProducts = [...useFavoritesStore.getState().favoriteProducts];
        const localHistorySnapshot = [...useHistoryStore.getState().history];
        set({ loading: true, error: null });
        try {
          await authService.bindWechatPhone(params);
          set({ isAuthenticated: true, authHydrated: true });
          await useCartStore.getState().mergeLocalThenSync(localCartSnapshot);
          await useFavoritesStore.getState().mergeLocalThenSync(localFavoriteIds, localFavoriteProducts);
          await useHistoryStore.getState().mergeLocalThenSync(localHistorySnapshot).catch(() => {});
          await useUserStore.getState().loadProfile();
          set({ loading: false });
        } catch (e) {
          set({
            loading: false,
            error: e instanceof Error ? e.message : "绑定失败",
          });
          throw e;
        }
      },

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

import { create } from "zustand";
import { persist } from "zustand/middleware";
import * as authService from "@/services/authService";
import { useUserStore } from "@/stores/useUserStore";
import { useCartStore } from "@/stores/useCartStore";
import { useFavoritesStore } from "@/stores/useFavoritesStore";
import { useHistoryStore } from "@/stores/useHistoryStore";
import { useOrderStore } from "@/stores/useOrderStore";
import type { LoginParams, RegisterParams } from "@/types/auth";
import type { CartItem } from "@/types/cart";

interface AuthState {
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;

  login: (params: LoginParams) => Promise<void>;
  register: (params: RegisterParams) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: authService.isAuthenticated(),
      loading: false,
      error: null,

      login: async (params) => {
        const localCartSnapshot: CartItem[] = [...useCartStore.getState().items];
        set({ loading: true, error: null });
        try {
          await authService.login(params);
          set({ isAuthenticated: true, loading: false });
          await useCartStore.getState().mergeLocalThenSync(localCartSnapshot);
          useUserStore.getState().loadProfile();
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
        set({ loading: true, error: null });
        try {
          await authService.register(params);
          set({ isAuthenticated: true, loading: false });
          await useCartStore.getState().mergeLocalThenSync(localCartSnapshot);
          useUserStore.getState().loadProfile();
        } catch (e) {
          set({
            loading: false,
            error: e instanceof Error ? e.message : "注册失败",
          });
          throw e;
        }
      },

      logout: async () => {
        try { await authService.logout(); } catch { /* best-effort */ }
        useUserStore.getState().clearProfile();
        useCartStore.setState({ items: [], selection: {} });
        useFavoritesStore.setState({ favoriteIds: [], favoriteProducts: [] });
        useHistoryStore.setState({ history: [] });
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

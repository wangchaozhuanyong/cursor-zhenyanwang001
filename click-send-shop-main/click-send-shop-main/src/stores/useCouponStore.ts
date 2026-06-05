import { create } from "zustand";
import type { UserCoupon } from "@/types/coupon";
import * as couponService from "@/services/couponService";
import { clearTokens, isLoggedIn } from "@/utils/token";
import { ApiError } from "@/types/common";
import { ensureStoreSession, STORE_SESSION_EXPIRED_MESSAGE } from "@/lib/ensureStoreSession";
import { useAuthStore } from "@/stores/useAuthStore";

const COUPON_PAGE_SIZE = 50;
const COUPON_CACHE_TTL_MS = 60_000;
let couponLoadInflight: Promise<void> | null = null;
let couponCacheLoadedAt = 0;

export function invalidateCouponStoreCache() {
  couponLoadInflight = null;
  couponCacheLoadedAt = 0;
}

function isAuthError(err: unknown): boolean {
  return err instanceof ApiError && err.code === 401;
}

async function fetchOwnedCoupons(): Promise<UserCoupon[]> {
  const userCoupons: UserCoupon[] = [];
  let page = 1;
  let total = 0;
  let lastBatchSize = 0;

  do {
    const userData = await couponService.fetchUserCoupons({
      status: "all",
      page,
      pageSize: COUPON_PAGE_SIZE,
    });
    userCoupons.push(...userData.list);
    total = userData.total;
    lastBatchSize = userData.list.length;
    page += 1;
  } while (lastBatchSize > 0 && userCoupons.length < total);

  return userCoupons;
}

interface CouponState {
  coupons: UserCoupon[];
  loading: boolean;
  error: string | null;
  loadCoupons: (options?: { force?: boolean }) => Promise<void>;
  claimCoupon: (code: string, activityId?: string) => Promise<UserCoupon>;
  clearError: () => void;
}

export const useCouponStore = create<CouponState>((set, get) => ({
  coupons: [],
  loading: false,
  error: null,

  loadCoupons: async (options) => {
    const hasFreshCache =
      !options?.force &&
      get().coupons.length > 0 &&
      couponCacheLoadedAt > 0 &&
      Date.now() - couponCacheLoadedAt < COUPON_CACHE_TTL_MS;
    if (hasFreshCache) return;
    if (couponLoadInflight) return couponLoadInflight;

    couponLoadInflight = (async () => {
      const hasCached = get().coupons.length > 0;
      const previousCoupons = get().coupons;
      let availableCoupons: UserCoupon[] = [];
      set({ loading: !hasCached, error: null });
      try {
        availableCoupons = await couponService.fetchAvailableCoupons(0);
        const hasSessionHint = isLoggedIn() || useAuthStore.getState().isAuthenticated;

        if (!hasSessionHint) {
          couponCacheLoadedAt = Date.now();
          set({ coupons: availableCoupons, loading: false, error: null });
          return;
        }

        const sessionReady = await ensureStoreSession();
        if (!sessionReady) {
          clearTokens();
          useAuthStore.setState({ isAuthenticated: false, authHydrated: true });
          couponCacheLoadedAt = Date.now();
          set({ coupons: availableCoupons, loading: false, error: STORE_SESSION_EXPIRED_MESSAGE });
          return;
        }

        try {
          couponCacheLoadedAt = Date.now();
          set({ coupons: [...availableCoupons, ...(await fetchOwnedCoupons())], loading: false });
          return;
        } catch (err) {
          if (!isAuthError(err)) throw err;
          const { restoreSessionFromCookie } = await import("@/services/authService");
          const restored = await restoreSessionFromCookie();
          if (!restored) {
            clearTokens();
            useAuthStore.setState({ isAuthenticated: false, authHydrated: true });
            couponCacheLoadedAt = Date.now();
            set({ coupons: availableCoupons, loading: false, error: STORE_SESSION_EXPIRED_MESSAGE });
            return;
          }
          useAuthStore.setState({ isAuthenticated: true, authHydrated: true });
          couponCacheLoadedAt = Date.now();
          set({ coupons: [...availableCoupons, ...(await fetchOwnedCoupons())], loading: false });
        }
      } catch (err) {
        if (isAuthError(err)) {
          clearTokens();
          useAuthStore.setState({ isAuthenticated: false, authHydrated: true });
          if (availableCoupons.length > 0) couponCacheLoadedAt = Date.now();
          set({
            coupons: availableCoupons.length > 0 ? availableCoupons : previousCoupons,
            loading: false,
            error: STORE_SESSION_EXPIRED_MESSAGE,
          });
          return;
        }
        if (availableCoupons.length > 0) couponCacheLoadedAt = Date.now();
        set({
          coupons: availableCoupons.length > 0 ? availableCoupons : previousCoupons,
          loading: false,
          error: err instanceof Error ? err.message : "加载优惠券失败",
        });
      }
    })().finally(() => {
      couponLoadInflight = null;
    });

    return couponLoadInflight;
  },

  claimCoupon: async (code, activityId) => {
    try {
      const claimed = await couponService.claimCoupon(code, activityId);
      couponCacheLoadedAt = 0;
      set((state) => ({
        coupons: [
          claimed,
          ...state.coupons.filter((item) => {
            if (item.id === claimed.id) return false;
            return !(item.claimed_at === "" && item.coupon?.id === claimed.coupon?.id);
          }),
        ],
        error: null,
      }));
      try {
        await get().loadCoupons({ force: true });
      } catch {
        // 领取已成功，列表刷新失败不应让用户误以为领取失败
      }
      return claimed;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "领取优惠券失败",
      });
      throw err;
    }
  },

  clearError: () => set({ error: null }),
}));

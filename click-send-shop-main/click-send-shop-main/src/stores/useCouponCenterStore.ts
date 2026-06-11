import { create } from "zustand";
import type { UserCoupon } from "@/types/coupon";
import * as couponService from "@/services/couponService";

interface CouponCenterState {
  claimableCoupons: UserCoupon[];
  myUsableCount: number;
  loading: boolean;
  error: string | null;
  loadCenter: (options?: { force?: boolean }) => Promise<void>;
}

let centerLoadedAt = 0;
let centerInflight: Promise<void> | null = null;
const CENTER_TTL_MS = 60_000;

export const useCouponCenterStore = create<CouponCenterState>((set, get) => ({
  claimableCoupons: [],
  myUsableCount: 0,
  loading: false,
  error: null,

  loadCenter: async (options) => {
    const hasFreshCache =
      !options?.force &&
      get().claimableCoupons.length > 0 &&
      centerLoadedAt > 0 &&
      Date.now() - centerLoadedAt < CENTER_TTL_MS;
    if (hasFreshCache) return;
    if (centerInflight) return centerInflight;

    centerInflight = (async () => {
      const hasCached = get().claimableCoupons.length > 0;
      set({ loading: !hasCached, error: null });
      try {
        const center = await couponService.fetchCouponCenter();
        centerLoadedAt = Date.now();
        set({
          claimableCoupons: center.claimable_coupons || [],
          myUsableCount: Number(center.usable_count || center.my_usable_coupons?.length || 0),
          loading: false,
          error: null,
        });
      } catch (err) {
        set({
          loading: false,
          error: err instanceof Error ? err.message : "加载领券中心失败",
        });
      }
    })().finally(() => {
      centerInflight = null;
    });

    return centerInflight;
  },
}));

export function invalidateCouponCenterStoreCache() {
  centerLoadedAt = 0;
  centerInflight = null;
}

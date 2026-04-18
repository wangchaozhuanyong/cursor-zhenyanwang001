import { create } from "zustand";
import type { UserCoupon } from "@/types/coupon";
import * as couponService from "@/services/couponService";

interface CouponState {
  coupons: UserCoupon[];
  loading: boolean;
  error: string | null;

  loadCoupons: () => Promise<void>;
  claimCoupon: (code: string) => Promise<void>;
  clearError: () => void;
}

export const useCouponStore = create<CouponState>((set, get) => ({
  coupons: [],
  loading: false,
  error: null,

  loadCoupons: async () => {
    set({ loading: true, error: null });
    try {
      const [userData, available] = await Promise.all([
        couponService.fetchUserCoupons(),
        couponService.fetchAvailableCoupons(0),
      ]);
      const claimedIds = new Set(userData.list.map((c) => c.coupon?.id));
      const unclaimed = available.filter((c) => !claimedIds.has(c.coupon?.id));
      set({ coupons: [...unclaimed, ...userData.list], loading: false });
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : "加载优惠券失败",
      });
    }
  },

  claimCoupon: async (code) => {
    try {
      await couponService.claimCoupon(code);
      await get().loadCoupons();
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "领取优惠券失败",
      });
      throw err;
    }
  },

  clearError: () => set({ error: null }),
}));

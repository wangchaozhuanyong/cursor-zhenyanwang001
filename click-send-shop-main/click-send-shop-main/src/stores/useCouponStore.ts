import { create } from "zustand";
import type { UserCoupon } from "@/types/coupon";
import * as couponService from "@/services/couponService";
import { isLoggedIn } from "@/utils/token";

const COUPON_PAGE_SIZE = 50;

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
    const hasCached = get().coupons.length > 0;
    set({ loading: !hasCached, error: null });
    try {
      if (!isLoggedIn()) {
        set({ coupons: [], loading: false });
        return;
      }

      const available = await couponService.fetchAvailableCoupons(0);
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

      set({ coupons: [...available, ...userCoupons], loading: false });
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

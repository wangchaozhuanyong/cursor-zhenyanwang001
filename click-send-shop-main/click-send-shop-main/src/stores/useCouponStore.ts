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
  claimCoupon: (code: string) => Promise<UserCoupon>;
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
      const claimed = await couponService.claimCoupon(code);
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
        await get().loadCoupons();
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

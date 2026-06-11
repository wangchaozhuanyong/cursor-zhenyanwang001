import { create } from "zustand";
import type { CouponListParams, UserCoupon } from "@/types/coupon";
import * as couponService from "@/services/couponService";

type MyCouponStatus = NonNullable<CouponListParams["status"]>;

interface MyCouponsState {
  coupons: UserCoupon[];
  status: MyCouponStatus;
  loading: boolean;
  error: string | null;
  loadCoupons: (status?: MyCouponStatus, options?: { force?: boolean }) => Promise<void>;
}

const MY_COUPONS_TTL_MS = 30_000;
let myLoadedAt = 0;
let myInflight: Promise<void> | null = null;

export const useMyCouponsStore = create<MyCouponsState>((set, get) => ({
  coupons: [],
  status: "available",
  loading: false,
  error: null,

  loadCoupons: async (status = "available", options) => {
    const current = get();
    const hasFreshCache =
      !options?.force &&
      current.status === status &&
      current.coupons.length > 0 &&
      myLoadedAt > 0 &&
      Date.now() - myLoadedAt < MY_COUPONS_TTL_MS;
    if (hasFreshCache) return;
    if (myInflight) return myInflight;

    myInflight = (async () => {
      const hasCached = current.status === status && current.coupons.length > 0;
      set({ status, loading: !hasCached, error: null });
      try {
        const page = await couponService.fetchUserCoupons({ status, page: 1, pageSize: 100 });
        myLoadedAt = Date.now();
        set({ coupons: page.list || [], status, loading: false, error: null });
      } catch (err) {
        set({
          coupons: hasCached ? current.coupons : [],
          status,
          loading: false,
          error: err instanceof Error ? err.message : "加载我的优惠券失败",
        });
      }
    })().finally(() => {
      myInflight = null;
    });

    return myInflight;
  },
}));

export function invalidateMyCouponsStoreCache() {
  myLoadedAt = 0;
  myInflight = null;
}

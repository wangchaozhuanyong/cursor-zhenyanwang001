import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CouponCenterData, UserCoupon } from "@/types/coupon";
import { ApiError } from "@/types/common";
import * as couponService from "@/services/couponService";
import { ensureStoreSession, STORE_SESSION_EXPIRED_MESSAGE } from "@/lib/ensureStoreSession";
import { useAuthStore } from "@/stores/useAuthStore";
import { isLoggedIn, setTokens } from "@/utils/token";
import { useCouponStore } from "./useCouponStore";

vi.mock("@/services/couponService", () => ({
  fetchCouponCenter: vi.fn(),
  fetchAvailableCoupons: vi.fn(),
  fetchUserCoupons: vi.fn(),
  claimCoupon: vi.fn(),
}));

vi.mock("@/lib/ensureStoreSession", () => ({
  ensureStoreSession: vi.fn(),
  STORE_SESSION_EXPIRED_MESSAGE: "登录已过期，请重新登录",
}));

vi.mock("@/services/authService", () => ({
  isAuthenticated: vi.fn(() => false),
  login: vi.fn(),
  register: vi.fn(),
  loginWithOtp: vi.fn(),
  exchangeOAuthTicket: vi.fn(),
  bindWechatPhone: vi.fn(),
  logout: vi.fn(),
  restoreSessionFromCookie: vi.fn(),
}));

function coupon(id: string, claimed = false): UserCoupon {
  return {
    id: claimed ? `uc_${id}` : `available_${id}`,
    claimed_at: claimed ? "2026-05-29T00:00:00.000Z" : "",
    status: "available",
    coupon: {
      id,
      code: `CODE_${id}`,
      title: `测试券${id}`,
      type: "fixed",
      value: 20,
      min_amount: 200,
      start_date: "2026-05-01",
      end_date: "2026-06-30",
      status: "available",
    },
  };
}

function couponCenter(claimable: UserCoupon[] = [], usable: UserCoupon[] = []): CouponCenterData {
  return {
    usable_count: usable.length,
    claimable_count: claimable.length,
    my_usable_coupons: usable,
    claimable_coupons: claimable,
  };
}

describe("useCouponStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    useAuthStore.setState({ isAuthenticated: false, authHydrated: true, loading: false, error: null });
    useCouponStore.setState({ coupons: [], loading: false, error: null });
  });

  it("loads claimable coupons from coupon center for guests", async () => {
    vi.mocked(couponService.fetchCouponCenter).mockResolvedValue(couponCenter([coupon("guest")]));

    await useCouponStore.getState().loadCoupons();

    expect(couponService.fetchCouponCenter).toHaveBeenCalledTimes(1);
    expect(couponService.fetchAvailableCoupons).not.toHaveBeenCalled();
    expect(couponService.fetchUserCoupons).not.toHaveBeenCalled();
    expect(useCouponStore.getState().coupons.map((row) => row.coupon.id)).toEqual(["guest"]);
  });

  it("reuses the same inflight coupon center load", async () => {
    let resolveCenter!: (value: CouponCenterData) => void;
    vi.mocked(couponService.fetchCouponCenter).mockReturnValue(
      new Promise<CouponCenterData>((resolve) => {
        resolveCenter = resolve;
      }),
    );

    const first = useCouponStore.getState().loadCoupons();
    const second = useCouponStore.getState().loadCoupons();

    expect(couponService.fetchCouponCenter).toHaveBeenCalledTimes(1);
    resolveCenter(couponCenter([coupon("guest")]));
    await Promise.all([first, second]);

    expect(useCouponStore.getState().coupons.map((row) => row.coupon.id)).toEqual(["guest"]);
  });

  it("reuses fresh loaded coupons without another request", async () => {
    vi.mocked(couponService.fetchCouponCenter).mockResolvedValue(couponCenter([coupon("guest")]));

    await useCouponStore.getState().loadCoupons();
    await useCouponStore.getState().loadCoupons();

    expect(couponService.fetchCouponCenter).toHaveBeenCalledTimes(1);
    expect(useCouponStore.getState().coupons.map((row) => row.coupon.id)).toEqual(["guest"]);
  });

  it("loads claimable and owned usable coupons when a session is ready", async () => {
    useAuthStore.setState({ isAuthenticated: true, authHydrated: true });
    vi.mocked(ensureStoreSession).mockResolvedValue(true);
    vi.mocked(couponService.fetchCouponCenter).mockResolvedValue(
      couponCenter([coupon("public")], [coupon("owned", true)]),
    );

    await useCouponStore.getState().loadCoupons();

    expect(couponService.fetchCouponCenter).toHaveBeenCalledTimes(1);
    expect(couponService.fetchAvailableCoupons).not.toHaveBeenCalled();
    expect(couponService.fetchUserCoupons).not.toHaveBeenCalled();
    expect(useCouponStore.getState().coupons.map((row) => row.coupon.id)).toEqual(["public", "owned"]);
  });

  it("keeps claimable coupons visible when a stale session cannot be restored", async () => {
    useAuthStore.setState({ isAuthenticated: true, authHydrated: true });
    setTokens("access", "refresh");
    vi.mocked(ensureStoreSession).mockResolvedValue(false);
    vi.mocked(couponService.fetchCouponCenter).mockResolvedValue(couponCenter([coupon("public")]));

    await useCouponStore.getState().loadCoupons();

    expect(useCouponStore.getState().coupons.map((row) => row.coupon.id)).toEqual(["public"]);
    expect(useCouponStore.getState().error).toBe(STORE_SESSION_EXPIRED_MESSAGE);
    expect(isLoggedIn()).toBe(true);
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it("does not clear storefront auth when coupon center returns 401", async () => {
    useAuthStore.setState({ isAuthenticated: true, authHydrated: true });
    setTokens("access", "refresh");
    vi.mocked(couponService.fetchCouponCenter).mockRejectedValue(new ApiError(401, "请先登录"));

    await useCouponStore.getState().loadCoupons();

    expect(useCouponStore.getState().error).toBe(STORE_SESSION_EXPIRED_MESSAGE);
    expect(isLoggedIn()).toBe(true);
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it("adds claimed coupon without forcing a legacy coupon center reload", async () => {
    const claimed = coupon("claimed", true);
    vi.mocked(couponService.claimCoupon).mockResolvedValue(claimed);

    await useCouponStore.getState().claimCoupon("CODE_claimed");

    expect(couponService.claimCoupon).toHaveBeenCalledWith("CODE_claimed", undefined);
    expect(couponService.fetchCouponCenter).not.toHaveBeenCalled();
    expect(useCouponStore.getState().coupons.map((row) => row.id)).toEqual([claimed.id]);
  });
});

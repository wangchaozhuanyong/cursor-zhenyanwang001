import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UserCoupon } from "@/types/coupon";
import * as couponService from "@/services/couponService";
import { ensureStoreSession, STORE_SESSION_EXPIRED_MESSAGE } from "@/lib/ensureStoreSession";
import { restoreSessionFromCookie } from "@/services/authService";
import { useAuthStore } from "@/stores/useAuthStore";
import { useCouponStore } from "./useCouponStore";

vi.mock("@/services/couponService", () => ({
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
      title: `测试券 ${id}`,
      type: "fixed",
      value: 20,
      min_amount: 200,
      start_date: "2026-05-01",
      end_date: "2026-06-30",
      status: "available",
    },
  };
}

describe("useCouponStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    useAuthStore.setState({ isAuthenticated: false, authHydrated: true, loading: false, error: null });
    useCouponStore.setState({ coupons: [], loading: false, error: null });
  });

  it("loads public available coupons for guests", async () => {
    vi.mocked(couponService.fetchAvailableCoupons).mockResolvedValue([coupon("guest")]);

    await useCouponStore.getState().loadCoupons();

    expect(couponService.fetchAvailableCoupons).toHaveBeenCalledWith(0);
    expect(couponService.fetchUserCoupons).not.toHaveBeenCalled();
    expect(useCouponStore.getState().coupons).toHaveLength(1);
    expect(useCouponStore.getState().coupons[0].coupon.id).toBe("guest");
  });

  it("reuses the same inflight coupon load", async () => {
    let resolveAvailable!: (value: UserCoupon[]) => void;
    vi.mocked(couponService.fetchAvailableCoupons).mockReturnValue(
      new Promise<UserCoupon[]>((resolve) => {
        resolveAvailable = resolve;
      }),
    );

    const first = useCouponStore.getState().loadCoupons();
    const second = useCouponStore.getState().loadCoupons();

    expect(couponService.fetchAvailableCoupons).toHaveBeenCalledTimes(1);
    resolveAvailable([coupon("guest")]);
    await Promise.all([first, second]);

    expect(useCouponStore.getState().coupons.map((row) => row.coupon.id)).toEqual(["guest"]);
  });

  it("reuses fresh loaded coupons without another request", async () => {
    vi.mocked(couponService.fetchAvailableCoupons).mockResolvedValue([coupon("guest")]);

    await useCouponStore.getState().loadCoupons();
    await useCouponStore.getState().loadCoupons();

    expect(couponService.fetchAvailableCoupons).toHaveBeenCalledTimes(1);
    expect(useCouponStore.getState().coupons.map((row) => row.coupon.id)).toEqual(["guest"]);
  });

  it("loads public and owned coupons when a session is ready", async () => {
    useAuthStore.setState({ isAuthenticated: true, authHydrated: true });
    vi.mocked(ensureStoreSession).mockResolvedValue(true);
    vi.mocked(couponService.fetchAvailableCoupons).mockResolvedValue([coupon("public")]);
    vi.mocked(couponService.fetchUserCoupons).mockResolvedValue({
      list: [coupon("owned", true)],
      total: 1,
      page: 1,
      pageSize: 50,
      totalPages: 1,
    });

    await useCouponStore.getState().loadCoupons();

    expect(couponService.fetchAvailableCoupons).toHaveBeenCalledWith(0);
    expect(couponService.fetchUserCoupons).toHaveBeenCalledWith({ status: "all", page: 1, pageSize: 50 });
    expect(useCouponStore.getState().coupons.map((row) => row.coupon.id)).toEqual(["public", "owned"]);
  });

  it("keeps public coupons visible when a stale session cannot be restored", async () => {
    useAuthStore.setState({ isAuthenticated: true, authHydrated: true });
    vi.mocked(ensureStoreSession).mockResolvedValue(false);
    vi.mocked(restoreSessionFromCookie).mockResolvedValue(false);
    vi.mocked(couponService.fetchAvailableCoupons).mockResolvedValue([coupon("public")]);

    await useCouponStore.getState().loadCoupons();

    expect(useCouponStore.getState().coupons.map((row) => row.coupon.id)).toEqual(["public"]);
    expect(useCouponStore.getState().error).toBe(STORE_SESSION_EXPIRED_MESSAGE);
  });
});

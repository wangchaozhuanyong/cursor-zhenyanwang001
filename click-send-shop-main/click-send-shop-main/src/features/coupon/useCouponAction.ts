import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ensureStoreSession } from "@/lib/ensureStoreSession";
import { useAuthStore } from "@/stores/useAuthStore";
import { useCouponStore } from "@/stores/useCouponStore";
import { invalidateCouponCenterStoreCache } from "@/stores/useCouponCenterStore";
import { invalidateMyCouponsStoreCache } from "@/stores/useMyCouponsStore";
import { toastPresetQuickSuccess } from "@/utils/toastPresets";
import type { CouponClaimStatus } from "@/types/coupon";
import { ApiError } from "@/types/common";

export type CouponActionSource = {
  id: string;
  code?: string;
  issue_activity_id?: string;
  issueActivityId?: string;
  campaign_id?: string;
  campaignId?: string;
  claimable?: boolean;
  claim_status?: CouponClaimStatus;
  claimStatus?: CouponClaimStatus;
  claim_reason?: string;
  claimReason?: string;
  requires_login?: boolean;
  requiresLogin?: boolean;
  requires_member?: boolean;
  requiresMember?: boolean;
  requires_new_user?: boolean;
  requiresNewUser?: boolean;
};

export type CouponActionState = {
  actionLabel: string;
  statusLabel?: string;
  disabled: boolean;
  reason?: string;
  claimStatus: CouponClaimStatus;
};

function getClaimStatus(coupon: CouponActionSource): CouponClaimStatus {
  return coupon.claim_status || coupon.claimStatus || (coupon.claimable === false ? "disabled" : "claimable");
}

function getIssueActivityId(coupon: CouponActionSource): string | undefined {
  return coupon.issue_activity_id || coupon.issueActivityId || coupon.campaign_id || coupon.campaignId || undefined;
}

function getClaimReason(coupon: CouponActionSource, fallback: string): string {
  return coupon.claim_reason || coupon.claimReason || fallback;
}

function isAuthExpiredError(error: unknown): boolean {
  return error instanceof ApiError && error.code === 401;
}

export function getCouponActionState(coupon: CouponActionSource, isAuthenticated: boolean): CouponActionState {
  const claimStatus = getClaimStatus(coupon);
  if (!isAuthenticated || claimStatus === "login_required") {
    return {
      actionLabel: "登录领取",
      statusLabel: undefined,
      disabled: false,
      reason: getClaimReason(coupon, "登录后领取"),
      claimStatus: "login_required",
    };
  }
  if (claimStatus === "claimable") {
    return { actionLabel: "立即领取", disabled: false, claimStatus };
  }
  const copy: Partial<Record<CouponClaimStatus, string>> = {
    member_required: "会员专享",
    new_user_only: "新人专享",
    old_user_only: "老用户专享",
    not_in_audience: "暂不可领",
    already_claimed: "已领取",
    sold_out: "已领完",
    not_started: "未开始",
    ended: "已结束",
    disabled: "不可领取",
  };
  const label = copy[claimStatus] || "不可领取";
  return {
    actionLabel: label,
    statusLabel: label,
    disabled: true,
    reason: getClaimReason(coupon, label),
    claimStatus,
  };
}

export function useCouponAction(defaultFrom = "/coupons") {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const claimCoupon = useCouponStore((s) => s.claimCoupon);

  const claim = useCallback(async (coupon: CouponActionSource, options: { from?: string; successMessage?: string } = {}) => {
    const from = options.from || defaultFrom;
    const couponCode = coupon.code || coupon.id;
    const issueActivityId = getIssueActivityId(coupon);
    let sessionVerified = false;
    const finalizeClaim = (claimed: Awaited<ReturnType<typeof claimCoupon>>) => {
      invalidateCouponCenterStoreCache();
      invalidateMyCouponsStoreCache();
      toast.success(options.successMessage || "领取成功", toastPresetQuickSuccess);
      return claimed;
    };
    let state = getCouponActionState(coupon, isAuthenticated);
    if (state.claimStatus === "login_required" || !isAuthenticated) {
      const ok = await ensureStoreSession({ allowCookieProbe: true });
      if (!ok) {
        navigate("/login", { state: { from } });
        return null;
      }
      sessionVerified = true;
      state = state.claimStatus === "login_required"
        ? { actionLabel: "立即领取", disabled: false, claimStatus: "claimable" }
        : getCouponActionState(coupon, true);
    }
    if (state.claimStatus === "member_required") {
      toast.info(state.reason || "该优惠券仅限会员领取");
      navigate("/member/benefits", { state: { from } });
      return null;
    }
    if (state.disabled) {
      toast.info(state.reason || "该优惠券暂不可领取");
      return null;
    }
    if (!sessionVerified) {
      const ok = await ensureStoreSession({ allowCookieProbe: true });
      if (!ok) {
        navigate("/login", { state: { from } });
        return null;
      }
    }
    try {
      const claimed = await claimCoupon(couponCode, issueActivityId);
      return finalizeClaim(claimed);
    } catch (error) {
      if (isAuthExpiredError(error)) {
        const restored = await ensureStoreSession();
        if (!restored) {
          navigate("/login", { state: { from } });
          return null;
        }
        try {
          const claimed = await claimCoupon(couponCode, issueActivityId);
          return finalizeClaim(claimed);
        } catch (retryError) {
          if (isAuthExpiredError(retryError)) {
            navigate("/login", { state: { from } });
            return null;
          }
          toast.error(retryError instanceof Error ? retryError.message : "领取失败");
          throw retryError;
        }
      }
      toast.error(error instanceof Error ? error.message : "领取失败");
      throw error;
    }
  }, [claimCoupon, defaultFrom, isAuthenticated, navigate]);

  return {
    getActionState: useCallback((coupon: CouponActionSource) => getCouponActionState(coupon, isAuthenticated), [isAuthenticated]),
    claim,
  };
}

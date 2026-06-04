import type { MarketingCouponPublic } from "@/services/marketingService";
import type { UserCoupon } from "@/types/coupon";

export type HomeCouponAction = "claim" | "use" | "view";

export interface HomeCouponCardItem {
  coupon: MarketingCouponPublic;
  userCoupon?: UserCoupon;
  action: HomeCouponAction;
  actionLabel: string;
  statusLabel?: string;
}

export interface HomeCouponSummary {
  claimableCount: number;
  usableCount: number;
  completedCount: number;
}

export interface HomeCouponVisibilityOptions {
  isAuthenticated: boolean;
  couponStateReady: boolean;
}

type UserCouponWithCouponId = UserCoupon & { coupon_id?: string };

const ACTIONABLE_USER_STATUSES = new Set(["available", "pending", "locked"]);
const COMPLETED_USER_STATUSES = new Set(["used", "expired", "invalidated", "cancelled"]);

function getPublicCouponId(coupon: MarketingCouponPublic): string {
  return String(coupon.id || "").trim();
}

function getUserCouponCouponId(userCoupon: UserCoupon): string {
  const row = userCoupon as UserCouponWithCouponId;
  return String(userCoupon.coupon?.id || row.coupon_id || "").trim();
}

function hasClaimed(userCoupon: UserCoupon): boolean {
  return Boolean(userCoupon.claimed_at);
}

function isClaimablePlaceholder(userCoupon: UserCoupon): boolean {
  return !hasClaimed(userCoupon) && userCoupon.status === "available";
}

function isActionableClaim(userCoupon: UserCoupon): boolean {
  return hasClaimed(userCoupon) && ACTIONABLE_USER_STATUSES.has(String(userCoupon.status));
}

function isCompletedClaim(userCoupon: UserCoupon): boolean {
  return hasClaimed(userCoupon) && COMPLETED_USER_STATUSES.has(String(userCoupon.status));
}

function compareClaimPriority(a: UserCoupon, b: UserCoupon): number {
  if (a.status === "available" && b.status !== "available") return -1;
  if (b.status === "available" && a.status !== "available") return 1;
  const aTime = a.valid_until || a.coupon?.end_date || "";
  const bTime = b.valid_until || b.coupon?.end_date || "";
  return String(aTime).localeCompare(String(bTime));
}

function groupUserCouponsByCouponId(userCoupons: UserCoupon[]): Map<string, UserCoupon[]> {
  const grouped = new Map<string, UserCoupon[]>();
  for (const userCoupon of userCoupons) {
    const id = getUserCouponCouponId(userCoupon);
    if (!id) continue;
    const list = grouped.get(id) || [];
    list.push(userCoupon);
    grouped.set(id, list);
  }
  return grouped;
}

export function summarizeHomeCouponState(userCoupons: UserCoupon[]): HomeCouponSummary {
  return userCoupons.reduce<HomeCouponSummary>(
    (summary, userCoupon) => {
      if (isClaimablePlaceholder(userCoupon)) summary.claimableCount += 1;
      else if (isActionableClaim(userCoupon)) summary.usableCount += 1;
      else if (isCompletedClaim(userCoupon)) summary.completedCount += 1;
      return summary;
    },
    { claimableCount: 0, usableCount: 0, completedCount: 0 },
  );
}

export function buildHomeCouponCardItems(
  publicCoupons: MarketingCouponPublic[],
  userCoupons: UserCoupon[],
  isAuthenticated: boolean,
): HomeCouponCardItem[] {
  if (!Array.isArray(publicCoupons) || publicCoupons.length === 0) return [];
  if (!isAuthenticated) {
    return publicCoupons.map((coupon) => ({
      coupon,
      action: "claim",
      actionLabel: "立即领取",
    }));
  }

  const grouped = groupUserCouponsByCouponId(userCoupons);
  const items: HomeCouponCardItem[] = [];

  for (const coupon of publicCoupons) {
    const id = getPublicCouponId(coupon);
    const related = id ? grouped.get(id) || [] : [];
    const actionable = related.filter(isActionableClaim).sort(compareClaimPriority)[0];
    if (actionable) {
      const pending = actionable.status !== "available";
      items.push({
        coupon,
        userCoupon: actionable,
        action: pending ? "view" : "use",
        actionLabel: pending ? "查看券包" : "去使用",
      });
      continue;
    }

    const claimable = related.some(isClaimablePlaceholder);
    if (claimable) {
      items.push({
        coupon,
        action: "claim",
        actionLabel: "立即领取",
      });
    }
  }

  return items;
}

export function buildVisibleHomeCouponCardItems(
  publicCoupons: MarketingCouponPublic[],
  userCoupons: UserCoupon[],
  options: HomeCouponVisibilityOptions,
): HomeCouponCardItem[] {
  if (!Array.isArray(publicCoupons) || publicCoupons.length === 0) return [];
  if (options.isAuthenticated && !options.couponStateReady) return [];
  return buildHomeCouponCardItems(publicCoupons, userCoupons, options.isAuthenticated);
}

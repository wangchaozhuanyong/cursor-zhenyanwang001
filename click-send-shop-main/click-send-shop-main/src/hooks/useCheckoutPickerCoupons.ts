import { useState, useEffect } from "react";
import * as couponService from "@/services/couponService";
import * as orderService from "@/services/orderService";
import type { CheckoutPickerCoupon } from "@/types/coupon";
import type { SubmitOrderParams } from "@/types/order";
import { formatCouponScopeText } from "@/utils/couponDisplay";

/** 结算页可用优惠券：页面/hook → couponService → API */
function parseScopeList(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map((x) => String(x).trim()).filter(Boolean);
  if (typeof raw === "string" && raw.trim()) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) return parsed.map((x) => String(x).trim()).filter(Boolean);
    } catch {
      return raw.split(",").map((x) => x.trim()).filter(Boolean);
    }
    return raw.split(",").map((x) => x.trim()).filter(Boolean);
  }
  return [];
}

function mapServerCoupon(row: Record<string, unknown>, idx: number, usable: boolean): CheckoutPickerCoupon {
  const type = row.type === "percentage" ? "percentage" : row.type === "shipping" ? "shipping" : "fixed";
  const scopeType = row.scope_type === "category" ? "category" : "all";
  const categoryNames = parseScopeList(row.category_names);
  const categoryIds = parseScopeList(row.category_ids);
  return {
    id: String(row.user_coupon_id || row.id || ""),
    couponId: row.coupon_id ? String(row.coupon_id) : undefined,
    title: String(row.title || ""),
    discount: Number(row.value || 0),
    discountType: type,
    condition: Number(row.min_amount || 0),
    expire: String(row.valid_until || ""),
    variantIndex: idx,
    usable,
    reason: typeof row.reason === "string" ? row.reason : undefined,
    discountAmount: Number(row.discount_amount || 0),
    scopeText: formatCouponScopeText(scopeType, categoryNames, categoryIds),
  };
}

export function useCheckoutPickerCoupons(orderAmount: number, checkoutParams?: SubmitOrderParams | null) {
  const [coupons, setCoupons] = useState<CheckoutPickerCoupon[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const request = checkoutParams
      ? orderService.checkoutCoupons(checkoutParams).then((res) => [
        ...(res.usable || []).map((row, idx) => mapServerCoupon(row as unknown as Record<string, unknown>, idx, true)),
        ...(res.unusable || []).map((row, idx) => mapServerCoupon(row as unknown as Record<string, unknown>, idx + (res.usable?.length || 0), false)),
      ])
      : couponService.fetchCheckoutPickerCoupons(orderAmount);
    request
      .then((list) => {
        if (!cancelled) setCoupons(list);
      })
      .catch(() => {
        if (!cancelled) setCoupons([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [orderAmount, checkoutParams]);

  return { coupons, loading };
}

import { useState, useEffect } from "react";
import * as couponService from "@/services/couponService";
import * as orderService from "@/services/orderService";
import type { CheckoutPickerCoupon } from "@/types/coupon";
import type { SubmitOrderParams } from "@/types/order";

/** 结算页可用优惠券：页面/hook → couponService → API */
function mapServerCoupon(row: Record<string, unknown>, idx: number, usable: boolean): CheckoutPickerCoupon {
  const type = row.type === "percentage" ? "percentage" : row.type === "shipping" ? "shipping" : "fixed";
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

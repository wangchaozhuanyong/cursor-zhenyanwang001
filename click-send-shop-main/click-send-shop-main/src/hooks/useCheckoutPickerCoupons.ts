import { useState, useEffect } from "react";
import * as couponService from "@/services/couponService";
import type { CheckoutPickerCoupon } from "@/types/coupon";

/** 结算页可用优惠券：页面/hook → couponService → API */
export function useCheckoutPickerCoupons(orderAmount: number) {
  const [coupons, setCoupons] = useState<CheckoutPickerCoupon[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    couponService
      .fetchCheckoutPickerCoupons(orderAmount)
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
  }, [orderAmount]);

  return { coupons, loading };
}

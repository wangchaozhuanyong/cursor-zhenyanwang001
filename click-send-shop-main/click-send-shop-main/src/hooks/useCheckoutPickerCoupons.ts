import { useState, useEffect, useMemo } from "react";
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
  const [unusableCoupons, setUnusableCoupons] = useState<CheckoutPickerCoupon[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadedRequestKey, setLoadedRequestKey] = useState("");
  const requestKey = useMemo(() => (
    checkoutParams
      ? JSON.stringify({ orderAmount, checkoutParams })
      : ""
  ), [checkoutParams, orderAmount]);

  useEffect(() => {
    let cancelled = false;
    if (!checkoutParams) {
      setCoupons([]);
      setUnusableCoupons([]);
      setLoading(orderAmount > 0);
      setLoadedRequestKey("");
      return () => {
        cancelled = true;
      };
    }
    setLoading(true);
    setLoadedRequestKey("");
    orderService.checkoutCoupons(checkoutParams)
      .then((res) => {
        if (cancelled) return;
        setCoupons((res.usable || []).map((row, idx) => mapServerCoupon(row as unknown as Record<string, unknown>, idx, true)));
        setUnusableCoupons((res.unusable || []).map((row, idx) => mapServerCoupon(row as unknown as Record<string, unknown>, idx, false)));
      })
      .catch(() => {
        if (!cancelled) {
          setCoupons([]);
          setUnusableCoupons([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadedRequestKey(requestKey);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [orderAmount, checkoutParams, requestKey]);

  const ready = !checkoutParams || loadedRequestKey === requestKey;

  return { coupons, unusableCoupons, loading: loading || !ready, ready };
}

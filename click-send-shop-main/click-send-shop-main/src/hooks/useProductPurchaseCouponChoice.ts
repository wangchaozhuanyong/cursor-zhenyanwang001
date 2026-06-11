import { useCallback, useEffect, useMemo, useState } from "react";
import { useCheckoutPickerCoupons } from "@/hooks/useCheckoutPickerCoupons";
import { estimateCheckoutCouponDiscount } from "@/modules/public/pages/order/utils/checkoutCouponDiscount";
import type { CheckoutPickerCoupon } from "@/types/coupon";
import type { SubmitOrderParams } from "@/types/order";
import type { Product, ProductVariant } from "@/types/product";
import type { BuyNowCouponChoice } from "@/stores/useCartStore";
import { isLoggedIn } from "@/utils/token";

type UseProductPurchaseCouponChoiceParams = {
  enabled: boolean;
  product: Product | null;
  variant: ProductVariant | null;
  qty: number;
};

function buildSingleItemCheckoutParams(
  product: Product,
  variant: ProductVariant | null,
  qty: number,
): SubmitOrderParams {
  return {
    items: [
      {
        product_id: product.id,
        variant_id: variant?.id || undefined,
        sku_code: variant?.sku_code || undefined,
        qty: Math.max(1, qty),
      },
    ],
    contact_name: "结算预览",
    contact_phone: "60000000000",
    address: "MY",
    payment_method: "whatsapp",
  };
}

function isCouponUsable(coupon: CheckoutPickerCoupon, rawTotal: number) {
  return coupon.usable !== false && rawTotal >= coupon.condition && coupon.discountType !== "shipping";
}

function findCouponById(coupons: CheckoutPickerCoupon[], couponId?: string) {
  if (!couponId) return null;
  return coupons.find((coupon) => coupon.id === couponId || coupon.couponId === couponId) ?? null;
}

function pickBestCoupon(coupons: CheckoutPickerCoupon[], rawTotal: number) {
  const candidates = coupons.filter((coupon) => isCouponUsable(coupon, rawTotal));
  if (candidates.length === 0) return null;
  return candidates.reduce((best, current) =>
    estimateCheckoutCouponDiscount(current, rawTotal, 0) > estimateCheckoutCouponDiscount(best, rawTotal, 0)
      ? current
      : best,
  );
}

export function useProductPurchaseCouponChoice({
  enabled,
  product,
  variant,
  qty,
}: UseProductPurchaseCouponChoiceParams) {
  const safeQty = Math.max(1, Number(qty || 1));
  const unitPrice = Number(variant?.price ?? product?.price ?? 0) || 0;
  const rawTotal = unitPrice * safeQty;
  const [choice, setChoice] = useState<BuyNowCouponChoice>({ mode: "auto" });
  const purchaseKey = `${product?.id ?? ""}:${variant?.id ?? ""}`;
  const canLoadCoupons = enabled && Boolean(product) && rawTotal > 0 && isLoggedIn();

  const checkoutParams = useMemo<SubmitOrderParams | null>(() => {
    if (!canLoadCoupons || !product) return null;
    return buildSingleItemCheckoutParams(product, variant, safeQty);
  }, [canLoadCoupons, product, safeQty, variant]);

  const { coupons, unusableCoupons, loading } = useCheckoutPickerCoupons(
    canLoadCoupons ? rawTotal : 0,
    checkoutParams,
  );

  useEffect(() => {
    setChoice((prev) => {
      if (prev.mode === "manual") {
        const manual = findCouponById(coupons, prev.couponId);
        if (manual && isCouponUsable(manual, rawTotal)) return prev;
        return { mode: "auto" };
      }
      return prev;
    });
  }, [coupons, rawTotal, purchaseKey]);

  const bestCoupon = useMemo(() => pickBestCoupon(coupons, rawTotal), [coupons, rawTotal]);

  const selectedCoupon = useMemo(() => {
    if (!canLoadCoupons || choice.mode === "none") return null;
    if (choice.mode === "manual") {
      const manual = findCouponById(coupons, choice.couponId);
      return manual && isCouponUsable(manual, rawTotal) ? manual : null;
    }
    return bestCoupon;
  }, [bestCoupon, canLoadCoupons, choice, coupons, rawTotal]);

  const couponDiscount = useMemo(() => {
    if (!selectedCoupon) return 0;
    return estimateCheckoutCouponDiscount(selectedCoupon, rawTotal, 0);
  }, [rawTotal, selectedCoupon]);

  const selectCoupon = useCallback((coupon: CheckoutPickerCoupon | null) => {
    if (!coupon) {
      setChoice({ mode: "none" });
      return;
    }
    setChoice({
      mode: "manual",
      couponId: coupon.id,
      couponTitle: coupon.title,
      estimatedDiscount: estimateCheckoutCouponDiscount(coupon, rawTotal, 0),
    });
  }, [rawTotal]);

  const checkoutChoice = useMemo<BuyNowCouponChoice | null>(() => {
    if (!canLoadCoupons) return null;
    if (choice.mode === "none") return { mode: "none" };
    if (choice.mode === "manual") {
      return {
        mode: "manual",
        couponId: selectedCoupon?.id ?? choice.couponId,
        couponTitle: selectedCoupon?.title ?? choice.couponTitle,
        estimatedDiscount: couponDiscount || choice.estimatedDiscount,
      };
    }
    return {
      mode: "auto",
      couponId: selectedCoupon?.id,
      couponTitle: selectedCoupon?.title,
      estimatedDiscount: couponDiscount,
    };
  }, [canLoadCoupons, choice, couponDiscount, selectedCoupon]);

  return {
    enabled: canLoadCoupons,
    choice,
    selectedCoupon,
    coupons,
    unusableCoupons,
    loading,
    couponDiscount,
    rawTotal,
    payableTotal: Math.max(0, rawTotal - couponDiscount),
    selectCoupon,
    checkoutChoice,
  };
}

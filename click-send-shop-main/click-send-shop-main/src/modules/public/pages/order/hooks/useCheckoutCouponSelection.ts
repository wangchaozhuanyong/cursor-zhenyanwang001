import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { useCheckoutPickerCoupons } from "@/hooks/useCheckoutPickerCoupons";
import type { CheckoutPickerCoupon } from "@/types/coupon";
import type { SubmitOrderParams } from "@/types/order";
import type { CartItem } from "@/types/cart";
import type { PaymentMethod } from "@/components/PaymentMethodPicker";
import { estimateCheckoutCouponDiscount } from "../utils/checkoutCouponDiscount";
import { resolveEffectivePaymentMethod } from "@/utils/checkoutPaymentMethod";

type UseCheckoutCouponSelectionParams = {
  items: CartItem[];
  rawTotal: number;
  shippingFee: number;
  name: string;
  phone: string;
  address: string;
  selectedTemplateId: string | null;
  weightKg: number;
  paymentMethod: PaymentMethod;
  couponEnabled: boolean;
  onlinePaymentEnabled: boolean;
};

export function useCheckoutCouponSelection({
  items,
  rawTotal,
  shippingFee,
  name,
  phone,
  address,
  selectedTemplateId,
  weightKg,
  paymentMethod,
  couponEnabled,
  onlinePaymentEnabled,
}: UseCheckoutCouponSelectionParams) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedCoupon, setSelectedCoupon] = useState<CheckoutPickerCoupon | null>(null);
  const [couponInitDone, setCouponInitDone] = useState(false);
  const preferredCouponId = searchParams.get("coupon_id");

  const checkoutCouponParams = useMemo<SubmitOrderParams | null>(() => {
    if (!items.length || !couponEnabled) return null;
    return {
      items: items.map((item) => ({
        product_id: item.product.id,
        variant_id: item.variant_id || undefined,
        qty: item.qty,
      })),
      contact_name: name.trim() || "结算预览",
      contact_phone: phone.trim() || "60000000000",
      address: address.trim() || "MY",
      shipping_template_id: selectedTemplateId ?? undefined,
      estimated_weight_kg: weightKg,
      payment_method: resolveEffectivePaymentMethod(paymentMethod, onlinePaymentEnabled),
    };
  }, [
    address,
    couponEnabled,
    onlinePaymentEnabled,
    items,
    name,
    paymentMethod,
    phone,
    selectedTemplateId,
    weightKg,
  ]);

  const { coupons: pickerCouponsRaw, unusableCoupons: pickerUnusableCouponsRaw, loading: rawPickerCouponsLoading } = useCheckoutPickerCoupons(
    rawTotal,
    checkoutCouponParams,
  );
  const pickerCouponsLoading = couponEnabled ? rawPickerCouponsLoading : false;
  const pickerCoupons = useMemo(
    () => (couponEnabled ? pickerCouponsRaw : []),
    [couponEnabled, pickerCouponsRaw],
  );
  const pickerUnusableCoupons = useMemo(
    () => (couponEnabled ? pickerUnusableCouponsRaw : []),
    [couponEnabled, pickerUnusableCouponsRaw],
  );

  const clientCouponDiscount = useMemo(() => {
    if (!couponEnabled || !selectedCoupon) return 0;
    if (selectedCoupon.discountAmount != null && selectedCoupon.discountAmount > 0) {
      return selectedCoupon.discountAmount;
    }
    return estimateCheckoutCouponDiscount(selectedCoupon, rawTotal, shippingFee);
  }, [couponEnabled, rawTotal, selectedCoupon, shippingFee]);

  const matchesPreferredCoupon = useCallback(
    (coupon: CheckoutPickerCoupon, preferredId: string) =>
      coupon.id === preferredId || coupon.couponId === preferredId,
    [],
  );

  const estimateCouponDiscount = useCallback(
    (coupon: CheckoutPickerCoupon) => estimateCheckoutCouponDiscount(coupon, rawTotal, shippingFee),
    [rawTotal, shippingFee],
  );

  useEffect(() => {
    if (couponInitDone || pickerCouponsLoading) return;

    const candidates = pickerCoupons.filter(
      (coupon) =>
        coupon.usable !== false
        && rawTotal >= coupon.condition
        && (coupon.discountType !== "shipping" || shippingFee > 0),
    );

    if (preferredCouponId) {
      const preferred = candidates.find((coupon) => matchesPreferredCoupon(coupon, preferredCouponId)) ?? null;
      if (preferred) {
        setSelectedCoupon(preferred);
      } else {
        const exists = pickerCoupons.some((coupon) => matchesPreferredCoupon(coupon, preferredCouponId));
        toast.message(
          exists
            ? "该优惠券当前不满足本次结算条件，请在结算页选择其他可用优惠券"
            : "该优惠券当前不可用，请在结算页重新选择可用优惠券",
        );
      }
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete("coupon_id");
      setSearchParams(nextParams, { replace: true });
      setCouponInitDone(true);
      return;
    }

    if (candidates.length > 0) {
      const best = candidates.reduce((max, current) =>
        estimateCouponDiscount(current) > estimateCouponDiscount(max) ? current : max,
      );
      setSelectedCoupon(best);
    }
    setCouponInitDone(true);
  }, [
    couponInitDone,
    pickerCouponsLoading,
    pickerCoupons,
    preferredCouponId,
    rawTotal,
    shippingFee,
    searchParams,
    setSearchParams,
    estimateCouponDiscount,
    matchesPreferredCoupon,
  ]);

  useEffect(() => {
    if (!selectedCoupon) return;
    const stillExists = pickerCoupons.some((coupon) => coupon.id === selectedCoupon.id && coupon.usable !== false);
    const meetsAmount = rawTotal >= selectedCoupon.condition;
    const canUseShippingCoupon = selectedCoupon.discountType !== "shipping" || shippingFee > 0;
    if (!stillExists || !meetsAmount || !canUseShippingCoupon) {
      setSelectedCoupon(null);
    }
  }, [pickerCoupons, rawTotal, selectedCoupon, shippingFee]);

  return {
    selectedCoupon,
    setSelectedCoupon,
    pickerCoupons,
    pickerUnusableCoupons,
    pickerCouponsLoading,
    clientCouponDiscount,
  };
}

import { useEffect, useMemo, useState } from "react";
import * as orderService from "@/services/orderService";
import type { Order } from "@/types/order";
import type { OrderPreviewResult } from "@/types/orderPreview";
import type { SubmitOrderParams } from "@/types/order";
import type { CheckoutPickerCoupon } from "@/types/coupon";
import type { CartItem } from "@/types/cart";

type UseCheckoutOrderPreviewParams = {
  items: CartItem[];
  submittedOrder: Order | null;
  name: string;
  phone: string;
  address: string;
  selectedCoupon: CheckoutPickerCoupon | null;
  selectedTemplateId: number | null;
  selectedTemplateName?: string;
  weightKg: number;
  baseShippingFee: number;
  clientCouponDiscount: number;
  rawTotal: number;
  couponEnabled: boolean;
  pointsEnabled: boolean;
  usePoints: boolean;
  pointsToUse: number;
  useRewardCash: boolean;
  rewardCashAmount: number;
  setPointsToUse: (value: number) => void;
  setUsePoints: (value: boolean) => void;
  setRewardCashAmount: (value: number) => void;
  setUseRewardCash: (value: boolean) => void;
};

export function useCheckoutOrderPreview({
  items,
  submittedOrder,
  name,
  phone,
  address,
  selectedCoupon,
  selectedTemplateId,
  selectedTemplateName,
  weightKg,
  baseShippingFee,
  clientCouponDiscount,
  rawTotal,
  couponEnabled,
  pointsEnabled,
  usePoints,
  pointsToUse,
  useRewardCash,
  rewardCashAmount,
  setPointsToUse,
  setUsePoints,
  setRewardCashAmount,
  setUseRewardCash,
}: UseCheckoutOrderPreviewParams) {
  const [orderPreview, setOrderPreview] = useState<OrderPreviewResult | null>(null);

  useEffect(() => {
    if (!items.length || submittedOrder) {
      setOrderPreview(null);
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      const payload: SubmitOrderParams = {
        items: items.map((item) => ({
          product_id: item.product.id,
          variant_id: item.variant_id || undefined,
          qty: item.qty,
        })),
        contact_name: name.trim() || "结算预览",
        contact_phone: phone.trim() || "60000000000",
        address: address.trim() || "MY",
        coupon_id: couponEnabled ? selectedCoupon?.id : undefined,
        shipping_template_id: selectedTemplateId ?? undefined,
        shipping_name: selectedTemplateName,
        estimated_weight_kg: weightKg,
        use_points: pointsEnabled && usePoints,
        points_to_use: pointsEnabled && usePoints ? pointsToUse : 0,
        use_reward_cash: useRewardCash,
        reward_cash_amount: useRewardCash ? rewardCashAmount : 0,
      };
      void orderService
        .previewOrder(payload)
        .then((data) => {
          if (!cancelled) setOrderPreview(data);
        })
        .catch(() => {
          if (!cancelled) setOrderPreview(null);
        });
    }, 400);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [
    items,
    name,
    phone,
    address,
    selectedCoupon?.id,
    selectedTemplateId,
    selectedTemplateName,
    weightKg,
    usePoints,
    pointsToUse,
    useRewardCash,
    rewardCashAmount,
    submittedOrder,
    couponEnabled,
    pointsEnabled,
  ]);

  useEffect(() => {
    const maxPoints = Math.max(0, Math.floor(Number(orderPreview?.max_usable_points || 0)));
    const maxRewardCash = Math.max(0, Number(orderPreview?.max_usable_reward_cash || 0));
    if (pointsToUse > maxPoints) setPointsToUse(maxPoints);
    if (rewardCashAmount > maxRewardCash) setRewardCashAmount(maxRewardCash);
    if (usePoints && maxPoints <= 0) setUsePoints(false);
    if (useRewardCash && maxRewardCash <= 0) setUseRewardCash(false);
  }, [
    orderPreview?.max_usable_points,
    orderPreview?.max_usable_reward_cash,
    pointsToUse,
    rewardCashAmount,
    usePoints,
    useRewardCash,
    setPointsToUse,
    setRewardCashAmount,
    setUsePoints,
    setUseRewardCash,
  ]);

  const shippingFee = orderPreview?.shipping_fee ?? baseShippingFee;
  const discountAmount = orderPreview?.discount_amount ?? clientCouponDiscount;
  const discountLines = orderPreview?.discount_lines ?? [];
  const pointsBonusLines = orderPreview?.points_bonus_lines ?? [];
  const finalTotal = orderPreview?.final_amount ?? Math.max(0, rawTotal - clientCouponDiscount + shippingFee);
  const totalPointsValue = useMemo(
    () => Number(orderPreview?.earned_points || orderPreview?.total_points || 0),
    [orderPreview?.earned_points, orderPreview?.total_points],
  );

  return {
    orderPreview,
    shippingFee,
    discountAmount,
    discountLines,
    pointsBonusLines,
    finalTotal,
    totalPointsValue,
  };
}

import { useEffect, useMemo, useState } from "react";
import * as orderService from "@/services/orderService";
import type { Order } from "@/types/order";
import type { OrderPreviewResult } from "@/types/orderPreview";
import type { SubmitOrderParams } from "@/types/order";
import type { CheckoutPickerCoupon } from "@/types/coupon";
import type { CartItem } from "@/types/cart";
import type { Address } from "@/types/address";

type UseCheckoutOrderPreviewParams = {
  items: CartItem[];
  submittedOrder: Order | null;
  name: string;
  phone: string;
  address: string;
  selectedAddress?: Address | null;
  selectedCoupon: CheckoutPickerCoupon | null;
  selectedTemplateId: string | null;
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
  selectedAddress,
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
  const [orderPreviewLoading, setOrderPreviewLoading] = useState(false);
  const [orderPreviewError, setOrderPreviewError] = useState<string | null>(null);

  useEffect(() => {
    if (!items.length || submittedOrder) {
      setOrderPreview(null);
      setOrderPreviewLoading(false);
      setOrderPreviewError(null);
      return;
    }
    let cancelled = false;
    setOrderPreview(null);
    setOrderPreviewLoading(true);
    setOrderPreviewError(null);
    const timer = window.setTimeout(() => {
      const payload: SubmitOrderParams = {
        items: items.map((item) => ({
          product_id: item.product.id,
          variant_id: item.variant_id || undefined,
          qty: item.qty,
        })),
        contact_name: name.trim() || "结算预览",
        contact_phone: phone.trim() || "60000000000",
        address: selectedAddress
          ? {
              recipient_name: selectedAddress.recipient_name,
              phone: selectedAddress.phone,
              line1: selectedAddress.line1,
              line2: selectedAddress.line2 || "",
              city: selectedAddress.city,
              state: selectedAddress.state,
              postcode: selectedAddress.postcode,
              country: selectedAddress.country,
            }
          : address.trim() || "MY",
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
          if (!cancelled) {
            setOrderPreview(data);
            setOrderPreviewError(null);
          }
        })
        .catch((err) => {
          if (!cancelled) {
            setOrderPreview(null);
            setOrderPreviewError(err instanceof Error ? err.message : "后端金额同步失败，请稍后重试");
          }
        })
        .finally(() => {
          if (!cancelled) setOrderPreviewLoading(false);
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
    selectedAddress?.id,
    selectedAddress?.country,
    selectedAddress?.city,
    selectedAddress?.state,
    selectedAddress?.postcode,
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
  const promotionEvaluation = orderPreview?.promotion_evaluation ?? null;
  const orderSnapshot = orderPreview?.order_snapshot ?? promotionEvaluation?.order_snapshot ?? null;
  const finalTotal = orderPreview?.final_amount ?? Math.max(0, rawTotal - clientCouponDiscount + shippingFee);
  const backendPricingReady = Boolean(orderPreview && !orderPreviewLoading && !orderPreviewError);
  const totalPointsValue = useMemo(
    () => Number(orderPreview?.earned_points || orderPreview?.total_points || 0),
    [orderPreview?.earned_points, orderPreview?.total_points],
  );

  return {
    orderPreview,
    orderPreviewLoading,
    orderPreviewError,
    backendPricingReady,
    shippingFee,
    discountAmount,
    discountLines,
    pointsBonusLines,
    promotionEvaluation,
    orderSnapshot,
    finalTotal,
    totalPointsValue,
  };
}

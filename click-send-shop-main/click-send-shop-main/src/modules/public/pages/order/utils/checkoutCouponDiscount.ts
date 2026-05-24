import type { CheckoutPickerCoupon } from "@/types/coupon";

/** 客户端估算优惠券抵扣额（与服务端 preview 对齐的简化版） */
export function estimateCheckoutCouponDiscount(
  coupon: CheckoutPickerCoupon,
  rawTotal: number,
  shippingFee: number,
): number {
  if (coupon.discountAmount != null && coupon.discountAmount > 0) {
    return coupon.discountAmount;
  }
  if (coupon.discountType === "percentage") {
    return Math.min(rawTotal, Math.floor((rawTotal * coupon.discount) / 100));
  }
  if (coupon.discountType === "shipping") {
    return Math.min(shippingFee, coupon.discount > 0 ? coupon.discount : shippingFee);
  }
  return Math.min(rawTotal, coupon.discount);
}

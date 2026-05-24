import { describe, expect, it } from "vitest";
import { estimateCheckoutCouponDiscount } from "./checkoutCouponDiscount";
import type { CheckoutPickerCoupon } from "@/types/coupon";

function coupon(partial: Partial<CheckoutPickerCoupon>): CheckoutPickerCoupon {
  return {
    id: "1",
    title: "test",
    discount: 10,
    discountType: "fixed",
    condition: 0,
    usable: true,
    ...partial,
  } as CheckoutPickerCoupon;
}

describe("estimateCheckoutCouponDiscount", () => {
  it("uses explicit discountAmount when set", () => {
    expect(estimateCheckoutCouponDiscount(coupon({ discountAmount: 5 }), 100, 10)).toBe(5);
  });

  it("applies percentage cap to raw total", () => {
    expect(estimateCheckoutCouponDiscount(coupon({ discountType: "percentage", discount: 20 }), 100, 10)).toBe(20);
  });

  it("applies shipping coupon to shipping fee", () => {
    expect(estimateCheckoutCouponDiscount(coupon({ discountType: "shipping", discount: 0 }), 100, 15)).toBe(15);
  });
});

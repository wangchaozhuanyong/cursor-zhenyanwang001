import CouponPicker from "@/components/CouponPicker";
import type { CheckoutPickerCoupon } from "@/types/coupon";

interface CheckoutCouponSectionProps {
  rawTotal: number;
  shippingFee: number;
  selectedCoupon: CheckoutPickerCoupon | null;
  coupons: CheckoutPickerCoupon[];
  loading: boolean;
  onSelect: (coupon: CheckoutPickerCoupon | null) => void;
}

export function CheckoutCouponSection({
  rawTotal,
  shippingFee,
  selectedCoupon,
  coupons,
  loading,
  onSelect,
}: CheckoutCouponSectionProps) {
  return (
    <>
      <div className="px-1">
        <p className="mb-2 text-sm font-semibold text-foreground">3. 优惠券</p>
      </div>
      <CouponPicker
        totalAmount={rawTotal}
        shippingFee={shippingFee}
        selectedCouponId={selectedCoupon?.id ?? null}
        onSelect={onSelect}
        coupons={coupons}
        loading={loading}
      />
    </>
  );
}

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

const SECTION_SHELL =
  "theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] p-5 theme-shadow";

export function CheckoutCouponSection({
  rawTotal,
  shippingFee,
  selectedCoupon,
  coupons,
  loading,
  onSelect,
}: CheckoutCouponSectionProps) {
  return (
    <div className={SECTION_SHELL}>
      <h3 className="mb-3 text-[15px] font-semibold text-foreground">3. 优惠券</h3>
      <CouponPicker
        embedded
        totalAmount={rawTotal}
        shippingFee={shippingFee}
        selectedCouponId={selectedCoupon?.id ?? null}
        onSelect={onSelect}
        coupons={coupons}
        loading={loading}
      />
    </div>
  );
}

import CouponPicker from "@/components/CouponPicker";
import type { CheckoutPickerCoupon } from "@/types/coupon";

interface CheckoutCouponSectionProps {
  rawTotal: number;
  shippingFee: number;
  selectedCoupon: CheckoutPickerCoupon | null;
  coupons: CheckoutPickerCoupon[];
  unusableCoupons?: CheckoutPickerCoupon[];
  loading: boolean;
  onSelect: (coupon: CheckoutPickerCoupon | null) => void;
}

const SECTION_SHELL = "sf-next-checkout-card";

export function CheckoutCouponSection({
  rawTotal,
  shippingFee,
  selectedCoupon,
  coupons,
  unusableCoupons = [],
  loading,
  onSelect,
}: CheckoutCouponSectionProps) {
  return (
    <div className={SECTION_SHELL}>
      <div className="sf-next-checkout-card__head">
        <div>
          <h2 className="sf-next-checkout-section-title">优惠</h2>
        </div>
        {selectedCoupon ? (
          <span className="sf-next-checkout-used-status">
            已使用
          </span>
        ) : null}
      </div>
      <CouponPicker
        embedded
        totalAmount={rawTotal}
        shippingFee={shippingFee}
        selectedCouponId={selectedCoupon?.id ?? null}
        onSelect={onSelect}
        coupons={coupons}
        unusableCoupons={unusableCoupons}
        loading={loading}
      />
    </div>
  );
}

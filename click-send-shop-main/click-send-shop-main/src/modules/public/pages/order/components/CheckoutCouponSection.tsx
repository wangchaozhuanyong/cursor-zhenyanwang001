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

const SECTION_SHELL =
  "store-checkout-card theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] p-5 theme-shadow";

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
      <div className="mb-3 flex items-center gap-3">
        <span className="store-checkout-step flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--theme-price)] text-xs font-bold text-[var(--theme-price-foreground)]">3</span>
        <div>
          <h3 className="text-[15px] font-semibold text-foreground">优惠券</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">选择当前订单可用的优惠券</p>
        </div>
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
